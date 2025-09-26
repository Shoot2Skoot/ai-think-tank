import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { PersonaTemplate, PersonaConfig } from '@/types'

interface PersonaState {
  // State
  templates: PersonaTemplate[]
  selectedTemplates: PersonaTemplate[]
  customPersonas: PersonaConfig[]
  loading: boolean
  error: string | null
  searchQuery: string
  selectedCategory: string | null

  // Actions
  loadTemplates: () => Promise<void>
  searchTemplates: (query: string) => void
  filterByCategory: (category: string | null) => void
  selectTemplate: (template: PersonaTemplate) => void
  deselectTemplate: (templateId: string) => void
  createCustomPersona: (config: PersonaConfig) => void
  updateCustomPersona: (index: number, config: PersonaConfig) => void
  removeCustomPersona: (index: number) => void
  clearSelections: () => void
  clearError: () => void
}

export const usePersonaStore = create<PersonaState>((set, get) => ({
  templates: [],
  selectedTemplates: [],
  customPersonas: [],
  loading: false,
  error: null,
  searchQuery: '',
  selectedCategory: null,

  loadTemplates: async () => {
    set({ loading: true, error: null })
    try {
      const { data: templates, error } = await supabase
        .from('persona_templates')
        .select('*')
        .order('usage_count', { ascending: false })

      if (error) throw error

      set({
        templates: templates || [],
        loading: false
      })
    } catch (error: any) {
      set({
        error: error.message || 'Failed to load persona templates',
        loading: false
      })
      throw error
    }
  },

  searchTemplates: (query) => {
    set({ searchQuery: query })
  },

  filterByCategory: (category) => {
    set({ selectedCategory: category })
  },

  selectTemplate: (template) => {
    set((state) => ({
      selectedTemplates: [...state.selectedTemplates, template]
    }))

    // Update usage count
    supabase
      .from('persona_templates')
      .update({ usage_count: template.usage_count + 1 })
      .eq('id', template.id)
      .then(() => {})
      .catch(console.error)
  },

  deselectTemplate: (templateId) => {
    set((state) => ({
      selectedTemplates: state.selectedTemplates.filter(t => t.id !== templateId)
    }))
  },

  createCustomPersona: (config) => {
    set((state) => ({
      customPersonas: [...state.customPersonas, config]
    }))
  },

  updateCustomPersona: (index, config) => {
    set((state) => {
      const updated = [...state.customPersonas]
      updated[index] = config
      return { customPersonas: updated }
    })
  },

  removeCustomPersona: (index) => {
    set((state) => ({
      customPersonas: state.customPersonas.filter((_, i) => i !== index)
    }))
  },

  clearSelections: () => {
    set({
      selectedTemplates: [],
      customPersonas: []
    })
  },

  clearError: () => set({ error: null })
}))

// Computed values as selectors
export const getFilteredTemplates = (state: PersonaState) => {
  let filtered = state.templates

  // Filter by search query
  if (state.searchQuery) {
    const query = state.searchQuery.toLowerCase()
    filtered = filtered.filter(
      template =>
        template.name.toLowerCase().includes(query) ||
        template.role.toLowerCase().includes(query) ||
        template.description?.toLowerCase().includes(query) ||
        template.expertise_areas?.some(area => area.toLowerCase().includes(query))
    )
  }

  // Filter by category
  if (state.selectedCategory) {
    filtered = filtered.filter(
      template => template.category === state.selectedCategory
    )
  }

  return filtered
}

export const getCategories = (state: PersonaState) => {
  const categories = new Set(state.templates.map(t => t.category))
  return Array.from(categories).sort()
}

export const getAllPersonasForConversation = (state: PersonaState): PersonaConfig[] => {
  // Convert selected templates to PersonaConfig
  const fromTemplates: PersonaConfig[] = state.selectedTemplates.map(template => ({
    name: template.name,
    role: template.role,
    model: template.default_model,
    provider: template.default_provider,
    system_prompt: template.system_prompt,
    demographics: template.demographics,
    background: template.background,
    personality: template.personality,
    experience_level: template.experience_level,
    attitude: template.attitude,
    template_id: template.id,
    temperature: 0.7,
    max_tokens: 1000
  }))

  // Combine with custom personas
  return [...fromTemplates, ...state.customPersonas]
}