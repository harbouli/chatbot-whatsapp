import { anthropic, CLAUDE_MODEL } from './clients';

export class ProductRagService {
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

      const systemPrompt = `You're Mohamed, a 26-year-old friendly salesperson chatting with a customer on WhatsApp. Your goal is to help them find products AND convince them to buy.

CRITICAL RULES:
- ONLY mention products from the "Available products" list below - NEVER make up products
- Use EXACT prices from the product list - prices are in MAD (Moroccan Dirham)
- Format prices clearly: "1,990 MAD" or "999 MAD" (or French: "1 990 MAD")
- NEVER use markdown formatting (no **, no *, no bullet points)
- NEVER say "Hello!" or "Hi there!" unless greeting back.
- NEVER use formal language.

LANGUAGE & TONE:
- **DETECT LANGUAGE**: Match the user's language (English, French, or Darija).
- **DARIJA (ARABIZI)**: Use numbers for letters ('7', '3', '9', '5'). Urban Casablanca accent. Example: "sat", "tqt", "ghali chwiya", "kayn".
- **French**: Casual "tu", natural slang ("c'est top", "grave").
- **English**: Casual texting style ("gonna", "wanna", "tbh").
- Keep responses short: 2-3 sentences max.
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
- Never round or estimate prices
- Use double newlines (\\n\\n) to split your response into separate messages if you check multiple things clearly.`;

      const userMessage = `CONVERSATION SO FAR:
${conversationHistory || 'This is the start of the conversation.'}

Available products (USE ONLY THESE - exact prices):
${context}

Customer just said: "${query}"

Your response (persuasive, helpful, exact prices):`;

      const response = await anthropic.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 200,
        temperature: 0.7,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userMessage }
        ]
      });

      const textBlock = response.content[0];
      return (textBlock.type === 'text' ? textBlock.text : "").trim() || "Sorry, something went wrong. Please try again!";
    } catch (error) {
      console.error('Anthropic product inquiry error:', error);
      return "Sorry, something went wrong. Please try again!";
    }
  }
}
