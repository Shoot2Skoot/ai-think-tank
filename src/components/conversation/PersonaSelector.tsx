import React, { useState } from 'react'
import { ChevronDown, User, Bot } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { getProviderColor, getExperienceColor } from '@/lib/utils'
import { getModelLabel } from '@/lib/models'
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
              <Avatar fallback={selectedPersona.name} size="sm" />
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
          <div className="absolute bottom-full left-0 mb-2 w-80 max-h-96 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg z-20">
            {/* Option to speak as yourself */}
            <div
              className={`p-3 hover:bg-gray-50 cursor-pointer border-b ${
                !selected ? 'bg-blue-50' : ''
              }`}
              onClick={() => handleSelect(null)}
            >
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                  <User className="h-5 w-5 text-gray-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Speak as yourself</p>
                  <p className="text-sm text-gray-500">Your own perspective</p>
                </div>
                {!selected && (
                  <div className="text-blue-500">✓</div>
                )}
              </div>
            </div>

            {/* Persona options */}
            {personas.map((persona) => (
              <div
                key={persona.id}
                className={`p-3 hover:bg-gray-50 cursor-pointer border-b last:border-0 ${
                  selected === persona.id ? 'bg-blue-50' : ''
                }`}
                onClick={() => handleSelect(persona.id)}
              >
                <div className="flex items-start space-x-3">
                  <Avatar fallback={persona.name} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">{persona.name}</p>
                    <p className="text-sm text-gray-500">{persona.role}</p>
                    <div className="flex flex-col mt-1 space-y-1">
                      <div className="flex items-center space-x-2">
                        <Badge size="sm" className={getProviderColor(persona.provider)}>
                          {persona.provider}
                        </Badge>
                        <span className="text-xs font-medium text-gray-600">
                          {getModelLabel(persona.provider, persona.model)}
                        </span>
                      </div>
                      {persona.experience_level && (
                        <span className={`text-xs ${getExperienceColor(persona.experience_level)}`}>
                          {persona.experience_level}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center mt-1 space-x-4 text-xs text-gray-500">
                      <span>{persona.message_count} messages</span>
                      <span>${persona.total_cost.toFixed(4)}</span>
                    </div>
                  </div>
                  {selected === persona.id && (
                    <div className="text-blue-500">✓</div>
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