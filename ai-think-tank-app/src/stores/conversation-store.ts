import { create } from 'zustand'
import { conversationManager } from '@/services/conversation/conversation-manager'
import { supabase } from '@/lib/supabase'
import { personaService } from '@/services/persona-service'
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

      // Load personas for the new conversation using junction table
      const { data: personaRelations, error: personaError } = await supabase
        .from('conversation_personas')
        .select('persona_id, personas(*)')
        .eq('conversation_id', conversation.id)
        .eq('is_active', true)

      if (personaError) throw personaError

      const personas = personaRelations?.map(rel => rel.personas).filter(Boolean) || []

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

      // Load personas using junction table
      const { data: personaRelations, error: personaError } = await supabase
        .from('conversation_personas')
        .select('persona_id, personas(*)')
        .eq('conversation_id', conversationId)
        .eq('is_active', true)

      if (personaError) throw personaError

      const personas = personaRelations?.map(rel => rel.personas).filter(Boolean) || []

      // Load messages
      const { data: messages, error: msgError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

      if (msgError) throw msgError

      // Get cost breakdown
      const costBreakdown = await conversationManager.getConversationCost(conversationId)

      // Update conversation manager with pinned messages
      if (messages) {
        const pinnedIds = messages.filter(m => m.is_pinned).map(m => m.id)
        if (pinnedIds.length > 0) {
          conversationManager.setPinnedMessages(conversationId, pinnedIds)
        }
      }

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

      // Add message to local state immediately for better UX
      if (message) {
        set((state) => ({
          messages: [...state.messages, message],
          loading: false
        }))
      } else {
        set({ loading: false })
      }

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

      // Don't add message to local state - let subscription handle it
      // This prevents duplicates
      set({ loading: false })

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
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      // Try to get persona template data from service
      const template = await personaService.getPersonaByName(personaName)

      let persona

      // Check if we already have this persona for this user (non-template)
      const { data: existingPersona } = await supabase
        .from('personas')
        .select('*')
        .eq('name', personaName)
        .eq('is_template', false)
        .eq('user_id', user.id)
        .maybeSingle()

      if (existingPersona) {
        persona = existingPersona
      } else {
        // Create new user-specific persona instance based on template
        const newPersona: any = {
          name: personaName,
          role: template?.role || 'AI Assistant',
          model: template?.model || 'gpt-4',
          provider: template?.provider || 'openai',
          system_prompt: template?.system_prompt || `You are ${personaName}, a helpful AI assistant participating in this conversation.`,
          temperature: template?.temperature || 0.7,
          max_tokens: template?.max_tokens || 1000,
          demographics: template?.demographics,
          background: template?.background,
          personality: template?.personality,
          experience_level: template?.experience_level,
          attitude: template?.attitude,
          avatar_url: template?.avatar_url,
          color: template?.color,
          category: template?.category,
          description: template?.description,
          expertise_areas: template?.expertise_areas,
          is_template: false,  // This is a user persona instance, not a template
          user_id: user.id,  // Link to the user
          created_at: new Date().toISOString()
        }

        const { data: createdPersona, error: personaError } = await supabase
          .from('personas')
          .insert(newPersona)
          .select()
          .single()

        if (personaError) throw personaError
        persona = createdPersona
      }

      // Add persona to conversation via junction table
      const { error: junctionError } = await supabase
        .from('conversation_personas')
        .insert({
          conversation_id: activeConversation.id,
          persona_id: persona.id
        })

      if (junctionError) throw junctionError

      // Add join message (as system, not persona)
      const joinMessage = {
        conversation_id: activeConversation.id,
        persona_id: null,  // System message, not from a persona
        user_id: null,  // System message
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

      // Update local state (don't add message - let subscription handle it)
      set((state) => ({
        personas: [...state.personas, persona],
        loading: false
      }))

      // Refresh conversation manager's persona list
      await conversationManager.refreshPersonas(activeConversation.id)
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
      // Add leave message before removing (as system, not persona)
      const leaveMessage = {
        conversation_id: activeConversation.id,
        persona_id: null,  // System message, not from a persona
        user_id: null,  // System message
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

      // Mark persona as inactive in the conversation (soft delete)
      const { error: deleteError } = await supabase
        .from('conversation_personas')
        .update({
          is_active: false,
          left_at: new Date().toISOString()
        })
        .eq('conversation_id', activeConversation.id)
        .eq('persona_id', personaId)

      if (deleteError) throw deleteError

      // Update local state (don't add message - let subscription handle it)
      set((state) => ({
        personas: state.personas.filter(p => p.id !== personaId),
        loading: false
      }))

      // Refresh conversation manager's persona list
      await conversationManager.refreshPersonas(activeConversation.id)
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
          // Add new message to state if it doesn't already exist
          const newMessage = payload.new as Message
          set((state) => {
            // Check if message already exists (by ID)
            const messageExists = state.messages.some(m => m.id === newMessage.id)
            if (messageExists) {
              return state  // Don't add duplicate
            }
            return {
              messages: [...state.messages, newMessage]
            }
          })
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