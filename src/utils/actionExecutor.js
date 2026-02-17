// utils/actionExecutor.js
import { AGENT_ACTIONS } from './agentActions.js';

export const executeAction = async (intent, collectedFields, userContext) => {
  const action = AGENT_ACTIONS[intent];

  if (!action?.execute) {
    return { success: false, error: `No executor found for intent: ${intent}` };
  }

  try {
    return await action.execute(collectedFields, userContext);
  } catch (error) {
    console.error(`executeAction error for ${intent}:`, error);
    return { success: false, error: error.message };
  }
};