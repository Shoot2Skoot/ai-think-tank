import { useEffect, useCallback } from 'react'
import { parseAIMentions, formatAIResponseWithMentions, MENTION_SYSTEM_PROMPT } from '@/lib/aiMentions'
import type { Persona, Message } from '@/types'

interface UseAIMentionsOptions {
  personas: Persona[]
  onMentionDetected?: (mentions: string[], nextSpeaker?: string) => void
}

export function useAIMentions({ personas, onMentionDetected }: UseAIMentionsOptions) {
  // Process AI response for mentions
  const processAIResponse = useCallback((response: string, respondingPersona: Persona) => {
    const { processedContent, mentions, nextSpeaker } = parseAIMentions(response, personas)

    // Format the response with proper @mentions
    const formattedResponse = formatAIResponseWithMentions(processedContent, mentions)

    // Notify about detected mentions
    if (onMentionDetected && mentions.length > 0) {
      onMentionDetected(mentions, nextSpeaker)
    }

    return {
      formattedResponse,
      mentions,
      nextSpeaker
    }
  }, [personas, onMentionDetected])

  // Enhance system prompt to include mention capability
  const enhanceSystemPrompt = useCallback((originalPrompt: string) => {
    const personaNames = personas.map(p => p.name).join(', ')
    return `${originalPrompt}

${MENTION_SYSTEM_PROMPT}

Available participants you can mention: ${personaNames}
`
  }, [personas])

  // Check if a message contains mentions to specific personas
  const getMessageMentions = useCallback((message: Message): string[] => {
    const mentions: string[] = []

    // Check for each persona name specifically
    personas.forEach(persona => {
      const escapedName = persona.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const regex = new RegExp(`@${escapedName}(?![A-Za-z])`, 'gi')
      if (regex.test(message.content)) {
        mentions.push(persona.name)
      }
    })

    return mentions
  }, [personas])

  // Determine if a persona should respond based on mentions
  const shouldPersonaRespond = useCallback((message: Message, persona: Persona): boolean => {
    const mentions = getMessageMentions(message)
    return mentions.some(name => name.toLowerCase() === persona.name.toLowerCase())
  }, [getMessageMentions])

  return {
    processAIResponse,
    enhanceSystemPrompt,
    getMessageMentions,
    shouldPersonaRespond
  }
}