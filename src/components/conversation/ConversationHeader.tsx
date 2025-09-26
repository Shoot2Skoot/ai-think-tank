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
    <div className="border-b bg-white">
      {/* Main Header */}
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Hash className="h-5 w-5 text-gray-500" />
          <div>
            <h1 className="font-semibold text-gray-900">
              {conversation.title}
            </h1>
            {conversation.topic && (
              <p className="text-sm text-gray-500">{conversation.topic}</p>
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
                className="text-red-600 hover:text-red-700"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Expandable Details */}
      {showDetails && (
        <div className="px-4 py-3 border-t bg-gray-50">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">
                {personas.length} participants
              </span>
            </div>
            <div className="flex -space-x-2">
              {personas.slice(0, 5).map((persona) => (
                <Avatar
                  key={persona.id}
                  fallback={persona.name}
                  size="xs"
                  className="ring-2 ring-white"
                />
              ))}
              {personas.length > 5 && (
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-300 ring-2 ring-white">
                  <span className="text-xs text-gray-700">
                    +{personas.length - 5}
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <span>Mode:</span>
              <Badge size="sm" variant="secondary">
                {conversation.mode === 'auto' ? 'Automatic' : 'Manual'}
              </Badge>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
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