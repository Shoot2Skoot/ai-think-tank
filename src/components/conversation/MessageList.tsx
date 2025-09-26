import React, { useRef, useEffect } from 'react'
import { formatRelativeTime, cn } from '@/lib/utils'
import { Avatar } from '@/components/ui/Avatar'
import { ModelBadge } from './ModelSelector'
import { TypingIndicator } from './TypingIndicator'
import { MessageContent } from './MessageContent'
import { TimeDivider } from './TimeDivider'
import { SeenIndicator } from './SeenIndicator'
import type { Message, Persona } from '@/types'

interface MessageListProps {
  messages: Message[]
  personas: Persona[]
  streamingContent: Record<string, string>
  loading?: boolean
  typingPersonas?: Persona[]
  seenStatus?: Record<string, string[]> // messageId -> personaIds who have seen it
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  personas,
  streamingContent,
  loading,
  typingPersonas = [],
  seenStatus = {}
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  const renderMessage = (message: Message, index: number) => {
    const persona = personas.find(p => p.id === message.persona_id)
    const isUser = message.role === 'user'
    const content = streamingContent[message.id] || message.content
    const prevMessage = index > 0 ? messages[index - 1] : null
    const isSameAuthor = prevMessage?.persona_id === message.persona_id && prevMessage?.role === message.role
    const showAvatar = !isSameAuthor || index === 0

    // Extract mentions from content
    const mentions = content.match(/@(\w+)/g)?.map(m => m.slice(1)) || []

    return (
      <div
        key={message.id}
        className={cn(
          'group hover:bg-gray-50 px-4 py-1',
          !isSameAuthor && 'mt-4'
        )}
      >
        <div className="flex items-start space-x-3">
          <div className="w-10 flex-shrink-0">
            {showAvatar && (
              <Avatar
                fallback={isUser ? 'You' : persona?.name || 'AI'}
                size="sm"
                className={isUser ? 'bg-blue-600' : ''}
              />
            )}
          </div>
          <div className="flex-1 min-w-0">
            {showAvatar && (
              <div className="flex items-baseline space-x-2 mb-0.5">
                <span className="font-semibold text-sm">
                  {isUser ? 'You' : persona?.name || 'Unknown'}
                </span>
                {persona && !isUser && (
                  <ModelBadge provider={persona.provider} model={persona.model} />
                )}
                <span className="text-xs text-gray-500">
                  {formatRelativeTime(message.created_at)}
                </span>
              </div>
            )}
            <MessageContent content={content} mentions={mentions} />
            {message.cost && (
              <span className="text-xs text-gray-500 mt-1 inline-block">
                Cost: ${message.cost.toFixed(4)}
              </span>
            )}
            {/* Seen indicator */}
            {seenStatus[message.id] && (
              <SeenIndicator
                seenBy={seenStatus[message.id]
                  .map(id => personas.find(p => p.id === id))
                  .filter((p): p is Persona => p !== undefined)}
                isLastMessage={index === messages.length - 1}
                messageStatus={
                  seenStatus[message.id].length > 0 ? 'seen' :
                  index === messages.length - 1 ? 'delivered' : 'sent'
                }
              />
            )}
          </div>
        </div>
      </div>
    )
  }

  // Check if we should show a time divider
  const shouldShowTimeDivider = (current: Message, previous: Message | null) => {
    if (!previous) return true // Show divider for first message

    const currentDate = new Date(current.created_at).toDateString()
    const previousDate = new Date(previous.created_at).toDateString()

    return currentDate !== previousDate
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center py-12">
          <p className="text-gray-500">
            No messages yet. Start the conversation!
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="py-4">
        {messages.map((message, index) => {
          const prevMessage = index > 0 ? messages[index - 1] : null
          const showDivider = shouldShowTimeDivider(message, prevMessage)

          return (
            <React.Fragment key={message.id}>
              {showDivider && <TimeDivider date={message.created_at} />}
              {renderMessage(message, index)}
            </React.Fragment>
          )
        })}
        {typingPersonas.length > 0 && (
          <TypingIndicator typingPersonas={typingPersonas} />
        )}
        {loading && typingPersonas.length === 0 && (
          <div className="px-4 py-2">
            <div className="flex items-start space-x-3">
              <div className="w-10 flex-shrink-0">
                <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
              </div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded animate-pulse w-32 mb-2" />
                <div className="h-3 bg-gray-200 rounded animate-pulse w-48" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  )
}