import { deepseek, DEEPSEEK_MODEL } from './clients';

export class OrderRagService {
  async generateOrderConfirmationResponse(
    query: string,
    pendingOrder: any,
    missingFields: string[],
    orderConfirmed: boolean,
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

STATUS: ${missingFields.length > 0 ? 'MISSING INFO' : (orderConfirmed ? 'ORDER SAVED' : 'WAITING FOR CONFIRMATION')}
MISSING INFORMATION: ${missingFields.length > 0 ? missingFields.join(', ') : 'None'}

RESPOND IN ENGLISH.

HOW TO RESPOND:
${missingFields.length > 0 ? 
`- Ask for ALL missing information in ONE message
- Be clear and direct: "To complete your order, I'll need your full name, phone number, and delivery address."
- Make it easy: "Please provide: 1) Your name, 2) Phone number, 3) Delivery address"` :
(!orderConfirmed ? 
`- Summarize the full order details for the user to review
- Ask them explicitly to confirm: "Please verify: [Product] for [Price] to [Address]? Reply YES to confirm."
- DO NOT say the order is placed yet. verification is required.` :
`- Confirm the order is officially placed and saved
- Say something like: "Perfect! Your order is confirmed and saved. We'll deliver [product] to [address]. Total: [price] MAD"
- Thank them`)}

NEVER use markdown. Keep responses clear and natural.`;

      const userMessage = `CONVERSATION SO FAR:
${conversationHistory || 'This is the start of the conversation.'}

Customer said: "${query}"

Your response (collect info, ask for confirmation, or confirm saved):`;

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
- Extract from unstructured text. Users often mix details.
- "Anass adile phone +212..." -> Name: Anass adile, Phone: +212...
- "Delivery to Casablanca..." -> Address: Casablanca...
- "My number is..." -> Phone
- But still satisfy: "Samsung" is NOT a name.
- If unsure about a name vs a city, prefer City for address.`;

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
}
