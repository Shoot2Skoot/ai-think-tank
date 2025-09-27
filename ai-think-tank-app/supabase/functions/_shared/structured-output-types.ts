// Structured output schema for AI responses
// This ensures all AI providers return responses in a consistent format
// with explicit speaker identification to prevent attribution issues

export interface StructuredAIResponse {
  // The name of the persona/agent that is speaking
  speaker: string

  // The actual response content
  content: string

  // Optional confidence level (0-1)
  confidence?: number

  // Optional reasoning or thought process
  reasoning?: string

  // Optional metadata
  metadata?: {
    // Tone of the response
    tone?: 'friendly' | 'professional' | 'casual' | 'formal' | 'enthusiastic' | 'neutral'

    // Whether this is a follow-up to a previous statement
    isFollowUp?: boolean

    // References to other speakers mentioned
    mentionedSpeakers?: string[]

    // Any topics identified in the response
    topics?: string[]
  }
}

// Request format that includes structured output requirements
export interface StructuredChatRequest {
  provider: 'openai' | 'anthropic' | 'gemini'
  model: string
  messages: Array<{
    role: 'system' | 'user' | 'assistant'
    content: string
  }>
  temperature?: number
  maxTokens?: number
  personaId?: string
  personaName: string // Required for speaker identification
  conversationId?: string
  userId: string
  stream?: boolean
  useStructuredOutput?: boolean // Flag to enable structured outputs
}

// Response format that includes the structured output
export interface StructuredChatResponse {
  // The structured response from the AI
  structuredResponse?: StructuredAIResponse

  // Raw content (for backward compatibility)
  content: string

  // Token usage statistics
  usage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
    cachedTokens?: number
  }

  // Cost information
  cost: number

  // Provider details
  provider: string
  model: string
  personaId?: string
  personaName?: string
}

// JSON Schema for the structured output (used by providers)
export const STRUCTURED_OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    speaker: {
      type: "string",
      description: "The name of the persona/agent that is speaking this response"
    },
    content: {
      type: "string",
      description: "The actual response content"
    },
    confidence: {
      type: "number",
      description: "Confidence level from 0 to 1",
      minimum: 0,
      maximum: 1
    },
    reasoning: {
      type: "string",
      description: "Optional reasoning or thought process behind the response"
    },
    metadata: {
      type: "object",
      properties: {
        tone: {
          type: "string",
          enum: ["friendly", "professional", "casual", "formal", "enthusiastic", "neutral"],
          description: "The tone of the response"
        },
        isFollowUp: {
          type: "boolean",
          description: "Whether this is a follow-up to a previous statement"
        },
        mentionedSpeakers: {
          type: "array",
          items: {
            type: "string"
          },
          description: "Other speakers mentioned in the response"
        },
        topics: {
          type: "array",
          items: {
            type: "string"
          },
          description: "Topics identified in the response"
        }
      }
    }
  },
  required: ["speaker", "content"]
}