// controllers/chatController.js
import geminiService from '../utils/geminiService.js';
import { inferContextWithAI } from '../utils/contextUtils.js';
import { createClient } from "@supabase/supabase-js";

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
    const user_id = req.user; // Ensure you're accessing the user ID correctly
    const { title, initialMessage, context } = req.body;

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

export const sendMessage = async (req, res) => {
  try {
    const { chat_id } = req.params;
    const { content } = req.body;
    const { user_id } = req.user;

    // Get chat context and messages
    const { data: chat, error: chatError } = await supabase
      .from('aichats')
      .select('context')
      .eq('id', chat_id)
      .single();

    if (chatError) throw chatError;

    const { data: messages, error: messagesError } = await supabase
      .from('aimessages')
      .select('content, is_user')
      .eq('chat_id', chat_id)
      .order('created_at', { ascending: true });

    if (messagesError) throw messagesError;

    // Insert user message
    const { data: userMessage, error: insertError } = await supabase
      .from('aimessages')
      .insert({
        chat_id,
        content,
        is_user: true
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Dynamically update context based on user input
    const updatedContext = await inferContextWithAI(
      content,
      chat.context
    );

    // Update chat context
    await supabase
      .from('aichats')
      .update({
        context: updatedContext
      })
      .eq('id', chat_id);

    // Generate AI response with updated context
    const { response, usage } = await geminiService.generateResponse(
      [...messages, userMessage],
      updatedContext
    );

    // Insert AI response
    const { data: aiMessage, error: aiInsertError } = await supabase
      .from('aimessages')
      .insert({
        chat_id,
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

    res.json(aiMessage);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


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
