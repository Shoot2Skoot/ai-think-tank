# LangChain Integration Documentation

## Overview
LangChain provides a unified interface for integrating multiple AI providers, making it ideal for our multi-persona conversation simulator where different personas may use different models and providers.

## Why LangChain?

### Key Benefits
- **Unified Interface**: Single API for OpenAI, Anthropic, Google, and more
- **Provider Agnostic**: Easy switching between providers without code changes
- **Built-in Features**: Streaming, callbacks, structured outputs, memory management
- **Cost Tracking**: Integrated token usage and cost callbacks
- **Community**: Large ecosystem with extensive examples and integrations

## Installation

```bash
# Core package
pip install langchain

# Provider-specific packages
pip install langchain-openai      # OpenAI integration
pip install langchain-anthropic   # Anthropic integration
pip install langchain-google-genai # Google Gemini integration

# Additional utilities
pip install langchain-community    # Community integrations
pip install langgraph             # For complex workflows
pip install langsmith             # For monitoring and debugging
```

## Basic Multi-Provider Setup

### Initializing Multiple Providers

```python
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
from langchain_google_genai import ChatGoogleGenerativeAI
from typing import Union

class MultiProviderManager:
    """Manage multiple AI providers through LangChain"""

    def __init__(self):
        # Initialize all providers
        self.providers = {
            'openai': ChatOpenAI(
                model="gpt-4-turbo-preview",
                temperature=0.7
            ),
            'anthropic': ChatAnthropic(
                model="claude-3-opus-20240229",
                temperature=0.7
            ),
            'gemini': ChatGoogleGenerativeAI(
                model="gemini-pro",
                temperature=0.7
            )
        }

    def get_provider(self, provider_name: str):
        """Get specific provider by name"""
        return self.providers.get(provider_name)

    def get_model_for_persona(self, persona):
        """Get appropriate model based on persona configuration"""
        provider = self.providers.get(persona.provider)
        if provider:
            # Update model-specific settings
            provider.model_name = persona.model
            provider.temperature = persona.temperature
        return provider
```

## Unified Message Format

### Standard Message Structure

```python
from langchain.schema import HumanMessage, SystemMessage, AIMessage

def format_messages_for_langchain(conversation_history, persona_definition):
    """Convert conversation to LangChain message format"""

    messages = []

    # Add system message for persona
    messages.append(SystemMessage(
        content=persona_definition
    ))

    # Add conversation history
    for msg in conversation_history:
        if msg.role == "user":
            messages.append(HumanMessage(content=msg.content))
        elif msg.role == "assistant":
            messages.append(AIMessage(content=msg.content))

    return messages
```

## Structured Output with Pydantic

### Define Response Schema

```python
from pydantic import BaseModel, Field
from typing import List, Optional

class PersonaResponse(BaseModel):
    """Structured response from any persona"""

    message: str = Field(description="The main response message")
    confidence: float = Field(description="Confidence level (0-1)", ge=0, le=1)
    reasoning: str = Field(description="Internal reasoning process")
    emotions: List[str] = Field(description="Current emotional state")
    relevant_expertise: List[str] = Field(description="Relevant areas of expertise used")
    suggested_next_speaker: Optional[str] = Field(description="Suggested next persona to speak")

class TurnDecision(BaseModel):
    """Decision for next speaker"""

    next_persona_id: str = Field(description="ID of the next persona to speak")
    reasoning: str = Field(description="Why this persona should speak next")
    priority_score: float = Field(description="Priority score (0-1)", ge=0, le=1)
    factors: dict = Field(description="Factors considered in decision")
```

### Apply Structured Output Across Providers

```python
def create_structured_llm(provider_name: str, schema: BaseModel):
    """Create LLM with structured output for any provider"""

    if provider_name == 'openai':
        llm = ChatOpenAI(model="gpt-4-turbo-preview")
    elif provider_name == 'anthropic':
        llm = ChatAnthropic(model="claude-3-opus-20240229")
    elif provider_name == 'gemini':
        llm = ChatGoogleGenerativeAI(model="gemini-pro")
    else:
        raise ValueError(f"Unknown provider: {provider_name}")

    # Apply structured output
    return llm.with_structured_output(schema)

# Usage
structured_llm = create_structured_llm('openai', PersonaResponse)
response = structured_llm.invoke(messages)
# response is now a PersonaResponse object
```

## Cost Tracking

### Unified Cost Tracking

```python
from langchain_community.callbacks import get_openai_callback
from typing import Dict, Any
import json

class UnifiedCostTracker:
    """Track costs across all providers"""

    def __init__(self):
        self.costs = {
            'openai': {'total': 0, 'sessions': []},
            'anthropic': {'total': 0, 'sessions': []},
            'gemini': {'total': 0, 'sessions': []}
        }

    def track_openai_cost(self, func, *args, **kwargs):
        """Track OpenAI costs"""
        with get_openai_callback() as cb:
            result = func(*args, **kwargs)
            cost_data = {
                'tokens_used': cb.total_tokens,
                'prompt_tokens': cb.prompt_tokens,
                'completion_tokens': cb.completion_tokens,
                'total_cost': cb.total_cost
            }
            self.costs['openai']['sessions'].append(cost_data)
            self.costs['openai']['total'] += cb.total_cost
            return result, cost_data

    def track_anthropic_cost(self, response):
        """Extract cost from Anthropic response"""
        usage = response.response_metadata.get('usage', {})

        # Calculate cost based on pricing
        input_cost = (usage.get('input_tokens', 0) / 1_000_000) * 3.00  # $3/MTok
        output_cost = (usage.get('output_tokens', 0) / 1_000_000) * 15.00  # $15/MTok
        cache_savings = (usage.get('cache_read_input_tokens', 0) / 1_000_000) * 2.70

        total_cost = input_cost + output_cost - cache_savings

        cost_data = {
            'input_tokens': usage.get('input_tokens', 0),
            'output_tokens': usage.get('output_tokens', 0),
            'cached_tokens': usage.get('cache_read_input_tokens', 0),
            'total_cost': total_cost
        }

        self.costs['anthropic']['sessions'].append(cost_data)
        self.costs['anthropic']['total'] += total_cost

        return cost_data

    def get_total_costs(self) -> Dict[str, float]:
        """Get total costs by provider"""
        return {
            provider: data['total']
            for provider, data in self.costs.items()
        }
```

## Streaming Support

### Unified Streaming Interface

```python
async def stream_response(llm, messages, callback=None):
    """Stream responses from any provider"""

    async for chunk in llm.astream(messages):
        # Process chunk
        if hasattr(chunk, 'content'):
            content = chunk.content
        else:
            content = str(chunk)

        # Yield content
        yield content

        # Optional callback
        if callback:
            await callback(content)

# Advanced streaming with events
async def stream_with_metadata(llm, messages):
    """Stream with detailed metadata"""

    async for event in llm.astream_events(messages, version="v1"):
        if event["event"] == "on_llm_new_token":
            # New token generated
            yield {
                "type": "token",
                "content": event["data"]["chunk"]
            }
        elif event["event"] == "on_llm_end":
            # Generation complete
            output = event["data"]["output"]
            yield {
                "type": "complete",
                "usage": output.response_metadata.get("usage"),
                "model": output.response_metadata.get("model")
            }
```

## Memory Management

### Conversation Memory

```python
from langchain.memory import ConversationBufferWindowMemory
from langchain.memory import ConversationSummaryMemory

class PersonaMemory:
    """Manage memory for each persona"""

    def __init__(self, llm, window_size=10):
        # Window memory for recent context
        self.window_memory = ConversationBufferWindowMemory(
            k=window_size,
            return_messages=True
        )

        # Summary memory for long conversations
        self.summary_memory = ConversationSummaryMemory(
            llm=llm,
            return_messages=True
        )

    def add_message(self, role, content):
        """Add message to memory"""
        if role == "user":
            self.window_memory.chat_memory.add_user_message(content)
            self.summary_memory.chat_memory.add_user_message(content)
        else:
            self.window_memory.chat_memory.add_ai_message(content)
            self.summary_memory.chat_memory.add_ai_message(content)

    def get_context(self, use_summary=False):
        """Get conversation context"""
        if use_summary:
            return self.summary_memory.chat_memory.messages
        return self.window_memory.chat_memory.messages
```

## Chain Composition

### Building Complex Chains

```python
from langchain.chains import LLMChain
from langchain.prompts import ChatPromptTemplate
from langchain.chains import SequentialChain

def create_persona_chain(llm, persona):
    """Create a chain for persona responses"""

    # First chain: Analyze context
    analysis_prompt = ChatPromptTemplate.from_messages([
        ("system", "Analyze the conversation context and determine key themes."),
        ("human", "{conversation_history}")
    ])

    analysis_chain = LLMChain(
        llm=llm,
        prompt=analysis_prompt,
        output_key="context_analysis"
    )

    # Second chain: Generate response
    response_prompt = ChatPromptTemplate.from_messages([
        ("system", persona.system_prompt),
        ("human", "Context: {context_analysis}\n\nGenerate your response: {user_input}")
    ])

    response_chain = LLMChain(
        llm=llm,
        prompt=response_prompt,
        output_key="response"
    )

    # Combine chains
    overall_chain = SequentialChain(
        chains=[analysis_chain, response_chain],
        input_variables=["conversation_history", "user_input"],
        output_variables=["context_analysis", "response"]
    )

    return overall_chain
```

## Provider-Specific Features

### Handling Provider Differences

```python
class ProviderAdapter:
    """Adapt provider-specific features to unified interface"""

    @staticmethod
    def add_caching(llm, provider: str, cache_content: str):
        """Add caching based on provider"""

        if provider == 'anthropic':
            # Anthropic-specific caching
            return llm.bind(
                cache_control={"type": "ephemeral"},
                system=cache_content
            )
        elif provider == 'gemini':
            # Gemini would need different approach
            # (handled through their caching API)
            return llm
        else:
            # OpenAI doesn't have built-in caching
            return llm

    @staticmethod
    def set_safety_filters(llm, provider: str):
        """Set safety filters based on provider"""

        if provider == 'gemini':
            return llm.bind(
                safety_settings={
                    "HARM_CATEGORY_HARASSMENT": "BLOCK_MEDIUM_AND_ABOVE",
                    "HARM_CATEGORY_HATE_SPEECH": "BLOCK_MEDIUM_AND_ABOVE"
                }
            )
        return llm  # Other providers handle internally
```

## Error Handling

### Unified Error Handling

```python
from langchain.callbacks import RetryCallbackHandler
from tenacity import retry, stop_after_attempt, wait_exponential
import logging

logger = logging.getLogger(__name__)

class UnifiedErrorHandler:
    """Handle errors across all providers"""

    @staticmethod
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=4, max=60)
    )
    def safe_invoke(llm, messages, fallback_llm=None):
        """Safely invoke LLM with retry and fallback"""

        try:
            return llm.invoke(messages)
        except Exception as e:
            logger.error(f"Primary LLM failed: {e}")

            if fallback_llm:
                logger.info("Attempting fallback LLM")
                try:
                    return fallback_llm.invoke(messages)
                except Exception as fallback_error:
                    logger.error(f"Fallback also failed: {fallback_error}")
                    raise

            raise

    @staticmethod
    def handle_rate_limit(error, provider: str):
        """Handle rate limit errors by provider"""

        wait_times = {
            'openai': 60,
            'anthropic': 30,
            'gemini': 45
        }

        wait_time = wait_times.get(provider, 60)
        logger.warning(f"Rate limited on {provider}. Waiting {wait_time}s")
        time.sleep(wait_time)
```

## Callbacks and Monitoring

### Custom Callbacks

```python
from langchain.callbacks.base import BaseCallbackHandler
from typing import Any, Dict, List

class ConversationCallbackHandler(BaseCallbackHandler):
    """Custom callback for monitoring conversation flow"""

    def __init__(self, conversation_id: str):
        self.conversation_id = conversation_id
        self.events = []

    def on_llm_start(self, serialized: Dict[str, Any], prompts: List[str], **kwargs):
        """Log when LLM starts"""
        self.events.append({
            'type': 'llm_start',
            'conversation_id': self.conversation_id,
            'timestamp': time.time(),
            'model': serialized.get('name')
        })

    def on_llm_end(self, response, **kwargs):
        """Log when LLM completes"""
        self.events.append({
            'type': 'llm_end',
            'conversation_id': self.conversation_id,
            'timestamp': time.time(),
            'tokens': response.llm_output.get('token_usage')
        })

    def on_llm_error(self, error: Exception, **kwargs):
        """Log errors"""
        self.events.append({
            'type': 'error',
            'conversation_id': self.conversation_id,
            'timestamp': time.time(),
            'error': str(error)
        })
```

## Testing and Mocking

### Mock LLM for Testing

```python
from langchain.llms.fake import FakeListLLM

def create_test_llm(responses: List[str]):
    """Create mock LLM for testing"""

    return FakeListLLM(responses=responses)

# Test persona response
test_responses = [
    '{"message": "Test response", "confidence": 0.8, "reasoning": "Test reasoning", "emotions": ["neutral"]}'
]

test_llm = create_test_llm(test_responses)
structured_test_llm = test_llm.with_structured_output(PersonaResponse)

# Use in tests
response = structured_test_llm.invoke("Test input")
assert response.confidence == 0.8
```

## Best Practices

### 1. Provider Selection

```python
class SmartProviderSelector:
    """Intelligently select providers based on requirements"""

    @staticmethod
    def select_provider(
        task_type: str,
        required_features: List[str],
        budget_constraint: float
    ) -> str:
        """Select best provider for task"""

        provider_capabilities = {
            'openai': {
                'features': ['json_mode', 'function_calling', 'vision'],
                'cost_rating': 'medium',
                'best_for': ['general', 'coding', 'analysis']
            },
            'anthropic': {
                'features': ['caching', 'long_context', 'xml_mode'],
                'cost_rating': 'medium',
                'best_for': ['writing', 'analysis', 'conversation']
            },
            'gemini': {
                'features': ['caching', 'multimodal', 'grounding'],
                'cost_rating': 'low',
                'best_for': ['multimodal', 'search', 'factual']
            }
        }

        # Score each provider
        scores = {}
        for provider, caps in provider_capabilities.items():
            score = 0

            # Check feature requirements
            for feature in required_features:
                if feature in caps['features']:
                    score += 1

            # Check task suitability
            if task_type in caps['best_for']:
                score += 2

            # Check budget
            if budget_constraint < 0.01:
                if caps['cost_rating'] == 'low':
                    score += 1

            scores[provider] = score

        # Return provider with highest score
        return max(scores, key=scores.get)
```

### 2. Context Optimization

```python
def optimize_context_for_provider(messages, provider: str, max_tokens: int):
    """Optimize context based on provider limits"""

    provider_limits = {
        'openai': 128000,     # GPT-4 Turbo
        'anthropic': 200000,  # Claude 3
        'gemini': 1000000     # Gemini 1.5 Pro
    }

    limit = min(max_tokens, provider_limits.get(provider, 100000))

    # Implement sliding window
    optimized = []
    current_tokens = 0

    for msg in reversed(messages):
        msg_tokens = estimate_tokens(msg)
        if current_tokens + msg_tokens > limit:
            break
        optimized.insert(0, msg)
        current_tokens += msg_tokens

    return optimized
```

### 3. Response Validation

```python
def validate_structured_response(response: BaseModel, schema: type) -> bool:
    """Validate that response matches expected schema"""

    try:
        # Check instance type
        if not isinstance(response, schema):
            return False

        # Validate required fields
        for field_name, field_info in schema.__fields__.items():
            if field_info.required and not hasattr(response, field_name):
                return False

        # Additional validation logic
        if hasattr(response, 'confidence'):
            if not 0 <= response.confidence <= 1:
                return False

        return True

    except Exception as e:
        logger.error(f"Validation error: {e}")
        return False
```

## Integration Examples

### Complete Persona Response Flow

```python
async def generate_persona_response(
    persona,
    conversation_history,
    cost_tracker,
    cache_manager=None
):
    """Complete flow for generating a persona response"""

    # 1. Select provider
    provider_name = persona.provider
    llm = get_llm_for_provider(provider_name, persona.model)

    # 2. Apply caching if available
    if cache_manager and provider_name in ['anthropic', 'gemini']:
        llm = cache_manager.apply_cache(llm, persona.id)

    # 3. Create structured LLM
    structured_llm = llm.with_structured_output(PersonaResponse)

    # 4. Prepare messages
    messages = format_messages_for_langchain(
        conversation_history,
        persona.system_prompt
    )

    # 5. Generate response with cost tracking
    if provider_name == 'openai':
        response, cost_data = cost_tracker.track_openai_cost(
            structured_llm.invoke,
            messages
        )
    else:
        response = structured_llm.invoke(messages)
        if provider_name == 'anthropic':
            cost_data = cost_tracker.track_anthropic_cost(response)
        else:
            cost_data = estimate_cost(response, provider_name)

    # 6. Validate response
    if not validate_structured_response(response, PersonaResponse):
        raise ValueError("Invalid response structure")

    # 7. Return response with metadata
    return {
        'response': response,
        'cost': cost_data,
        'provider': provider_name,
        'model': persona.model,
        'persona_id': persona.id
    }
```

### Turn Orchestration

```python
async def determine_next_speaker(
    personas,
    conversation_history,
    conversation_mode
):
    """Determine which persona should speak next"""

    # Use lightweight model for orchestration
    orchestrator = ChatOpenAI(
        model="gpt-3.5-turbo",
        temperature=0.3
    ).with_structured_output(TurnDecision)

    # Prepare context
    persona_descriptions = "\n".join([
        f"- {p.id}: {p.name} ({p.expertise})"
        for p in personas
    ])

    recent_messages = conversation_history[-5:]
    context = "\n".join([
        f"{msg.persona_id}: {msg.content[:100]}..."
        for msg in recent_messages
    ])

    prompt = f"""
    Conversation Mode: {conversation_mode}

    Available Personas:
    {persona_descriptions}

    Recent Conversation:
    {context}

    Who should speak next and why?
    """

    decision = orchestrator.invoke([
        SystemMessage(content="You are a conversation orchestrator."),
        HumanMessage(content=prompt)
    ])

    return decision
```

## Performance Optimization

### Batching Requests

```python
from concurrent.futures import ThreadPoolExecutor, as_completed

async def batch_generate_responses(personas, context):
    """Generate responses from multiple personas in parallel"""

    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = {}

        for persona in personas:
            future = executor.submit(
                generate_persona_response,
                persona,
                context
            )
            futures[future] = persona.id

        results = {}
        for future in as_completed(futures):
            persona_id = futures[future]
            try:
                results[persona_id] = future.result()
            except Exception as e:
                logger.error(f"Failed for persona {persona_id}: {e}")
                results[persona_id] = None

        return results
```

## Monitoring with LangSmith

### Setup LangSmith

```python
import os
from langsmith import Client

# Set up LangSmith
os.environ["LANGCHAIN_TRACING_V2"] = "true"
os.environ["LANGCHAIN_API_KEY"] = "your-api-key"
os.environ["LANGCHAIN_PROJECT"] = "persona-conversations"

client = Client()

# Create custom runs
with client.create_run(
    name="persona_conversation",
    run_type="chain",
    inputs={"conversation_id": "conv_123"}
) as run:
    # Your conversation logic here
    response = generate_persona_response(...)

    # Log outputs
    client.update_run(
        run.id,
        outputs={"response": response}
    )
```