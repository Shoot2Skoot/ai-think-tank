import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { ConversationTemplate } from '@/types'

interface ConversationTemplateState {
  templates: ConversationTemplate[]
  loading: boolean
  error: string | null

  loadTemplates: () => Promise<void>
  getTemplateById: (id: string) => ConversationTemplate | undefined
  clearError: () => void
}

export const useConversationTemplateStore = create<ConversationTemplateState>((set, get) => ({
  templates: [],
  loading: false,
  error: null,

  loadTemplates: async () => {
    set({ loading: true, error: null })
    try {
      const { data: templates, error } = await supabase
        .from('conversation_templates')
        .select('*')
        .order('usage_count', { ascending: false })

      if (error) throw error

      set({
        templates: templates || [],
        loading: false
      })
    } catch (error: any) {
      set({
        error: error.message || 'Failed to load conversation templates',
        loading: false
      })
      throw error
    }
  },

  getTemplateById: (id: string) => {
    return get().templates.find(t => t.id === id)
  },

  clearError: () => set({ error: null })
}))