// // // services/geminiService.js
// // import 'dotenv/config';
// // import { GoogleGenerativeAI } from "@google/generative-ai";


// // class GeminiService {
// //   constructor( apiKey) {
// //     this.genAI = new GoogleGenerativeAI( apiKey);
// //     this.model = this.genAI.getGenerativeModel({ model: "gemma-3-4b-it" });
// //     this.legalContext = `
// //       You are Silo Agent, a legal-focused AI assistant.
// //       Your responses must:
// //       1. Be strictly related to legal matters
// //       2. Avoid giving medical, financial, or general advice
// //       3. Cite relevant legal principles when possible
// //       4. Be concise and professional
// //       5. When unsure, say "I need more context to provide an accurate legal response"
// //     `;
// //   }

// //   async generateResponse(messages, context = {}) {
// //     try {
// //       const chat = this.model.startChat({
// //         history: messages.map(msg => ({
// //           role: msg.is_user ? "user" : "model",
// //           parts: [{ text: msg.content }]
// //         })),
// //         generationConfig: {
// //           temperature: 0.7,
// //           maxOutputTokens: 1000
// //         }
// //       });

// //       const prompt = `
// //         ${this.legalContext}
// //         Current conversation context: ${JSON.stringify(context)}
// //         User query: ${messages[messages.length - 1].content}
// //       `;

// //       const result = await chat.sendMessage(prompt);

// //       return {
// //         response: result.response.text(),
// //         usage: {
// //           inputTokens: result.response.usageMetadata.promptTokenCount,
// //           outputTokens: result.response.usageMetadata.candidatesTokenCount
// //         }
// //       };
// //     } catch (error) {
// //       console.error("Gemini API error:", error);
// //       throw new Error("Failed to generate AI response");
// //     }
// //   }
// // }

// // export default new GeminiService(process.env.GEMINI_API_KEY);

// --------------------------------------------------------------------------------------------------------------

// src/utils/geminiService.js
import 'dotenv/config';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/server";
import fetch from 'node-fetch';
import os from 'os';
import path from 'path';
import fs from 'fs';

class GeminiService {
  constructor(apiKey) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.fileManager = new GoogleAIFileManager(apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: "gemma-3-4b-it"
    });

    this.legalContext = `
      You are Silo Agent, a legal-focused AI assistant.
      Your responses must:
      1. Be strictly related to legal matters
      2. Avoid giving medical, financial, or general advice
      3. Cite relevant legal principles when possible
      4. Be concise and professional
      5. When analyzing documents, images, or audio, focus on legal implications
      6. When unsure, say "I need more context to provide an accurate legal response",
      7. Always answer for those questions without legal interfrence, which is already provided in the context, for example upon asking my organizationId, name and email you can asnwer because it has already been provided in context.
    `;
  }

  async uploadFileToGemini(fileUrl, mimeType) {
    try {
      // Download file from Supabase
      const response = await fetch(fileUrl);
      const buffer = Buffer.from(await response.arrayBuffer()); // Use arrayBuffer()

      // Use system temp directory
      const tempDir = os.tmpdir();
      const tempPath = path.join(tempDir, `gemini-upload-${Date.now()}-${Math.random().toString(36).substring(7)}`);

      // Ensure directory exists
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      // Write file to temp directory
      fs.writeFileSync(tempPath, buffer);

      // Upload to Gemini
      const uploadResult = await this.fileManager.uploadFile(tempPath, {
        mimeType,
        displayName: `attachment-${Date.now()}`
      });

      // Clean up temp file
      fs.unlinkSync(tempPath);

      return uploadResult.file;
    } catch (error) {
      console.error('Gemini file upload error:', error);
      throw new Error('Failed to upload file to Gemini');
    }
  }

  async processAttachments(attachments) {
    const processedFiles = [];

    for (const attachment of attachments) {
      try {
        const geminiFile = await this.uploadFileToGemini(
          attachment.url,
          attachment.mimeType
        );

        processedFiles.push({
          fileData: {
            mimeType: geminiFile.mimeType,
            fileUri: geminiFile.uri
          }
        });
      } catch (error) {
        console.error(`Failed to process attachment: ${attachment.fileName}`, error);
      }
    }

    return processedFiles;
  }

  async generateResponse(messages, context = {}, attachments = []) {
    try {
      // Build conversation history
      const history = [];

      for (const msg of messages.slice(0, -1)) {
        const parts = [{ text: msg.content }];

        if (msg.attachments && msg.attachments.length > 0) {
          const processedFiles = await this.processAttachments(msg.attachments);
          parts.push(...processedFiles);
        }

        history.push({
          role: msg.is_user ? "user" : "model",
          parts
        });
      }

      const chat = this.model.startChat({
        history,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2000
        }
      });

      // Prepare current message with attachments
      const currentMessage = messages[messages.length - 1];
      const messageParts = [
        {
          text: `${this.legalContext}\nCurrent conversation context: ${JSON.stringify(context)}\nUser query: ${currentMessage.content}`
        }
      ];

      // Process current message attachments
      if (attachments && attachments.length > 0) {
        const processedFiles = await this.processAttachments(attachments);
        messageParts.push(...processedFiles);
      }

      const result = await chat.sendMessage(messageParts);

      return {
        response: result.response.text(),
        usage: {
          inputTokens: result.response.usageMetadata?.promptTokenCount || 0,
          outputTokens: result.response.usageMetadata?.candidatesTokenCount || 0
        }
      };
    } catch (error) {
      console.error("Gemini API error:", error);
      throw new Error(`Failed to generate AI response: ${error.message}`);
    }
  }

  // utils/geminiService.js - add this method inside the GeminiService class

  async detectIntent(userMessage) {
    try {
      const prompt = `
      Analyze this user message and determine their intent.
      
      User message: "${userMessage}"
      
      Possible intents:
      - CREATE_REQUEST_FORM: User wants to create a request form or external ticket form
      - CREATE_CATEGORY: User wants to create a category for internal tickets
      - CREATE_INTERNAL_TICKET: User wants to create/raise an internal ticket or request
      - GENERAL: General legal question or any other conversation
      
      Respond with ONLY a valid JSON object, no markdown, no backticks, no extra text:
      {"intent": "GENERAL", "confidence": 0.9}
    `;

      const result = await this.model.generateContent(prompt);
      const text = result.response.text().trim();

      // Strip any markdown backticks if Gemini adds them
      const cleanJson = text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleanJson);

      console.log('Detected intent:', parsed);
      return parsed;

    } catch (error) {
      console.error('Intent detection error:', error);
      // Default to GENERAL so conversation still works on failure
      return { intent: 'GENERAL', confidence: 0 };
    }
  }

  async processAudio(audioUrl, mimeType, query = "Transcribe and analyze this audio for legal context") {
    try {
      const geminiFile = await this.uploadFileToGemini(audioUrl, mimeType);

      const result = await this.model.generateContent([
        {
          fileData: {
            mimeType: geminiFile.mimeType,
            fileUri: geminiFile.uri
          }
        },
        { text: query }
      ]);

      return result.response.text();
    } catch (error) {
      console.error("Audio processing error:", error);
      throw new Error("Failed to process audio");
    }
  }
}

export default new GeminiService(process.env.GEMINI_API_KEY);
