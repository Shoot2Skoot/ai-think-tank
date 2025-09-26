import React from 'react'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { DollarSign } from 'lucide-react'
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
      <Select
        value={model}
        onChange={(e) => onModelChange(e.target.value)}
        disabled={disabled}
        className="w-full"
      >
        <option value="" disabled>Select a model</option>
        <optgroup label={provider.charAt(0).toUpperCase() + provider.slice(1)}>
          {models.map((modelOption) => (
            <option key={modelOption.id} value={modelOption.id}>
              {modelOption.label}
            </option>
          ))}
        </optgroup>
      </Select>

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

  // Get a color based on the model tier (more expensive = different color)
  const getModelColor = () => {
    if (!modelInfo) return 'bg-gray-100 text-gray-700'

    const avgCost = (modelInfo.pricing.input + modelInfo.pricing.output) / 2
    if (avgCost > 0.02) return 'bg-purple-100 text-purple-700' // Premium
    if (avgCost > 0.002) return 'bg-blue-100 text-blue-700' // Standard
    return 'bg-green-100 text-green-700' // Budget
  }

  const getProviderLabel = (provider: Provider) => {
    switch (provider) {
      case 'openai': return 'OpenAI'
      case 'anthropic': return 'Anthropic'
      case 'gemini': return 'Gemini'
      default: return provider
    }
  }

  return (
    <Badge size="sm" className={getModelColor()}>
      {getProviderLabel(provider)} • {modelLabel}
    </Badge>
  )
}