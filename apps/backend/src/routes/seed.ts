import express from 'express';
import { Product } from '../models/Product';
import { RagService } from '../services/rag.service';

const router = express.Router();
const ragService = new RagService();

const sampleProducts = [
  {
    name: "Running Shoes",
    description: "High-performance running shoes with breathable mesh and cushioned sole.",
    price: 99.99
  },
  {
    name: "Wireless Headphones",
    description: "Noise-cancelling wireless headphones with 20-hour battery life.",
    price: 149.99
  },
  {
    name: "Smart Watch",
    description: "Fitness tracker with heart rate monitor and GPS.",
    price: 199.99
  }
];

router.post('/', async (req, res) => {
  try {
    // Clear existing products (optional, for demo)
    await Product.deleteMany({});
    
    // Insert new products
    const products = await Product.insertMany(sampleProducts);
    
    // Generate embeddings and upload to Pinecone
    for (const product of products) {
      const textToEmbed = `${product.name}: ${product.description}`;
      await ragService.upsertVector(
        product._id.toString(),
        textToEmbed,
        {
          name: product.name,
          price: product.price
        }
      );
    }
    
    res.json({ message: 'Database seeded successfully', products });
  } catch (error) {
    console.error('Seeding error:', error);
    res.status(500).json({ error: 'Failed to seed database' });
  }
});

export default router;
