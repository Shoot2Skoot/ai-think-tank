// Core types for the application

export type Provider = 'openai' | 'anthropic' | 'google'
export type ConversationMode = 'auto' | 'manual'
export type ConversationType = 'planning' | 'ideation' | 'refinement' | 'debate' | 'brainstorm' | 'review' | 'casual'
export type ExperienceLevel = 'None' | 'Limited' | 'Entry' | 'Senior' | 'Mastery'
export type Attitude = 'Pessimistic' | 'Skeptical' | 'Neutral' | 'Intrigued' | 'Excited'
export type MessageRole = 'user' | 'assistant' | 'system'

// Model types - now imported from models.ts which uses models.yaml
// Keep these exports for backwards compatibility
export type AIModel = string // Model IDs are now strings from models.yaml

export interface User {
  id: string
  email: string
  created_at: string
}

export interface Conversation {
  id: string
  user_id: string
  title: string
  topic?: string
  mode: ConversationMode
  conversation_type: ConversationType
  speed: number
  total_cost: number
  message_count: number
  created_at: string
  ended_at?: string
  is_active: boolean
}

export interface PersonaTemplate {
  id: string
  category: string
  name: string
  role: string
  description?: string
  avatar_url?: string
  system_prompt: string
  default_model: string
  default_provider: Provider
  demographics?: Demographics
  background?: Background
  personality?: Personality
  expertise_areas?: string[]
  experience_level?: ExperienceLevel
  attitude?: Attitude
  is_premium: boolean
  usage_count: number
  rating?: number
}

export interface Persona {
  id: string
  conversation_id: string
  template_id?: string
  name: string
  role: string
  model: string
  provider: Provider
  temperature: number
  max_tokens: number
  demographics?: Demographics
  background?: Background
  personality?: Personality
  system_prompt: string
  experience_level?: ExperienceLevel
  attitude?: Attitude
  total_cost: number
  total_tokens_used: number
  message_count: number
}

export interface Message {
  id: string
  conversation_id: string
  persona_id?: string
  user_id?: string
  role: MessageRole
  content: string
  tokens_input?: number
  tokens_output?: number
  tokens_cached?: number
  cost?: number
  created_at: string
  metadata?: any
}

export interface Demographics {
  age?: number
  gender?: string
  location?: string
  occupation?: string
  education?: string
}

export interface Background {
  professional?: string
  personal?: string
  expertise?: string[]
  interests?: string[]
}

export interface Personality {
  traits?: string[]
  communication_style?: string
  decision_making?: string
  values?: string[]
}

export interface CostRecord {
  id: string
  message_id?: string
  persona_id?: string
  conversation_id?: string
  user_id?: string
  provider: Provider
  model: string
  input_tokens: number
  output_tokens: number
  cached_tokens: number
  cache_write_tokens: number
  input_cost: number
  output_cost: number
  cache_cost: number
  total_cost: number
  created_at: string
}

export interface CostBreakdown {
  total: number
  byPersona: Record<string, number>
  byProvider: Record<Provider, number>
  input_cost: number
  output_cost: number
  cache_savings: number
}

export interface UserBudget {
  user_id: string
  monthly_limit: number
  daily_limit: number
  warning_threshold: number
  auto_stop: boolean
  current_monthly_spend: number
  current_daily_spend: number
  reset_day: number
}

export interface BudgetAlert {
  id: string
  user_id: string
  alert_type: 'warning' | 'limit_reached' | 'stopped'
  message?: string
  threshold_value: number
  current_value: number
  acknowledged: boolean
  created_at: string
}

export interface TurnDecision {
  next_persona_id: string
  reasoning: string
  priority_score: number
  factors: {
    relevance: number
    expertise: number
    participation: number
    flow: number
  }
}

export interface ConversationConfig {
  title: string
  topic?: string
  mode: ConversationMode
  conversation_type: ConversationType
  speed: number
  personas: PersonaConfig[]
}

export interface PersonaConfig {
  name: string
  role: string
  model: string
  provider: Provider
  temperature?: number
  max_tokens?: number
  system_prompt?: string
  demographics?: Demographics
  background?: Background
  personality?: Personality
  experience_level?: ExperienceLevel
  attitude?: Attitude
  template_id?: string
}

export interface ApiKeyConfig {
  provider: Provider
  key: string
  is_custom: boolean
}

export interface ConversationTemplate {
  id: string
  category: string
  industry?: string
  name: string
  description?: string
  personas: string[] // persona template IDs
  initial_prompt?: string
  conversation_mode: ConversationType
  estimated_messages: number
  estimated_cost: number
  is_premium: boolean
  usage_count: number
  rating?: number
}

// Mock data types for development
export interface MockResponse {
  persona_id: string
  content: string
  tokens: {
    input: number
    output: number
  }
  delay: number
}