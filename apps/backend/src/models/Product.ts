import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, default: 0 },
  inStock: { type: Boolean, default: true },
}, { timestamps: true });

// Virtual to check if product is available
productSchema.virtual('isAvailable').get(function() {
  return this.inStock && this.quantity > 0;
});

export const Product = mongoose.model('Product', productSchema);
