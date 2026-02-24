// import geminiService from './geminiService.js';
// import { AGENT_ACTIONS, ALLOWED_ROLES } from './agentActions.js';
// import { executeAction } from './actionExecutor.js';
// import { getAgentSession, saveAgentSession, clearAgentSession } from './agentSessionManager.js';
// import { fetchCategoriesByOrg, resolveCategory, formatCategoryList } from './categoryResolver.js';
// import { fetchTeamsByOrg, resolveTeam, formatTeamList } from './teamResolver.js';

// // ─── Helpers ────────────────────────────────────────────────

// const hasPermission = (intent, userRole) => {
//     const allowedRoles = ALLOWED_ROLES[intent];
//     if (!allowedRoles) return true;
//     return allowedRoles.includes(userRole?.toLowerCase());
// };

// const getRoleErrorMessage = (intent, role) => {
//     const actionNames = {
//         CREATE_REQUEST_FORM: 'create Request Forms',
//         CREATE_CATEGORY: 'create Categories'
//     };
//     const actionName = actionNames[intent] || 'perform this action';
//     const allowedRoles = ALLOWED_ROLES[intent]?.join(', ') || 'admin, owner, legal';

//     return `🚫 **Access Denied**\n\nYou don't have permission to ${actionName}.\n\n- **Your role:** ${role || 'unknown'}\n- **Required roles:** ${allowedRoles}\n\nPlease contact your administrator if you need access.`;
// };

// // const isEmpty = (value) => !value || value.trim() === '';
// const isEmpty = (value) => {
//     if (!value || value.trim() === '') return true;
//     const normalized = value.trim().toLowerCase();
//     return normalized === 'skip' || normalized === 'none' || normalized === 'n/a' || normalized === 'null' || normalized === 'NA';
// };

// const normalizeBoolean = (value) => {
//     const v = value?.toLowerCase().trim();
//     return ['yes', 'y'].includes(v) ? 'yes' : 'no';
// };

// const isCancelIntent = (message) => {
//     const cancelWords = ['cancel', 'stop', 'quit', 'exit', 'nevermind', 'never mind', 'abort'];
//     return cancelWords.some(word => message.toLowerCase().includes(word));
// };

// const getActionLabel = (intent) => ({
//     CREATE_REQUEST_FORM: 'create a Request Form',
//     CREATE_CATEGORY: 'create a Category',
//     CREATE_INTERNAL_TICKET: 'raise an Internal Ticket'
// }[intent] || 'process your request');

// // Auto-populate fields marked auto: true from userContext
// const autoPopulateFields = (intent, userContext) => {
//     const action = AGENT_ACTIONS[intent];
//     const autoFields = {};

//     action.requiredFields
//         .filter(f => f.auto === true)
//         .forEach(field => {
//             const value = userContext[field.autoFrom];
//             if (value) {
//                 autoFields[field.key] = value;
//                 console.log(`🤖 Auto-populated: ${field.key} =`, value);
//             } else {
//                 console.warn(`⚠️ Missing userContext.${field.autoFrom} for field ${field.key}`);
//             }
//         });

//     return autoFields;
// };

// // Get labels for required fields user needs to answer
// const getRequiredFieldLabels = (intent) => {
//     const action = AGENT_ACTIONS[intent];
//     return action.requiredFields
//         .filter(f => f.required && !f.auto && !f.resolved)
//         .map(f => `• ${f.label}`)
//         .join('\n');
// };

// // Get labels for auto-filled fields
// const getAutoFieldLabels = (intent, userContext) => {
//     const action = AGENT_ACTIONS[intent];
//     return action.requiredFields
//         .filter(f => f.auto)
//         .map(f => `• ${f.label}: ${userContext[f.autoFrom] || 'N/A'}`)
//         .join('\n');
// };

// // Get next field - skips auto + resolved fields
// const getNextField = (action, session) => {
//     const fields = action.requiredFields;

//     for (let i = session.currentFieldIndex; i < fields.length; i++) {
//         const field = fields[i];

//         // Skip auto-populated fields
//         if (field.auto) {
//             session.currentFieldIndex = i + 1;
//             continue;
//         }

//         // Skip resolved fields (categoryId handled separately)
//         if (field.resolved) {
//             session.currentFieldIndex = i + 1;
//             continue;
//         }

//         // Skip dependency fields if condition not met
//         if (field.dependsOn) {
//             const depValue = session.collectedFields[field.dependsOn.key];
//             if (normalizeBoolean(depValue) !== field.dependsOn.value) {
//                 session.collectedFields[field.key] = null;
//                 session.currentFieldIndex = i + 1;
//                 continue;
//             }
//         }

//         session.currentFieldIndex = i;
//         return field;
//     }

//     return null;
// };

// const buildConfirmationSummary = (intent, collectedFields, userContext) => {
//   const action = AGENT_ACTIONS[intent];
//   const lines = [`📋 **Summary before proceeding:**\n`];

//   action.requiredFields
//     .filter(f => !f.auto)
//     .forEach(field => {
//       const value = collectedFields[field.key];
//       if (value !== undefined && value !== null) {
//         if (field.key === 'categoryId') {
//           lines.push(`- **Category:** ${collectedFields['_categoryName']} (ID: ${value})`);
//         } else if (field.key === 'assignedTeamId') {
//           // ✅ Show team name instead of ID
//           lines.push(`- **Assigned Team:** ${collectedFields['_teamName']} (ID: ${value})`);
//         } else {
//           lines.push(`- **${field.label}:** ${value}`);
//         }
//       } else if (field.key === 'assignedTeamId' && !value) {
//         lines.push(`- **Assigned Team:** None`);
//       }
//     });

//   const autoFields = action.requiredFields.filter(f => f.auto);
//   if (autoFields.length > 0) {
//     lines.push(`\n🤖 **Auto-filled from your account:**`);
//     autoFields.forEach(f => {
//       const value = userContext[f.autoFrom];
//       if (value) lines.push(`- **${f.label}:** ${value}`);
//     });
//   }

//   lines.push(`\nShall I proceed? (yes/no)`);
//   return lines.join('\n');
// };

// export const handleAgentMessage = async (
//     chatId,
//     userMessage,
//     messages,
//     context,
//     userContext
// ) => {
//     try {
//         // Cancel check
//         if (isCancelIntent(userMessage)) {
//             const session = await getAgentSession(chatId);
//             if (session) {
//                 await clearAgentSession(chatId);
//                 return { response: "Cancelled! How else can I help you?", isAgentFlow: false };
//             }
//         }

//         let session = await getAgentSession(chatId);

//         // ── Awaiting confirmation (yes/no to proceed) ──────────────
//         if (session?.awaitingConfirmation) {
//             const confirmed = normalizeBoolean(userMessage);

//             if (confirmed === 'yes') {
//                 // const result = await executeAction(session.intent, session.collectedFields, authToken);
//                 const result = await executeAction(
//                     session.intent,
//                     session.collectedFields,
//                     session.userContext  // ← pass full userContext
//                 );
//                 await clearAgentSession(chatId);

//                 if (result.success) {
//                     const action = AGENT_ACTIONS[session.intent];
//                     return {
//                         response: action.successMessage(result.data) + "\n\nIs there anything else I can help you with?",
//                         isAgentFlow: true
//                     };
//                 } else {
//                     return {
//                         response: `❌ Failed: ${result.error}\n\nWould you like to try again?`,
//                         isAgentFlow: true
//                     };
//                 }
//             } else {
//                 await clearAgentSession(chatId);
//                 return {
//                     response: "Alright, cancelled! Let me know if you'd like to start over.",
//                     isAgentFlow: true
//                 };
//             }
//         }

//         // ── Awaiting category selection ────────────────────────────
//         if (session?.awaitingCategorySelection) {
//             const categories = session.availableCategories;
//             const matched = resolveCategory(categories, userMessage);

//             if (!matched) {
//                 const list = formatCategoryList(categories);
//                 return {
//                     response: `⚠️ Could not find that category. Please pick by name or number:\n\n${list}`,
//                     isAgentFlow: true
//                 };
//             }

//             // Resolved! Store ID and name
//             session.collectedFields['categoryId'] = matched.id;
//             session.collectedFields['_categoryName'] = matched.name; // for display only
//             session.awaitingCategorySelection = false;
//             delete session.availableCategories;
//             await saveAgentSession(chatId, session);

//             // Move to next field
//             const action = AGENT_ACTIONS[session.intent];
//             const nextField = getNextField(action, session);
//             await saveAgentSession(chatId, session);

//             if (nextField) {
//                 const label = nextField.required ? '*(required)*' : '*(optional)*';
//                 return {
//                     response: `Great! Category set to **${matched.name}**.\n\n${label} ${nextField.question}`,
//                     isAgentFlow: true
//                 };
//             } else {
//                 session.awaitingConfirmation = true;
//                 await saveAgentSession(chatId, session);
//                 return {
//                     response: buildConfirmationSummary(session.intent, session.collectedFields, session.userContext),
//                     isAgentFlow: true
//                 };
//             }
//         }

//         // ── Awaiting team selection ────────────────────────────────
//         if (session?.awaitingTeamSelection) {
//             const teams = session.availableTeams;
//             const userInput = userMessage.trim();

//             // Allow skipping since assignedTeamId is optional
//             if (isEmpty(userInput)) {
//                 session.collectedFields['assignedTeamId'] = null;
//                 session.collectedFields['_teamName'] = null;
//                 session.awaitingTeamSelection = false;
//                 delete session.availableTeams;
//                 await saveAgentSession(chatId, session);

//                 const action = AGENT_ACTIONS[session.intent];
//                 const nextField = getNextField(action, session);
//                 await saveAgentSession(chatId, session);

//                 if (nextField) {
//                     const label = nextField.required ? '*(required)*' : '*(optional)*';
//                     return {
//                         response: `Skipped team assignment.\n\n${label} ${nextField.question}`,
//                         isAgentFlow: true
//                     };
//                 } else {
//                     session.awaitingConfirmation = true;
//                     await saveAgentSession(chatId, session);
//                     return {
//                         response: buildConfirmationSummary(session.intent, session.collectedFields, session.userContext),
//                         isAgentFlow: true
//                     };
//                 }
//             }

//             const matched = resolveTeam(teams, userInput);

//             if (!matched) {
//                 const list = formatTeamList(teams);
//                 return {
//                     response: `⚠️ Could not find that team. Please pick by name or number (or leave blank to skip):\n\n${list}`,
//                     isAgentFlow: true
//                 };
//             }

//             // Resolved! Store team ID and name
//             session.collectedFields['assignedTeamId'] = matched.id;
//             session.collectedFields['_teamName'] = matched.name;
//             session.awaitingTeamSelection = false;
//             delete session.availableTeams;
//             await saveAgentSession(chatId, session);

//             const action = AGENT_ACTIONS[session.intent];
//             const nextField = getNextField(action, session);
//             await saveAgentSession(chatId, session);

//             if (nextField) {
//                 const label = nextField.required ? '*(required)*' : '*(optional)*';
//                 return {
//                     response: `Great! Team set to **${matched.name}**.\n\n${label} ${nextField.question}`,
//                     isAgentFlow: true
//                 };
//             } else {
//                 session.awaitingConfirmation = true;
//                 await saveAgentSession(chatId, session);
//                 return {
//                     response: buildConfirmationSummary(session.intent, session.collectedFields, session.userContext),
//                     isAgentFlow: true
//                 };
//             }
//         }

//         // ── No active session - detect intent ──────────────────────
//         if (!session) {
//             const { intent, confidence } = await geminiService.detectIntent(userMessage);

//             if (intent !== 'GENERAL' && confidence >= 0.7) {
//                 const action = AGENT_ACTIONS[intent];

//                 if (!hasPermission(intent, userContext.role)) {
//                     return {
//                         response: getRoleErrorMessage(intent, userContext.role),
//                         isAgentFlow: false
//                     };
//                 }

//                 session = {
//                     intent,
//                     collectedFields: autoPopulateFields(intent, userContext),
//                     currentFieldIndex: 0,
//                     startedAt: new Date().toISOString(),
//                     userContext
//                 };

//                 const requiredList = getRequiredFieldLabels(intent);
//                 const autoList = getAutoFieldLabels(intent, userContext);

//                 let intro = `Sure! I can help you ${getActionLabel(intent)}.\n\n`;
//                 if (requiredList) intro += `**I'll ask you for:**\n${requiredList}\n\n`;
//                 if (autoList) intro += `**Auto-filled from your account:**\n${autoList}\n\n`;

//                 // ── CREATE_INTERNAL_TICKET: fetch categories first
//                 if (intent === 'CREATE_INTERNAL_TICKET') {
//                     const categories = await fetchCategoriesByOrg(userContext.organizationId);

//                     if (categories.length === 0) {
//                         return {
//                             response: `⚠️ No active categories found for your organization. Please create a category first.`,
//                             isAgentFlow: true
//                         };
//                     }

//                     session.awaitingCategorySelection = true;
//                     session.availableCategories = categories;
//                     await saveAgentSession(chatId, session);

//                     const list = formatCategoryList(categories);
//                     return {
//                         response: `${intro}Let's start!\n\nPlease select a category by name or number:\n\n${list}`,
//                         isAgentFlow: true
//                     };
//                 }

//                 // ── CREATE_CATEGORY: fetch teams first ✅
//                 if (intent === 'CREATE_CATEGORY') {
//                     await saveAgentSession(chatId, session);

//                     const firstField = getNextField(action, session);
//                     await saveAgentSession(chatId, session);

//                     // Ask name first, then we'll fetch teams after
//                     if (firstField) {
//                         const label = firstField.required ? '*(required)*' : '*(optional)*';
//                         return {
//                             response: `${intro}Let's start!\n\n${label} ${firstField.question}`,
//                             isAgentFlow: true
//                         };
//                     }
//                 }

//                 // Normal flow - ask first field
//                 await saveAgentSession(chatId, session);
//                 const firstField = getNextField(action, session);
//                 await saveAgentSession(chatId, session);

//                 if (firstField) {
//                     const label = firstField.required ? '*(required)*' : '*(optional)*';
//                     return {
//                         response: `${intro}Let's start!\n\n${label} ${firstField.question}`,
//                         isAgentFlow: true
//                     };
//                 }
//             }

//             const { response, usage } = await geminiService.generateResponse(messages, context);
//             return { response, usage, isAgentFlow: false };
//         }

//         // ── Active session - collect field answer ──────────────────
//         const action = AGENT_ACTIONS[session.intent];
//         const currentField = getNextField(action, session);

//         if (currentField) {
//             const userValue = userMessage.trim();

//             if (isEmpty(userValue) && currentField.required) {
//                 return {
//                     response: `⚠️ This field is **required** and cannot be skipped.\n\n*(required)* ${currentField.question}`,
//                     isAgentFlow: true
//                 };
//             }

//             if (!isEmpty(userValue) && currentField.validate) {
//                 const result = currentField.validate(userValue);
//                 if (result !== true) {
//                     const label = currentField.required ? 'required' : 'optional';
//                     return {
//                         response: `⚠️ ${result}\n\nPlease try again:\n*(${label})* ${currentField.question}`,
//                         isAgentFlow: true
//                     };
//                 }
//             }

//             session.collectedFields[currentField.key] = isEmpty(userValue) ? null : userValue;
//             session.currentFieldIndex++;
//             await saveAgentSession(chatId, session);

//             // ✅ After collecting name, fetch teams and ask user to pick
//             if (
//                 session.intent === 'CREATE_CATEGORY' &&
//                 currentField.key === 'name'
//             ) {
//                 const teams = await fetchTeamsByOrg(userContext.organizationId);

//                 if (teams.length === 0) {
//                     // No teams - skip team selection, move to next field
//                     session.collectedFields['assignedTeamId'] = null;
//                     session.currentFieldIndex++;
//                     await saveAgentSession(chatId, session);

//                     const nextField = getNextField(action, session);
//                     await saveAgentSession(chatId, session);

//                     if (nextField) {
//                         const label = nextField.required ? '*(required)*' : '*(optional)*';
//                         return {
//                             response: `No teams found in your organization, skipping team assignment.\n\n${label} ${nextField.question}`,
//                             isAgentFlow: true
//                         };
//                     }
//                 } else {
//                     session.awaitingTeamSelection = true;
//                     session.availableTeams = teams;
//                     await saveAgentSession(chatId, session);

//                     const list = formatTeamList(teams);
//                     return {
//                         response: `Please select a team to assign this category to (can not be skipped):\n\n${list}`,
//                         isAgentFlow: true
//                     };
//                 }
//             }

//             const nextField = getNextField(action, session);
//             await saveAgentSession(chatId, session);

//             if (nextField) {
//                 const label = nextField.required ? '*(required)*' : '*(optional)*';
//                 return {
//                     response: `${label} ${nextField.question}`,
//                     isAgentFlow: true
//                 };
//             }

//             session.awaitingConfirmation = true;
//             await saveAgentSession(chatId, session);
//             return {
//                 response: buildConfirmationSummary(session.intent, session.collectedFields, session.userContext),
//                 isAgentFlow: true
//             };
//         }

//         // Fallback
//         await clearAgentSession(chatId);
//         const { response, usage } = await geminiService.generateResponse(messages, context);
//         return { response, usage, isAgentFlow: false };

//     } catch (error) {
//         console.error('Agent handler error:', error);
//         await clearAgentSession(chatId);
//         throw error;
//     }
// };

// utils/agentHandler.js
import geminiService from './geminiService.js';
import { AGENT_ACTIONS, ALLOWED_ROLES } from './agentActions.js';
import { executeAction } from './actionExecutor.js';
import { getAgentSession, saveAgentSession, clearAgentSession } from './agentSessionManager.js';
import { fetchCategoriesByOrg, resolveCategory, formatCategoryList } from './categoryResolver.js';
import { fetchTeamsByOrg, resolveTeam, formatTeamList } from './teamResolver.js';

// ─── Helpers ────────────────────────────────────────────────

const hasPermission = (intent, userRole) => {
    const allowedRoles = ALLOWED_ROLES[intent];
    if (!allowedRoles) return true;
    return allowedRoles.includes(userRole?.toLowerCase());
};

const translateResponse = async (response, language) => {
    if (!language || language === 'en') return response;
    return await geminiService.translateText(response, language);
};

const getRoleErrorMessage = (intent, role) => {
    const actionNames = {
        CREATE_REQUEST_FORM: 'create Request Forms',
        CREATE_CATEGORY: 'create Categories'
    };
    const actionName = actionNames[intent] || 'perform this action';
    const allowedRoles = ALLOWED_ROLES[intent]?.join(', ') || 'admin, owner, legal';

    return `🚫 **Access Denied**\n\nYou don't have permission to ${actionName}.\n\n- **Your role:** ${role || 'unknown'}\n- **Required roles:** ${allowedRoles}\n\nPlease contact your administrator if you need access.`;
};

const isEmpty = (value) => {
    if (!value || value.trim() === '') return true;
    const normalized = value.trim().toLowerCase();
    return normalized === 'skip' || normalized === 'none' || normalized === 'n/a' || normalized === 'null' || normalized === 'na';
};

// const normalizeBoolean = (value) => {
//     const v = value?.toLowerCase().trim();
//     return ['yes', 'y'].includes(v) ? 'yes' : 'no';
// };

const normalizeBoolean = (value) => {
    const v = value?.toLowerCase().trim();

    // Multilingual support for yes/no
    const yesWords = [
        'yes', 'y',           // English
        'si', 'sí', 's',      // Spanish
        'oui', 'o',           // French
        'ja', 'j',            // German
        'sim',                // Portuguese
        'हाँ', 'हां',         // Hindi
        'да',                 // Russian
        'نعم',                // Arabic
        '是', 'shi'           // Chinese
    ];

    return yesWords.includes(v) ? 'yes' : 'no';
};

const isCancelIntent = (message) => {
    const cancelWords = ['cancel', 'stop', 'quit', 'exit', 'nevermind', 'never mind', 'abort'];
    return cancelWords.some(word => message.toLowerCase().includes(word));
};

const getActionLabel = (intent) => ({
    CREATE_REQUEST_FORM: 'create a Request Form',
    CREATE_CATEGORY: 'create a Category',
    CREATE_INTERNAL_TICKET: 'raise an Internal Ticket'
}[intent] || 'process your request');

// Auto-populate fields marked auto: true from userContext
const autoPopulateFields = (intent, userContext) => {
    const action = AGENT_ACTIONS[intent];
    const autoFields = {};

    action.requiredFields
        .filter(f => f.auto === true)
        .forEach(field => {
            const value = userContext[field.autoFrom];
            if (value) {
                autoFields[field.key] = value;
                console.log(`🤖 Auto-populated: ${field.key} =`, value);
            } else {
                console.warn(`⚠️ Missing userContext.${field.autoFrom} for field ${field.key}`);
            }
        });

    return autoFields;
};

// Get labels for required fields user needs to answer
const getRequiredFieldLabels = (intent) => {
    const action = AGENT_ACTIONS[intent];
    return action.requiredFields
        .filter(f => f.required && !f.auto && !f.resolved)
        .map(f => `• ${f.label}`)
        .join('\n');
};

// Get labels for auto-filled fields
const getAutoFieldLabels = (intent, userContext) => {
    const action = AGENT_ACTIONS[intent];
    return action.requiredFields
        .filter(f => f.auto)
        .map(f => `• ${f.label}: ${userContext[f.autoFrom] || 'N/A'}`)
        .join('\n');
};

// Get next field - skips auto + resolved fields
const getNextField = (action, session) => {
    const fields = action.requiredFields;

    for (let i = session.currentFieldIndex; i < fields.length; i++) {
        const field = fields[i];

        // Skip auto-populated fields
        if (field.auto) {
            session.currentFieldIndex = i + 1;
            continue;
        }

        // Skip resolved fields (categoryId handled separately)
        if (field.resolved) {
            session.currentFieldIndex = i + 1;
            continue;
        }

        // Skip dependency fields if condition not met
        if (field.dependsOn) {
            const depValue = session.collectedFields[field.dependsOn.key];
            if (normalizeBoolean(depValue) !== field.dependsOn.value) {
                session.collectedFields[field.key] = null;
                session.currentFieldIndex = i + 1;
                continue;
            }
        }

        session.currentFieldIndex = i;
        return field;
    }

    return null;
};

const buildConfirmationSummary = (intent, collectedFields, userContext) => {
    const action = AGENT_ACTIONS[intent];
    const lines = [`📋 **Summary before proceeding:**\n`];

    action.requiredFields
        .filter(f => !f.auto)
        .forEach(field => {
            const value = collectedFields[field.key];
            if (value !== undefined && value !== null) {
                if (field.key === 'categoryId') {
                    lines.push(`- **Category:** ${collectedFields['_categoryName']} (ID: ${value})`);
                } else if (field.key === 'assignedTeamId') {
                    lines.push(`- **Assigned Team:** ${collectedFields['_teamName']} (ID: ${value})`);
                } else {
                    lines.push(`- **${field.label}:** ${value}`);
                }
            } else if (field.key === 'assignedTeamId' && !value) {
                lines.push(`- **Assigned Team:** None`);
            }
        });

    const autoFields = action.requiredFields.filter(f => f.auto);
    if (autoFields.length > 0) {
        lines.push(`\n🤖 **Auto-filled from your account:**`);
        autoFields.forEach(f => {
            const value = userContext[f.autoFrom];
            if (value) lines.push(`- **${f.label}:** ${value}`);
        });
    }

    lines.push(`\nShall I proceed? (yes/no)`);
    return lines.join('\n');
};

// ─── Main Handler ────────────────────────────────────────────

export const handleAgentMessage = async (
    chatId,
    userMessage,
    messages,
    context,
    userContext
) => {
    try {
        // Cancel check
        if (isCancelIntent(userMessage)) {
            const session = await getAgentSession(chatId);
            if (session) {
                await clearAgentSession(chatId);
                let cancelMsg = "Cancelled! How else can I help you?";
                cancelMsg = await translateResponse(cancelMsg, session.language);

                return {
                    response: cancelMsg,
                    isAgentFlow: false
                };
            }
        }

        let session = await getAgentSession(chatId);

        // ── Awaiting confirmation (yes/no to proceed) ──────────────
        if (session?.awaitingConfirmation) {
            const confirmed = normalizeBoolean(userMessage);

            if (confirmed === 'yes') {
                const result = await executeAction(
                    session.intent,
                    session.collectedFields,
                    session.userContext
                );
                await clearAgentSession(chatId);

                if (result.success) {
                    const action = AGENT_ACTIONS[session.intent];
                    let successMsg = action.successMessage(result.data) + "\n\nIs there anything else I can help you with?";
                    successMsg = await translateResponse(successMsg, session.language);
                    return {
                        response: successMsg,
                        isAgentFlow: true
                    };
                } else {
                    let errorMsg = `❌ Failed: ${result.error}\n\nWould you like to try again?`;
                    errorMsg = await translateResponse(errorMsg, session.language);
                    return {
                        response: errorMsg,
                        isAgentFlow: true
                    };
                }
            } else {
                await clearAgentSession(chatId);
                let cancelMsg = "Alright, cancelled! Let me know if you'd like to start over.";
                cancelMsg = await translateResponse(cancelMsg, session.language);
                return {
                    response: cancelMsg,
                    isAgentFlow: true
                };
            }
        }

        // ── Awaiting category selection ────────────────────────────
        if (session?.awaitingCategorySelection) {
            const categories = session.availableCategories;
            const matched = resolveCategory(categories, userMessage);

            if (!matched) {
                const list = formatCategoryList(categories);
                let errorMsg = `⚠️ Could not find that category. Please pick by name or number:\n\n${list}`;
                errorMsg = await translateResponse(errorMsg, session.language);
                return {
                    response: errorMsg,
                    isAgentFlow: true
                };
            }

            session.collectedFields['categoryId'] = matched.id;
            session.collectedFields['_categoryName'] = matched.name;
            session.awaitingCategorySelection = false;
            delete session.availableCategories;
            await saveAgentSession(chatId, session);

            const action = AGENT_ACTIONS[session.intent];
            const nextField = getNextField(action, session);
            await saveAgentSession(chatId, session);

            if (nextField) {
                const label = nextField.required ? '*(required)*' : '*(optional - press Enter to skip)*';
                let nextQuestion = `Great! Category set to **${matched.name}**.\n\n${label} ${nextField.question}`;
                nextQuestion = await translateResponse(nextQuestion, session.language);
                return {
                    response: nextQuestion,
                    isAgentFlow: true
                };
            } else {
                session.awaitingConfirmation = true;
                await saveAgentSession(chatId, session);
                let confirmationMsg = buildConfirmationSummary(session.intent, session.collectedFields, session.userContext);
                confirmationMsg = await translateResponse(confirmationMsg, session.language);
                return {
                    response: confirmationMsg,
                    isAgentFlow: true
                };
            }
        }

        // ── Awaiting team selection ────────────────────────────────
        if (session?.awaitingTeamSelection) {
            const teams = session.availableTeams;
            const userInput = userMessage.trim();

            if (isEmpty(userInput)) {
                session.collectedFields['assignedTeamId'] = null;
                session.collectedFields['_teamName'] = null;
                session.awaitingTeamSelection = false;
                delete session.availableTeams;
                await saveAgentSession(chatId, session);

                const action = AGENT_ACTIONS[session.intent];
                const nextField = getNextField(action, session);
                await saveAgentSession(chatId, session);

                if (nextField) {
                    const label = nextField.required ? '*(required)*' : '*(optional - press Enter to skip)*';
                    let skipMsg = `Skipped team assignment.\n\n${label} ${nextField.question}`;
                    skipMsg = await translateResponse(skipMsg, session.language);
                    return {
                        response: skipMsg,
                        isAgentFlow: true
                    };
                } else {
                    session.awaitingConfirmation = true;
                    await saveAgentSession(chatId, session);
                    let confirmationMsg = buildConfirmationSummary(session.intent, session.collectedFields, session.userContext);
                    confirmationMsg = await translateResponse(confirmationMsg, session.language);
                    return {
                        response: confirmationMsg,
                        isAgentFlow: true
                    };
                }
            }

            const matched = resolveTeam(teams, userInput);

            if (!matched) {
                const list = formatTeamList(teams);
                let errorMsg = `⚠️ Could not find that team. Please pick by name or number (or leave blank to skip):\n\n${list}`;
                errorMsg = await translateResponse(errorMsg, session.language);
                return {
                    response: errorMsg,
                    isAgentFlow: true
                };
            }

            session.collectedFields['assignedTeamId'] = matched.id;
            session.collectedFields['_teamName'] = matched.name;
            session.awaitingTeamSelection = false;
            delete session.availableTeams;
            await saveAgentSession(chatId, session);

            const action = AGENT_ACTIONS[session.intent];
            const nextField = getNextField(action, session);
            await saveAgentSession(chatId, session);

            if (nextField) {
                const label = nextField.required ? '*(required)*' : '*(optional - press Enter to skip)*';
                let successMsg = `Great! Team set to **${matched.name}**.\n\n${label} ${nextField.question}`;
                successMsg = await translateResponse(successMsg, session.language);
                return {
                    response: successMsg,
                    isAgentFlow: true
                };
            } else {
                session.awaitingConfirmation = true;
                await saveAgentSession(chatId, session);
                let confirmationMsg = buildConfirmationSummary(session.intent, session.collectedFields, session.userContext);
                confirmationMsg = await translateResponse(confirmationMsg, session.language);
                return {
                    response: confirmationMsg,
                    isAgentFlow: true
                };
            }
        }

        // ── No active session - detect intent ──────────────────────
        if (!session) {
            const { intent, confidence, language } = await geminiService.detectIntent(userMessage);

            if (intent !== 'GENERAL' && confidence >= 0.7) {
                const action = AGENT_ACTIONS[intent];

                if (!hasPermission(intent, userContext.role)) {
                    let errorMsg = getRoleErrorMessage(intent, userContext.role);
                    errorMsg = await translateResponse(errorMsg, language || 'en');
                    return {
                        response: errorMsg,
                        isAgentFlow: false
                    };
                }

                session = {
                    intent,
                    collectedFields: autoPopulateFields(intent, userContext),
                    currentFieldIndex: 0,
                    startedAt: new Date().toISOString(),
                    userContext,
                    language: language || 'en'
                };

                console.log(`🌍 Session language set to: ${session.language}`);

                const requiredList = getRequiredFieldLabels(intent);
                const autoList = getAutoFieldLabels(intent, userContext);

                let intro = `Sure! I can help you ${getActionLabel(intent)}.\n\n`;
                if (requiredList) intro += `**I'll ask you for:**\n${requiredList}\n\n`;
                if (autoList) intro += `**Auto-filled from your account:**\n${autoList}\n\n`;

                intro = await geminiService.translateText(intro, session.language);

                // ── CREATE_INTERNAL_TICKET: fetch categories first
                if (intent === 'CREATE_INTERNAL_TICKET') {
                    const categories = await fetchCategoriesByOrg(userContext.organizationId);

                    if (categories.length === 0) {
                        let errorMsg = `⚠️ No active categories found for your organization. Please create a category first.`;
                        errorMsg = await translateResponse(errorMsg, session.language);
                        return {
                            response: errorMsg,
                            isAgentFlow: true
                        };
                    }

                    session.awaitingCategorySelection = true;
                    session.availableCategories = categories;
                    await saveAgentSession(chatId, session);

                    const list = formatCategoryList(categories);
                    let categoryPrompt = `Please select a category by name or number:`;
                    categoryPrompt = await translateResponse(categoryPrompt, session.language);

                    return {
                        response: `${intro}Let's start!\n\n${categoryPrompt}\n\n${list}`,
                        isAgentFlow: true
                    };
                }

                // ── CREATE_CATEGORY: ask name first, then fetch teams
                if (intent === 'CREATE_CATEGORY') {
                    await saveAgentSession(chatId, session);

                    const firstField = getNextField(action, session);
                    await saveAgentSession(chatId, session);

                    if (firstField) {
                        const label = firstField.required ? '*(required)*' : '*(optional - press Enter to skip)*';
                        let questionMsg = `${intro}Let's start!\n\n${label} ${firstField.question}`;
                        questionMsg = await translateResponse(questionMsg, session.language);
                        return {
                            response: questionMsg,
                            isAgentFlow: true
                        };
                    }
                }

                // Normal flow - ask first field
                await saveAgentSession(chatId, session);
                const firstField = getNextField(action, session);
                await saveAgentSession(chatId, session);

                if (firstField) {
                    const label = firstField.required ? '*(required)*' : '*(optional - press Enter to skip)*';
                    let questionMsg = `${intro}Let's start!\n\n${label} ${firstField.question}`;
                    questionMsg = await translateResponse(questionMsg, session.language);
                    return {
                        response: questionMsg,
                        isAgentFlow: true
                    };
                }
            }



            const { response, usage } = await geminiService.generateResponse(messages, context, [], language || 'en');
            return { response, usage, isAgentFlow: false };
        }

        // ── Active session - collect field answer ──────────────────
        const action = AGENT_ACTIONS[session.intent];
        const currentField = getNextField(action, session);

        if (currentField) {
            const userValue = userMessage.trim();

            // Block skipping required fields
            if (isEmpty(userValue) && currentField.required) {
                let errorMsg = `⚠️ This field is **required** and cannot be skipped.\n\n*(required)* ${currentField.question}`;
                errorMsg = await translateResponse(errorMsg, session.language);
                return {
                    response: errorMsg,
                    isAgentFlow: true
                };
            }

            // Handle optional field skip
            if (isEmpty(userValue) && !currentField.required) {
                session.collectedFields[currentField.key] = null;
                session.currentFieldIndex++;
                await saveAgentSession(chatId, session);

                // Special handling for CREATE_CATEGORY after name field
                if (session.intent === 'CREATE_CATEGORY' && currentField.key === 'name') {
                    const teams = await fetchTeamsByOrg(userContext.organizationId);

                    if (teams.length === 0) {
                        session.collectedFields['assignedTeamId'] = null;
                        session.currentFieldIndex++;
                        await saveAgentSession(chatId, session);

                        const nextField = getNextField(action, session);
                        await saveAgentSession(chatId, session);

                        if (nextField) {
                            const label = nextField.required ? '*(required)*' : '*(optional - press Enter to skip)*';
                            let skipMsg = `No teams found in your organization, skipping team assignment.\n\n${label} ${nextField.question}`;
                            skipMsg = await translateResponse(skipMsg, session.language);
                            return {
                                response: skipMsg,
                                isAgentFlow: true
                            };
                        }
                    } else {
                        session.awaitingTeamSelection = true;
                        session.availableTeams = teams;
                        await saveAgentSession(chatId, session);

                        const list = formatTeamList(teams);
                        let teamSelectionMsg = `Please select a team to assign this category to (optional - leave blank to skip):\n\n${list}`;
                        teamSelectionMsg = await translateResponse(teamSelectionMsg, session.language);
                        return {
                            response: teamSelectionMsg,
                            isAgentFlow: true
                        };
                    }
                }

                const nextField = getNextField(action, session);
                await saveAgentSession(chatId, session);

                if (nextField) {
                    const label = nextField.required ? '*(required)*' : '*(optional - press Enter to skip)*';
                    let skipMsg = `Skipped.\n\n${label} ${nextField.question}`;
                    skipMsg = await translateResponse(skipMsg, session.language);
                    return {
                        response: skipMsg,
                        isAgentFlow: true
                    };
                }

                session.awaitingConfirmation = true;
                await saveAgentSession(chatId, session);
                let summary = buildConfirmationSummary(session.intent, session.collectedFields, session.userContext);
                summary = await translateResponse(summary, session.language);
                return {
                    response: summary,
                    isAgentFlow: true
                };
            }

            // Validate if value provided
            if (!isEmpty(userValue) && currentField.validate) {
                const result = currentField.validate(userValue);
                if (result !== true) {
                    const label = currentField.required ? 'required' : 'optional';
                    let errorMsg = `⚠️ ${result}\n\nPlease try again:\n*(${label})* ${currentField.question}`;
                    errorMsg = await translateResponse(errorMsg, session.language);
                    return {
                        response: errorMsg,
                        isAgentFlow: true
                    };
                }
            }

            // Save value
            session.collectedFields[currentField.key] = isEmpty(userValue) ? null : userValue;
            session.currentFieldIndex++;
            await saveAgentSession(chatId, session);

            // ✅ After collecting name in CREATE_CATEGORY, fetch teams
            if (
                session.intent === 'CREATE_CATEGORY' &&
                currentField.key === 'name'
            ) {
                const teams = await fetchTeamsByOrg(userContext.organizationId);

                if (teams.length === 0) {
                    session.collectedFields['assignedTeamId'] = null;
                    session.currentFieldIndex++;
                    await saveAgentSession(chatId, session);

                    const nextField = getNextField(action, session);
                    await saveAgentSession(chatId, session);

                    if (nextField) {
                        const label = nextField.required ? '*(required)*' : '*(optional - press Enter to skip)*';
                        let skipMsg = `No teams found in your organization, skipping team assignment.\n\n${label} ${nextField.question}`;
                        skipMsg = await translateResponse(skipMsg, session.language);
                        return {
                            response: skipMsg,
                            isAgentFlow: true
                        };
                    }
                } else {
                    session.awaitingTeamSelection = true;
                    session.availableTeams = teams;
                    await saveAgentSession(chatId, session);

                    const list = formatTeamList(teams);
                    let teamSelectionMsg = `Please select a team to assign this category to (optional - leave blank to skip):\n\n${list}`;
                    teamSelectionMsg = await translateResponse(teamSelectionMsg, session.language);
                    return {
                        response: teamSelectionMsg,
                        isAgentFlow: true
                    };
                }
            }

            const nextField = getNextField(action, session);
            await saveAgentSession(chatId, session);

            if (nextField) {
                const label = nextField.required ? '*(required)*' : '*(optional - press Enter to skip)*';
                let nextQuestion = `${label} ${nextField.question}`;
                nextQuestion = await translateResponse(nextQuestion, session.language);
                return {
                    response: nextQuestion,
                    isAgentFlow: true
                };
            }

            session.awaitingConfirmation = true;
            await saveAgentSession(chatId, session);
            let confirmationMsg = buildConfirmationSummary(session.intent, session.collectedFields, session.userContext);
            confirmationMsg = await translateResponse(confirmationMsg, session.language);
            return {
                response: confirmationMsg,
                isAgentFlow: true
            };
        }

        // Fallback
        await clearAgentSession(chatId);
        const { response, usage } = await geminiService.generateResponse(messages, context);
        return { response, usage, isAgentFlow: false };

    } catch (error) {
        console.error('Agent handler error:', error);
        await clearAgentSession(chatId);
        throw error;
    }
};