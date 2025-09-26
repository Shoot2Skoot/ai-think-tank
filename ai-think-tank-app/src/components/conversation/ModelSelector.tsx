import React from 'react'
import { Badge } from '@/components/ui/Badge'
import { DollarSign, ChevronDown } from 'lucide-react'
import { AVAILABLE_MODELS, getModel, getModelLabel } from '@/lib/models'
import type { Provider } from '@/types'

interface ModelSelectorProps {
  provider: Provider
  model: string
  onModelChange: (model: string) => void
  disabled?: boolean
  showCost?: boolean
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  provider,
  model,
  onModelChange,
  disabled = false,
  showCost = true
}) => {
  const models = AVAILABLE_MODELS[provider] || []
  const currentModel = getModel(provider, model)

  return (
    <div className="space-y-2">
      <div className="relative">
        <select
          value={model}
          onChange={(e) => onModelChange(e.target.value)}
          disabled={disabled}
          className="flex h-10 w-full appearance-none rounded-md border px-3 py-2 text-sm pr-10 focus:outline-none focus:ring-2 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 bg-surface-primary border-surface-border text-text-primary focus:ring-primary-400"
        >
          <option value="" disabled>Select a model</option>
          <optgroup label={provider.charAt(0).toUpperCase() + provider.slice(1)}>
            {models.map((modelOption) => (
              <option key={modelOption.id} value={modelOption.id}>
                {modelOption.label}
              </option>
            ))}
          </optgroup>
        </select>
        <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-text-tertiary pointer-events-none" />
      </div>

      {showCost && currentModel && (
        <div className="flex items-center space-x-2 text-xs text-text-secondary">
          <DollarSign className="h-3 w-3" />
          <span>Input: ${currentModel.pricing.input}/1K tokens</span>
          <span>•</span>
          <span>Output: ${currentModel.pricing.output}/1K tokens</span>
          {currentModel.pricing.cached_input && (
            <>
              <span>•</span>
              <span>Cached: ${currentModel.pricing.cached_input}/1K</span>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export const ModelBadge: React.FC<{ provider: Provider; model: string }> = ({ provider, model }) => {
  const modelInfo = getModel(provider, model)
  const modelLabel = getModelLabel(provider, model)

  // Get provider-based color
  const getProviderBadgeColor = (provider: Provider) => {
    switch (provider) {
      case 'openai': return 'bg-green-500 bg-opacity-20 text-green-400'
      case 'anthropic': return 'bg-secondary-500 bg-opacity-20 text-secondary-400'
      case 'gemini': return 'bg-primary-500 bg-opacity-20 text-primary-400'
      default: return 'bg-primary-900 bg-opacity-20 text-text-primary'
    }
  }

  return (
    <Badge size="sm" className={getProviderBadgeColor(provider)}>
      {modelLabel}
    </Badge>
  )
}