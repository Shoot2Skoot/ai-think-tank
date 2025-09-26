import { supabase } from '@/lib/supabase'
import type { Persona } from '@/types'

export class PersonaService {
  /**
   * Fetch all global persona templates that are available to all users
   */
  async getGlobalPersonas(): Promise<Persona[]> {
    try {
      const { data, error } = await supabase
        .from('personas')
        .select('*')
        .eq('is_template', true)
        .is('user_id', null)  // Global templates have no user
        .order('name')

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching global personas:', error)
      return []
    }
  }

  /**
   * Get persona templates not in a specific conversation
   */
  async getAvailablePersonas(conversationId: string): Promise<Persona[]> {
    try {
      // Get all global persona templates
      const globalPersonas = await this.getGlobalPersonas()

      // Get personas already in the conversation via junction table
      const { data: activeRelations, error } = await supabase
        .from('conversation_personas')
        .select('personas(name)')
        .eq('conversation_id', conversationId)
        .eq('is_active', true)

      if (error) throw error

      // Filter out personas already in the conversation
      const usedNames = new Set(activeRelations?.map(r => r.personas?.name).filter(Boolean) || [])
      return globalPersonas.filter(p => !usedNames.has(p.name))
    } catch (error) {
      console.error('Error fetching available personas:', error)
      return []
    }
  }

  /**
   * Get a specific persona template by name
   */
  async getPersonaByName(name: string): Promise<Persona | null> {
    try {
      const { data, error } = await supabase
        .from('personas')
        .select('*')
        .eq('name', name)
        .eq('is_template', true)
        .maybeSingle()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error fetching persona by name:', error)
      return null
    }
  }
}

  /**
   * Get all personas in a conversation
   */
  async getConversationPersonas(conversationId: string): Promise<Persona[]> {
    try {
      const { data: relations, error } = await supabase
        .from('conversation_personas')
        .select('personas(*)')
        .eq('conversation_id', conversationId)
        .eq('is_active', true)

      if (error) throw error

      return relations?.map(r => r.personas).filter(Boolean) || []
    } catch (error) {
      console.error('Error fetching conversation personas:', error)
      return []
    }
  }
}

export const personaService = new PersonaService()