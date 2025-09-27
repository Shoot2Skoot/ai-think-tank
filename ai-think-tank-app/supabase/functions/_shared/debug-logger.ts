import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

export interface DebugLog {
  id?: string
  function_name: string
  conversation_id?: string
  persona_id?: string
  user_id?: string
  event_type: 'request' | 'response' | 'error' | 'internal'
  phase: string
  data: any
  metadata?: Record<string, any>
  timestamp: string
}

export class DebugLogger {
  private supabase: any
  private functionName: string
  private enabled: boolean

  constructor(functionName: string) {
    this.functionName = functionName
    this.enabled = Deno.env.get('DEBUG_MODE') === 'true'

    if (this.enabled) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      this.supabase = createClient(supabaseUrl, supabaseServiceKey)
    }
  }

  async log(
    eventType: DebugLog['event_type'],
    phase: string,
    data: any,
    metadata?: {
      conversationId?: string
      personaId?: string
      userId?: string
      [key: string]: any
    }
  ) {
    if (!this.enabled) return

    const logEntry: DebugLog = {
      function_name: this.functionName,
      conversation_id: metadata?.conversationId,
      persona_id: metadata?.personaId,
      user_id: metadata?.userId,
      event_type: eventType,
      phase,
      data: this.sanitizeData(data),
      metadata: metadata ? this.sanitizeData(metadata) : undefined,
      timestamp: new Date().toISOString()
    }

    // Log to console for immediate visibility
    console.log(`[${this.functionName}] ${eventType.toUpperCase()} - ${phase}:`, JSON.stringify(logEntry, null, 2))

    // Store in database for later analysis
    try {
      await this.supabase
        .from('debug_logs')
        .insert(logEntry)
    } catch (error) {
      console.error('Failed to save debug log:', error)
    }
  }

  private sanitizeData(data: any): any {
    if (!data) return data

    // Remove sensitive information
    const sanitized = JSON.parse(JSON.stringify(data))

    // Truncate long content
    if (typeof sanitized === 'string' && sanitized.length > 1000) {
      return sanitized.substring(0, 1000) + '... [truncated]'
    }

    if (typeof sanitized === 'object') {
      for (const key in sanitized) {
        if (key.toLowerCase().includes('key') || key.toLowerCase().includes('token')) {
          sanitized[key] = '[REDACTED]'
        } else if (typeof sanitized[key] === 'string' && sanitized[key].length > 1000) {
          sanitized[key] = sanitized[key].substring(0, 1000) + '... [truncated]'
        }
      }
    }

    return sanitized
  }
}