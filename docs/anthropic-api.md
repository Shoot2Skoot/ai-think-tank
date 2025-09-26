# Anthropic Claude API Documentation

## Overview
This document covers the key features and implementation details for integrating Anthropic's Claude API into the multi-persona conversation simulator.

## Pricing Structure

Based on the latest API documentation, Claude models have the following pricing per million tokens:

### Claude Opus 4 (claude-opus-4-1-20250805)
- **Base Input**: $15.00 / MTok
- **Output**: $75.00 / MTok
- **5m Cache Write**: $18.75 / MTok
- **1h Cache Write**: $30.00 / MTok
- **Cache Hit/Refresh**: $1.50 / MTok

### Claude Sonnet 4 (claude-sonnet-4-20250514)
- **Base Input**: $3.00 / MTok
- **Output**: $15.00 / MTok
- **5m Cache Write**: $3.75 / MTok
- **1h Cache Write**: $6.00 / MTok
- **Cache Hit/Refresh**: $0.30 / MTok

### Claude Sonnet 3.7 (claude-3-7-sonnet-20250219)
- **Base Input**: $3.00 / MTok
- **Output**: $15.00 / MTok
- **5m Cache Write**: $3.75 / MTok
- **1h Cache Write**: $6.00 / MTok
- **Cache Hit/Refresh**: $0.30 / MTok

## Prompt Caching

Anthropic's prompt caching can reduce costs by up to 90% and latency by up to 80% for frequently used content.

### Implementation

#### Basic Cache Setup
```python
from anthropic import Anthropic
from anthropic.types import CacheControl

client = Anthropic()

# Create a message with caching
response = client.messages.create(
    model="claude-opus-4-20250514",
    max_tokens=1024,
    system=[
        {
            "type": "text",
            "text": "You are an AI assistant analyzing documents."
        },
        {
            "type": "text",
            "text": "<large_context_here>",
            "cache_control": {"type": "ephemeral"}  # Enable caching
        }
    ],
    messages=[
        {
            "role": "user",
            "content": "Analyze this document"
        }
    ]
)
```

### Cache Control Options

#### Ephemeral Caching
- **5-minute TTL**: Default for quick reuse
- **1-hour TTL**: For longer sessions

```python
# 5-minute cache (default)
cache_control = {"type": "ephemeral"}

# For longer TTL, use cache creation
cache = client.caches.create(
    model=model,
    config={
        "display_name": "persona_definition",
        "system_instruction": system_prompt,
        "contents": [context],
        "ttl": "300s"  # or "3600s" for 1 hour
    }
)
```

### Cache Usage Tracking

The API returns detailed cache usage in the response:

```python
# Response includes usage metadata
print(response.usage_metadata)
# Output example:
# {
#     "input_tokens": 21,
#     "cache_creation_input_tokens": 188086,
#     "cache_read_input_tokens": 0,
#     "output_tokens": 393
# }
```

### Cache Performance Fields
- **cache_creation_input_tokens**: Tokens written to cache
- **cache_read_input_tokens**: Tokens retrieved from cache
- **input_tokens**: Non-cached input tokens

## Structured Output

Claude supports structured output through response schemas:

```python
from pydantic import BaseModel

class PersonaResponse(BaseModel):
    thought_process: str
    response: str
    confidence: float
    relevant_expertise: list[str]

# Using with LangChain
from langchain_anthropic import ChatAnthropic

llm = ChatAnthropic(model="claude-3-7-sonnet-20250219")
structured_llm = llm.with_structured_output(PersonaResponse)

result = structured_llm.invoke("Generate a response as this persona...")
# result is now a PersonaResponse object
```

## Batch Processing

Claude supports batch processing with caching benefits:

```bash
curl https://api.anthropic.com/v1/messages/batches \
     -H "x-api-key: $ANTHROPIC_API_KEY" \
     -H "anthropic-version: 2023-06-01" \
     -H "content-type: application/json" \
     -d '{
    "requests": [
        {
            "custom_id": "persona-1-response",
            "params": {
                "model": "claude-opus-4-20250514",
                "max_tokens": 1024,
                "system": [
                    {
                        "type": "text",
                        "text": "Persona definition here",
                        "cache_control": {"type": "ephemeral"}
                    }
                ],
                "messages": [...]
            }
        }
    ]
}'
```

## Best Practices for Our Use Case

### 1. Persona System Prompts
Cache persona definitions with 1-hour TTL since they don't change during conversations:

```python
def create_persona_cache(persona):
    return {
        "type": "text",
        "text": f"""
        You are {persona.name}, a {persona.demographics.occupation}.
        Background: {persona.background}
        Personality: {persona.personality}
        Experience Level: {persona.experience_level}
        Communication Style: {persona.communication_style}
        """,
        "cache_control": {"type": "ephemeral"}
    }
```

### 2. Conversation Context
Cache recent conversation history with 5-minute TTL:

```python
def prepare_context_with_cache(messages, cache_after_index):
    formatted_messages = []
    for i, msg in enumerate(messages):
        content = {"type": "text", "text": msg.content}
        if i == cache_after_index:
            content["cache_control"] = {"type": "ephemeral"}
        formatted_messages.append(content)
    return formatted_messages
```

### 3. Cost Optimization Strategy
- Use Sonnet 3.7 for most personas (best price/performance)
- Reserve Opus 4 for complex reasoning personas
- Implement aggressive caching for system prompts
- Batch similar persona responses when possible

## Token Limits and Context Windows

### Model Limits
- **Opus 4**: 200k context window
- **Sonnet 4**: 200k context window
- **Sonnet 3.7**: 200k context window

### Context Management
For long conversations, implement sliding window:

```python
def manage_context_window(messages, max_tokens=150000):
    """Keep conversation within token limits"""
    total_tokens = 0
    kept_messages = []

    # Always keep system prompt (cached)
    # Keep most recent messages up to limit
    for msg in reversed(messages):
        msg_tokens = estimate_tokens(msg)
        if total_tokens + msg_tokens > max_tokens:
            break
        kept_messages.insert(0, msg)
        total_tokens += msg_tokens

    return kept_messages
```

## Error Handling

### Rate Limits
Anthropic enforces rate limits. Implement exponential backoff:

```python
import time
from typing import Optional

def call_with_retry(func, max_retries=3):
    for attempt in range(max_retries):
        try:
            return func()
        except RateLimitError as e:
            if attempt == max_retries - 1:
                raise
            wait_time = 2 ** attempt
            time.sleep(wait_time)
```

### Cache Invalidation
Caches expire based on TTL. Monitor cache performance:

```python
def monitor_cache_performance(response):
    usage = response.usage_metadata
    cache_hit_rate = usage.cache_read_input_tokens / (
        usage.cache_read_input_tokens + usage.cache_creation_input_tokens
    )

    if cache_hit_rate < 0.5:
        # Consider adjusting cache strategy
        log_warning(f"Low cache hit rate: {cache_hit_rate:.2%}")
```

## Integration with LangChain

### Setup
```python
from langchain_anthropic import ChatAnthropic
from langchain.callbacks import get_openai_callback

# Initialize with caching support
llm = ChatAnthropic(
    model="claude-3-7-sonnet-20250219",
    anthropic_api_key=api_key,
    max_tokens=1024,
    temperature=0.7
)

# Track costs
with get_openai_callback() as cb:
    response = llm.invoke(messages)
    print(f"Total Cost: ${cb.total_cost:.6f}")
```

### Streaming Support
```python
async for chunk in llm.astream(messages):
    # Process streaming response
    yield chunk.content
```

## Security Considerations

### API Key Management
- Store keys in environment variables
- Use separate keys for development/production
- Rotate keys regularly
- Never commit keys to version control

### Content Filtering
Claude has built-in content filtering. Handle appropriately:

```python
try:
    response = client.messages.create(...)
except ContentFilterException as e:
    # Handle content policy violation
    log_error(f"Content filtered: {e}")
    return get_safe_fallback_response()
```

## Monitoring and Logging

### Key Metrics to Track
- Cache hit rate
- Average response time
- Cost per conversation
- Token usage distribution
- Error rate by type

### Implementation
```python
def log_api_metrics(response, persona_id, conversation_id):
    metrics = {
        "persona_id": persona_id,
        "conversation_id": conversation_id,
        "model": response.model,
        "input_tokens": response.usage.input_tokens,
        "output_tokens": response.usage.output_tokens,
        "cached_tokens": response.usage.cache_read_input_tokens,
        "cache_creation_tokens": response.usage.cache_creation_input_tokens,
        "total_cost": calculate_cost(response.usage),
        "latency_ms": response.latency
    }

    # Send to monitoring service
    send_to_monitoring(metrics)
```