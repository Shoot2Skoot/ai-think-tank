import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ChatRequest {
  provider: 'openai' | 'anthropic' | 'gemini'
  model: string
  messages: Array<{
    role: 'system' | 'user' | 'assistant'
    content: string
  }>
  temperature?: number
  maxTokens?: number
  personaId?: string
  conversationId?: string
  userId: string
  stream?: boolean
}

interface ChatResponse {
  content: string
  usage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
    cachedTokens?: number
  }
  cost: number
  provider: string
  model: string
  personaId?: string
}

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Provider-specific API handlers
async function callOpenAI(model: string, messages: any[], temperature: number, maxTokens: number, stream: boolean) {
  console.log('Calling OpenAI with:', { model, messageCount: messages.length, temperature, maxTokens })
  const apiKey = Deno.env.get('OPENAI_API_KEY')!

  // Use max_completion_tokens for newer models (gpt-4o-mini, gpt-5-mini, etc.)
  const useNewParam = model.includes('gpt-4o') || model.includes('gpt-5')

  const requestBody: any = {
    model,
    messages,
    stream: false, // Streaming not yet implemented
  }

  // Newer models (gpt-5-mini, etc.) only support default temperature (1.0)
  // Only add temperature parameter if it's not a restricted model or if it's the default value
  if (model.includes('gpt-5')) {
    // gpt-5 models only support temperature = 1 (the default)
    // Don't include temperature parameter to use default
  } else {
    // Other models support custom temperature
    requestBody.temperature = temperature
  }

  // Add the appropriate max tokens parameter based on model
  if (useNewParam) {
    requestBody.max_completion_tokens = maxTokens
  } else {
    requestBody.max_tokens = maxTokens
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    console.error('OpenAI API Error:', {
      status: response.status,
      statusText: response.statusText,
      body: errorBody,
      requestBody: requestBody
    })
    throw new Error(`OpenAI API error: ${response.statusText} - ${errorBody}`)
  }

  const data = await response.json()

  // Check for OpenAI errors
  if (data.error) {
    throw new Error(`OpenAI API error: ${data.error.message || JSON.stringify(data.error)}`)
  }

  if (!data.choices || data.choices.length === 0) {
    console.warn('OpenAI returned no choices, using fallback response', data)
    return {
      content: "I understand your point.",
      usage: {
        promptTokens: data.usage?.prompt_tokens || 100,
        completionTokens: 10,
        totalTokens: (data.usage?.total_tokens || 110),
        cachedTokens: 0,
      },
    }
  }

  if (!data.choices[0]?.message?.content) {
    console.warn('OpenAI choice missing content, using fallback', data.choices[0])
    return {
      content: "That's an interesting perspective.",
      usage: {
        promptTokens: data.usage?.prompt_tokens || 100,
        completionTokens: 10,
        totalTokens: (data.usage?.total_tokens || 110),
        cachedTokens: 0,
      },
    }
  }

  return {
    content: data.choices[0].message.content,
    usage: {
      promptTokens: data.usage.prompt_tokens,
      completionTokens: data.usage.completion_tokens,
      totalTokens: data.usage.total_tokens,
      cachedTokens: data.usage?.prompt_tokens_cached || 0,
    },
  }
}

async function callAnthropic(model: string, messages: any[], temperature: number, maxTokens: number, stream: boolean) {
  console.log('Calling Anthropic with:', { model, messageCount: messages.length, temperature, maxTokens })
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')!

  // Convert messages to Anthropic format
  const systemMessage = messages.find(m => m.role === 'system')?.content || ''
  const anthropicMessages = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    }))

  // Note: Streaming is not yet implemented, always use non-streaming for now
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'prompt-caching-2024-07-31',
    },
    body: JSON.stringify({
      model,
      messages: anthropicMessages,
      system: systemMessage,
      temperature,
      max_tokens: maxTokens,
      stream: false, // Always false for now - streaming requires SSE parsing
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('Anthropic API Error:', {
      status: response.status,
      statusText: response.statusText,
      body: error,
      requestBody: {
        model,
        messages: anthropicMessages,
        system: systemMessage,
        temperature,
        max_tokens: maxTokens
      }
    })
    throw new Error(`Anthropic API error: ${error}`)
  }

  const data = await response.json()

  // Check for Anthropic errors
  if (data.error) {
    throw new Error(`Anthropic API error: ${data.error.message || JSON.stringify(data.error)}`)
  }

  if (!data.content || data.content.length === 0) {
    console.warn('Anthropic returned empty content, using fallback response', data)
    return {
      content: "I understand. Let me think about that.",
      usage: {
        promptTokens: data.usage?.input_tokens || 100,
        completionTokens: 10,
        totalTokens: (data.usage?.input_tokens || 100) + 10,
        cachedTokens: data.usage?.cache_creation_input_tokens || 0,
      },
    }
  }

  // Check if the content has text
  if (!data.content[0]?.text) {
    console.warn('Anthropic content missing text, using fallback', data.content)
    return {
      content: "I see what you're saying.",
      usage: {
        promptTokens: data.usage?.input_tokens || 100,
        completionTokens: 10,
        totalTokens: (data.usage?.input_tokens || 100) + 10,
        cachedTokens: data.usage?.cache_creation_input_tokens || 0,
      },
    }
  }

  return {
    content: data.content[0].text,
    usage: {
      promptTokens: data.usage.input_tokens,
      completionTokens: data.usage.output_tokens,
      totalTokens: data.usage.input_tokens + data.usage.output_tokens,
      cachedTokens: data.usage?.cache_creation_input_tokens || 0,
    },
  }
}

async function callGemini(model: string, messages: any[], temperature: number, maxTokens: number, stream: boolean) {
  console.log('Calling Gemini with:', { model, messageCount: messages.length, temperature, maxTokens })
  const apiKey = Deno.env.get('GEMINI_API_KEY')!

  // Convert messages to Gemini format
  const geminiMessages = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: geminiMessages,
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens,
        },
      }),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    console.error('Gemini API Error:', {
      status: response.status,
      statusText: response.statusText,
      body: error,
      requestBody: {
        model,
        messages: geminiMessages,
        temperature,
        maxOutputTokens: maxTokens
      }
    })
    throw new Error(`Gemini API error: ${error}`)
  }

  const data = await response.json()

  // Check if Gemini returned valid candidates
  if (!data.candidates || data.candidates.length === 0) {
    console.error('Gemini API returned no candidates:', data)
    throw new Error(`Gemini API error: ${data.error?.message || 'No candidates returned'}`)
  }

  // Check if content exists in the response
  if (!data.candidates[0].content?.parts?.[0]?.text) {
    console.warn('Gemini response missing text, checking for safety ratings', data)

    // Check if content was filtered
    if (data.candidates[0].finishReason === 'SAFETY') {
      console.warn('Gemini filtered content for safety reasons')
      return {
        content: "I need to consider that more carefully.",
        usage: {
          promptTokens: Math.ceil(messages.reduce((acc, m) => acc + m.content.length, 0) / 4),
          completionTokens: 10,
          totalTokens: Math.ceil(messages.reduce((acc, m) => acc + m.content.length, 0) / 4) + 10,
          cachedTokens: 0,
        },
      }
    }

    console.error('Gemini API returned invalid response structure:', data)
    return {
      content: "Let me approach this differently.",
      usage: {
        promptTokens: Math.ceil(messages.reduce((acc, m) => acc + m.content.length, 0) / 4),
        completionTokens: 10,
        totalTokens: Math.ceil(messages.reduce((acc, m) => acc + m.content.length, 0) / 4) + 10,
        cachedTokens: 0,
      },
    }
  }

  // Estimate token usage for Gemini (it doesn't provide exact counts)
  const promptTokens = Math.ceil(messages.reduce((acc, m) => acc + m.content.length, 0) / 4)
  const completionTokens = Math.ceil(data.candidates[0].content.parts[0].text.length / 4)

  return {
    content: data.candidates[0].content.parts[0].text,
    usage: {
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
      cachedTokens: 0,
    },
  }
}

// Cost calculation based on provider and model
function calculateCost(provider: string, model: string, usage: any): number {
  const pricing: Record<string, { input: number; output: number }> = {
    // OpenAI
    'openai:gpt-4-turbo-preview': { input: 10, output: 30 },
    'openai:gpt-4': { input: 30, output: 60 },
    'openai:gpt-3.5-turbo': { input: 0.5, output: 1.5 },

    // Anthropic
    'anthropic:claude-3-opus-20240229': { input: 15, output: 75 },
    'anthropic:claude-3-sonnet-20240229': { input: 3, output: 15 },
    'anthropic:claude-3-haiku-20240307': { input: 0.25, output: 1.25 },

    // Gemini
    'gemini:gemini-pro': { input: 1.25, output: 10 },
    'gemini:gemini-1.5-pro': { input: 3.5, output: 10.5 },
    'gemini:gemini-1.5-flash': { input: 0.35, output: 1.05 },
  }

  const key = `${provider}:${model}`
  const rates = pricing[key] || { input: 1, output: 2 }

  const inputCost = (usage.promptTokens / 1_000_000) * rates.input
  const outputCost = (usage.completionTokens / 1_000_000) * rates.output

  // Apply cache discount if applicable
  let cacheDiscount = 0
  if (usage.cachedTokens > 0) {
    const cachedRate = rates.input * 0.1 // 90% discount for cached tokens
    const fullRate = rates.input
    cacheDiscount = (usage.cachedTokens / 1_000_000) * (fullRate - cachedRate)
  }

  return inputCost + outputCost - cacheDiscount
}

// Check user rate limits and budget
async function checkUserLimits(userId: string, estimatedCost: number): Promise<boolean> {
  // Get user's budget
  const { data: budget, error } = await supabase
    .from('user_budgets')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error || !budget) {
    console.error('Error fetching budget:', error)
    return true // Allow if no budget set
  }

  // Check if user has exceeded limits
  if (budget.auto_stop) {
    if (budget.current_daily_spend + estimatedCost > budget.daily_limit) {
      return false
    }
    if (budget.current_monthly_spend + estimatedCost > budget.monthly_limit) {
      return false
    }
  }

  return true
}

// Log usage to database
async function logUsage(
  userId: string,
  conversationId: string,
  personaId: string,
  provider: string,
  model: string,
  usage: any,
  cost: number
) {
  // Insert cost record
  const { error: costError } = await supabase.from('cost_records').insert({
    user_id: userId,
    conversation_id: conversationId,
    persona_id: personaId,
    provider,
    model,
    input_tokens: usage.promptTokens,
    output_tokens: usage.completionTokens,
    cached_tokens: usage.cachedTokens || 0,
    input_cost: (usage.promptTokens / 1_000_000) * getCostRate(provider, model, 'input'),
    output_cost: (usage.completionTokens / 1_000_000) * getCostRate(provider, model, 'output'),
    total_cost: cost,
  })

  if (costError) {
    console.error('Error logging cost:', costError)
  }

  // Update budget spending
  const { error: budgetError } = await supabase.rpc('increment_budget_spending', {
    p_user_id: userId,
    p_amount: cost,
  })

  if (budgetError) {
    console.error('Error updating budget:', budgetError)
  }
}

function getCostRate(provider: string, model: string, type: 'input' | 'output'): number {
  const pricing: Record<string, { input: number; output: number }> = {
    'openai:gpt-4-turbo-preview': { input: 10, output: 30 },
    'openai:gpt-4': { input: 30, output: 60 },
    'openai:gpt-3.5-turbo': { input: 0.5, output: 1.5 },
    'anthropic:claude-3-opus-20240229': { input: 15, output: 75 },
    'anthropic:claude-3-sonnet-20240229': { input: 3, output: 15 },
    'anthropic:claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
    'gemini:gemini-pro': { input: 1.25, output: 10 },
  }

  const key = `${provider}:${model}`
  const rates = pricing[key] || { input: 1, output: 2 }
  return rates[type]
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const request: ChatRequest = await req.json()
    const { provider, model, messages, temperature = 0.7, maxTokens = 1000, personaId, conversationId, userId, stream = false } = request

    // Validate required fields
    if (!provider || !model || !messages || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Estimate cost (rough estimate based on message length)
    const estimatedTokens = messages.reduce((acc, m) => acc + Math.ceil(m.content.length / 4), 0)
    const estimatedCost = (estimatedTokens / 1_000_000) * 10 // Rough estimate

    // Check user limits
    const canProceed = await checkUserLimits(userId, estimatedCost)
    if (!canProceed) {
      return new Response(
        JSON.stringify({ error: 'Budget limit exceeded' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Call the appropriate provider
    let result
    switch (provider) {
      case 'openai':
        result = await callOpenAI(model, messages, temperature, maxTokens, stream)
        break
      case 'anthropic':
        result = await callAnthropic(model, messages, temperature, maxTokens, stream)
        break
      case 'gemini':
        result = await callGemini(model, messages, temperature, maxTokens, stream)
        break
      default:
        throw new Error(`Unknown provider: ${provider}`)
    }

    // Calculate actual cost
    const cost = calculateCost(provider, model, result.usage)

    // Log usage if we have conversation context
    if (conversationId && personaId) {
      await logUsage(userId, conversationId, personaId, provider, model, result.usage, cost)
    }

    // Prepare response
    const response: ChatResponse = {
      content: result.content,
      usage: result.usage,
      cost,
      provider,
      model,
      personaId,
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Error in ai-chat function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})