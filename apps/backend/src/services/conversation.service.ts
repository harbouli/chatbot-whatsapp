import { Conversation, IMessage, IConversation, IPendingOrder } from '../models/Conversation';

export class ConversationService {
  
  /**
   * Get or create a conversation by session ID
   */
  async getOrCreateConversation(sessionId: string): Promise<IConversation> {
    let conversation = await Conversation.findOne({ sessionId });
    
    if (!conversation) {
      conversation = new Conversation({
        sessionId,
        messages: [],
        currentDiscount: 0,
        discountRequestCount: 0,
        discountEscalations: 0
      });
      await conversation.save();
    }
    
    return conversation;
  }

  /**
   * Add a message to a conversation
   */
  async addMessage(
    sessionId: string, 
    role: 'user' | 'assistant', 
    content: string,
    sources?: any[],
    messageId?: string
  ): Promise<IMessage> {
    const message: IMessage = {
      role,
      content,
      sources,
      timestamp: new Date(),
      messageId
    };

    await Conversation.findOneAndUpdate(
      { sessionId },
      { 
        $push: { messages: message },
        $setOnInsert: { sessionId, currentDiscount: 0, discountRequestCount: 0, discountEscalations: 0 }
      },
      { upsert: true, new: true }
    );

    return message;
  }

  /**
   * Get conversation history (limited to recent messages)
   */
  async getHistory(sessionId: string, limit: number = 10): Promise<IMessage[]> {
    const conversation = await Conversation.findOne({ sessionId });
    
    if (!conversation) {
      return [];
    }

    // Return the last N messages
    return conversation.messages.slice(-limit);
  }

  /**
   * Get full conversation for frontend
   */
  async getFullConversation(sessionId: string): Promise<IMessage[]> {
    const conversation = await Conversation.findOne({ sessionId });
    return conversation?.messages || [];
  }

  /**
   * Format conversation history for AI prompt
   */
  formatHistoryForPrompt(messages: IMessage[]): string {
    if (messages.length === 0) {
      return 'No previous conversation.';
    }

    return messages.map(msg => {
      const role = msg.role === 'user' ? 'Customer' : 'Sarah';
      return `${role}: ${msg.content}`;
    }).join('\n');
  }

  /**
   * Clear conversation history (optional utility)
   */
  async clearConversation(sessionId: string): Promise<void> {
    await Conversation.findOneAndUpdate(
      { sessionId },
      { $set: { messages: [], currentDiscount: 0, discountRequestCount: 0, discountEscalations: 0, pendingOrder: null } }
    );
  }

  /**
   * Get all sessions with metadata
   */
  async getAllSessions(): Promise<{
    sessionId: string;
    messageCount: number;
    lastMessageAt: Date | null;
    preview: string;
  }[]> {
    const conversations = await Conversation.find({}).sort({ updatedAt: -1 });
    
    return conversations.map(conv => {
      const lastMessage = conv.messages[conv.messages.length - 1];
      return {
        sessionId: conv.sessionId,
        messageCount: conv.messages.length,
        lastMessageAt: lastMessage?.timestamp || null,
        preview: lastMessage?.content?.substring(0, 50) || 'No messages'
      };
    });
  }

  /**
   * Create a new session
   */
  async createNewSession(): Promise<string> {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const conversation = new Conversation({
      sessionId,
      messages: [],
      currentDiscount: 0,
      discountRequestCount: 0,
      discountEscalations: 0
    });
    await conversation.save();
    return sessionId;
  }

  // ============ DISCOUNT MANAGEMENT ============

  /**
   * Get current discount state for a session
   */
  async getDiscountState(sessionId: string): Promise<{ currentDiscount: number; requestCount: number; escalations: number }> {
    const conversation = await Conversation.findOne({ sessionId });
    return {
      currentDiscount: conversation?.currentDiscount || 0,
      requestCount: conversation?.discountRequestCount || 0,
      escalations: conversation?.discountEscalations || 0
    };
  }

  /**
   * Increment discount (1% per request, max 10%)
   */
  async incrementDiscount(sessionId: string): Promise<number> {
    const conversation = await Conversation.findOne({ sessionId });
    const currentDiscount = conversation?.currentDiscount || 0;
    const newDiscount = Math.min(currentDiscount + 1, 10); // Max 10%

    await Conversation.findOneAndUpdate(
      { sessionId },
      { 
        $set: { currentDiscount: newDiscount },
        $inc: { discountRequestCount: 1 }
      }
    );

    return newDiscount;
  }

  /**
   * Increase escalation count
   */
  async incrementEscalationCount(sessionId: string): Promise<number> {
    const conversation = await Conversation.findOneAndUpdate(
      { sessionId },
      { $inc: { discountEscalations: 1 } },
      { new: true }
    );
    return conversation?.discountEscalations || 0;
  }

  /**
   * Set specific discount percentage (capped at 10)
   */
  async setDiscount(sessionId: string, percent: number): Promise<number> {
    // Ensure capped at 10%
    const finalDiscount = Math.min(Math.floor(percent), 10);
    
    await Conversation.findOneAndUpdate(
      { sessionId },
      { 
        $set: { currentDiscount: finalDiscount },
        $inc: { discountRequestCount: 1 } 
      }
    );
    
    return finalDiscount;
  }

  // ============ ORDER MANAGEMENT ============

  /**
   * Set pending order details
   */
  async setPendingOrder(sessionId: string, orderDetails: Partial<IPendingOrder>): Promise<void> {
    const conversation = await Conversation.findOne({ sessionId });
    const existingOrder = conversation?.pendingOrder || {};
    
    await Conversation.findOneAndUpdate(
      { sessionId },
      { 
        $set: { 
          pendingOrder: { ...existingOrder, ...orderDetails } 
        } 
      }
    );
  }

  /**
   * Get pending order for a session
   */
  async getPendingOrder(sessionId: string): Promise<IPendingOrder | null> {
    const conversation = await Conversation.findOne({ sessionId });
    return conversation?.pendingOrder || null;
  }

  /**
   * Confirm pending order
   */
  async confirmOrder(sessionId: string): Promise<IPendingOrder | null> {
    const conversation = await Conversation.findOne({ sessionId });
    if (!conversation?.pendingOrder) return null;

    await Conversation.findOneAndUpdate(
      { sessionId },
      { $set: { 'pendingOrder.confirmed': true } }
    );

    return { ...conversation.pendingOrder, confirmed: true };
  }

  /**
   * Clear pending order
   */
  async clearPendingOrder(sessionId: string): Promise<void> {
    await Conversation.findOneAndUpdate(
      { sessionId },
      { $unset: { pendingOrder: 1 } }
    );
  }
}
