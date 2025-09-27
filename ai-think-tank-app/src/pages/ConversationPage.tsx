import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Modal } from '@/components/ui/Modal'
import { ConversationSetup } from '@/components/conversation/ConversationSetup'
import { ConversationSidebar } from '@/components/conversation/ConversationSidebar'
import { ConversationHeader } from '@/components/conversation/ConversationHeader'
import { MessageList } from '@/components/conversation/MessageList'
import { MessageInput } from '@/components/conversation/MessageInput'
import { ConversationModeSelector } from '@/components/conversation/ConversationModeSelector'
import { PersonaPresencePanel } from '@/components/conversation/PersonaPresencePanel'
import { useConversationStore } from '@/stores/conversation-store'
import { useAuthStore } from '@/stores/auth-store'
import { useAIReactions } from '@/hooks/useAIReactions'
import { conversationManager } from '@/services/conversation/conversation-manager'
import { supabase } from '@/lib/supabase'
import type { ConversationType } from '@/types'
import { DebugPanel } from '@/components/debug/DebugPanel'
import { debugInterceptor } from '@/lib/debug-interceptor'

export const ConversationPage: React.FC = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const {
    activeConversation,
    conversations,
    messages,
    personas,
    costBreakdown,
    loading,
    sendMessage,
    triggerResponse,
    loadConversation,
    loadConversations,
    endConversation,
    setStreamCallback
  } = useConversationStore()

  const [isSetupOpen, setIsSetupOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isPresencePanelCollapsed, setIsPresencePanelCollapsed] = useState(false)
  const [showHeaderDetails, setShowHeaderDetails] = useState(false)
  const [streamingContent, setStreamingContent] = useState<Record<string, string>>({})
  const [conversationMode, setConversationMode] = useState<ConversationType>('planning')
  const [typingPersonaIds, setTypingPersonaIds] = useState<string[]>([])
  const [replyToMessageId, setReplyToMessageId] = useState<string | null>(null)
  const [optimisticPinnedIds, setOptimisticPinnedIds] = useState<Set<string>>(new Set())

  // Load conversations list on mount
  useEffect(() => {
    if (user?.id) {
      loadConversations(user.id)
    }
  }, [user?.id, loadConversations])

  // Load specific conversation when ID changes
  useEffect(() => {
    if (id && id !== 'new') {
      loadConversation(id)
    } else if (!id || id === 'new') {
      setIsSetupOpen(true)
    }
  }, [id, loadConversation])

  // Update conversation mode when active conversation changes
  useEffect(() => {
    if (activeConversation) {
      setConversationMode(activeConversation.conversation_type)
    }
  }, [activeConversation])

  // Setup streaming callback
  useEffect(() => {
    setStreamCallback((chunk: string) => {
      setStreamingContent((prev) => {
        const lastMessageId = messages[messages.length - 1]?.id
        if (lastMessageId) {
          return {
            ...prev,
            [lastMessageId]: (prev[lastMessageId] || '') + chunk
          }
        }
        return prev
      })
    })
  }, [messages, setStreamCallback])

  // Simulate typing indicator when loading
  useEffect(() => {
    if (loading && activeConversation?.mode === 'auto') {
      // Randomly pick 1-2 personas to show as typing
      const availablePersonas = personas.filter(p => p.id !== 'user')
      const typingCount = Math.min(Math.floor(Math.random() * 2) + 1, availablePersonas.length)
      const typing = availablePersonas
        .sort(() => Math.random() - 0.5)
        .slice(0, typingCount)
        .map(p => p.id)
      setTypingPersonaIds(typing)
    } else {
      setTypingPersonaIds([])
    }
  }, [loading, activeConversation?.mode, personas])

  // Enable AI reactions
  useAIReactions({
    messages,
    personas,
    enabled: activeConversation?.mode === 'auto',
    conversationId: activeConversation?.id
  })

  // Enable debug interceptor in development
  useEffect(() => {
    if (import.meta.env.DEV) {
      debugInterceptor.enable()
      return () => debugInterceptor.disable()
    }
  }, [])

  const handleSendMessage = async (message: string, mentionedPersona?: string) => {
    if (!message.trim() || !user || !activeConversation) return

    // Add reply context if replying to a message
    let finalMessage = message
    if (replyToMessageId) {
      const replyToMessage = messages.find(m => m.id === replyToMessageId)
      if (replyToMessage) {
        const persona = personas.find(p => p.id === replyToMessage.persona_id)
        const authorName = replyToMessage.role === 'user' ? 'You' : persona?.name || 'AI Assistant'
        finalMessage = `> Replying to ${authorName}: ${replyToMessage.content.slice(0, 100)}${replyToMessage.content.length > 100 ? '...' : ''}\n\n${message}`
      }
      setReplyToMessageId(null) // Clear reply after sending
    }

    await sendMessage(finalMessage, user.id, mentionedPersona)

    // If in manual mode and a persona was mentioned, trigger their response
    if (activeConversation.mode === 'manual' && mentionedPersona) {
      await triggerResponse(mentionedPersona)
    }
  }

  const handlePinMessage = async (messageId: string) => {
    if (!user?.id || !activeConversation?.id) return

    const message = messages.find(m => m.id === messageId)
    if (!message) return

    const isPinned = message.is_pinned || optimisticPinnedIds.has(messageId)
    const newPinnedState = !isPinned

    // Optimistic update - update UI immediately
    setOptimisticPinnedIds(prev => {
      const newSet = new Set(prev)
      if (newPinnedState) {
        newSet.add(messageId)
      } else {
        newSet.delete(messageId)
      }
      return newSet
    })

    // Update conversation manager immediately for AI context
    const currentPinnedIds = messages
      .filter(m => m.is_pinned || (m.id === messageId ? newPinnedState : false))
      .map(m => m.id)
    conversationManager.setPinnedMessages(activeConversation.id, currentPinnedIds)

    try {
      // Update the database in the background
      const { error } = await supabase
        .from('messages')
        .update({
          is_pinned: newPinnedState,
          pinned_at: newPinnedState ? new Date().toISOString() : null,
          pinned_by: newPinnedState ? user.id : null
        })
        .eq('id', messageId)

      if (error) {
        console.error('Database update error:', error)
        // Revert optimistic update on error
        setOptimisticPinnedIds(prev => {
          const newSet = new Set(prev)
          if (newPinnedState) {
            newSet.delete(messageId)
          } else {
            newSet.add(messageId)
          }
          return newSet
        })
        throw error
      }

      // Reload conversation to sync with database
      await loadConversation(activeConversation.id)
      // Clear optimistic state after successful reload
      setOptimisticPinnedIds(new Set())
    } catch (error) {
      console.error('Failed to pin/unpin message:', error)
    }
  }

  const handleReplyMessage = (messageId: string) => {
    setReplyToMessageId(messageId)
    // Focus the input
    const input = document.querySelector('textarea[placeholder*="Type a message"]') as HTMLTextAreaElement
    if (input) {
      input.focus()
    }
  }

  const handleEndConversation = async () => {
    if (confirm('Are you sure you want to end this conversation?')) {
      await endConversation()
      navigate('/dashboard')
    }
  }

  const handleNewConversation = () => {
    setIsSetupOpen(true)
  }

  return (
    <div className="h-screen flex" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      {/* Sidebar */}
      <ConversationSidebar
        conversations={conversations}
        activeConversationId={activeConversation?.id}
        onNewConversation={handleNewConversation}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        {/* Header */}
        <ConversationHeader
          conversation={activeConversation}
          personas={personas}
          costBreakdown={costBreakdown}
          messageCount={messages.length}
          onEndConversation={handleEndConversation}
          onToggleDetails={() => setShowHeaderDetails(!showHeaderDetails)}
          showDetails={showHeaderDetails}
        />

        {/* Conversation Mode Selector */}
        {activeConversation && (
          <div className="px-4 py-1 bg-primary-900 bg-opacity-20" style={{ borderBottom: '1px solid var(--color-surface-border)' }}>
            <ConversationModeSelector
              currentMode={conversationMode}
              onModeChange={setConversationMode}
              disabled={!activeConversation.is_active}
            />
          </div>
        )}

        {/* Messages */}
        <MessageList
          messages={messages}
          personas={personas}
          streamingContent={streamingContent}
          loading={loading}
          typingPersonas={typingPersonaIds.map(id => personas.find(p => p.id === id)!).filter(Boolean)}
          currentUserId={user?.id}
          conversationId={activeConversation?.id}
          onPinMessage={handlePinMessage}
          onReplyMessage={handleReplyMessage}
          pinnedMessageIds={[
            ...messages.filter(m => m.is_pinned).map(m => m.id),
            ...Array.from(optimisticPinnedIds)
          ]}
        />

        {/* Input */}
        {activeConversation?.is_active && (
          <>
            {replyToMessageId && (
              <div className="px-4 py-2 bg-primary-900 bg-opacity-10 border-t border-surface-border flex items-center justify-between">
                <div className="text-sm text-text-secondary">
                  Replying to: {messages.find(m => m.id === replyToMessageId)?.content.slice(0, 100)}...
                </div>
                <button
                  onClick={() => setReplyToMessageId(null)}
                  className="text-text-tertiary hover:text-text-secondary"
                >
                  ✕
                </button>
              </div>
            )}
            <MessageInput
              onSendMessage={handleSendMessage}
              personas={personas}
              disabled={!activeConversation.is_active}
              loading={loading}
              placeholder={
                replyToMessageId
                  ? 'Type your reply...'
                  : activeConversation.mode === 'manual'
                  ? 'Type a message... Use @ to mention a persona'
                  : 'Type a message...'
              }
            />
          </>
        )}
      </div>

      {/* Persona Presence Panel */}
      {activeConversation && (
        <PersonaPresencePanel
          personas={personas}
          messages={messages}
          isCollapsed={isPresencePanelCollapsed}
          onToggleCollapse={() => setIsPresencePanelCollapsed(!isPresencePanelCollapsed)}
        />
      )}

      {/* Setup Modal */}
      <Modal
        isOpen={isSetupOpen}
        onClose={() => {
          setIsSetupOpen(false)
          if (!activeConversation) {
            navigate('/dashboard')
          }
        }}
        title="Start New Conversation"
        size="xl"
      >
        <ConversationSetup
          onComplete={(conversationId) => {
            setIsSetupOpen(false)
            navigate(`/conversation/${conversationId}`)
          }}
        />
      </Modal>

      {/* Debug Panel - only in development */}
      {import.meta.env.DEV && <DebugPanel />}
    </div>
  )
}