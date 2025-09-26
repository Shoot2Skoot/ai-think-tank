import { ChatOpenAI } from '@langchain/openai'
import { AIMessage, HumanMessage, SystemMessage, BaseMessage } from '@langchain/core/messages'
import type { MockResponse } from '@/types'

// Mock responses for different persona types
const mockResponses: Record<string, string[]> = {
  'senior-engineer': [
    'From an architectural perspective, we should consider scalability from day one. I suggest implementing a microservices pattern with clear service boundaries.',
    'Looking at the code, I see a potential performance issue here. We could optimize this by implementing caching at the database level.',
    'Based on my experience, this approach has worked well in production environments. However, we need to consider the maintenance overhead.',
    'The security implications here are significant. We should implement proper input validation and use parameterized queries.',
    'I recommend using established design patterns here. The Observer pattern would be ideal for this use case.',
  ],
  'ux-designer': [
    'From a user experience perspective, we need to simplify this flow. Users shouldn\'t need more than 3 clicks to complete this action.',
    'The visual hierarchy here needs work. The primary action should be more prominent, and we should reduce cognitive load.',
    'Based on user research, I\'ve found that this pattern confuses users. Let\'s consider a progressive disclosure approach instead.',
    'Accessibility is crucial here. We need to ensure proper color contrast and keyboard navigation support.',
    'The mobile experience needs to be our priority. 60% of users will access this on their phones.',
  ],
  'product-manager': [
    'Let\'s align this with our Q2 objectives. The business value here is clear - we can increase conversion by 15%.',
    'From a prioritization standpoint, we should focus on the MVP features first. We can iterate based on user feedback.',
    'The ROI calculation shows this feature would pay for itself within 3 months. I recommend we move forward.',
    'We need to consider the competitive landscape. Our main competitors already offer this functionality.',
    'Based on user interviews, this is the top requested feature. It directly addresses customer pain points.',
  ],
  'security-expert': [
    'This poses a significant security risk. We need to implement proper authentication and authorization checks.',
    'From a compliance perspective, we need to ensure GDPR compliance for EU users. Data encryption is mandatory.',
    'The threat model shows several attack vectors here. We should implement rate limiting and input sanitization.',
    'Zero-trust architecture would be appropriate here. Never trust, always verify.',
    'We need to implement proper logging and monitoring. Security incidents need to be detectable within minutes.',
  ],
  'end-user': [
    'As a user, I find this confusing. Can we make it simpler? I don\'t understand all these technical options.',
    'This is exactly what I\'ve been looking for! It would save me so much time in my daily workflow.',
    'I\'m concerned about my data privacy. How do I know my information is secure?',
    'The loading time is really frustrating. I almost gave up waiting for the page to load.',
    'Can you add a dark mode? I use this late at night and the bright screen hurts my eyes.',
  ],
  'default': [
    'That\'s an interesting perspective. Let me consider the implications.',
    'Building on that point, we should also think about long-term maintenance.',
    'I agree with the general direction, but we need to address some edge cases.',
    'From my experience, this approach has both advantages and challenges.',
    'Let\'s make sure we\'re considering all stakeholders in this decision.',
  ]
}

export class MockLangChainProvider {
  private responses: Map<string, string[]>
  private responseIndex: Map<string, number> = new Map()
  private useMockDelay: boolean
  private costPerMessage: number = 0.0001 // $0.0001 per message for testing

  constructor(useMockDelay: boolean = true) {
    this.responses = new Map(Object.entries(mockResponses))
    this.useMockDelay = useMockDelay
  }

  async invoke(messages: BaseMessage[], options?: any): Promise<AIMessage> {
    const personaId = this.extractPersonaId(messages)
    const personaType = this.getPersonaType(personaId)
    const responses = this.responses.get(personaType) || this.responses.get('default')!

    const index = this.responseIndex.get(personaId) || 0
    const response = responses[index % responses.length]
    this.responseIndex.set(personaId, index + 1)

    // Simulate realistic delay
    if (this.useMockDelay) {
      await this.simulateDelay()
    }

    // Add some context awareness
    const contextAwareResponse = this.addContextAwareness(response, messages)

    return new AIMessage({
      content: contextAwareResponse,
      response_metadata: {
        model: 'mock-model',
        usage: {
          prompt_tokens: 100,
          completion_tokens: 50,
          total_tokens: 150,
        },
        cost: this.costPerMessage,
        provider: 'mock'
      }
    })
  }

  async stream(messages: BaseMessage[], options?: any) {
    const response = await this.invoke(messages, options)
    const content = response.content.toString()

    // Simulate streaming by yielding chunks
    async function* generateChunks() {
      const words = content.split(' ')
      for (const word of words) {
        yield new AIMessage({ content: word + ' ' })
        await new Promise(resolve => setTimeout(resolve, 50)) // 50ms between words
      }
    }

    return generateChunks()
  }

  private extractPersonaId(messages: BaseMessage[]): string {
    // Extract persona ID from system message or metadata
    const systemMessage = messages.find(msg => msg._getType() === 'system')
    if (systemMessage && systemMessage.content) {
      // Try to extract persona ID from content
      const match = systemMessage.content.toString().match(/persona_id: (\w+)/)
      if (match) return match[1]
    }
    return 'default'
  }

  private getPersonaType(personaId: string): string {
    // Map persona ID to type for mock responses
    if (personaId.includes('engineer')) return 'senior-engineer'
    if (personaId.includes('designer')) return 'ux-designer'
    if (personaId.includes('manager')) return 'product-manager'
    if (personaId.includes('security')) return 'security-expert'
    if (personaId.includes('user')) return 'end-user'
    return 'default'
  }

  private async simulateDelay() {
    const delay = 500 + Math.random() * 1500 // 0.5-2s
    await new Promise(resolve => setTimeout(resolve, delay))
  }

  private addContextAwareness(baseResponse: string, messages: BaseMessage[]): string {
    // Add some context awareness based on recent messages
    const lastUserMessage = [...messages].reverse().find(msg => msg._getType() === 'human')

    if (!lastUserMessage) return baseResponse

    const userContent = lastUserMessage.content.toString().toLowerCase()

    // Add relevant prefixes based on context
    if (userContent.includes('agree')) {
      return `I appreciate that perspective. ${baseResponse}`
    }
    if (userContent.includes('disagree') || userContent.includes('but')) {
      return `I understand your concern. However, ${baseResponse}`
    }
    if (userContent.includes('?')) {
      return `That's a great question. ${baseResponse}`
    }
    if (userContent.includes('cost') || userContent.includes('budget')) {
      return `Regarding the cost implications, ${baseResponse}`
    }
    if (userContent.includes('urgent') || userContent.includes('asap')) {
      return `Given the urgency, ${baseResponse}`
    }

    return baseResponse
  }

  // Method to set custom responses for testing
  setCustomResponses(personaType: string, responses: string[]) {
    this.responses.set(personaType, responses)
  }

  // Method to reset response indices
  reset() {
    this.responseIndex.clear()
  }
}

// Export a singleton instance for development
export const mockProvider = new MockLangChainProvider()