import { ChatOpenAI } from '@langchain/openai'
import { ChatAnthropic } from '@langchain/anthropic'
import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import { BaseMessage, AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages'
import { MockLangChainProvider } from './mock-provider'
import type { Provider, Persona } from '@/types'

interface ProviderConfig {
  provider: Provider
  model: string
  temperature?: number
  maxTokens?: number
  apiKey?: string
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

export class ProviderManager {
  private providers: Map<string, any> = new Map()
  private useMockProviders: boolean
  private mockProvider: MockLangChainProvider
  private apiKeys: Map<Provider, string> = new Map()

  constructor(useMockProviders: boolean = false) {
    this.useMockProviders = useMockProviders || import.meta.env.VITE_USE_MOCK_PROVIDERS === 'true'
    this.mockProvider = new MockLangChainProvider()

    // Initialize API keys from environment (development only)
    if (!this.useMockProviders && import.meta.env.DEV) {
      if (import.meta.env.VITE_DEV_OPENAI_KEY) {
        this.apiKeys.set('openai', import.meta.env.VITE_DEV_OPENAI_KEY)
      }
      if (import.meta.env.VITE_DEV_ANTHROPIC_KEY) {
        this.apiKeys.set('anthropic', import.meta.env.VITE_DEV_ANTHROPIC_KEY)
      }
      if (import.meta.env.VITE_DEV_GEMINI_KEY) {
        this.apiKeys.set('gemini', import.meta.env.VITE_DEV_GEMINI_KEY)
      }
    }
  }

  async initialize(userId: string) {
    if (this.useMockProviders) {
      console.log('Using mock providers for development')
      return
    }

    // In production, fetch encrypted API keys from Supabase
    // For now, we'll use platform keys stored securely
    await this.loadPlatformKeys()
  }

  private async loadPlatformKeys() {
    // TODO: Fetch encrypted platform keys from Supabase
    // This will be implemented when Supabase is fully set up
    console.log('Loading platform API keys...')
  }

  getProvider(config: ProviderConfig): any {
    if (this.useMockProviders) {
      return this.mockProvider
    }

    const key = `${config.provider}:${config.model}`

    if (this.providers.has(key)) {
      return this.providers.get(key)
    }

    const provider = this.createProvider(config)
    this.providers.set(key, provider)
    return provider
  }

  private createProvider(config: ProviderConfig): any {
    const apiKey = config.apiKey || this.apiKeys.get(config.provider)

    if (!apiKey && !this.useMockProviders) {
      throw new Error(`No API key found for ${config.provider}`)
    }

    switch (config.provider) {
      case 'openai':
        return new ChatOpenAI({
          modelName: config.model,
          temperature: config.temperature || 0.7,
          maxTokens: config.maxTokens || 1000,
          openAIApiKey: apiKey,
          streaming: true,
        })

      case 'anthropic':
        return new ChatAnthropic({
          modelName: config.model,
          temperature: config.temperature || 0.7,
          maxTokens: config.maxTokens || 1000,
          anthropicApiKey: apiKey,
          streaming: true,
        })

      case 'gemini':
        return new ChatGoogleGenerativeAI({
          modelName: config.model,
          temperature: config.temperature || 0.7,
          maxOutputTokens: config.maxTokens || 1000,
          apiKey: apiKey,
        })

      default:
        throw new Error(`Unknown provider: ${config.provider}`)
    }
  }

  async generateResponse(
    persona: Persona,
    messages: BaseMessage[],
    onStream?: (chunk: string) => void
  ): Promise<ProviderResponse> {
    const provider = this.getProvider({
      provider: persona.provider,
      model: persona.model,
      temperature: persona.temperature,
      maxTokens: persona.max_tokens,
    })

    // Add persona context to system message
    const systemMessage = new SystemMessage({
      content: `${persona.system_prompt}\n\npersona_id: ${persona.id}`
    })

    const allMessages = [systemMessage, ...messages]

    try {
      if (onStream) {
        // Stream the response
        let fullContent = ''
        let tokenCount = { prompt: 0, completion: 0 }

        const stream = await provider.stream(allMessages)

        for await (const chunk of stream) {
          const content = chunk.content.toString()
          fullContent += content
          onStream(content)
        }

        // Calculate tokens and cost
        tokenCount = this.estimateTokens(allMessages, fullContent)
        const cost = this.calculateCost(persona.provider, persona.model, tokenCount)

        return {
          content: fullContent,
          usage: {
            promptTokens: tokenCount.prompt,
            completionTokens: tokenCount.completion,
            totalTokens: tokenCount.prompt + tokenCount.completion,
          },
          cost,
          provider: persona.provider,
          model: persona.model,
        }
      } else {
        // Non-streaming response
        const response = await provider.invoke(allMessages)

        const usage = response.response_metadata?.usage || this.estimateUsage(allMessages, response.content)
        const cost = this.calculateCost(persona.provider, persona.model, {
          prompt: usage.prompt_tokens || usage.promptTokens,
          completion: usage.completion_tokens || usage.completionTokens,
        })

        return {
          content: response.content.toString(),
          usage: {
            promptTokens: usage.prompt_tokens || usage.promptTokens,
            completionTokens: usage.completion_tokens || usage.completionTokens,
            totalTokens: usage.total_tokens || usage.totalTokens,
            cachedTokens: usage.cached_tokens,
          },
          cost,
          provider: persona.provider,
          model: persona.model,
        }
      }
    } catch (error) {
      console.error(`Error generating response for persona ${persona.name}:`, error)
      throw error
    }
  }

  private estimateTokens(messages: BaseMessage[], response: string): { prompt: number, completion: number } {
    // Rough token estimation (4 characters per token)
    const promptLength = messages.reduce((acc, msg) => acc + msg.content.toString().length, 0)
    const responseLength = response.length

    return {
      prompt: Math.ceil(promptLength / 4),
      completion: Math.ceil(responseLength / 4),
    }
  }

  private estimateUsage(messages: BaseMessage[], response: any) {
    const tokens = this.estimateTokens(messages, response.toString())
    return {
      promptTokens: tokens.prompt,
      completionTokens: tokens.completion,
      totalTokens: tokens.prompt + tokens.completion,
    }
  }

  private calculateCost(provider: Provider, model: string, tokens: { prompt: number, completion: number }): number {
    // Cost calculation based on our pricing data (per million tokens)
    const pricing = this.getPricing(provider, model)

    const promptCost = (tokens.prompt / 1_000_000) * pricing.input
    const completionCost = (tokens.completion / 1_000_000) * pricing.output

    return promptCost + completionCost
  }

  private getPricing(provider: Provider, model: string): { input: number, output: number } {
    // Simplified pricing - in production, this would come from database
    const pricingMap: Record<string, { input: number, output: number }> = {
      // OpenAI
      'openai:gpt-4-turbo-preview': { input: 10, output: 30 },
      'openai:gpt-4': { input: 30, output: 60 },
      'openai:gpt-3.5-turbo': { input: 0.5, output: 1.5 },

      // Anthropic
      'anthropic:claude-3-opus-20240229': { input: 15, output: 75 },
      'anthropic:claude-3-7-sonnet-20250219': { input: 3, output: 15 },
      'anthropic:claude-3-haiku-20240307': { input: 0.25, output: 1.25 },

      // Google
      'gemini:gemini-pro': { input: 1.25, output: 10 },
      'gemini:gemini-2.5-flash': { input: 0.3, output: 2.5 },
      'gemini:gemini-2.5-flash-lite': { input: 0.1, output: 0.4 },
    }

    const key = `${provider}:${model}`
    return pricingMap[key] || { input: 1, output: 2 } // Default pricing
  }

  // Set custom API key for a provider (Phase 2 feature)
  setCustomApiKey(provider: Provider, apiKey: string) {
    this.apiKeys.set(provider, apiKey)
    // Clear cached provider to force recreation with new key
    for (const [key, _] of this.providers) {
      if (key.startsWith(provider)) {
        this.providers.delete(key)
      }
    }
  }

  // Switch between mock and real providers
  setUseMockProviders(useMock: boolean) {
    this.useMockProviders = useMock
    this.providers.clear()
  }

  // Get current mode
  isUsingMockProviders(): boolean {
    return this.useMockProviders
  }
}

// Export singleton instance
export const providerManager = new ProviderManager()