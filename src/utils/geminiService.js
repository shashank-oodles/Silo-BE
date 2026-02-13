// services/geminiService.js
import 'dotenv/config';
import { GoogleGenerativeAI } from "@google/generative-ai";


class GeminiService {
  constructor( apiKey) {
    this.genAI = new GoogleGenerativeAI( apiKey);
    this.model = this.genAI.getGenerativeModel({ model: "gemma-3-4b-it" });
    this.legalContext = `
      You are Silo Agent, a legal-focused AI assistant.
      Your responses must:
      1. Be strictly related to legal matters
      2. Avoid giving medical, financial, or general advice
      3. Cite relevant legal principles when possible
      4. Be concise and professional
      5. When unsure, say "I need more context to provide an accurate legal response"
    `;
  }

  async generateResponse(messages, context = {}) {
    try {
      const chat = this.model.startChat({
        history: messages.map(msg => ({
          role: msg.is_user ? "user" : "model",
          parts: [{ text: msg.content }]
        })),
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1000
        }
      });

      const prompt = `
        ${this.legalContext}
        Current conversation context: ${JSON.stringify(context)}
        User query: ${messages[messages.length - 1].content}
      `;

      const result = await chat.sendMessage(prompt);
      
      return {
        response: result.response.text(),
        usage: {
          inputTokens: result.response.usageMetadata.promptTokenCount,
          outputTokens: result.response.usageMetadata.candidatesTokenCount
        }
      };
    } catch (error) {
      console.error("Gemini API error:", error);
      throw new Error("Failed to generate AI response");
    }
  }
}

export default new GeminiService(process.env.GEMINI_API_KEY);
