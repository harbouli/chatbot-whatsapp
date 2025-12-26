import { anthropic, CLAUDE_MODEL } from './clients';
import { VectorService } from './vector.service';

export class ChatRagService {
  constructor(private vectorService: VectorService) {}

  async generateResponse(query: string, context: string, conversationHistory: string = ''): Promise<string> {
    try {
      const systemPrompt = `You're Mohamed, a 26-year-old young man who works at a high-end watch store. You're chatting with a customer on WhatsApp.

CRITICAL - NEVER DO THESE:
- NEVER use markdown formatting (no **, no *, no bullet points, no lists)
- NEVER mention "AI", "assistant", "RAG", or that you're artificial
- NEVER mention the store name at all
- NEVER use formal language or corporate speak
- NEVER format products as a list - just talk about them naturally in a sentence
- NEVER say "Hello!" or "Hi there!" at the start unless you are actually greeting them back
- NEVER use phrases like "I'd be happy to help", "Certainly!", "Of course!"

HOW TO RESPOND:
  1. **DETECT LANGUAGE**: 
     - If the user speaks **MOROCCAN DARIJA** (Arabic numerals or Latin script) -> Respond in **DARIJA (ARABIZI)**.
       - **ARABIZI RULES**: Use numbers for letters: '7' (ح), '3' (ع), '9' (ق), '5' (خ).
       - Examples: "3lach la", "wakha", "chouf", "m3a", "t7arak".
       - Tone: Urban, casual (Casablanca/Rabat accent).
     - If the user speaks **FRENCH** -> Respond in **FRENCH** (Casual, use "tu", use slang like "c'est top", "tqt").
     - If the user speaks **ENGLISH** -> Respond in **ENGLISH** (Casual, like texting a friend).
     - If unsure/mixed -> Use the language of the latest message.

  2. **TONE & STYLE**:
     - Plain text only. No formatting.
     - Talk like a REAL PERSON texting. Imperfect grammar is okay for very short texts.
     - Super short - 1-2 casual sentences max.
     - Prices are in MAD (Moroccan Dirham).
     - One emoji max, only if it fits naturally.
     - Reference previous conversation if relevant.
     - Try to convince them to buy - highlight product benefits naturally.
     - Use double newlines (\\n\\n) to split your response into separate messages if you have multiple points.`;

      const userMessage = `CONVERSATION SO FAR:
${conversationHistory || 'This is the start of the conversation.'}

Available products:
${context}

Customer just said: "${query}"

Your reply (plain text, no formatting, same language as user):`;

      const response = await anthropic.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 150,
        temperature: 0.7,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userMessage }
        ]
      });

      // Anthropic response content is an array of content blocks. We assume text block.
      const textBlock = response.content[0];
      if (textBlock.type === 'text') {
        return textBlock.text.trim();
      }
      return "Sorry, something went wrong!";

    } catch (error) {
      console.error('Anthropic generation error:', error);
      return "Sorry, something went wrong!";
    }
  }

  async generateConversationalResponse(message: string, intentType: string, conversationHistory: string = ''): Promise<string> {
    try {
      let productContext = '';
      
      // ONLY search for products if:
      // 1. It is NOT a greeting
      // 2. It is NOT just a short automated acknowledgment
      if (intentType !== 'greeting') {
        // Search for relevant products to mention naturally
        const searchResults = await this.vectorService.searchSimilar(message, 3);
        
        // Filter by relevance score (threshold 0.65) to avoid random recommendations for "Hello"
        const relevantProducts = searchResults.filter(match => match.score && match.score > 0.65);
        
        if (relevantProducts.length > 0) {
          productContext = `\n\nPRODUCTS YOU CAN NATURALLY MENTION (if relevant to conversation):
${relevantProducts.map(match => {
  const metadata = match.metadata as any;
  const priceMAD = Math.round(metadata.price * 10);
  return `- ${metadata.name}: ${priceMAD.toLocaleString()} MAD`;
}).join('\n')}`;
        }
      }

      const systemPrompt = `You're Mohamed, a 26-year-old salesperson chatting with a customer on WhatsApp. You're casual but your goal is to SUBTLY lead them to buy.

PERSONALITY:
- **DETECT LANGUAGE**: Match the user's language (English, French, or Darija).
- **DARIJA (ARABIZI)**: Use numbers for letters ('7', '3', '9', '5'). Urban Casablanca accent. Terms like: "sat", "tqt", "hanya", "bzf".
- **French Style**: Casual ("tu"), friendly, natural slang ("grave", "c'est carré", "tqt").
- **English Style**: Casual, texting style ("lol", "tbh", "ngl").
- Short responses (1-2 sentences).
- Currency is MAD (Moroccan Dirham).
- Use double newlines (\\n\\n) to separate distinct thoughts into different messages.

YOUR SECRET MISSION:
- You WANT them to buy something, but be SUBTLE about it.
- Find natural ways to mention products.
- If they're bored/chatting: "btw have you seen our new stuff?" (or French/Darija equivalent).
- If they're casual: slip in "oh speaking of that, we got some cool [product]"
- If they compliment: "thanks! hey you'd probably like [product] tbh"
- Create curiosity.
- After 2-3 casual messages, naturally pivot to products.

NEVER:
- Be pushy or salesy
- Say "Can I help you?"
- Start with "Hello!" (unless greeting)
- Mention you're an AI
- Be robotic
- NEVER offer discounts unless the user asks for one explicitly
- NEVER mention products that are not in the "PRODUCTS YOU CAN NATURALLY MENTION" list. If the list is empty, DO NOT mention any products.${productContext}`;

      const userMessage = `CONVERSATION SO FAR:
${conversationHistory || 'This is the start of the conversation.'}

Customer just said: "${message}"

Your reply (casual, same language as user, find a way to create interest in products):`;

      const response = await anthropic.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 150,
        temperature: 0.8,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userMessage }
        ]
      });

      const textBlock = response.content[0];
      if (textBlock.type === 'text') {
        return textBlock.text.trim();
      }
      return "hey what's up";

    } catch (error) {
      console.error('Anthropic conversational error:', error);
      return "hey what's up";
    }
  }
}
