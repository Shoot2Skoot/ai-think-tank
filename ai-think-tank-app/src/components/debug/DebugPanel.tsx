import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { ChevronRight, ChevronDown, Bug, X, Download, Trash2, Filter } from 'lucide-react'

interface DebugLog {
  id: string
  function_name: string
  conversation_id?: string
  persona_id?: string
  user_id?: string
  event_type: 'request' | 'response' | 'error' | 'internal'
  phase: string
  data: any
  metadata?: Record<string, any>
  timestamp: string
  conversation_title?: string
  persona_name?: string
}

export const DebugPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [logs, setLogs] = useState<DebugLog[]>([])
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState<{
    functionName?: string
    eventType?: string
    conversationId?: string
  }>({})
  const [autoScroll, setAutoScroll] = useState(true)
  const logsEndRef = useRef<HTMLDivElement>(null)

  // Subscribe to realtime debug logs
  useEffect(() => {
    if (!isOpen) return

    loadLogs()

    // Subscribe to new logs
    const subscription = supabase
      .channel('debug-logs')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'debug_logs' },
        (payload) => {
          setLogs(prev => [payload.new as DebugLog, ...prev].slice(0, 100)) // Keep last 100 logs
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [isOpen])

  // Auto-scroll to latest log
  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, autoScroll])

  const loadLogs = async () => {
    try {
      let query = supabase
        .from('debug_logs')
        .select(`
          *,
          conversations!conversation_id(title),
          personas!persona_id(name)
        `)
        .order('timestamp', { ascending: false })
        .limit(100)

      if (filter.functionName) {
        query = query.eq('function_name', filter.functionName)
      }
      if (filter.eventType) {
        query = query.eq('event_type', filter.eventType)
      }
      if (filter.conversationId) {
        query = query.eq('conversation_id', filter.conversationId)
      }

      const { data, error } = await query

      if (!error && data) {
        setLogs(data.map(log => ({
          ...log,
          conversation_title: log.conversations?.title,
          persona_name: log.personas?.name
        })))
      }
    } catch (error) {
      console.error('Failed to load debug logs:', error)
    }
  }

  const toggleLogExpansion = (logId: string) => {
    setExpandedLogs(prev => {
      const newSet = new Set(prev)
      if (newSet.has(logId)) {
        newSet.delete(logId)
      } else {
        newSet.add(logId)
      }
      return newSet
    })
  }

  const clearLogs = async () => {
    try {
      await supabase.from('debug_logs').delete().neq('id', '')
      setLogs([])
    } catch (error) {
      console.error('Failed to clear logs:', error)
    }
  }

  const exportLogs = () => {
    const dataStr = JSON.stringify(logs, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr)
    const exportFileDefaultName = `debug-logs-${new Date().toISOString()}.json`

    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
  }

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'error': return 'text-red-500 bg-red-50'
      case 'request': return 'text-blue-500 bg-blue-50'
      case 'response': return 'text-green-500 bg-green-50'
      case 'internal': return 'text-gray-500 bg-gray-50'
      default: return 'text-gray-500 bg-gray-50'
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 p-3 bg-gray-800 text-white rounded-full shadow-lg hover:bg-gray-700 z-50"
        title="Open Debug Panel"
      >
        <Bug size={20} />
      </button>
    )
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 h-96 bg-white border-t shadow-xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-gray-50">
        <div className="flex items-center gap-2">
          <Bug size={20} className="text-gray-600" />
          <h3 className="font-semibold">Debug Panel</h3>
          <span className="text-sm text-gray-500">({logs.length} logs)</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Filters */}
          <select
            value={filter.functionName || ''}
            onChange={(e) => setFilter({ ...filter, functionName: e.target.value || undefined })}
            className="text-sm border rounded px-2 py-1"
          >
            <option value="">All Functions</option>
            <option value="generate-message">generate-message</option>
            <option value="determine-next-speaker">determine-next-speaker</option>
            <option value="ai-chat">ai-chat</option>
          </select>

          <select
            value={filter.eventType || ''}
            onChange={(e) => setFilter({ ...filter, eventType: e.target.value || undefined })}
            className="text-sm border rounded px-2 py-1"
          >
            <option value="">All Events</option>
            <option value="request">Request</option>
            <option value="response">Response</option>
            <option value="error">Error</option>
            <option value="internal">Internal</option>
          </select>

          {/* Actions */}
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`px-2 py-1 text-sm rounded ${autoScroll ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          >
            Auto-scroll
          </button>

          <button
            onClick={exportLogs}
            className="p-1.5 hover:bg-gray-200 rounded"
            title="Export Logs"
          >
            <Download size={16} />
          </button>

          <button
            onClick={clearLogs}
            className="p-1.5 hover:bg-gray-200 rounded"
            title="Clear Logs"
          >
            <Trash2 size={16} />
          </button>

          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 hover:bg-gray-200 rounded"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Logs */}
      <div className="flex-1 overflow-y-auto font-mono text-xs">
        {logs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            No debug logs yet. Enable DEBUG_MODE in your Edge functions.
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {logs.map(log => (
              <div key={log.id} className="border rounded bg-gray-50">
                <div
                  className="flex items-start gap-2 p-2 cursor-pointer hover:bg-gray-100"
                  onClick={() => toggleLogExpansion(log.id)}
                >
                  <span className="mt-0.5">
                    {expandedLogs.has(log.id) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </span>

                  <div className="flex-1 flex items-start gap-2">
                    <span className="text-gray-500">
                      {new Date(log.timestamp).toLocaleTimeString('en-US', {
                        hour12: false,
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        fractionalSecondDigits: 3
                      })}
                    </span>

                    <span className={`px-1.5 py-0.5 rounded text-xs ${getEventTypeColor(log.event_type)}`}>
                      {log.event_type}
                    </span>

                    <span className="font-semibold">{log.function_name}</span>
                    <span className="text-gray-600">{log.phase}</span>

                    {log.persona_name && (
                      <span className="text-purple-600">@{log.persona_name}</span>
                    )}

                    {log.conversation_title && (
                      <span className="text-blue-600">[{log.conversation_title}]</span>
                    )}
                  </div>
                </div>

                {expandedLogs.has(log.id) && (
                  <div className="px-8 pb-2">
                    <div className="bg-white rounded p-2 overflow-x-auto">
                      <pre className="text-xs">{JSON.stringify(log.data, null, 2)}</pre>
                      {log.metadata && (
                        <>
                          <div className="mt-2 pt-2 border-t text-gray-500">Metadata:</div>
                          <pre className="text-xs">{JSON.stringify(log.metadata, null, 2)}</pre>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        )}
      </div>
    </div>
  )
}