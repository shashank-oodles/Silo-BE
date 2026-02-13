// utils/contextUtils.js
import geminiService from './geminiService.js';

export const inferContextWithAI = async (message, currentContext) => {
  const prompt = `
    Analyze the following user message and suggest updates to the current context.
    Current Context: ${JSON.stringify(currentContext)}
    User Message: "${message}"

    Respond with ONLY a JSON object representing the updated context.
    Example:
    {
      "legalTopic": "contracts",
      "jurisdiction": "India",
      "documentType": "NDA",
      "specificClauses": ["confidentiality"]
    }
  `;

  const result = await geminiService.generateResponse([
    { content: prompt, is_user: true }
  ]);

  try {
    const updatedContext = JSON.parse(result.response);
    updatedContext.updated_at = new Date().toISOString();
    return updatedContext;
  } catch (error) {
    console.error("Failed to parse AI context update:", error);
    return currentContext;
  }
};
