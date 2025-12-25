import mongoose, { Document, Schema } from 'mongoose';

export interface ISystemPrompt extends Document {
  name: string;
  key: string;  // unique identifier like 'sales', 'greeting', 'discount'
  content: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SystemPromptSchema = new Schema<ISystemPrompt>(
  {
    name: { type: String, required: true },
    key: { type: String, required: true, unique: true },
    content: { type: String, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model<ISystemPrompt>('SystemPrompt', SystemPromptSchema);
