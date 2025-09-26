import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from '@supabase/supabase-js'
import { HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages'
import { StringOutputParser } from '@langchain/core/output_parsers'
import { createLangChainProvider } from '../_shared/langchain-factory.ts'
import { calculateCost, checkUserBudget, estimateCostFromMessages, logCostToDatabase } from '../_shared/cost-calculator.ts'
import { ChatRequest, ChatResponse, Persona, TokenUsage, CostRecord } from '../_shared/types.ts'
import {
  CacheManager,
  AnthropicCacheManager,
  GeminiCacheManager,
  OpenAICacheManager
} from '../_shared/cache-manager.ts'

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

    // Initialize cache manager
    const cacheManager = new CacheManager()

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

        // Check for Anthropic cache usage in metadata
        if (output?.llmOutput?.usage?.cache_creation_input_tokens) {
          tokenUsage.cachedTokens = output.llmOutput.usage.cache_creation_input_tokens
        }
        if (output?.llmOutput?.usage?.cache_read_input_tokens) {
          tokenUsage.cachedTokens = (tokenUsage.cachedTokens || 0) + output.llmOutput.usage.cache_read_input_tokens
        }
      }
    }]

    // Prepare cached content for Gemini if applicable
    let geminiCachedContent = null
    if (typedPersona.provider === 'gemini' && typedPersona.system_prompt) {
      const geminiCache = new GeminiCacheManager()
      const cacheKey = await cacheManager.hashContent(
        `${typedPersona.id}:${typedPersona.system_prompt}`
      )
      geminiCachedContent = await geminiCache.createCachedContent(
        typedPersona.model,
        typedPersona.system_prompt,
        cacheKey,
        3600 // 1 hour TTL for persona definitions
      )
    }

    const model = createLangChainProvider(typedPersona, {
      streaming: stream,
      callbacks,
      enableCaching: true,
      cachedContent: geminiCachedContent
    })

    // Prepare messages based on provider
    let langchainMessages: any[]

    if (typedPersona.provider === 'anthropic') {
      // Use Anthropic cache manager to prepare messages with cache control
      const preparedMessages = AnthropicCacheManager.prepareCachedMessages(
        messages,
        typedPersona.system_prompt
      )
      langchainMessages = preparedMessages
    } else {
      // Convert messages to LangChain format for other providers
      langchainMessages = messages.map(msg => {
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
    }

    // Generate response (with caching for OpenAI)
    let responseContent = ''
    let actualCost = 0

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

          // Calculate final cost with cache savings
          const baseCost = calculateCost(typedPersona.provider, typedPersona.model, tokenUsage)

          let actualCost = baseCost
          if (tokenUsage.cachedTokens && tokenUsage.cachedTokens > 0) {
            const fullCost = calculateCost(typedPersona.provider, typedPersona.model, {
              ...tokenUsage,
              promptTokens: tokenUsage.promptTokens + tokenUsage.cachedTokens,
              cachedTokens: 0
            })
            const cacheSavings = fullCost - baseCost
            cacheManager.trackCostSaving(cacheSavings)
            actualCost = baseCost
          }

          const cost = actualCost

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

          // Log cache metrics
          await cacheManager.logMetrics(conversationId, userId)

          // Send final message with metadata including cache metrics
          await writer.write(new TextEncoder().encode(`data: ${JSON.stringify({
            done: true,
            usage: tokenUsage,
            cost,
            cacheMetrics: cacheManager.getMetrics()
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
      // Non-streaming response with OpenAI caching if applicable
      if (typedPersona.provider === 'openai') {
        const openaiCache = new OpenAICacheManager()
        const cacheKey = await cacheManager.hashContent(
          JSON.stringify({ messages: langchainMessages, model: typedPersona.model })
        )

        const response = await openaiCache.getCachedOrGenerate(
          cacheKey,
          async () => await model.invoke(langchainMessages),
          300 // 5 minutes TTL for conversation context
        )
        responseContent = response.content as string
      } else {
        const response = await model.invoke(langchainMessages)
        responseContent = response.content as string
      }

      // Calculate cost with cache savings
      const baseCost = calculateCost(typedPersona.provider, typedPersona.model, tokenUsage)

      // Calculate cache savings if applicable
      if (tokenUsage.cachedTokens && tokenUsage.cachedTokens > 0) {
        const fullCost = calculateCost(typedPersona.provider, typedPersona.model, {
          ...tokenUsage,
          promptTokens: tokenUsage.promptTokens + tokenUsage.cachedTokens,
          cachedTokens: 0
        })
        const cacheSavings = fullCost - baseCost
        cacheManager.trackCostSaving(cacheSavings)
        actualCost = baseCost
      } else {
        actualCost = baseCost
      }

      const cost = actualCost

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

      // Log cache metrics
      await cacheManager.logMetrics(conversationId, userId)

      // Prepare response with cache metrics
      const chatResponse: ChatResponse = {
        content: responseContent,
        usage: tokenUsage,
        cost,
        provider: typedPersona.provider,
        model: typedPersona.model,
        personaId: personaId,
        cacheMetrics: cacheManager.getMetrics()
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