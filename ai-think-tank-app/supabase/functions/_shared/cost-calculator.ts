import { TokenUsage, ModelPricingMap, CostRecord } from './types.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

export function calculateCost(
  provider: string,
  model: string,
  usage: TokenUsage
): number {
  const key = `${provider}:${model}`
  const pricing = ModelPricingMap[key]

  if (!pricing) {
    console.warn(`No pricing found for ${key}, using default rates`)
    const defaultPricing = {
      inputPricePerMillion: 1,
      outputPricePerMillion: 2
    }

    const inputCost = (usage.promptTokens / 1_000_000) * defaultPricing.inputPricePerMillion
    const outputCost = (usage.completionTokens / 1_000_000) * defaultPricing.outputPricePerMillion
    return inputCost + outputCost
  }

  // Calculate base costs
  let inputCost = (usage.promptTokens / 1_000_000) * pricing.inputPricePerMillion
  const outputCost = (usage.completionTokens / 1_000_000) * pricing.outputPricePerMillion

  // Apply cache discount if applicable (mainly for Anthropic)
  if (usage.cachedTokens && usage.cachedTokens > 0 && pricing.cachedInputPricePerMillion) {
    const regularTokens = usage.promptTokens - usage.cachedTokens
    const regularCost = (regularTokens / 1_000_000) * pricing.inputPricePerMillion
    const cachedCost = (usage.cachedTokens / 1_000_000) * pricing.cachedInputPricePerMillion
    inputCost = regularCost + cachedCost
  }

  return inputCost + outputCost
}

export async function logCostToDatabase(
  costRecord: CostRecord
): Promise<void> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Insert cost record
  const { error: costError } = await supabase
    .from('cost_records')
    .insert(costRecord)

  if (costError) {
    console.error('Error logging cost:', costError)
    throw costError
  }

  // Update budget spending using RPC function
  const { error: budgetError } = await supabase.rpc('increment_budget_spending', {
    p_user_id: costRecord.user_id,
    p_amount: costRecord.total_cost,
  })

  if (budgetError) {
    console.error('Error updating budget:', budgetError)
    throw budgetError
  }
}

export async function checkUserBudget(
  userId: string,
  estimatedCost: number
): Promise<{ allowed: boolean; reason?: string }> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Get user's budget
  const { data: budget, error } = await supabase
    .from('user_budgets')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error || !budget) {
    console.error('Error fetching budget:', error)
    // Allow if no budget set
    return { allowed: true }
  }

  // Check if auto-stop is enabled
  if (!budget.auto_stop) {
    return { allowed: true }
  }

  // Check daily limit
  if (budget.current_daily_spend + estimatedCost > budget.daily_limit) {
    return {
      allowed: false,
      reason: `Daily budget limit of $${budget.daily_limit} would be exceeded`
    }
  }

  // Check monthly limit
  if (budget.current_monthly_spend + estimatedCost > budget.monthly_limit) {
    return {
      allowed: false,
      reason: `Monthly budget limit of $${budget.monthly_limit} would be exceeded`
    }
  }

  return { allowed: true }
}

export function estimateTokenCount(text: string): number {
  // Rough estimation: 1 token ≈ 4 characters
  return Math.ceil(text.length / 4)
}

export function estimateCostFromMessages(
  messages: Array<{ role: string; content: string }>,
  provider: string,
  model: string
): number {
  const totalTokens = messages.reduce((acc, msg) => {
    return acc + estimateTokenCount(msg.content)
  }, 0)

  const key = `${provider}:${model}`
  const pricing = ModelPricingMap[key]

  if (!pricing) {
    // Use conservative default estimate
    return (totalTokens / 1_000_000) * 10
  }

  // Estimate with some buffer for response tokens
  const inputTokens = totalTokens
  const estimatedOutputTokens = Math.min(inputTokens * 0.5, 2000) // Estimate output as 50% of input, max 2000

  const inputCost = (inputTokens / 1_000_000) * pricing.inputPricePerMillion
  const outputCost = (estimatedOutputTokens / 1_000_000) * pricing.outputPricePerMillion

  return inputCost + outputCost
}