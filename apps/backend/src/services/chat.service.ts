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
    const discountState = await this.conversationService.getDiscountState(sessionId);
    const escalations = discountState.escalations || 0;
    
    // Check justification
    const isJustified = await this.ragService.analyzeDiscountJustification(message);
    
    let newDiscount = currentDiscount;
    let isMaxDiscount = false;
    let incrementApplied = false;

    // Check if user proposed specific price
    const proposal = await this.ragService.extractProposedPriceOrDiscount(message);
    
    if (proposal) {
        // ... (User proposed logic - simplified for now, priority is flow)
        if (proposal.type === 'percent') {
           newDiscount = Math.min(proposal.value, 10);
           incrementApplied = true;
        }
        // TODO: existing sophisticated price logic can remain or be simplified
    } else {
        // AUTO-NEGOTIATION LOGIC
        
        if (currentDiscount === 0) {
            if (isJustified) {
                // PHASE 2: Initial Offer (2%)
                newDiscount = 2;
                incrementApplied = true;
            } else {
                // PHASE 1: Value Sell (0% - hold firm first time)
                newDiscount = 0;
            }
        } else {
            // Already has discount, asking for more
            if (escalations < 2) {
                // PHASE 3: Allow escalation
                newDiscount = Math.min(currentDiscount + 2, 5); // Increment by up to 2%, soft cap 5%
                incrementApplied = true;
            } else {
                // PHASE 4: Hard limit or max escalations reached
                // Check if we can do one final tiny bump to 5% if below
                if (currentDiscount < 5) {
                    newDiscount = 5;
                    incrementApplied = true;
                } else {
                    newDiscount = currentDiscount; // Stay same
                    isMaxDiscount = true;
                }
            }
        }
    }
    
    // Hard cap at 10% regardless
    if (newDiscount > 10) newDiscount = 10;
    if (newDiscount === 10) isMaxDiscount = true;
    
    // Update state if changed
    if (newDiscount > currentDiscount) {
        if (incrementApplied) {
             await this.conversationService.incrementEscalationCount(sessionId);
        }
        await this.conversationService.setDiscount(sessionId, newDiscount);
    }
    
    const searchResults = await this.ragService.searchSimilar(message);
    
    let context = searchResults
      .map(match => {
        const metadata = match.metadata as any;
        const originalPrice = Math.round(metadata.price * 10);
        const discountedPrice = this.applyDiscount(originalPrice, newDiscount);
        return `${metadata.name}: ${originalPrice.toLocaleString()} MAD → ${discountedPrice.toLocaleString()} MAD (with ${newDiscount}% discount)`;
      })
      .join('\n');
      
     const pendingOrder = await this.conversationService.getPendingOrder(sessionId);
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
      historyText,
      isJustified
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
         
         // Only overwrite if we clearly have a NEW, DIFFERENT product identified, or if we have no pending order
         // If the user says "Yes", identifiedProduct might match the *current* product. We shouldn't reset quantity etc. if it's the same.
         const isDifferentProduct = pendingOrder && pendingOrder.productName && 
            !identifiedProduct.toLowerCase().includes(pendingOrder.productName.toLowerCase()) && 
            !pendingOrder.productName.toLowerCase().includes(identifiedProduct.toLowerCase());

         if (!pendingOrder || isDifferentProduct) {
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
      await this.conversationService.confirmOrder(sessionId);
      const savedOrder = await this.orderService.createOrder(
        sessionId,
        pendingOrder,
        currentDiscount
      );
      
      const verifiedOrder = await this.orderService.getOrderById(savedOrder._id.toString());
      if (!verifiedOrder) {
        throw new Error('Order persistence failed');
      }

      await this.conversationService.clearPendingOrder(sessionId);
      
      orderStatus = { 
        pending: false, 
        confirmed: true,
        orderId: savedOrder._id.toString()
      };
    } else {
      orderStatus = { pending: true, confirmed: false };
    }
    
    const orderConfirmed = !!(orderStatus && orderStatus.confirmed);

    const response = await this.ragService.generateOrderConfirmationResponse(
      message,
      pendingOrder,
      missingFields,
      orderConfirmed, // Pass confirmation status
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
    
    // Modifying logic: Do NOT auto-save in handleOrderDetails anymore.
    // Instead, if fields are complete, we ask for confirmation.
    
    if (missingFields.length === 0 && pendingOrder) {
      // Full details available, but wait for confirmation
      orderStatus = { pending: true, confirmed: false };
    } else {
      orderStatus = { pending: true, confirmed: false };
    }
    
    // In handleOrderDetails, orderConfirmed is ALWAYS false because we are just collecting details.
    const orderConfirmed = false;

    const response = await this.ragService.generateOrderConfirmationResponse(
      message,
      pendingOrder,
      missingFields,
      orderConfirmed, // Always false here to force confirmation prompt
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
    // We should also check for productId if strictly required, but productName usually implies it.
    // However, to be safe:
    if (!pendingOrder?.productId && !pendingOrder?.productName) missingFields.push('product');
    if (!pendingOrder?.customerName) missingFields.push('name');
    if (!pendingOrder?.customerPhone) missingFields.push('phone');
    if (!pendingOrder?.deliveryAddress) missingFields.push('address');
    return missingFields;
  }

  /**
   * Main chat processing method
   */
  async processMessage(message: string, sessionId?: string, messageId?: string): Promise<ChatResponse> {
    const currentSessionId = sessionId || `session_${Date.now()}`;

    // 1. Get conversation history
    const history = await this.conversationService.getHistory(currentSessionId, 10);
    const historyText = this.conversationService.formatHistoryForPrompt(history);
    
    // 2. Save user message to history
    await this.conversationService.addMessage(currentSessionId, 'user', message, undefined, messageId);
    
    // 3. Get session state (discount & pending order)
    const discountState = await this.conversationService.getDiscountState(currentSessionId);
    const pendingOrder = await this.conversationService.getPendingOrder(currentSessionId);
    
    // Construct context description for intent analysis
    let contextDescription = "";
    if (discountState.currentDiscount > 0) {
      contextDescription += `Active Discount: ${discountState.currentDiscount}%. `;
    }
    
    if (pendingOrder) {
      const missingFields = this.getMissingOrderFields(pendingOrder);
      if (missingFields.length > 0) {
         contextDescription += `Pending Order: User confirmed "${pendingOrder.productName}". AI is currently waiting for: ${missingFields.join(", ")}. `;
      } else {
         contextDescription += `Pending Order: Ready for final confirmation. waiting for user to say "yes" or "confirm". `;
      }
    }

    // 4. Analyze message intent with context
    const intent = await this.intentService.analyzeIntent(message, historyText, contextDescription);
    
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
