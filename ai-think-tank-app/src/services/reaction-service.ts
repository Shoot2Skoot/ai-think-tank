import { supabase } from '@/lib/supabase'
import type { MessageReaction, ReactionCount } from '@/types'

export class ReactionService {
  /**
   * Add a reaction to a message
   */
  static async addReaction(
    messageId: string,
    emoji: string,
    userId?: string,
    personaId?: string
  ): Promise<MessageReaction | null> {
    try {
      const { data, error } = await supabase
        .from('message_reactions')
        .insert({
          message_id: messageId,
          user_id: userId,
          persona_id: personaId,
          emoji
        })
        .select()
        .single()

      if (error) {
        console.error('Error adding reaction:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error adding reaction:', error)
      return null
    }
  }

  /**
   * Remove a reaction from a message
   */
  static async removeReaction(
    messageId: string,
    emoji: string,
    userId?: string,
    personaId?: string
  ): Promise<boolean> {
    try {
      const query = supabase
        .from('message_reactions')
        .delete()
        .eq('message_id', messageId)
        .eq('emoji', emoji)

      if (userId) {
        query.eq('user_id', userId)
      }
      if (personaId) {
        query.eq('persona_id', personaId)
      }

      const { error } = await query

      if (error) {
        console.error('Error removing reaction:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error removing reaction:', error)
      return false
    }
  }

  /**
   * Toggle a reaction (add if not exists, remove if exists)
   */
  static async toggleReaction(
    messageId: string,
    emoji: string,
    userId?: string,
    personaId?: string
  ): Promise<'added' | 'removed' | null> {
    try {
      // First check if reaction exists
      const query = supabase
        .from('message_reactions')
        .select('id')
        .eq('message_id', messageId)
        .eq('emoji', emoji)

      if (userId) {
        query.eq('user_id', userId)
      }
      if (personaId) {
        query.eq('persona_id', personaId)
      }

      const { data: existing } = await query.single()

      if (existing) {
        // Remove existing reaction
        const removed = await this.removeReaction(messageId, emoji, userId, personaId)
        return removed ? 'removed' : null
      } else {
        // Add new reaction
        const added = await this.addReaction(messageId, emoji, userId, personaId)
        return added ? 'added' : null
      }
    } catch (error) {
      console.error('Error toggling reaction:', error)
      return null
    }
  }

  /**
   * Get all reactions for a message
   */
  static async getMessageReactions(messageId: string): Promise<MessageReaction[]> {
    try {
      const { data, error } = await supabase
        .from('message_reactions')
        .select('*')
        .eq('message_id', messageId)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error fetching reactions:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error fetching reactions:', error)
      return []
    }
  }

  /**
   * Get reaction counts for multiple messages
   */
  static async getReactionCounts(messageIds: string[]): Promise<Record<string, ReactionCount[]>> {
    try {
      const { data, error } = await supabase
        .rpc('get_message_reaction_counts', {
          p_message_ids: messageIds
        })

      if (error) {
        console.error('Error fetching reaction counts:', error)
        return {}
      }

      // Group by message_id
      const grouped: Record<string, ReactionCount[]> = {}
      for (const reaction of data || []) {
        if (!grouped[reaction.message_id]) {
          grouped[reaction.message_id] = []
        }
        grouped[reaction.message_id].push(reaction)
      }

      return grouped
    } catch (error) {
      console.error('Error fetching reaction counts:', error)
      return {}
    }
  }

  /**
   * Get top reaction emojis for quick reactions
   */
  static async getTopReactionEmojis(limit: number = 5): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_top_reaction_emojis', {
          p_limit: limit
        })

      if (error) {
        console.error('Error fetching top emojis:', error)
        return this.getDefaultQuickReactions()
      }

      if (!data || data.length < limit) {
        // If we don't have enough data, supplement with defaults
        const emojis = (data || []).map((d: any) => d.emoji)
        const defaults = this.getDefaultQuickReactions()
        return [...new Set([...emojis, ...defaults])].slice(0, limit)
      }

      return data.map((d: any) => d.emoji)
    } catch (error) {
      console.error('Error fetching top emojis:', error)
      return this.getDefaultQuickReactions()
    }
  }

  /**
   * Get default quick reaction emojis
   */
  static getDefaultQuickReactions(): string[] {
    return ['👍', '❤️', '😂', '🎉', '🤔']
  }

  /**
   * Add a persona reaction programmatically
   */
  static async addPersonaReaction(
    messageId: string,
    personaId: string,
    emoji: string
  ): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .rpc('add_persona_reaction', {
          p_message_id: messageId,
          p_persona_id: personaId,
          p_emoji: emoji
        })

      if (error) {
        console.error('Error adding persona reaction:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error adding persona reaction:', error)
      return null
    }
  }

  /**
   * Subscribe to reaction updates for a conversation
   */
  static subscribeToReactions(
    conversationId: string,
    callback: (payload: any) => void
  ) {
    return supabase
      .channel(`reactions:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_reactions',
          filter: `message_id=in.(select id from messages where conversation_id=eq.${conversationId})`
        },
        callback
      )
      .subscribe()
  }
}