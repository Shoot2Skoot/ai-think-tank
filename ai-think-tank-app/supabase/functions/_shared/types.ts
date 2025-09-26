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

export interface TurnOrchestration {
  conversationId: string
  currentSpeaker: string
  availablePersonas: Persona[]
  conversationHistory: Message[]
  orchestrationMode: 'round-robin' | 'intelligent' | 'random'
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
  // OpenAI Models
  'openai:gpt-4-turbo-preview': {
    provider: 'openai',
    model: 'gpt-4-turbo-preview',
    inputPricePerMillion: 10,
    outputPricePerMillion: 30
  },
  'openai:gpt-4': {
    provider: 'openai',
    model: 'gpt-4',
    inputPricePerMillion: 30,
    outputPricePerMillion: 60
  },
  'openai:gpt-3.5-turbo': {
    provider: 'openai',
    model: 'gpt-3.5-turbo',
    inputPricePerMillion: 0.5,
    outputPricePerMillion: 1.5
  },

  // Anthropic Models
  'anthropic:claude-3-opus-20240229': {
    provider: 'anthropic',
    model: 'claude-3-opus-20240229',
    inputPricePerMillion: 15,
    outputPricePerMillion: 75,
    cachedInputPricePerMillion: 1.5
  },
  'anthropic:claude-3-sonnet-20240229': {
    provider: 'anthropic',
    model: 'claude-3-sonnet-20240229',
    inputPricePerMillion: 3,
    outputPricePerMillion: 15,
    cachedInputPricePerMillion: 0.3
  },
  'anthropic:claude-3-haiku-20240307': {
    provider: 'anthropic',
    model: 'claude-3-haiku-20240307',
    inputPricePerMillion: 0.25,
    outputPricePerMillion: 1.25,
    cachedInputPricePerMillion: 0.025
  },

  // Gemini Models
  'gemini:gemini-pro': {
    provider: 'gemini',
    model: 'gemini-pro',
    inputPricePerMillion: 1.25,
    outputPricePerMillion: 10
  },
  'gemini:gemini-1.5-pro': {
    provider: 'gemini',
    model: 'gemini-1.5-pro',
    inputPricePerMillion: 3.5,
    outputPricePerMillion: 10.5
  },
  'gemini:gemini-1.5-flash': {
    provider: 'gemini',
    model: 'gemini-1.5-flash',
    inputPricePerMillion: 0.35,
    outputPricePerMillion: 1.05
  }
}