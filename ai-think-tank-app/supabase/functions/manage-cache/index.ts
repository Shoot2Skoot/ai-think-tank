import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { CacheEntry, Persona, Message } from '../_shared/types.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// In-memory cache store (will reset on function cold start)
const cacheStore = new Map<string, CacheEntry>()

// Cache TTL in milliseconds (default: 15 minutes)
const DEFAULT_TTL = 15 * 60 * 1000

interface CacheRequest {
  action: 'get' | 'set' | 'delete' | 'clear' | 'stats'
  key?: string
  value?: any
  ttl?: number // TTL in milliseconds
  pattern?: string // For pattern-based operations
  userId?: string
  conversationId?: string
}

interface CacheResponse {
  success: boolean
  data?: any
  stats?: {
    size: number
    keys: string[]
    memoryUsage?: number
  }
  error?: string
}

function getCacheKey(components: { userId?: string; conversationId?: string; key?: string }): string {
  const parts = []
  if (components.userId) parts.push(`user:${components.userId}`)
  if (components.conversationId) parts.push(`conv:${components.conversationId}`)
  if (components.key) parts.push(components.key)
  return parts.join(':')
}

function cleanExpiredEntries() {
  const now = Date.now()
  for (const [key, entry] of cacheStore.entries()) {
    if (entry.expiresAt < now) {
      cacheStore.delete(key)
    }
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const request: CacheRequest = await req.json()
    const response: CacheResponse = { success: false }

    // Clean expired entries periodically
    cleanExpiredEntries()

    switch (request.action) {
      case 'get': {
        if (!request.key) {
          response.error = 'Key is required for get operation'
          break
        }

        const cacheKey = getCacheKey({
          userId: request.userId,
          conversationId: request.conversationId,
          key: request.key
        })

        const entry = cacheStore.get(cacheKey)

        if (entry) {
          // Check if entry is expired
          if (entry.expiresAt < Date.now()) {
            cacheStore.delete(cacheKey)
            response.success = false
            response.data = null
          } else {
            response.success = true
            response.data = entry.value
          }
        } else {
          // Try to fetch from database if it's conversation or persona data
          if (request.key.startsWith('persona:') || request.key.startsWith('conversation:')) {
            const supabaseUrl = Deno.env.get('SUPABASE_URL')!
            const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
            const supabase = createClient(supabaseUrl, supabaseServiceKey)

            if (request.key.startsWith('persona:')) {
              const personaId = request.key.replace('persona:', '')
              const { data: persona } = await supabase
                .from('personas')
                .select('*')
                .eq('id', personaId)
                .single()

              if (persona) {
                // Cache the fetched data
                const newEntry: CacheEntry = {
                  key: cacheKey,
                  value: persona,
                  ttl: DEFAULT_TTL,
                  expiresAt: Date.now() + DEFAULT_TTL
                }
                cacheStore.set(cacheKey, newEntry)
                response.success = true
                response.data = persona
              }
            } else if (request.key.startsWith('conversation:')) {
              const conversationId = request.key.replace('conversation:', '')
              const { data: messages } = await supabase
                .from('messages')
                .select('*')
                .eq('conversation_id', conversationId)
                .order('created_at', { ascending: true })
                .limit(50) // Cache last 50 messages

              if (messages) {
                // Cache the fetched data
                const newEntry: CacheEntry = {
                  key: cacheKey,
                  value: messages,
                  ttl: DEFAULT_TTL,
                  expiresAt: Date.now() + DEFAULT_TTL
                }
                cacheStore.set(cacheKey, newEntry)
                response.success = true
                response.data = messages
              }
            }
          } else {
            response.success = false
            response.data = null
          }
        }
        break
      }

      case 'set': {
        if (!request.key || request.value === undefined) {
          response.error = 'Key and value are required for set operation'
          break
        }

        const cacheKey = getCacheKey({
          userId: request.userId,
          conversationId: request.conversationId,
          key: request.key
        })

        const ttl = request.ttl || DEFAULT_TTL
        const entry: CacheEntry = {
          key: cacheKey,
          value: request.value,
          ttl,
          expiresAt: Date.now() + ttl
        }

        cacheStore.set(cacheKey, entry)
        response.success = true
        response.data = { key: cacheKey, ttl }
        break
      }

      case 'delete': {
        if (!request.key && !request.pattern) {
          response.error = 'Key or pattern is required for delete operation'
          break
        }

        if (request.pattern) {
          // Delete all keys matching pattern
          const pattern = getCacheKey({
            userId: request.userId,
            conversationId: request.conversationId,
            key: request.pattern
          })

          let deletedCount = 0
          for (const key of cacheStore.keys()) {
            if (key.includes(pattern) || key.startsWith(pattern.replace('*', ''))) {
              cacheStore.delete(key)
              deletedCount++
            }
          }

          response.success = true
          response.data = { deletedCount }
        } else if (request.key) {
          const cacheKey = getCacheKey({
            userId: request.userId,
            conversationId: request.conversationId,
            key: request.key
          })

          const deleted = cacheStore.delete(cacheKey)
          response.success = deleted
          response.data = { deleted }
        }
        break
      }

      case 'clear': {
        // Clear all cache entries for a user or conversation
        if (request.userId || request.conversationId) {
          const pattern = getCacheKey({
            userId: request.userId,
            conversationId: request.conversationId
          })

          let clearedCount = 0
          for (const key of cacheStore.keys()) {
            if (key.startsWith(pattern)) {
              cacheStore.delete(key)
              clearedCount++
            }
          }

          response.success = true
          response.data = { clearedCount }
        } else {
          // Clear entire cache
          const size = cacheStore.size
          cacheStore.clear()
          response.success = true
          response.data = { clearedCount: size }
        }
        break
      }

      case 'stats': {
        const keys = Array.from(cacheStore.keys())
        const stats = {
          size: cacheStore.size,
          keys: keys.slice(0, 100), // Limit keys in response
          memoryUsage: 0
        }

        // Rough memory estimation
        for (const entry of cacheStore.values()) {
          stats.memoryUsage += JSON.stringify(entry.value).length
        }

        response.success = true
        response.stats = stats
        break
      }

      default:
        response.error = `Unknown action: ${request.action}`
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: response.success ? 200 : 400,
    })
  } catch (error) {
    console.error('Error in manage-cache function:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})