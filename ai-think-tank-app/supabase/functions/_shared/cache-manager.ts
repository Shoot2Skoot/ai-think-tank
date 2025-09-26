import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { Persona, CacheEntry } from './types.ts'

export interface CacheMetrics {
  hits: number
  misses: number
  hitRate: number
  totalCost: number
  savedCost: number
}

export interface CacheConfig {
  ttl: number // Time to live in seconds
  provider: 'openai' | 'anthropic' | 'gemini'
  cacheType: 'persona' | 'conversation' | 'system'
}

export class CacheManager {
  private supabase: SupabaseClient
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    hitRate: 0,
    totalCost: 0,
    savedCost: 0
  }

  constructor() {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    this.supabase = createClient(supabaseUrl, supabaseServiceKey)
  }

  // Get cache configuration based on content type
  getCacheConfig(contentType: 'persona' | 'conversation' | 'user'): number {
    switch (contentType) {
      case 'persona':
        return 3600 // 1 hour for persona definitions
      case 'conversation':
        return 300 // 5 minutes for conversation context
      case 'user':
        return 0 // Never cache user messages
      default:
        return 0
    }
  }

  // Generate cache key for content
  generateCacheKey(
    provider: string,
    model: string,
    contentType: string,
    contentHash: string
  ): string {
    return `${provider}:${model}:${contentType}:${contentHash}`
  }

  // Hash content for cache key generation
  async hashContent(content: string): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(content)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  // Store cache entry in database
  async set(key: string, value: any, ttl: number): Promise<void> {
    const expiresAt = Date.now() + (ttl * 1000)

    const { error } = await this.supabase
      .from('cache_entries')
      .upsert({
        key,
        value: JSON.stringify(value),
        ttl,
        expires_at: new Date(expiresAt).toISOString(),
        created_at: new Date().toISOString()
      })
      .eq('key', key)

    if (error) {
      console.error('Failed to store cache entry:', error)
    }
  }

  // Retrieve cache entry from database
  async get(key: string): Promise<any | null> {
    const { data, error } = await this.supabase
      .from('cache_entries')
      .select('value, expires_at')
      .eq('key', key)
      .single()

    if (error || !data) {
      this.metrics.misses++
      this.updateHitRate()
      return null
    }

    // Check if cache entry has expired
    const expiresAt = new Date(data.expires_at).getTime()
    if (expiresAt < Date.now()) {
      // Clean up expired entry
      await this.delete(key)
      this.metrics.misses++
      this.updateHitRate()
      return null
    }

    this.metrics.hits++
    this.updateHitRate()
    return JSON.parse(data.value)
  }

  // Delete cache entry
  async delete(key: string): Promise<void> {
    await this.supabase
      .from('cache_entries')
      .delete()
      .eq('key', key)
  }

  // Clean up expired cache entries
  async cleanupExpired(): Promise<void> {
    const now = new Date().toISOString()
    await this.supabase
      .from('cache_entries')
      .delete()
      .lt('expires_at', now)
  }

  // Update hit rate metric
  private updateHitRate(): void {
    const total = this.metrics.hits + this.metrics.misses
    if (total > 0) {
      this.metrics.hitRate = this.metrics.hits / total
    }
  }

  // Track cost savings from cache
  trackCostSaving(savedAmount: number): void {
    this.metrics.savedCost += savedAmount
  }

  // Get current cache metrics
  getMetrics(): CacheMetrics {
    return { ...this.metrics }
  }

  // Log cache metrics to database
  async logMetrics(conversationId: string, userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('cache_metrics')
      .insert({
        conversation_id: conversationId,
        user_id: userId,
        hits: this.metrics.hits,
        misses: this.metrics.misses,
        hit_rate: this.metrics.hitRate,
        saved_cost: this.metrics.savedCost,
        created_at: new Date().toISOString()
      })

    if (error) {
      console.error('Failed to log cache metrics:', error)
    }
  }
}

// Provider-specific cache implementations
export class AnthropicCacheManager {
  // Prepare messages with cache control for Anthropic
  static prepareCachedMessages(messages: any[], personaSystemPrompt?: string): any[] {
    const processedMessages = [...messages]

    // Add persona system prompt with cache control if available
    if (personaSystemPrompt && !messages.some(m => m.role === 'system')) {
      processedMessages.unshift({
        role: 'system',
        content: [
          {
            type: 'text',
            text: personaSystemPrompt,
            // Cache system prompt for 1 hour
            cache_control: { type: 'ephemeral' }
          }
        ]
      })
    }

    // Add cache control to long conversation context
    if (processedMessages.length > 5) {
      // Cache the first N messages as context (excluding the latest ones)
      const contextEndIndex = Math.max(1, processedMessages.length - 3)
      for (let i = 0; i < contextEndIndex; i++) {
        const message = processedMessages[i]
        if (typeof message.content === 'string' && message.content.length > 500) {
          // Convert to cache-enabled format
          processedMessages[i] = {
            ...message,
            content: [
              {
                type: 'text',
                text: message.content,
                cache_control: { type: 'ephemeral' }
              }
            ]
          }
        }
      }
    }

    return processedMessages
  }

  // Get Anthropic-specific headers for caching
  static getCacheHeaders(): Record<string, string> {
    return {
      'anthropic-beta': 'prompt-caching-2024-07-31'
    }
  }
}

export class GeminiCacheManager {
  private cacheManagerClient: any
  private fileManagerClient: any
  private cachedContents: Map<string, any> = new Map()

  constructor() {
    // Dynamic import to avoid Deno compilation issues
    this.initializeClients()
  }

  private async initializeClients() {
    try {
      const googleApiKey = Deno.env.get('GEMINI_API_KEY')
      if (!googleApiKey) {
        console.warn('GEMINI_API_KEY not configured, Gemini caching disabled')
        return
      }

      // Note: In production, you'd import these properly
      // For now, we'll handle this gracefully
      const { GoogleAICacheManager, GoogleAIFileManager } = await import('npm:@google/generative-ai@0.1.0/server')

      this.cacheManagerClient = new GoogleAICacheManager(googleApiKey)
      this.fileManagerClient = new GoogleAIFileManager(googleApiKey)
    } catch (error) {
      console.warn('Failed to initialize Gemini cache clients:', error)
    }
  }

  // Create cached content for Gemini
  async createCachedContent(
    model: string,
    systemInstruction: string,
    contentKey: string,
    ttlSeconds: number = 3600
  ): Promise<any> {
    if (!this.cacheManagerClient) {
      return null
    }

    try {
      // Check if we already have this cached
      const existing = this.cachedContents.get(contentKey)
      if (existing && existing.expiresAt > Date.now()) {
        return existing.cache
      }

      const cachedContent = await this.cacheManagerClient.create({
        model: `models/${model}`,
        displayName: `cache_${contentKey}`,
        systemInstruction,
        contents: [],
        ttlSeconds
      })

      // Store in memory with expiration
      this.cachedContents.set(contentKey, {
        cache: cachedContent,
        expiresAt: Date.now() + (ttlSeconds * 1000)
      })

      return cachedContent
    } catch (error) {
      console.error('Failed to create Gemini cached content:', error)
      return null
    }
  }

  // Get cached content reference for model invocation
  getCachedContentReference(contentKey: string): any | null {
    const cached = this.cachedContents.get(contentKey)
    if (cached && cached.expiresAt > Date.now()) {
      return cached.cache
    }
    return null
  }
}

export class OpenAICacheManager {
  private cache: CacheManager
  private memoryCache: Map<string, { value: any; expiresAt: number }> = new Map()

  constructor() {
    this.cache = new CacheManager()
    // Clean up expired entries every minute
    setInterval(() => this.cleanupMemoryCache(), 60000)
  }

  // Cache OpenAI responses at application level
  async getCachedOrGenerate(
    cacheKey: string,
    generateFn: () => Promise<any>,
    ttl: number = 300 // 5 minutes default
  ): Promise<any> {
    // Check memory cache first for performance
    const memCached = this.memoryCache.get(cacheKey)
    if (memCached && memCached.expiresAt > Date.now()) {
      return memCached.value
    }

    // Check persistent cache
    const cached = await this.cache.get(cacheKey)
    if (cached) {
      // Store in memory cache for faster access
      this.memoryCache.set(cacheKey, {
        value: cached,
        expiresAt: Date.now() + (ttl * 1000)
      })
      return cached
    }

    // Generate new response
    const response = await generateFn()

    // Store in both caches
    await this.cache.set(cacheKey, response, ttl)
    this.memoryCache.set(cacheKey, {
      value: response,
      expiresAt: Date.now() + (ttl * 1000)
    })

    return response
  }

  // Clean up expired entries from memory cache
  private cleanupMemoryCache(): void {
    const now = Date.now()
    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.expiresAt < now) {
        this.memoryCache.delete(key)
      }
    }
  }
}

// Export a unified cache factory
export function createProviderCache(provider: 'openai' | 'anthropic' | 'gemini') {
  switch (provider) {
    case 'anthropic':
      return new AnthropicCacheManager()
    case 'gemini':
      return new GeminiCacheManager()
    case 'openai':
      return new OpenAICacheManager()
    default:
      throw new Error(`Unknown provider for cache: ${provider}`)
  }
}