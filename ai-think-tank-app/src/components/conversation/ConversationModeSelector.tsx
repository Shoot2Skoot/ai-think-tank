import React from 'react'
import { Hash, Lightbulb, Target, MessageSquare, Brain, Search, Coffee } from 'lucide-react'
import type { ConversationType } from '@/types'
import { cn } from '@/lib/utils'

interface ConversationModeSelectorProps {
  currentMode: ConversationType
  onModeChange: (mode: ConversationType) => void
  disabled?: boolean
}

const modeConfig: Record<ConversationType, {
  label: string
  icon: React.ComponentType<{ className?: string }>
  description: string
  color: string
}> = {
  planning: {
    label: 'Planning',
    icon: Target,
    description: 'Structured planning and strategy',
    color: 'text-primary-400 hover:bg-primary-900 hover:bg-opacity-10'
  },
  ideation: {
    label: 'Ideation',
    icon: Lightbulb,
    description: 'Creative brainstorming and ideas',
    color: 'text-yellow-400 hover:bg-yellow-900 hover:bg-opacity-20'
  },
  refinement: {
    label: 'Refinement',
    icon: Search,
    description: 'Polish and improve concepts',
    color: 'text-purple-400 hover:bg-purple-900 hover:bg-opacity-20'
  },
  debate: {
    label: 'Debate',
    icon: MessageSquare,
    description: 'Critical discussion and analysis',
    color: 'text-red-400 hover:bg-red-900 hover:bg-opacity-20'
  },
  brainstorm: {
    label: 'Brainstorm',
    icon: Brain,
    description: 'Free-flowing creative exploration',
    color: 'text-green-400 hover:bg-green-900 hover:bg-opacity-20'
  },
  review: {
    label: 'Review',
    icon: Hash,
    description: 'Systematic evaluation and feedback',
    color: 'text-indigo-400 hover:bg-indigo-900 hover:bg-opacity-20'
  },
  casual: {
    label: 'Casual',
    icon: Coffee,
    description: 'Relaxed, informal discussion',
    color: 'text-text-secondary hover:bg-primary-900 hover:bg-opacity-10'
  }
}

export const ConversationModeSelector: React.FC<ConversationModeSelectorProps> = ({
  currentMode,
  onModeChange,
  disabled = false
}) => {
  return (
    <div className="border-b px-4 py-2" style={{ borderColor: 'var(--color-surface-border)', backgroundColor: 'var(--color-bg-secondary)' }}>
      <div className="flex items-center space-x-2">
        <span className="text-xs font-medium text-text-tertiary uppercase tracking-wider">Mode:</span>
        <div className="flex items-center space-x-1">
          {(Object.keys(modeConfig) as ConversationType[]).map((mode) => {
            const config = modeConfig[mode]
            const Icon = config.icon
            const isActive = currentMode === mode

            return (
              <button
                key={mode}
                onClick={() => onModeChange(mode)}
                disabled={disabled}
                className={cn(
                  'group relative flex items-center space-x-1 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                  isActive
                    ? `${config.color.split(' ')[0]} bg-primary-900 bg-opacity-30 shadow-sm border border-primary-600`
                    : `text-text-secondary ${config.color.split(' ')[1]} hover:text-text-primary`,
                  disabled && 'opacity-50 cursor-not-allowed'
                )}
                title={config.description}
              >
                <Icon className="h-4 w-4" />
                <span>{config.label}</span>

                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-text-primary text-surface-primary text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                  {config.description}
                </div>
              </button>
            )
          })}
        </div>

        <div className="ml-auto text-xs text-text-tertiary">
          {modeConfig[currentMode].description}
        </div>
      </div>
    </div>
  )
}