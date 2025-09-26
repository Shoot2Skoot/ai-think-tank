import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Send,
  Users,
  DollarSign,
  Settings,
  Play,
  Pause,
  User,
  Bot
} from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { Modal } from '@/components/ui/Modal'
import { ConversationSetup } from '@/components/conversation/ConversationSetup'
import { CostDisplay } from '@/components/conversation/CostDisplay'
import { PersonaSelector } from '@/components/conversation/PersonaSelector'
import { ConversationModeSelector } from '@/components/conversation/ConversationModeSelector'
import { ModelBadge } from '@/components/conversation/ModelSelector'
import { useConversationStore } from '@/stores/conversation-store'
import { useAuthStore } from '@/stores/auth-store'
import { formatRelativeTime, getProviderColor, cn } from '@/lib/utils'
import { PROVIDER_MODELS, type Message, Persona, ConversationType } from '@/types'

export const ConversationPage: React.FC = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const {
    activeConversation,
    messages,
    personas,
    costBreakdown,
    loading,
    sendMessage,
    triggerResponse,
    loadConversation,
    endConversation,
    setStreamCallback
  } = useConversationStore()

  const [input, setInput] = useState('')
  const [isSetupOpen, setIsSetupOpen] = useState(false)
  const [selectedPersona, setSelectedPersona] = useState<string | null>(null)
  const [autoMode, setAutoMode] = useState(true)
  const [streamingContent, setStreamingContent] = useState<Record<string, string>>({})
  const [conversationMode, setConversationMode] = useState<ConversationType>('planning')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (id && id !== 'new') {
      loadConversation(id)
    } else if (!id || id === 'new') {
      setIsSetupOpen(true)
    }
  }, [id, loadConversation])

  useEffect(() => {
    if (activeConversation) {
      setConversationMode(activeConversation.conversation_type)
    }
  }, [activeConversation])

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  const handleSendMessage = async () => {
    if (!input.trim() || !user || !activeConversation) return

    await sendMessage(input, user.id, selectedPersona || undefined)
    setInput('')
    setSelectedPersona(null)
  }

  const handleManualTrigger = async (personaId: string) => {
    if (!activeConversation || activeConversation.mode !== 'manual') return
    await triggerResponse(personaId)
  }

  const handleEndConversation = async () => {
    if (confirm('Are you sure you want to end this conversation?')) {
      await endConversation()
      navigate('/dashboard')
    }
  }

  const renderMessage = (message: Message) => {
    const persona = personas.find(p => p.id === message.persona_id)
    const isUser = message.role === 'user'
    const content = streamingContent[message.id] || message.content

    return (
      <div
        key={message.id}
        className={cn(
          'flex items-start space-x-3',
          isUser ? 'justify-end' : 'justify-start'
        )}
      >
        {!isUser && (
          <Avatar
            fallback={persona?.name || 'AI'}
            size="sm"
            className={persona ? '' : 'bg-gray-300'}
          />
        )}
        <div
          className={cn(
            'flex flex-col max-w-2xl',
            isUser && 'items-end'
          )}
        >
          <div className="flex items-center space-x-2 mb-1">
            {persona && (
              <>
                <span className="text-sm font-medium">{persona.name}</span>
                <ModelBadge provider={persona.provider} model={persona.model} />
              </>
            )}
            {isUser && (
              <span className="text-sm font-medium">You</span>
            )}
            <span className="text-xs text-gray-500">
              {formatRelativeTime(message.created_at)}
            </span>
          </div>
          <div
            className={cn(
              'rounded-lg px-4 py-2',
              isUser
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-900'
            )}
          >
            <p className="whitespace-pre-wrap">{content}</p>
          </div>
          {message.cost && (
            <span className="text-xs text-gray-500 mt-1">
              Cost: ${message.cost.toFixed(4)}
            </span>
          )}
        </div>
        {isUser && (
          <Avatar fallback="You" size="sm" className="bg-blue-600" />
        )}
      </div>
    )
  }

  if (!activeConversation && !isSetupOpen) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <Spinner size="lg" />
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="border-b pb-2">
          <div className="flex items-center justify-between px-4 py-2">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {activeConversation?.title || 'New Conversation'}
              </h1>
              {activeConversation?.topic && (
                <p className="text-sm text-gray-500">{activeConversation.topic}</p>
              )}
            </div>
            <div className="flex items-center space-x-2">
              {activeConversation && (
                <>
                  <CostDisplay cost={costBreakdown} />
                  <Badge variant={activeConversation.is_active ? 'success' : 'default'}>
                    {activeConversation.is_active ? 'Active' : 'Ended'}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAutoMode(!autoMode)}
                  >
                    {autoMode ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                    {activeConversation.mode === 'auto' ? 'Auto' : 'Manual'}
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={handleEndConversation}
                  >
                    End
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Mode Selector */}
        {activeConversation && (
          <ConversationModeSelector
            currentMode={conversationMode}
            onModeChange={setConversationMode}
            disabled={!activeConversation.is_active}
          />
        )}

        {/* Personas Bar */}
        {personas.length > 0 && (
          <div className="border-b pb-4 mb-4">
            <div className="flex items-center space-x-4 overflow-x-auto">
              <span className="text-sm font-medium text-gray-700">Personas:</span>
              {personas.map((persona) => (
                <div
                  key={persona.id}
                  className="flex items-center space-x-2 bg-gray-50 rounded-lg px-3 py-2"
                >
                  <Avatar fallback={persona.name} size="sm" />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{persona.name}</span>
                    <span className="text-xs text-gray-500">{persona.role}</span>
                  </div>
                  {activeConversation?.mode === 'manual' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleManualTrigger(persona.id)}
                    >
                      <Bot className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 mb-4">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-2 text-sm text-gray-500">
                Start the conversation by sending a message
              </p>
            </div>
          ) : (
            messages.map(renderMessage)
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        {activeConversation?.is_active && (
          <div className="border-t pt-4">
            <div className="flex items-end space-x-2">
              {activeConversation.mode === 'manual' && (
                <PersonaSelector
                  personas={personas}
                  selected={selectedPersona}
                  onSelect={setSelectedPersona}
                />
              )}
              <div className="flex-1">
                <Input
                  type="text"
                  placeholder="Type your message..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                />
              </div>
              <Button
                onClick={handleSendMessage}
                disabled={!input.trim() || loading}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
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
    </AppLayout>
  )
}