import { Order, IOrder } from '../models/Order';
import { IPendingOrder } from '../models/Conversation';

export class OrderService {
  /**
   * Create a new order from pending order data
   */
  async createOrder(
    sessionId: string,
    pendingOrder: IPendingOrder,
    discountPercent: number = 0
  ): Promise<IOrder> {
    const order = new Order({
      sessionId,
      productId: pendingOrder.productId || 'unknown_product',
      productName: pendingOrder.productName || 'Unknown Product',
      originalPrice: pendingOrder.price || 0,
      discountedPrice: pendingOrder.discountedPrice || pendingOrder.price || 0,
      discountPercent,
      quantity: pendingOrder.quantity || 1,
      customerName: pendingOrder.customerName || '',
      customerPhone: pendingOrder.customerPhone || '',
      deliveryAddress: pendingOrder.deliveryAddress || '',
      status: 'confirmed'
    });

    try {
      const savedOrder = await order.save();
      return savedOrder;
    } catch (error) {
      console.error('[OrderService] Failed to save order:', error);
      throw error;
    }
  }

  /**
   * Get all orders
   */
  async getAllOrders(): Promise<IOrder[]> {
    return Order.find({}).sort({ createdAt: -1 });
  }

  /**
   * Get orders by session ID
   */
  async getOrdersBySession(sessionId: string): Promise<IOrder[]> {
    return Order.find({ sessionId }).sort({ createdAt: -1 });
  }

  /**
   * Get order by ID
   */
  async getOrderById(orderId: string): Promise<IOrder | null> {
    return Order.findById(orderId);
  }

  /**
   * Update order status
   */
  async updateOrderStatus(
    orderId: string,
    status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled'
  ): Promise<IOrder | null> {
    return Order.findByIdAndUpdate(
      orderId,
      { status },
      { new: true }
    );
  }
}
