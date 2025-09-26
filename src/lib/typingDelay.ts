// Realistic typing delays based on message characteristics

export interface TypingDelayConfig {
  baseWPM: number // Base words per minute
  variability: number // Random variability factor (0-1)
  thinkingTime: number // Base thinking time in ms
  complexityMultiplier: number // Multiplier for complex messages
}

// Different typing speeds for different persona types
export const TYPING_PROFILES = {
  fast: {
    baseWPM: 80,
    variability: 0.2,
    thinkingTime: 500,
    complexityMultiplier: 1.2
  },
  normal: {
    baseWPM: 60,
    variability: 0.3,
    thinkingTime: 1000,
    complexityMultiplier: 1.5
  },
  slow: {
    baseWPM: 40,
    variability: 0.4,
    thinkingTime: 1500,
    complexityMultiplier: 2.0
  },
  thoughtful: {
    baseWPM: 45,
    variability: 0.25,
    thinkingTime: 2000,
    complexityMultiplier: 1.8
  }
}

export function calculateTypingDelay(
  message: string,
  profile: TypingDelayConfig = TYPING_PROFILES.normal
): number {
  // Count words
  const words = message.trim().split(/\s+/).length

  // Base typing time
  const baseTime = (words / profile.baseWPM) * 60 * 1000 // Convert to ms

  // Add complexity for code blocks, lists, etc
  const hasCode = message.includes('```')
  const hasList = message.includes('- ') || message.includes('* ')
  const hasLinks = message.includes('http')

  let complexityFactor = 1
  if (hasCode) complexityFactor *= profile.complexityMultiplier
  if (hasList) complexityFactor *= 1.2
  if (hasLinks) complexityFactor *= 1.1

  // Add random variability
  const variability = 1 + (Math.random() - 0.5) * profile.variability

  // Calculate total delay
  const typingTime = baseTime * complexityFactor * variability
  const totalDelay = profile.thinkingTime + typingTime

  // Cap at reasonable limits
  return Math.min(Math.max(totalDelay, 1000), 30000) // Between 1-30 seconds
}

// Get typing profile based on persona characteristics
export function getTypingProfile(persona: any): TypingDelayConfig {
  // Determine based on persona attributes
  if (persona.experience_level === 'Mastery') {
    return TYPING_PROFILES.fast
  } else if (persona.experience_level === 'Entry') {
    return TYPING_PROFILES.slow
  } else if (persona.personality?.includes('thoughtful')) {
    return TYPING_PROFILES.thoughtful
  }

  return TYPING_PROFILES.normal
}

// Simulate realistic typing with pauses
export function* simulateTyping(
  message: string,
  profile: TypingDelayConfig = TYPING_PROFILES.normal
): Generator<{ text: string; delay: number }, void, unknown> {
  const sentences = message.match(/[^.!?]+[.!?]+/g) || [message]
  let accumulatedText = ''

  for (const sentence of sentences) {
    const words = sentence.trim().split(/\s+/)

    for (let i = 0; i < words.length; i++) {
      accumulatedText += (i === 0 && accumulatedText ? ' ' : '') + words[i]

      // Variable delay between words
      const wordDelay = (60 / profile.baseWPM) * 1000 * (1 + Math.random() * profile.variability)

      yield {
        text: accumulatedText,
        delay: wordDelay
      }

      // Add space after word (except last)
      if (i < words.length - 1) {
        accumulatedText += ' '
      }
    }

    // Longer pause after sentence
    if (sentence !== sentences[sentences.length - 1]) {
      yield {
        text: accumulatedText,
        delay: 300 + Math.random() * 200
      }
    }
  }
}