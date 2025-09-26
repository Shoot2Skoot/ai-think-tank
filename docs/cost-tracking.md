# Cost Tracking Documentation

## Overview
This document provides comprehensive cost tracking strategies and implementation details for managing expenses across multiple AI providers in the multi-persona conversation simulator.

## Comparative Pricing Table

### Current Pricing (Per Million Tokens)

| Provider | Model | Input | Output | Cache Write (5m) | Cache Write (1h) | Cache Hit | Batch Discount |
|----------|-------|-------|--------|------------------|------------------|-----------|----------------|
| **Anthropic** |
| | Claude Opus 4 | $15.00 | $75.00 | $18.75 | $30.00 | $1.50 | N/A |
| | Claude Sonnet 4 | $3.00 | $15.00 | $3.75 | $6.00 | $0.30 | N/A |
| | Claude Sonnet 3.7 | $3.00 | $15.00 | $3.75 | $6.00 | $0.30 | N/A |
| **Google** |
| | Gemini 2.5 Pro (≤200k) | $1.25 | $10.00 | $0.31 | - | - | N/A |
| | Gemini 2.5 Pro (>200k) | $2.50 | $15.00 | $0.625 | - | - | N/A |
| | Gemini 2.5 Flash | $0.30 | $2.50 | $0.075 | - | - | N/A |
| | Gemini 2.5 Flash Lite | $0.10 | $0.40 | $0.025 | - | - | N/A |
| **OpenAI** |
| | GPT-4.1 | $2.00 | $8.00 | N/A | N/A | $0.50* | 50% |
| | GPT-4.1 Mini | $0.40 | $1.60 | N/A | N/A | $0.10* | 50% |
| | GPT-4.1 Nano | $0.10 | $0.40 | N/A | N/A | $0.025* | 50% |

*OpenAI lists these as "cached input" prices but doesn't have explicit cache control like Anthropic/Gemini

## Cost Calculation Formulas

### Base Cost Calculation

```python
def calculate_base_cost(provider, model, input_tokens, output_tokens):
    """Calculate base cost without caching or discounts"""

    pricing = get_pricing(provider, model)

    input_cost = (input_tokens / 1_000_000) * pricing['input']
    output_cost = (output_tokens / 1_000_000) * pricing['output']

    return input_cost + output_cost
```

### With Caching

```python
def calculate_cost_with_cache(provider, model, tokens):
    """Calculate cost considering cache hits and writes"""

    pricing = get_pricing(provider, model)

    # Breakdown of token types
    new_input = tokens['new_input']
    cached_input = tokens['cached_input']
    cache_write = tokens['cache_write']
    output = tokens['output']

    # Calculate costs
    costs = {
        'new_input': (new_input / 1_000_000) * pricing['input'],
        'cached_input': (cached_input / 1_000_000) * pricing['cache_hit'],
        'cache_write': (cache_write / 1_000_000) * pricing['cache_write_5m'],
        'output': (output / 1_000_000) * pricing['output']
    }

    costs['total'] = sum(costs.values())
    costs['savings'] = calculate_cache_savings(tokens, pricing)

    return costs
```

### Batch Processing Discounts

```python
def calculate_batch_cost(provider, model, tokens):
    """Calculate cost with batch processing discounts"""

    base_cost = calculate_base_cost(provider, model, tokens['input'], tokens['output'])

    # Apply batch discounts
    if provider == 'openai':
        return base_cost * 0.5  # 50% discount
    elif provider == 'anthropic':
        return base_cost * 0.5  # 50% discount for batch API
    else:
        return base_cost  # No batch discount for Gemini currently
```

## Implementation Strategy

### 1. Real-time Cost Tracking

```python
from dataclasses import dataclass
from typing import Dict, List
import time

@dataclass
class MessageCost:
    """Cost tracking for a single message"""
    message_id: str
    persona_id: str
    provider: str
    model: str
    input_tokens: int
    output_tokens: int
    cached_tokens: int
    cache_write_tokens: int
    total_cost: float
    timestamp: float
    breakdown: Dict[str, float]

class RealTimeCostTracker:
    """Track costs in real-time across all providers"""

    def __init__(self):
        self.messages: List[MessageCost] = []
        self.conversation_costs: Dict[str, float] = {}
        self.persona_costs: Dict[str, float] = {}
        self.provider_costs: Dict[str, float] = {}

    def track_message(self, message_data):
        """Track cost for a single message"""

        # Calculate cost based on provider
        cost = self.calculate_message_cost(message_data)

        # Create cost record
        message_cost = MessageCost(
            message_id=message_data['id'],
            persona_id=message_data['persona_id'],
            provider=message_data['provider'],
            model=message_data['model'],
            input_tokens=message_data['tokens']['input'],
            output_tokens=message_data['tokens']['output'],
            cached_tokens=message_data['tokens'].get('cached', 0),
            cache_write_tokens=message_data['tokens'].get('cache_write', 0),
            total_cost=cost['total'],
            timestamp=time.time(),
            breakdown=cost['breakdown']
        )

        # Update aggregates
        self.messages.append(message_cost)
        self.update_aggregates(message_cost)

        return message_cost

    def calculate_message_cost(self, message_data):
        """Calculate cost for a message based on provider pricing"""

        provider = message_data['provider']
        model = message_data['model']
        tokens = message_data['tokens']

        if provider == 'anthropic':
            return self.calculate_anthropic_cost(model, tokens)
        elif provider == 'gemini':
            return self.calculate_gemini_cost(model, tokens)
        elif provider == 'openai':
            return self.calculate_openai_cost(model, tokens)

    def calculate_anthropic_cost(self, model, tokens):
        """Calculate Anthropic-specific costs"""

        pricing = self.get_anthropic_pricing(model)

        breakdown = {
            'input': (tokens['input'] / 1_000_000) * pricing['input'],
            'output': (tokens['output'] / 1_000_000) * pricing['output'],
            'cache_hit': (tokens.get('cached', 0) / 1_000_000) * pricing['cache_hit'],
            'cache_write': (tokens.get('cache_write', 0) / 1_000_000) * pricing['cache_write_5m']
        }

        return {
            'total': sum(breakdown.values()),
            'breakdown': breakdown
        }

    def update_aggregates(self, message_cost):
        """Update aggregate costs"""

        # By conversation
        conv_id = message_cost.message_id.split('_')[0]
        self.conversation_costs[conv_id] = self.conversation_costs.get(conv_id, 0) + message_cost.total_cost

        # By persona
        self.persona_costs[message_cost.persona_id] = \
            self.persona_costs.get(message_cost.persona_id, 0) + message_cost.total_cost

        # By provider
        self.provider_costs[message_cost.provider] = \
            self.provider_costs.get(message_cost.provider, 0) + message_cost.total_cost
```

### 2. Cost Estimation

```python
class CostEstimator:
    """Estimate costs before execution"""

    def __init__(self, pricing_data):
        self.pricing = pricing_data

    def estimate_conversation_cost(
        self,
        personas: List,
        estimated_messages: int,
        avg_message_length: int = 150
    ):
        """Estimate total conversation cost"""

        total_estimate = 0
        estimates_by_persona = {}

        for persona in personas:
            # Estimate tokens per message
            input_tokens = avg_message_length * 5  # Context grows
            output_tokens = avg_message_length

            # Calculate per-message cost
            message_cost = self.calculate_message_cost(
                persona.provider,
                persona.model,
                input_tokens,
                output_tokens
            )

            # Estimate messages for this persona
            persona_messages = estimated_messages / len(personas)

            # Total for persona
            persona_total = message_cost * persona_messages
            estimates_by_persona[persona.id] = persona_total
            total_estimate += persona_total

        return {
            'total': total_estimate,
            'by_persona': estimates_by_persona,
            'per_message_avg': total_estimate / estimated_messages
        }

    def estimate_with_caching(self, base_estimate, cache_hit_rate=0.7):
        """Adjust estimate considering caching"""

        # Caching can reduce costs by 70-90%
        cache_savings = base_estimate * cache_hit_rate * 0.8
        return base_estimate - cache_savings
```

### 3. Budget Management

```python
class BudgetManager:
    """Manage budgets and limits"""

    def __init__(self):
        self.user_budgets = {}  # user_id -> budget
        self.user_spending = {}  # user_id -> current spending
        self.alerts = []

    def set_user_budget(self, user_id, monthly_budget, daily_limit=None):
        """Set budget for a user"""

        self.user_budgets[user_id] = {
            'monthly': monthly_budget,
            'daily': daily_limit or monthly_budget / 30,
            'warning_threshold': monthly_budget * 0.8,
            'created_at': time.time()
        }

    def check_budget(self, user_id, estimated_cost):
        """Check if user has budget for operation"""

        if user_id not in self.user_budgets:
            return True, "No budget set"

        budget = self.user_budgets[user_id]
        spending = self.user_spending.get(user_id, {})

        # Check daily limit
        today_spending = spending.get('daily', 0)
        if today_spending + estimated_cost > budget['daily']:
            return False, "Daily budget exceeded"

        # Check monthly limit
        monthly_spending = spending.get('monthly', 0)
        if monthly_spending + estimated_cost > budget['monthly']:
            return False, "Monthly budget exceeded"

        # Check warning threshold
        if monthly_spending + estimated_cost > budget['warning_threshold']:
            self.create_alert(user_id, "Approaching monthly budget limit")

        return True, "Within budget"

    def record_spending(self, user_id, amount):
        """Record actual spending"""

        if user_id not in self.user_spending:
            self.user_spending[user_id] = {'daily': 0, 'monthly': 0}

        self.user_spending[user_id]['daily'] += amount
        self.user_spending[user_id]['monthly'] += amount

        # Check for alerts
        self.check_alerts(user_id)

    def create_alert(self, user_id, message):
        """Create budget alert"""

        alert = {
            'user_id': user_id,
            'message': message,
            'timestamp': time.time(),
            'acknowledged': False
        }

        self.alerts.append(alert)
        return alert
```

### 4. Cost Optimization Strategies

```python
class CostOptimizer:
    """Optimize costs across providers and models"""

    def __init__(self, cost_tracker, cache_manager):
        self.cost_tracker = cost_tracker
        self.cache_manager = cache_manager

    def recommend_model(self, task_requirements):
        """Recommend most cost-effective model for task"""

        candidates = []

        # Evaluate each model
        for provider in ['anthropic', 'gemini', 'openai']:
            for model in self.get_models(provider):
                score = self.evaluate_model(model, task_requirements)
                cost = self.estimate_cost(model, task_requirements)

                candidates.append({
                    'provider': provider,
                    'model': model,
                    'score': score,
                    'cost': cost,
                    'value': score / cost  # Value ratio
                })

        # Sort by value
        candidates.sort(key=lambda x: x['value'], reverse=True)

        return candidates[0]

    def optimize_cache_strategy(self, conversation_patterns):
        """Optimize caching based on conversation patterns"""

        recommendations = []

        # Analyze reuse patterns
        reuse_frequency = self.analyze_reuse(conversation_patterns)

        if reuse_frequency > 0.7:
            recommendations.append({
                'strategy': 'aggressive_caching',
                'ttl': '1h',
                'providers': ['anthropic', 'gemini'],
                'estimated_savings': '70-90%'
            })
        elif reuse_frequency > 0.3:
            recommendations.append({
                'strategy': 'moderate_caching',
                'ttl': '5m',
                'providers': ['anthropic', 'gemini'],
                'estimated_savings': '30-50%'
            })
        else:
            recommendations.append({
                'strategy': 'minimal_caching',
                'ttl': None,
                'providers': [],
                'estimated_savings': '0-10%'
            })

        return recommendations

    def suggest_batch_processing(self, message_queue):
        """Suggest when to use batch processing"""

        if len(message_queue) < 5:
            return False, "Too few messages for batch processing"

        # Check urgency
        urgency_scores = [msg.urgency for msg in message_queue]
        avg_urgency = sum(urgency_scores) / len(urgency_scores)

        if avg_urgency < 0.3:  # Low urgency
            potential_savings = len(message_queue) * 0.001 * 0.5  # 50% savings
            return True, f"Batch processing could save ${potential_savings:.4f}"

        return False, "Messages too urgent for batch processing"
```

### 5. Database Schema for Cost Tracking

```sql
-- Cost tracking tables
CREATE TABLE cost_records (
    id UUID PRIMARY KEY,
    message_id UUID REFERENCES messages(id),
    persona_id UUID REFERENCES personas(id),
    conversation_id UUID REFERENCES conversations(id),
    user_id UUID REFERENCES auth.users(id),
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    input_tokens INTEGER NOT NULL,
    output_tokens INTEGER NOT NULL,
    cached_tokens INTEGER DEFAULT 0,
    cache_write_tokens INTEGER DEFAULT 0,
    input_cost DECIMAL(10, 8),
    output_cost DECIMAL(10, 8),
    cache_cost DECIMAL(10, 8),
    total_cost DECIMAL(10, 8) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Aggregated costs by hour
CREATE TABLE hourly_costs (
    user_id UUID REFERENCES auth.users(id),
    hour_start TIMESTAMP,
    provider TEXT,
    total_cost DECIMAL(10, 6),
    message_count INTEGER,
    total_tokens INTEGER,
    cache_hit_rate FLOAT,
    PRIMARY KEY (user_id, hour_start, provider)
);

-- Budget configuration
CREATE TABLE user_budgets (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id),
    monthly_limit DECIMAL(10, 2),
    daily_limit DECIMAL(10, 2),
    warning_threshold DECIMAL(10, 2),
    auto_stop BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Budget alerts
CREATE TABLE budget_alerts (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    alert_type TEXT CHECK (alert_type IN ('warning', 'limit_reached', 'stopped')),
    message TEXT,
    threshold_value DECIMAL(10, 2),
    current_value DECIMAL(10, 2),
    acknowledged BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_cost_records_user_date ON cost_records(user_id, created_at);
CREATE INDEX idx_cost_records_conversation ON cost_records(conversation_id);
CREATE INDEX idx_hourly_costs_user ON hourly_costs(user_id, hour_start);
```

### 6. Real-time Cost Display

```python
class CostDisplay:
    """Format and display costs in real-time"""

    @staticmethod
    def format_cost(amount: float) -> str:
        """Format cost for display"""
        if amount < 0.01:
            return f"${amount:.6f}"
        elif amount < 1:
            return f"${amount:.4f}"
        else:
            return f"${amount:.2f}"

    @staticmethod
    def create_cost_breakdown(cost_data):
        """Create detailed cost breakdown"""

        return {
            'summary': {
                'total': CostDisplay.format_cost(cost_data['total']),
                'input': CostDisplay.format_cost(cost_data['input']),
                'output': CostDisplay.format_cost(cost_data['output']),
                'cache_savings': CostDisplay.format_cost(cost_data.get('cache_savings', 0))
            },
            'tokens': {
                'input': cost_data['input_tokens'],
                'output': cost_data['output_tokens'],
                'cached': cost_data.get('cached_tokens', 0),
                'total': cost_data['input_tokens'] + cost_data['output_tokens']
            },
            'efficiency': {
                'cache_hit_rate': f"{cost_data.get('cache_hit_rate', 0):.1%}",
                'cost_per_1k_tokens': CostDisplay.format_cost(
                    cost_data['total'] / (cost_data['input_tokens'] + cost_data['output_tokens']) * 1000
                )
            }
        }

    @staticmethod
    def generate_cost_report(conversation_id):
        """Generate comprehensive cost report"""

        # Fetch cost data
        costs = fetch_conversation_costs(conversation_id)

        report = {
            'conversation_id': conversation_id,
            'total_cost': sum(c['total_cost'] for c in costs),
            'message_count': len(costs),
            'by_provider': {},
            'by_persona': {},
            'over_time': [],
            'optimization_opportunities': []
        }

        # Group by provider
        for cost in costs:
            provider = cost['provider']
            if provider not in report['by_provider']:
                report['by_provider'][provider] = {
                    'total': 0,
                    'messages': 0,
                    'avg_per_message': 0
                }

            report['by_provider'][provider]['total'] += cost['total_cost']
            report['by_provider'][provider]['messages'] += 1

        # Calculate averages
        for provider in report['by_provider']:
            data = report['by_provider'][provider]
            data['avg_per_message'] = data['total'] / data['messages']

        # Identify optimization opportunities
        if report['total_cost'] > 0.10:
            report['optimization_opportunities'].append(
                "Consider using batch processing for 50% cost reduction"
            )

        cache_rate = sum(c.get('cached_tokens', 0) for c in costs) / \
                    sum(c['input_tokens'] for c in costs)

        if cache_rate < 0.5:
            report['optimization_opportunities'].append(
                "Low cache utilization. Enable caching for up to 90% cost savings"
            )

        return report
```

### 7. Cost Monitoring Dashboard

```python
class CostMonitoringDashboard:
    """Real-time cost monitoring dashboard data"""

    def __init__(self, cost_tracker):
        self.cost_tracker = cost_tracker

    def get_dashboard_data(self, user_id, time_range='24h'):
        """Get dashboard data for display"""

        return {
            'current_costs': self.get_current_costs(user_id),
            'trends': self.get_cost_trends(user_id, time_range),
            'breakdown': self.get_cost_breakdown(user_id),
            'projections': self.get_cost_projections(user_id),
            'alerts': self.get_active_alerts(user_id),
            'optimization_tips': self.get_optimization_tips(user_id)
        }

    def get_current_costs(self, user_id):
        """Get current cost metrics"""

        today_cost = self.cost_tracker.get_daily_cost(user_id)
        month_cost = self.cost_tracker.get_monthly_cost(user_id)
        budget = self.cost_tracker.get_user_budget(user_id)

        return {
            'today': {
                'amount': today_cost,
                'formatted': CostDisplay.format_cost(today_cost),
                'vs_limit': today_cost / budget['daily'] if budget else 0,
                'remaining': budget['daily'] - today_cost if budget else None
            },
            'month': {
                'amount': month_cost,
                'formatted': CostDisplay.format_cost(month_cost),
                'vs_limit': month_cost / budget['monthly'] if budget else 0,
                'remaining': budget['monthly'] - month_cost if budget else None
            },
            'last_hour': self.cost_tracker.get_hourly_cost(user_id)
        }

    def get_cost_trends(self, user_id, time_range):
        """Get cost trends over time"""

        if time_range == '24h':
            data = self.cost_tracker.get_hourly_costs(user_id, 24)
        elif time_range == '7d':
            data = self.cost_tracker.get_daily_costs(user_id, 7)
        elif time_range == '30d':
            data = self.cost_tracker.get_daily_costs(user_id, 30)

        return {
            'labels': [d['time'] for d in data],
            'values': [d['cost'] for d in data],
            'trend': self.calculate_trend(data)
        }

    def get_optimization_tips(self, user_id):
        """Get personalized optimization tips"""

        tips = []
        usage = self.cost_tracker.get_usage_patterns(user_id)

        # Check cache utilization
        if usage['cache_hit_rate'] < 0.3:
            tips.append({
                'priority': 'high',
                'tip': 'Enable caching for 70-90% cost reduction',
                'potential_savings': usage['total_cost'] * 0.7
            })

        # Check model selection
        if usage['avg_cost_per_message'] > 0.01:
            tips.append({
                'priority': 'medium',
                'tip': 'Consider using lighter models for simple responses',
                'potential_savings': usage['total_cost'] * 0.3
            })

        # Check batch processing
        if usage['message_frequency'] < 0.2:  # Low urgency
            tips.append({
                'priority': 'low',
                'tip': 'Use batch processing for non-urgent messages',
                'potential_savings': usage['total_cost'] * 0.5
            })

        return sorted(tips, key=lambda x: x['potential_savings'], reverse=True)
```

## Best Practices

### 1. Implement Tiered Caching
- Cache persona definitions for 1 hour (rarely change)
- Cache conversation context for 5 minutes (frequently accessed)
- Don't cache user messages (always unique)

### 2. Smart Model Selection
- Use Gemini Flash Lite for simple responses (cheapest)
- Use Claude Sonnet for balanced performance
- Reserve Opus/GPT-4 for complex reasoning

### 3. Batch Processing
- Queue non-urgent messages
- Process in batches for 50% discount (OpenAI)
- Ideal for generating multiple persona responses

### 4. Cost Alerts
- Set warning at 80% of budget
- Auto-stop at 100% of budget
- Daily and monthly limits

### 5. Regular Optimization
- Weekly cost analysis
- Identify high-cost patterns
- Adjust caching and model strategies