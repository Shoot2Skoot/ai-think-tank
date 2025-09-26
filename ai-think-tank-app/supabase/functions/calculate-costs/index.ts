import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { calculateCost, estimateTokenCount, estimateCostFromMessages } from '../_shared/cost-calculator.ts'
import { TokenUsage, ModelPricingMap } from '../_shared/types.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CostCalculationRequest {
  // For actual cost calculation
  provider?: string
  model?: string
  usage?: TokenUsage

  // For cost estimation
  messages?: Array<{
    role: string
    content: string
  }>

  // For budget queries
  userId?: string
  conversationId?: string
  period?: 'daily' | 'monthly' | 'all-time'
}

interface CostCalculationResponse {
  // Actual or estimated cost
  cost?: number
  estimatedCost?: number

  // Token breakdown
  usage?: TokenUsage

  // Budget information
  budgetInfo?: {
    dailyLimit: number
    monthlyLimit: number
    currentDailySpend: number
    currentMonthlySpend: number
    remainingDaily: number
    remainingMonthly: number
  }

  // Historical costs
  historicalCosts?: Array<{
    date: string
    cost: number
    tokenCount: number
  }>

  // Available models and pricing
  pricingInfo?: typeof ModelPricingMap
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const request: CostCalculationRequest = await req.json()

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const response: CostCalculationResponse = {}

    // Calculate actual cost if usage is provided
    if (request.provider && request.model && request.usage) {
      const cost = calculateCost(request.provider, request.model, request.usage)
      response.cost = cost
      response.usage = request.usage
    }

    // Estimate cost from messages
    if (request.messages && request.provider && request.model) {
      const estimatedCost = estimateCostFromMessages(
        request.messages,
        request.provider,
        request.model
      )
      response.estimatedCost = estimatedCost

      // Estimate tokens
      const totalTokens = request.messages.reduce((acc, msg) => {
        return acc + estimateTokenCount(msg.content)
      }, 0)

      response.usage = {
        promptTokens: totalTokens,
        completionTokens: Math.min(totalTokens * 0.5, 2000), // Rough estimate
        totalTokens: totalTokens + Math.min(totalTokens * 0.5, 2000),
        cachedTokens: 0
      }
    }

    // Get budget information if userId is provided
    if (request.userId) {
      const { data: budget, error: budgetError } = await supabase
        .from('user_budgets')
        .select('*')
        .eq('user_id', request.userId)
        .single()

      if (budget && !budgetError) {
        response.budgetInfo = {
          dailyLimit: budget.daily_limit,
          monthlyLimit: budget.monthly_limit,
          currentDailySpend: budget.current_daily_spend,
          currentMonthlySpend: budget.current_monthly_spend,
          remainingDaily: Math.max(0, budget.daily_limit - budget.current_daily_spend),
          remainingMonthly: Math.max(0, budget.monthly_limit - budget.current_monthly_spend)
        }
      }

      // Get historical costs if requested
      if (request.period) {
        let query = supabase
          .from('cost_records')
          .select('created_at, total_cost, input_tokens, output_tokens')
          .eq('user_id', request.userId)

        // Filter by conversation if provided
        if (request.conversationId) {
          query = query.eq('conversation_id', request.conversationId)
        }

        // Filter by period
        const now = new Date()
        let startDate: Date

        switch (request.period) {
          case 'daily':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
            break
          case 'monthly':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1)
            break
          case 'all-time':
          default:
            startDate = new Date(0) // Beginning of time
        }

        query = query.gte('created_at', startDate.toISOString())
        query = query.order('created_at', { ascending: false })
        query = query.limit(100) // Limit to last 100 records

        const { data: costRecords, error: costError } = await query

        if (costRecords && !costError) {
          // Aggregate costs by day
          const aggregatedCosts = new Map<string, { cost: number; tokens: number }>()

          costRecords.forEach(record => {
            const date = new Date(record.created_at).toISOString().split('T')[0]
            const existing = aggregatedCosts.get(date) || { cost: 0, tokens: 0 }

            aggregatedCosts.set(date, {
              cost: existing.cost + record.total_cost,
              tokens: existing.tokens + record.input_tokens + record.output_tokens
            })
          })

          response.historicalCosts = Array.from(aggregatedCosts.entries())
            .map(([date, data]) => ({
              date,
              cost: data.cost,
              tokenCount: data.tokens
            }))
            .sort((a, b) => b.date.localeCompare(a.date))
        }
      }
    }

    // Include pricing information if requested (when no specific calculation is requested)
    if (!request.provider && !request.model && !request.usage && !request.messages) {
      response.pricingInfo = ModelPricingMap
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Error in calculate-costs function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})