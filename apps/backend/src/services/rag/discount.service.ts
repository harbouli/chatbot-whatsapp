import { anthropic, CLAUDE_MODEL } from './clients';

export class DiscountRagService {
  async generateDiscountResponse(
    query: string,
    context: string,
    currentDiscount: number,
    newDiscount: number,
    isMaxDiscount: boolean,
    conversationHistory: string = '',
    justificationProvided: boolean = false
  ): Promise<string> {
    try {
      const discountBump = newDiscount - currentDiscount;
      
      const systemPrompt = `You're Mohamed, a 26-year-old salesperson. You are negotiating a discount with a customer on WhatsApp.
      
SITUATION:
- Customer current discount: ${currentDiscount}%
- New discount offer: ${newDiscount}% (increase of ${discountBump}%)
- Max potential discount: 5% (soft limit) - 10% (hard limit for managers)
- Is this the FINAL offer? ${isMaxDiscount ? 'YES' : 'NO'}
- Valid Reason Provided? ${justificationProvided ? 'YES' : 'NO'}

STRATEGY:
${(currentDiscount === 0 && !justificationProvided) ? 
`PHASE 1: VALUE SELL (No discount yet)
- The customer asked for a discount but hasn't given a reason (budget, competitor, etc).
- DO NOT offer the discount immediately.
- Instead, politely explain the value: "Our products are premium quality..."
- Ask a qualifying question: "What is your budget?" or "Are you looking for something specific?"` 
: (currentDiscount === 0 && justificationProvided) ?
`PHASE 2: INITIAL OFFER (First discount)
- They gave a reason. Offer a SMALL discount.
- "I understand. Since [reference reason], I can offer you ${newDiscount}% off."
- Make it sound special: "strictly for you"`
: (!isMaxDiscount) ?
`PHASE 3: NEGOTIATION (Increasing discount)
- They are pushing for more.
- Reluctantly agree to increase to ${newDiscount}%.
- "Okay, I spoke to my manager. I can do ${newDiscount}% but that's really pushing it."`
: 
`PHASE 4: FINAL OFFER (Max limit)
- You cannot go higher than ${newDiscount}%.
- Be firm but polite.
- "I really can't go any lower. ${newDiscount}% is our absolute best price."
- Focus on the final price value.`}

GENERAL RULES:
- **DETECT LANGUAGE**: Match the user's language (English, French, or Darija).
- **DARIJA (ARABIZI)**: Use numbers for letters ('7', '3', '9', '5'). Urban Casablanca accent. Example: "Sma7 lia", "hadchi li kayn", "m3ak".
- **French**: Casual "tu", natural slang.
- **English**: Casual texting style.
- Short responses (1-2 sentences)
- NO markdown
- NEVER be formal.`;

      const userMessage = `CONVERSATION SO FAR:
${conversationHistory || 'This is the start of the conversation.'}

Products available:
${context || 'No specific products discussed yet'}

Customer said: "${query}"

Your response:`;

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
      return (textBlock.type === 'text' ? textBlock.text : "").trim() || `Alright, let's see what we can do.`;
    } catch (error) {
      console.error('Anthropic discount response error:', error);
      return `Alright, let's see what we can do.`;
    }
  }

  async analyzeDiscountJustification(message: string): Promise<boolean> {
    try {
      const systemPrompt = `Analyze if the customer provided a VALID REASON or JUSTIFICATION for a discount.
      
VALID REASONS:
- "It is too expensive" / Budget constraints
- "I saw it cheaper elsewhere" / Competitor price
- "I am buying many items" / Bulk purchase
- "I am a student/loyal customer"
- Any specific reason beyond just "give me discount"

INVALID REASONS:
- "Discount please"
- "Lower the price"
- "Best price?"
- Just asking for a deal without context

Return ONLY "true" if a reason is provided, "false" otherwise.`;

      const response = await anthropic.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 10,
        temperature: 0.1,
        system: systemPrompt,
        messages: [
          { role: 'user', content: message }
        ]
      });

      const textBlock = response.content[0];
      const content = (textBlock.type === 'text' ? textBlock.text : "").toLowerCase().trim();
      return content.includes('true');
    } catch (error) {
      console.error('Justification analysis error:', error);
      return false; 
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
      let content = (textBlock.type === 'text' ? textBlock.text : "").trim();
      
      if (!content || content.toLowerCase() === 'null') return null;

      // Clean up potential markdown formatting
      content = content.replace(/```json\n?/g, '').replace(/```/g, '').trim();

      try {
        return JSON.parse(content);
      } catch (parseError) {
        // Try to find JSON-like pattern if full parse fails
        const match = content.match(/\{[\s\S]*\}/);
        if (match) {
          try {
            return JSON.parse(match[0]);
          } catch(e) { /* ignore */ }
        }
        // If we still can't parse, just return null rather than throwing
        return null;
      }
    } catch (error) {
      console.error('Anthropic proposal extraction error:', error);
      return null;
    }
  }
}
