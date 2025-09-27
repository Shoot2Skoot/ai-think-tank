import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from '@supabase/supabase-js'
import { HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages'
import { z } from 'zod'
import { StructuredOutputParser } from '@langchain/core/output_parsers'
import { createLangChainProvider } from '../_shared/langchain-factory.ts'
import { Persona, Message, TurnOrchestration } from '../_shared/types.ts'
import { DebugLogger } from '../_shared/debug-logger.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Conversation types and modes
type ConversationType = 'general' | 'technical' | 'creative' | 'analytical' | 'educational'
type ConversationMode = 'debate' | 'ideation' | 'refinement' | 'planning' | 'discussion'

interface TurnFactors {
  relevance: number
  expertise: number
  participation_balance: number
  conversation_flow: number
}

interface NextSpeakerRequest {
  conversation_id: string
  recent_messages: Message[]
  personas: Persona[]
  conversation_mode: ConversationMode
  conversation_type: ConversationType
  userId?: string
}

interface NextSpeakerResponse {
  persona_id: string
  reasoning: string
  priority: number
  factors: TurnFactors
}

// TurnDecision schema for structured output
const TurnDecisionSchema = z.object({
  next_persona_id: z.string().describe('The ID of the next persona to speak'),
  reasoning: z.string().describe('Explanation of why this persona was chosen'),
  priority_score: z.number().min(0).max(1).describe('Overall priority score for this selection'),
  factors: z.object({
    relevance: z.number().min(0).max(1).describe('How relevant this persona is to the current topic'),
    expertise: z.number().min(0).max(1).describe('Level of expertise match for the discussion'),
    participation_balance: z.number().min(0).max(1).describe('Score for maintaining balanced participation'),
    conversation_flow: z.number().min(0).max(1).describe('How well this choice maintains conversation flow')
  })
})

const logger = new DebugLogger('determine-next-speaker')

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const request: NextSpeakerRequest = await req.json()

    // Log incoming request
    await logger.log('request', 'received', request, {
      conversationId: request.conversation_id,
      userId: request.userId
    })

    const {
      conversation_id,
      recent_messages = [],
      personas = [],
      conversation_mode = 'discussion',
      conversation_type = 'general',
      userId
    } = request

    // Validate required fields
    if (!conversation_id || !personas || personas.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: conversation_id and personas are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Calculate participation statistics
    const participationStats = calculateParticipationStats(recent_messages, personas)
    const currentSpeaker = recent_messages.length > 0 ? recent_messages[recent_messages.length - 1].persona_id : null

    // Create orchestration prompt with mode-specific instructions
    const personaDescriptions = personas.map(p => {
      const stats = participationStats[p.id]
      return `- ${p.display_name} (ID: ${p.id}): ${p.system_prompt || 'General AI assistant'}
        Last spoke: ${stats.lastSpokeIndex} messages ago, Total messages: ${stats.messageCount}, Participation: ${stats.participationRate.toFixed(2)}%`
    }).join('\n')

    const messageHistory = recent_messages.slice(-10).map(m => {
      const persona = personas.find(p => p.id === m.persona_id)
      return `${persona?.display_name || 'Unknown'}: ${m.content.slice(0, 150)}...`
    }).join('\n')

    const modeInstructions = getModeSpecificInstructions(conversation_mode)

    const systemPrompt = `You are an intelligent turn orchestrator for a multi-persona conversation system.

Conversation Type: ${conversation_type}
Conversation Mode: ${conversation_mode}
${modeInstructions}

Available Personas with Statistics:
${personaDescriptions}

Recent Conversation History (last 10 messages):
${messageHistory || 'No messages yet'}

Current Speaker: ${currentSpeaker ? personas.find(p => p.id === currentSpeaker)?.display_name : 'None'}

Turn Management Rules:
1. RELEVANCE: Prioritize personas whose expertise matches the current topic
2. BALANCE: Avoid letting any persona dominate (target 20-40% participation per persona)
3. FLOW: Maintain natural conversation patterns appropriate to the mode
4. CONTEXT: Consider the conversation type when selecting speakers
5. DIVERSITY: Encourage different perspectives, especially in debate/ideation modes

NEVER select the same speaker twice in a row unless absolutely necessary for conversation continuity.
Consider personas who haven't spoken recently to maintain engagement.`

    // Use lightweight model for efficient orchestration
    const orchestratorPersona: Persona = {
      id: 'orchestrator',
      name: 'orchestrator',
      display_name: 'Turn Orchestrator',
      provider: 'anthropic',
      model: 'claude-3-haiku-20240307',  // Using Haiku for speed and cost efficiency
      temperature: 0.3,  // Lower temperature for more consistent decisions
      max_tokens: 300,
      system_prompt: systemPrompt
    }

    const model = createLangChainProvider(orchestratorPersona)

    // Create structured output parser with new schema
    const parser = StructuredOutputParser.fromZodSchema(TurnDecisionSchema)
    const formatInstructions = parser.getFormatInstructions()

    const availablePersonaIds = personas.map(p => p.id)
    const prompt = `Analyze the conversation and determine the optimal next speaker.

Consider:
- Topic relevance and expertise match
- Participation balance (avoid dominance)
- Conversation flow and natural progression
- Mode-specific requirements (${conversation_mode})

${formatInstructions}

Available persona IDs: ${availablePersonaIds.join(', ')}
${currentSpeaker ? `Current speaker ID: ${currentSpeaker}` : ''}

Select the persona that will contribute most effectively while maintaining balanced participation.`

    const langchainMessages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(prompt)
    ]

    try {
      const startTime = Date.now()
      const response = await model.invoke(langchainMessages)
      const parsedResponse = await parser.parse(response.content as string)
      const responseTime = Date.now() - startTime

      // Validate the selected ID
      if (!availablePersonaIds.includes(parsedResponse.next_persona_id)) {
        // Fallback to least recent speaker if AI returns invalid ID
        parsedResponse.next_persona_id = selectLeastRecentSpeaker(participationStats, currentSpeaker, availablePersonaIds)
      }

      // Ensure response time requirement is met (<500ms)
      if (responseTime > 500) {
        console.warn(`Turn orchestration took ${responseTime}ms, exceeding 500ms target`)
      }

      const nextSpeakerResponse: NextSpeakerResponse = {
        persona_id: parsedResponse.next_persona_id,
        reasoning: parsedResponse.reasoning,
        priority: parsedResponse.priority_score,
        factors: {
          relevance: parsedResponse.factors.relevance,
          expertise: parsedResponse.factors.expertise,
          participation_balance: parsedResponse.factors.participation_balance,
          conversation_flow: parsedResponse.factors.conversation_flow
        }
      }

      return new Response(JSON.stringify(nextSpeakerResponse), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    } catch (parseError) {
      console.error('Error in AI orchestration, using fallback algorithm:', parseError)

      // Intelligent fallback based on participation stats
      const fallbackPersonaId = selectFallbackSpeaker(
        participationStats,
        currentSpeaker,
        availablePersonaIds,
        conversation_mode
      )

      const response: NextSpeakerResponse = {
        persona_id: fallbackPersonaId,
        reasoning: 'Selected using participation-based fallback algorithm',
        priority: 0.5,
        factors: {
          relevance: 0.5,
          expertise: 0.5,
          participation_balance: 0.7,
          conversation_flow: 0.5
        }
      }

      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }
  } catch (error) {
    console.error('Error in determine-next-speaker function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// Helper functions for turn orchestration

interface ParticipationStat {
  messageCount: number
  lastSpokeIndex: number
  participationRate: number
}

function calculateParticipationStats(messages: Message[], personas: Persona[]): Record<string, ParticipationStat> {
  const stats: Record<string, ParticipationStat> = {}
  const totalMessages = messages.length

  // Initialize stats for all personas
  personas.forEach(p => {
    stats[p.id] = {
      messageCount: 0,
      lastSpokeIndex: totalMessages, // Default to total messages if never spoke
      participationRate: 0
    }
  })

  // Calculate stats from message history
  messages.forEach((msg, index) => {
    if (stats[msg.persona_id]) {
      stats[msg.persona_id].messageCount++
      stats[msg.persona_id].lastSpokeIndex = totalMessages - index - 1
    }
  })

  // Calculate participation rates
  if (totalMessages > 0) {
    personas.forEach(p => {
      stats[p.id].participationRate = (stats[p.id].messageCount / totalMessages) * 100
    })
  }

  return stats
}

function getModeSpecificInstructions(mode: ConversationMode): string {
  const instructions: Record<ConversationMode, string> = {
    debate: `
DEBATE MODE - Structured argumentation:
- Alternate between supporting and opposing viewpoints
- Ensure each persona gets to respond to counterarguments
- Prioritize personas with contrasting perspectives
- Maintain point-counterpoint flow`,

    ideation: `
IDEATION MODE - Creative collaboration:
- Follow "Yes, and..." principle to build on ideas
- Rotate through all personas to gather diverse inputs
- Prioritize personas who haven't contributed recently
- Encourage building on the previous speaker's ideas`,

    refinement: `
REFINEMENT MODE - Constructive improvement:
- Focus on personas with relevant expertise
- Alternate between critique and solution proposals
- Ensure balanced feedback from different perspectives
- Prioritize detailed, thoughtful responses`,

    planning: `
PLANNING MODE - Task-oriented discussion:
- Prioritize personas with relevant domain expertise
- Follow logical task breakdown sequence
- Ensure practical perspectives are represented
- Maintain focus on actionable outcomes`,

    discussion: `
DISCUSSION MODE - Natural conversation:
- Maintain organic conversation flow
- Balance participation naturally
- Allow for topic evolution
- Encourage diverse viewpoints`
  }

  return instructions[mode] || instructions.discussion
}

function selectLeastRecentSpeaker(
  stats: Record<string, ParticipationStat>,
  currentSpeaker: string | null,
  availableIds: string[]
): string {
  let maxLastSpoke = -1
  let selectedId = availableIds[0]

  availableIds.forEach(id => {
    if (id !== currentSpeaker && stats[id] && stats[id].lastSpokeIndex > maxLastSpoke) {
      maxLastSpoke = stats[id].lastSpokeIndex
      selectedId = id
    }
  })

  return selectedId
}

function selectFallbackSpeaker(
  stats: Record<string, ParticipationStat>,
  currentSpeaker: string | null,
  availableIds: string[],
  mode: ConversationMode
): string {
  // Filter out current speaker
  const candidates = availableIds.filter(id => id !== currentSpeaker)

  if (candidates.length === 0) {
    return availableIds[0] // Emergency fallback
  }

  // Sort by participation rate (ascending) and last spoke index (descending)
  candidates.sort((a, b) => {
    const statA = stats[a] || { participationRate: 0, lastSpokeIndex: 0 }
    const statB = stats[b] || { participationRate: 0, lastSpokeIndex: 0 }

    // For debate/ideation modes, heavily weight participation balance
    if (mode === 'debate' || mode === 'ideation') {
      if (Math.abs(statA.participationRate - statB.participationRate) > 5) {
        return statA.participationRate - statB.participationRate
      }
    }

    // Otherwise, prioritize who hasn't spoken recently
    return statB.lastSpokeIndex - statA.lastSpokeIndex
  })

  return candidates[0]
}