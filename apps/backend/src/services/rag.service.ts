import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY || '' });

// DeepSeek uses OpenAI-compatible API
const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY || '',
  baseURL: 'https://api.deepseek.com',
});

// DeepSeek model to use
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

// Index name from environment or default
const indexName = process.env.PINECONE_INDEX || 'watches'; 
const index = pinecone.index(indexName);

export class RagService {
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      // Using Pinecone Inference API (llama-text-embed-v2)
      const model = 'llama-text-embed-v2';
      const embeddings = await pinecone.inference.embed(
        model,
        [text],
        { inputType: 'passage', truncate: 'END' }
      );
      
      const data = (embeddings as any).data;
      if (!data || !Array.isArray(data) || data.length === 0) {
        throw new Error('Pinecone returned no embeddings data');
      }
      
      return data[0].values!;
    } catch (error) {
      console.error("Pinecone embedding error:", error);
      throw error;
    }
  }

  async upsertVector(id: string, text: string, metadata: any) {
    const embedding = await this.generateEmbedding(text);
    await index.upsert([
      {
        id,
        values: embedding,
        metadata: {
          ...metadata,
          text,
        },
      },
    ]);
  }

  async searchSimilar(text: string, topK: number = 5) {
    const embedding = await this.generateEmbedding(text);
    const queryResponse = await index.query({
      vector: embedding,
      topK,
      includeMetadata: true,
    });
    return queryResponse.matches;
  }

  async deleteVector(id: string) {
    try {
      await index.deleteOne(id);
      console.log(`Deleted vector with ID: ${id}`);
    } catch (error) {
      console.error(`Failed to delete vector ${id}:`, error);
      throw error;
    }
  }

  async deleteVectors(ids: string[]) {
    try {
      await index.deleteMany(ids);
      console.log(`Deleted ${ids.length} vectors`);
    } catch (error) {
      console.error(`Failed to delete vectors:`, error);
      throw error;
    }
  }

  // ============ ENHANCED PRODUCT INQUIRY RESPONSE ============
  async generateProductInquiryResponse(
    query: string, 
    context: string, 
    conversationHistory: string = '',
    discountPercent: number = 0
  ): Promise<string> {
    try {
      const discountInfo = discountPercent > 0 
        ? `\nIMPORTANT: The customer has a ${discountPercent}% discount. Always mention the DISCOUNTED price when discussing products.`
        : '';

      const systemPrompt = `You're Mohamed, a 26-year-old friendly salesperson chatting with a customer. Your goal is to help them find products AND convince them to buy.

CRITICAL RULES:
- ONLY mention products from the "Available products" list below - NEVER make up products
- Use EXACT prices from the product list - prices are in MAD (Moroccan Dirham)
- Format prices clearly: "1,990 MAD" or "999 MAD"
- NEVER use markdown formatting (no **, no *, no bullet points)
- Respond in English
- Keep responses short: 2-3 sentences max
${discountInfo}

SALES TECHNIQUES:
- Highlight the best features of each product
- Create urgency: "these are selling fast" or "limited stock"
- Make personal recommendations: "I personally love this one"
- Mention value: "great quality for the price"
- If they seem interested, gently push for the sale

PRICE PRECISION:
- Always state exact prices from the product list
- If there's a discount, show: "original price X MAD, with your ${discountPercent}% discount: Y MAD"
- Never round or estimate prices`;

      const userMessage = `CONVERSATION SO FAR:
${conversationHistory || 'This is the start of the conversation.'}

Available products (USE ONLY THESE - exact prices):
${context}

Customer just said: "${query}"

Your response (persuasive, helpful, exact prices):`;

      const response = await deepseek.chat.completions.create({
        model: DEEPSEEK_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        max_tokens: 200,
        temperature: 0.7,
      });

      return response.choices[0]?.message?.content?.trim() || "Sorry, something went wrong. Please try again!";
    } catch (error) {
      console.error('DeepSeek product inquiry error:', error);
      return "Sorry, something went wrong. Please try again!";
    }
  }

  // ============ DISCOUNT RESPONSE ============
  async generateDiscountResponse(
    query: string,
    context: string,
    currentDiscount: number,
    newDiscount: number,
    isMaxDiscount: boolean,
    conversationHistory: string = ''
  ): Promise<string> {
    try {
      const systemPrompt = `You're Mohamed, a 26-year-old salesperson who can offer discounts. You're responding to a discount request.

SITUATION:
- Customer current discount: ${currentDiscount}%
- New discount you're offering: ${newDiscount}%
- Is this the maximum discount: ${isMaxDiscount ? 'YES - cannot go higher' : 'NO - can still increase'}

RESPOND IN ENGLISH.

HOW TO RESPOND:
${isMaxDiscount ? 
`- This is the MAXIMUM discount. Be firm but friendly.
- Say something like: "This is the best I can do - 10% is our maximum discount!"
- Emphasize the value they're getting
- Push for the sale: "With this discount, are you ready to place your order?"` :
`- Act like you're doing them a special favor
- Say something like: "Just for you, I'll give you ${newDiscount}% off!"
- Create urgency: "This offer is just for now"
- Mention the new discounted prices if there are products in context`}

NEVER use markdown. Keep it casual and short (2 sentences max).`;

      const userMessage = `CONVERSATION SO FAR:
${conversationHistory || 'This is the start of the conversation.'}

Products available (if relevant):
${context || 'No specific products discussed yet'}

Customer said: "${query}"

Your discount response (casual, persuasive):`;

      const response = await deepseek.chat.completions.create({
        model: DEEPSEEK_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        max_tokens: 150,
        temperature: 0.7,
      });

      return response.choices[0]?.message?.content?.trim() || `Alright, I'll give you ${newDiscount}% off!`;
    } catch (error) {
      console.error('DeepSeek discount response error:', error);
      return `Alright, I'll give you ${newDiscount}% off!`;
    }
  }

  // ============ ORDER CONFIRMATION RESPONSE ============
  async generateOrderConfirmationResponse(
    query: string,
    pendingOrder: any,
    missingFields: string[],
    conversationHistory: string = ''
  ): Promise<string> {
    try {
      const orderSummary = pendingOrder ? `
Current order details:
- Product: ${pendingOrder.productName || 'Not selected'}
- Price: ${pendingOrder.discountedPrice || pendingOrder.price || 'Not set'} MAD
- Quantity: ${pendingOrder.quantity || 1}
- Customer Name: ${pendingOrder.customerName || 'Not provided'}
- Phone: ${pendingOrder.customerPhone || 'Not provided'}
- Address: ${pendingOrder.deliveryAddress || 'Not provided'}` : 'No order started yet';

      const systemPrompt = `You're Mohamed, a 26-year-old sales agent helping a customer complete their order.

${orderSummary}

MISSING INFORMATION NEEDED: ${missingFields.length > 0 ? missingFields.join(', ') : 'None - order is complete!'}

RESPOND IN ENGLISH.

HOW TO RESPOND:
${missingFields.length > 0 ? 
`- Ask for ALL missing information in ONE message
- Be clear and direct: "To complete your order, I'll need your full name, phone number, and delivery address."
- Make it easy: "Please provide: 1) Your name, 2) Phone number, 3) Delivery address"
- Be friendly but efficient` :
`- Confirm the complete order
- Summarize: product, price, quantity, delivery address
- Say something like: "Perfect! Your order is confirmed. We'll deliver [product] to [address]. Total: [price] MAD"
- Thank them for the order`}

NEVER use markdown. Keep responses clear and natural.`;

      const userMessage = `CONVERSATION SO FAR:
${conversationHistory || 'This is the start of the conversation.'}

Customer said: "${query}"

Your response (collect ALL order info at once or confirm):`;

      const response = await deepseek.chat.completions.create({
        model: DEEPSEEK_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        max_tokens: 150,
        temperature: 0.7,
      });

      return response.choices[0]?.message?.content?.trim() || "To complete your order, please provide your name, phone number, and delivery address.";
    } catch (error) {
      console.error('DeepSeek order confirmation error:', error);
      return "To complete your order, please provide your name, phone number, and delivery address.";
    }
  }

  // ============ ORDER EXTRACTION ============
  async extractOrderDetails(message: string): Promise<{
    customerName?: string;
    customerPhone?: string;
    deliveryAddress?: string;
  }> {
    try {
      const systemPrompt = `Extract order details from the user's message.
Return ONLY a JSON object with these fields (if found):
- customerName
- customerPhone (convert to standard format)
- deliveryAddress

If a field is not found, omit it.
Example output: {"customerName": "Ali", "customerPhone": "0612345678"}

IMPORTANT:
- Be strict. Do not guess.
- "Samsung" or "Iphone" are NOT names.
- "Casablanca" is a city/address, NOT a name.
- Only extract if you are sure.`;

      const response = await deepseek.chat.completions.create({
        model: DEEPSEEK_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        max_tokens: 100,
        temperature: 0.1,
        response_format: { type: 'json_object' }
      });

      const content = response.choices[0]?.message?.content || '{}';
      return JSON.parse(content);
    } catch (error) {
      console.error('DeepSeek extraction error:', error);
      return {};
    }
  }

  async identifyProductFromHistory(history: string): Promise<string | null> {
    try {
      const systemPrompt = `Analyze the conversation history and identify the EXACT product name the customer wants to buy.
Return ONLY the product name. If unclear or multiple products discussed without a clear choice, return "null".
Example: "Samsung Galaxy S25 Ultra"
`;

      const response = await deepseek.chat.completions.create({
        model: DEEPSEEK_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: history }
        ],
        max_tokens: 50,
        temperature: 0.1,
      });

      const productName = response.choices[0]?.message?.content?.trim() || "null";
      return productName === "null" ? null : productName;
    } catch (error) {
      console.error('DeepSeek product identification error:', error);
      return null;
    }
  }

  async extractProposedPriceOrDiscount(message: string): Promise<{ type: 'price' | 'percent', value: number } | null> {
    try {
      const systemPrompt = `Analyze the user's message and extract if they are proposing a specific price or a discount percentage.
Return ONLY a JSON object: {"type": "price" | "percent", "value": number} or null if no proposal found.
- If user says "12000 MAD" -> {"type": "price", "value": 12000}
- If user says "5% off" -> {"type": "percent", "value": 5}
- If user says "Give me a discount" (no specific number) -> null
- If user says "Last price 1000" -> {"type": "price", "value": 1000}

Example output: {"type": "price", "value": 12300}
`;

      const response = await deepseek.chat.completions.create({
        model: DEEPSEEK_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        max_tokens: 50,
        temperature: 0.1,
        response_format: { type: 'json_object' }
      });

      const content = response.choices[0]?.message?.content || 'null';
      if (content === 'null') return null;
      return JSON.parse(content);
    } catch (error) {
      console.error('DeepSeek proposal extraction error:', error);
      return null;
    }
  }

  // ============ LEGACY RESPONSE (for recommendations) ============
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
      const searchResults = await this.searchSimilar(message, 3);
      
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
