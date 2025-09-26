# Google Gemini API Documentation

## Overview
This document covers the key features and implementation details for integrating Google's Gemini API into the multi-persona conversation simulator.

## Pricing Structure

Based on the models.yaml file provided, Gemini models have the following pricing per million tokens:

### Gemini 2.5 Pro
- **Input (≤200k tokens)**: $1.25 / MTok
- **Input (>200k tokens)**: $2.50 / MTok
- **Output (≤200k tokens)**: $10.00 / MTok
- **Output (>200k tokens)**: $15.00 / MTok
- **Cache Write (≤200k)**: $0.31 / MTok
- **Cache Write (>200k)**: $0.625 / MTok
- **Cache Storage per Hour**: $4.50 / MTok
- **Google Search (Free)**: 1500 requests per day
- **Google Search (Paid)**: $35 per 1000 requests

### Gemini 2.5 Flash
- **Text/Image/Video Input**: $0.30 / MTok
- **Audio Input**: $1.00 / MTok
- **Output**: $2.50 / MTok
- **Cache Write (Text/Image/Video)**: $0.075 / MTok
- **Cache Write (Audio)**: $0.25 / MTok
- **Cache Storage per Hour**: $1.00 / MTok
- **Live API Text Input**: $0.50 / MTok
- **Live API Audio/Image/Video Input**: $3.00 / MTok
- **Live API Text Output**: $2.00 / MTok
- **Live API Audio Output**: $12.00 / MTok

### Gemini 2.5 Flash Lite
- **Text/Image/Video Input**: $0.10 / MTok
- **Audio Input**: $0.30 / MTok
- **Output**: $0.40 / MTok
- **Cache Write (Text/Image/Video)**: $0.025 / MTok
- **Cache Write (Audio)**: $0.125 / MTok
- **Cache Storage per Hour**: $1.00 / MTok

## Explicit Caching

Gemini provides explicit caching capabilities to reduce costs and improve latency for repeated content.

### Creating a Cache

```python
from google import genai
from google.genai import types

client = genai.Client()

# Create cache with TTL
cache = client.caches.create(
    model="models/gemini-2.0-flash-001",
    config=types.CreateCachedContentConfig(
        display_name='persona_cache',
        system_instruction=(
            'You are an expert analyst with specific personality traits.'
        ),
        contents=[document_or_context],
        ttl="300s"  # 5 minutes
    )
)

print(f"Created cache: {cache.name}")
```

### Using Cached Content

```python
# Generate content using the cache
response = client.models.generate_content(
    model=model,
    contents='Analyze this topic based on your expertise',
    config=types.GenerateContentConfig(
        cached_content=cache.name
    )
)

# Check cache usage
print(response.usage_metadata)
# Output:
# prompt_token_count: 696219
# cached_content_token_count: 696190
# candidates_token_count: 214
# total_token_count: 696433
```

### Cache Management

```python
# List all cached content
for cache in client.caches.list():
    print(cache)

# Get specific cache
cache_details = client.caches.get(name=cache_name)

# Update cache TTL
from google import genai
from google.genai import types

client.caches.update(
    name=cache.name,
    config=types.UpdateCachedContentConfig(
        ttl='600s'  # Extend to 10 minutes
    )
)

# Set explicit expiration time
import datetime
expire_time = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=30)
client.caches.update(
    name=cache.name,
    config=types.UpdateCachedContentConfig(
        expire_time=expire_time
    )
)

# Delete cache
client.caches.delete(cache.name)
```

## Structured Output

Gemini supports structured output through response schemas, ensuring consistent JSON responses.

### Basic Structured Output

```python
# Using response schema for structured output
request = {
    "contents": [{
        "parts": [
            {"text": "List popular cookie recipes with ingredients"}
        ]
    }],
    "generationConfig": {
        "responseMimeType": "application/json",
        "responseSchema": {
            "type": "ARRAY",
            "items": {
                "type": "OBJECT",
                "properties": {
                    "recipeName": {"type": "STRING"},
                    "ingredients": {
                        "type": "ARRAY",
                        "items": {"type": "STRING"}
                    }
                },
                "propertyOrdering": ["recipeName", "ingredients"]
            }
        }
    }
}
```

### Enum Constraints

```python
# Constrain output to specific values
request = {
    "contents": [{
        "parts": [{"text": "What type of instrument is an oboe?"}]
    }],
    "generationConfig": {
        "responseMimeType": "text/x.enum",
        "responseSchema": {
            "type": "STRING",
            "enum": ["Percussion", "String", "Woodwind", "Brass", "Keyboard"]
        }
    }
}
```

### With Pydantic Models

```python
from pydantic import BaseModel
from google import genai

class PersonaResponse(BaseModel):
    message: str
    confidence: float
    reasoning: str
    emotions: list[str]

# Configure for structured output
inline_requests = [
    {
        'contents': [{
            'parts': [{'text': 'Respond as the persona'}],
            'role': 'user'
        }],
        'config': {
            'response_mime_type': 'application/json',
            'response_schema': PersonaResponse
        }
    }
]
```

## Batch Processing

Gemini supports batch processing with structured output:

```python
from google import genai
from pydantic import BaseModel

class ResponseFormat(BaseModel):
    response: str
    metadata: dict

client = genai.Client()

# Create batch job with structured output
inline_batch_job = client.batches.create(
    model="models/gemini-2.5-flash",
    src=inline_requests,
    config={
        'display_name': "persona-responses-batch"
    }
)

# Poll for completion
import time
while True:
    batch_job = client.batches.get(name=inline_batch_job.name)
    if batch_job.state.name in ('JOB_STATE_SUCCEEDED', 'JOB_STATE_FAILED'):
        break
    time.sleep(30)

print(f"Job finished: {batch_job.state.name}")
```

## Token Usage Tracking

### Thoughts vs Output Tokens

When using the "Thinking" feature, Gemini tracks tokens separately:

```python
# Access thought tokens vs output tokens
print("Thoughts tokens:", response.usage_metadata.thoughts_token_count)
print("Output tokens:", response.usage_metadata.candidates_token_count)
```

### Cache Performance Metrics

```python
def analyze_cache_performance(response):
    usage = response.usage_metadata

    cache_efficiency = usage.cached_content_token_count / usage.prompt_token_count
    cost_savings = calculate_cache_savings(usage)

    return {
        "cache_hit_rate": cache_efficiency,
        "tokens_saved": usage.cached_content_token_count,
        "cost_savings": cost_savings,
        "total_tokens": usage.total_token_count
    }
```

## Context Management

### Large Document Processing

```python
import io
import httpx
from google import genai
from google.genai import types

client = genai.Client()

# Upload and cache large document
pdf_url = "https://example.com/document.pdf"
doc_io = io.BytesIO(httpx.get(pdf_url).content)

document = client.files.upload(
    file=doc_io,
    config=dict(mime_type='application/pdf')
)

# Create cached content from document
cache = client.caches.create(
    model="gemini-2.0-flash-001",
    config=types.CreateCachedContentConfig(
        system_instruction="You are analyzing this document",
        contents=[document],
        ttl="3600s"  # 1 hour for large documents
    )
)
```

### Video Content Processing

```python
import pathlib
import time

# Upload video for analysis
video_file = client.files.upload(file=pathlib.Path('meeting_recording.mp4'))

# Wait for processing
while video_file.state.name == 'PROCESSING':
    print('Processing video...')
    time.sleep(2)
    video_file = client.files.get(name=video_file.name)

# Create cache with video content
cache = client.caches.create(
    model='models/gemini-2.0-flash-001',
    config=types.CreateCachedContentConfig(
        display_name='meeting_analysis',
        system_instruction='Analyze this meeting recording',
        contents=[video_file],
        ttl="1800s"  # 30 minutes
    )
)
```

## Best Practices for Our Use Case

### 1. Model Selection Strategy

```python
def select_gemini_model(persona, context_size):
    """Select appropriate Gemini model based on requirements"""

    if persona.requires_reasoning:
        # Use Pro for complex reasoning
        return "gemini-2.5-pro"
    elif context_size < 50000:
        # Use Flash Lite for simple, short contexts
        return "gemini-2.5-flash-lite"
    else:
        # Use Flash for standard conversations
        return "gemini-2.5-flash"
```

### 2. Efficient Cache Strategy

```python
class GeminiCacheManager:
    def __init__(self, client):
        self.client = client
        self.cache_registry = {}

    def get_or_create_persona_cache(self, persona_id, persona_def):
        if persona_id in self.cache_registry:
            # Check if cache is still valid
            cache = self.cache_registry[persona_id]
            try:
                self.client.caches.get(name=cache.name)
                return cache
            except:
                # Cache expired, recreate
                pass

        # Create new cache
        cache = self.client.caches.create(
            model="models/gemini-2.5-flash",
            config=types.CreateCachedContentConfig(
                display_name=f"persona_{persona_id}",
                system_instruction=persona_def,
                ttl="3600s"  # 1 hour for personas
            )
        )

        self.cache_registry[persona_id] = cache
        return cache
```

### 3. Cost Optimization

```python
def optimize_gemini_costs(message_context):
    """Optimize costs based on context size and requirements"""

    context_tokens = estimate_tokens(message_context)

    if context_tokens > 200000:
        # Use caching for large contexts
        return {
            "use_cache": True,
            "model": "gemini-2.5-flash",
            "ttl": "1800s"
        }
    elif context_tokens < 10000:
        # Use Flash Lite for small contexts
        return {
            "use_cache": False,
            "model": "gemini-2.5-flash-lite"
        }
    else:
        # Standard Flash with short cache
        return {
            "use_cache": True,
            "model": "gemini-2.5-flash",
            "ttl": "300s"
        }
```

## Integration with LangChain

### Setup

```python
from langchain_google_genai import ChatGoogleGenerativeAI

# Initialize Gemini through LangChain
llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    google_api_key=api_key,
    temperature=0.7,
    max_output_tokens=1024
)

# With structured output
from pydantic import BaseModel

class StructuredResponse(BaseModel):
    content: str
    metadata: dict

structured_llm = llm.with_structured_output(StructuredResponse)
```

### Streaming Support

```python
# Stream responses
async for chunk in llm.astream(messages):
    yield chunk.content

# Stream with events
async for event in llm.astream_events(messages):
    if event["event"] == "on_llm_new_token":
        yield event["data"]["chunk"]
```

## Multimodal Capabilities

### Image Input

```python
# Process images with text
response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents=[
        {"text": "Analyze this image"},
        {"image": image_data}
    ]
)
```

### Audio Processing

```python
# Process audio with different pricing
audio_config = {
    "model": "gemini-2.5-flash",
    "audio_input_rate": 1.00,  # $1/MTok for audio
    "text_input_rate": 0.30    # $0.30/MTok for text
}
```

## Error Handling

### Rate Limit Management

```python
import time
from typing import Optional

def call_gemini_with_retry(func, max_retries=3):
    """Handle rate limits with exponential backoff"""

    for attempt in range(max_retries):
        try:
            return func()
        except Exception as e:
            if "RESOURCE_EXHAUSTED" in str(e):
                wait_time = 2 ** attempt
                time.sleep(wait_time)
            else:
                raise

    raise Exception("Max retries exceeded")
```

### Cache Expiration Handling

```python
def safe_use_cache(cache_name, fallback_func):
    """Gracefully handle cache expiration"""

    try:
        response = client.models.generate_content(
            config=types.GenerateContentConfig(
                cached_content=cache_name
            )
        )
        return response
    except Exception as e:
        if "NOT_FOUND" in str(e):
            # Cache expired, use fallback
            return fallback_func()
        raise
```

## Monitoring and Analytics

### Key Metrics

```python
def track_gemini_metrics(response, persona_id):
    """Track important metrics for analysis"""

    metrics = {
        "persona_id": persona_id,
        "model": response.model,
        "prompt_tokens": response.usage_metadata.prompt_token_count,
        "cached_tokens": response.usage_metadata.cached_content_token_count,
        "output_tokens": response.usage_metadata.candidates_token_count,
        "total_tokens": response.usage_metadata.total_token_count,
        "cache_efficiency": calculate_cache_efficiency(response),
        "estimated_cost": calculate_gemini_cost(response),
        "response_time_ms": response.latency_ms
    }

    return metrics
```

### Cost Calculation

```python
def calculate_gemini_cost(response, model="gemini-2.5-flash"):
    """Calculate cost based on token usage"""

    usage = response.usage_metadata
    pricing = get_gemini_pricing(model)

    # Calculate based on token counts
    input_cost = (usage.prompt_token_count / 1_000_000) * pricing["input"]
    output_cost = (usage.candidates_token_count / 1_000_000) * pricing["output"]

    # Account for cached tokens (much cheaper)
    cache_cost = (usage.cached_content_token_count / 1_000_000) * pricing["cache_write"]

    total_cost = input_cost + output_cost + cache_cost

    return {
        "input_cost": input_cost,
        "output_cost": output_cost,
        "cache_cost": cache_cost,
        "total_cost": total_cost
    }
```

## Security Considerations

### API Key Management

```python
import os
from google import genai

# Use environment variables
api_key = os.environ.get("GEMINI_API_KEY")
if not api_key:
    raise ValueError("GEMINI_API_KEY not set")

client = genai.Client(api_key=api_key)
```

### Content Safety

```python
# Handle content filtering
safety_settings = {
    "HARM_CATEGORY_HARASSMENT": "BLOCK_MEDIUM_AND_ABOVE",
    "HARM_CATEGORY_HATE_SPEECH": "BLOCK_MEDIUM_AND_ABOVE",
    "HARM_CATEGORY_SEXUALLY_EXPLICIT": "BLOCK_MEDIUM_AND_ABOVE",
    "HARM_CATEGORY_DANGEROUS_CONTENT": "BLOCK_MEDIUM_AND_ABOVE"
}

response = client.models.generate_content(
    model=model,
    contents=prompt,
    safety_settings=safety_settings
)
```