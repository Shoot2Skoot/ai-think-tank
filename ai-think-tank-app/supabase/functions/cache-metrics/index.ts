import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CacheMetricsRequest {
  userId?: string
  conversationId?: string
  dateRange?: {
    start: string
    end: string
  }
  groupBy?: 'hour' | 'day' | 'week' | 'month'
}

interface CacheMetricsSummary {
  totalHits: number
  totalMisses: number
  overallHitRate: number
  totalSavedCost: number
  totalConversations: number
  periodMetrics?: Array<{
    period: string
    hits: number
    misses: number
    hitRate: number
    savedCost: number
  }>
  providerBreakdown?: Array<{
    provider: string
    hits: number
    misses: number
    hitRate: number
    savedCost: number
  }>
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const request: CacheMetricsRequest = await req.json()
    const { userId, conversationId, dateRange, groupBy = 'day' } = request

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Build base query
    let query = supabase.from('cache_metrics').select('*')

    // Apply filters
    if (userId) {
      query = query.eq('user_id', userId)
    }
    if (conversationId) {
      query = query.eq('conversation_id', conversationId)
    }
    if (dateRange?.start) {
      query = query.gte('created_at', dateRange.start)
    }
    if (dateRange?.end) {
      query = query.lte('created_at', dateRange.end)
    }

    const { data: metrics, error: metricsError } = await query

    if (metricsError) {
      throw metricsError
    }

    // Calculate summary statistics
    const summary: CacheMetricsSummary = {
      totalHits: 0,
      totalMisses: 0,
      overallHitRate: 0,
      totalSavedCost: 0,
      totalConversations: 0,
    }

    if (metrics && metrics.length > 0) {
      // Calculate totals
      summary.totalHits = metrics.reduce((sum, m) => sum + m.hits, 0)
      summary.totalMisses = metrics.reduce((sum, m) => sum + m.misses, 0)
      summary.totalSavedCost = metrics.reduce((sum, m) => sum + parseFloat(m.saved_cost || 0), 0)
      summary.totalConversations = new Set(metrics.map(m => m.conversation_id)).size

      // Calculate overall hit rate
      const totalRequests = summary.totalHits + summary.totalMisses
      if (totalRequests > 0) {
        summary.overallHitRate = summary.totalHits / totalRequests
      }

      // Group metrics by time period if requested
      if (groupBy) {
        const periodMap = new Map<string, any>()

        metrics.forEach(metric => {
          const date = new Date(metric.created_at)
          let periodKey: string

          switch (groupBy) {
            case 'hour':
              periodKey = `${date.toISOString().slice(0, 13)}:00`
              break
            case 'day':
              periodKey = date.toISOString().slice(0, 10)
              break
            case 'week':
              const weekStart = new Date(date)
              weekStart.setDate(date.getDate() - date.getDay())
              periodKey = weekStart.toISOString().slice(0, 10)
              break
            case 'month':
              periodKey = date.toISOString().slice(0, 7)
              break
            default:
              periodKey = date.toISOString().slice(0, 10)
          }

          if (!periodMap.has(periodKey)) {
            periodMap.set(periodKey, {
              period: periodKey,
              hits: 0,
              misses: 0,
              savedCost: 0
            })
          }

          const period = periodMap.get(periodKey)
          period.hits += metric.hits
          period.misses += metric.misses
          period.savedCost += parseFloat(metric.saved_cost || 0)
        })

        // Calculate hit rate for each period
        summary.periodMetrics = Array.from(periodMap.values()).map(period => ({
          ...period,
          hitRate: period.hits / (period.hits + period.misses) || 0
        })).sort((a, b) => a.period.localeCompare(b.period))
      }
    }

    // Get provider breakdown if user is specified
    if (userId) {
      const { data: usageCosts } = await supabase
        .from('usage_costs')
        .select('provider, cached_tokens, input_tokens, cache_savings')
        .eq('user_id', userId)

      if (usageCosts && usageCosts.length > 0) {
        const providerMap = new Map<string, any>()

        usageCosts.forEach(cost => {
          if (!providerMap.has(cost.provider)) {
            providerMap.set(cost.provider, {
              provider: cost.provider,
              hits: 0,
              misses: 0,
              savedCost: 0,
              totalTokens: 0,
              cachedTokens: 0
            })
          }

          const provider = providerMap.get(cost.provider)
          provider.cachedTokens += cost.cached_tokens || 0
          provider.totalTokens += cost.input_tokens || 0
          provider.savedCost += parseFloat(cost.cache_savings || 0)

          // Estimate hits/misses based on cached tokens
          if (cost.cached_tokens > 0) {
            provider.hits += 1
          } else {
            provider.misses += 1
          }
        })

        summary.providerBreakdown = Array.from(providerMap.values()).map(provider => ({
          provider: provider.provider,
          hits: provider.hits,
          misses: provider.misses,
          hitRate: provider.hits / (provider.hits + provider.misses) || 0,
          savedCost: provider.savedCost
        }))
      }
    }

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Error in cache-metrics function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})