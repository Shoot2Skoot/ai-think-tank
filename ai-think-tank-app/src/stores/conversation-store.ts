import { create } from 'zustand'
import { conversationManager } from '@/services/conversation/conversation-manager'
import { supabase } from '@/lib/supabase'
import { personaAvatarMap } from '@/utils/persona-avatars'
import type {
  Conversation,
  Message,
  Persona,
  ConversationConfig,
  CostBreakdown,
  TurnDecision
} from '@/types'

interface ConversationState {
  // State
  activeConversation: Conversation | null
  conversations: Conversation[]
  messages: Message[]
  personas: Persona[]
  costBreakdown: CostBreakdown | null
  loading: boolean
  error: string | null
  nextSpeaker: TurnDecision | null

  // Actions
  createConversation: (userId: string, config: ConversationConfig) => Promise<Conversation>
  loadConversation: (conversationId: string) => Promise<void>
  loadConversations: (userId: string) => Promise<void>
  sendMessage: (content: string, userId: string, personaId?: string) => Promise<void>
  triggerResponse: (personaId: string) => Promise<void>
  endConversation: () => Promise<void>
  updateCostBreakdown: () => Promise<void>
  setStreamCallback: (callback: (chunk: string) => void) => void
  clearError: () => void
  addPersonaToConversation: (personaName: string) => Promise<void>
  removePersonaFromConversation: (personaId: string) => Promise<void>
}

export const useConversationStore = create<ConversationState>((set, get) => ({
  activeConversation: null,
  conversations: [],
  messages: [],
  personas: [],
  costBreakdown: null,
  loading: false,
  error: null,
  nextSpeaker: null,

  createConversation: async (userId, config) => {
    set({ loading: true, error: null })
    try {
      const conversation = await conversationManager.createConversation(userId, config)

      // Load personas for the new conversation
      const { data: personas, error: personaError } = await supabase
        .from('personas')
        .select('*')
        .eq('conversation_id', conversation.id)

      if (personaError) throw personaError

      set({
        activeConversation: conversation,
        personas: personas || [],
        messages: [],
        loading: false
      })

      // Subscribe to real-time updates
      get().subscribeToConversation(conversation.id)

      // Return the conversation so the caller can get the ID
      return conversation
    } catch (error: any) {
      set({
        error: error.message || 'Failed to create conversation',
        loading: false
      })
      throw error
    }
  },

  loadConversation: async (conversationId) => {
    set({ loading: true, error: null })
    try {
      await conversationManager.loadConversation(conversationId)

      // Load conversation data from database
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single()

      if (convError) throw convError

      // Load personas
      const { data: personas, error: personaError } = await supabase
        .from('personas')
        .select('*')
        .eq('conversation_id', conversationId)

      if (personaError) throw personaError

      // Load messages
      const { data: messages, error: msgError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

      if (msgError) throw msgError

      // Get cost breakdown
      const costBreakdown = await conversationManager.getConversationCost(conversationId)

      set({
        activeConversation: conversation,
        personas: personas || [],
        messages: messages || [],
        costBreakdown,
        loading: false
      })

      // Subscribe to real-time updates
      get().subscribeToConversation(conversationId)
    } catch (error: any) {
      set({
        error: error.message || 'Failed to load conversation',
        loading: false
      })
      throw error
    }
  },

  loadConversations: async (userId) => {
    set({ loading: true, error: null })
    try {
      const { data: conversations, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error

      set({
        conversations: conversations || [],
        loading: false
      })
    } catch (error: any) {
      set({
        error: error.message || 'Failed to load conversations',
        loading: false
      })
      throw error
    }
  },

  sendMessage: async (content, userId, personaId) => {
    const { activeConversation } = get()
    if (!activeConversation) {
      set({ error: 'No active conversation' })
      return
    }

    set({ loading: true, error: null })
    try {
      const message = await conversationManager.sendMessage(
        activeConversation.id,
        content,
        userId,
        personaId
      )

      // Add message to local state
      set((state) => ({
        messages: [...state.messages, message],
        loading: false
      }))

      // Update cost breakdown
      await get().updateCostBreakdown()
    } catch (error: any) {
      set({
        error: error.message || 'Failed to send message',
        loading: false
      })
      throw error
    }
  },

  triggerResponse: async (personaId) => {
    const { activeConversation } = get()
    if (!activeConversation) {
      set({ error: 'No active conversation' })
      return
    }

    set({ loading: true, error: null })
    try {
      const message = await conversationManager.manualSelectSpeaker(
        activeConversation.id,
        personaId
      )

      // Add message to local state
      set((state) => ({
        messages: [...state.messages, message],
        loading: false
      }))

      // Update cost breakdown
      await get().updateCostBreakdown()
    } catch (error: any) {
      set({
        error: error.message || 'Failed to trigger response',
        loading: false
      })
      throw error
    }
  },

  endConversation: async () => {
    const { activeConversation } = get()
    if (!activeConversation) return

    set({ loading: true, error: null })
    try {
      await conversationManager.endConversation(activeConversation.id)

      set({
        activeConversation: null,
        messages: [],
        personas: [],
        costBreakdown: null,
        loading: false
      })

      // Unsubscribe from real-time updates
      get().unsubscribeFromConversation()
    } catch (error: any) {
      set({
        error: error.message || 'Failed to end conversation',
        loading: false
      })
      throw error
    }
  },

  updateCostBreakdown: async () => {
    const { activeConversation } = get()
    if (!activeConversation) return

    try {
      const costBreakdown = await conversationManager.getConversationCost(
        activeConversation.id
      )
      set({ costBreakdown })
    } catch (error) {
      console.error('Failed to update cost breakdown:', error)
    }
  },

  setStreamCallback: (callback) => {
    const { activeConversation } = get()
    if (activeConversation) {
      conversationManager.setStreamCallback(activeConversation.id, callback)
    }
  },

  clearError: () => set({ error: null }),

  addPersonaToConversation: async (personaName) => {
    const { activeConversation } = get()
    if (!activeConversation) {
      set({ error: 'No active conversation' })
      return
    }

    set({ loading: true, error: null })
    try {
      // Get persona template data
      const { data: template, error: templateError } = await supabase
        .from('persona_templates')
        .select('*')
        .eq('name', personaName)
        .single()

      if (templateError) throw templateError

      // Create new persona for this conversation
      const newPersona: any = {
        conversation_id: activeConversation.id,
        name: personaName,
        role: template.role || 'AI Assistant',
        model: template.default_model || 'gpt-4',
        provider: template.default_provider || 'openai',
        system_prompt: template.system_prompt,
        created_at: new Date().toISOString()
      }

      const { data: persona, error: personaError } = await supabase
        .from('personas')
        .insert(newPersona)
        .select()
        .single()

      if (personaError) throw personaError

      // Add join message
      const joinMessage = {
        conversation_id: activeConversation.id,
        persona_id: persona.id,
        content: `${personaName} has joined the conversation`,
        role: 'system',
        created_at: new Date().toISOString()
      }

      const { data: message, error: messageError } = await supabase
        .from('messages')
        .insert(joinMessage)
        .select()
        .single()

      if (messageError) throw messageError

      // Update local state
      set((state) => ({
        personas: [...state.personas, persona],
        messages: [...state.messages, message],
        loading: false
      }))
    } catch (error: any) {
      set({
        error: error.message || 'Failed to add persona',
        loading: false
      })
      throw error
    }
  },

  removePersonaFromConversation: async (personaId) => {
    const { activeConversation, personas } = get()
    if (!activeConversation) {
      set({ error: 'No active conversation' })
      return
    }

    const personaToRemove = personas.find(p => p.id === personaId)
    if (!personaToRemove) {
      set({ error: 'Persona not found' })
      return
    }

    set({ loading: true, error: null })
    try {
      // Add leave message before removing
      const leaveMessage = {
        conversation_id: activeConversation.id,
        persona_id: personaId,
        content: `${personaToRemove.name} has left the conversation`,
        role: 'system',
        created_at: new Date().toISOString()
      }

      const { data: message, error: messageError } = await supabase
        .from('messages')
        .insert(leaveMessage)
        .select()
        .single()

      if (messageError) throw messageError

      // Remove persona from database
      const { error: deleteError } = await supabase
        .from('personas')
        .delete()
        .eq('id', personaId)

      if (deleteError) throw deleteError

      // Update local state
      set((state) => ({
        personas: state.personas.filter(p => p.id !== personaId),
        messages: [...state.messages, message],
        loading: false
      }))
    } catch (error: any) {
      set({
        error: error.message || 'Failed to remove persona',
        loading: false
      })
      throw error
    }
  },

  // Private methods (not exposed in interface)
  subscribeToConversation: (conversationId: string) => {
    const unsubscribe = supabase
      .channel(`conversation:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          // Add new message to state
          set((state) => ({
            messages: [...state.messages, payload.new as Message]
          }))
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cost_records',
          filter: `conversation_id=eq.${conversationId}`
        },
        async () => {
          // Update cost breakdown when costs change
          await get().updateCostBreakdown()
        }
      )
      .subscribe()

    // Store unsubscribe function
    ;(window as any).__conversationUnsubscribe = () => {
      supabase.removeChannel(unsubscribe)
    }
  },

  unsubscribeFromConversation: () => {
    const unsubscribe = (window as any).__conversationUnsubscribe
    if (unsubscribe) {
      unsubscribe()
      delete (window as any).__conversationUnsubscribe
    }
  }
}))