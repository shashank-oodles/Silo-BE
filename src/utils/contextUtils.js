// utils/contextUtils.js


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



// export const inferContextWithAI = async (message, currentContext) => {
//   const prompt = `
//     Analyze the following user message and suggest updates to the current context.
//     Current Context: ${JSON.stringify(currentContext)}
//     User Message: "${message}"

//     IMPORTANT: Respond with ONLY a valid JSON object. Do NOT include markdown formatting, code blocks, or any other text.
//     Do NOT wrap the response in \`\`\`json or \`\`\`.
//     Just return the raw JSON object.
//   `;

//   const result = await geminiService.generateResponse([
//     { content: prompt, is_user: true }
//   ]);

//   try {
//     // Clean the response - remove markdown code blocks if present
//     let cleanedResponse = result.response.trim();
    
//     // Remove ```json and ``` if they exist
//     cleanedResponse = cleanedResponse.replace(/^```json\s*/i, '');
//     cleanedResponse = cleanedResponse.replace(/^```\s*/i, '');
//     cleanedResponse = cleanedResponse.replace(/\s*```$/i, '');
//     cleanedResponse = cleanedResponse.trim();
    
//     console.log("Cleaned AI response:", cleanedResponse);
    
//     const updatedContext = JSON.parse(cleanedResponse);
//     updatedContext.updated_at = new Date().toISOString();
//     return updatedContext;
//   } catch (error) {
//     console.error("Failed to parse AI context update:", error);
//     console.error("Raw response:", result.response);
//     console.error("Cleaned response:", cleanedResponse);
//     return currentContext;
//   }
// };

import geminiService from './geminiService.js';

// utils/contextUtils.js
export const inferContextWithAI = async (userMessage, existingContext) => {
  try {
    const prompt = `
      Analyze this message and extract legal context.
      
      Message: "${userMessage}"
      Existing context: ${JSON.stringify(existingContext)}
      
      Return ONLY a JSON object with these fields (keep existing values if not mentioned):
      {
        "legalTopic": "...",
        "documentType": "...",
        "jurisdiction": "...",
        "action": "..."
      }
      
      No markdown, no backticks, just JSON.
    `;

    const result = await geminiService.model.generateContent(prompt);
    const text = result.response.text().trim();
    const cleanJson = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleanJson);

    // ✅ Always preserve agentSession and userContext fields
    return {
      ...parsed,
      agentSession: existingContext.agentSession,   // preserve session
      userId: existingContext.userId,
      organizationId: existingContext.organizationId,
      email: existingContext.email,
      name: existingContext.name,
      role: existingContext.role
    };

  } catch (error) {
    console.error('inferContextWithAI error:', error);
    // On failure return existing context unchanged
    return existingContext;
  }
};
// ```

// ---

// ## Why This Happened
// ```
// Message 1: "Create a category"
//   ├── detectIntent → CREATE_CATEGORY ✅
//   ├── saveAgentSession → context.agentSession = { intent, fields... } ✅
//   ├── inferContextWithAI → returns { legalTopic, documentType... }  ← NO agentSession!
//   └── update context → agentSession WIPED ❌

// Message 2: "Test category ssssssssss"
//   ├── getAgentSession → null (wiped!) ❌
//   ├── no session found
//   ├── detectIntent → GENERAL (it's just a name, not a clear intent)
//   └── geminiService.generateResponse → fake response ❌
// ```

// After the fix:
// ```
// Message 1: "Create a category"
//   ├── saveAgentSession → context.agentSession saved ✅
//   ├── inferContextWithAI runs
//   └── agentSession re-injected back ✅

// Message 2: "Test category ssssssssss"  
//   ├── getAgentSession → session found ✅
//   ├── collects name field ✅
//   └── asks next question ✅