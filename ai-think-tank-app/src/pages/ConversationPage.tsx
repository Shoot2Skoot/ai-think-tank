import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Modal } from '@/components/ui/Modal'
import { ConversationSetup } from '@/components/conversation/ConversationSetup'
import { ConversationSidebar } from '@/components/conversation/ConversationSidebar'
import { ConversationHeader } from '@/components/conversation/ConversationHeader'
import { MessageList } from '@/components/conversation/MessageList'
import { MessageInput } from '@/components/conversation/MessageInput'
import { ConversationModeSelector } from '@/components/conversation/ConversationModeSelector'
import { useConversationStore } from '@/stores/conversation-store'
import { useAuthStore } from '@/stores/auth-store'
import type { ConversationType } from '@/types'

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
  const [showHeaderDetails, setShowHeaderDetails] = useState(false)
  const [streamingContent, setStreamingContent] = useState<Record<string, string>>({})
  const [conversationMode, setConversationMode] = useState<ConversationType>('planning')
  const [typingPersonaIds, setTypingPersonaIds] = useState<string[]>([])

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

  const handleSendMessage = async (message: string, mentionedPersona?: string) => {
    if (!message.trim() || !user || !activeConversation) return

    await sendMessage(message, user.id, mentionedPersona)

    // If in manual mode and a persona was mentioned, trigger their response
    if (activeConversation.mode === 'manual' && mentionedPersona) {
      await triggerResponse(mentionedPersona)
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
          <div className="px-4 py-2 bg-primary-900 bg-opacity-20" style={{ borderBottom: '1px solid var(--color-surface-border)' }}>
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
        />

        {/* Input */}
        {activeConversation?.is_active && (
          <MessageInput
            onSendMessage={handleSendMessage}
            personas={personas}
            disabled={!activeConversation.is_active}
            loading={loading}
            placeholder={
              activeConversation.mode === 'manual'
                ? 'Type a message... Use @ to mention a persona'
                : 'Type a message...'
            }
          />
        )}
      </div>

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
    </div>
  )
}