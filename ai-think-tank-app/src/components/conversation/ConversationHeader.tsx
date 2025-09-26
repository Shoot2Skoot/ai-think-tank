import React from 'react'
import { Hash, Users, Settings, X, ChevronDown, Info } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { CostPopover } from './CostPopover'
import type { Conversation, Persona, CostBreakdown } from '@/types'

interface ConversationHeaderProps {
  conversation: Conversation | null
  personas: Persona[]
  costBreakdown: CostBreakdown | null
  messageCount?: number
  onEndConversation: () => void
  onToggleDetails?: () => void
  showDetails?: boolean
}

export const ConversationHeader: React.FC<ConversationHeaderProps> = ({
  conversation,
  personas,
  costBreakdown,
  messageCount = 0,
  onEndConversation,
  onToggleDetails,
  showDetails = false
}) => {
  if (!conversation) return null

  return (
    <div className="border-b" style={{ backgroundColor: 'var(--color-surface-primary)', borderColor: 'var(--color-surface-border)' }}>
      {/* Main Header */}
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Hash className="h-5 w-5" style={{ color: 'var(--color-text-tertiary)' }} />
          <div>
            <h1 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              {conversation.title}
            </h1>
            {conversation.topic && (
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{conversation.topic}</p>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleDetails}
            className="ml-2"
          >
            <ChevronDown
              className={`h-4 w-4 transition-transform ${
                showDetails ? 'rotate-180' : ''
              }`}
            />
          </Button>
        </div>

        <div className="flex items-center space-x-3">
          <CostPopover cost={costBreakdown} messageCount={messageCount} />
          <Badge variant={conversation.is_active ? 'success' : 'default'}>
            {conversation.is_active ? 'Active' : 'Ended'}
          </Badge>
          <div className="flex items-center space-x-1">
            <Button variant="ghost" size="sm">
              <Info className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
            {conversation.is_active && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onEndConversation}
                style={{ color: 'var(--color-error)' }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Expandable Details */}
      {showDetails && (
        <div className="px-4 py-3 border-t" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-surface-divider)' }}>
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4" style={{ color: 'var(--color-text-tertiary)' }} />
              <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                {personas.length} participants
              </span>
            </div>
            <div className="flex -space-x-2">
              {personas.slice(0, 5).map((persona) => (
                <Avatar
                  key={persona.id}
                  fallback={persona.name}
                  size="xs"
                  className="ring-2" style={{ '--tw-ring-color': 'var(--color-surface-primary)' } as React.CSSProperties}
                />
              ))}
              {personas.length > 5 && (
                <div className="flex items-center justify-center w-6 h-6 rounded-full ring-2" style={{ backgroundColor: 'var(--color-surface-tertiary)', '--tw-ring-color': 'var(--color-surface-primary)' } as React.CSSProperties}>
                  <span className="text-xs" style={{ color: 'var(--color-text-primary)' }}>
                    +{personas.length - 5}
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              <span>Mode:</span>
              <Badge size="sm" variant="secondary">
                {conversation.mode === 'auto' ? 'Automatic' : 'Manual'}
              </Badge>
            </div>
            <div className="flex items-center space-x-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              <span>Type:</span>
              <Badge size="sm" variant="secondary">
                {conversation.conversation_type}
              </Badge>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}