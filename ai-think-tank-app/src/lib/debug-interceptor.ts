import { supabase } from './supabase'

interface InterceptedRequest {
  url: string
  method: string
  headers: Record<string, string>
  body?: any
  timestamp: string
}

interface InterceptedResponse {
  status: number
  statusText: string
  headers: Record<string, string>
  body?: any
  duration: number
  timestamp: string
}

class DebugInterceptor {
  private enabled: boolean = false
  private requests: Map<string, InterceptedRequest> = new Map()

  enable() {
    this.enabled = true
    this.interceptFetch()
    this.interceptSupabase()
    console.log('🔍 Debug interceptor enabled')
  }

  disable() {
    this.enabled = false
    console.log('🔍 Debug interceptor disabled')
  }

  private interceptFetch() {
    const originalFetch = window.fetch

    window.fetch = async (...args) => {
      if (!this.enabled) {
        return originalFetch(...args)
      }

      const [input, init] = args
      const url = typeof input === 'string' ? input : input.url
      const method = init?.method || 'GET'
      const requestId = `${Date.now()}-${Math.random()}`
      const startTime = Date.now()

      // Log request
      const request: InterceptedRequest = {
        url,
        method,
        headers: init?.headers as Record<string, string> || {},
        body: init?.body ? this.parseBody(init.body) : undefined,
        timestamp: new Date().toISOString()
      }

      this.requests.set(requestId, request)

      // Log to console
      console.group(`🔄 ${method} ${url}`)
      console.log('Request:', request)

      try {
        // Make actual request
        const response = await originalFetch(...args)
        const duration = Date.now() - startTime

        // Clone response to read body
        const clonedResponse = response.clone()
        let responseBody: any

        try {
          const contentType = response.headers.get('content-type')
          if (contentType?.includes('application/json')) {
            responseBody = await clonedResponse.json()
          } else if (contentType?.includes('text')) {
            responseBody = await clonedResponse.text()
          }
        } catch {
          responseBody = 'Unable to parse response body'
        }

        // Log response
        const interceptedResponse: InterceptedResponse = {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: responseBody,
          duration,
          timestamp: new Date().toISOString()
        }

        // Log to console
        console.log(`Response (${duration}ms):`, interceptedResponse)
        console.groupEnd()

        // Store in database if it's an Edge Function call
        if (url.includes('/functions/v1/')) {
          this.logToDatabase(request, interceptedResponse, url)
        }

        return response
      } catch (error) {
        const duration = Date.now() - startTime
        console.error(`Error (${duration}ms):`, error)
        console.groupEnd()
        throw error
      }
    }
  }

  private interceptSupabase() {
    // Intercept Supabase function invocations
    const originalInvoke = supabase.functions.invoke

    supabase.functions.invoke = async function(...args) {
      if (!this.enabled) {
        return originalInvoke.apply(supabase.functions, args)
      }

      const [functionName, options] = args
      const startTime = Date.now()

      console.group(`🔷 Supabase Function: ${functionName}`)
      console.log('Request:', options?.body)

      try {
        const result = await originalInvoke.apply(supabase.functions, args)
        const duration = Date.now() - startTime

        console.log(`Response (${duration}ms):`, result)
        console.groupEnd()

        return result
      } catch (error) {
        const duration = Date.now() - startTime
        console.error(`Error (${duration}ms):`, error)
        console.groupEnd()
        throw error
      }
    }.bind(this)
  }

  private parseBody(body: any): any {
    if (typeof body === 'string') {
      try {
        return JSON.parse(body)
      } catch {
        return body
      }
    }
    if (body instanceof FormData) {
      return 'FormData'
    }
    if (body instanceof Blob) {
      return 'Blob'
    }
    return body
  }

  private async logToDatabase(
    request: InterceptedRequest,
    response: InterceptedResponse,
    url: string
  ) {
    try {
      // Extract function name from URL
      const functionMatch = url.match(/\/functions\/v1\/([^/?]+)/)
      const functionName = functionMatch ? functionMatch[1] : 'unknown'

      // Extract IDs from request body
      const conversationId = request.body?.conversationId || request.body?.conversation_id
      const personaId = request.body?.personaId || request.body?.persona_id
      const userId = request.body?.userId || request.body?.user_id

      await supabase.from('debug_logs').insert({
        function_name: `client-${functionName}`,
        conversation_id: conversationId,
        persona_id: personaId,
        user_id: userId,
        event_type: response.status >= 400 ? 'error' : 'response',
        phase: 'client-intercepted',
        data: {
          request,
          response: {
            ...response,
            body: response.body ?
              (typeof response.body === 'string' && response.body.length > 1000 ?
                response.body.substring(0, 1000) + '...[truncated]' :
                response.body) :
              undefined
          }
        },
        metadata: {
          duration: response.duration,
          status: response.status
        },
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      console.error('Failed to log to database:', error)
    }
  }
}

export const debugInterceptor = new DebugInterceptor()