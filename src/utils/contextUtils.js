// utils/contextUtils.js
import geminiService from './geminiService.js';

// export const inferContextWithAI = async (message, currentContext) => {
//   const prompt = `
//     Analyze the following user message and suggest updates to the current context.
//     Current Context: ${JSON.stringify(currentContext)}
//     User Message: "${message}"

//     Respond with ONLY a JSON object representing the updated context.
//     Example:
//     {
//       "legalTopic": "contracts",
//       "jurisdiction": "India",
//       "documentType": "NDA",
//       "specificClauses": ["confidentiality"]
//     }
//   `;

//   const result = await geminiService.generateResponse([
//     { content: prompt, is_user: true }
//   ]);

//   try {
//     const updatedContext = JSON.parse(result.response);
//     updatedContext.updated_at = new Date().toISOString();
//     return updatedContext;
//   } catch (error) {
//     console.error("Failed to parse AI context update:", error);
//     return currentContext;
//   }
// };



export const inferContextWithAI = async (message, currentContext) => {
  const prompt = `
    Analyze the following user message and suggest updates to the current context.
    Current Context: ${JSON.stringify(currentContext)}
    User Message: "${message}"

    IMPORTANT: Respond with ONLY a valid JSON object. Do NOT include markdown formatting, code blocks, or any other text.
    Do NOT wrap the response in \`\`\`json or \`\`\`.
    Just return the raw JSON object.

    Example format (return exactly like this):
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
    // Clean the response - remove markdown code blocks if present
    let cleanedResponse = result.response.trim();
    
    // Remove ```json and ``` if they exist
    cleanedResponse = cleanedResponse.replace(/^```json\s*/i, '');
    cleanedResponse = cleanedResponse.replace(/^```\s*/i, '');
    cleanedResponse = cleanedResponse.replace(/\s*```$/i, '');
    cleanedResponse = cleanedResponse.trim();
    
    console.log("Cleaned AI response:", cleanedResponse);
    
    const updatedContext = JSON.parse(cleanedResponse);
    updatedContext.updated_at = new Date().toISOString();
    return updatedContext;
  } catch (error) {
    console.error("Failed to parse AI context update:", error);
    console.error("Raw response:", result.response);
    console.error("Cleaned response:", cleanedResponse);
    return currentContext;
  }
};