import mongoose, { Document, Schema } from 'mongoose';

export interface IMessage {
  role: 'user' | 'assistant';
  content: string;
  sources?: any[];
  timestamp: Date;
  messageId?: string; // WhatsApp message ID for threading/replies
}

export interface IPendingOrder {
  productId?: string;
  productName?: string;
  price?: number;
  discountedPrice?: number;
  quantity?: number;
  customerName?: string;
  customerPhone?: string;
  deliveryAddress?: string;
  confirmed?: boolean;
}

export interface IConversation extends Document {
  sessionId: string;
  messages: IMessage[];
  currentDiscount: number;
  discountRequestCount: number;
  discountEscalations: number;
  pendingOrder?: IPendingOrder;
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IMessage>({
  role: { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, required: true },
  sources: { type: Schema.Types.Mixed },
  timestamp: { type: Date, default: Date.now },
  messageId: { type: String }
});

const pendingOrderSchema = new Schema<IPendingOrder>({
  productId: { type: String },
  productName: { type: String },
  price: { type: Number },
  discountedPrice: { type: Number },
  quantity: { type: Number, default: 1 },
  customerName: { type: String },
  customerPhone: { type: String },
  deliveryAddress: { type: String },
  confirmed: { type: Boolean, default: false }
}, { _id: false });

const conversationSchema = new Schema<IConversation>({
  sessionId: { type: String, required: true, unique: true, index: true },
  messages: [messageSchema],
  currentDiscount: { type: Number, default: 0 },
  discountRequestCount: { type: Number, default: 0 },
  discountEscalations: { type: Number, default: 0 },
  pendingOrder: { type: pendingOrderSchema }
}, {
  timestamps: true
});

export const Conversation = mongoose.model<IConversation>('Conversation', conversationSchema);
