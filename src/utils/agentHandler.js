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

const getRoleErrorMessage = (intent, role) => {
    const actionNames = {
        CREATE_REQUEST_FORM: 'create Request Forms',
        CREATE_CATEGORY: 'create Categories'
    };
    const actionName = actionNames[intent] || 'perform this action';
    const allowedRoles = ALLOWED_ROLES[intent]?.join(', ') || 'admin, owner, legal';

    return `🚫 **Access Denied**\n\nYou don't have permission to ${actionName}.\n\n- **Your role:** ${role || 'unknown'}\n- **Required roles:** ${allowedRoles}\n\nPlease contact your administrator if you need access.`;
};

const isEmpty = (value) => !value || value.trim() === '';

const normalizeBoolean = (value) => {
    const v = value?.toLowerCase().trim();
    return ['yes', 'y'].includes(v) ? 'yes' : 'no';
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

// Build confirmation summary
// const buildConfirmationSummary = (intent, collectedFields, userContext) => {
//     const action = AGENT_ACTIONS[intent];
//     const lines = [`📋 **Summary before proceeding:**\n`];

//     action.requiredFields
//         .filter(f => !f.auto)
//         .forEach(field => {
//             const value = collectedFields[field.key];
//             if (value !== undefined && value !== null) {
//                 if (field.key === 'categoryId') {
//                     lines.push(`- **Category:** ${collectedFields['_categoryName']} (ID: ${value})`);
//                 } else {
//                     lines.push(`- **${field.label}:** ${value}`);
//                 }
//             }
//         });

//     const autoFields = action.requiredFields.filter(f => f.auto);
//     if (autoFields.length > 0) {
//         lines.push(`\n🤖 **Auto-filled from your account:**`);
//         autoFields.forEach(f => {
//             const value = userContext[f.autoFrom];
//             if (value) lines.push(`- **${f.label}:** ${value}`);
//         });
//     }

//     lines.push(`\nShall I proceed? (yes/no)`);
//     return lines.join('\n');
// };

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
          // ✅ Show team name instead of ID
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
// ```

// ---

// ## Conversation Flow
// ```
// User:   "Create a category"

// Agent:  "Sure! I can help you create a Category.
//          I'll ask you for:
//          • Category Name
         
//          Auto-filled from your account:
//          • Organization: org_123
         
//          Let's start!
//          *(required)* What is the name of this category?"

// User:   "Legal Review"

// Agent:  "Please select a team to assign this category to 
//          (or leave blank to skip):
         
//          1. Legal Team
//          2. Compliance Team
//          3. HR Team"

// User:   "1"   ← or "Legal Team" or "" to skip

// Agent:  "Great! Team set to Legal Team.
//          *(optional)* Enable auto-reply? (yes/no)"

// User:   "no"

// Agent:  "📋 Summary before proceeding:
//          - Category Name: Legal Review
//          - Assigned Team: Legal Team (ID: team_abc)
         
//          🤖 Auto-filled:
//          - Organization: org_123
         
//          Shall I proceed? (yes/no)"

// User:   "yes"
// Agent:  "✅ Category created!"

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
                return { response: "Cancelled! How else can I help you?", isAgentFlow: false };
            }
        }

        let session = await getAgentSession(chatId);

        // ── Awaiting confirmation (yes/no to proceed) ──────────────
        if (session?.awaitingConfirmation) {
            const confirmed = normalizeBoolean(userMessage);

            if (confirmed === 'yes') {
                // const result = await executeAction(session.intent, session.collectedFields, authToken);
                const result = await executeAction(
                    session.intent,
                    session.collectedFields,
                    session.userContext  // ← pass full userContext
                );
                await clearAgentSession(chatId);

                if (result.success) {
                    const action = AGENT_ACTIONS[session.intent];
                    return {
                        response: action.successMessage(result.data) + "\n\nIs there anything else I can help you with?",
                        isAgentFlow: true
                    };
                } else {
                    return {
                        response: `❌ Failed: ${result.error}\n\nWould you like to try again?`,
                        isAgentFlow: true
                    };
                }
            } else {
                await clearAgentSession(chatId);
                return {
                    response: "Alright, cancelled! Let me know if you'd like to start over.",
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
                return {
                    response: `⚠️ Could not find that category. Please pick by name or number:\n\n${list}`,
                    isAgentFlow: true
                };
            }

            // Resolved! Store ID and name
            session.collectedFields['categoryId'] = matched.id;
            session.collectedFields['_categoryName'] = matched.name; // for display only
            session.awaitingCategorySelection = false;
            delete session.availableCategories;
            await saveAgentSession(chatId, session);

            // Move to next field
            const action = AGENT_ACTIONS[session.intent];
            const nextField = getNextField(action, session);
            await saveAgentSession(chatId, session);

            if (nextField) {
                const label = nextField.required ? '*(required)*' : '*(optional)*';
                return {
                    response: `Great! Category set to **${matched.name}**.\n\n${label} ${nextField.question}`,
                    isAgentFlow: true
                };
            } else {
                session.awaitingConfirmation = true;
                await saveAgentSession(chatId, session);
                return {
                    response: buildConfirmationSummary(session.intent, session.collectedFields, session.userContext),
                    isAgentFlow: true
                };
            }
        }

        // ── Awaiting team selection ────────────────────────────────
        if (session?.awaitingTeamSelection) {
            const teams = session.availableTeams;
            const userInput = userMessage.trim();

            // Allow skipping since assignedTeamId is optional
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
                    const label = nextField.required ? '*(required)*' : '*(optional)*';
                    return {
                        response: `Skipped team assignment.\n\n${label} ${nextField.question}`,
                        isAgentFlow: true
                    };
                } else {
                    session.awaitingConfirmation = true;
                    await saveAgentSession(chatId, session);
                    return {
                        response: buildConfirmationSummary(session.intent, session.collectedFields, session.userContext),
                        isAgentFlow: true
                    };
                }
            }

            const matched = resolveTeam(teams, userInput);

            if (!matched) {
                const list = formatTeamList(teams);
                return {
                    response: `⚠️ Could not find that team. Please pick by name or number (or leave blank to skip):\n\n${list}`,
                    isAgentFlow: true
                };
            }

            // Resolved! Store team ID and name
            session.collectedFields['assignedTeamId'] = matched.id;
            session.collectedFields['_teamName'] = matched.name;
            session.awaitingTeamSelection = false;
            delete session.availableTeams;
            await saveAgentSession(chatId, session);

            const action = AGENT_ACTIONS[session.intent];
            const nextField = getNextField(action, session);
            await saveAgentSession(chatId, session);

            if (nextField) {
                const label = nextField.required ? '*(required)*' : '*(optional)*';
                return {
                    response: `Great! Team set to **${matched.name}**.\n\n${label} ${nextField.question}`,
                    isAgentFlow: true
                };
            } else {
                session.awaitingConfirmation = true;
                await saveAgentSession(chatId, session);
                return {
                    response: buildConfirmationSummary(session.intent, session.collectedFields, session.userContext),
                    isAgentFlow: true
                };
            }
        }

        // ── No active session - detect intent ──────────────────────
        // if (!session) {
        //     const { intent, confidence } = await geminiService.detectIntent(userMessage);

        //     if (intent !== 'GENERAL' && confidence >= 0.7) {
        //         const action = AGENT_ACTIONS[intent];

        //         if (!hasPermission(intent, userContext.role)) {
        //             return {
        //                 response: getRoleErrorMessage(intent, userContext.role),
        //                 isAgentFlow: false
        //             };
        //         }

        //         // Start session
        //         session = {
        //             intent,
        //             collectedFields: autoPopulateFields(intent, userContext),
        //             currentFieldIndex: 0,
        //             startedAt: new Date().toISOString(),
        //             userContext
        //         };

        //         // Build intro message
        //         const requiredList = getRequiredFieldLabels(intent);
        //         const autoList = getAutoFieldLabels(intent, userContext);

        //         let intro = `Sure! I can help you ${getActionLabel(intent)}.\n\n`;
        //         if (requiredList) intro += `**I'll ask you for:**\n${requiredList}\n\n`;
        //         if (autoList) intro += `**Auto-filled from your account:**\n${autoList}\n\n`;

        //         // ── Special: CREATE_INTERNAL_TICKET needs category list first
        //         if (intent === 'CREATE_INTERNAL_TICKET') {
        //             const categories = await fetchCategoriesByOrg(userContext.organizationId);

        //             if (categories.length === 0) {
        //                 return {
        //                     response: `⚠️ No active categories found for your organization. Please create a category first.`,
        //                     isAgentFlow: true
        //                 };
        //             }

        //             session.awaitingCategorySelection = true;
        //             session.availableCategories = categories;
        //             await saveAgentSession(chatId, session);

        //             const list = formatCategoryList(categories);
        //             return {
        //                 response: `${intro}Let's start!\n\nPlease select a category by name or number:\n\n${list}`,
        //                 isAgentFlow: true
        //             };
        //         }

        //         // Normal flow - ask first field
        //         await saveAgentSession(chatId, session);
        //         const firstField = getNextField(action, session);
        //         await saveAgentSession(chatId, session);

        //         if (firstField) {
        //             const label = firstField.required ? '*(required)*' : '*(optional)*';
        //             return {
        //                 response: `${intro}Let's start!\n\n${label} ${firstField.question}`,
        //                 isAgentFlow: true
        //             };
        //         }
        //     }

        //     // General conversation
        //     const { response, usage } = await geminiService.generateResponse(messages, context);
        //     return { response, usage, isAgentFlow: false };
        // }

        // // ── Active session - collect field answer ──────────────────
        // const action = AGENT_ACTIONS[session.intent];
        // const currentField = getNextField(action, session);

        // if (currentField) {
        //     const userValue = userMessage.trim();

        //     // Block skipping required fields
        //     if (isEmpty(userValue) && currentField.required) {
        //         return {
        //             response: `⚠️ This field is **required** and cannot be skipped.\n\n*(required)* ${currentField.question}`,
        //             isAgentFlow: true
        //         };
        //     }

        //     // Validate if value provided
        //     if (!isEmpty(userValue) && currentField.validate) {
        //         const result = currentField.validate(userValue);
        //         if (result !== true) {
        //             const label = currentField.required ? 'required' : 'optional';
        //             return {
        //                 response: `⚠️ ${result}\n\nPlease try again:\n*(${label})* ${currentField.question}`,
        //                 isAgentFlow: true
        //             };
        //         }
        //     }

        //     // Save value
        //     session.collectedFields[currentField.key] = isEmpty(userValue) ? null : userValue;
        //     session.currentFieldIndex++;
        //     await saveAgentSession(chatId, session);

        //     // Get next field
        //     const nextField = getNextField(action, session);
        //     await saveAgentSession(chatId, session);

        //     if (nextField) {
        //         const label = nextField.required ? '*(required)*' : '*(optional)*';
        //         return {
        //             response: `${label} ${nextField.question}`,
        //             isAgentFlow: true
        //         };
        //     }

        //     // All fields done - show confirmation
        //     session.awaitingConfirmation = true;
        //     await saveAgentSession(chatId, session);
        //     return {
        //         response: buildConfirmationSummary(session.intent, session.collectedFields, session.userContext),
        //         isAgentFlow: true
        //     };
        // }

        // ── No active session - detect intent ──────────────────────
        if (!session) {
            const { intent, confidence } = await geminiService.detectIntent(userMessage);

            if (intent !== 'GENERAL' && confidence >= 0.7) {
                const action = AGENT_ACTIONS[intent];

                if (!hasPermission(intent, userContext.role)) {
                    return {
                        response: getRoleErrorMessage(intent, userContext.role),
                        isAgentFlow: false
                    };
                }

                session = {
                    intent,
                    collectedFields: autoPopulateFields(intent, userContext),
                    currentFieldIndex: 0,
                    startedAt: new Date().toISOString(),
                    userContext
                };

                const requiredList = getRequiredFieldLabels(intent);
                const autoList = getAutoFieldLabels(intent, userContext);

                let intro = `Sure! I can help you ${getActionLabel(intent)}.\n\n`;
                if (requiredList) intro += `**I'll ask you for:**\n${requiredList}\n\n`;
                if (autoList) intro += `**Auto-filled from your account:**\n${autoList}\n\n`;

                // ── CREATE_INTERNAL_TICKET: fetch categories first
                if (intent === 'CREATE_INTERNAL_TICKET') {
                    const categories = await fetchCategoriesByOrg(userContext.organizationId);

                    if (categories.length === 0) {
                        return {
                            response: `⚠️ No active categories found for your organization. Please create a category first.`,
                            isAgentFlow: true
                        };
                    }

                    session.awaitingCategorySelection = true;
                    session.availableCategories = categories;
                    await saveAgentSession(chatId, session);

                    const list = formatCategoryList(categories);
                    return {
                        response: `${intro}Let's start!\n\nPlease select a category by name or number:\n\n${list}`,
                        isAgentFlow: true
                    };
                }

                // ── CREATE_CATEGORY: fetch teams first ✅
                if (intent === 'CREATE_CATEGORY') {
                    await saveAgentSession(chatId, session);

                    const firstField = getNextField(action, session);
                    await saveAgentSession(chatId, session);

                    // Ask name first, then we'll fetch teams after
                    if (firstField) {
                        const label = firstField.required ? '*(required)*' : '*(optional)*';
                        return {
                            response: `${intro}Let's start!\n\n${label} ${firstField.question}`,
                            isAgentFlow: true
                        };
                    }
                }

                // Normal flow - ask first field
                await saveAgentSession(chatId, session);
                const firstField = getNextField(action, session);
                await saveAgentSession(chatId, session);

                if (firstField) {
                    const label = firstField.required ? '*(required)*' : '*(optional)*';
                    return {
                        response: `${intro}Let's start!\n\n${label} ${firstField.question}`,
                        isAgentFlow: true
                    };
                }
            }

            const { response, usage } = await geminiService.generateResponse(messages, context);
            return { response, usage, isAgentFlow: false };
        }

        // ── Active session - collect field answer ──────────────────
        const action = AGENT_ACTIONS[session.intent];
        const currentField = getNextField(action, session);

        if (currentField) {
            const userValue = userMessage.trim();

            if (isEmpty(userValue) && currentField.required) {
                return {
                    response: `⚠️ This field is **required** and cannot be skipped.\n\n*(required)* ${currentField.question}`,
                    isAgentFlow: true
                };
            }

            if (!isEmpty(userValue) && currentField.validate) {
                const result = currentField.validate(userValue);
                if (result !== true) {
                    const label = currentField.required ? 'required' : 'optional';
                    return {
                        response: `⚠️ ${result}\n\nPlease try again:\n*(${label})* ${currentField.question}`,
                        isAgentFlow: true
                    };
                }
            }

            session.collectedFields[currentField.key] = isEmpty(userValue) ? null : userValue;
            session.currentFieldIndex++;
            await saveAgentSession(chatId, session);

            // ✅ After collecting name, fetch teams and ask user to pick
            if (
                session.intent === 'CREATE_CATEGORY' &&
                currentField.key === 'name'
            ) {
                const teams = await fetchTeamsByOrg(userContext.organizationId);

                if (teams.length === 0) {
                    // No teams - skip team selection, move to next field
                    session.collectedFields['assignedTeamId'] = null;
                    session.currentFieldIndex++;
                    await saveAgentSession(chatId, session);

                    const nextField = getNextField(action, session);
                    await saveAgentSession(chatId, session);

                    if (nextField) {
                        const label = nextField.required ? '*(required)*' : '*(optional)*';
                        return {
                            response: `No teams found in your organization, skipping team assignment.\n\n${label} ${nextField.question}`,
                            isAgentFlow: true
                        };
                    }
                } else {
                    session.awaitingTeamSelection = true;
                    session.availableTeams = teams;
                    await saveAgentSession(chatId, session);

                    const list = formatTeamList(teams);
                    return {
                        response: `Please select a team to assign this category to (can not be skipped):\n\n${list}`,
                        isAgentFlow: true
                    };
                }
            }

            const nextField = getNextField(action, session);
            await saveAgentSession(chatId, session);

            if (nextField) {
                const label = nextField.required ? '*(required)*' : '*(optional)*';
                return {
                    response: `${label} ${nextField.question}`,
                    isAgentFlow: true
                };
            }

            session.awaitingConfirmation = true;
            await saveAgentSession(chatId, session);
            return {
                response: buildConfirmationSummary(session.intent, session.collectedFields, session.userContext),
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
// ```

// ---

// ## Example Conversation
// ```
// User:  "I want to raise a ticket"

// Agent: "Sure! I can help you raise an Internal Ticket.

//         I'll ask you for:
//         • Description

//         Auto-filled from your account:
//         • Your Name: Shashank Shukla
//         • Your Email: shashank@oodles.io

//         Let's start!

//         Please select a category by name or number:

//         1. Legal Review
//         2. NDA Management
//         3. Contract Disputes"

// User:  "2"   ← or "NDA Management"

// Agent: "Great! Category set to NDA Management.

//         *(required)* Please describe the issue in detail."

// User:  "The NDA needs review before client signing tomorrow."

// Agent: "*(optional)* Provide a brief summary?"

// User:  ""   ← skip

// Agent: "📋 Summary before proceeding:

//         - Category: NDA Management (ID: cat_abc123)
//         - Description: The NDA needs review before client signing tomorrow.

//         🤖 Auto-filled from your account:
//         - Your Name: Shashank Shukla
//         - Your Email: shashank@oodles.io

//         Shall I proceed? (yes/no)"

// User:  "yes"

// Agent: "✅ Ticket raised!
//         - Ticket ID: ticket_xyz789
//         - Status: OPEN"