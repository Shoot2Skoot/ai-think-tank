import { ChatOpenAI } from 'https://esm.sh/@langchain/openai@0.0.34'
import { ChatAnthropic } from 'https://esm.sh/@langchain/anthropic@0.1.0'
import { ChatGoogleGenerativeAI } from 'https://esm.sh/@langchain/google-genai@0.0.16'
import { BaseLanguageModel } from 'https://esm.sh/@langchain/core@0.1.52/language_models/base'
import { Persona } from './types.ts'

export interface LangChainConfig {
  modelName: string
  temperature: number
  maxTokens: number
  streaming?: boolean
  callbacks?: any[]
}

export function createLangChainProvider(persona: Persona, config?: Partial<LangChainConfig>): BaseLanguageModel {
  const baseConfig: LangChainConfig = {
    modelName: persona.model, // Use persona's defined model - NO override
    temperature: persona.temperature,
    maxTokens: persona.max_tokens,
    streaming: config?.streaming ?? false,
    callbacks: config?.callbacks ?? []
  }

  switch (persona.provider) {
    case 'openai': {
      const apiKey = Deno.env.get('OPENAI_API_KEY')
      if (!apiKey) {
        throw new Error('OPENAI_API_KEY not configured')
      }

      return new ChatOpenAI({
        modelName: baseConfig.modelName,
        temperature: baseConfig.temperature,
        maxTokens: baseConfig.maxTokens,
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

      return new ChatAnthropic({
        modelName: baseConfig.modelName,
        temperature: baseConfig.temperature,
        maxTokens: baseConfig.maxTokens,
        streaming: baseConfig.streaming,
        anthropicApiKey: apiKey,
        callbacks: baseConfig.callbacks,
        anthropicApiVersion: '2023-06-01'
      })
    }

    case 'gemini': {
      const apiKey = Deno.env.get('GEMINI_API_KEY')
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY not configured')
      }

      return new ChatGoogleGenerativeAI({
        modelName: baseConfig.modelName,
        temperature: baseConfig.temperature,
        maxOutputTokens: baseConfig.maxTokens,
        streaming: baseConfig.streaming,
        apiKey: apiKey,
        callbacks: baseConfig.callbacks
      })
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