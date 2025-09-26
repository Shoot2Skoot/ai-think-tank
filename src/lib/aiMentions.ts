// AI Mention Processing
// Allows AI personas to mention other personas in their responses

import type { Persona } from '@/types'

export interface MentionInstruction {
  type: 'mention'
  targetPersona: string
  reason?: string
}

// Parse AI response for mention directives
export function parseAIMentions(
  response: string,
  availablePersonas: Persona[]
): {
  processedContent: string
  mentions: string[]
  nextSpeaker?: string
} {
  const mentions: string[] = []
  let nextSpeaker: string | undefined

  // Pattern 1: Direct @mentions in text (e.g., "@Alice what do you think?")
  const mentionPattern = /@(\w+)/g
  let processedContent = response

  // Find all @mentions
  const matches = response.match(mentionPattern)
  if (matches) {
    matches.forEach(match => {
      const name = match.slice(1) // Remove @
      const persona = availablePersonas.find(
        p => p.name.toLowerCase() === name.toLowerCase()
      )
      if (persona) {
        mentions.push(persona.name)
        // If it's a question directed at someone, they should respond next
        if (response.includes(`${match}`) && response.includes('?')) {
          nextSpeaker = persona.id
        }
      }
    })
  }

  // Pattern 2: Structured mention directive (for advanced AI models)
  // Format: [MENTION:PersonaName:OptionalReason]
  const directivePattern = /\[MENTION:([^:]+)(?::([^\]]+))?\]/g
  processedContent = processedContent.replace(
    directivePattern,
    (match, personaName, reason) => {
      const persona = availablePersonas.find(
        p => p.name.toLowerCase() === personaName.toLowerCase()
      )
      if (persona) {
        mentions.push(persona.name)
        nextSpeaker = persona.id
        return `@${persona.name}`
      }
      return match
    }
  )

  return {
    processedContent,
    mentions: [...new Set(mentions)], // Remove duplicates
    nextSpeaker
  }
}

// Generate mention suggestions for AI based on conversation context
export function generateMentionSuggestions(
  conversationContext: string,
  currentPersona: Persona,
  availablePersonas: Persona[]
): MentionInstruction[] {
  const suggestions: MentionInstruction[] = []

  // Analyze conversation for opportunities to mention others
  const keywords = {
    expertise: ['expert', 'technical', 'specialized', 'professional'],
    disagreement: ['disagree', 'however', 'but', 'alternatively'],
    question: ['what do you think', 'your opinion', 'thoughts on'],
    introduction: ['let me bring in', 'I think', 'perhaps']
  }

  // Find personas with complementary expertise
  availablePersonas.forEach(persona => {
    if (persona.id === currentPersona.id) return

    // Check for expertise match
    if (
      keywords.expertise.some(kw => conversationContext.toLowerCase().includes(kw)) &&
      persona.experience_level === 'Mastery'
    ) {
      suggestions.push({
        type: 'mention',
        targetPersona: persona.name,
        reason: 'expertise'
      })
    }

    // Check for alternative viewpoints
    if (
      keywords.disagreement.some(kw => conversationContext.toLowerCase().includes(kw)) &&
      persona.attitude !== currentPersona.attitude
    ) {
      suggestions.push({
        type: 'mention',
        targetPersona: persona.name,
        reason: 'alternative viewpoint'
      })
    }
  })

  return suggestions
}

// Format AI response with proper mentions
export function formatAIResponseWithMentions(
  response: string,
  mentions: string[]
): string {
  let formatted = response

  // Ensure mentions are properly formatted
  mentions.forEach(name => {
    // Replace plain name references with @mentions
    const namePattern = new RegExp(`\\b${name}\\b`, 'gi')
    formatted = formatted.replace(namePattern, (match) => {
      // Don't double-mention
      if (formatted[formatted.indexOf(match) - 1] === '@') {
        return match
      }
      return `@${match}`
    })
  })

  return formatted
}

// System prompt addition for AI to use mentions
export const MENTION_SYSTEM_PROMPT = `
You can mention other participants in the conversation by using @PersonaName.
When you want to direct a question or comment to a specific persona, use their @mention.
Examples:
- "@Alice, what's your take on this approach?"
- "I agree with @Bob's point about scalability"
- "Let me ask @Charlie since they have experience with this"

You can also use structured mentions for clarity:
[MENTION:PersonaName:reason] will be converted to @PersonaName

Be natural with mentions - use them when it makes sense to involve or reference another participant.
`