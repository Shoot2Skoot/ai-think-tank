import React, { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Circle, Coffee, Music, Code, Sparkles, Brain, Heart, Star } from 'lucide-react'
import { personaAvatarMap } from '@/utils/persona-avatars'
import type { Persona, Message } from '@/types'

interface PersonaPresencePanelProps {
  personas: Persona[]
  messages: Message[]
  isCollapsed: boolean
  onToggleCollapse: () => void
}

interface PersonaStats {
  messageCount: number
  averageResponseTime: number
  lastActive: Date | null
  contributionPercentage: number
}

const funStatuses = [
  { icon: Coffee, text: 'Getting coffee', color: 'text-yellow-500' },
  { icon: Music, text: 'Listening to music', color: 'text-purple-500' },
  { icon: Code, text: 'Writing code', color: 'text-green-500' },
  { icon: Sparkles, text: 'Feeling inspired', color: 'text-pink-500' },
  { icon: Brain, text: 'Deep in thought', color: 'text-blue-500' },
  { icon: Heart, text: 'Spreading positivity', color: 'text-red-500' },
  { icon: Star, text: 'Being awesome', color: 'text-yellow-400' }
]

export const PersonaPresencePanel: React.FC<PersonaPresencePanelProps> = ({
  personas,
  messages,
  isCollapsed,
  onToggleCollapse
}) => {
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(null)
  const [personaStatuses] = useState<Record<string, typeof funStatuses[0]>>(() => {
    const statuses: Record<string, typeof funStatuses[0]> = {}
    personas.forEach(persona => {
      if (persona.id !== 'user') {
        statuses[persona.id] = funStatuses[Math.floor(Math.random() * funStatuses.length)]
      }
    })
    return statuses
  })

  const { onlinePersonas, offlinePersonas, personaStats } = useMemo(() => {
    const stats: Record<string, PersonaStats> = {}
    const totalMessages = messages.filter(m => m.persona_id !== 'user').length

    // Online personas are those in the current conversation
    const online = personas.filter(p => p.id !== 'user')

    // Offline personas are those available but not in the current conversation
    const currentPersonaNames = new Set(online.map(p => p.name))
    const offline = Object.keys(personaAvatarMap)
      .filter(name => !currentPersonaNames.has(name))
      .map(name => ({
        id: `offline-${name}`,
        name,
        avatar: personaAvatarMap[name],
        role: 'Available'
      }))

    online.forEach(persona => {
      const personaMessages = messages.filter(m => m.persona_id === persona.id)
      const messageCount = personaMessages.length

      const lastMessage = personaMessages[personaMessages.length - 1]
      const lastActive = lastMessage ? new Date(lastMessage.created_at) : null

      stats[persona.id] = {
        messageCount,
        averageResponseTime: Math.floor(Math.random() * 5) + 1,
        lastActive,
        contributionPercentage: totalMessages > 0 ? Math.round((messageCount / totalMessages) * 100) : 0
      }
    })

    return { onlinePersonas: online, offlinePersonas: offline, personaStats: stats }
  }, [personas, messages])

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const renderAvatar = (persona: Persona, size: 'small' | 'medium' = 'medium') => {
    const sizeClasses = size === 'small' ? 'w-8 h-8' : 'w-10 h-10'
    const textSize = size === 'small' ? 'text-xs' : 'text-sm'

    if (persona.avatar) {
      return (
        <div className={`${sizeClasses} rounded-full overflow-hidden`}>
          <img
            src={persona.avatar}
            alt={persona.name}
            className="w-full h-full object-cover"
          />
        </div>
      )
    }

    return (
      <div
        className={`${sizeClasses} rounded-full flex items-center justify-center text-white font-medium ${textSize}`}
        style={{ backgroundColor: persona.color || '#6366f1' }}
      >
        {getInitials(persona.name)}
      </div>
    )
  }


  const formatLastActive = (date: Date | null) => {
    if (!date) return 'Never'

    const now = new Date()
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

    if (diffMinutes < 1) return 'Just now'
    if (diffMinutes < 60) return `${diffMinutes}m ago`

    const diffHours = Math.floor(diffMinutes / 60)
    if (diffHours < 24) return `${diffHours}h ago`

    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays}d ago`
  }

  if (isCollapsed) {
    return (
      <div className="w-16 border-l flex flex-col items-center py-4" style={{
        backgroundColor: 'var(--color-surface-primary)',
        borderColor: 'var(--color-surface-border)'
      }}>
        <button
          onClick={onToggleCollapse}
          className="p-2 rounded-lg hover:bg-primary-100 hover:bg-opacity-10 mb-4"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="space-y-3">
          {/* Online personas */}
          {onlinePersonas.map(persona => {
            const stats = personaStats[persona.id]

            return (
              <div key={persona.id} className="relative group">
                <div className="relative">
                  <div
                    className="cursor-pointer hover:ring-2 hover:ring-primary-500 transition-all rounded-full"
                    onClick={() => setSelectedPersonaId(persona.id)}
                  >
                    {renderAvatar(persona, 'small')}
                  </div>
                  <Circle className="absolute bottom-0 right-0 w-2.5 h-2.5 fill-green-500 text-green-500" />
                  {stats && stats.messageCount > 0 && (
                    <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {stats.messageCount > 99 ? '99+' : stats.messageCount}
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {/* Separator if both exist */}
          {onlinePersonas.length > 0 && offlinePersonas.length > 0 && (
            <div className="border-t" style={{ borderColor: 'var(--color-surface-border)' }} />
          )}

          {/* Offline personas */}
          {offlinePersonas.slice(0, 5).map((persona: any) => (
            <div key={persona.id} className="relative group opacity-50">
              <div className="relative">
                <div className="w-8 h-8 rounded-full overflow-hidden opacity-60">
                  <img
                    src={persona.avatar}
                    alt={persona.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <Circle className="absolute bottom-0 right-0 w-2.5 h-2.5 fill-gray-400 text-gray-400" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="w-60 border-l flex flex-col" style={{
      backgroundColor: 'var(--color-surface-primary)',
      borderColor: 'var(--color-surface-border)'
    }}>
      <div className="flex items-center justify-between p-3 border-b" style={{ borderColor: 'var(--color-surface-border)' }}>
        <h3 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          Personas
        </h3>
        <button
          onClick={onToggleCollapse}
          className="p-2 rounded-lg hover:bg-primary-100 hover:bg-opacity-10"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Active Personas in Conversation */}
        {onlinePersonas.length > 0 && (
          <div>
            <div className="px-3 py-2 text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>
              Online — {onlinePersonas.length}
            </div>
            <div>
              {onlinePersonas.map((persona, index) => {
                const stats = personaStats[persona.id]
                const status = personaStatuses[persona.id]
                const StatusIcon = status?.icon || Coffee

                return (
                  <div
                    key={persona.id}
                    className={`px-3 py-2.5 flex items-center space-x-2 hover:bg-primary-900 hover:bg-opacity-10 cursor-pointer transition-colors ${
                      index < onlinePersonas.length - 1 ? 'border-b' : ''
                    }`}
                    style={{ borderColor: 'var(--color-surface-border)' }}
                    onClick={() => setSelectedPersonaId(persona.id === selectedPersonaId ? null : persona.id)}
                  >
                    <div className="relative">
                      {renderAvatar(persona, 'small')}
                      <Circle className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 fill-green-500 text-green-500" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm truncate" style={{ color: 'var(--color-text-primary)' }}>
                          {persona.name}
                        </span>
                        {stats && stats.messageCount > 0 && (
                          <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                            {stats.messageCount} msgs
                          </span>
                        )}
                      </div>

                      {status && (
                        <div className="flex items-center mt-0.5 space-x-1">
                          <StatusIcon className={`w-2.5 h-2.5 ${status.color}`} />
                          <span className="text-xs truncate" style={{ color: 'var(--color-text-secondary)' }}>
                            {status.text}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Offline/Available Personas */}
        {offlinePersonas.length > 0 && (
          <div className={onlinePersonas.length > 0 ? 'mt-4' : ''}>
            <div className="px-3 py-2 text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>
              Offline — {offlinePersonas.length}
            </div>
            <div>
              {offlinePersonas.map((persona: any, index) => (
                <div
                  key={persona.id}
                  className={`px-3 py-2 flex items-center space-x-2 hover:bg-primary-900 hover:bg-opacity-5 cursor-pointer transition-colors opacity-50 ${
                    index < offlinePersonas.length - 1 ? 'border-b' : ''
                  }`}
                  style={{ borderColor: 'var(--color-surface-border)' }}
                >
                  <div className="relative opacity-60">
                    <div className="w-8 h-8 rounded-full overflow-hidden">
                      <img
                        src={persona.avatar}
                        alt={persona.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <Circle className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 fill-gray-400 text-gray-400" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-sm truncate" style={{ color: 'var(--color-text-tertiary)' }}>
                      {persona.name}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {onlinePersonas.length === 0 && offlinePersonas.length === 0 && (
          <div className="p-4 text-center">
            <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
              No personas available
            </p>
          </div>
        )}
      </div>
    </div>
  )
}