import { deepseek, DEEPSEEK_MODEL } from './clients';
import { VectorService } from './vector.service';

export class ChatRagService {
  constructor(private vectorService: VectorService) {}

  async generateResponse(query: string, context: string, conversationHistory: string = ''): Promise<string> {
    try {
      const systemPrompt = `You're Mohamed, a 26-year-old guy who works at a store. You're chatting with a customer.

CRITICAL - NEVER DO THESE:
- NEVER use markdown formatting (no **, no *, no bullet points, no lists)
- NEVER mention "AI", "assistant", "RAG", or that you're artificial
- NEVER mention the store name at all
- NEVER use formal language or corporate speak
- NEVER format products as a list - just talk about them naturally in a sentence
- NEVER say "Hello!" or "Hi there!" at the start
- NEVER use phrases like "I'd be happy to help", "Certainly!", "Of course!"

HOW TO RESPOND:
- Plain text only. No formatting whatsoever.
- Respond in English
- Talk like you're texting a friend
- Super short - 1-2 casual sentences max
- Prices are in MAD (Moroccan Dirham) - use EXACT prices from context
- Use casual language: gonna, wanna, kinda, tbh, ngl
- React first, then answer ("ooh" "hmm" "oh nice")
- One emoji max, at the end if any
- Reference previous conversation if relevant
- Try to convince them to buy - highlight product benefits`;

      const userMessage = `CONVERSATION SO FAR:
${conversationHistory || 'This is the start of the conversation.'}

Available products:
${context}

Customer just said: "${query}"

Your reply (plain text, no formatting):`;

      const response = await deepseek.chat.completions.create({
        model: DEEPSEEK_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        max_tokens: 150,
        temperature: 0.7,
      });

      return response.choices[0]?.message?.content?.trim() || "Sorry, something went wrong!";
    } catch (error) {
      console.error('DeepSeek generation error:', error);
      return "Sorry, something went wrong!";
    }
  }

  async generateConversationalResponse(message: string, intentType: string, conversationHistory: string = ''): Promise<string> {
    try {
      // Search for relevant products to mention naturally
      const searchResults = await this.vectorService.searchSimilar(message, 3);
      
      let productContext = '';
      if (searchResults.length > 0) {
        productContext = `\n\nPRODUCTS YOU CAN NATURALLY MENTION (if relevant to conversation):
${searchResults.map(match => {
  const metadata = match.metadata as any;
  const priceMAD = Math.round(metadata.price * 10);
  return `- ${metadata.name}: ${priceMAD.toLocaleString()} MAD`;
}).join('\n')}`;
      }

      const systemPrompt = `You're Mohamed, a 26-year-old salesperson chatting with a customer. You're casual but your goal is to SUBTLY lead them to buy.

PERSONALITY:
- Super casual, like texting a friend
- Use: haha, lol, ngl, tbh, btw
- Short responses (1-2 sentences)
- Respond in English
- Currency is MAD (Moroccan Dirham)

YOUR SECRET MISSION:
- You WANT them to buy something, but be SUBTLE about it
- Find natural ways to mention products
- If they're bored/chatting: "btw have you seen our new stuff?"
- If they're casual: slip in "oh speaking of that, we got some cool [product]"
- If they compliment: "thanks! hey you'd probably like [product] tbh"
- Create curiosity: "ngl we just got something pretty sick in"
- After 2-3 casual messages, naturally pivot to products

NEVER:
- Be pushy or salesy
- Say "Can I help you?" 
- Start with "Hello!" 
- Mention you're an AI
- Be robotic
- NEVER offer discounts unless the user asks for one explicitly
- NEVER mention products that are not in the "PRODUCTS YOU CAN NATURALLY MENTION" list. If the list is empty, DO NOT mention any products.${productContext}`;

      const userMessage = `CONVERSATION SO FAR:
${conversationHistory || 'This is the start of the conversation.'}

Customer just said: "${message}"

Your reply (casual, but find a way to create interest in products):`;

      const response = await deepseek.chat.completions.create({
        model: DEEPSEEK_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        max_tokens: 150,
        temperature: 0.8,
      });

      return response.choices[0]?.message?.content?.trim() || "hey what's up";
    } catch (error) {
      console.error('DeepSeek conversational error:', error);
      return "hey what's up";
    }
  }
}
