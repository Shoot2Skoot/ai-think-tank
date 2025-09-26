import { useEffect } from 'react'
import { ReactionService } from '@/services/reaction-service'
import type { Message, Persona } from '@/types'

interface UseAIReactionsOptions {
  messages: Message[]
  personas: Persona[]
  enabled?: boolean
  conversationId?: string
}

// Keywords that trigger specific AI reactions
const REACTION_TRIGGERS = {
  // Positive sentiments
  'amazing': ['🤩', '⭐', '🎉'],
  'awesome': ['🎉', '👏', '🔥'],
  'great': ['👍', '💯', '✨'],
  'excellent': ['⭐', '🌟', '👌'],
  'perfect': ['💯', '✅', '🎯'],
  'brilliant': ['💡', '🧠', '✨'],
  'fantastic': ['🎊', '🎉', '🌟'],
  'wonderful': ['🌈', '💖', '✨'],

  // Love and appreciation
  'love': ['❤️', '💕', '🥰'],
  'thanks': ['🙏', '🤗', '👍'],
  'thank you': ['🙏', '😊', '💙'],
  'appreciate': ['🙏', '❤️', '🤝'],

  // Humor
  'haha': ['😂', '😄', '🤣'],
  'lol': ['😄', '😆', '😁'],
  'funny': ['😂', '🤭', '😆'],
  'hilarious': ['🤣', '😂', '💀'],

  // Questions and confusion
  'help': ['🤝', '💪', '🆘'],
  'question': ['❓', '🤔', '💭'],
  'confused': ['😕', '🤷', '❓'],
  'why': ['🤔', '🧐', '💭'],
  'how': ['🤓', '📚', '💡'],

  // Problems and solutions
  'error': ['❌', '🐛', '⚠️'],
  'bug': ['🐛', '🔍', '🔧'],
  'fixed': ['✅', '🎯', '💪'],
  'done': ['✔️', '🎉', '👏'],
  'completed': ['✅', '🏆', '🎊'],
  'solved': ['💡', '✨', '🎯'],

  // Ideas and thinking
  'idea': ['💡', '🌟', '🚀'],
  'think': ['🤔', '💭', '🧠'],
  'maybe': ['🤷', '🤔', '🎲'],
  'interesting': ['🤓', '📖', '👀'],

  // Agreement and disagreement
  'agree': ['👍', '✅', '💯'],
  'disagree': ['👎', '🤔', '❌'],
  'yes': ['✅', '👍', '💚'],
  'no': ['❌', '👎', '🛑'],

  // Emotions
  'sad': ['😢', '😔', '💔'],
  'happy': ['😊', '😄', '🎈'],
  'excited': ['🎉', '🤩', '🚀'],
  'worried': ['😟', '😰', '💭'],
  'angry': ['😤', '😠', '💢'],

  // Technical terms
  'deploy': ['🚀', '📦', '⚡'],
  'database': ['🗄️', '💾', '📊'],
  'code': ['💻', '⌨️', '🖥️'],
  'debug': ['🐛', '🔍', '🔧'],
  'test': ['🧪', '✅', '🔬'],
  'build': ['🏗️', '⚙️', '🔨'],
  'ship': ['🚢', '📦', '🚀']
}

/**
 * Hook to handle AI persona reactions to messages
 */
export function useAIReactions({
  messages,
  personas,
  enabled = true,
  conversationId
}: UseAIReactionsOptions) {

  useEffect(() => {
    if (!enabled || !conversationId || messages.length === 0) return

    const processAIReactions = async () => {
      // Get the latest message (if any)
      const latestMessage = messages[messages.length - 1]
      if (!latestMessage || latestMessage.role !== 'user') return

      // Don't react to very old messages (more than 30 seconds old)
      const messageAge = Date.now() - new Date(latestMessage.created_at).getTime()
      if (messageAge > 30000) return

      const content = latestMessage.content.toLowerCase()
      const activePersonas = personas.filter(p => p.message_count > 0)

      // Check for reaction triggers
      for (const [keyword, emojis] of Object.entries(REACTION_TRIGGERS)) {
        if (content.includes(keyword)) {
          // Select a random emoji from the options
          const emoji = emojis[Math.floor(Math.random() * emojis.length)]

          // Select a random AI persona to react (if any active)
          if (activePersonas.length > 0) {
            const persona = activePersonas[Math.floor(Math.random() * activePersonas.length)]

            // Add a small delay to make it feel more natural
            setTimeout(async () => {
              await ReactionService.addPersonaReaction(
                latestMessage.id,
                persona.id,
                emoji
              )
            }, Math.random() * 2000 + 500) // Random delay between 0.5-2.5 seconds
          }

          // Only react once per message
          break
        }
      }

      // Additional contextual reactions based on message patterns
      handleContextualReactions(latestMessage, activePersonas, content)
    }

    processAIReactions()
  }, [messages, personas, enabled, conversationId])
}

/**
 * Handle more complex contextual reactions
 */
async function handleContextualReactions(
  message: Message,
  personas: Persona[],
  content: string
) {
  // React to mentions
  for (const persona of personas) {
    if (content.includes(`@${persona.name.toLowerCase()}`)) {
      // The mentioned persona reacts
      setTimeout(async () => {
        const emojis = ['👋', '😊', '✨', '🙌']
        const emoji = emojis[Math.floor(Math.random() * emojis.length)]
        await ReactionService.addPersonaReaction(
          message.id,
          persona.id,
          emoji
        )
      }, Math.random() * 1500 + 300)
    }
  }

  // React to long messages (showing engagement)
  if (content.length > 500 && personas.length > 0) {
    const engagementEmojis = ['📖', '👀', '🤓', '💭', '📝']
    const persona = personas[Math.floor(Math.random() * personas.length)]
    const emoji = engagementEmojis[Math.floor(Math.random() * engagementEmojis.length)]

    setTimeout(async () => {
      await ReactionService.addPersonaReaction(
        message.id,
        persona.id,
        emoji
      )
    }, 2000)
  }

  // React to questions (showing thinking)
  if ((content.includes('?') || content.includes('how') || content.includes('what')) && personas.length > 0) {
    const thinkingEmojis = ['🤔', '💭', '🧐', '📚']
    const persona = personas[Math.floor(Math.random() * personas.length)]
    const emoji = thinkingEmojis[Math.floor(Math.random() * thinkingEmojis.length)]

    // Only react 30% of the time to questions to not be too noisy
    if (Math.random() < 0.3) {
      setTimeout(async () => {
        await ReactionService.addPersonaReaction(
          message.id,
          persona.id,
          emoji
        )
      }, Math.random() * 2000 + 1000)
    }
  }
}