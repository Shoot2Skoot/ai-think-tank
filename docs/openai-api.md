# OpenAI API Documentation

## Overview
This document covers the key features and implementation details for integrating OpenAI's API into the multi-persona conversation simulator.

## Pricing Structure

Based on the models.yaml file provided, OpenAI models have the following pricing per million tokens:

### GPT-5 Series (Hypothetical/Future)
- **GPT-5**
  - Input: $1.25 / MTok
  - Cached Input: $0.125 / MTok
  - Output: $10.00 / MTok

- **GPT-5 Mini**
  - Input: $0.25 / MTok
  - Cached Input: $0.025 / MTok
  - Output: $2.00 / MTok

- **GPT-5 Nano**
  - Input: $0.05 / MTok
  - Cached Input: $0.005 / MTok
  - Output: $0.40 / MTok

### GPT-4.1 Series
- **GPT-4.1**
  - Input: $2.00 / MTok
  - Cached Input: $0.50 / MTok
  - Output: $8.00 / MTok

- **GPT-4.1 Mini**
  - Input: $0.40 / MTok
  - Cached Input: $0.10 / MTok
  - Output: $1.60 / MTok

- **GPT-4.1 Nano**
  - Input: $0.10 / MTok
  - Cached Input: $0.025 / MTok
  - Output: $0.40 / MTok

### O-Series
- **O4 Mini**
  - Input: $1.10 / MTok
  - Cached Input: $0.275 / MTok
  - Output: $4.40 / MTok

- **O3**
  - Input: $2.00 / MTok
  - Cached Input: $0.50 / MTok
  - Output: $8.00 / MTok

## Organization Cost Tracking

OpenAI provides comprehensive cost tracking APIs for monitoring usage and expenses.

### Get Organization Costs

```bash
curl "https://api.openai.com/v1/organization/costs?start_time=1730419200&limit=1" \
  -H "Authorization: Bearer $OPENAI_ADMIN_KEY" \
  -H "Content-Type: application/json"
```

### Response Structure

```json
{
  "object": "page",
  "data": [
    {
      "object": "bucket",
      "start_time": 1730419200,
      "end_time": 1730505600,
      "results": [
        {
          "object": "organization.costs.result",
          "amount": {
            "value": 0.06,
            "currency": "usd"
          },
          "line_item": "Chat models",
          "project_id": "proj_abc"
        }
      ]
    }
  ],
  "has_more": false,
  "next_page": null
}
```

### Cost Tracking Implementation

```python
import requests
from datetime import datetime, timedelta

class OpenAICostTracker:
    def __init__(self, admin_key):
        self.admin_key = admin_key
        self.base_url = "https://api.openai.com/v1"

    def get_organization_costs(self, start_date, end_date=None):
        """Retrieve organization costs for a time period"""

        params = {
            "start_time": int(start_date.timestamp()),
            "limit": 100
        }

        if end_date:
            params["end_time"] = int(end_date.timestamp())

        response = requests.get(
            f"{self.base_url}/organization/costs",
            headers={
                "Authorization": f"Bearer {self.admin_key}",
                "Content-Type": "application/json"
            },
            params=params
        )

        return response.json()

    def get_usage_by_model(self):
        """Get detailed usage statistics by model"""

        response = requests.get(
            f"{self.base_url}/organization/usage/completions",
            headers={
                "Authorization": f"Bearer {self.admin_key}",
                "Content-Type": "application/json"
            }
        )

        return response.json()
```

## Structured Output

OpenAI supports structured output through JSON schema definitions.

### Basic JSON Mode

```python
from openai import OpenAI

client = OpenAI()

response = client.chat.completions.create(
    model="gpt-4.1",
    messages=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Generate a persona response"}
    ],
    response_format={"type": "json_object"}
)
```

### With JSON Schema

```python
response = client.chat.completions.create(
    model="gpt-4.1",
    messages=messages,
    response_format={
        "type": "json_schema",
        "json_schema": {
            "name": "persona_response",
            "schema": {
                "type": "object",
                "properties": {
                    "message": {"type": "string"},
                    "confidence": {"type": "number"},
                    "reasoning": {"type": "string"},
                    "emotions": {
                        "type": "array",
                        "items": {"type": "string"}
                    }
                },
                "required": ["message", "confidence", "reasoning"],
                "additionalProperties": False
            },
            "strict": True
        }
    }
)
```

### With Pydantic (via LangChain)

```python
from pydantic import BaseModel, Field
from langchain_openai import ChatOpenAI

class PersonaResponse(BaseModel):
    """Structured response from a persona"""

    message: str = Field(description="The persona's response")
    confidence: float = Field(description="Confidence level 0-1")
    reasoning: str = Field(description="Internal reasoning")
    relevant_expertise: list[str] = Field(description="Relevant areas of expertise")

llm = ChatOpenAI(model="gpt-4.1-mini")
structured_llm = llm.with_structured_output(PersonaResponse)

response = structured_llm.invoke("Generate a response as this persona...")
# response is now a PersonaResponse object
```

## Batch API

OpenAI's Batch API offers 50% discount on processing for non-urgent requests.

### Creating a Batch Job

```python
# Prepare batch requests
batch_requests = []

for persona in personas:
    batch_requests.append({
        "custom_id": f"persona_{persona.id}",
        "method": "POST",
        "url": "/v1/chat/completions",
        "body": {
            "model": "gpt-4.1-mini",
            "messages": [
                {"role": "system", "content": persona.system_prompt},
                {"role": "user", "content": conversation_context}
            ],
            "max_tokens": 500
        }
    })

# Create batch file
import json

with open("batch_requests.jsonl", "w") as f:
    for request in batch_requests:
        f.write(json.dumps(request) + "\n")

# Upload and create batch
batch_file = client.files.create(
    file=open("batch_requests.jsonl", "rb"),
    purpose="batch"
)

batch = client.batches.create(
    input_file_id=batch_file.id,
    endpoint="/v1/chat/completions",
    completion_window="24h",
    metadata={
        "conversation_id": "conv_123",
        "batch_type": "persona_responses"
    }
)
```

### Processing Batch Results

```python
# Check batch status
batch_status = client.batches.retrieve(batch.id)
print(f"Status: {batch_status.status}")

# When complete, download results
if batch_status.status == "completed":
    result_file = client.files.content(batch_status.output_file_id)

    # Process results
    for line in result_file.text.split("\n"):
        if line:
            result = json.loads(line)
            persona_id = result["custom_id"].replace("persona_", "")
            response = result["response"]["body"]["choices"][0]["message"]["content"]

            # Store response
            store_persona_response(persona_id, response)
```

## Token Usage Tracking

### Tracking with Callbacks

```python
from langchain_community.callbacks import get_openai_callback
from langchain_openai import ChatOpenAI

llm = ChatOpenAI(model="gpt-4.1-mini")

with get_openai_callback() as cb:
    response = llm.invoke(messages)

    print(f"Tokens Used: {cb.total_tokens}")
    print(f"Prompt Tokens: {cb.prompt_tokens}")
    print(f"Completion Tokens: {cb.completion_tokens}")
    print(f"Total Cost (USD): ${cb.total_cost:.6f}")
```

### Streaming with Token Usage

```python
from openai import OpenAI

client = OpenAI()

# Enable streaming with usage tracking
stream = client.chat.completions.create(
    model="gpt-4.1-mini",
    messages=messages,
    stream=True,
    stream_options={"include_usage": True}
)

total_tokens = 0
for chunk in stream:
    if chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="")

    # Track usage in final chunk
    if chunk.usage:
        total_tokens = chunk.usage.total_tokens
        print(f"\nTotal tokens: {total_tokens}")
```

## Function Calling / Tool Use

### Define Tools for Personas

```python
tools = [
    {
        "type": "function",
        "function": {
            "name": "search_knowledge_base",
            "description": "Search the persona's knowledge base",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Search query"
                    },
                    "category": {
                        "type": "string",
                        "enum": ["technical", "business", "creative"],
                        "description": "Category to search"
                    }
                },
                "required": ["query"]
            }
        }
    }
]

response = client.chat.completions.create(
    model="gpt-4.1",
    messages=messages,
    tools=tools,
    tool_choice="auto"
)

# Handle tool calls
if response.choices[0].message.tool_calls:
    for tool_call in response.choices[0].message.tool_calls:
        function_name = tool_call.function.name
        arguments = json.loads(tool_call.function.arguments)

        # Execute function and get result
        result = execute_function(function_name, arguments)

        # Continue conversation with result
        messages.append(response.choices[0].message)
        messages.append({
            "role": "tool",
            "tool_call_id": tool_call.id,
            "content": json.dumps(result)
        })
```

## Rate Limits and Management

### Get Project Rate Limits

```bash
curl https://api.openai.com/v1/organization/projects/proj_abc/rate_limits?limit=20 \
  -H "Authorization: Bearer $OPENAI_ADMIN_KEY" \
  -H "Content-Type: application/json"
```

### Response

```json
{
  "object": "list",
  "data": [
    {
      "object": "project.rate_limit",
      "id": "rl-gpt-4",
      "model": "gpt-4",
      "max_requests_per_1_minute": 500,
      "max_tokens_per_1_minute": 40000,
      "max_images_per_1_minute": 0
    }
  ],
  "has_more": false
}
```

### Rate Limit Handling

```python
import time
from tenacity import retry, stop_after_attempt, wait_exponential

class OpenAIRateLimiter:
    def __init__(self):
        self.request_times = []
        self.token_counts = []

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=4, max=60)
    )
    def make_request_with_retry(self, func, *args, **kwargs):
        """Make request with automatic retry on rate limit"""
        try:
            return func(*args, **kwargs)
        except openai.RateLimitError as e:
            wait_time = int(e.response.headers.get("Retry-After", 60))
            print(f"Rate limited. Waiting {wait_time} seconds...")
            time.sleep(wait_time)
            raise
```

## Best Practices for Our Use Case

### 1. Model Selection Strategy

```python
def select_openai_model(persona, conversation_complexity):
    """Select appropriate OpenAI model based on requirements"""

    if persona.requires_reasoning or conversation_complexity == "high":
        # Use advanced model for complex reasoning
        return "gpt-4.1"
    elif persona.personality == "creative":
        # Use standard model for creative responses
        return "gpt-4.1-mini"
    else:
        # Use efficient model for simple responses
        return "gpt-4.1-nano"
```

### 2. Cost Optimization

```python
class OpenAICostOptimizer:
    def __init__(self):
        self.batch_queue = []

    def should_use_batch(self, urgency, message_count):
        """Determine if batch API should be used"""

        if urgency == "low" and message_count > 5:
            return True  # 50% discount with batch API
        return False

    def optimize_context_window(self, messages, max_tokens=100000):
        """Optimize context to reduce costs"""

        # Calculate token count
        total_tokens = sum(self.count_tokens(msg) for msg in messages)

        if total_tokens > max_tokens:
            # Implement sliding window
            return self.sliding_window(messages, max_tokens)

        return messages
```

### 3. Caching Strategy

While OpenAI doesn't have explicit caching like Anthropic/Gemini, we can implement application-level caching:

```python
from functools import lru_cache
import hashlib

class OpenAIResponseCache:
    def __init__(self, ttl_seconds=300):
        self.cache = {}
        self.ttl = ttl_seconds

    def get_cache_key(self, model, messages, temperature):
        """Generate cache key from request parameters"""

        content = f"{model}:{messages}:{temperature}"
        return hashlib.md5(content.encode()).hexdigest()

    def get_or_generate(self, model, messages, temperature, generate_func):
        """Get from cache or generate new response"""

        cache_key = self.get_cache_key(model, messages, temperature)

        if cache_key in self.cache:
            cached_response, timestamp = self.cache[cache_key]
            if time.time() - timestamp < self.ttl:
                return cached_response

        # Generate new response
        response = generate_func(model, messages, temperature)
        self.cache[cache_key] = (response, time.time())

        return response
```

## Integration with LangChain

### Setup

```python
from langchain_openai import ChatOpenAI
from langchain.callbacks import get_openai_callback

# Initialize with specific model
llm = ChatOpenAI(
    model="gpt-4.1-mini",
    temperature=0.7,
    max_tokens=1000,
    model_kwargs={
        "response_format": {"type": "json_object"}
    }
)

# Track costs
with get_openai_callback() as cb:
    response = llm.invoke(messages)
    print(f"Total Cost: ${cb.total_cost:.6f}")
```

### Streaming

```python
# Stream responses
async for chunk in llm.astream(messages):
    yield chunk.content

# Stream with events for detailed tracking
async for event in llm.astream_events(messages, version="v1"):
    if event["event"] == "on_llm_new_token":
        token = event["data"]["chunk"]
        yield token
    elif event["event"] == "on_llm_end":
        final_output = event["data"]["output"]
        usage = final_output.llm_output.get("token_usage", {})
        print(f"Total tokens: {usage.get('total_tokens')}")
```

## Monitoring and Analytics

### Usage Analytics

```python
class OpenAIAnalytics:
    def __init__(self, admin_key):
        self.admin_key = admin_key

    def get_usage_metrics(self, start_time, end_time, group_by=["model", "project_id"]):
        """Get detailed usage metrics"""

        url = "https://api.openai.com/v1/organization/usage/completions"

        params = {
            "start_time": start_time,
            "end_time": end_time,
            "bucket_width": "1d",
            "group_by": group_by,
            "limit": 100
        }

        response = requests.get(
            url,
            headers={"Authorization": f"Bearer {self.admin_key}"},
            params=params
        )

        return response.json()

    def calculate_daily_costs(self, usage_data):
        """Calculate daily costs from usage data"""

        daily_costs = {}

        for bucket in usage_data["data"]:
            date = bucket["start_time"]
            total_cost = 0

            for result in bucket["results"]:
                model = result.get("model")
                input_tokens = result.get("input_tokens", 0)
                output_tokens = result.get("output_tokens", 0)

                # Calculate cost based on model pricing
                cost = self.calculate_cost(model, input_tokens, output_tokens)
                total_cost += cost

            daily_costs[date] = total_cost

        return daily_costs
```

### Error Tracking

```python
def track_openai_errors(func):
    """Decorator to track OpenAI API errors"""

    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except openai.APIError as e:
            # Log API errors
            log_error({
                "type": "api_error",
                "message": str(e),
                "status_code": e.status_code,
                "request_id": e.request_id
            })
            raise
        except openai.APIConnectionError as e:
            # Log connection errors
            log_error({
                "type": "connection_error",
                "message": str(e)
            })
            raise
        except openai.RateLimitError as e:
            # Log rate limit errors
            log_error({
                "type": "rate_limit",
                "message": str(e),
                "retry_after": e.response.headers.get("Retry-After")
            })
            raise

    return wrapper
```

## Security Considerations

### API Key Management

```python
import os
from cryptography.fernet import Fernet

class SecureAPIKeyManager:
    def __init__(self):
        self.encryption_key = os.environ.get("ENCRYPTION_KEY")
        self.cipher = Fernet(self.encryption_key.encode())

    def encrypt_key(self, api_key):
        """Encrypt API key for storage"""
        return self.cipher.encrypt(api_key.encode())

    def decrypt_key(self, encrypted_key):
        """Decrypt API key for use"""
        return self.cipher.decrypt(encrypted_key).decode()

    def get_client(self, encrypted_key):
        """Get OpenAI client with decrypted key"""
        api_key = self.decrypt_key(encrypted_key)
        return OpenAI(api_key=api_key)
```

### Request Validation

```python
def validate_request(messages, max_length=10000):
    """Validate request before sending to API"""

    # Check message length
    total_length = sum(len(msg["content"]) for msg in messages)
    if total_length > max_length:
        raise ValueError(f"Message too long: {total_length} > {max_length}")

    # Check for sensitive content
    sensitive_patterns = ["password", "api_key", "secret"]
    for msg in messages:
        for pattern in sensitive_patterns:
            if pattern in msg["content"].lower():
                raise ValueError(f"Sensitive content detected: {pattern}")

    return True
```