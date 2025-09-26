import { ChatOpenAI } from '@langchain/openai'
import { ChatAnthropic } from '@langchain/anthropic'
import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import { BaseLanguageModel } from '@langchain/core/language_models/base'
import { Persona } from './types.ts'
import { AnthropicCacheManager, GeminiCacheManager } from './cache-manager.ts'

export interface LangChainConfig {
  modelName: string
  temperature: number
  maxTokens: number
  streaming?: boolean
  callbacks?: any[]
  enableCaching?: boolean
  cachedContent?: any // For Gemini cached content reference
}

export function createLangChainProvider(persona: Persona, config?: Partial<LangChainConfig>): BaseLanguageModel {
  const baseConfig: LangChainConfig = {
    modelName: persona.model, // Use persona's defined model - NO override
    temperature: persona.temperature,
    maxTokens: persona.max_tokens,
    streaming: config?.streaming ?? false,
    callbacks: config?.callbacks ?? [],
    enableCaching: config?.enableCaching ?? true,
    cachedContent: config?.cachedContent
  }

  switch (persona.provider) {
    case 'openai': {
      const apiKey = Deno.env.get('OPENAI_API_KEY')
      if (!apiKey) {
        throw new Error('OPENAI_API_KEY not configured')
      }

      // OpenAI uses application-level caching, handled in generate-message
      return new ChatOpenAI({
        modelName: baseConfig.modelName,
        maxCompletionTokens: baseConfig.maxTokens,
        streaming: baseConfig.streaming,
        openAIApiKey: apiKey,
        callbacks: baseConfig.callbacks
      })
    }

    case 'anthropic': {
      const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
      if (!apiKey) {
        throw new Error('ANTHROPIC_API_KEY not configured')
      }

      // Add cache control headers if caching is enabled
      const clientOptions = baseConfig.enableCaching
        ? {
            defaultHeaders: AnthropicCacheManager.getCacheHeaders()
          }
        : undefined

      return new ChatAnthropic({
        modelName: baseConfig.modelName,
        maxTokens: baseConfig.maxTokens,
        streaming: baseConfig.streaming,
        anthropicApiKey: apiKey,
        callbacks: baseConfig.callbacks,
        clientOptions
      })
    }

    case 'gemini': {
      const apiKey = Deno.env.get('GEMINI_API_KEY')
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY not configured')
      }

      const model = new ChatGoogleGenerativeAI({
        model: baseConfig.modelName,
        maxOutputTokens: baseConfig.maxTokens,
        streaming: baseConfig.streaming,
        apiKey: apiKey,
        callbacks: baseConfig.callbacks
      })

      // Bind cached content if provided
      if (baseConfig.cachedContent) {
        return model.bind({
          cachedContent: baseConfig.cachedContent
        })
      }

      return model
    }

    default:
      throw new Error(`Unknown provider: ${persona.provider}`)
  }
}

export function validateApiKeys(): { [key: string]: boolean } {
  return {
    openai: Boolean(Deno.env.get('OPENAI_API_KEY')),
    anthropic: Boolean(Deno.env.get('ANTHROPIC_API_KEY')),
    gemini: Boolean(Deno.env.get('GEMINI_API_KEY'))
  }
}

export function getAvailableProviders(): string[] {
  const apiKeys = validateApiKeys()
  return Object.entries(apiKeys)
    .filter(([_, isAvailable]) => isAvailable)
    .map(([provider]) => provider)
}