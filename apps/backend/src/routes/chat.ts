import express from 'express';
import { ChatService } from '../services/chat.service';

const router = express.Router();
const chatService = new ChatService();

// Get all sessions
router.get('/sessions', async (req, res) => {
  try {
    const sessions = await chatService.getAllSessions();
    res.json({ sessions });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ error: 'Failed to get sessions' });
  }
});

// Create new session
router.post('/sessions', async (req, res) => {
  try {
    const sessionId = await chatService.createNewSession();
    res.json({ sessionId });
  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// Get conversation history
router.get('/history/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const messages = await chatService.getConversationHistory(sessionId);
    res.json({ messages });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ error: 'Failed to get conversation history' });
  }
});

// Clear conversation history
router.delete('/history/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    await chatService.clearConversation(sessionId);
    res.json({ success: true });
  } catch (error) {
    console.error('Clear history error:', error);
    res.status(500).json({ error: 'Failed to clear conversation' });
  }
});

// Get all orders
router.get('/orders', async (req, res) => {
  try {
    const orders = await chatService.getAllOrders();
    res.json({ orders });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'Failed to get orders' });
  }
});

// Get orders by session
router.get('/orders/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const orders = await chatService.getOrdersBySession(sessionId);
    res.json({ orders });
  } catch (error) {
    console.error('Get session orders error:', error);
    res.status(500).json({ error: 'Failed to get session orders' });
  }
});

// Main chat endpoint
router.post('/', async (req, res) => {
  const { message, sessionId } = req.body;
  
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    const result = await chatService.processMessage(message, sessionId);
    res.json(result);
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Failed to generate response' });
  }
});

export default router;
