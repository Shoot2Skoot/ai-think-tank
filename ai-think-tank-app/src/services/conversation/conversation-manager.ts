import { BaseMessage, HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages'
import { providerManager } from '../providers/provider-manager-edge'
import { turnOrchestrator } from '../orchestration/turn-orchestrator'
import { supabase } from '@/lib/supabase'
import { getUniqueAvatarUrl, resetUsedAvatars } from '@/utils/avatars'
import { getUniqueColor, resetUsedColors } from '@/utils/colors'
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

      // Reset avatar and color pools for new conversation
      resetUsedAvatars()
      resetUsedColors()

      // Create personas for the conversation
      const personas: Persona[] = []
      for (const personaConfig of config.personas) {
        const { data: persona, error: personaError } = await supabase
          .from('personas')
          .insert({
            conversation_id: conversation.id,
            template_id: personaConfig.template_id,
            name: personaConfig.name,
            role: personaConfig.role,
            avatar: getUniqueAvatarUrl(),
            color: getUniqueColor(),
            model: personaConfig.model,
            provider: personaConfig.provider,
            temperature: personaConfig.temperature || 0.7,
            max_tokens: personaConfig.max_tokens || 1000,
            system_prompt: personaConfig.system_prompt || this.generateSystemPrompt(personaConfig),
            demographics: personaConfig.demographics,
            background: personaConfig.background,
            personality: personaConfig.personality,
            experience_level: personaConfig.experience_level,
            attitude: personaConfig.attitude
          })
          .select()
          .single()

        if (personaError) throw personaError
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
      // Create user message
      const { data: message, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          user_id: userId,
          persona_id: personaId,
          role: 'user',
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
      const persona = personas?.find(p => p.id === personaId)

      if (!persona) throw new Error('Persona not found')
      if (!conversation) throw new Error('Conversation not found')

      // Ensure provider manager is initialized
      if (!providerManager.isUsingMockProviders()) {
        await providerManager.initialize(conversation.user_id)
        providerManager.setConversationId(conversationId)
      }

      // Convert messages to LangChain format
      const langchainMessages = this.convertToLangChainMessages(messages)

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

  private convertToLangChainMessages(messages: Message[]): BaseMessage[] {
    return messages.map(msg => {
      switch (msg.role) {
        case 'user':
          return new HumanMessage(msg.content)
        case 'assistant':
          return new AIMessage(msg.content)
        case 'system':
          return new SystemMessage(msg.content)
        default:
          return new HumanMessage(msg.content)
      }
    })
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

      // Store in memory
      this.activeConversations.set(conversationId, conversation)
      this.conversationPersonas.set(conversationId, personas || [])
      this.conversationMessages.set(conversationId, messages || [])
    } catch (error) {
      console.error('Error loading conversation:', error)
      throw error
    }
  }
}

// Export singleton instance
export const conversationManager = new ConversationManager()