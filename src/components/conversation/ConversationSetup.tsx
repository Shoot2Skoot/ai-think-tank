import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2, Settings, Users } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Slider } from '@/components/ui/Slider'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { Tabs } from '@/components/ui/Tabs'
import { useConversationStore } from '@/stores/conversation-store'
import { usePersonaStore, getAllPersonasForConversation } from '@/stores/persona-store'
import { useAuthStore } from '@/stores/auth-store'
import { getProviderColor, getExperienceColor, getAttitudeColor } from '@/lib/utils'
import type { ConversationConfig, PersonaConfig } from '@/types'

interface ConversationSetupProps {
  onComplete: (conversationId: string) => void
}

export const ConversationSetup: React.FC<ConversationSetupProps> = ({ onComplete }) => {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const createConversation = useConversationStore((state) => state.createConversation)
  const {
    templates,
    selectedTemplates,
    loadTemplates,
    selectTemplate,
    deselectTemplate,
    clearSelections
  } = usePersonaStore()

  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('templates')
  const [config, setConfig] = useState<ConversationConfig>({
    title: '',
    topic: '',
    mode: 'auto',
    conversation_type: 'planning', // Default to planning, but user can change dynamically
    speed: 5,
    personas: []
  })

  useEffect(() => {
    loadTemplates()
  }, [loadTemplates])

  useEffect(() => {
    // Update config with selected personas
    const personas = getAllPersonasForConversation(usePersonaStore.getState())
    setConfig(prev => ({ ...prev, personas }))
  }, [selectedTemplates])

  const handleCreateConversation = async () => {
    if (!user || !config.title || config.personas.length < 2) return

    setLoading(true)
    try {
      await createConversation(user.id, config)
      clearSelections()
      // The store will set activeConversation, which contains the ID
      const conversationId = useConversationStore.getState().activeConversation?.id
      if (conversationId) {
        onComplete(conversationId)
      }
    } catch (error) {
      console.error('Failed to create conversation:', error)
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
    {
      id: 'templates',
      label: 'Quick Start',
      content: (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Choose from pre-configured conversation templates with recommended personas
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.slice(0, 6).map((template) => (
              <Card
                key={template.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => {
                  // Pre-fill config from template
                  setConfig({
                    title: template.name,
                    topic: template.description || '',
                    mode: 'auto',
                    conversation_type: 'ideation',
                    speed: 5,
                    personas: []
                  })
                  // Select template personas
                  clearSelections()
                  templates
                    .filter(t => template.expertise_areas?.includes(t.name))
                    .forEach(t => selectTemplate(t))
                }}
              >
                <CardHeader>
                  <CardTitle className="text-base">{template.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-2">{template.role}</p>
                  <div className="flex items-center justify-between">
                    <Badge size="sm" className={getProviderColor(template.default_provider)}>
                      {template.default_provider}
                    </Badge>
                    {template.is_premium && (
                      <Badge variant="warning" size="sm">Premium</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )
    },
    {
      id: 'custom',
      label: 'Custom Setup',
      content: (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Conversation Title"
              placeholder="e.g., New Feature Planning"
              value={config.title}
              onChange={(e) => setConfig({ ...config, title: e.target.value })}
              required
            />
            <Input
              label="Topic (Optional)"
              placeholder="e.g., User authentication system"
              value={config.topic}
              onChange={(e) => setConfig({ ...config, topic: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Conversation Mode"
              value={config.mode}
              onChange={(e) => setConfig({ ...config, mode: e.target.value as 'auto' | 'manual' })}
              options={[
                { value: 'auto', label: 'Automatic (AI manages turns)' },
                { value: 'manual', label: 'Manual (You control who speaks)' }
              ]}
            />
            <Select
              label="Conversation Type"
              value={config.conversation_type}
              onChange={(e) => setConfig({ ...config, conversation_type: e.target.value as any })}
              options={[
                { value: 'debate', label: 'Debate' },
                { value: 'ideation', label: 'Ideation' },
                { value: 'refinement', label: 'Refinement' },
                { value: 'planning', label: 'Planning' }
              ]}
            />
          </div>

          <Slider
            label="Conversation Speed"
            min={1}
            max={10}
            value={config.speed}
            onChange={(e) => setConfig({ ...config, speed: parseInt(e.target.value) })}
            valueLabel={config.speed === 10 ? 'Instant' : config.speed === 1 ? 'Slowest' : `${config.speed}`}
          />

          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Select Personas (Choose at least 2)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
              {templates.map((template) => {
                const isSelected = selectedTemplates.some(t => t.id === template.id)
                return (
                  <div
                    key={template.id}
                    onClick={() => isSelected ? deselectTemplate(template.id) : selectTemplate(template)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <Avatar fallback={template.name} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {template.name}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {template.role}
                        </p>
                        <div className="flex items-center mt-1 space-x-2">
                          <Badge size="sm" className={getProviderColor(template.default_provider)}>
                            {template.default_provider}
                          </Badge>
                          {template.experience_level && (
                            <span className={`text-xs ${getExperienceColor(template.experience_level)}`}>
                              {template.experience_level}
                            </span>
                          )}
                        </div>
                      </div>
                      {isSelected && (
                        <div className="text-blue-500">✓</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )
    }
  ]

  return (
    <div className="space-y-6">
      <Tabs tabs={tabs} defaultTab="templates" onChange={setActiveTab} />

      {/* Selected Personas Summary */}
      {config.personas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Selected Personas ({config.personas.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {config.personas.map((persona, index) => (
                <Badge key={index} variant="default">
                  {persona.name} ({persona.provider})
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end space-x-2">
        <Button
          variant="outline"
          onClick={() => {
            clearSelections()
            navigate('/dashboard')
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleCreateConversation}
          loading={loading}
          disabled={!config.title || config.personas.length < 2}
        >
          <Users className="mr-2 h-4 w-4" />
          Start Conversation
        </Button>
      </div>

      {config.personas.length < 2 && (
        <p className="text-sm text-red-600 text-center">
          Please select at least 2 personas to start a conversation
        </p>
      )}
    </div>
  )
}