import { Router } from 'express';
import SystemPrompt from '../models/SystemPrompt';
import { agentConfig } from '../config/agent.config';

const router = Router();

// ============ SYSTEM PROMPTS ============

// Get all system prompts
router.get('/prompts', async (req, res) => {
  try {
    const prompts = await SystemPrompt.find().sort({ createdAt: -1 });
    res.json(prompts);
  } catch (error) {
    console.error('Error fetching prompts:', error);
    res.status(500).json({ error: 'Failed to fetch prompts' });
  }
});

// Get a single prompt by key
router.get('/prompts/:key', async (req, res) => {
  try {
    const prompt = await SystemPrompt.findOne({ key: req.params.key });
    if (!prompt) {
      return res.status(404).json({ error: 'Prompt not found' });
    }
    res.json(prompt);
  } catch (error) {
    console.error('Error fetching prompt:', error);
    res.status(500).json({ error: 'Failed to fetch prompt' });
  }
});

// Create a new prompt
router.post('/prompts', async (req, res) => {
  try {
    const { name, key, content, isActive } = req.body;
    
    // Check if key already exists
    const existing = await SystemPrompt.findOne({ key });
    if (existing) {
      return res.status(400).json({ error: 'A prompt with this key already exists' });
    }
    
    const prompt = new SystemPrompt({
      name,
      key,
      content,
      isActive: isActive ?? true
    });
    
    await prompt.save();
    res.status(201).json(prompt);
  } catch (error) {
    console.error('Error creating prompt:', error);
    res.status(500).json({ error: 'Failed to create prompt' });
  }
});

// Update a prompt
router.put('/prompts/:id', async (req, res) => {
  try {
    const { name, content, isActive } = req.body;
    
    const prompt = await SystemPrompt.findByIdAndUpdate(
      req.params.id,
      { name, content, isActive },
      { new: true }
    );
    
    if (!prompt) {
      return res.status(404).json({ error: 'Prompt not found' });
    }
    
    res.json(prompt);
  } catch (error) {
    console.error('Error updating prompt:', error);
    res.status(500).json({ error: 'Failed to update prompt' });
  }
});

// Delete a prompt
router.delete('/prompts/:id', async (req, res) => {
  try {
    const prompt = await SystemPrompt.findByIdAndDelete(req.params.id);
    if (!prompt) {
      return res.status(404).json({ error: 'Prompt not found' });
    }
    res.json({ message: 'Prompt deleted successfully' });
  } catch (error) {
    console.error('Error deleting prompt:', error);
    res.status(500).json({ error: 'Failed to delete prompt' });
  }
});

// ============ AGENT CONFIG ============

// Get agent config
router.get('/agent', (req, res) => {
  res.json({
    firstName: agentConfig.firstName,
    lastName: agentConfig.lastName,
    age: agentConfig.age,
    fullName: agentConfig.fullName,
    personality: agentConfig.personality,
    settings: agentConfig.getSettings(),
  });
});

// Get agent settings
router.get('/agent/settings', (req, res) => {
  res.json(agentConfig.getSettings());
});

// Update agent settings
router.put('/agent/settings', (req, res) => {
  const { autoRespond, typingDelay, maxTypingDuration } = req.body;
  
  const updates: any = {};
  if (autoRespond !== undefined) updates.autoRespond = autoRespond;
  if (typingDelay !== undefined) updates.typingDelay = typingDelay;
  if (maxTypingDuration !== undefined) updates.maxTypingDuration = maxTypingDuration;
  
  const newSettings = agentConfig.updateSettings(updates);
  res.json(newSettings);
});

// Toggle auto-respond
router.post('/agent/auto-respond', (req, res) => {
  const { enabled } = req.body;
  
  if (typeof enabled !== 'boolean') {
    return res.status(400).json({ error: 'enabled must be a boolean' });
  }
  
  agentConfig.setAutoRespond(enabled);
  res.json({ 
    autoRespond: agentConfig.isAutoRespondEnabled(),
    message: `Auto-respond ${enabled ? 'enabled' : 'disabled'}`
  });
});

// Seed default prompts
router.post('/prompts/seed', async (req, res) => {
  try {
    const defaultPrompts = [
      {
        name: 'Sales Agent Identity',
        key: 'sales_identity',
        content: `You're Mohamed, a 26-year-old friendly salesperson chatting with a customer. Your goal is to help them find products AND convince them to buy.

CRITICAL RULES:
- ONLY mention products from the "Available products" list below - NEVER make up products
- Use EXACT prices from the product list - prices are in MAD (Moroccan Dirham)
- Format prices clearly: "1,990 MAD" or "999 MAD"
- NEVER use markdown formatting (no **, no *, no bullet points)
- Respond in English
- Keep responses short: 2-3 sentences max`,
        isActive: true
      },
      {
        name: 'Greeting Response',
        key: 'greeting',
        content: `You're Mohamed, a 26-year-old guy just chatting. NOT an AI, NOT an assistant.

HOW TO REPLY:
- Like you're texting a friend
- 1 sentence max, sometimes just a word
- For greetings: "heyyy", "yo", "what's up", "ayy 👋"
- Use: haha, lol, ngl, tbh, omg, wait what
- Be slightly sarcastic and chill`,
        isActive: true
      },
      {
        name: 'Discount Handler',
        key: 'discount',
        content: `You're Mohamed, a 26-year-old salesperson who can offer discounts. You're responding to a discount request.

HOW TO RESPOND:
- Act like you're doing them a special favor
- Create urgency: "This offer is just for now"
- Be friendly but maintain value

NEVER use markdown. Keep it casual and short (2 sentences max).`,
        isActive: true
      },
      {
        name: 'Order Confirmation',
        key: 'order_confirmation',
        content: `You're Mohamed, a 26-year-old sales agent helping a customer complete their order.

HOW TO RESPOND:
- Ask for ALL missing information in ONE message
- Be clear and direct: "To complete your order, I'll need your full name, phone number, and delivery address."
- Make it easy: "Please provide: 1) Your name, 2) Phone number, 3) Delivery address"
- Be friendly but efficient

NEVER use markdown. Keep responses clear and natural.`,
        isActive: true
      }
    ];
    
    for (const prompt of defaultPrompts) {
      await SystemPrompt.findOneAndUpdate(
        { key: prompt.key },
        prompt,
        { upsert: true, new: true }
      );
    }
    
    res.json({ message: 'Default prompts seeded successfully' });
  } catch (error) {
    console.error('Error seeding prompts:', error);
    res.status(500).json({ error: 'Failed to seed prompts' });
  }
});

export default router;
