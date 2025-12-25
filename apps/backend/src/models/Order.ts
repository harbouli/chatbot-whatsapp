import mongoose, { Document, Schema } from 'mongoose';

export interface IOrder extends Document {
  sessionId: string;
  productId: string;
  productName: string;
  originalPrice: number;
  discountedPrice: number;
  discountPercent: number;
  quantity: number;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

const orderSchema = new Schema<IOrder>({
  sessionId: { type: String, required: true, index: true },
  productId: { type: String, required: true },
  productName: { type: String, required: true },
  originalPrice: { type: Number, required: true },
  discountedPrice: { type: Number, required: true },
  discountPercent: { type: Number, default: 0 },
  quantity: { type: Number, default: 1 },
  customerName: { type: String, required: true },
  customerPhone: { type: String, required: true },
  deliveryAddress: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'],
    default: 'confirmed'
  }
}, {
  timestamps: true
});

export const Order = mongoose.model<IOrder>('Order', orderSchema);
