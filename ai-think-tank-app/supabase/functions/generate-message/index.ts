import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { HumanMessage, SystemMessage, AIMessage } from 'https://esm.sh/@langchain/core@0.1.52/messages'
import { StringOutputParser } from 'https://esm.sh/@langchain/core@0.1.52/output_parsers'
import { createLangChainProvider } from '../_shared/langchain-factory.ts'
import { calculateCost, checkUserBudget, estimateCostFromMessages, logCostToDatabase } from '../_shared/cost-calculator.ts'
import type { ChatRequest, ChatResponse, Persona, TokenUsage, CostRecord } from '../_shared/types.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GenerateMessageRequest extends ChatRequest {
  personaId: string
  conversationId: string
  userId: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const request: GenerateMessageRequest = await req.json()
    const {
      messages,
      personaId,
      conversationId,
      userId,
      stream = false
    } = request

    // Validate required fields
    if (!personaId || !conversationId || !userId || !messages) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get persona details
    const { data: persona, error: personaError } = await supabase
      .from('personas')
      .select('*')
      .eq('id', personaId)
      .single()

    if (personaError || !persona) {
      return new Response(
        JSON.stringify({ error: 'Persona not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const typedPersona: Persona = {
      id: persona.id,
      name: persona.name,
      display_name: persona.display_name,
      provider: persona.provider,
      model: persona.model,
      temperature: persona.temperature,
      max_tokens: persona.max_tokens,
      system_prompt: persona.system_prompt,
      avatar_color: persona.avatar_color,
      user_id: persona.user_id,
      is_global: persona.is_global
    }

    // Estimate cost and check budget
    const estimatedCost = estimateCostFromMessages(messages, typedPersona.provider, typedPersona.model)
    const budgetCheck = await checkUserBudget(userId, estimatedCost)

    if (!budgetCheck.allowed) {
      return new Response(
        JSON.stringify({ error: budgetCheck.reason || 'Budget limit exceeded' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create LangChain model with token tracking callback
    let tokenUsage: TokenUsage = {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      cachedTokens: 0
    }

    const callbacks = [{
      handleLLMEnd: async (output: any) => {
        // Extract token usage from the LLM response
        if (output?.llmOutput?.tokenUsage) {
          tokenUsage = {
            promptTokens: output.llmOutput.tokenUsage.promptTokens || 0,
            completionTokens: output.llmOutput.tokenUsage.completionTokens || 0,
            totalTokens: output.llmOutput.tokenUsage.totalTokens || 0,
            cachedTokens: output.llmOutput.tokenUsage.cachedTokens || 0
          }
        }
      }
    }]

    const model = createLangChainProvider(typedPersona, {
      streaming: stream,
      callbacks
    })

    // Convert messages to LangChain format
    const langchainMessages = messages.map(msg => {
      if (msg.role === 'system') {
        return new SystemMessage(msg.content)
      } else if (msg.role === 'assistant') {
        return new AIMessage(msg.content)
      } else {
        return new HumanMessage(msg.content)
      }
    })

    // Add persona system prompt if available and not already in messages
    if (typedPersona.system_prompt && !messages.some(m => m.role === 'system')) {
      langchainMessages.unshift(new SystemMessage(typedPersona.system_prompt))
    }

    // Generate response
    let responseContent = ''

    if (stream) {
      // For streaming responses, we need to handle differently
      const outputParser = new StringOutputParser()
      const chain = model.pipe(outputParser)

      // Create a TransformStream for streaming
      const { readable, writable } = new TransformStream()
      const writer = writable.getWriter()

      // Start streaming in background
      (async () => {
        try {
          const stream = await chain.stream(langchainMessages)
          for await (const chunk of stream) {
            responseContent += chunk
            await writer.write(new TextEncoder().encode(`data: ${JSON.stringify({ content: chunk })}\n\n`))
          }

          // Calculate final cost
          const cost = calculateCost(typedPersona.provider, typedPersona.model, tokenUsage)

          // Log usage
          const costRecord: CostRecord = {
            user_id: userId,
            conversation_id: conversationId,
            persona_id: personaId,
            provider: typedPersona.provider,
            model: typedPersona.model,
            input_tokens: tokenUsage.promptTokens,
            output_tokens: tokenUsage.completionTokens,
            cached_tokens: tokenUsage.cachedTokens || 0,
            input_cost: 0, // Will be calculated in logCostToDatabase
            output_cost: 0, // Will be calculated in logCostToDatabase
            total_cost: cost
          }

          await logCostToDatabase(costRecord)

          // Send final message with metadata
          await writer.write(new TextEncoder().encode(`data: ${JSON.stringify({
            done: true,
            usage: tokenUsage,
            cost
          })}\n\n`))

          await writer.close()
        } catch (error) {
          await writer.write(new TextEncoder().encode(`data: ${JSON.stringify({ error: error.message })}\n\n`))
          await writer.close()
        }
      })()

      return new Response(readable, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      })
    } else {
      // Non-streaming response
      const response = await model.invoke(langchainMessages)
      responseContent = response.content as string

      // Calculate cost
      const cost = calculateCost(typedPersona.provider, typedPersona.model, tokenUsage)

      // Log usage
      const costRecord: CostRecord = {
        user_id: userId,
        conversation_id: conversationId,
        persona_id: personaId,
        provider: typedPersona.provider,
        model: typedPersona.model,
        input_tokens: tokenUsage.promptTokens,
        output_tokens: tokenUsage.completionTokens,
        cached_tokens: tokenUsage.cachedTokens || 0,
        input_cost: 0, // Will be calculated in logCostToDatabase
        output_cost: 0, // Will be calculated in logCostToDatabase
        total_cost: cost
      }

      await logCostToDatabase(costRecord)

      // Prepare response
      const chatResponse: ChatResponse = {
        content: responseContent,
        usage: tokenUsage,
        cost,
        provider: typedPersona.provider,
        model: typedPersona.model,
        personaId: personaId
      }

      return new Response(JSON.stringify(chatResponse), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }
  } catch (error) {
    console.error('Error in generate-message function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})