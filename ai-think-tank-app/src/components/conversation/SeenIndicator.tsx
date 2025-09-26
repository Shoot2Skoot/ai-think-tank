import React from 'react'
import { Eye, Check, CheckCheck } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import type { Persona } from '@/types'

interface SeenIndicatorProps {
  seenBy: Persona[]
  isLastMessage?: boolean
  messageStatus?: 'sent' | 'delivered' | 'seen'
}

export const SeenIndicator: React.FC<SeenIndicatorProps> = ({
  seenBy,
  isLastMessage = false,
  messageStatus = 'sent'
}) => {
  if (!isLastMessage && seenBy.length === 0) return null

  // For the last message, show delivery/seen status
  if (isLastMessage && messageStatus) {
    return (
      <div className="flex items-center space-x-1 mt-1">
        {messageStatus === 'sent' && (
          <Check className="h-3 w-3 text-gray-400" />
        )}
        {messageStatus === 'delivered' && (
          <CheckCheck className="h-3 w-3 text-gray-400" />
        )}
        {messageStatus === 'seen' && (
          <CheckCheck className="h-3 w-3 text-blue-500" />
        )}
        {seenBy.length > 0 && (
          <div className="flex items-center space-x-1 ml-2">
            <span className="text-xs text-gray-500">Seen by</span>
            <div className="flex -space-x-1">
              {seenBy.slice(0, 3).map((persona) => (
                <Avatar
                  key={persona.id}
                  fallback={persona.name}
                  size="xs"
                  className="ring-1 ring-white"
                />
              ))}
              {seenBy.length > 3 && (
                <div className="flex items-center justify-center w-4 h-4 rounded-full bg-gray-300 ring-1 ring-white">
                  <span className="text-xs text-gray-700">
                    +{seenBy.length - 3}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  // For other messages, just show who has seen it
  if (seenBy.length > 0) {
    return (
      <div className="flex items-center space-x-1 mt-1">
        <Eye className="h-3 w-3 text-gray-400" />
        <span className="text-xs text-gray-500">
          Seen by {seenBy.map(p => p.name).join(', ')}
        </span>
      </div>
    )
  }

  return null
}