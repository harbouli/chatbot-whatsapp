import { VectorService } from './rag/vector.service';
import { ProductRagService } from './rag/product.service';
import { DiscountRagService } from './rag/discount.service';
import { OrderRagService } from './rag/order-rag.service';
import { ChatRagService } from './rag/chat-rag.service';

/**
 * Maintan compatibility with existing code by exporting a Facade
 */
export class RagService {
  private vectorService: VectorService;
  private productService: ProductRagService;
  private discountService: DiscountRagService;
  private orderService: OrderRagService;
  private chatService: ChatRagService;

  constructor() {
    this.vectorService = new VectorService();
    this.productService = new ProductRagService();
    this.discountService = new DiscountRagService();
    this.orderService = new OrderRagService();
    this.chatService = new ChatRagService(this.vectorService);
  }

  // Vector Delegation
  async generateEmbedding(text: string) {
    return this.vectorService.generateEmbedding(text);
  }

  async upsertVector(id: string, text: string, metadata: any) {
    return this.vectorService.upsertVector(id, text, metadata);
  }

  async searchSimilar(text: string, topK: number = 5) {
    return this.vectorService.searchSimilar(text, topK);
  }

  async deleteVector(id: string) {
    return this.vectorService.deleteVector(id);
  }

  async deleteVectors(ids: string[]) {
    return this.vectorService.deleteVectors(ids);
  }

  // Product Delegation
  async generateProductInquiryResponse(query: string, context: string, history: string = '', discount: number = 0) {
    return this.productService.generateProductInquiryResponse(query, context, history, discount);
  }

  // Discount Delegation
  async generateDiscountResponse(query: string, context: string, current: number, newDisc: number, max: boolean, history: string, just: boolean) {
    return this.discountService.generateDiscountResponse(query, context, current, newDisc, max, history, just);
  }

  async analyzeDiscountJustification(message: string) {
    return this.discountService.analyzeDiscountJustification(message);
  }

  async extractProposedPriceOrDiscount(message: string) {
    return this.discountService.extractProposedPriceOrDiscount(message);
  }

  // Order Delegation
  async generateOrderConfirmationResponse(query: string, pending: any, missing: string[], confirmed: boolean, history: string = '') {
    return this.orderService.generateOrderConfirmationResponse(query, pending, missing, confirmed, history);
  }

  async extractOrderDetails(message: string) {
    return this.orderService.extractOrderDetails(message);
  }

  async identifyProductFromHistory(history: string) {
    return this.orderService.identifyProductFromHistory(history);
  }

  // Chat Delegation
  async generateResponse(query: string, context: string, history: string = '') {
    return this.chatService.generateResponse(query, context, history);
  }

  async generateConversationalResponse(message: string, intent: string, history: string = '') {
    return this.chatService.generateConversationalResponse(message, intent, history);
  }
}
