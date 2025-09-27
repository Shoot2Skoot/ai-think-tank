import { supabase } from '@/lib/supabase'
import { Provider, CostRecord, Message, Persona } from '@/types'
import { startOfDay, endOfDay, subDays, format, startOfMonth, endOfMonth } from 'date-fns'

export interface TokenStatistics {
  input_tokens: number
  output_tokens: number
  cached_tokens: number
  cache_write_tokens: number
  total_tokens: number
  input_cost: number
  output_cost: number
  cache_cost: number
  total_cost: number
}

export interface ModelStatistics {
  model: string
  provider: Provider
  usage_count: number
  total_tokens: number
  total_cost: number
  avg_cost_per_message: number
  token_efficiency: number // tokens per dollar
  input_tokens: number
  output_tokens: number
  cached_tokens: number
}

export interface PersonaStatistics {
  persona_id: string
  persona_name: string
  total_cost: number
  total_tokens: number
  message_count: number
  avg_tokens_per_message: number
  avg_cost_per_message: number
  model_usage: Record<string, number>
  last_used: string
}

export interface TimeSeriesData {
  date: string
  cost: number
  tokens: number
  messages: number
  cache_savings: number
}

export interface BudgetStatistics {
  tokens: TokenStatistics
  models: ModelStatistics[]
  personas: PersonaStatistics[]
  timeSeries: TimeSeriesData[]
  providers: Record<Provider, TokenStatistics>
  conversationStats: {
    total_conversations: number
    avg_cost_per_conversation: number
    avg_messages_per_conversation: number
    most_expensive_conversation: {
      id: string
      title: string
      cost: number
    }
  }
  cacheStats: {
    hit_rate: number
    total_saved: number
    cached_tokens: number
  }
}

export class BudgetStatisticsService {
  async getStatistics(
    userId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<BudgetStatistics> {
    const start = startDate || subDays(new Date(), 30)
    const end = endDate || new Date()

    // Fetch all cost records for the user within date range
    const { data: costRecords, error: costError } = await supabase
      .from('cost_records')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())
      .order('created_at', { ascending: true })

    if (costError) throw costError

    // Fetch messages with persona info
    const { data: messages, error: msgError } = await supabase
      .from('messages')
      .select(`
        *,
        personas!inner (
          id,
          name,
          model,
          provider
        )
      `)
      .eq('personas.conversation_id', userId)
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())

    if (msgError) throw msgError

    // Fetch conversation stats
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())

    if (convError) throw convError

    return this.aggregateStatistics(
      costRecords || [],
      messages || [],
      conversations || [],
      start,
      end
    )
  }

  private aggregateStatistics(
    costRecords: CostRecord[],
    messages: any[],
    conversations: any[],
    startDate: Date,
    endDate: Date
  ): BudgetStatistics {
    // Token statistics
    const tokens = this.calculateTokenStatistics(costRecords)

    // Model statistics
    const models = this.calculateModelStatistics(costRecords)

    // Persona statistics
    const personas = this.calculatePersonaStatistics(costRecords, messages)

    // Time series data
    const timeSeries = this.calculateTimeSeriesData(costRecords, startDate, endDate)

    // Provider breakdown
    const providers = this.calculateProviderStatistics(costRecords)

    // Conversation statistics
    const conversationStats = this.calculateConversationStatistics(conversations, costRecords)

    // Cache statistics
    const cacheStats = this.calculateCacheStatistics(costRecords)

    return {
      tokens,
      models,
      personas,
      timeSeries,
      providers,
      conversationStats,
      cacheStats
    }
  }

  private calculateTokenStatistics(records: CostRecord[]): TokenStatistics {
    return records.reduce((acc, record) => ({
      input_tokens: acc.input_tokens + record.input_tokens,
      output_tokens: acc.output_tokens + record.output_tokens,
      cached_tokens: acc.cached_tokens + record.cached_tokens,
      cache_write_tokens: acc.cache_write_tokens + record.cache_write_tokens,
      total_tokens: acc.total_tokens + record.input_tokens + record.output_tokens,
      input_cost: acc.input_cost + record.input_cost,
      output_cost: acc.output_cost + record.output_cost,
      cache_cost: acc.cache_cost + record.cache_cost,
      total_cost: acc.total_cost + record.total_cost
    }), {
      input_tokens: 0,
      output_tokens: 0,
      cached_tokens: 0,
      cache_write_tokens: 0,
      total_tokens: 0,
      input_cost: 0,
      output_cost: 0,
      cache_cost: 0,
      total_cost: 0
    })
  }

  private calculateModelStatistics(records: CostRecord[]): ModelStatistics[] {
    const modelMap = new Map<string, ModelStatistics>()

    records.forEach(record => {
      const key = `${record.provider}:${record.model}`
      const existing = modelMap.get(key) || {
        model: record.model,
        provider: record.provider,
        usage_count: 0,
        total_tokens: 0,
        total_cost: 0,
        avg_cost_per_message: 0,
        token_efficiency: 0,
        input_tokens: 0,
        output_tokens: 0,
        cached_tokens: 0
      }

      existing.usage_count++
      existing.total_tokens += record.input_tokens + record.output_tokens
      existing.total_cost += record.total_cost
      existing.input_tokens += record.input_tokens
      existing.output_tokens += record.output_tokens
      existing.cached_tokens += record.cached_tokens

      modelMap.set(key, existing)
    })

    return Array.from(modelMap.values()).map(stat => ({
      ...stat,
      avg_cost_per_message: stat.usage_count > 0 ? stat.total_cost / stat.usage_count : 0,
      token_efficiency: stat.total_cost > 0 ? stat.total_tokens / stat.total_cost : 0
    })).sort((a, b) => b.total_cost - a.total_cost)
  }

  private calculatePersonaStatistics(
    records: CostRecord[],
    messages: any[]
  ): PersonaStatistics[] {
    const personaMap = new Map<string, PersonaStatistics>()

    // Group by persona
    records.forEach(record => {
      if (!record.persona_id) return

      const existing = personaMap.get(record.persona_id) || {
        persona_id: record.persona_id,
        persona_name: '',
        total_cost: 0,
        total_tokens: 0,
        message_count: 0,
        avg_tokens_per_message: 0,
        avg_cost_per_message: 0,
        model_usage: {},
        last_used: record.created_at
      }

      existing.total_cost += record.total_cost
      existing.total_tokens += record.input_tokens + record.output_tokens
      existing.message_count++
      existing.model_usage[record.model] = (existing.model_usage[record.model] || 0) + 1
      existing.last_used = record.created_at > existing.last_used ? record.created_at : existing.last_used

      personaMap.set(record.persona_id, existing)
    })

    // Add persona names from messages
    messages.forEach(msg => {
      if (msg.persona_id && personaMap.has(msg.persona_id)) {
        const stat = personaMap.get(msg.persona_id)!
        stat.persona_name = msg.personas?.name || 'Unknown'
      }
    })

    return Array.from(personaMap.values()).map(stat => ({
      ...stat,
      avg_tokens_per_message: stat.message_count > 0 ? stat.total_tokens / stat.message_count : 0,
      avg_cost_per_message: stat.message_count > 0 ? stat.total_cost / stat.message_count : 0
    })).sort((a, b) => b.total_cost - a.total_cost)
  }

  private calculateTimeSeriesData(
    records: CostRecord[],
    startDate: Date,
    endDate: Date
  ): TimeSeriesData[] {
    const dayMap = new Map<string, TimeSeriesData>()

    // Initialize all days in range
    const current = new Date(startDate)
    while (current <= endDate) {
      const key = format(current, 'yyyy-MM-dd')
      dayMap.set(key, {
        date: key,
        cost: 0,
        tokens: 0,
        messages: 0,
        cache_savings: 0
      })
      current.setDate(current.getDate() + 1)
    }

    // Aggregate data by day
    records.forEach(record => {
      const key = format(new Date(record.created_at), 'yyyy-MM-dd')
      const day = dayMap.get(key)
      if (day) {
        day.cost += record.total_cost
        day.tokens += record.input_tokens + record.output_tokens
        day.messages++
        day.cache_savings += record.cache_cost
      }
    })

    return Array.from(dayMap.values())
  }

  private calculateProviderStatistics(
    records: CostRecord[]
  ): Record<Provider, TokenStatistics> {
    const providers: Record<Provider, TokenStatistics> = {
      openai: this.createEmptyTokenStats(),
      anthropic: this.createEmptyTokenStats(),
      gemini: this.createEmptyTokenStats()
    }

    records.forEach(record => {
      const stats = providers[record.provider]
      stats.input_tokens += record.input_tokens
      stats.output_tokens += record.output_tokens
      stats.cached_tokens += record.cached_tokens
      stats.cache_write_tokens += record.cache_write_tokens
      stats.total_tokens += record.input_tokens + record.output_tokens
      stats.input_cost += record.input_cost
      stats.output_cost += record.output_cost
      stats.cache_cost += record.cache_cost
      stats.total_cost += record.total_cost
    })

    return providers
  }

  private calculateConversationStatistics(
    conversations: any[],
    records: CostRecord[]
  ) {
    const convCosts = new Map<string, number>()

    records.forEach(record => {
      if (record.conversation_id) {
        const current = convCosts.get(record.conversation_id) || 0
        convCosts.set(record.conversation_id, current + record.total_cost)
      }
    })

    const costs = Array.from(convCosts.entries())
    const totalCost = costs.reduce((sum, [_, cost]) => sum + cost, 0)

    const mostExpensive = costs.sort((a, b) => b[1] - a[1])[0] || ['', 0]
    const mostExpensiveConv = conversations.find(c => c.id === mostExpensive[0])

    return {
      total_conversations: conversations.length,
      avg_cost_per_conversation: conversations.length > 0 ? totalCost / conversations.length : 0,
      avg_messages_per_conversation: conversations.reduce((sum, c) => sum + c.message_count, 0) / Math.max(1, conversations.length),
      most_expensive_conversation: {
        id: mostExpensive[0],
        title: mostExpensiveConv?.title || 'Unknown',
        cost: mostExpensive[1]
      }
    }
  }

  private calculateCacheStatistics(records: CostRecord[]) {
    const totalRequests = records.length
    const cachedRequests = records.filter(r => r.cached_tokens > 0).length
    const totalCacheSavings = records.reduce((sum, r) => sum + r.cache_cost, 0)
    const totalCachedTokens = records.reduce((sum, r) => sum + r.cached_tokens, 0)

    return {
      hit_rate: totalRequests > 0 ? (cachedRequests / totalRequests) * 100 : 0,
      total_saved: Math.abs(totalCacheSavings), // Cache costs are usually negative (savings)
      cached_tokens: totalCachedTokens
    }
  }

  private createEmptyTokenStats(): TokenStatistics {
    return {
      input_tokens: 0,
      output_tokens: 0,
      cached_tokens: 0,
      cache_write_tokens: 0,
      total_tokens: 0,
      input_cost: 0,
      output_cost: 0,
      cache_cost: 0,
      total_cost: 0
    }
  }

  async exportStatistics(statistics: BudgetStatistics, format: 'json' | 'csv'): Promise<string> {
    if (format === 'json') {
      return JSON.stringify(statistics, null, 2)
    }

    // CSV export
    const csvLines: string[] = []

    // Token statistics
    csvLines.push('Token Statistics')
    csvLines.push('Type,Count,Cost')
    csvLines.push(`Input Tokens,${statistics.tokens.input_tokens},${statistics.tokens.input_cost}`)
    csvLines.push(`Output Tokens,${statistics.tokens.output_tokens},${statistics.tokens.output_cost}`)
    csvLines.push(`Cached Tokens,${statistics.tokens.cached_tokens},${statistics.tokens.cache_cost}`)
    csvLines.push(`Total,${statistics.tokens.total_tokens},${statistics.tokens.total_cost}`)
    csvLines.push('')

    // Model statistics
    csvLines.push('Model Statistics')
    csvLines.push('Model,Provider,Usage Count,Total Tokens,Total Cost,Avg Cost/Message')
    statistics.models.forEach(model => {
      csvLines.push(`${model.model},${model.provider},${model.usage_count},${model.total_tokens},${model.total_cost},${model.avg_cost_per_message}`)
    })
    csvLines.push('')

    // Persona statistics
    csvLines.push('Persona Statistics')
    csvLines.push('Persona,Total Cost,Total Tokens,Messages,Avg Cost/Message')
    statistics.personas.forEach(persona => {
      csvLines.push(`${persona.persona_name},${persona.total_cost},${persona.total_tokens},${persona.message_count},${persona.avg_cost_per_message}`)
    })

    return csvLines.join('\n')
  }
}

export const budgetStatistics = new BudgetStatisticsService()