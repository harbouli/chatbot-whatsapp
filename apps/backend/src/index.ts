import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import chatRouter from './routes/chat';
import seedRouter from './routes/seed';
import productRouter from './routes/products';
import whatsappRouter from './routes/whatsapp';
import settingsRouter from './routes/settings';
import { getWhatsAppService } from './services/whatsapp.service';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/rag_chatbot';

app.use(cors());
app.use(express.json());

// Routes
app.use('/chat', chatRouter);
app.use('/seed', seedRouter);
app.use('/products', productRouter);
app.use('/whatsapp', whatsappRouter);
app.use('/settings', settingsRouter);

app.get('/health', (req, res) => {
  res.send('OK');
});

// Connect to MongoDB
mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    
    // Auto-connect WhatsApp service on startup
    try {
      const whatsappService = getWhatsAppService();
      await whatsappService.connect();
    } catch (error) {
      console.error('WhatsApp auto-connect failed:', error);
    }
    
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
  });
