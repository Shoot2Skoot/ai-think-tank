import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from '@dnd-kit/sortable'
import { Hash, Plus, ChevronDown, ChevronRight, Search, Filter } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { DraggableConversationItem } from './DraggableConversationItem'
import { formatRelativeTime, cn } from '@/lib/utils'
import type { Conversation } from '@/types'

interface ConversationSidebarProps {
  conversations: Conversation[]
  activeConversationId?: string
  onNewConversation: () => void
  isCollapsed?: boolean
  onToggleCollapse?: () => void
  unreadCounts?: Record<string, number>
  onReorderConversations?: (conversations: Conversation[]) => void
}

export const ConversationSidebar: React.FC<ConversationSidebarProps> = ({
  conversations,
  activeConversationId,
  onNewConversation,
  isCollapsed = false,
  onToggleCollapse,
  unreadCounts = {},
  onReorderConversations
}) => {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['active', 'recent'])
  )
  const [orderedConversations, setOrderedConversations] = useState(conversations)

  // Setup drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Update ordered conversations when prop changes
  React.useEffect(() => {
    setOrderedConversations(conversations)
  }, [conversations])

  // Group conversations
  const activeConversations = orderedConversations.filter(c => c.is_active)
  const recentConversations = orderedConversations.filter(c => !c.is_active).slice(0, 10)

  // Filter by search term
  const filterConversations = (convos: Conversation[]) => {
    if (!searchTerm) return convos
    return convos.filter(c =>
      c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.topic?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (active.id !== over?.id) {
      setOrderedConversations((items) => {
        const oldIndex = items.findIndex(i => i.id === active.id)
        const newIndex = items.findIndex(i => i.id === over?.id)

        const newOrder = arrayMove(items, oldIndex, newIndex)

        // Notify parent of reorder
        if (onReorderConversations) {
          onReorderConversations(newOrder)
        }

        return newOrder
      })
    }
  }

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(category)) {
      newExpanded.delete(category)
    } else {
      newExpanded.add(category)
    }
    setExpandedCategories(newExpanded)
  }

  // Format conversation name to channel style
  const formatChannelName = (title: string) => {
    return '#' + title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  }

  const ConversationItem = ({ conversation }: { conversation: Conversation }) => {
    const isActive = conversation.id === activeConversationId
    const unreadCount = unreadCounts[conversation.id] || 0
    const hasUnread = unreadCount > 0 && !isActive

    // Get member count (personas + user)
    const memberCount = (conversation.personas?.length || 0) + 1

    return (
      <button
        onClick={() => navigate(`/conversation/${conversation.id}`)}
        className={cn(
          'w-full text-left px-2 py-1.5 rounded hover:bg-gray-100 flex items-center space-x-2 group',
          isActive && 'bg-blue-50 hover:bg-blue-50',
          hasUnread && 'font-semibold'
        )}
      >
        <Hash className={cn(
          'h-4 w-4 flex-shrink-0',
          isActive ? 'text-blue-600' : hasUnread ? 'text-gray-700' : 'text-gray-400'
        )} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <p className={cn(
              'text-sm truncate',
              isActive ? 'font-semibold text-blue-900' : hasUnread ? 'font-semibold text-gray-900' : 'text-gray-900'
            )}>
              {formatChannelName(conversation.title)}
            </p>
            {!isCollapsed && (
              <span className="text-xs text-gray-500">
                {memberCount}
              </span>
            )}
          </div>
          {!isCollapsed && conversation.topic && (
            <p className="text-xs text-gray-500 truncate">
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
    )
  }

  const CategorySection = ({
    title,
    conversations: convos,
    category
  }: {
    title: string
    conversations: Conversation[]
    category: string
  }) => {
    const filteredConvos = filterConversations(convos)
    const isExpanded = expandedCategories.has(category)

    if (filteredConvos.length === 0) return null

    return (
      <div className="mb-4">
        <button
          onClick={() => toggleCategory(category)}
          className="flex items-center space-x-1 w-full px-2 py-1 text-xs font-semibold text-gray-600 hover:text-gray-900"
        >
          {isExpanded ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
          <span className="uppercase tracking-wide">{title}</span>
          <span className="text-gray-400">({filteredConvos.length})</span>
        </button>
        {isExpanded && (
          <SortableContext
            items={filteredConvos.map(c => c.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="mt-1 space-y-0.5">
              {filteredConvos.map(conversation => (
                <DraggableConversationItem
                  key={conversation.id}
                  conversation={conversation}
                  isActive={conversation.id === activeConversationId}
                  unreadCount={unreadCounts[conversation.id] || 0}
                  memberCount={(conversation.personas?.length || 0) + 1}
                  formatChannelName={formatChannelName}
                  onClick={() => navigate(`/conversation/${conversation.id}`)}
                  isCollapsed={isCollapsed}
                />
              ))}
            </div>
          </SortableContext>
        )}
      </div>
    )
  }

  if (isCollapsed) {
    return (
      <div className="w-16 bg-gray-50 border-r flex flex-col items-center py-4 space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleCollapse}
          className="p-2"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onNewConversation}
          className="p-2"
        >
          <Plus className="h-4 w-4" />
        </Button>
        <div className="flex-1 space-y-2 overflow-y-auto w-full px-2">
          {filterConversations([...activeConversations, ...recentConversations])
            .slice(0, 10)
            .map(conversation => (
              <button
                key={conversation.id}
                onClick={() => navigate(`/conversation/${conversation.id}`)}
                className={cn(
                  'w-full p-2 rounded hover:bg-gray-200 flex justify-center',
                  conversation.id === activeConversationId && 'bg-blue-100'
                )}
                title={conversation.title}
              >
                <Hash className={cn(
                  'h-4 w-4',
                  conversation.id === activeConversationId ? 'text-blue-600' : 'text-gray-500'
                )} />
              </button>
            ))}
        </div>
      </div>
    )
  }

  return (
    <div className="w-64 bg-gray-50 border-r flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b bg-white">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900">Conversations</h2>
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleCollapse}
              className="p-1"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onNewConversation}
              className="p-1"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2 top-2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto p-2">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <CategorySection
            title="Active"
            conversations={activeConversations}
            category="active"
          />
          <CategorySection
            title="Recent"
            conversations={recentConversations}
            category="recent"
          />
        </DndContext>
      </div>

      {/* Footer Stats */}
      <div className="px-4 py-2 border-t text-xs text-gray-500">
        <div className="flex justify-between">
          <span>{activeConversations.length} active</span>
          <span>{conversations.length} total</span>
        </div>
      </div>
    </div>
  )
}