import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import {
  StructuredAIResponse,
  StructuredChatRequest,
  StructuredChatResponse,
  STRUCTURED_OUTPUT_SCHEMA
} from '../_shared/structured-output-types.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// OpenAI with structured outputs using function calling
async function callOpenAIStructured(
  model: string,
  messages: any[],
  temperature: number,
  maxTokens: number,
  personaName: string
) {
  console.log('Calling OpenAI with structured output:', { model, personaName })
  const apiKey = Deno.env.get('OPENAI_API_KEY')!

  // Add instruction to identify as the persona
  const enhancedMessages = [
    ...messages,
    {
      role: 'system',
      content: `IMPORTANT: You are responding as "${personaName}". You must identify yourself as "${personaName}" in your response.`
    }
  ]

  const useNewParam = model.includes('gpt-4o') || model.includes('gpt-5')

  const requestBody: any = {
    model,
    messages: enhancedMessages,
    stream: false,
    response_format: { type: "json_object" },
    // Use function calling for structured output
    functions: [{
      name: "respond_as_persona",
      description: "Generate a response as a specific persona in the conversation",
      parameters: STRUCTURED_OUTPUT_SCHEMA
    }],
    function_call: { name: "respond_as_persona" }
  }

  // Handle temperature for different models
  if (!model.includes('gpt-5')) {
    requestBody.temperature = temperature
  }

  // Handle max tokens parameter
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
    console.error('OpenAI API Error:', errorBody)
    throw new Error(`OpenAI API error: ${response.statusText}`)
  }

  const data = await response.json()

  if (data.error) {
    throw new Error(`OpenAI API error: ${data.error.message}`)
  }

  // Extract structured output from function call
  let structuredResponse: StructuredAIResponse

  if (data.choices[0]?.message?.function_call) {
    try {
      structuredResponse = JSON.parse(data.choices[0].message.function_call.arguments)
      // Ensure speaker is set to persona name
      structuredResponse.speaker = personaName
    } catch (e) {
      console.error('Failed to parse structured response:', e)
      structuredResponse = {
        speaker: personaName,
        content: data.choices[0]?.message?.content || "I understand."
      }
    }
  } else {
    // Fallback if function calling fails
    structuredResponse = {
      speaker: personaName,
      content: data.choices[0]?.message?.content || "I understand."
    }
  }

  return {
    structuredResponse,
    content: structuredResponse.content,
    usage: {
      promptTokens: data.usage.prompt_tokens,
      completionTokens: data.usage.completion_tokens,
      totalTokens: data.usage.total_tokens,
      cachedTokens: data.usage?.prompt_tokens_cached || 0,
    },
  }
}

// Anthropic with structured outputs using tool use
async function callAnthropicStructured(
  model: string,
  messages: any[],
  temperature: number,
  maxTokens: number,
  personaName: string
) {
  console.log('Calling Anthropic with structured output:', { model, personaName })
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')!

  // Convert messages to Anthropic format
  const systemMessage = messages.find(m => m.role === 'system')?.content || ''
  const anthropicMessages = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    }))

  // Enhanced system message to identify as persona
  const enhancedSystem = `${systemMessage}\n\nIMPORTANT: You are responding as "${personaName}". You must identify yourself as "${personaName}" in your response.`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'tools-2024-05-16',
    },
    body: JSON.stringify({
      model,
      messages: anthropicMessages,
      system: enhancedSystem,
      temperature,
      max_tokens: maxTokens,
      tools: [{
        name: "respond_as_persona",
        description: "Generate a response as a specific persona in the conversation",
        input_schema: STRUCTURED_OUTPUT_SCHEMA
      }],
      tool_choice: { type: "tool", name: "respond_as_persona" }
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('Anthropic API Error:', error)
    throw new Error(`Anthropic API error: ${error}`)
  }

  const data = await response.json()

  if (data.error) {
    throw new Error(`Anthropic API error: ${data.error.message}`)
  }

  // Extract structured output from tool use
  let structuredResponse: StructuredAIResponse

  if (data.content && data.content[0]?.type === 'tool_use') {
    structuredResponse = data.content[0].input
    // Ensure speaker is set to persona name
    structuredResponse.speaker = personaName
  } else if (data.content && data.content[0]?.text) {
    // Fallback to regular text response
    structuredResponse = {
      speaker: personaName,
      content: data.content[0].text
    }
  } else {
    structuredResponse = {
      speaker: personaName,
      content: "I understand. Let me think about that."
    }
  }

  return {
    structuredResponse,
    content: structuredResponse.content,
    usage: {
      promptTokens: data.usage.input_tokens,
      completionTokens: data.usage.output_tokens,
      totalTokens: data.usage.input_tokens + data.usage.output_tokens,
      cachedTokens: data.usage?.cache_creation_input_tokens || 0,
    },
  }
}

// Gemini with structured outputs using response schema
async function callGeminiStructured(
  model: string,
  messages: any[],
  temperature: number,
  maxTokens: number,
  personaName: string
) {
  console.log('Calling Gemini with structured output:', { model, personaName })
  const apiKey = Deno.env.get('GEMINI_API_KEY')!

  // Add instruction to identify as persona
  const enhancedMessages = messages.map((m, idx) => {
    if (idx === 0 && m.role === 'system') {
      return {
        role: 'user',
        parts: [{
          text: `${m.content}\n\nIMPORTANT: You are responding as "${personaName}". You must identify yourself as "${personaName}" in your response.`
        }]
      }
    }
    return {
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }
  })

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: enhancedMessages,
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens,
          responseMimeType: "application/json",
          responseSchema: STRUCTURED_OUTPUT_SCHEMA
        },
      }),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    console.error('Gemini API Error:', error)
    throw new Error(`Gemini API error: ${error}`)
  }

  const data = await response.json()

  if (!data.candidates || data.candidates.length === 0) {
    throw new Error('Gemini API returned no candidates')
  }

  // Extract structured output
  let structuredResponse: StructuredAIResponse

  try {
    const responseText = data.candidates[0].content?.parts?.[0]?.text
    if (responseText) {
      structuredResponse = JSON.parse(responseText)
      // Ensure speaker is set to persona name
      structuredResponse.speaker = personaName
    } else {
      throw new Error('No text in response')
    }
  } catch (e) {
    console.error('Failed to parse Gemini structured response:', e)
    // Fallback
    structuredResponse = {
      speaker: personaName,
      content: data.candidates[0].content?.parts?.[0]?.text || "Let me approach this differently."
    }
  }

  // Estimate tokens for Gemini
  const promptTokens = Math.ceil(messages.reduce((acc, m) => acc + m.content.length, 0) / 4)
  const completionTokens = Math.ceil(structuredResponse.content.length / 4)

  return {
    structuredResponse,
    content: structuredResponse.content,
    usage: {
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
      cachedTokens: 0,
    },
  }
}

// Cost calculation (same as original)
function calculateCost(provider: string, model: string, usage: any): number {
  const pricing: Record<string, { input: number; output: number }> = {
    // OpenAI
    'openai:gpt-4-turbo-preview': { input: 10, output: 30 },
    'openai:gpt-4': { input: 30, output: 60 },
    'openai:gpt-3.5-turbo': { input: 0.5, output: 1.5 },
    'openai:gpt-4o': { input: 5, output: 15 },
    'openai:gpt-4o-mini': { input: 0.15, output: 0.6 },

    // Anthropic
    'anthropic:claude-3-opus-20240229': { input: 15, output: 75 },
    'anthropic:claude-3-sonnet-20240229': { input: 3, output: 15 },
    'anthropic:claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
    'anthropic:claude-3.5-sonnet-20240620': { input: 3, output: 15 },

    // Gemini
    'gemini:gemini-pro': { input: 0.5, output: 1.5 },
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

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const request: StructuredChatRequest = await req.json()
    const {
      provider,
      model,
      messages,
      temperature = 0.7,
      maxTokens = 800,
      personaId,
      personaName,
      conversationId,
      userId,
      useStructuredOutput = true
    } = request

    // Validate required fields
    if (!provider || !model || !messages || !userId || !personaName) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields (including personaName)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Call the appropriate provider with structured output
    let result

    if (useStructuredOutput) {
      switch (provider) {
        case 'openai':
          result = await callOpenAIStructured(model, messages, temperature, maxTokens, personaName)
          break
        case 'anthropic':
          result = await callAnthropicStructured(model, messages, temperature, maxTokens, personaName)
          break
        case 'gemini':
          result = await callGeminiStructured(model, messages, temperature, maxTokens, personaName)
          break
        default:
          throw new Error(`Unknown provider: ${provider}`)
      }
    } else {
      // Fallback to original implementation if needed
      throw new Error('Non-structured output not implemented in this function')
    }

    // Calculate cost
    const cost = calculateCost(provider, model, result.usage)

    // Log usage if we have conversation context
    if (conversationId && personaId) {
      const { error: costError } = await supabase.from('cost_records').insert({
        user_id: userId,
        conversation_id: conversationId,
        persona_id: personaId,
        provider,
        model,
        input_tokens: result.usage.promptTokens,
        output_tokens: result.usage.completionTokens,
        cached_tokens: result.usage.cachedTokens || 0,
        total_cost: cost,
      })

      if (costError) {
        console.error('Error logging cost:', costError)
      }
    }

    // Prepare response
    const response: StructuredChatResponse = {
      structuredResponse: result.structuredResponse,
      content: result.content,
      usage: result.usage,
      cost,
      provider,
      model,
      personaId,
      personaName
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Error in ai-chat-structured function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})