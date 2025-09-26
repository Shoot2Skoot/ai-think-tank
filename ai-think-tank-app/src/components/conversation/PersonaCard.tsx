import React, { useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { ModelSelector, ModelBadge } from './ModelSelector'
import { getProviderColor, getExperienceColor } from '@/lib/utils'
import { getModelLabel } from '@/lib/models'
import type { PersonaTemplate, Provider } from '@/types'

interface PersonaCardProps {
  template: PersonaTemplate
  isSelected: boolean
  onSelect: (template: PersonaTemplate, model?: string) => void
  onDeselect: (templateId: string) => void
  selectedModel?: string
}

export const PersonaCard: React.FC<PersonaCardProps> = ({
  template,
  isSelected,
  onSelect,
  onDeselect,
  selectedModel
}) => {
  const [showModelSelector, setShowModelSelector] = useState(false)
  const [currentModel, setCurrentModel] = useState(selectedModel || template.default_model)

  const handleClick = () => {
    if (isSelected) {
      onDeselect(template.id)
    } else {
      onSelect(template, currentModel)
    }
  }

  const handleModelChange = (model: string) => {
    setCurrentModel(model)
    if (isSelected) {
      // Update the selection with new model
      onDeselect(template.id)
      onSelect(template, model)
    }
  }

  return (
    <div
      className={`relative p-3 rounded-lg border transition-all ${
        isSelected
          ? 'border-primary-400 bg-primary-900 bg-opacity-20'
          : 'border-surface-border hover:border-primary-700'
      }`}
    >
      <div
        onClick={handleClick}
        className="cursor-pointer"
      >
        <div className="flex items-start space-x-3">
          <Avatar fallback={template.name} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text-primary truncate">
              {template.name}
            </p>
            <p className="text-xs text-text-secondary truncate">
              {template.role}
            </p>
            <div className="flex flex-col mt-1 space-y-1">
              <ModelBadge provider={template.default_provider} model={currentModel} />
              {template.experience_level && (
                <span className={`text-xs ${getExperienceColor(template.experience_level)}`}>
                  {template.experience_level}
                </span>
              )}
            </div>
          </div>
          {isSelected && (
            <div className="text-primary-400">
              <Check className="h-5 w-5" />
            </div>
          )}
        </div>
      </div>

      {/* Model Selector Section */}
      {isSelected && (
        <div className="mt-3 pt-3 border-t border-surface-divider">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowModelSelector(!showModelSelector)
            }}
            className="w-full text-left text-xs font-medium text-text-secondary flex items-center justify-between hover:text-text-primary transition-colors"
          >
            <span>Model: {getModelLabel(template.default_provider, currentModel)}</span>
            <ChevronDown className={`h-3 w-3 transition-transform ${showModelSelector ? 'rotate-180' : ''}`} />
          </button>

          {showModelSelector && (
            <div className="mt-2" onClick={(e) => e.stopPropagation()}>
              <ModelSelector
                provider={template.default_provider}
                model={currentModel}
                onModelChange={handleModelChange}
                showCost={true}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}