import { supabase } from '@/lib/supabase'
import { BaseMessage, AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages'
import { MockLangChainProvider } from './mock-provider'
import type { Provider, Persona } from '@/types'

interface ProviderConfig {
  provider: Provider
  model: string
  temperature?: number
  maxTokens?: number
}

interface ProviderResponse {
  content: string
  usage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
    cachedTokens?: number
  }
  cost: number
  provider: Provider
  model: string
}

export class ProviderManagerEdge {
  private useMockProviders: boolean
  private mockProvider: MockLangChainProvider
  private conversationId?: string
  private userId?: string

  constructor(useMockProviders: boolean = false) {
    this.useMockProviders = useMockProviders || import.meta.env.VITE_USE_MOCK_PROVIDERS === 'true'
    this.mockProvider = new MockLangChainProvider()
  }

  async initialize(userId: string) {
    this.userId = userId
    if (this.useMockProviders) {
      console.log('Using mock providers for development')
    } else {
      console.log('Using Edge Functions for AI providers')
    }
  }

  setConversationId(conversationId: string) {
    this.conversationId = conversationId
  }

  async generateResponse(
    persona: Persona,
    messages: BaseMessage[],
    onStream?: (chunk: string) => void
  ): Promise<ProviderResponse> {
    // Use mock provider if configured
    if (this.useMockProviders) {
      return this.generateMockResponse(persona, messages, onStream)
    }

    // Convert LangChain messages to simple format for Edge Function
    const simpleMessages = this.convertMessages(messages, persona)

    try {
      // Call Edge Function
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          provider: persona.provider,
          model: persona.model,
          messages: simpleMessages,
          temperature: persona.temperature || 0.7,
          maxTokens: persona.max_tokens || 1000,
          personaId: persona.id,
          conversationId: this.conversationId,
          userId: this.userId,
          stream: !!onStream
        }
      })

      if (error) {
        console.error('Edge Function error:', error)
        throw error
      }

      // Handle streaming if needed (future enhancement)
      if (onStream && data.content) {
        // Simulate streaming by chunking the response
        const words = data.content.split(' ')
        for (const word of words) {
          onStream(word + ' ')
          await new Promise(resolve => setTimeout(resolve, 50))
        }
      }

      return {
        content: data.content,
        usage: data.usage,
        cost: data.cost,
        provider: persona.provider,
        model: persona.model
      }
    } catch (error) {
      console.error(`Error generating response for persona ${persona.name}:`, error)

      // Don't fallback - throw the error so it's clear what's happening
      throw error
    }
  }

  private async generateMockResponse(
    persona: Persona,
    messages: BaseMessage[],
    onStream?: (chunk: string) => void
  ): Promise<ProviderResponse> {
    const response = await this.mockProvider.invoke(messages)
    const content = response.content.toString()

    if (onStream) {
      // Simulate streaming
      const words = content.split(' ')
      for (const word of words) {
        onStream(word + ' ')
        await new Promise(resolve => setTimeout(resolve, 50))
      }
    }

    // Mock response with realistic token counts and costs
    return {
      content,
      usage: {
        promptTokens: Math.ceil(messages.reduce((acc, msg) => acc + msg.content.toString().length, 0) / 4),
        completionTokens: Math.ceil(content.length / 4),
        totalTokens: Math.ceil((messages.reduce((acc, msg) => acc + msg.content.toString().length, 0) + content.length) / 4),
        cachedTokens: 0
      },
      cost: 0.0001, // Mock cost for testing
      provider: persona.provider,
      model: persona.model
    }
  }

  private convertMessages(messages: BaseMessage[], persona: Persona): any[] {
    // Add persona context to system message
    const systemMessage = {
      role: 'system' as const,
      content: `${persona.system_prompt}\n\npersona_id: ${persona.id}`
    }

    // Convert LangChain messages to simple format
    const simpleMessages = messages.map(msg => {
      let role: 'system' | 'user' | 'assistant'

      switch (msg._getType()) {
        case 'human':
          role = 'user'
          break
        case 'ai':
          role = 'assistant'
          break
        case 'system':
          role = 'system'
          break
        default:
          role = 'user'
      }

      return {
        role,
        content: msg.content.toString()
      }
    })

    // Ensure system message is first
    return [systemMessage, ...simpleMessages.filter(m => m.role !== 'system'), ...simpleMessages.filter(m => m.role === 'system' && m.content !== systemMessage.content)]
  }

  // Switch between mock and real providers
  setUseMockProviders(useMock: boolean) {
    this.useMockProviders = useMock
  }

  // Get current mode
  isUsingMockProviders(): boolean {
    return this.useMockProviders
  }

  // Check if Edge Functions are available
  async checkEdgeFunctionHealth(): Promise<boolean> {
    try {
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          health: true
        }
      })
      return !error && data?.status === 'healthy'
    } catch {
      return false
    }
  }
}

// Export singleton instance
export const providerManager = new ProviderManagerEdge()