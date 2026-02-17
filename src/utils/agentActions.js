import { createRequestFormService } from "../services/ticketService.js";
import { createCategoryService } from "../services/ticketService.js";
import { createInternalTicketService } from "../services/ticketService.js";

export const ALLOWED_ROLES = {
  CREATE_REQUEST_FORM: ['admin', 'owner', 'legal'],
  CREATE_CATEGORY: ['admin', 'owner', 'legal'],
  CREATE_INTERNAL_TICKET: ['admin', 'owner', 'legal', 'member'] // all roles
}

export const AGENT_ACTIONS = {

  CREATE_REQUEST_FORM: {
    intent: "CREATE_REQUEST_FORM",
    requiredFields: [
      // ✅ REQUIRED
      {
        key: "name",
        label: "Form Name",
        question: "What would you like to name this request form?",
        required: true,
        auto: false,
        validate: (v) => v.trim().length > 0 || "Form name cannot be empty."
      },

      // ⚪ OPTIONAL
      {
        key: "tags",
        label: "Tags",
        question: "Add tags for this form? (comma-separated e.g: legal, NDA, contract)",
        required: false,
        auto: false
      },
      {
        key: "description",
        label: "Description",
        question: "Provide a description for this form?",
        required: false,
        auto: false
      },
    //   {
    //     key: "reviewerId",
    //     label: "Reviewer ID",
    //     question: "Assign a reviewer ID?",
    //     required: false,
    //     auto: false
    //   },
      {
        key: "autoReplyEnabled",
        label: "Auto Reply",
        question: "Enable auto-reply for submissions? (yes/no)",
        required: false,
        auto: false,
        default: "no",
        validate: (v) => ['yes', 'no', 'y', 'n'].includes(v.toLowerCase().trim()) || "Please answer yes or no."
      },
      {
        key: "autoReplyMessage",
        label: "Auto Reply Message",
        question: "What should the auto-reply message say?",
        required: false,
        auto: false,
        dependsOn: { key: "autoReplyEnabled", value: "yes" }
      },

      // 🤖 AUTO
      {
        key: "organization",
        label: "Organization",
        required: true,
        auto: true,
        autoFrom: "organizationId"
      },
      {
        key: "createdBy",
        label: "Created By",
        required: true,
        auto: true,
        autoFrom: "userId"
      }
    ],

    execute: async (collectedFields, userContext) => {
      return await createRequestFormService(collectedFields, userContext.userId);
    },

    successMessage: (data) =>
      `✅ Request Form created!\n- **Name:** ${data.name}\n- **Slug:** ${data.slug}\n- **Public URL:** ${data.publicUrl}`
  },

  CREATE_CATEGORY: {
    intent: "CREATE_CATEGORY",
    requiredFields: [
      // ✅ REQUIRED
      {
        key: "name",
        label: "Category Name",
        question: "What is the name of this category?",
        required: true,
        auto: false,
        validate: (v) => v.trim().length > 0 || "Category name cannot be empty."
      },
      {
        key: "assignedTeamId",
        label: "Assigned Team",
        required: true,
        auto: false,
        resolved: true,
        validate: (v) => v.trim().length > 0 || "Please select a team for this category."
      },

      // ⚪ OPTIONAL
    //   {
    //     key: "reviewerId",
    //     label: "Reviewer ID",
    //     question: "Assign a reviewer ID?",
    //     required: false,
    //     auto: false
    //   },
      {
        key: "autoReplyEnabled",
        label: "Auto Reply",
        question: "Enable auto-reply for this category? (yes/no)",
        required: false,
        auto: false,
        default: "no",
        validate: (v) => ['yes', 'no', 'y', 'n'].includes(v.toLowerCase().trim()) || "Please answer yes or no."
      },
      {
        key: "autoReplyMessage",
        label: "Auto Reply Message",
        question: "What should the auto-reply message say?",
        required: false,
        auto: false,
        dependsOn: { key: "autoReplyEnabled", value: "yes" }
      },

      // 🤖 AUTO
      {
        key: "organizationId",
        label: "Organization",
        required: true,
        auto: true,
        autoFrom: "organizationId"
      },
      {
        key: "createdBy",
        label: "Created By",
        required: true,
        auto: true,
        autoFrom: "userId"
      }
    ],

    execute: async (collectedFields, userContext) => {
      return await createCategoryService(collectedFields, userContext.userId);
    },

    successMessage: (data) =>
      `✅ Category created!\n- **Name:** ${data.name}\n- **ID:** ${data.id}`
  },

  CREATE_INTERNAL_TICKET: {
    intent: "CREATE_INTERNAL_TICKET",
    requiredFields: [
      // 🔍 RESOLVED - special type, handled before normal flow
      {
        key: "categoryId",
        label: "Category",
        required: true,
        auto: false,
        resolved: true  // fetched from DB, user picks by name/number
      },

      // ✅ REQUIRED
      {
        key: "description",
        label: "Description",
        question: "Please describe the issue in detail.",
        required: true,
        auto: false,
        validate: (v) => v.trim().length >= 10 || "Description must be at least 10 characters."
      },

      // ⚪ OPTIONAL
      // {
      //   key: "summary",
      //   label: "Summary",
      //   question: "Provide a brief summary?",
      //   required: false,
      //   auto: false
      // },
      {
        key: "objective",
        label: "Objective",
        question: "What is the objective or expected outcome?",
        required: false,
        auto: false
      },
      // {
      //   key: "startDate",
      //   label: "Start Date",
      //   question: "What is the start date? (YYYY-MM-DD)",
      //   required: false,
      //   auto: false,
      //   validate: (v) => {
      //     if (!v) return true;
      //     return /^\d{4}-\d{2}-\d{2}$/.test(v) || "Use format YYYY-MM-DD.";
      //   }
      // },
      // {
      //   key: "endDate",
      //   label: "End Date",
      //   question: "What is the end date? (YYYY-MM-DD)",
      //   required: false,
      //   auto: false,
      //   validate: (v) => {
      //     if (!v) return true;
      //     return /^\d{4}-\d{2}-\d{2}$/.test(v) || "Use format YYYY-MM-DD.";
      //   }
      // },
      {
        key: "note",
        label: "Notes",
        question: "Any additional notes?",
        required: false,
        auto: false
      },

      // 🤖 AUTO
      {
        key: "name",
        label: "Your Name",
        required: true,
        auto: true,
        autoFrom: "name"
      },
      {
        key: "email",
        label: "Your Email",
        required: true,
        auto: true,
        autoFrom: "email"
      }
    ],

    execute: async (collectedFields, userContext) => {
      return await createInternalTicketService(collectedFields);
    },

    successMessage: (data) =>
      `✅ Ticket raised!\n- **Ticket ID:** ${data.ticketId}\n- **Status:** ${data.workflowStatus}`
  }
};