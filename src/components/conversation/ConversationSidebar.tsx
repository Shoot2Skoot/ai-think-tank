import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Hash, Plus, ChevronDown, ChevronRight, Search, Filter } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { formatRelativeTime, cn } from '@/lib/utils'
import type { Conversation } from '@/types'

interface ConversationSidebarProps {
  conversations: Conversation[]
  activeConversationId?: string
  onNewConversation: () => void
  isCollapsed?: boolean
  onToggleCollapse?: () => void
}

export const ConversationSidebar: React.FC<ConversationSidebarProps> = ({
  conversations,
  activeConversationId,
  onNewConversation,
  isCollapsed = false,
  onToggleCollapse
}) => {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['active', 'recent'])
  )

  // Group conversations
  const activeConversations = conversations.filter(c => c.is_active)
  const recentConversations = conversations.filter(c => !c.is_active).slice(0, 10)

  // Filter by search term
  const filterConversations = (convos: Conversation[]) => {
    if (!searchTerm) return convos
    return convos.filter(c =>
      c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.topic?.toLowerCase().includes(searchTerm.toLowerCase())
    )
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

  const ConversationItem = ({ conversation }: { conversation: Conversation }) => {
    const isActive = conversation.id === activeConversationId

    return (
      <button
        onClick={() => navigate(`/conversation/${conversation.id}`)}
        className={cn(
          'w-full text-left px-2 py-1.5 rounded hover:bg-gray-100 flex items-center space-x-2 group',
          isActive && 'bg-blue-50 hover:bg-blue-50'
        )}
      >
        <Hash className={cn(
          'h-4 w-4 flex-shrink-0',
          isActive ? 'text-blue-600' : 'text-gray-400'
        )} />
        <div className="flex-1 min-w-0">
          <p className={cn(
            'text-sm truncate',
            isActive ? 'font-semibold text-blue-900' : 'text-gray-900'
          )}>
            {conversation.title}
          </p>
          {!isCollapsed && conversation.topic && (
            <p className="text-xs text-gray-500 truncate">
              {conversation.topic}
            </p>
          )}
        </div>
        {!isCollapsed && conversation.is_active && (
          <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0" />
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
          <div className="mt-1 space-y-0.5">
            {filteredConvos.map(conversation => (
              <ConversationItem key={conversation.id} conversation={conversation} />
            ))}
          </div>
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