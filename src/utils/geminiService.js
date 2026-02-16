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
      6. When unsure, say "I need more context to provide an accurate legal response"
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
