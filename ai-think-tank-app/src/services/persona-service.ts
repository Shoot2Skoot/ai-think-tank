import { supabase } from '@/lib/supabase'
import type { PersonaTemplate } from '@/types'

export class PersonaService {
  /**
   * Fetch all global personas that are available to all users
   */
  async getGlobalPersonas(): Promise<PersonaTemplate[]> {
    try {
      const { data, error } = await supabase
        .from('persona_templates')
        .select('*')
        .eq('is_global', true)
        .order('name')

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching global personas:', error)
      return []
    }
  }

  /**
   * Get personas not in a specific conversation
   */
  async getAvailablePersonas(conversationId: string): Promise<PersonaTemplate[]> {
    try {
      // Get all global personas
      const globalPersonas = await this.getGlobalPersonas()

      // Get personas already in the conversation
      const { data: conversationPersonas, error } = await supabase
        .from('personas')
        .select('name')
        .eq('conversation_id', conversationId)

      if (error) throw error

      // Filter out personas already in the conversation
      const usedNames = new Set(conversationPersonas?.map(p => p.name) || [])
      return globalPersonas.filter(p => !usedNames.has(p.name))
    } catch (error) {
      console.error('Error fetching available personas:', error)
      return []
    }
  }

  /**
   * Get a specific persona template by name
   */
  async getPersonaByName(name: string): Promise<PersonaTemplate | null> {
    try {
      const { data, error } = await supabase
        .from('persona_templates')
        .select('*')
        .eq('name', name)
        .maybeSingle()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error fetching persona by name:', error)
      return null
    }
  }
}

export const personaService = new PersonaService()