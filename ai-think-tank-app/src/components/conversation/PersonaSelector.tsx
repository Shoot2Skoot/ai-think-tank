import React, { useState } from 'react'
import { ChevronDown, User, Bot } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { getProviderColor, getExperienceColor } from '@/lib/utils'
import { getModelLabel } from '@/lib/models'
import { generateAvatarUrl } from '@/utils/avatar-generator'
import type { Persona } from '@/types'

interface PersonaSelectorProps {
  personas: Persona[]
  selected: string | null
  onSelect: (personaId: string | null) => void
}

export const PersonaSelector: React.FC<PersonaSelectorProps> = ({
  personas,
  selected,
  onSelect
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const selectedPersona = personas.find(p => p.id === selected)

  const handleSelect = (personaId: string | null) => {
    onSelect(personaId)
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="min-w-[200px] justify-between"
      >
        <div className="flex items-center space-x-2">
          {selectedPersona ? (
            <>
              <div
                className="w-6 h-6 rounded-full overflow-hidden flex items-center justify-center"
                style={{ backgroundColor: selectedPersona.color || '#6366f1' }}
              >
                <Avatar
                  generatedUrl={generateAvatarUrl(selectedPersona)}
                  fallback={selectedPersona.name}
                  size="xs"
                  className="bg-transparent"
                  style={{ transform: 'scale(0.8)' }}
                />
              </div>
              <span className="truncate">{selectedPersona.name}</span>
            </>
          ) : (
            <>
              <User className="h-4 w-4" />
              <span>Speaking as yourself</span>
            </>
          )}
        </div>
        <ChevronDown className="h-4 w-4 ml-2" />
      </Button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute bottom-full left-0 mb-2 w-80 max-h-96 overflow-y-auto rounded-lg shadow-lg z-20 bg-surface-primary border border-surface-border">
            {/* Option to speak as yourself */}
            <div
              className={`p-3 hover:bg-primary-900 hover:bg-opacity-10 cursor-pointer border-b border-surface-divider ${
                !selected ? 'bg-primary-900 bg-opacity-20' : ''
              }`}
              onClick={() => handleSelect(null)}
            >
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-full bg-primary-900 bg-opacity-20 flex items-center justify-center">
                  <User className="h-5 w-5 text-text-secondary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Speak as yourself</p>
                  <p className="text-sm text-text-secondary">Your own perspective</p>
                </div>
                {!selected && (
                  <div className="text-primary-400">✓</div>
                )}
              </div>
            </div>

            {/* Persona options */}
            {personas.map((persona) => (
              <div
                key={persona.id}
                className={`p-3 hover:bg-primary-900 hover:bg-opacity-10 cursor-pointer border-b border-surface-divider last:border-0 ${
                  selected === persona.id ? 'bg-primary-900 bg-opacity-20' : ''
                }`}
                onClick={() => handleSelect(persona.id)}
              >
                <div className="flex items-start space-x-3">
                  <div
                    className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center"
                    style={{ backgroundColor: persona.color || '#6366f1' }}
                  >
                    <Avatar
                      generatedUrl={generateAvatarUrl(persona)}
                      fallback={persona.name}
                      size="sm"
                      className="bg-transparent"
                      style={{ transform: 'scale(0.8)' }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-text-primary">{persona.name}</p>
                    <p className="text-sm text-text-secondary">{persona.role}</p>
                    <div className="flex flex-col mt-1 space-y-1">
                      <div className="flex items-center space-x-2">
                        <Badge size="sm" className={getProviderColor(persona.provider)}>
                          {persona.provider}
                        </Badge>
                        <span className="text-xs font-medium text-text-secondary">
                          {getModelLabel(persona.provider, persona.model)}
                        </span>
                      </div>
                      {persona.experience_level && (
                        <span className={`text-xs ${getExperienceColor(persona.experience_level)}`}>
                          {persona.experience_level}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center mt-1 space-x-4 text-xs text-text-tertiary">
                      <span>{persona.message_count} messages</span>
                      <span>${persona.total_cost.toFixed(4)}</span>
                    </div>
                  </div>
                  {selected === persona.id && (
                    <div className="text-primary-400">✓</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}