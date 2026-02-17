// utils/agentSessionManager.js
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const getAgentSession = async (chatId) => {
  try {
    const { data, error } = await supabase
      .from('aichats')
      .select('context')
      .eq('id', chatId)
      .single();

    if (error) throw error;

    return data?.context?.agentSession || null;
  } catch (error) {
    console.error('getAgentSession error:', error);
    return null;
  }
};

export const saveAgentSession = async (chatId, session) => {
  try {
    // First get existing context so we don't overwrite other fields
    const { data, error: fetchError } = await supabase
      .from('aichats')
      .select('context')
      .eq('id', chatId)
      .single();

    if (fetchError) throw fetchError;

    const updatedContext = {
      ...(data?.context || {}),
      agentSession: session
    };

    const { error: updateError } = await supabase
      .from('aichats')
      .update({ context: updatedContext })
      .eq('id', chatId);

    if (updateError) throw updateError;

    console.log(`💾 Session saved for chat: ${chatId}`);
  } catch (error) {
    console.error('saveAgentSession error:', error);
    throw error;
  }
};

export const clearAgentSession = async (chatId) => {
  try {
    const { data, error: fetchError } = await supabase
      .from('aichats')
      .select('context')
      .eq('id', chatId)
      .single();

    if (fetchError) throw fetchError;

    // Remove agentSession but keep other context fields
    const updatedContext = { ...(data?.context || {}) };
    delete updatedContext.agentSession;

    const { error: updateError } = await supabase
      .from('aichats')
      .update({ context: updatedContext })
      .eq('id', chatId);

    if (updateError) throw updateError;

    console.log(`🗑️ Session cleared for chat: ${chatId}`);
  } catch (error) {
    console.error('clearAgentSession error:', error);
    throw error;
  }
};