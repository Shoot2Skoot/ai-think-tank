// Model definitions parsed from models.yaml
// This file contains the source of truth for all available models

export interface ModelPricing {
  input: number
  output: number
  cached_input?: number
}

export interface ModelInfo {
  id: string
  label: string
  provider: 'openai' | 'anthropic' | 'google'
  pricing: ModelPricing
}

// Models from models.yaml - using simplified pricing (per 1K tokens instead of per 1M)
export const AVAILABLE_MODELS: Record<string, ModelInfo[]> = {
  anthropic: [
    {
      id: 'claude-opus-4-1-20250805',
      label: 'Claude Opus 4.1',
      provider: 'anthropic',
      pricing: { input: 0.015, output: 0.075, cached_input: 0.0015 }
    },
    {
      id: 'claude-opus-4-20250514',
      label: 'Claude Opus 4',
      provider: 'anthropic',
      pricing: { input: 0.015, output: 0.075, cached_input: 0.0015 }
    },
    {
      id: 'claude-sonnet-4-20250514',
      label: 'Claude Sonnet 4',
      provider: 'anthropic',
      pricing: { input: 0.003, output: 0.015, cached_input: 0.0003 }
    },
    {
      id: 'claude-3-7-sonnet-20250219',
      label: 'Claude 3.7 Sonnet',
      provider: 'anthropic',
      pricing: { input: 0.003, output: 0.015, cached_input: 0.0003 }
    }
  ],
  google: [
    {
      id: 'gemini-2.5-pro',
      label: 'Gemini 2.5 Pro',
      provider: 'google',
      pricing: { input: 0.00125, output: 0.01 } // Using ≤200K pricing
    },
    {
      id: 'gemini-2.5-flash',
      label: 'Gemini 2.5 Flash',
      provider: 'google',
      pricing: { input: 0.0003, output: 0.0025 }
    },
    {
      id: 'gemini-2.5-flash-lite',
      label: 'Gemini 2.5 Flash Lite',
      provider: 'google',
      pricing: { input: 0.0001, output: 0.0004 }
    }
  ],
  openai: [
    {
      id: 'gpt-5',
      label: 'GPT-5',
      provider: 'openai',
      pricing: { input: 0.00125, output: 0.01, cached_input: 0.000125 }
    },
    {
      id: 'gpt-5-mini',
      label: 'GPT-5 Mini',
      provider: 'openai',
      pricing: { input: 0.00025, output: 0.002, cached_input: 0.000025 }
    },
    {
      id: 'gpt-5-nano',
      label: 'GPT-5 Nano',
      provider: 'openai',
      pricing: { input: 0.00005, output: 0.0004, cached_input: 0.000005 }
    },
    {
      id: 'gpt-4.1',
      label: 'GPT-4.1',
      provider: 'openai',
      pricing: { input: 0.002, output: 0.008, cached_input: 0.0005 }
    },
    {
      id: 'gpt-4.1-mini',
      label: 'GPT-4.1 Mini',
      provider: 'openai',
      pricing: { input: 0.0004, output: 0.0016, cached_input: 0.0001 }
    },
    {
      id: 'gpt-4.1-nano',
      label: 'GPT-4.1 Nano',
      provider: 'openai',
      pricing: { input: 0.0001, output: 0.0004, cached_input: 0.000025 }
    },
    {
      id: 'o4-mini',
      label: 'O4 Mini',
      provider: 'openai',
      pricing: { input: 0.0011, output: 0.0044, cached_input: 0.000275 }
    },
    {
      id: 'o3',
      label: 'O3',
      provider: 'openai',
      pricing: { input: 0.002, output: 0.008, cached_input: 0.0005 }
    }
  ]
}

// Helper to get all models for a provider
export function getModelsForProvider(provider: 'openai' | 'anthropic' | 'google'): ModelInfo[] {
  return AVAILABLE_MODELS[provider] || []
}

// Helper to get a specific model
export function getModel(provider: string, modelId: string): ModelInfo | undefined {
  const models = AVAILABLE_MODELS[provider as keyof typeof AVAILABLE_MODELS]
  return models?.find(m => m.id === modelId)
}

// Get model display name
export function getModelLabel(provider: string, modelId: string): string {
  const model = getModel(provider, modelId)
  return model?.label || modelId
}

// Calculate cost for tokens
export function calculateCost(
  provider: string,
  modelId: string,
  inputTokens: number,
  outputTokens: number,
  cachedTokens: number = 0
): number {
  const model = getModel(provider, modelId)
  if (!model) return 0

  const inputCost = cachedTokens > 0 && model.pricing.cached_input
    ? (cachedTokens / 1000) * model.pricing.cached_input + ((inputTokens - cachedTokens) / 1000) * model.pricing.input
    : (inputTokens / 1000) * model.pricing.input

  const outputCost = (outputTokens / 1000) * model.pricing.output

  return inputCost + outputCost
}