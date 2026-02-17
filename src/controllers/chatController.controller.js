// controllers/chatController.js
import geminiService from '../utils/geminiService.js';
import fileService from '../utils/fileService.js';
import { inferContextWithAI } from '../utils/contextUtils.js';
import { createClient } from "@supabase/supabase-js";
import { handleAgentMessage } from '../utils/agentHandler.js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

// export const createChat = async (req, res) => {
//   try {
//     const user_id  = req.user;
//     const { title, initialMessage, context } = req.body;

//     console.log(user_id)

//     // Create chat record
//     const { data: chat, error: chatError } = await supabase
//       .from('aichats')
//       .insert({
//         user_id,
//         title: title || 'New Legal Chat',
//         context: context || {}
//       })
//       .select()
//       .single();

//     if (chatError) throw chatError;

//     // Add initial message if provided
//     if (initialMessage) {
//       await supabase.from('aimessages').insert({
//         chat_id: chat.id,
//         content: initialMessage,
//         is_user: true
//       });
//     }

//     res.status(201).json(chat);
//   } catch (error) {
//     console.log(error)
//     res.status(500).json({ error: error.message });
//   }
// };


export const createChat = async (req, res) => {
  try {
    const user_id = req.user.id; // Ensure you're accessing the user ID correctly
    const { title, initialMessage, context } = req.body;

    const userContext = {
      userId: req.user.id,
      organizationId: req.user.organizationId,
      email: req.user.email,
      name: req.user.name,
      role: req.user.role
    };

    // Create chat record
    const { data: chat, error: chatError } = await supabase
      .from('aichats')
      .insert({
        user_id,
        title: title || 'New Legal Chat',
        context: context || {}
      })
      .select()
      .single();

    if (chatError) throw chatError;

    let aiResponse = null;

    // Add initial message if provided and generate AI response
    if (initialMessage) {
      // Insert user message
      const { data: userMessage, error: insertError } = await supabase
        .from('aimessages')
        .insert({
          chat_id: chat.id,
          content: initialMessage,
          is_user: true
        })
        .select()
        .single();

      if (insertError) throw insertError;

      chat.context = { ...chat.context, ...userContext };

      // Generate AI response
      const { response, usage } = await geminiService.generateResponse(
        [userMessage], // Pass the initial message as context
        chat.context
      );

      // Insert AI response
      const { data: aiMessage, error: aiInsertError } = await supabase
        .from('aimessages')
        .insert({
          chat_id: chat.id,
          content: response,
          is_user: false,
          metadata: {
            usage,
            generated_at: new Date().toISOString()
          }
        })
        .select()
        .single();

      if (aiInsertError) throw aiInsertError;

      aiResponse = aiMessage;
    }

    // Return the chat and AI response (if any)
    res.status(201).json({
      chat,
      initialAiResponse: aiResponse
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({ error: error.message });
  }
};

export const getChatHistory = async (req, res) => {
  try {
    const { chat_id } = req.params;

    // Get chat details
    const { data: chat, error: chatError } = await supabase
      .from('aichats')
      .select('*')
      .eq('id', chat_id)
      .single();

    if (chatError) throw chatError;

    // Get messages
    const { data: messages, error: messagesError } = await supabase
      .from('aimessages')
      .select('*')
      .eq('chat_id', chat_id)
      .order('created_at', { ascending: true });

    if (messagesError) throw messagesError;

    res.json({
      chat,
      messages
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// export const sendMessage = async (req, res) => {
//   try {
//     const { chat_id } = req.params;
//     const { content } = req.body;
//     const { user_id } = req.user;

//     // Get chat context
//     const { data: chat, error: chatError } = await supabase
//       .from('aichats')
//       .select('context')
//       .eq('id', chat_id)
//       .single();

//     if (chatError) throw chatError;

//     // Get message history
//     const { data: messages, error: messagesError } = await supabase
//       .from('aimessages')
//       .select('content, is_user')
//       .eq('chat_id', chat_id)
//       .order('created_at', { ascending: true });

//     if (messagesError) throw messagesError;

//     // Add user message to database
//     const { data: userMessage, error: insertError } = await supabase
//       .from('aimessages')
//       .insert({
//         chat_id,
//         content,
//         is_user: true
//       })
//       .select()
//       .single();

//     if (insertError) throw insertError;

//     // Generate AI response
//     const { response, usage } = await geminiService.generateResponse(
//       [...messages, userMessage],
//       chat.context
//     );

//     // Add AI response to database
//     const { data: aiMessage, error: aiInsertError } = await supabase
//       .from('aimessages')
//       .insert({
//         chat_id,
//         content: response,
//         is_user: false,
//         metadata: {
//           usage,
//           generated_at: new Date().toISOString()
//         }
//       })
//       .select()
//       .single();

//     if (aiInsertError) throw aiInsertError;

//     res.json(aiMessage);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// };

    // export const sendMessage = async (req, res) => {
    // try {
    //     const { chat_id } = req.params;
    //     const { content } = req.body;
    //     const { user_id } = req.user;

    //     // Get chat context and messages
    //     const { data: chat, error: chatError } = await supabase
    //     .from('aichats')
    //     .select('context')
    //     .eq('id', chat_id)
    //     .single();

    //     if (chatError) throw chatError;

    //     const { data: messages, error: messagesError } = await supabase
    //     .from('aimessages')
    //     .select('content, is_user')
    //     .eq('chat_id', chat_id)
    //     .order('created_at', { ascending: true });

    //     if (messagesError) throw messagesError;

    //     // Insert user message
    //     const { data: userMessage, error: insertError } = await supabase
    //     .from('aimessages')
    //     .insert({
    //         chat_id,
    //         content,
    //         is_user: true
    //     })
    //     .select()
    //     .single();

    //     if (insertError) throw insertError;

    //     // Dynamically update context based on user input
    //     const updatedContext = await inferContextWithAI(
    //     content,
    //     chat.context
    //     );

    //     // Update chat context
    //     await supabase
    //     .from('aichats')
    //     .update({
    //         context: updatedContext
    //     })
    //     .eq('id', chat_id);

    //     // Generate AI response with updated context
    //     const { response, usage } = await geminiService.generateResponse(
    //     [...messages, userMessage],
    //     updatedContext
    //     );

    //     // Insert AI response
    //     const { data: aiMessage, error: aiInsertError } = await supabase
    //     .from('aimessages')
    //     .insert({
    //         chat_id,
    //         content: response,
    //         is_user: false,
    //         metadata: {
    //         usage,
    //         generated_at: new Date().toISOString()
    //         }
    //     })
    //     .select()
    //     .single();

    //     if (aiInsertError) throw aiInsertError;

    //     res.json(aiMessage);
    // } catch (error) {
    //     res.status(500).json({ error: error.message });
    // }
    // };

// export const sendMessage = async (req, res) => {
//   try {
//     const { chat_id } = req.params;
//     const { content } = req.body;
//     const user_id = req.user.id;
//     const files = req.files || [];

//     const userContext = {
//       userId: req.user.id,
//       organizationId: req.user.organizationId,
//       email: req.user.email,
//       name: req.user.name
//     };

//     // Get chat context and messages
//     const { data: chat, error: chatError } = await supabase
//       .from('aichats')
//       .select('context')
//       .eq('id', chat_id)
//       .single();

//     if (chatError) throw chatError;

//     const { data: messages, error: messagesError } = await supabase
//       .from('aimessages')
//       .select('content, is_user, attachments')
//       .eq('chat_id', chat_id)
//       .order('created_at', { ascending: true });

//     if (messagesError) throw messagesError;

//     // Upload files to Supabase Storage
//     const uploadedAttachments = [];
//     for (const file of files) {
//       const fileData = await fileService.uploadFile(file, user_id, chat_id);
//       uploadedAttachments.push({
//         type: fileService.getFileType(file.mimetype),
//         url: fileData.url,
//         path: fileData.path,
//         mimeType: fileData.mimeType,
//         fileName: fileData.fileName,
//         size: fileData.size
//       });
//     }

//     // Insert user message with attachments
//     const { data: userMessage, error: insertError } = await supabase
//       .from('aimessages')
//       .insert({
//         chat_id,
//         content: content || 'Sent an attachment',
//         is_user: true,
//         attachments: uploadedAttachments
//       })
//       .select()
//       .maybeSingle();

//     if (insertError) throw insertError;

//     chat.context = { ...chat.context, ...userContext };

//     // Dynamically update context
//     const updatedContext = await inferContextWithAI(
//       content || 'User sent attachments',
//       chat.context
//     );

//     await supabase
//       .from('aichats')
//       .update({ context: updatedContext })
//       .eq('id', chat_id);

//     // Generate AI response with attachments
//     const { response, usage } = await geminiService.generateResponse(
//       [...messages, userMessage],
//       updatedContext,
//       uploadedAttachments
//     );

//     // Insert AI response
//     const { data: aiMessage, error: aiInsertError } = await supabase
//       .from('aimessages')
//       .insert({
//         chat_id,
//         content: response,
//         is_user: false,
//         metadata: {
//           usage,
//           generated_at: new Date().toISOString(),
//           processedAttachments: uploadedAttachments.length
//         }
//       })
//       .select()
//       .maybeSingle();

//     if (aiInsertError) throw aiInsertError;

//     res.json({
//       message: aiMessage,
//       attachments: uploadedAttachments
//     });
//   } catch (error) {
//     console.error('Send message error:', error);
//     res.status(500).json({ error: error.message });
//   }
// };

// export const sendMessage = async (req, res) => {
//   try {
//     const { chat_id } = req.params;
//     const { content } = req.body;
//     const user_id = req.user.id;
//     const files = req.files || [];
//     const authToken = req.headers.authorization?.replace('Bearer ', '');

//     // ✅ Already fully populated from your auth middleware
//     const userContext = {
//       userId: req.user.id,
//       organizationId: req.user.organizationId,
//       email: req.user.email,
//       name: req.user.name,
//       role: req.user.role
//     };

//     // Get chat context
//     const { data: chat, error: chatError } = await supabase
//       .from('aichats')
//       .select('context')
//       .eq('id', chat_id)
//       .single();

//     if (chatError) throw chatError;

//     // Get message history
//     const { data: messages, error: messagesError } = await supabase
//       .from('aimessages')
//       .select('content, is_user, attachments')
//       .eq('chat_id', chat_id)
//       .order('created_at', { ascending: true });

//     if (messagesError) throw messagesError;

//     // Upload files if any
//     const uploadedAttachments = [];
//     for (const file of files) {
//       const fileData = await fileService.uploadFile(file, user_id, chat_id);
//       uploadedAttachments.push({
//         type: fileService.getFileType(file.mimetype),
//         url: fileData.url,
//         path: fileData.path,
//         mimeType: fileData.mimeType,
//         fileName: fileData.fileName,
//         size: fileData.size
//       });
//     }

//     // Save user message
//     const { data: userMessage, error: insertError } = await supabase
//       .from('aimessages')
//       .insert({
//         chat_id,
//         content: content || 'Sent an attachment',
//         is_user: true,
//         attachments: uploadedAttachments
//       })
//       .select()
//       .maybeSingle();

//     if (insertError) throw insertError;

//     // Merge userContext into chat context
//     chat.context = { ...chat.context, ...userContext };

//     // Update context with AI inference
//     const updatedContext = await inferContextWithAI(
//       content || 'User sent attachments',
//       chat.context
//     );

//     await supabase
//       .from('aichats')
//       .update({ context: updatedContext })
//       .eq('id', chat_id);

//     let aiResponseContent;
//     let usage = null;

//     // ✅ Check if message has attachments - skip agent, go directly to Gemini
//     if (uploadedAttachments.length > 0) {
//       const result = await geminiService.generateResponse(
//         [...messages, userMessage],
//         updatedContext,
//         uploadedAttachments
//       );
//       aiResponseContent = result.response;
//       usage = result.usage;

//     } else {
//       // ✅ Route through agent handler for intent detection + action execution
//       const agentResult = await handleAgentMessage(
//         chat_id,
//         content,
//         [...messages, userMessage],
//         updatedContext,
//         authToken,
//         userContext
//       );

//       aiResponseContent = agentResult.response;
//       usage = agentResult.usage || null;
//     }

//     // Save AI response
//     const { data: aiMessage, error: aiInsertError } = await supabase
//       .from('aimessages')
//       .insert({
//         chat_id,
//         content: aiResponseContent,
//         is_user: false,
//         metadata: {
//           usage,
//           generated_at: new Date().toISOString(),
//           processedAttachments: uploadedAttachments.length
//         }
//       })
//       .select()
//       .maybeSingle();

//     if (aiInsertError) throw aiInsertError;

//     res.json({
//       message: aiMessage,
//       attachments: uploadedAttachments
//     });

//   } catch (error) {
//     console.error('Send message error:', error);
//     res.status(500).json({ error: error.message });
//   }
// };

// controllers/chatController.controller.js

export const sendMessage = async (req, res) => {
  try {
    const { chat_id } = req.params;
    const { content } = req.body;
    const user_id = req.user.id;
    const files = req.files || [];

    const userContext = {
      userId: req.user.id,
      organizationId: req.user.organizationId,
      email: req.user.email,
      name: req.user.name,
      role: req.user.role
    };

    const { data: chat, error: chatError } = await supabase
      .from('aichats')
      .select('context')
      .eq('id', chat_id)
      .single();

    if (chatError) throw chatError;

    const { data: messages, error: messagesError } = await supabase
      .from('aimessages')
      .select('content, is_user, attachments')
      .eq('chat_id', chat_id)
      .order('created_at', { ascending: true });

    if (messagesError) throw messagesError;

    const uploadedAttachments = [];
    for (const file of files) {
      const fileData = await fileService.uploadFile(file, user_id, chat_id);
      uploadedAttachments.push({
        type: fileService.getFileType(file.mimetype),
        url: fileData.url,
        path: fileData.path,
        mimeType: fileData.mimeType,
        fileName: fileData.fileName,
        size: fileData.size
      });
    }

    const { data: userMessage, error: insertError } = await supabase
      .from('aimessages')
      .insert({
        chat_id,
        content: content || 'Sent an attachment',
        is_user: true,
        attachments: uploadedAttachments
      })
      .select()
      .maybeSingle();

    if (insertError) throw insertError;

    // ✅ Preserve agentSession before inferContextWithAI overwrites it
    const existingAgentSession = chat.context?.agentSession || null;

    // console.log("Existing agent session before context update:", existingAgentSession);

    chat.context = { ...chat.context, ...userContext };

    const updatedContext = await inferContextWithAI(
      content || 'User sent attachments',
      chat.context
    );

    // ✅ Re-inject agentSession back after inferContextWithAI
    if (existingAgentSession) {
      updatedContext.agentSession = existingAgentSession;
    }

    await supabase
      .from('aichats')
      .update({ context: updatedContext })
      .eq('id', chat_id);

    let aiResponseContent;
    let usage = null;

    if (uploadedAttachments.length > 0) {
      const result = await geminiService.generateResponse(
        [...messages, userMessage],
        updatedContext,
        uploadedAttachments
      );
      aiResponseContent = result.response;
      usage = result.usage;
    } else {
      const agentResult = await handleAgentMessage(
        chat_id,
        content,
        [...messages, userMessage],
        updatedContext,
        userContext
      );
      aiResponseContent = agentResult.response;
      usage = agentResult.usage || null;
    }

    const { data: aiMessage, error: aiInsertError } = await supabase
      .from('aimessages')
      .insert({
        chat_id,
        content: aiResponseContent,
        is_user: false,
        metadata: {
          usage,
          generated_at: new Date().toISOString(),
          processedAttachments: uploadedAttachments.length
        }
      })
      .select()
      .maybeSingle();

    if (aiInsertError) throw aiInsertError;

    res.json({
      message: aiMessage,
      attachments: uploadedAttachments
    });

  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: error.message });
  }
};
// ```

// ---

// ## What Changed & Why
// ```
// BEFORE:
// sendMessage → geminiService.generateResponse() always

// AFTER:
// sendMessage
//   ├── Has attachments? → geminiService directly (Gemini handles files)
//   └── Text only?       → handleAgentMessage()
//                             ├── Intent = action?  → collect fields → execute API
//                             └── Intent = GENERAL? → geminiService normally

export const updateChatContext = async (req, res) => {
    try {
        const { chat_id } = req.params;
        const { context } = req.body;

        const { data, error } = await supabase
        .from('aichats')
        .update({
            context: {
            ...context,
            updated_at: new Date().toISOString()
            }
        })
        .eq('id', chat_id)
        .select()
        .single();

        if (error) throw error;

        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
