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
        model: persona.model,
        personaId: persona.id,
        personaName: persona.name
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
    // Extract system messages (conversation context)
    const systemMessages = messages.filter(msg => msg._getType() === 'system')

    // Combine conversation context with persona system prompt
    let combinedSystemPrompt = ''

    // Add conversation context first
    systemMessages.forEach(msg => {
      combinedSystemPrompt += msg.content.toString() + '\n\n'
    })

    // Then add persona-specific system prompt
    combinedSystemPrompt += `Your character and role:\n${persona.system_prompt}`

    const systemMessage = {
      role: 'system' as const,
      content: combinedSystemPrompt
    }

    // Convert non-system messages to simple format
    // All conversation messages are now in HumanMessage format with speaker names
    const conversationMessages = messages
      .filter(msg => msg._getType() !== 'system')
      .map(msg => ({
        role: 'user' as 'system' | 'user' | 'assistant',
        content: msg.content.toString()
      }))

    // Return system message first, then conversation messages
    return [systemMessage, ...conversationMessages]
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