import { RagService } from './rag.service';
import { IntentService, MessageIntent } from './intent.service';
import { ConversationService } from './conversation.service';
import { OrderService } from './order.service';
import { IPendingOrder } from '../models/Conversation';

// Response type for chat processing
export interface ChatResponse {
  response: string;
  sources: any[];
  sessionId: string;
  intent: {
    type: string;
    requiresProducts: boolean;
  };
  discount?: {
    current: number;
    applied: boolean;
  };
  order?: {
    pending: boolean;
    confirmed: boolean;
    orderId?: string;
  };
}

export class ChatService {
  private ragService: RagService;
  private intentService: IntentService;
  private conversationService: ConversationService;
  private orderService: OrderService;

  constructor() {
    this.ragService = new RagService();
    this.intentService = new IntentService();
    this.conversationService = new ConversationService();
    this.orderService = new OrderService();
  }

  /**
   * Calculate discounted price
   */
  private applyDiscount(price: number, discountPercent: number): number {
    return Math.round(price * (1 - discountPercent / 100));
  }


  /**
   * Handle product inquiry or recommendation intent
   */
  private async handleProductInquiry(
    message: string,
    historyText: string,
    currentDiscount: number
  ): Promise<{ response: string; sources: any[]; discountInfo?: { current: number; applied: boolean } }> {
    const searchResults = await this.ragService.searchSimilar(message);
    
    const context = searchResults
      .map(match => {
        const metadata = match.metadata as any;
        const originalPrice = Math.round(metadata.price * 10);
        const discountedPrice = currentDiscount > 0 
          ? this.applyDiscount(originalPrice, currentDiscount)
          : originalPrice;
        
        return `Product: ${metadata.name}
Description: ${metadata.text}
Original Price: ${originalPrice.toLocaleString()} MAD${currentDiscount > 0 ? `
Discounted Price (${currentDiscount}% off): ${discountedPrice.toLocaleString()} MAD` : ''}`;
      })
      .join('\n\n');
    
    const response = await this.ragService.generateProductInquiryResponse(
      message, 
      context, 
      historyText,
      currentDiscount
    );
    
    const sources = searchResults.map(match => {
      const metadata = match.metadata as any;
      const originalPrice = Math.round(metadata.price * 10);
      const discountedPrice = currentDiscount > 0 
        ? this.applyDiscount(originalPrice, currentDiscount)
        : originalPrice;
      return {
        ...metadata,
        price: discountedPrice,
        originalPrice: originalPrice,
        currency: 'MAD',
        discountApplied: currentDiscount
      };
    });
    
    const discountInfo = currentDiscount > 0 
      ? { current: currentDiscount, applied: true }
      : undefined;
    
    return { response, sources, discountInfo };
  }

  /**
   * Handle discount request intent
   */
  private async handleDiscountRequest(
    message: string,
    sessionId: string,
    currentDiscount: number,
    historyText: string
  ): Promise<{ response: string; discountInfo: { current: number; applied: boolean } }> {
    // Check if user proposed a specific price or discount
    const proposal = await this.ragService.extractProposedPriceOrDiscount(message);
    const pendingOrder = await this.conversationService.getPendingOrder(sessionId);
    
    let newDiscount = currentDiscount + 1; // Default: increment by 1%
    
    if (proposal) {
       if (proposal.type === 'percent') {
          // If valid percentage (<= 10%), use it. If > 10, set to max (10).
          newDiscount = Math.min(proposal.value, 10);
       } else if (proposal.type === 'price' && pendingOrder && pendingOrder.price) {
          // Calculate implied discount: (Original - Proposed) / Original * 100
          const original = pendingOrder.price;
          const proposed = proposal.value;
          const impliedPercent = ((original - proposed) / original) * 100;
          
          if (impliedPercent > 0) {
             // If implied discount is reasonable (<= 10%), accept it.
             // If user asks for too much (e.g. 20%), we cap at 10%.
             newDiscount = Math.min(Math.round(impliedPercent), 10);
          }
       }
       
       await this.conversationService.setDiscount(sessionId, newDiscount);
    } else {
       newDiscount = await this.conversationService.incrementDiscount(sessionId);
    }
    
    const isMaxDiscount = newDiscount >= 10;
    
    const searchResults = await this.ragService.searchSimilar(message);
    
    // Get pending order to preserve context of what we are talking about
    // (Already fetched above)
    
    let context = searchResults
      .map(match => {
        const metadata = match.metadata as any;
        const originalPrice = Math.round(metadata.price * 10);
        const discountedPrice = this.applyDiscount(originalPrice, newDiscount);
        return `${metadata.name}: ${originalPrice.toLocaleString()} MAD → ${discountedPrice.toLocaleString()} MAD (with ${newDiscount}% discount)`;
      })
      .join('\n');

    // If we have a pending order but search didn't find relevant products (e.g. user said "more discount"),
    // implicitly add the pending product to context so AI knows the price.
    if (pendingOrder && pendingOrder.productName && pendingOrder.price) {
      const pPrice = pendingOrder.price;
      const pDiscounted = this.applyDiscount(pPrice, newDiscount);
      const pendingContext = `\nCURRENTLY NEGOTIATING: ${pendingOrder.productName}: ${pPrice.toLocaleString()} MAD → ${pDiscounted.toLocaleString()} MAD (with ${newDiscount}% discount)`;
      context += pendingContext;
    }
    
    const response = await this.ragService.generateDiscountResponse(
      message,
      context,
      currentDiscount,
      newDiscount,
      isMaxDiscount,
      historyText
    );
    
    return { 
      response, 
      discountInfo: { current: newDiscount, applied: true } 
    };
  }

  /**
   * Handle order confirmation intent
   */
  private async handleOrderConfirmation(
    message: string,
    sessionId: string,
    currentDiscount: number,
    historyText: string
  ): Promise<{ response: string; orderStatus: { pending: boolean; confirmed: boolean } }> {
    let pendingOrder = await this.conversationService.getPendingOrder(sessionId);
    
    // Check if we need to switch product context based on conversation history
    const identifiedProduct = await this.ragService.identifyProductFromHistory(historyText);
    
    // If a product is identified from history and it's DIFFERENT from pending, update it.
    // Or if no pending order exists, try to set it from identified product.
    if (identifiedProduct) {
       // Search for this specific product to get metadata
       const hits = await this.ragService.searchSimilar(identifiedProduct, 1);
       if (hits.length > 0) {
         const top = hits[0].metadata as any;
         // If we don't have a pending order OR the identified product is clearly different (simple string check or if ID differs)
         if (!pendingOrder || (pendingOrder.productName && !identifiedProduct.includes(pendingOrder.productName) && !pendingOrder.productName.includes(identifiedProduct))) {
            const originalPrice = Math.round(top.price * 10);
            const discountedPrice = currentDiscount > 0 
                ? this.applyDiscount(originalPrice, currentDiscount)
                : originalPrice;
            
            pendingOrder = {
              productId: hits[0].id,
              productName: top.name,
              price: originalPrice,
              discountedPrice: discountedPrice,
              quantity: 1
            };
            await this.conversationService.setPendingOrder(sessionId, pendingOrder);
         }
       }
    }

    if (!pendingOrder) {
      // Fallback: search similar to the current message if history didn't help (rare)
      const searchResults = await this.ragService.searchSimilar(message);
      if (searchResults.length > 0) {
        const topProduct = searchResults[0].metadata as any;
        const originalPrice = Math.round(topProduct.price * 10);
        const discountedPrice = currentDiscount > 0 
          ? this.applyDiscount(originalPrice, currentDiscount)
          : originalPrice;
        
        pendingOrder = {
          productId: searchResults[0].id,
          productName: topProduct.name,
          price: originalPrice,
          discountedPrice: discountedPrice,
          quantity: 1
        };
        await this.conversationService.setPendingOrder(sessionId, pendingOrder);
      }
    }
    
    const missingFields = this.getMissingOrderFields(pendingOrder);
    
    let orderStatus: { pending: boolean; confirmed: boolean; orderId?: string };

    if (missingFields.length === 0 && pendingOrder) {
      // Final confirmation: Ensure we have all logic to creating the order
      await this.conversationService.confirmOrder(sessionId);
      
      const savedOrder = await this.orderService.createOrder(
        sessionId,
        pendingOrder,
        currentDiscount
      );
      
      await this.conversationService.clearPendingOrder(sessionId);
      
      orderStatus = { 
        pending: false, 
        confirmed: true,
        orderId: savedOrder._id.toString()
      };
      
      console.log('Order saved to database (confirmation intent):', savedOrder._id);
    } else {
      orderStatus = { pending: true, confirmed: false };
    }
    
    const response = await this.ragService.generateOrderConfirmationResponse(
      message,
      pendingOrder,
      missingFields,
      historyText
    );
    
    return { response, orderStatus };
  }

  /**
   * Handle order details intent
   */
  private async handleOrderDetails(
    message: string,
    sessionId: string,
    currentDiscount: number,
    historyText: string
  ): Promise<{ response: string; orderStatus: { pending: boolean; confirmed: boolean; orderId?: string } }> {
    // extractOrderDetails is now async and uses LLM
    const extractedDetails = await this.ragService.extractOrderDetails(message);
    
    if (Object.keys(extractedDetails).length > 0) {
      await this.conversationService.setPendingOrder(sessionId, extractedDetails);
    }
    
    const pendingOrder = await this.conversationService.getPendingOrder(sessionId);
    const missingFields = this.getMissingOrderFields(pendingOrder);
    
    let orderStatus: { pending: boolean; confirmed: boolean; orderId?: string };
    
    if (missingFields.length === 0 && pendingOrder) {
      // Final confirmation: Ensure we have all logic to creating the order
      await this.conversationService.confirmOrder(sessionId);
      
      const savedOrder = await this.orderService.createOrder(
        sessionId,
        pendingOrder,
        currentDiscount
      );
      
      await this.conversationService.clearPendingOrder(sessionId);
      
      orderStatus = { 
        pending: false, 
        confirmed: true,
        orderId: savedOrder._id.toString()
      };
      
      console.log('Order saved to database:', savedOrder._id);
    } else {
      orderStatus = { pending: true, confirmed: false };
    }
    
    const response = await this.ragService.generateOrderConfirmationResponse(
      message,
      pendingOrder,
      missingFields,
      historyText
    );
    
    return { response, orderStatus };
  }

  /**
   * Get missing fields for order
   */
  private getMissingOrderFields(pendingOrder: IPendingOrder | null): string[] {
    const missingFields: string[] = [];
    if (!pendingOrder?.productName) missingFields.push('product selection');
    if (!pendingOrder?.customerName) missingFields.push('name');
    if (!pendingOrder?.customerPhone) missingFields.push('phone');
    if (!pendingOrder?.deliveryAddress) missingFields.push('address');
    return missingFields;
  }

  /**
   * Main chat processing method
   */
  async processMessage(message: string, sessionId?: string): Promise<ChatResponse> {
    const currentSessionId = sessionId || `session_${Date.now()}`;

    // 1. Get conversation history
    const history = await this.conversationService.getHistory(currentSessionId, 10);
    const historyText = this.conversationService.formatHistoryForPrompt(history);
    
    // 2. Save user message to history
    await this.conversationService.addMessage(currentSessionId, 'user', message);
    
    // 3. Analyze message intent
    const intent = await this.intentService.analyzeIntent(message);
    console.log('Message intent:', intent);
    
    // 4. Get discount state
    const discountState = await this.conversationService.getDiscountState(currentSessionId);
    
    let response: string;
    let sources: any[] = [];
    let discountInfo: { current: number; applied: boolean } | undefined;
    let orderStatus: { pending: boolean; confirmed: boolean; orderId?: string } | undefined;
    
    // 5. Generate response based on intent
    switch (intent.type) {
      case 'product_inquiry':
      case 'recommendation': {
        const result = await this.handleProductInquiry(
          message, 
          historyText, 
          discountState.currentDiscount
        );
        response = result.response;
        sources = result.sources;
        discountInfo = result.discountInfo;
        break;
      }
      
      case 'discount_request': {
        const result = await this.handleDiscountRequest(
          message,
          currentSessionId,
          discountState.currentDiscount,
          historyText
        );
        response = result.response;
        discountInfo = result.discountInfo;
        break;
      }
      
      case 'order_confirmation': {
        const result = await this.handleOrderConfirmation(
          message,
          currentSessionId,
          discountState.currentDiscount,
          historyText
        );
        response = result.response;
        orderStatus = result.orderStatus;
        break;
      }
      
      case 'order_details': {
        const result = await this.handleOrderDetails(
          message,
          currentSessionId,
          discountState.currentDiscount,
          historyText
        );
        response = result.response;
        orderStatus = result.orderStatus;
        break;
      }
      
      default: {
        response = await this.ragService.generateConversationalResponse(
          message, 
          intent.type, 
          historyText
        );
      }
    }
    
    // 6. Save assistant response to history
    await this.conversationService.addMessage(currentSessionId, 'assistant', response, sources);
    
    return {
      response,
      sources,
      sessionId: currentSessionId,
      intent: {
        type: intent.type,
        requiresProducts: intent.requiresProducts
      },
      discount: discountInfo,
      order: orderStatus
    };
  }

  // ============ DELEGATED METHODS ============

  async getAllSessions() {
    return this.conversationService.getAllSessions();
  }

  async createNewSession() {
    return this.conversationService.createNewSession();
  }

  async getConversationHistory(sessionId: string) {
    return this.conversationService.getFullConversation(sessionId);
  }

  async clearConversation(sessionId: string) {
    return this.conversationService.clearConversation(sessionId);
  }

  async getAllOrders() {
    return this.orderService.getAllOrders();
  }

  async getOrdersBySession(sessionId: string) {
    return this.orderService.getOrdersBySession(sessionId);
  }
}
