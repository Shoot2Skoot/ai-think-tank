import React, { useState, useEffect } from 'react'
import { useAIMentions } from '@/hooks/useAIMentions'
import { MessageList } from './MessageList'
import type { Message, Persona } from '@/types'

// Example component showing AI mention functionality
export const AIConversationExample: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([])
  const [nextSpeakerId, setNextSpeakerId] = useState<string | null>(null)

  // Example personas
  const personas: Persona[] = [
    {
      id: '1',
      conversation_id: 'test',
      template_id: 'alice',
      name: 'Alice',
      role: 'Frontend Developer',
      model: 'gpt-4',
      provider: 'openai',
      temperature: 0.7,
      max_tokens: 1000,
      system_prompt: 'You are a frontend developer.',
      experience_level: 'Senior',
      attitude: 'Excited'
    },
    {
      id: '2',
      conversation_id: 'test',
      template_id: 'bob',
      name: 'Bob',
      role: 'Backend Developer',
      model: 'claude-3',
      provider: 'anthropic',
      temperature: 0.7,
      max_tokens: 1000,
      system_prompt: 'You are a backend developer.',
      experience_level: 'Mastery',
      attitude: 'Neutral'
    },
    {
      id: '3',
      conversation_id: 'test',
      template_id: 'charlie',
      name: 'Charlie',
      role: 'UX Designer',
      model: 'gemini-pro',
      provider: 'gemini',
      temperature: 0.7,
      max_tokens: 1000,
      system_prompt: 'You are a UX designer.',
      experience_level: 'Entry',
      attitude: 'Intrigued'
    }
  ]

  const { processAIResponse, enhanceSystemPrompt } = useAIMentions({
    personas,
    onMentionDetected: (mentions, nextSpeaker) => {
      console.log('Mentions detected:', mentions)
      if (nextSpeaker) {
        setNextSpeakerId(nextSpeaker)
        console.log('Next speaker should be:', nextSpeaker)
      }
    }
  })

  // Simulate AI responses with mentions
  useEffect(() => {
    const exampleMessages: Message[] = [
      {
        id: '1',
        conversation_id: 'test',
        persona_id: '1',
        role: 'assistant',
        content: "I've been thinking about the new feature design. @Bob, what's your take on the API structure we need for this? And @Charlie, could you share your thoughts on the user flow?",
        created_at: new Date().toISOString(),
        token_count: 50,
        cost: 0.001
      },
      {
        id: '2',
        conversation_id: 'test',
        persona_id: '2',
        role: 'assistant',
        content: "Thanks for bringing me in, @Alice! For the API, I suggest we use a RESTful approach with these endpoints:\n- POST /api/features\n- GET /api/features/:id\n- PUT /api/features/:id\n\n@Charlie, we'll need to ensure the response format aligns with your UI requirements.",
        created_at: new Date(Date.now() + 60000).toISOString(),
        token_count: 75,
        cost: 0.0015
      },
      {
        id: '3',
        conversation_id: 'test',
        persona_id: '3',
        role: 'assistant',
        content: "Great points from both of you! @Alice, for the user flow, I'm envisioning a three-step process:\n1. Initial configuration\n2. Preview\n3. Confirmation\n\n@Bob, I'll need loading states for each API call. Can we discuss error handling patterns?",
        created_at: new Date(Date.now() + 120000).toISOString(),
        token_count: 65,
        cost: 0.0013
      }
    ]

    // Process each message for mentions
    const processedMessages = exampleMessages.map(msg => {
      const persona = personas.find(p => p.id === msg.persona_id)
      if (persona && msg.role === 'assistant') {
        const { formattedResponse } = processAIResponse(msg.content, persona)
        return { ...msg, content: formattedResponse }
      }
      return msg
    })

    setMessages(processedMessages)
  }, [processAIResponse])

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-primary-900 bg-opacity-20 border border-primary-400 rounded-lg p-4">
        <h2 className="text-lg font-semibold text-primary-400 mb-2">
          AI Mention System Demo
        </h2>
        <p className="text-sm text-primary-400">
          This example shows how AI personas can mention each other in conversations.
          The system processes @mentions, highlights them, and can determine who should speak next.
        </p>
        {nextSpeakerId && (
          <p className="text-sm text-primary-400 mt-2">
            Next speaker: {personas.find(p => p.id === nextSpeakerId)?.name}
          </p>
        )}
      </div>

      <div className="border rounded-lg bg-surface-primary shadow-sm">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Example Conversation with AI Mentions</h3>
        </div>
        <MessageList
          messages={messages}
          personas={personas}
          streamingContent={{}}
          loading={false}
        />
      </div>

      <div className="bg-opacity-10 bg-primary-900 rounded-lg p-4">
        <h4 className="font-medium text-text-secondary mb-2">How it works:</h4>
        <ul className="text-sm text-text-secondary space-y-1 list-disc list-inside">
          <li>AI personas can use @mentions to reference other participants</li>
          <li>Mentions are automatically highlighted in blue</li>
          <li>The system tracks who was mentioned and can route the conversation accordingly</li>
          <li>Enhanced system prompts teach AI models how to use mentions naturally</li>
          <li>Supports both direct @mentions and structured [MENTION:Name] format</li>
        </ul>
      </div>
    </div>
  )
}