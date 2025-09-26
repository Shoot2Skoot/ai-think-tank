import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Hash, GripVertical } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import type { Conversation } from '@/types'

interface DraggableConversationItemProps {
  conversation: Conversation
  isActive: boolean
  unreadCount: number
  memberCount: number
  formatChannelName: (title: string) => string
  onClick: () => void
  isCollapsed?: boolean
}

export const DraggableConversationItem: React.FC<DraggableConversationItemProps> = ({
  conversation,
  isActive,
  unreadCount,
  memberCount,
  formatChannelName,
  onClick,
  isCollapsed = false
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: conversation.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const hasUnread = unreadCount > 0 && !isActive

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group relative',
        isDragging && 'z-50'
      )}
    >
      <button
        onClick={onClick}
        className={cn(
          'w-full text-left px-2 py-1.5 rounded hover:bg-primary-900 hover:bg-opacity-10 flex items-center space-x-2',
          isActive && 'bg-primary-900 bg-opacity-20 hover:bg-primary-900 hover:bg-opacity-20',
          hasUnread && 'font-semibold',
          isDragging && 'cursor-grabbing'
        )}
      >
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="opacity-0 group-hover:opacity-100 cursor-grab absolute left-0 p-1 transition-opacity"
        >
          <GripVertical className="h-3 w-3 text-text-tertiary" />
        </div>

        <Hash className={cn(
          'h-4 w-4 flex-shrink-0 ml-4',
          isActive ? 'text-primary-400' : hasUnread ? 'text-text-secondary' : 'text-text-tertiary'
        )} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <p className={cn(
              'text-sm truncate',
              isActive ? 'font-semibold text-primary-400' : hasUnread ? 'font-semibold text-text-primary' : 'text-text-primary'
            )}>
              {formatChannelName(conversation.title)}
            </p>
            {!isCollapsed && (
              <span className="text-xs text-text-tertiary">
                {memberCount}
              </span>
            )}
          </div>
          {!isCollapsed && conversation.topic && (
            <p className="text-xs text-text-tertiary truncate">
              {conversation.topic}
            </p>
          )}
        </div>

        {!isCollapsed && (
          <div className="flex items-center space-x-1">
            {hasUnread && (
              <Badge size="sm" variant="danger" className="px-1.5 py-0">
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
            {conversation.is_active && (
              <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0" />
            )}
          </div>
        )}
      </button>
    </div>
  )
}