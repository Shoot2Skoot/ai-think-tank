import React from 'react'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { DollarSign } from 'lucide-react'
import { PROVIDER_MODELS, type Provider } from '@/types'

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
  const models = PROVIDER_MODELS[provider] || []
  const currentModel = models.find(m => m.value === model)

  return (
    <div className="space-y-2">
      <Select
        value={model}
        onChange={(e) => onModelChange(e.target.value)}
        disabled={disabled}
        className="w-full"
      >
        <option value="" disabled>Select a model</option>
        {models.map((modelOption) => (
          <option key={modelOption.value} value={modelOption.value}>
            {modelOption.label}
          </option>
        ))}
      </Select>

      {showCost && currentModel && (
        <div className="flex items-center space-x-2 text-xs text-gray-600">
          <DollarSign className="h-3 w-3" />
          <span>Input: ${currentModel.cost.input}/1K tokens</span>
          <span>•</span>
          <span>Output: ${currentModel.cost.output}/1K tokens</span>
        </div>
      )}
    </div>
  )
}

export const ModelBadge: React.FC<{ provider: Provider; model: string }> = ({ provider, model }) => {
  const models = PROVIDER_MODELS[provider] || []
  const modelInfo = models.find(m => m.value === model)
  const modelLabel = modelInfo?.label || model

  // Get a color based on the model tier (more expensive = different color)
  const getModelColor = () => {
    if (!modelInfo) return 'bg-gray-100 text-gray-700'

    const avgCost = (modelInfo.cost.input + modelInfo.cost.output) / 2
    if (avgCost > 0.02) return 'bg-purple-100 text-purple-700' // Premium
    if (avgCost > 0.002) return 'bg-blue-100 text-blue-700' // Standard
    return 'bg-green-100 text-green-700' // Budget
  }

  return (
    <Badge size="sm" className={getModelColor()}>
      {provider} • {modelLabel}
    </Badge>
  )
}