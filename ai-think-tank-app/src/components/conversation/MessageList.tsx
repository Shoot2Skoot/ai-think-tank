import React, { useRef, useEffect, useState } from 'react'
import { formatRelativeTime, cn } from '@/lib/utils'
import { Avatar } from '@/components/ui/Avatar'
import { ContextMenu, ContextMenuItem, ContextMenuSeparator } from '@/components/ui/ContextMenu'
import { ModelBadge } from './ModelSelector'
import { TypingIndicator } from './TypingIndicator'
import { MessageContent } from './MessageContent'
import { TimeDivider } from './TimeDivider'
import { SeenIndicator } from './SeenIndicator'
import { MessageEditor } from './MessageEditor'
import { MessageActions } from './MessageActions'
import { MessageReactions, QuickReactionsBar } from './MessageReactions'
import { Edit3, Copy, Reply, Pin } from 'lucide-react'
import { generateAvatarUrl, generateUserAvatarUrl } from '@/utils/avatar-generator'
import { ReactionService } from '@/services/reaction-service'
import type { Message, Persona, ReactionCount } from '@/types'

interface MessageListProps {
  messages: Message[]
  personas: Persona[]
  streamingContent: Record<string, string>
  loading?: boolean
  typingPersonas?: Persona[]
  seenStatus?: Record<string, string[]> // messageId -> personaIds who have seen it
  onEditMessage?: (messageId: string, newContent: string) => void
  onDeleteMessage?: (messageId: string) => void
  onReplyMessage?: (messageId: string) => void
  onPinMessage?: (messageId: string) => void
  currentUserId?: string
  conversationId?: string
  pinnedMessageIds?: string[]
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  personas,
  streamingContent,
  loading,
  typingPersonas = [],
  seenStatus = {},
  onEditMessage,
  onDeleteMessage,
  onReplyMessage,
  onPinMessage,
  currentUserId,
  conversationId,
  pinnedMessageIds = []
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [reactions, setReactions] = useState<Record<string, ReactionCount[]>>({})
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null)

  useEffect(() => {
    // Only auto-scroll if user is already near the bottom
    if (scrollContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100 // Within 100px of bottom

      if (isNearBottom) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }
    }
  }, [messages, streamingContent])

  // Load reactions for messages
  useEffect(() => {
    if (messages.length > 0) {
      const messageIds = messages.map(m => m.id)
      ReactionService.getReactionCounts(messageIds).then(setReactions)
    }
  }, [messages])

  // Subscribe to reaction updates
  useEffect(() => {
    if (!conversationId) return

    const subscription = ReactionService.subscribeToReactions(
      conversationId,
      (payload) => {
        // Reload reactions when they change
        const messageIds = messages.map(m => m.id)
        ReactionService.getReactionCounts(messageIds).then(setReactions)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [conversationId, messages])

  const handleReaction = async (messageId: string, emoji: string) => {
    // Optimistically update UI
    const messageIds = messages.map(m => m.id)
    const newReactions = await ReactionService.getReactionCounts(messageIds)
    setReactions(newReactions)
  }

  const renderMessage = (message: Message & { edited_at?: string }, index: number) => {
    const persona = personas.find(p => p.id === message.persona_id)
    const isUser = message.role === 'user'
    const isSystem = message.role === 'system'
    const isOwn = isUser && currentUserId === message.user_id
    const content = streamingContent[message.id] || message.content
    const prevMessage = index > 0 ? messages[index - 1] : null
    const isSameAuthor = prevMessage?.persona_id === message.persona_id && prevMessage?.role === message.role
    const showAvatar = !isSameAuthor || index === 0
    const isEditing = editingMessageId === message.id

    // Extract mentions from content - only match actual persona names
    const mentions: string[] = []
    personas.forEach(persona => {
      // Create regex for this specific persona name
      const escapedName = persona.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const regex = new RegExp(`@${escapedName}(?![A-Za-z])`, 'gi')
      if (regex.test(content)) {
        mentions.push(persona.name)
      }
    })

    const handleSaveEdit = (newContent: string) => {
      if (onEditMessage) {
        onEditMessage(message.id, newContent)
      }
      setEditingMessageId(null)
    }

    const handleCopyMessage = () => {
      navigator.clipboard.writeText(content)
    }

    const handleReply = () => {
      if (onReplyMessage) {
        onReplyMessage(message.id)
      }
    }

    const handlePin = () => {
      if (onPinMessage) {
        onPinMessage(message.id)
      }
    }

    const isPinned = message.is_pinned || pinnedMessageIds.includes(message.id)

    const contextMenuContent = (
      <>
        <ContextMenuItem onClick={handleCopyMessage} icon={<Copy className="h-4 w-4" />}>
          Copy Message
        </ContextMenuItem>
        {onReplyMessage && (
          <ContextMenuItem onClick={handleReply} icon={<Reply className="h-4 w-4" />}>
            Reply
          </ContextMenuItem>
        )}
        {onPinMessage && (
          <ContextMenuItem onClick={handlePin} icon={<Pin className="h-4 w-4" />}>
            {isPinned ? 'Unpin Message' : 'Pin Message'}
          </ContextMenuItem>
        )}
        {isOwn && onEditMessage && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={() => setEditingMessageId(message.id)} icon={<Edit3 className="h-4 w-4" />}>
              Edit Message
            </ContextMenuItem>
          </>
        )}
        {isOwn && onDeleteMessage && (
          <ContextMenuItem
            onClick={() => onDeleteMessage(message.id)}
            danger
          >
            Delete Message
          </ContextMenuItem>
        )}
      </>
    )

    return (
      <ContextMenu menu={contextMenuContent}>
        <div
          key={message.id}
          className={cn(
            'group px-4 py-1 message-item relative',
            !isSameAuthor && 'mt-4',
            isPinned && 'bg-yellow-50 bg-opacity-5 border-l-2 border-yellow-500'
          )}
          onMouseEnter={() => setHoveredMessageId(message.id)}
          onMouseLeave={() => setHoveredMessageId(null)}
        >
        <div className="flex items-start space-x-3">
          <div className="w-12 flex-shrink-0 pt-1">
            {showAvatar && !isSystem && (
              isUser ? (
                <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
                  <span className="text-white font-semibold">You</span>
                </div>
              ) : (
                <Avatar
                  generatedUrl={persona ? generateAvatarUrl(persona) : undefined}
                  src={persona?.avatar_url}
                  fallback={persona?.name || 'AI'}
                  size="md"
                />
              )
            )}
            {showAvatar && isSystem && (
              <div className="w-10 h-10 rounded-full bg-gray-500 flex items-center justify-center">
                <span className="text-white text-xs font-bold">S</span>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            {showAvatar && (
              <div className="flex items-baseline space-x-2 mb-0.5">
                <span className="font-semibold text-sm message-author">
                  {isSystem ? 'System' : isUser ? 'You' : persona?.name || 'AI Assistant'}
                </span>
                {persona && !isUser && (
                  <ModelBadge provider={persona.provider} model={persona.model} />
                )}
                <span className="text-xs message-timestamp">
                  {formatRelativeTime(message.created_at)}
                </span>
                {message.edited_at && (
                  <span className="text-xs flex items-center message-timestamp">
                    <Edit3 className="h-3 w-3 mr-0.5" />
                    edited
                  </span>
                )}
              </div>
            )}

            {isEditing ? (
              <MessageEditor
                originalContent={content}
                onSave={handleSaveEdit}
                onCancel={() => setEditingMessageId(null)}
              />
            ) : (
              <div className="relative">
                <MessageContent content={content} mentions={mentions} />
                {message.cost && (
                  <span className="text-xs mt-1 inline-block message-timestamp">
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
                {/* Message reactions - always render but control visibility */}
                <MessageReactions
                  messageId={message.id}
                  reactions={reactions[message.id] || []}
                  currentUserId={currentUserId}
                  personas={personas}
                  onReact={(emoji) => handleReaction(message.id, emoji)}
                  isMessageHovered={hoveredMessageId === message.id}
                  isLastMessage={index === messages.length - 1}
                />
              </div>
            )}
          </div>
          {!isEditing && (
            <div className="flex-shrink-0">
              <MessageActions
                messageId={message.id}
                content={content}
                isOwn={isOwn}
                isPinned={isPinned}
                onEdit={isOwn ? () => setEditingMessageId(message.id) : undefined}
                onDelete={isOwn && onDeleteMessage ? () => onDeleteMessage(message.id) : undefined}
                onReply={onReplyMessage ? () => handleReply() : undefined}
                onPin={onPinMessage ? () => handlePin() : undefined}
              />
            </div>
          )}
        </div>
      </div>
    </ContextMenu>
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
          <p className="message-content">
            No messages yet. Start the conversation!
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto message-list-container" ref={scrollContainerRef}>
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