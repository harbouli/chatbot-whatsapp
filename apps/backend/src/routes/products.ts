import express from 'express';
import { Product } from '../models/Product';
import { RagService } from '../services/rag.service';

const router = express.Router();
const ragService = new RagService();

// GET all products
router.get('/', async (req, res) => {
  try {
    const products = await Product.find().sort({ _id: -1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// GET single product
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// POST new product
router.post('/', async (req, res) => {
  try {
    const { name, description, price, quantity = 0 } = req.body;
    const product = new Product({ 
      name, 
      description, 
      price, 
      quantity,
      inStock: quantity > 0
    });
    await product.save();

    // Sync with Vector DB (include quantity info)
    const textToEmbed = `${name}: ${description}. Stock: ${quantity > 0 ? 'Available' : 'Out of stock'}`;
    await ragService.upsertVector(
      product._id.toString(),
      textToEmbed,
      { name, description, price, quantity, inStock: quantity > 0 }
    );

    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// PUT (update) product
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, quantity } = req.body;
    
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = price;
    if (quantity !== undefined) {
      updateData.quantity = quantity;
      updateData.inStock = quantity > 0;
    }
    
    const product = await Product.findByIdAndUpdate(id, updateData, { new: true });
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Sync with Vector DB (include quantity info)
    const textToEmbed = `${product.name}: ${product.description}. Stock: ${product.quantity > 0 ? 'Available' : 'Out of stock'}`;
    await ragService.upsertVector(
      id,
      textToEmbed,
      { 
        name: product.name, 
        description: product.description, 
        price: product.price,
        quantity: product.quantity,
        inStock: product.inStock
      }
    );

    res.json(product);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// PATCH update quantity only
router.patch('/:id/quantity', async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;
    
    if (quantity === undefined || quantity < 0) {
      return res.status(400).json({ error: 'Invalid quantity' });
    }
    
    const product = await Product.findByIdAndUpdate(
      id,
      { quantity, inStock: quantity > 0 },
      { new: true }
    );
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Sync with Vector DB
    const textToEmbed = `${product.name}: ${product.description}. Stock: ${quantity > 0 ? 'Available' : 'Out of stock'}`;
    await ragService.upsertVector(
      id,
      textToEmbed,
      { 
        name: product.name, 
        description: product.description, 
        price: product.price,
        quantity: product.quantity,
        inStock: product.inStock
      }
    );

    res.json(product);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update quantity' });
  }
});

// DELETE product
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const product = await Product.findByIdAndDelete(id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Delete from Vector DB
    try {
      await ragService.deleteVector(id);
    } catch (vectorError) {
      // Continue anyway - product is deleted from MongoDB
    }

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// POST sync all products to vector DB
router.post('/sync', async (req, res) => {
  try {
    const products = await Product.find();
    
    for (const product of products) {
      const textToEmbed = `${product.name}: ${product.description}. Stock: ${product.quantity > 0 ? 'Available' : 'Out of stock'}`;
      await ragService.upsertVector(
        product._id.toString(),
        textToEmbed,
        { 
          name: product.name, 
          description: product.description,
          price: product.price,
          quantity: product.quantity,
          inStock: product.inStock
        }
      );
    }

    res.json({ message: `Synced ${products.length} products to vector database` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to sync products' });
  }
});

export default router;
