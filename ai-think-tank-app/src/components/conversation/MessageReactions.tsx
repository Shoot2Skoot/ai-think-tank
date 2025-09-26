import React, { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { ReactionPicker } from './ReactionPicker'
import { ReactionService } from '@/services/reaction-service'
import type { ReactionCount, Persona } from '@/types'
import { Smile } from 'lucide-react'

interface MessageReactionsProps {
  messageId: string
  reactions?: ReactionCount[]
  currentUserId?: string
  personas: Persona[]
  onReact?: (emoji: string) => void
  className?: string
  isMessageHovered?: boolean
}

export const MessageReactions: React.FC<MessageReactionsProps> = ({
  messageId,
  reactions = [],
  currentUserId,
  personas,
  onReact,
  className,
  isMessageHovered = false
}) => {
  const [quickReactions, setQuickReactions] = useState<string[]>([])
  const [showQuickReactions, setShowQuickReactions] = useState(false)
  const [isPickerOpen, setIsPickerOpen] = useState(false)

  useEffect(() => {
    // Load quick reactions
    ReactionService.getTopReactionEmojis(5).then(setQuickReactions)
  }, [])

  const handleReactionClick = async (emoji: string) => {
    if (!currentUserId) return

    const result = await ReactionService.toggleReaction(
      messageId,
      emoji,
      currentUserId
    )

    if (result && onReact) {
      onReact(emoji)
    }
  }

  const getReactionTooltip = (reaction: ReactionCount) => {
    const users = reaction.user_reactions.map(() => 'You') // In real app, map to user names
    const personaNames = reaction.persona_reactions
      .map(id => personas.find(p => p.id === id)?.name)
      .filter(Boolean)

    const all = [...users, ...personaNames]
    if (all.length === 0) return ''
    if (all.length === 1) return all[0]
    if (all.length === 2) return `${all[0]} and ${all[1]}`
    return `${all[0]}, ${all[1]} and ${all.length - 2} others`
  }

  return (
    <>
      {/* Existing reactions - only show if there are reactions */}
      {reactions.length > 0 && (
        <div className={cn("flex flex-wrap gap-1 mt-1", className)}>
          {reactions.map(reaction => (
            <button
              key={reaction.emoji}
              onClick={() => handleReactionClick(reaction.emoji)}
              className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-sm transition-all",
                "hover:scale-110",
                reaction.reacted_by_user
                  ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500"
                  : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
              )}
              title={getReactionTooltip(reaction)}
            >
              <span>{reaction.emoji}</span>
              {reaction.count > 1 && (
                <span className="text-xs font-medium">{reaction.count}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Floating reaction bar on hover OR when picker is open */}
      {(isMessageHovered || isPickerOpen) && (
        <div
          className="absolute top-full mt-1 left-0 flex items-center gap-1 px-2 py-1 rounded-lg shadow-lg border animate-fadeIn z-10 pointer-events-auto"
          style={{
            backgroundColor: 'var(--color-surface-primary)',
            borderColor: 'var(--color-surface-border)'
          }}
          onMouseEnter={(e) => e.stopPropagation()}
          onMouseLeave={(e) => e.stopPropagation()}
        >
          {/* Quick reactions */}
          {quickReactions
            .filter(emoji => !reactions.find(r => r.emoji === emoji))
            .slice(0, 5)
            .map(emoji => (
              <button
                key={emoji}
                onClick={() => handleReactionClick(emoji)}
                className="p-1 rounded transition-all hover:scale-110"
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                title={`React with ${emoji}`}
              >
                <span className="text-lg">{emoji}</span>
              </button>
            ))}

          {/* Add reaction button */}
          <ReactionPicker
            onSelect={handleReactionClick}
            onOpenChange={setIsPickerOpen}
            trigger={
              <div className="p-1 rounded transition-all hover:bg-opacity-20">
                <Smile className="h-4 w-4" style={{ color: 'var(--color-text-tertiary)' }} />
              </div>
            }
          />
        </div>
      )}
    </>
  )
}

// Quick reactions bar for hover state
interface QuickReactionsBarProps {
  messageId: string
  currentUserId?: string
  onReact?: (emoji: string) => void
  className?: string
}

export const QuickReactionsBar: React.FC<QuickReactionsBarProps> = ({
  messageId,
  currentUserId,
  onReact,
  className
}) => {
  const [quickReactions, setQuickReactions] = useState<string[]>([])

  useEffect(() => {
    ReactionService.getTopReactionEmojis(5).then(setQuickReactions)
  }, [])

  const handleReaction = async (emoji: string) => {
    if (!currentUserId) return

    const result = await ReactionService.addReaction(
      messageId,
      emoji,
      currentUserId
    )

    if (result && onReact) {
      onReact(emoji)
    }
  }

  return (
    <div className={cn(
      "absolute -top-8 right-0 flex items-center gap-1 px-2 py-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700",
      className
    )}>
      {quickReactions.map(emoji => (
        <button
          key={emoji}
          onClick={() => handleReaction(emoji)}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-all hover:scale-110"
          title={`React with ${emoji}`}
        >
          <span className="text-lg">{emoji}</span>
        </button>
      ))}
      <ReactionPicker
        onSelect={handleReaction}
        trigger={
          <div className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-all">
            <Smile className="h-4 w-4 text-gray-500" />
          </div>
        }
      />
    </div>
  )
}