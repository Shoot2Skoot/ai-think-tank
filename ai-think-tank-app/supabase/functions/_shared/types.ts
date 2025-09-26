export interface Persona {
  id: string
  name: string
  display_name: string
  provider: 'openai' | 'anthropic' | 'gemini'
  model: string
  temperature: number
  max_tokens: number
  system_prompt?: string
  avatar_color?: string
  user_id?: string
  is_global?: boolean
}

export interface Message {
  id: string
  conversation_id: string
  persona_id: string
  content: string
  role: 'system' | 'user' | 'assistant'
  created_at: string
  metadata?: Record<string, any>
}

export interface Conversation {
  id: string
  user_id: string
  title: string
  created_at: string
  updated_at: string
  metadata?: Record<string, any>
}

export interface ChatRequest {
  provider: 'openai' | 'anthropic' | 'gemini'
  model: string
  messages: Array<{
    role: 'system' | 'user' | 'assistant'
    content: string
  }>
  temperature?: number
  maxTokens?: number
  personaId?: string
  conversationId?: string
  userId: string
  stream?: boolean
}

export interface ChatResponse {
  content: string
  usage: TokenUsage
  cost: number
  provider: string
  model: string
  personaId?: string
  nextSpeaker?: string
  cacheMetrics?: {
    hits: number
    misses: number
    hitRate: number
    totalCost: number
    savedCost: number
  }
}

export interface TokenUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
  cachedTokens?: number
}

export interface CostRecord {
  user_id: string
  conversation_id: string
  persona_id: string
  provider: string
  model: string
  input_tokens: number
  output_tokens: number
  cached_tokens: number
  input_cost: number
  output_cost: number
  total_cost: number
  created_at?: string
}

export type ConversationType = 'general' | 'technical' | 'creative' | 'analytical' | 'educational'
export type ConversationMode = 'debate' | 'ideation' | 'refinement' | 'planning' | 'discussion'

export interface TurnOrchestration {
  conversationId: string
  currentSpeaker: string
  availablePersonas: Persona[]
  conversationHistory: Message[]
  orchestrationMode: 'round-robin' | 'intelligent' | 'random'
  conversationType?: ConversationType
  conversationMode?: ConversationMode
}

export interface TurnFactors {
  relevance: number
  expertise: number
  participation_balance: number
  conversation_flow: number
}

export interface CacheEntry {
  key: string
  value: any
  ttl: number
  expiresAt: number
}

export interface ModelPricing {
  provider: string
  model: string
  inputPricePerMillion: number
  outputPricePerMillion: number
  cachedInputPricePerMillion?: number
}

export interface UserBudget {
  user_id: string
  daily_limit: number
  monthly_limit: number
  current_daily_spend: number
  current_monthly_spend: number
  auto_stop: boolean
  last_reset_date: string
  created_at: string
  updated_at: string
}

export const ModelPricingMap: Record<string, ModelPricing> = {
  // OpenAI Models - Current generation (prices per million tokens)
  'openai:gpt-5': {
    provider: 'openai',
    model: 'gpt-5',
    inputPricePerMillion: 1.25,
    outputPricePerMillion: 10,
    cachedInputPricePerMillion: 0.125
  },
  'openai:gpt-5-mini': {
    provider: 'openai',
    model: 'gpt-5-mini',
    inputPricePerMillion: 0.25,
    outputPricePerMillion: 2,
    cachedInputPricePerMillion: 0.025
  },
  'openai:gpt-5-nano': {
    provider: 'openai',
    model: 'gpt-5-nano',
    inputPricePerMillion: 0.05,
    outputPricePerMillion: 0.4,
    cachedInputPricePerMillion: 0.005
  },
  'openai:gpt-4.1': {
    provider: 'openai',
    model: 'gpt-4.1',
    inputPricePerMillion: 2,
    outputPricePerMillion: 8,
    cachedInputPricePerMillion: 0.5
  },
  'openai:gpt-4.1-mini': {
    provider: 'openai',
    model: 'gpt-4.1-mini',
    inputPricePerMillion: 0.4,
    outputPricePerMillion: 1.6,
    cachedInputPricePerMillion: 0.1
  },
  'openai:gpt-4.1-nano': {
    provider: 'openai',
    model: 'gpt-4.1-nano',
    inputPricePerMillion: 0.1,
    outputPricePerMillion: 0.4,
    cachedInputPricePerMillion: 0.025
  },
  'openai:o4-mini': {
    provider: 'openai',
    model: 'o4-mini',
    inputPricePerMillion: 1.1,
    outputPricePerMillion: 4.4,
    cachedInputPricePerMillion: 0.275
  },
  'openai:o3': {
    provider: 'openai',
    model: 'o3',
    inputPricePerMillion: 2,
    outputPricePerMillion: 8,
    cachedInputPricePerMillion: 0.5
  },

  // Anthropic Models - Current generation
  'anthropic:claude-opus-4-1-20250805': {
    provider: 'anthropic',
    model: 'claude-opus-4-1-20250805',
    inputPricePerMillion: 15,
    outputPricePerMillion: 75,
    cachedInputPricePerMillion: 1.5
  },
  'anthropic:claude-opus-4-20250514': {
    provider: 'anthropic',
    model: 'claude-opus-4-20250514',
    inputPricePerMillion: 15,
    outputPricePerMillion: 75,
    cachedInputPricePerMillion: 1.5
  },
  'anthropic:claude-sonnet-4-20250514': {
    provider: 'anthropic',
    model: 'claude-sonnet-4-20250514',
    inputPricePerMillion: 3,
    outputPricePerMillion: 15,
    cachedInputPricePerMillion: 0.3
  },
  'anthropic:claude-3-7-sonnet-20250219': {
    provider: 'anthropic',
    model: 'claude-3-7-sonnet-20250219',
    inputPricePerMillion: 3,
    outputPricePerMillion: 15,
    cachedInputPricePerMillion: 0.3
  },

  // Gemini Models - Current generation
  'gemini:gemini-2.5-pro': {
    provider: 'gemini',
    model: 'gemini-2.5-pro',
    inputPricePerMillion: 1.25,
    outputPricePerMillion: 10
  },
  'gemini:gemini-2.5-flash': {
    provider: 'gemini',
    model: 'gemini-2.5-flash',
    inputPricePerMillion: 0.3,
    outputPricePerMillion: 2.5
  },
  'gemini:gemini-2.5-flash-lite': {
    provider: 'gemini',
    model: 'gemini-2.5-flash-lite',
    inputPricePerMillion: 0.1,
    outputPricePerMillion: 0.4
  }
}