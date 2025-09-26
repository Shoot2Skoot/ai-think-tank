import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from '@supabase/supabase-js'
import { HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages'
import { z } from 'zod'
import { StructuredOutputParser } from '@langchain/core/output_parsers'
import { createLangChainProvider } from '../_shared/langchain-factory.ts'
import { Persona, Message, TurnOrchestration } from '../_shared/types.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NextSpeakerRequest {
  conversationId: string
  currentSpeaker?: string
  availablePersonaIds: string[]
  recentMessages?: Message[]
  orchestrationMode?: 'round-robin' | 'intelligent' | 'random'
  userId: string
}

interface NextSpeakerResponse {
  nextSpeakerId: string
  reasoning?: string
  suggestedPrompt?: string
}

const NextSpeakerSchema = z.object({
  nextSpeakerId: z.string().describe('The ID of the next persona to speak'),
  reasoning: z.string().describe('Brief explanation of why this persona was chosen'),
  suggestedPrompt: z.string().optional().describe('Optional suggested prompt for the next message')
})

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const request: NextSpeakerRequest = await req.json()
    const {
      conversationId,
      currentSpeaker,
      availablePersonaIds,
      recentMessages = [],
      orchestrationMode = 'intelligent',
      userId
    } = request

    // Validate required fields
    if (!conversationId || !availablePersonaIds || availablePersonaIds.length === 0 || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Handle different orchestration modes
    if (orchestrationMode === 'random') {
      // Random selection
      const filteredIds = currentSpeaker
        ? availablePersonaIds.filter(id => id !== currentSpeaker)
        : availablePersonaIds

      const randomIndex = Math.floor(Math.random() * filteredIds.length)
      const nextSpeakerId = filteredIds[randomIndex] || availablePersonaIds[0]

      const response: NextSpeakerResponse = {
        nextSpeakerId,
        reasoning: 'Random selection'
      }

      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    if (orchestrationMode === 'round-robin') {
      // Round-robin selection
      let nextIndex = 0
      if (currentSpeaker) {
        const currentIndex = availablePersonaIds.indexOf(currentSpeaker)
        nextIndex = (currentIndex + 1) % availablePersonaIds.length
      }

      const nextSpeakerId = availablePersonaIds[nextIndex]

      const response: NextSpeakerResponse = {
        nextSpeakerId,
        reasoning: 'Round-robin selection'
      }

      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // Intelligent orchestration using AI
    // Get all available personas details
    const { data: personas, error: personaError } = await supabase
      .from('personas')
      .select('*')
      .in('id', availablePersonaIds)

    if (personaError || !personas || personas.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch personas' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get recent conversation history if not provided
    let messages = recentMessages
    if (messages.length === 0 && conversationId) {
      const { data: fetchedMessages } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(10)

      if (fetchedMessages) {
        messages = fetchedMessages.reverse()
      }
    }

    // Create orchestration prompt
    const personaDescriptions = personas.map(p =>
      `- ${p.display_name} (ID: ${p.id}): ${p.system_prompt || 'General AI assistant'}`
    ).join('\n')

    const messageHistory = messages.slice(-5).map(m => {
      const persona = personas.find(p => p.id === m.persona_id)
      return `${persona?.display_name || 'Unknown'}: ${m.content.slice(0, 100)}...`
    }).join('\n')

    const systemPrompt = `You are a conversation orchestrator. Your job is to determine which AI persona should speak next in a multi-persona conversation.

Available Personas:
${personaDescriptions}

Recent Conversation History:
${messageHistory || 'No messages yet'}

Current Speaker: ${currentSpeaker ? personas.find(p => p.id === currentSpeaker)?.display_name : 'None'}

Select the next speaker based on:
1. Who would contribute most meaningfully to the conversation
2. Ensuring balanced participation
3. Matching persona expertise to the topic
4. Natural conversation flow

Avoid selecting the same speaker twice in a row unless necessary.`

    // Use a simple model for orchestration to minimize costs
    const orchestratorPersona: Persona = {
      id: 'orchestrator',
      name: 'orchestrator',
      display_name: 'Orchestrator',
      provider: 'openai',
      model: 'gpt-3.5-turbo',
      temperature: 0.7,
      max_tokens: 200,
      system_prompt: systemPrompt
    }

    const model = createLangChainProvider(orchestratorPersona)

    // Create structured output parser
    const parser = StructuredOutputParser.fromZodSchema(NextSpeakerSchema)
    const formatInstructions = parser.getFormatInstructions()

    const prompt = `Based on the conversation context, determine the next speaker.
${formatInstructions}

Available persona IDs: ${availablePersonaIds.join(', ')}
${currentSpeaker ? `Current speaker ID: ${currentSpeaker}` : ''}`

    const langchainMessages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(prompt)
    ]

    try {
      const response = await model.invoke(langchainMessages)
      const parsedResponse = await parser.parse(response.content as string)

      // Validate the selected ID
      if (!availablePersonaIds.includes(parsedResponse.nextSpeakerId)) {
        // Fallback to first available persona if AI returns invalid ID
        parsedResponse.nextSpeakerId = availablePersonaIds.find(id => id !== currentSpeaker) || availablePersonaIds[0]
      }

      const nextSpeakerResponse: NextSpeakerResponse = {
        nextSpeakerId: parsedResponse.nextSpeakerId,
        reasoning: parsedResponse.reasoning,
        suggestedPrompt: parsedResponse.suggestedPrompt
      }

      return new Response(JSON.stringify(nextSpeakerResponse), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    } catch (parseError) {
      console.error('Error parsing AI response, falling back to round-robin:', parseError)

      // Fallback to round-robin if AI fails
      let nextIndex = 0
      if (currentSpeaker) {
        const currentIndex = availablePersonaIds.indexOf(currentSpeaker)
        nextIndex = (currentIndex + 1) % availablePersonaIds.length
      }

      const response: NextSpeakerResponse = {
        nextSpeakerId: availablePersonaIds[nextIndex],
        reasoning: 'Fallback to round-robin due to orchestration error'
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