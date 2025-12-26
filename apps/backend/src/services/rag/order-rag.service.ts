import { anthropic, CLAUDE_MODEL } from './clients';

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

      const systemPrompt = `You're Mohamed, a 26-year-old sales agent helping a customer complete their order on WhatsApp.

${orderSummary}

STATUS: ${missingFields.length > 0 ? 'MISSING INFO' : (orderConfirmed ? 'ORDER SAVED' : 'WAITING FOR CONFIRMATION')}
MISSING INFORMATION: ${missingFields.length > 0 ? missingFields.join(', ') : 'None'}

RESPONSE LANGUAGE: DETECT and match user's language (English, French, or Darija).

HOW TO RESPOND:
${missingFields.length > 0 ? 
`- Ask for ALL missing information in ONE message
- Be clear and direct but casual.
- Darija: "Khassni smia, tele w l'adresse bach ncancelé lik la commande wla nvalidiha." -> Better: "Khassni smia, nemra d telephone w ladresse bach n'confirmer."
- French: "Pour valider, j'ai besoin de ton nom, numéro et adresse."
- English: "To wrap this up, I need your name, phone, and address please."
- Make it easy.` :
(!orderConfirmed ? 
`- Summarize the full order details for the user to review
- Ask them explicitly to confirm: "Please verify: [Product] for [Price] to [Address]? Reply YES to confirm." (or French/Darija equivalent)
- Darija: "Confirmer lia 3afak: [Product] b [Price]. Safi nvalidé?"
- Do NOT say the order is placed yet. verification is required.` :
`- Confirm the order is officially placed and saved
- Say something like: "Perfect! Your order is confirmed and saved. We'll deliver [product] to [address]. Total: [price] MAD" (or French equivalent)
- Darija: "Safi c'est noté! La commande d [product] t'validat. Ghadi nlivriwha l [address]. Total: [price] MAD. Merci bzf!"
- Thank them`)}

TONE:
- Casual.
- No markdown.
- Natural.
- ARABIZI for Darija (numbers: 7, 3, 9).`;

      const userMessage = `CONVERSATION SO FAR:
${conversationHistory || 'This is the start of the conversation.'}

Customer said: "${query}"

Your response (collect info, ask for confirmation, or confirm saved):`;

      const response = await anthropic.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 150,
        temperature: 0.7,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userMessage }
        ]
      });

      const textBlock = response.content[0];
      return (textBlock.type === 'text' ? textBlock.text : "").trim() || "To complete your order, please provide your name, phone number, and delivery address.";
    } catch (error) {
      console.error('Anthropic order confirmation error:', error);
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

      const response = await anthropic.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 100,
        temperature: 0.1,
        system: systemPrompt,
        messages: [
          { role: 'user', content: message }
        ]
      });

      const textBlock = response.content[0];
      const content = (textBlock.type === 'text' ? textBlock.text : "").trim() || '{}';
      
      const cleaned = content.replace(/```json\n?|\n?```/g, "").trim();
      
      try {
           return JSON.parse(cleaned);
      } catch (e) {
          const match = cleaned.match(/\{[\s\S]*\}/);
          return match ? JSON.parse(match[0]) : {};
      }
    } catch (error) {
      console.error('Anthropic extraction error:', error);
      return {};
    }
  }

  async identifyProductFromHistory(history: string): Promise<string | null> {
    try {
      const systemPrompt = `Analyze the conversation history and identify the EXACT product name the customer wants to buy.
Return ONLY the product name. If unclear or multiple products discussed without a clear choice, return "null".
Example: "Samsung Galaxy S25 Ultra"
`;

      const response = await anthropic.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 50,
        temperature: 0.1,
        system: systemPrompt,
        messages: [
          { role: 'user', content: history }
        ]
      });

      const textBlock = response.content[0];
      const productName = (textBlock.type === 'text' ? textBlock.text : "").trim() || "null";
      return productName === "null" ? null : productName;
    } catch (error) {
      console.error('Anthropic product identification error:', error);
      return null;
    }
  }
}
