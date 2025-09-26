import { BaseMessage, HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages'
import { providerManager } from '../providers/provider-manager-edge'
import { turnOrchestrator } from '../orchestration/turn-orchestrator'
import { supabase } from '@/lib/supabase'
import { getUniqueColor, resetUsedColors } from '@/utils/colors'
import { getPersonaAvatar } from '@/utils/persona-avatars'
import type {
  Conversation,
  Persona,
  Message,
  ConversationConfig,
  PersonaConfig,
  TurnDecision,
  CostBreakdown
} from '@/types'

export class ConversationManager {
  private activeConversations: Map<string, Conversation> = new Map()
  private conversationPersonas: Map<string, Persona[]> = new Map()
  private conversationMessages: Map<string, Message[]> = new Map()
  private streamCallbacks: Map<string, (chunk: string) => void> = new Map()
  private pinnedMessages: Map<string, string[]> = new Map() // conversationId -> messageIds

  async createConversation(
    userId: string,
    config: ConversationConfig
  ): Promise<Conversation> {
    try {
      // Initialize provider manager with user ID
      await providerManager.initialize(userId)
      providerManager.setConversationId('pending') // Will update after creation
      // Create conversation in database
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          user_id: userId,
          title: config.title,
          topic: config.topic,
          mode: config.mode,
          conversation_type: config.conversation_type,
          speed: config.speed
        })
        .select()
        .single()

      if (convError) throw convError

      // Reset color pool for new conversation
      resetUsedColors()

      // Create personas for the conversation
      const personas: Persona[] = []
      for (const personaConfig of config.personas) {
        let persona: Persona

        // Check if we should use an existing persona or create a new one
        if (personaConfig.template_id) {
          // Get the template
          const { data: template } = await supabase
            .from('personas')
            .select('*')
            .eq('id', personaConfig.template_id)
            .eq('is_template', true)
            .single()

          if (template) {
            // Create user-specific persona instance from template
            const personaData: any = {
              name: personaConfig.name || template.name,
              role: personaConfig.role || template.role,
              model: personaConfig.model || template.model,
              provider: personaConfig.provider || template.provider,
              temperature: personaConfig.temperature || template.temperature || 0.7,
              max_tokens: personaConfig.max_tokens || template.max_tokens || 1000,
              system_prompt: personaConfig.system_prompt || template.system_prompt || this.generateSystemPrompt(personaConfig),
              demographics: personaConfig.demographics || template.demographics,
              background: personaConfig.background || template.background,
              personality: personaConfig.personality || template.personality,
              experience_level: personaConfig.experience_level || template.experience_level,
              attitude: personaConfig.attitude || template.attitude,
              avatar_url: template.avatar_url,
              color: template.color,
              category: template.category,
              description: template.description,
              expertise_areas: template.expertise_areas,
              is_template: false,
              user_id: userId  // Link persona to user
            }

            const { data: newPersona, error: personaError } = await supabase
              .from('personas')
              .insert(personaData)
              .select()
              .single()

            if (personaError) throw personaError
            persona = newPersona
          } else {
            throw new Error(`Template ${personaConfig.template_id} not found`)
          }
        } else {
          // Create custom user-specific persona
          const personaData: any = {
            name: personaConfig.name,
            role: personaConfig.role,
            model: personaConfig.model,
            provider: personaConfig.provider,
            temperature: personaConfig.temperature || 0.7,
            max_tokens: personaConfig.max_tokens || 1000,
            system_prompt: personaConfig.system_prompt || this.generateSystemPrompt(personaConfig),
            demographics: personaConfig.demographics,
            background: personaConfig.background,
            personality: personaConfig.personality,
            experience_level: personaConfig.experience_level,
            attitude: personaConfig.attitude,
            is_template: false,
            user_id: userId  // Link persona to user
          }

          const { data: newPersona, error: personaError } = await supabase
            .from('personas')
            .insert(personaData)
            .select()
            .single()

          if (personaError) throw personaError
          persona = newPersona
        }

        // Link persona to conversation via junction table
        const { error: junctionError } = await supabase
          .from('conversation_personas')
          .insert({
            conversation_id: conversation.id,
            persona_id: persona.id
          })

        if (junctionError) throw junctionError
        personas.push(persona)
      }

      // Store in memory
      this.activeConversations.set(conversation.id, conversation)
      this.conversationPersonas.set(conversation.id, personas)
      this.conversationMessages.set(conversation.id, [])

      // Update provider manager with conversation ID
      providerManager.setConversationId(conversation.id)

      return conversation
    } catch (error) {
      console.error('Error creating conversation:', error)
      throw error
    }
  }

  async sendMessage(
    conversationId: string,
    content: string,
    userId: string,
    personaId?: string
  ): Promise<Message> {
    try {
      // Create message - if personaId is provided, it's an assistant message
      const { data: message, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          user_id: userId,
          persona_id: personaId,
          role: personaId ? 'assistant' : 'user',
          content
        })
        .select()
        .single()

      if (error) throw error

      // Add to message history
      const messages = this.conversationMessages.get(conversationId) || []
      messages.push(message)
      this.conversationMessages.set(conversationId, messages)

      // Trigger AI responses if in auto mode
      const conversation = this.activeConversations.get(conversationId)
      if (conversation?.mode === 'auto') {
        this.startAutoResponses(conversationId)
      }

      return message
    } catch (error) {
      console.error('Error sending message:', error)
      throw error
    }
  }

  async generateResponse(
    conversationId: string,
    personaId: string,
    onStream?: (chunk: string) => void
  ): Promise<Message> {
    try {
      const conversation = this.activeConversations.get(conversationId)
      const personas = this.conversationPersonas.get(conversationId)
      const messages = this.conversationMessages.get(conversationId) || []
      const pinnedIds = this.pinnedMessages.get(conversationId) || []
      const persona = personas?.find(p => p.id === personaId)

      if (!persona) throw new Error('Persona not found')
      if (!conversation) throw new Error('Conversation not found')

      // Check if persona is still active in the conversation
      const { data: activeCheck } = await supabase
        .from('conversation_personas')
        .select('is_active')
        .eq('conversation_id', conversationId)
        .eq('persona_id', personaId)
        .single()

      if (!activeCheck || !activeCheck.is_active) {
        throw new Error('Persona is no longer active in this conversation')
      }

      // Ensure provider manager is initialized
      if (!providerManager.isUsingMockProviders()) {
        await providerManager.initialize(conversation.user_id)
        providerManager.setConversationId(conversationId)
      }

      // Convert messages to LangChain format, including pinned messages context
      const langchainMessages = this.convertToLangChainMessages(messages, pinnedIds)

      // Generate response using provider manager
      const response = await providerManager.generateResponse(
        persona,
        langchainMessages,
        onStream
      )

      // Save message to database
      const { data: message, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          persona_id: personaId,
          role: 'assistant',
          content: response.content,
          tokens_input: response.usage.promptTokens,
          tokens_output: response.usage.completionTokens,
          tokens_cached: response.usage.cachedTokens,
          cost: response.cost
        })
        .select()
        .single()

      if (error) throw error

      // Update message history
      messages.push(message)
      this.conversationMessages.set(conversationId, messages)

      // Record cost
      await this.recordCost(conversationId, personaId, response)

      return message
    } catch (error) {
      console.error('Error generating response:', error)
      throw error
    }
  }

  private async startAutoResponses(conversationId: string): Promise<void> {
    const conversation = this.activeConversations.get(conversationId)
    const personas = this.conversationPersonas.get(conversationId)
    const messages = this.conversationMessages.get(conversationId) || []

    if (!conversation || !personas || personas.length === 0) return

    // Determine next speaker using turn orchestrator
    const decision = await turnOrchestrator.determineSpeaker(
      conversationId,
      personas,
      messages,
      conversation.mode
    )

    if (decision.next_persona_id) {
      // Add delay based on conversation speed (1-10, where 10 is fastest)
      const delayMs = (11 - conversation.speed) * 1000 // 1s to 10s delay
      await new Promise(resolve => setTimeout(resolve, delayMs))

      // Generate response from selected persona
      const streamCallback = this.streamCallbacks.get(conversationId)
      await this.generateResponse(conversationId, decision.next_persona_id, streamCallback)

      // Continue auto responses if conversation is still active
      if (conversation.is_active && messages.length < 100) { // Limit to 100 messages
        this.startAutoResponses(conversationId)
      }
    }
  }

  async manualSelectSpeaker(
    conversationId: string,
    personaId: string
  ): Promise<Message> {
    const conversation = this.activeConversations.get(conversationId)

    if (!conversation || conversation.mode !== 'manual') {
      throw new Error('Conversation not in manual mode')
    }

    // Check if persona is still active in the conversation
    const { data: activeCheck } = await supabase
      .from('conversation_personas')
      .select('is_active')
      .eq('conversation_id', conversationId)
      .eq('persona_id', personaId)
      .single()

    if (!activeCheck || !activeCheck.is_active) {
      throw new Error('Persona is no longer active in this conversation')
    }

    const streamCallback = this.streamCallbacks.get(conversationId)
    return this.generateResponse(conversationId, personaId, streamCallback)
  }

  async endConversation(conversationId: string): Promise<void> {
    try {
      // Update conversation status
      const { error } = await supabase
        .from('conversations')
        .update({
          is_active: false,
          ended_at: new Date().toISOString()
        })
        .eq('id', conversationId)

      if (error) throw error

      // Clear from memory
      this.activeConversations.delete(conversationId)
      this.conversationPersonas.delete(conversationId)
      this.conversationMessages.delete(conversationId)
      this.streamCallbacks.delete(conversationId)

      // Reset turn orchestrator for this conversation
      turnOrchestrator.reset(conversationId)
    } catch (error) {
      console.error('Error ending conversation:', error)
      throw error
    }
  }

  async getConversationCost(conversationId: string): Promise<CostBreakdown> {
    try {
      const { data: costs, error } = await supabase
        .from('cost_records')
        .select('*')
        .eq('conversation_id', conversationId)

      if (error) throw error

      const breakdown: CostBreakdown = {
        total: 0,
        byPersona: {},
        byProvider: { openai: 0, anthropic: 0, gemini: 0 },
        input_cost: 0,
        output_cost: 0,
        cache_savings: 0
      }

      for (const cost of costs || []) {
        breakdown.total += Number(cost.total_cost)
        breakdown.input_cost += Number(cost.input_cost)
        breakdown.output_cost += Number(cost.output_cost)

        if (cost.persona_id) {
          breakdown.byPersona[cost.persona_id] =
            (breakdown.byPersona[cost.persona_id] || 0) + Number(cost.total_cost)
        }

        breakdown.byProvider[cost.provider as keyof typeof breakdown.byProvider] += Number(cost.total_cost)

        if (cost.cached_tokens > 0) {
          // Calculate cache savings (cached tokens are typically 90% cheaper)
          const fullCost = (cost.cached_tokens / 1_000_000) * this.getInputPrice(cost.provider, cost.model)
          const cachedCost = fullCost * 0.1
          breakdown.cache_savings += (fullCost - cachedCost)
        }
      }

      return breakdown
    } catch (error) {
      console.error('Error getting conversation cost:', error)
      throw error
    }
  }

  setStreamCallback(conversationId: string, callback: (chunk: string) => void): void {
    this.streamCallbacks.set(conversationId, callback)
  }

  setPinnedMessages(conversationId: string, messageIds: string[]): void {
    this.pinnedMessages.set(conversationId, messageIds)
  }

  private convertToLangChainMessages(messages: Message[], pinnedIds: string[] = []): BaseMessage[] {
    const result: BaseMessage[] = []

    // Add pinned messages context at the beginning if any
    // First check for database-persisted pinned messages
    const pinnedMessages = messages.filter(m => m.is_pinned || pinnedIds.includes(m.id))
    if (pinnedMessages.length > 0) {
      const pinnedContext = pinnedMessages.map(m =>
        `[PINNED] ${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`
      ).join('\n')
      result.push(new SystemMessage(`Important pinned messages for context:\n${pinnedContext}`))
    }

    // Add regular messages
    messages.forEach(msg => {
      switch (msg.role) {
        case 'user':
          result.push(new HumanMessage(msg.content))
          break
        case 'assistant':
          result.push(new AIMessage(msg.content))
          break
        case 'system':
          result.push(new SystemMessage(msg.content))
          break
        default:
          result.push(new HumanMessage(msg.content))
      }
    })

    return result
  }

  private generateSystemPrompt(config: PersonaConfig): string {
    const parts = []

    parts.push(`You are ${config.name}, ${config.role}.`)

    if (config.background?.professional) {
      parts.push(`Professional background: ${config.background.professional}`)
    }

    if (config.personality?.traits) {
      parts.push(`Personality traits: ${config.personality.traits.join(', ')}`)
    }

    if (config.experience_level) {
      parts.push(`Experience level: ${config.experience_level}`)
    }

    if (config.attitude) {
      parts.push(`Current attitude: ${config.attitude}`)
    }

    parts.push('Respond naturally and authentically based on your role and characteristics.')

    return parts.join('\n')
  }

  private async recordCost(
    conversationId: string,
    personaId: string,
    response: any
  ): Promise<void> {
    const conversation = this.activeConversations.get(conversationId)
    const persona = this.conversationPersonas.get(conversationId)?.find(p => p.id === personaId)

    if (!conversation || !persona) return

    try {
      await supabase.from('cost_records').insert({
        conversation_id: conversationId,
        persona_id: personaId,
        user_id: conversation.user_id,
        provider: response.provider,
        model: response.model,
        input_tokens: response.usage.promptTokens,
        output_tokens: response.usage.completionTokens,
        cached_tokens: response.usage.cachedTokens || 0,
        input_cost: response.cost * (response.usage.promptTokens / (response.usage.promptTokens + response.usage.completionTokens)),
        output_cost: response.cost * (response.usage.completionTokens / (response.usage.promptTokens + response.usage.completionTokens)),
        total_cost: response.cost
      })

      // Update conversation total cost
      await supabase
        .from('conversations')
        .update({
          total_cost: conversation.total_cost + response.cost,
          message_count: conversation.message_count + 1
        })
        .eq('id', conversationId)

      // Update persona costs
      await supabase
        .from('personas')
        .update({
          total_cost: persona.total_cost + response.cost,
          total_tokens_used: persona.total_tokens_used + response.usage.totalTokens,
          message_count: persona.message_count + 1
        })
        .eq('id', personaId)
    } catch (error) {
      console.error('Error recording cost:', error)
    }
  }

  private getInputPrice(provider: string, model: string): number {
    // Simplified pricing lookup - in production this would come from database
    const prices: Record<string, number> = {
      'openai:gpt-4-turbo-preview': 10,
      'anthropic:claude-3-opus-20240229': 15,
      'gemini:gemini-pro': 1.25
    }
    return prices[`${provider}:${model}`] || 1
  }

  // Load existing conversation
  async loadConversation(conversationId: string): Promise<void> {
    try {
      // Load conversation
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single()

      if (convError) throw convError

      // Load personas via junction table
      const { data: personaRelations, error: personaError } = await supabase
        .from('conversation_personas')
        .select('personas(*)')
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

      // Store in memory
      this.activeConversations.set(conversationId, conversation)
      this.conversationPersonas.set(conversationId, personas || [])
      this.conversationMessages.set(conversationId, messages || [])
    } catch (error) {
      console.error('Error loading conversation:', error)
      throw error
    }
  }

  // Refresh personas list for a conversation
  async refreshPersonas(conversationId: string): Promise<void> {
    try {
      // Load personas via junction table
      const { data: personaRelations, error: personaError } = await supabase
        .from('conversation_personas')
        .select('personas(*)')
        .eq('conversation_id', conversationId)
        .eq('is_active', true)

      if (personaError) throw personaError

      const personas = personaRelations?.map(rel => rel.personas).filter(Boolean) || []
      this.conversationPersonas.set(conversationId, personas)
    } catch (error) {
      console.error('Error refreshing personas:', error)
      throw error
    }
  }
}

// Export singleton instance
export const conversationManager = new ConversationManager()