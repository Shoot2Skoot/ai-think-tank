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
          className="flex h-10 w-full appearance-none rounded-md border border-gray-300 bg-white px-3 py-2 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
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
        <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
      </div>

      {showCost && currentModel && (
        <div className="flex items-center space-x-2 text-xs text-gray-600">
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
      case 'openai': return 'bg-green-100 text-green-700'
      case 'anthropic': return 'bg-orange-100 text-orange-700'
      case 'gemini': return 'bg-blue-100 text-blue-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <Badge size="sm" className={getProviderBadgeColor(provider)}>
      {modelLabel}
    </Badge>
  )
}