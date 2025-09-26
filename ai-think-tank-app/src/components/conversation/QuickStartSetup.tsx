import React, { useState, useEffect } from 'react'
import { Zap, MessageSquare, Users, DollarSign } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { useConversationTemplateStore } from '@/stores/conversation-template-store'
import { usePersonaStore } from '@/stores/persona-store'
import type { ConversationConfig, PersonaConfig } from '@/types'

interface QuickStartSetupProps {
  onStart: (config: ConversationConfig) => void
  loading?: boolean
}

export const QuickStartSetup: React.FC<QuickStartSetupProps> = ({ onStart, loading = false }) => {
  const { templates: conversationTemplates, loadTemplates: loadConversationTemplates } = useConversationTemplateStore()
  const { templates: personaTemplates, loadTemplates: loadPersonaTemplates } = usePersonaStore()
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [topic, setTopic] = useState('')

  useEffect(() => {
    loadConversationTemplates()
    loadPersonaTemplates()
  }, [loadConversationTemplates, loadPersonaTemplates])

  const handleQuickStart = () => {
    if (!selectedTemplate) return

    const template = conversationTemplates.find(t => t.id === selectedTemplate)
    if (!template) return

    // Get the personas for this template
    const personas: PersonaConfig[] = template.personas
      .map(personaId => {
        const personaTemplate = personaTemplates.find(p => p.id === personaId)
        if (!personaTemplate) return null

        return {
          template_id: personaTemplate.id,
          name: personaTemplate.name,
          role: personaTemplate.role,
          model: personaTemplate.default_model,
          provider: personaTemplate.default_provider,
          temperature: 0.7,
          max_tokens: 1000,
          system_prompt: personaTemplate.system_prompt,
          demographics: personaTemplate.demographics,
          background: personaTemplate.background,
          personality: personaTemplate.personality,
          experience_level: personaTemplate.experience_level,
          attitude: personaTemplate.attitude
        }
      })
      .filter((p): p is PersonaConfig => p !== null)

    const config: ConversationConfig = {
      title: template.name,
      topic: topic || template.initial_prompt || template.description || '',
      mode: 'auto',
      conversation_type: template.conversation_mode,
      speed: 5,
      personas
    }

    onStart(config)
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Zap className="h-5 w-5 mr-2 text-yellow-500" />
          Quick Start Templates
        </h3>
        <p className="text-sm text-text-secondary mb-4">
          Select a pre-configured conversation template to get started quickly
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {conversationTemplates.slice(0, 6).map((template) => (
          <Card
            key={template.id}
            className={`cursor-pointer transition-all hover:shadow-lg ${
              selectedTemplate === template.id
                ? 'ring-2 ring-primary-400 bg-primary-900 bg-opacity-20'
                : 'hover:bg-primary-900 hover:bg-opacity-10'
            }`}
            onClick={() => setSelectedTemplate(template.id)}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                {template.name}
                {template.category && (
                  <Badge size="sm" variant="secondary">
                    {template.category}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-text-secondary">{template.description}</p>

              <div className="flex items-center space-x-4 text-xs text-text-tertiary">
                <div className="flex items-center">
                  <Users className="h-3 w-3 mr-1" />
                  {template.personas.length} personas
                </div>
                <div className="flex items-center">
                  <MessageSquare className="h-3 w-3 mr-1" />
                  ~{template.estimated_messages} msgs
                </div>
                <div className="flex items-center">
                  <DollarSign className="h-3 w-3 mr-1" />
                  ~${template.estimated_cost.toFixed(2)}
                </div>
              </div>

              {selectedTemplate === template.id && (
                <div className="pt-3 border-t">
                  <div className="text-xs font-medium text-text-secondary mb-2">
                    Includes personas:
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {template.personas.slice(0, 3).map((personaId) => {
                      const persona = personaTemplates.find(p => p.id === personaId)
                      return persona ? (
                        <Badge key={personaId} size="sm" variant="outline">
                          {persona.name}
                        </Badge>
                      ) : null
                    })}
                    {template.personas.length > 3 && (
                      <Badge size="sm" variant="outline">
                        +{template.personas.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedTemplate && (
        <div className="space-y-4 p-4 bg-primary-900 bg-opacity-20 rounded-lg border border-primary-400">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Topic or Context (Optional)
            </label>
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Add specific context or modify the topic..."
              className="w-full"
            />
            <p className="text-xs text-text-tertiary mt-1">
              Customize the conversation topic or add specific context
            </p>
          </div>

          <Button
            onClick={handleQuickStart}
            disabled={!selectedTemplate || loading}
            className="w-full"
          >
            <Zap className="h-4 w-4 mr-2" />
            Start Conversation
          </Button>
        </div>
      )}
    </div>
  )
}