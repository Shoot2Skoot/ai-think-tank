import React from 'react'
import { Avatar } from '@/components/ui/Avatar'
import type { Persona } from '@/types'

interface TypingIndicatorProps {
  typingPersonas: Persona[]
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ typingPersonas }) => {
  if (typingPersonas.length === 0) return null

  const getTypingText = () => {
    if (typingPersonas.length === 1) {
      return `${typingPersonas[0].name} is typing`
    } else if (typingPersonas.length === 2) {
      return `${typingPersonas[0].name} and ${typingPersonas[1].name} are typing`
    } else {
      return `${typingPersonas[0].name} and ${typingPersonas.length - 1} others are typing`
    }
  }

  return (
    <div className="px-4 py-2 flex items-center space-x-3">
      <div className="flex -space-x-2">
        {typingPersonas.slice(0, 3).map((persona) => (
          <Avatar
            key={persona.id}
            fallback={persona.name}
            size="xs"
            className="ring-2 ring-surface-primary animate-pulse"
          />
        ))}
      </div>
      <div className="flex items-center space-x-1">
        <span className="text-sm text-text-tertiary italic">{getTypingText()}</span>
        <div className="flex space-x-1">
          <div className="w-1.5 h-1.5 bg-text-tertiary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-1.5 h-1.5 bg-text-tertiary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-1.5 h-1.5 bg-text-tertiary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  )
}