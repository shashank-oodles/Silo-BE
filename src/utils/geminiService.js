// // src/utils/geminiService.js
// import 'dotenv/config';
// import { GoogleGenerativeAI } from "@google/generative-ai";
// import { GoogleAIFileManager } from "@google/generative-ai/server";
// import fetch from 'node-fetch';
// import os from 'os';
// import path from 'path';
// import fs from 'fs';

// class GeminiService {
//   constructor(apiKey) {
//     this.genAI = new GoogleGenerativeAI(apiKey);
//     this.fileManager = new GoogleAIFileManager(apiKey);
//     this.model = this.genAI.getGenerativeModel({
//       model: "gemma-3-4b-it"
//     });

//     this.legalContext = `
//       You are Silo Agent, a legal-focused AI assistant.
//       Your responses must:
//       1. Be strictly related to legal matters
//       2. Avoid giving medical, financial, or general advice
//       3. Cite relevant legal principles when possible
//       4. Be concise and professional
//       5. When analyzing documents, images, or audio, focus on legal implications
//       6. When unsure, say "I need more context to provide an accurate legal response",
//       7. Always answer for those questions without legal interfrence, which is already provided in the context, for example upon asking my organizationId, name and email you can asnwer because it has already been provided in context.
//       8. Make sure you answer in language of the question, for example if the question is in spanish answer in spanish, if the question is in english answer in english.
//     `;
//   }

//   async uploadFileToGemini(fileUrl, mimeType) {
//     try {
//       // Download file from Supabase
//       const response = await fetch(fileUrl);
//       const buffer = Buffer.from(await response.arrayBuffer()); // Use arrayBuffer()

//       // Use system temp directory
//       const tempDir = os.tmpdir();
//       const tempPath = path.join(tempDir, `gemini-upload-${Date.now()}-${Math.random().toString(36).substring(7)}`);

//       // Ensure directory exists
//       if (!fs.existsSync(tempDir)) {
//         fs.mkdirSync(tempDir, { recursive: true });
//       }

//       // Write file to temp directory
//       fs.writeFileSync(tempPath, buffer);

//       // Upload to Gemini
//       const uploadResult = await this.fileManager.uploadFile(tempPath, {
//         mimeType,
//         displayName: `attachment-${Date.now()}`
//       });

//       // Clean up temp file
//       fs.unlinkSync(tempPath);

//       return uploadResult.file;
//     } catch (error) {
//       console.error('Gemini file upload error:', error);
//       throw new Error('Failed to upload file to Gemini');
//     }
//   }

//   // utils/geminiService.js

// async translateText(text, targetLanguage) {
//   try {
//     // Skip translation if target is English
//     if (targetLanguage === 'en') return text;

//     const prompt = `
//       Translate this text to ${targetLanguage}. 
//       Maintain the same tone and formatting (including markdown like *(required)* or *(optional)*).
      
//       Text to translate: "${text}"
      
//       Respond with ONLY the translated text, nothing else.
//     `;

//     const result = await this.model.generateContent(prompt);
//     return result.response.text().trim();

//   } catch (error) {
//     console.error('Translation error:', error);
//     return text; // Return original on error
//   }
// }

//   async processAttachments(attachments) {
//     const processedFiles = [];

//     for (const attachment of attachments) {
//       try {
//         const geminiFile = await this.uploadFileToGemini(
//           attachment.url,
//           attachment.mimeType
//         );

//         processedFiles.push({
//           fileData: {
//             mimeType: geminiFile.mimeType,
//             fileUri: geminiFile.uri
//           }
//         });
//       } catch (error) {
//         console.error(`Failed to process attachment: ${attachment.fileName}`, error);
//       }
//     }

//     return processedFiles;
//   }
  
// // utils/geminiService.js

// async generateResponse(messages, context = {}, attachments = [], userLanguage = 'en') {
//     try {
//         // Build conversation history
//         const history = [];

//         for (const msg of messages.slice(0, -1)) {
//             const parts = [{ text: msg.content }];

//             if (msg.attachments && msg.attachments.length > 0) {
//                 const processedFiles = await this.processAttachments(msg.attachments);
//                 parts.push(...processedFiles);
//             }

//             history.push({
//                 role: msg.is_user ? "user" : "model",
//                 parts
//             });
//         }

//         const chat = this.model.startChat({
//             history,
//             generationConfig: {
//                 temperature: 0.7,
//                 maxOutputTokens: 2000
//             }
//         });

//         // ✅ Add language instruction
//         let languageInstruction = '';
//         if (userLanguage && userLanguage !== 'en') {
//             const languageNames = {
//                 'es': 'Spanish (Español)',
//                 'fr': 'French (Français)', 
//                 'de': 'German (Deutsch)',
//                 'hi': 'Hindi (हिन्दी)',
//                 'pt': 'Portuguese (Português)',
//                 'it': 'Italian (Italiano)',
//                 'ru': 'Russian (Русский)'
//             };
//             const langName = languageNames[userLanguage] || userLanguage;
//             languageInstruction = `IMPORTANT: The user is communicating in ${langName}. Please respond in the same language (${langName}) to maintain consistency in the conversation.\n\n`;
//         }

//         // Prepare current message with attachments
//         const currentMessage = messages[messages.length - 1];
//         const messageParts = [
//             {
//                 // ✅ Add language instruction to the prompt
//                 text: `${languageInstruction}${this.legalContext}\nCurrent conversation context: ${JSON.stringify(context)}\nUser query: ${currentMessage.content}`
//             }
//         ];

//         // Process current message attachments
//         if (attachments && attachments.length > 0) {
//             const processedFiles = await this.processAttachments(attachments);
//             messageParts.push(...processedFiles);
//         }

//         const result = await chat.sendMessage(messageParts);

//         return {
//             response: result.response.text(),
//             usage: {
//                 inputTokens: result.response.usageMetadata?.promptTokenCount || 0,
//                 outputTokens: result.response.usageMetadata?.candidatesTokenCount || 0
//             }
//         };
//     } catch (error) {
//         console.error("Gemini API error:", error);
//         throw new Error(`Failed to generate AI response: ${error.message}`);
//     }
// }

// async detectIntent(userMessage) {
//   try {
//     const prompt = `
//       Analyze this user message and determine their intent.
      
//       User message: "${userMessage}"
      
//       BE VERY SPECIFIC about what each intent means:
      
//       - CREATE_REQUEST_FORM: User wants to create a FORM/TEMPLATE that external people will fill out to submit tickets (like "crear formulario de solicitud", "make a form", "ticket submission form")
      
//       - CREATE_CATEGORY: User wants to create a category/classification for organizing internal tickets (like "crear categoría", "make category", "nueva categoría")
      
//       - CREATE_INTERNAL_TICKET: User wants to raise/submit a specific ticket/request (like "crear ticket", "raise ticket", "necesito ayuda con", "tengo un problema")
      
//       - GENERAL: Everything else including:
//         * Legal document creation (contracts, NDAs, agreements)
//         * Legal advice and consultation
//         * Document review and analysis
//         * General questions about law
//         * Examples: "draft an NDA", "acuerdo de confidencialidad", "contrato", "legal advice", "what is contract law"
      
//       IMPORTANT: If user wants to CREATE/DRAFT a legal document (like NDA, contract, agreement), this is GENERAL, NOT CREATE_REQUEST_FORM.
      
//       Language detection:
//       - Spanish words → "es"
//       - English words → "en"
//       - Hindi words → "hi"
//       - French words → "fr"
      
//       Respond with ONLY a valid JSON object:
//       {"intent": "GENERAL", "confidence": 0.95, "language": "es"}
//     `;

//     const result = await this.model.generateContent(prompt);
//     const text = result.response.text().trim();
//     const cleanJson = text.replace(/```json|```/g, '').trim();
//     const parsed = JSON.parse(cleanJson);

//     console.log('🔍 Detected intent:', parsed);
//     return parsed;

//   } catch (error) {
//     console.error('Intent detection error:', error);
//     return { intent: 'GENERAL', confidence: 0, language: 'en' };
//   }
// }

//   async processAudio(audioUrl, mimeType, query = "Transcribe and analyze this audio for legal context") {
//     try {
//       const geminiFile = await this.uploadFileToGemini(audioUrl, mimeType);

//       const result = await this.model.generateContent([
//         {
//           fileData: {
//             mimeType: geminiFile.mimeType,
//             fileUri: geminiFile.uri
//           }
//         },
//         { text: query }
//       ]);

//       return result.response.text();
//     } catch (error) {
//       console.error("Audio processing error:", error);
//       throw new Error("Failed to process audio");
//     }
//   }
// }

// export default new GeminiService(process.env.GEMINI_API_KEY);

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
      8. Make sure you answer in language of the question, for example if the question is in spanish answer in spanish, if the question is in english answer in english.
    `;
  }

  // ✅ Enhanced Language Detection Function
  async detectLanguage(text) {
    try {
      const prompt = `
        Detect the language of this text with high accuracy.
        
        Text: "${text}"
        
        Rules:
        - Analyze vocabulary, grammar, and syntax patterns
        - Consider mixed language usage (choose dominant language)
        - Be very confident in detection
        
        Language codes:
        - "en" for English
        - "es" for Spanish  
        - "fr" for French
        - "de" for German
        - "hi" for Hindi
        - "pt" for Portuguese
        - "it" for Italian
        - "ru" for Russian
        
        Respond with ONLY the language code, nothing else.
        Examples: "en", "es", "fr"
      `;

      const result = await this.model.generateContent(prompt);
      const detectedLang = result.response.text().trim().toLowerCase();
      
      // Validate response
      const validLanguages = ['en', 'es', 'fr', 'de', 'hi', 'pt', 'it', 'ru'];
      if (validLanguages.includes(detectedLang)) {
        console.log(`🌍 Language detected: ${detectedLang} for text: "${text.substring(0, 50)}..."`);
        return detectedLang;
      }
      
      // Fallback to English if detection fails
      return 'en';

    } catch (error) {
      console.error('Language detection error:', error);
      return 'en'; // Default fallback
    }
  }

  // ✅ Improved Intent Detection
  async detectIntent(userMessage) {
    try {
      // First detect language separately for better accuracy
      const language = await this.detectLanguage(userMessage);
      
      const prompt = `
        Analyze this user message and determine their intent.
        
        User message: "${userMessage}"
        
        Intent categories:
        - CREATE_REQUEST_FORM: Create form/template for external submissions
        - CREATE_CATEGORY: Create ticket category/classification  
        - CREATE_INTERNAL_TICKET: Raise/submit specific ticket/request
        - GENERAL: Legal advice, document drafting, law questions
        
        Multilingual examples:
        CREATE_REQUEST_FORM: "create form", "hacer formulario", "créer formulaire"
        CREATE_CATEGORY: "create category", "crear categoría", "créer catégorie"  
        CREATE_INTERNAL_TICKET: "raise ticket", "crear ticket", "créer ticket"
        GENERAL: "legal advice", "asesoría legal", "conseil juridique", "draft contract"
        
        Respond with ONLY valid JSON:
        {"intent": "GENERAL", "confidence": 0.95}
      `;

      const result = await this.model.generateContent(prompt);
      const text = result.response.text().trim();
      const cleanJson = text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleanJson);

      // Add the separately detected language
      parsed.language = language;

      console.log('🔍 Detected intent:', parsed);
      return parsed;

    } catch (error) {
      console.error('Intent detection error:', error);
      return { intent: 'GENERAL', confidence: 0, language: 'en' };
    }
  }

  // ✅ Enhanced Translation Function
  async translateText(text, targetLanguage) {
    try {
      // Skip translation if target is English
      if (targetLanguage === 'en') return text;

      const prompt = `
        Translate this text to ${targetLanguage}. 
        Maintain the same tone and formatting (including markdown like *(required)* or *(optional)*).
        
        Text to translate: "${text}"
        
        Respond with ONLY the translated text, nothing else.
      `;

      const result = await this.model.generateContent(prompt);
      return result.response.text().trim();

    } catch (error) {
      console.error('Translation error:', error);
      return text; // Return original on error
    }
  }

  // ✅ Enhanced Generate Response with Better Language Control
  async generateResponse(messages, context = {}, attachments = [], userLanguage = null) {
    try {
        // ✅ Auto-detect language if not provided
        if (!userLanguage) {
            const currentMessage = messages[messages.length - 1];
            userLanguage = await this.detectLanguage(currentMessage.content);
        }

        console.log(`🌍 Responding in language: ${userLanguage}`);

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

        // ✅ Much stronger language instruction
        let languageInstruction = '';
        if (userLanguage && userLanguage !== 'en') {
            const languageNames = {
                'es': 'Spanish',
                'fr': 'French', 
                'de': 'German',
                'hi': 'Hindi',
                'pt': 'Portuguese',
                'it': 'Italian',
                'ru': 'Russian'
            };
            const langName = languageNames[userLanguage] || userLanguage;
            
            languageInstruction = `CRITICAL INSTRUCTION: You MUST respond in ${langName} language. This is mandatory. Do NOT respond in English or any other language. The user is communicating in ${langName}, so your entire response must be in ${langName}.\n\n`;
        } else {
            languageInstruction = `CRITICAL INSTRUCTION: You MUST respond in English. This is mandatory.\n\n`;
        }

        // Prepare current message with attachments
        const currentMessage = messages[messages.length - 1];
        const messageParts = [
            {
                text: `${languageInstruction}${this.legalContext}\nCurrent conversation context: ${JSON.stringify(context)}\nUser query: ${currentMessage.content}`
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