// services/ticketService.js
import { createClient } from "@supabase/supabase-js";
import slugify from 'slugify';
import { sendTicketConfirmationEmail } from '../lib/emails/ticketConfirmation.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ─── Create Request Form ─────────────────────────────────────

export const createRequestFormService = async (collectedFields, userId) => {
  try {
    let {
      name,
      description,
      tags,
      reviewerId,
      autoReplyEnabled,
      autoReplyMessage,
      organization   // auto-populated from userContext.organizationId
    } = collectedFields;

    if (!name || !organization) {
      return { success: false, error: "name and organization are required" };
    }

    // Normalize tags - agent sends comma string, HTTP sends array
    if (typeof tags === 'string') {
      tags = tags.split(',').map(t => t.trim()).filter(Boolean);
    }

    // Tags are optional in agent flow - default to empty array if not provided
    if (!tags || tags.length === 0) {
      tags = [];
    } else if (!tags.every(tag => typeof tag === 'string')) {
      return { success: false, error: "Each tag must be a string" };
    }

    // Normalize autoReplyEnabled - agent sends 'yes'/'no', HTTP sends true/false
    const isAutoReply = autoReplyEnabled === 'yes' || autoReplyEnabled === true;

    // Generate unique slug
    const baseSlug = slugify(name, { lower: true, strict: true });
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const { data: existing, error } = await supabase
        .from("RequestForm")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();

      if (error) return { success: false, error: "Failed to check slug uniqueness" };
      if (!existing) break;

      slug = `${baseSlug}-${counter++}`;
    }

    const { data: requestForm, error: insertError } = await supabase
      .from("RequestForm")
      .insert({
        name,
        slug,
        description: description || null,
        tags,
        autoReplyEnabled: isAutoReply,
        autoReplyMessage: isAutoReply ? (autoReplyMessage || null) : null,
        organization_id: organization,
        createdBy: userId   // controller used req.supabaseUserId, we use userId param
      })
      .select()
      .single();

    if (insertError) {
      return { success: false, error: insertError.message };
    }

    return {
      success: true,
      data: {
        id: requestForm.id,
        name: requestForm.name,
        slug: requestForm.slug,
        publicUrl: `/request/${requestForm.slug}`
      }
    };

  } catch (err) {
    console.error('createRequestFormService error:', err);
    return { success: false, error: err.message };
  }
};

// ─── Create Category ─────────────────────────────────────────

export const createCategoryService = async (collectedFields, userId) => {
  try {
    const {
      name,
      organizationId,  // auto-populated from userContext.organizationId
      assignedTeamId,  // optional in agent flow
      reviewerId,
      autoReplyEnabled,
      autoReplyMessage
    } = collectedFields;

    if (!name || !organizationId) {
      return { success: false, error: "name and organizationId are required" };
    }

    // 1️⃣ Check duplicate - same as controller
    const { data: existingCategory, error: duplicateError } = await supabase
      .from("Category")
      .select("id")
      .eq("name", name)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (duplicateError) {
      return { success: false, error: "Failed to check existing category" };
    }

    if (existingCategory) {
      return { success: false, error: "Category with this name already exists in the organization" };
    }

    // 2️⃣ Validate team belongs to org - same as controller (only if provided)
    if (assignedTeamId) {
      const { data: team, error: teamError } = await supabase
        .from("team")
        .select("id")
        .eq("id", assignedTeamId)
        .eq("organization_id", organizationId)
        .maybeSingle();

      if (teamError) {
        return { success: false, error: "Failed to validate assigned team" };
      }

      if (!team) {
        return { success: false, error: "Assigned team does not belong to this organization" };
      }
    }

    // Normalize autoReplyEnabled - agent sends 'yes'/'no', HTTP sends true/false
    const isAutoReply = autoReplyEnabled === 'yes' || autoReplyEnabled === true;

    // 3️⃣ Insert - same as controller
    // Controller used req.userId, we use userId param
    const { data: category, error: insertError } = await supabase
      .from("Category")
      .insert({
        name,
        organization_id: organizationId,
        assignedTeamId: assignedTeamId || null,
        reviewerId: reviewerId ?? null,
        autoReplyEnabled: isAutoReply,
        autoReplyMessage: isAutoReply ? (autoReplyMessage || null) : null,
        createdBy: userId,
        isActive: true
      })
      .select()
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        return { success: false, error: "Category with this name already exists" };
      }
      return { success: false, error: insertError.message };
    }

    return {
      success: true,
      data: {
        id: category.id,
        name: category.name,
        organizationId: category.organization_id,
        assignedTeamId: category.assignedTeamId
      }
    };

  } catch (err) {
    console.error('createCategoryService error:', err);
    return { success: false, error: err.message };
  }
};

// ─── Create Internal Ticket ──────────────────────────────────

export const createInternalTicketService = async (collectedFields) => {
  try {
    const {
      name,         // auto-populated from userContext.name
      email,        // auto-populated from userContext.email
      categoryId,   // resolved from category selection
      // summary,
      description,
      objective,
      // startDate,
      // endDate,
      note,
      attachments = []
    } = collectedFields;

    if (!categoryId || !description) {
      return { success: false, error: "categoryId and description are required" };
    }

    // Fetch category - same as controller
    const { data: category, error: categoryError } = await supabase
      .from("Category")
      .select("*")
      .eq("id", categoryId)
      .maybeSingle();

    if (categoryError) {
      return { success: false, error: "Failed to fetch category" };
    }

    if (!category || !category.isActive) {
      return { success: false, error: "Invalid or inactive category" };
    }

    // Insert ticket - same as controller
    const { data: ticket, error: ticketError } = await supabase
      .from("Ticket")
      .insert({
        userName: name,
        email,
        description,
        objective: objective || null,

        organization_id: category.organization_id,
        categoryId,
        assignedTeamId: category.assignedTeamId,
        reviewerId: category.reviewerId ?? null,
        note: note ?? null,

        workflowStatus: "OPEN",
        reviewed: false,

        payload: {
          // summary: summary || null,
          // startDate: startDate || null,
          // endDate: endDate || null,
          attachments
        }
      })
      .select()
      .single();

    if (ticketError) {
      return { success: false, error: ticketError.message };
    }

    // Auto-reply - same as controller
    if (category.autoReplyEnabled && category.autoReplyMessage) {
      await supabase
        .from("TicketMessage")
        .insert({
          ticketId: ticket.id,
          senderType: "SYSTEM",
          message: category.autoReplyMessage
        });
    }

    // Confirmation email - same as controller (non-blocking)
    sendTicketConfirmationEmail({ to: email }).catch(err => {
      console.error("Failed to send confirmation email:", err);
    });

    return {
      success: true,
      data: {
        ticketId: ticket.id,
        workflowStatus: ticket.workflowStatus
      }
    };

  } catch (err) {
    console.error('createInternalTicketService error:', err);
    return { success: false, error: err.message };
  }
};