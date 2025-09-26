import React, { useState, useMemo } from 'react'
import { X, ChevronLeft, ChevronRight, MessageCircle, Clock, TrendingUp, Coffee, Music, Code, Sparkles, Brain, Heart, Star } from 'lucide-react'
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

  const personaStats = useMemo(() => {
    const stats: Record<string, PersonaStats> = {}
    const totalMessages = messages.filter(m => m.persona_id !== 'user').length

    personas.forEach(persona => {
      if (persona.id === 'user') return

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

    return stats
  }, [personas, messages])

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getPresenceColor = (lastActive: Date | null) => {
    if (!lastActive) return 'bg-gray-400'

    const now = new Date()
    const diffMinutes = (now.getTime() - lastActive.getTime()) / (1000 * 60)

    if (diffMinutes < 5) return 'bg-green-500'
    if (diffMinutes < 30) return 'bg-yellow-500'
    return 'bg-gray-400'
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
          {personas.filter(p => p.id !== 'user').map(persona => {
            const stats = personaStats[persona.id]
            const presenceColor = getPresenceColor(stats?.lastActive || null)

            return (
              <div key={persona.id} className="relative group">
                <div className="relative">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-medium cursor-pointer hover:ring-2 hover:ring-primary-500 transition-all"
                    style={{ backgroundColor: persona.color || '#6366f1' }}
                    onClick={() => setSelectedPersonaId(persona.id)}
                  >
                    {getInitials(persona.name)}
                  </div>
                  <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${presenceColor}`} />
                  {stats && stats.messageCount > 0 && (
                    <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {stats.messageCount > 99 ? '99+' : stats.messageCount}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="w-80 border-l flex flex-col" style={{
      backgroundColor: 'var(--color-surface-primary)',
      borderColor: 'var(--color-surface-border)'
    }}>
      <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--color-surface-border)' }}>
        <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          Persona Presence
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
        <div className="p-4 space-y-4">
          {personas.filter(p => p.id !== 'user').map(persona => {
            const stats = personaStats[persona.id]
            const status = personaStatuses[persona.id]
            const presenceColor = getPresenceColor(stats?.lastActive || null)
            const StatusIcon = status?.icon || Coffee

            return (
              <div
                key={persona.id}
                className="p-3 rounded-lg border cursor-pointer hover:shadow-md transition-all"
                style={{
                  backgroundColor: 'var(--color-surface-secondary)',
                  borderColor: 'var(--color-surface-border)'
                }}
                onClick={() => setSelectedPersonaId(persona.id === selectedPersonaId ? null : persona.id)}
              >
                <div className="flex items-start space-x-3">
                  <div className="relative">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white font-medium"
                      style={{ backgroundColor: persona.color || '#6366f1' }}
                    >
                      {getInitials(persona.name)}
                    </div>
                    <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${presenceColor}`} />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                        {persona.name}
                      </h4>
                      {stats && stats.messageCount > 0 && (
                        <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                          {stats.messageCount}
                        </span>
                      )}
                    </div>

                    {status && (
                      <div className="flex items-center mt-1 space-x-1">
                        <StatusIcon className={`w-3 h-3 ${status.color}`} />
                        <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                          {status.text}
                        </span>
                      </div>
                    )}

                    <div className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
                      Active {formatLastActive(stats?.lastActive || null)}
                    </div>
                  </div>
                </div>

                {selectedPersonaId === persona.id && stats && (
                  <div className="mt-4 pt-4 border-t space-y-2" style={{ borderColor: 'var(--color-surface-border)' }}>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-2">
                        <MessageCircle className="w-4 h-4" style={{ color: 'var(--color-text-secondary)' }} />
                        <span style={{ color: 'var(--color-text-secondary)' }}>Messages</span>
                      </div>
                      <span style={{ color: 'var(--color-text-primary)' }}>{stats.messageCount}</span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4" style={{ color: 'var(--color-text-secondary)' }} />
                        <span style={{ color: 'var(--color-text-secondary)' }}>Avg Response</span>
                      </div>
                      <span style={{ color: 'var(--color-text-primary)' }}>{stats.averageResponseTime}s</span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-2">
                        <TrendingUp className="w-4 h-4" style={{ color: 'var(--color-text-secondary)' }} />
                        <span style={{ color: 'var(--color-text-secondary)' }}>Contribution</span>
                      </div>
                      <span style={{ color: 'var(--color-text-primary)' }}>{stats.contributionPercentage}%</span>
                    </div>

                    {persona.description && (
                      <div className="pt-2 mt-2 border-t" style={{ borderColor: 'var(--color-surface-border)' }}>
                        <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                          {persona.description}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}