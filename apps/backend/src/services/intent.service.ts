import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

// DeepSeek uses OpenAI-compatible API
const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY || "",
  baseURL: "https://api.deepseek.com",
});

const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || "deepseek-chat";

export type MessageIntentType =
  | "recommendation"
  | "product_inquiry"
  | "discount_request"
  | "order_confirmation"
  | "order_details"
  | "general_chat"
  | "greeting";

export interface MessageIntent {
  type: MessageIntentType;
  confidence: number;
  requiresProducts: boolean;
  summary: string;
}

export class IntentService {
  async analyzeIntent(message: string, history: string = "", contextState: string = ""): Promise<MessageIntent> {
    try {
      const systemPrompt = `You are an intent classifier. Analyze user messages based on the conversation history and current state. 
Return ONLY a valid JSON object with this exact structure:
{
  "type": "recommendation" | "product_inquiry" | "discount_request" | "order_confirmation" | "order_details" | "general_chat" | "greeting",
  "confidence": <number between 0 and 1>,
  "requiresProducts": <boolean>,
  "summary": "<brief summary>"
}

Intent types:
- "recommendation": User asks for product recommendations (e.g., "What do you recommend?", "What's good?")
- "product_inquiry": User asks about specific products, prices, features (e.g., "Do you have watches?", "Tell me about this product", "What's the price?")
- "discount_request": User asks for a discount, lower price, or deal (e.g., "Can I get a discount?", "That's too expensive", "Any deals?", "Lower the price")
- "order_confirmation": User wants to buy or confirm an order (e.g., "I want to buy", "I'll take it", "Confirm my order", "Place order", "Yes" in response to confirmation request)
- "order_details": User provides personal info for order (e.g., name, phone number, address) or answers a question about their details.
- "general_chat": General conversation not about products (e.g., "How are you?", "Tell me a joke")
- "greeting": Greeting (e.g., "Hello", "Hi", "Salam")

IMPORTANT: 
- Set "requiresProducts" to true for "recommendation", "product_inquiry", "discount_request", and "order_confirmation".
- Return ONLY the JSON object, no other text.

CONTEXT:
${contextState ? `Current State: ${contextState}` : "No specific active state."}

CONVERSATION HISTORY:
${history || "No history."}
`;

      const response = await deepseek.chat.completions.create({
        model: DEEPSEEK_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Classify this message: "${message}"` },
        ],
        max_tokens: 100,
        temperature: 0.3,
      });


      const text = response.choices[0]?.message?.content?.trim() || "";

      // Clean and parse JSON
      const cleanedText = text.replace(/```json\n?|\n?```/g, "").trim();

      try {
        const intent = JSON.parse(cleanedText) as MessageIntent;
        return intent;
      } catch (parseError) {
        // Try to extract JSON from response
        const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]) as MessageIntent;
        }
        throw parseError;
      }
    } catch (error) {
      console.error("Intent analysis error:", error);
      return {
        type: "general_chat",
        confidence: 0.5,
        requiresProducts: false,
        summary: "Unable to determine intent",
      };
    }
  }
}
