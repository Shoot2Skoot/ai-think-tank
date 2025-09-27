import { BaseMessage, HumanMessage, AIMessage } from '@langchain/core/messages'
import type { Persona, TurnDecision, Message } from '@/types'

interface TurnWeights {
  relevance: number
  expertise: number
  participation: number
  flow: number
}

export class TurnOrchestrator {
  private readonly weights: TurnWeights = {
    relevance: 0.4,
    expertise: 0.3,
    participation: 0.2,
    flow: 0.1
  }

  private messageHistory: Map<string, Message[]> = new Map()
  private lastSpeaker: Map<string, string> = new Map()
  private participationCount: Map<string, Map<string, number>> = new Map()

  async determineSpeaker(
    conversationId: string,
    personas: Persona[],
    messages: Message[],
    mode: 'auto' | 'manual' = 'auto'
  ): Promise<TurnDecision> {
    console.log('[TurnOrchestrator] determineSpeaker called:', {
      conversationId,
      personaCount: personas.length,
      personas: personas.map(p => ({ id: p.id, name: p.name })),
      messageCount: messages.length,
      mode
    })

    if (mode === 'manual') {
      // In manual mode, we don't determine speaker automatically
      return {
        next_persona_id: '',
        reasoning: 'Manual mode - user will select the next speaker',
        priority_score: 0,
        factors: {
          relevance: 0,
          expertise: 0,
          participation: 0,
          flow: 0
        }
      }
    }

    // Update message history
    this.messageHistory.set(conversationId, messages)

    // Calculate scores for each persona
    const scores = await Promise.all(
      personas.map(async persona => {
        const factors = await this.calculateFactors(persona, conversationId, messages, personas)
        const totalScore = this.calculateWeightedScore(factors)

        console.log(`[TurnOrchestrator] Score for ${persona.name}:`, {
          factors,
          totalScore
        })

        return {
          persona,
          factors,
          totalScore
        }
      })
    )

    // Sort by total score and select the highest
    scores.sort((a, b) => b.totalScore - a.totalScore)
    const winner = scores[0]

    // Update tracking
    this.lastSpeaker.set(conversationId, winner.persona.id)
    this.updateParticipation(conversationId, winner.persona.id)

    return {
      next_persona_id: winner.persona.id,
      reasoning: this.generateReasoning(winner.persona, winner.factors),
      priority_score: winner.totalScore,
      factors: winner.factors
    }
  }

  private async calculateFactors(
    persona: Persona,
    conversationId: string,
    messages: Message[],
    allPersonas: Persona[]
  ): Promise<{ relevance: number; expertise: number; participation: number; flow: number }> {
    const recentMessages = messages.slice(-5) // Consider last 5 messages for context
    const lastMessage = messages[messages.length - 1]

    // Relevance: How relevant is this persona to the current topic?
    const relevance = this.calculateRelevance(persona, lastMessage, recentMessages)

    // Expertise: How much expertise does this persona have for the current discussion?
    const expertise = this.calculateExpertise(persona, lastMessage)

    // Participation: Balance participation to prevent domination
    const participation = this.calculateParticipationScore(persona, conversationId, allPersonas)

    // Flow: Natural conversation flow and turn-taking
    const flow = this.calculateFlowScore(persona, conversationId, messages)

    return { relevance, expertise, participation, flow }
  }

  private calculateRelevance(persona: Persona, lastMessage: Message, recentMessages: Message[]): number {
    if (!lastMessage) return 0.5

    let score = 0.5 // Base score

    // Check if persona was mentioned or addressed
    const content = lastMessage.content.toLowerCase()
    if (content.includes(persona.name.toLowerCase())) {
      score += 0.3
    }

    // Check if the topic matches persona's expertise
    const expertise = persona.background?.expertise || []
    for (const area of expertise) {
      if (content.includes(area.toLowerCase())) {
        score += 0.2
        break
      }
    }

    // Check if the conversation type aligns with persona role
    if (this.isRoleRelevant(persona.role, lastMessage.content)) {
      score += 0.2
    }

    return Math.min(score, 1.0)
  }

  private calculateExpertise(persona: Persona, lastMessage: Message): number {
    if (!lastMessage) return 0.5

    let score = 0.3 // Base expertise

    // Experience level contribution
    const experienceScores: Record<string, number> = {
      'Mastery': 1.0,
      'Senior': 0.8,
      'Entry': 0.5,
      'Limited': 0.3,
      'None': 0.1
    }
    score = experienceScores[persona.experience_level || 'Entry'] || 0.5

    // Check if the topic requires this persona's specific expertise
    const content = lastMessage.content.toLowerCase()

    // Domain-specific expertise detection
    if (persona.role.toLowerCase().includes('engineer') && this.isTechnicalContent(content)) {
      score += 0.2
    }
    if (persona.role.toLowerCase().includes('design') && this.isDesignContent(content)) {
      score += 0.2
    }
    if (persona.role.toLowerCase().includes('manager') && this.isBusinessContent(content)) {
      score += 0.2
    }
    if (persona.role.toLowerCase().includes('security') && this.isSecurityContent(content)) {
      score += 0.2
    }

    return Math.min(score, 1.0)
  }

  private calculateParticipationScore(
    persona: Persona,
    conversationId: string,
    allPersonas: Persona[]
  ): number {
    const participation = this.participationCount.get(conversationId) || new Map()
    const personaCount = participation.get(persona.id) || 0

    // Calculate average participation
    let totalCount = 0
    for (const p of allPersonas) {
      totalCount += participation.get(p.id) || 0
    }

    const avgCount = totalCount / allPersonas.length || 1

    // Lower score if this persona has spoken too much
    if (personaCount > avgCount * 1.5) {
      return 0.3 // Reduce priority for over-participation
    } else if (personaCount < avgCount * 0.5) {
      return 0.9 // Increase priority for under-participation
    } else {
      return 0.6 // Balanced participation
    }
  }

  private calculateFlowScore(
    persona: Persona,
    conversationId: string,
    messages: Message[]
  ): number {
    // Get the last AI message (not user message)
    const lastAIMessage = messages.filter(m => m.persona_id && m.role === 'assistant').pop()
    const lastSpeakerId = lastAIMessage?.persona_id

    // Avoid same speaker twice in a row (but only for AI messages)
    if (lastSpeakerId && lastSpeakerId === persona.id) {
      return 0.1
    }

    // Check for natural conversation patterns
    if (messages.length < 2) {
      return 0.5 // Neutral score for conversation start
    }

    // Favor alternating patterns in debates
    const recentSpeakers = messages.slice(-3).map(m => m.persona_id).filter(Boolean)
    const uniqueRecent = new Set(recentSpeakers).size

    if (uniqueRecent === 1 && !recentSpeakers.includes(persona.id)) {
      return 0.9 // High score to break monopoly
    }

    return 0.5 // Default flow score
  }

  private calculateWeightedScore(factors: {
    relevance: number
    expertise: number
    participation: number
    flow: number
  }): number {
    return (
      factors.relevance * this.weights.relevance +
      factors.expertise * this.weights.expertise +
      factors.participation * this.weights.participation +
      factors.flow * this.weights.flow
    )
  }

  private generateReasoning(persona: Persona, factors: any): string {
    const reasons = []

    if (factors.relevance > 0.7) {
      reasons.push(`${persona.name} is highly relevant to the current topic`)
    }
    if (factors.expertise > 0.7) {
      reasons.push(`${persona.name} has strong expertise in this area`)
    }
    if (factors.participation > 0.7) {
      reasons.push(`${persona.name} hasn't participated much yet`)
    }
    if (factors.flow > 0.7) {
      reasons.push(`It's natural for ${persona.name} to speak next`)
    }

    return reasons.join('; ') || `${persona.name} is the best choice based on overall factors`
  }

  private updateParticipation(conversationId: string, personaId: string): void {
    if (!this.participationCount.has(conversationId)) {
      this.participationCount.set(conversationId, new Map())
    }

    const participation = this.participationCount.get(conversationId)!
    const current = participation.get(personaId) || 0
    participation.set(personaId, current + 1)
  }

  // Helper methods for content analysis
  private isRoleRelevant(role: string, content: string): boolean {
    const roleLower = role.toLowerCase()
    const contentLower = content.toLowerCase()

    const roleKeywords: Record<string, string[]> = {
      engineer: ['code', 'technical', 'architecture', 'implementation', 'performance'],
      designer: ['user', 'experience', 'ux', 'interface', 'design', 'visual'],
      manager: ['business', 'strategy', 'roi', 'budget', 'timeline', 'priority'],
      security: ['security', 'vulnerability', 'encryption', 'authentication', 'compliance'],
      user: ['confused', 'help', 'easy', 'simple', 'understand']
    }

    for (const [key, keywords] of Object.entries(roleKeywords)) {
      if (roleLower.includes(key)) {
        return keywords.some(keyword => contentLower.includes(keyword))
      }
    }

    return false
  }

  private isTechnicalContent(content: string): boolean {
    const techKeywords = ['api', 'code', 'function', 'database', 'algorithm', 'performance', 'architecture']
    return techKeywords.some(keyword => content.includes(keyword))
  }

  private isDesignContent(content: string): boolean {
    const designKeywords = ['user', 'ux', 'ui', 'design', 'interface', 'experience', 'usability']
    return designKeywords.some(keyword => content.includes(keyword))
  }

  private isBusinessContent(content: string): boolean {
    const businessKeywords = ['cost', 'roi', 'business', 'strategy', 'market', 'customer', 'revenue']
    return businessKeywords.some(keyword => content.includes(keyword))
  }

  private isSecurityContent(content: string): boolean {
    const securityKeywords = ['security', 'auth', 'encrypt', 'vulnerability', 'threat', 'compliance']
    return securityKeywords.some(keyword => content.includes(keyword))
  }

  // Reset methods for managing conversation state
  reset(conversationId: string): void {
    this.messageHistory.delete(conversationId)
    this.lastSpeaker.delete(conversationId)
    this.participationCount.delete(conversationId)
  }

  resetAll(): void {
    this.messageHistory.clear()
    this.lastSpeaker.clear()
    this.participationCount.clear()
  }
}

// Export singleton instance
export const turnOrchestrator = new TurnOrchestrator()