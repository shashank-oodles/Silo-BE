import prisma from "../lib/prisma.js";
import { createClient } from "@supabase/supabase-js";
import { sendTicketConfirmationEmail } from "../lib/emails/ticketConfirmation.js";

const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const getAllTeams = async (req, res, next) => {
    try {
        const { organizationId } = req.params;

        const { data: teams, error } = await supabaseAdmin
            .from("team")
            .select("*")
            .eq("organization_id", organizationId);

        const teamsData = teams.map(team => ({ id: team.id, name: team.name }));

        if (error) {
            return res.status(500).json({ error: "Failed to fetch teams" });
        }

        return res.status(200).json({ teamsData });
    } catch (err) {
        next(err);
    }
};

const getAllLegalOwners = async (req, res, next) => {
    try {
        const { assignedTeamId } = req.params;

        const { data: legalOwners, error } = await supabaseAdmin
            .from("team_members")
            .select("*")
            .eq("team_id", assignedTeamId);

        const memberIds = legalOwners.map(owner => owner.member_id);

        const { data: user_Ids, error: membersError } = await supabaseAdmin
            .from("member")
            .select("*")
            .in("id", memberIds)
            .eq("role", "legal");

        const userIds = user_Ids.map(user => user.user_id);

        const {data: users, error: usersError} = await supabaseAdmin
            .from("user")
            .select("id, name, email")
            .in("id", userIds);
        

        if (error) {
            return res.status(500).json({ error: "Failed to fetch legal owners" });
        }

        return res.status(200).json({ users });
    } catch (error) {

    }
}

// const createCategory = async (req, res, next) => {
//     try {
//         const {
//             name,
//             organizationId,
//             assignedTeamId,
//             reviewerId,
//             autoReplyEnabled,
//             autoReplyMessage
//         } = req.body;

//         if (!name || !assignedTeamId) {
//             return res.status(400).json({
//                 error: "name and assignedTeamId are required"
//             });
//         }

//         const existingCategory = await prisma.category.findFirst({
//             where: {
//                 name,
//                 organizationId,
//             }
//         });

//         if (existingCategory) {
//             return res.status(409).json({
//                 error: "Category with this name already exists in the organization"
//             });
//         }

//         // ---- Validate team belongs to same organization ----
//         // const team = await prisma.team.findFirst({
//         //   where: {
//         //     id: assignedTeamId,
//         //     organizationId
//         //   }
//         // });

//         const { data: team, error } = await supabaseAdmin
//             .from("team")
//             .select("*")
//             .eq("id", assignedTeamId)
//             .eq("organization_id", organizationId)
//             .single();


//         if (!team) {
//             return res.status(400).json({
//                 error: "Assigned team does not belong to this organization"
//             });
//         }

//         const category = await prisma.category.create({
//             data: {
//                 name,
//                 organizationId,
//                 assignedTeamId,
//                 autoReplyEnabled,
//                 autoReplyMessage,
//                 reviewerId: reviewerId ?? null,
//                 createdBy: req.userId
//             }
//         });

//         return res.status(201).json({
//             id: category.id,
//             name: category.name,
//             organizationId,
//             assignedTeamId: category.assignedTeamId,
//             reviewerId: category.reviewerId,
//             autoReplyEnabled,
//             autoReplyMessage,
//             isActive: category.isActive
//         });

//     } catch (err) {
//         next(err);
//     }
// };

const createCategory = async (req, res, next) => {
  try {
    const {
      name,
      organizationId,
      assignedTeamId,
      reviewerId,
      autoReplyEnabled = false,
      autoReplyMessage = null
    } = req.body;

    if (!name || !organizationId || !assignedTeamId) {
      return res.status(400).json({
        error: "name, organizationId and assignedTeamId are required"
      });
    }

    // 1️⃣ Check for duplicate category name within org
    const { data: existingCategory, error: duplicateError } =
      await supabaseAdmin
        .from("Category")
        .select("id")
        .eq("name", name)
        .eq("organization_id", organizationId)
        .maybeSingle();

    if (duplicateError) {
      return res.status(500).json({
        error: "Failed to check existing category"
      });
    }

    if (existingCategory) {
      return res.status(409).json({
        error: "Category with this name already exists in the organization"
      });
    }

    // 2️⃣ Validate team belongs to organization
    const { data: team, error: teamError } = await supabaseAdmin
      .from("team")
      .select("id")
      .eq("id", assignedTeamId)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (teamError) {
      return res.status(500).json({
        error: "Failed to validate assigned team"
      });
    }

    if (!team) {
      return res.status(400).json({
        error: "Assigned team does not belong to this organization"
      });
    }

    // 3️⃣ Create category
    const { data: category, error: insertError } = await supabaseAdmin
      .from("Category")
      .insert({
        name,
        organization_id: organizationId,
        assignedTeamId,
        reviewerId: reviewerId ?? null,
        autoReplyEnabled: autoReplyEnabled,
        autoReplyMessage: autoReplyEnabled ? autoReplyMessage : null,
        createdBy: req.userId,
        isActive: true
      })
      .select()
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        return res.status(409).json({
          error: "Category with this name already exists"
        });
      }

      return res.status(500).json({
        error: "Failed to create category",
        details: insertError.message
      });
    }

    return res.status(201).json({
      id: category.id,
      name: category.name,
      organizationId: category.organization_id,
      assignedTeamId: category.assignedTeamId,
      reviewerId: category.reviewerId,
      autoReplyEnabled: category.autoReplyEnabled,
      autoReplyMessage: category.autoReplyMessage,
      isActive: category.isActive
    });

  } catch (err) {
    next(err);
  }
};

// const updateFormReviewerId = async (req, res, next) => {
//     try {
//         const { formId, reviewerId } = req.body;

//         if (!formId || !reviewerId) {
//             return res.status(400).json({ error: "Missing required fields" });
//         }

//         const updatedForm = await prisma.category.update({
//             where: { id: formId },
//             data: { reviewerId }
//         });

//         return res.status(200).json({
//             message: "Reviewer updated successfully",
//             form: updatedForm
//         });
//     } catch (err) {
//         next(err);
//     }
// }

const updateCategoryReviewerId = async (req, res, next) => {
  try {
    const { categoryId, reviewerId } = req.body;

    if (!categoryId || !reviewerId) {
      return res.status(400).json({
        error: "categoryId and reviewerId are required"
      });
    }

    // Update reviewer with org-scope enforcement
    const { data: updatedCategory, error } = await supabaseAdmin
      .from("Category")
      .update({
        reviewerId
      })
      .eq("id", categoryId)
      .select()
      .single();

    if (error) {
      return res.status(500).json({
        error: "Failed to update category reviewer",
        details: error.message
      });
    }

    if (!updatedCategory) {
      return res.status(404).json({
        error: "Category not found or unauthorized"
      });
    }

    return res.status(200).json({
      message: "Reviewer updated successfully",
      category: updatedCategory
    });

  } catch (err) {
    next(err);
  }
};

// const createInternalTicket = async (req, res, next) => {
//     try {
//         const {
//             name,
//             email,
//             categoryId,
//             summary,
//             description,
//             startDate,
//             endDate,
//             attachments = []
//         } = req.body;

//         if (!categoryId || !description) {
//             return res.status(400).json({
//                 error: "categoryId and description are required"
//             });
//         }

//         const category = await prisma.category.findUnique({
//             where: { id: categoryId }
//         });

//         console.log('Category fetched:', category);

//         if (!category || !category.isActive) {
//             return res.status(404).json({ error: "Invalid category" });
//         }

//         // if (category.organizationId !== organizationId) {
//         //     return res.status(403).json({ error: "Unauthorized category access" });
//         // }

//         // if (category.assignedTeamId !== teamId) {
//         //     return res.status(403).json({
//         //         error: "You are not allowed to raise tickets for this category"
//         //     });
//         // }

//         const ticket = await prisma.ticket.create({
//             data: {
//                 userName: name,
//                 organizationId: category.organizationId,
//                 categoryId,
//                 assignedTeamId: category.assignedTeamId,
//                 reviewerId: category.reviewerId ?? null,
//                 email,
//                 description,
//                 payload: {
//                     summary,
//                     startDate,
//                     endDate,
//                     attachments
//                 }
//             }
//         });

//         if (category.autoReplyEnabled && category.autoReplyMessage) {
//             await prisma.ticketMessage.create({
//                 data: {
//                     ticketId: ticket.id,
//                     senderType: "SYSTEM",
//                     message: category.autoReplyMessage
//                 }
//             });
//         }

//         try {
//             await sendTicketConfirmationEmail({ to: email });
//         } catch (err) {
//             console.error("Failed to send confirmation email:", err);
//         }

//         return res.status(201).json({
//             ticketId: ticket.id,
//             status: ticket.status
//         });

//     } catch (err) {
//         next(err);
//     }
// };

const createInternalTicket = async (req, res, next) => {
  try {
    const {
      name,
      email,
      categoryId,
      summary,
      description,
      startDate,
      endDate,
      attachments = []
    } = req.body;

    if (!categoryId || !description) {
      return res.status(400).json({
        error: "categoryId and description are required"
      });
    }

    // 1️⃣ Fetch category
    const { data: category, error: categoryError } = await supabaseAdmin
      .from("Category")
      .select("*")
      .eq("id", categoryId)
      .maybeSingle();

    if (categoryError) {
      return res.status(500).json({
        error: "Failed to fetch category"
      });
    }

    if (!category || !category.isActive) {
      return res.status(404).json({
        error: "Invalid or inactive category"
      });
    }

    // OPTIONAL (recommended): enforce org/team permissions
    // if (category.organization_id !== req.organizationId) { ... }
    // if (category.assignedTeamId !== req.teamId) { ... }

    // 2️⃣ Create ticket
    const { data: ticket, error: ticketError } = await supabaseAdmin
      .from("Ticket")
      .insert({
        userName: name,
        email,
        description,

        organization_id: category.organization_id,
        categoryId,
        assignedTeamId: category.assignedTeamId,
        reviewerId: category.reviewerId ?? null,

        workflowStatus: "OPEN", // REQUIRED
        reviewed: false,        // REQUIRED

        payload: {
          summary,
          startDate,
          endDate,
          attachments
        }
      })
      .select()
      .single();

    if (ticketError) {
      return res.status(500).json({
        error: "Failed to create ticket",
        details: ticketError.message
      });
    }

    // 3️⃣ Auto-reply (if configured)
    if (category.autoReplyEnabled && category.autoReplyMessage) {
      await supabaseAdmin
        .from("ticket_message")
        .insert({
          ticketId: ticket.id,
          senderType: "SYSTEM",
          message: category.auto_reply_message
        });
    }

    // 4️⃣ Confirmation email (non-blocking)
    try {
      await sendTicketConfirmationEmail({ to: email });
    } catch (err) {
      console.error("Failed to send confirmation email:", err);
    }

    return res.status(201).json({
      ticketId: ticket.id,
      workflowStatus: ticket.workflowStatus
    });

  } catch (err) {
    next(err);
  }
};

// const getTicketsByReviewer = async (req, res, next) => {
//     try {
//         const { reviewerId, organizationId } = req.params;

//         if (!organizationId) {
//             return res.status(400).json({
//                 error: "Organization context missing"
//             });
//         }

//         if (!reviewerId) {
//             return res.status(400).json({
//                 error: "reviewerId is required"
//             });
//         }

//         const tickets = await prisma.ticket.findMany({
//             where: {
//                 organizationId,
//                 reviewerId,
//                 reviewed: false
//             },
//             orderBy: {
//                 createdAt: "desc"
//             },
//             include: {
//                 category: {
//                     select: {
//                         id: true,
//                         name: true
//                     }
//                 },
//                 requestForm: {
//                     select: {
//                         id: true,
//                         name: true,
//                         slug: true
//                     }
//                 }
//             }
//         });

//         const response = tickets.map(ticket => ({
//             id: ticket.id,
//             email: ticket.email,
//             //   description: ticket.description,

//             priority: ticket.priority,
//             workflowStatus: ticket.workflowStatus,

//             //   assignedTeamId: ticket.assignedTeamId,
//             //   reviewerId: ticket.reviewerId,
//             legalOwnerId: ticket.legalOwnerId,

//             createdAt: ticket.createdAt,
//             updatedAt: ticket.updatedAt,

//             // Source detection
//             sourceType: ticket.categoryId ? "INTERNAL" : "EXTERNAL",

//             category: ticket.category
//                 ? {
//                     id: ticket.category.id,
//                     name: ticket.category.name
//                 }
//                 : null,

//             requestForm: ticket.requestForm
//                 ? {
//                     id: ticket.requestForm.id,
//                     name: ticket.requestForm.name,
//                     slug: ticket.requestForm.slug
//                 }
//                 : null
//         }));

//         return res.status(200).json({
//             tickets: response
//         });

//     } catch (err) {
//         next(err);
//     }
// };

const getTicketsByReviewer = async (req, res, next) => {
  try {
    const { reviewerId, organizationId } = req.params;

    if (!organizationId) {
      return res.status(400).json({
        error: "Organization context missing"
      });
    }

    if (!reviewerId) {
      return res.status(400).json({
        error: "reviewerId is required"
      });
    }

    // 1️⃣ Fetch tickets with joins
    const { data: tickets, error } = await supabaseAdmin
      .from("Ticket")
      .select(`
        id,
        email,
        priority,
        workflowStatus,
        legalOwnerId,
        reviewed,
        created_at,
        updated_at,
        categoryId,
        requestFormId,

        category:categoryId (
          id,
          name
        ),

        requestForm:requestFormId (
          id,
          name,
          slug
        )
      `)
      .eq("organization_id", organizationId)
      .eq("reviewerId", reviewerId)
      .eq("reviewed", false)
      .order("created_at", { ascending: false });

    if (error) {
      return res.status(500).json({
        error: "Failed to fetch tickets",
        details: error.message
      });
    }

    // 2️⃣ Shape response (same as Prisma version)
    const response = (tickets || []).map(ticket => ({
      id: ticket.id,
      email: ticket.email,

      priority: ticket.priority,
      workflowStatus: ticket.workflowStatus,

      legalOwnerId: ticket.legalOwnerId,

      createdAt: ticket.created_at,
      updatedAt: ticket.updated_at,

      // Source detection
      sourceType: ticket.categoryId ? "INTERNAL" : "EXTERNAL",

      category: ticket.category
        ? {
            id: ticket.category.id,
            name: ticket.category.name
          }
        : null,

      requestForm: ticket.requestForm
        ? {
            id: ticket.requestForm.id,
            name: ticket.requestForm.name,
            slug: ticket.requestForm.slug
          }
        : null
    }));

    return res.status(200).json({
      tickets: response
    });

  } catch (err) {
    next(err);
  }
};

const reviewTicket = async (req, res, next) => {
  try {
    const { ticketId } = req.params;
    const { legalOwnerId, priority, workflowStatus, organizationId } = req.body;

    if (!ticketId) {
      return res.status(400).json({
        error: "ticketId is required"
      });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId }
    });

    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    // if (ticket.organizationId !== organizationId) {
    //   return res.status(403).json({ error: "Unauthorized" });
    // }

    const updateData = {};

    if (legalOwnerId !== undefined) {
      updateData.legalOwnerId = legalOwnerId;
    }

    if (priority !== undefined) {
      updateData.priority = priority;
    }

    if (workflowStatus !== undefined) {
      updateData.workflowStatus = workflowStatus;
    }

    const finalLegalOwner =
      legalOwnerId !== undefined ? legalOwnerId : ticket.legalOwnerId;

    const finalPriority =
      priority !== undefined ? priority : ticket.priority;

    const finalWorkflowStatus =
      workflowStatus !== undefined
        ? workflowStatus
        : ticket.workflowStatus;

    updateData.reviewed = Boolean(
      finalLegalOwner &&
      finalPriority &&
      finalWorkflowStatus
    );

    const updatedTicket = await prisma.ticket.update({
      where: { id: ticketId },
      data: updateData
    });

    return res.status(200).json({
      message: "Ticket updated successfully",
      ticket: {
        id: updatedTicket.id,
        legalOwnerId: updatedTicket.legalOwnerId,
        priority: updatedTicket.priority,
        workflowStatus: updatedTicket.workflowStatus,
        reviewed: updatedTicket.reviewed
      }
    });

  } catch (err) {
    next(err);
  }
};



export {
    getAllTeams,
    createCategory,
    createInternalTicket,
    updateCategoryReviewerId,
    getTicketsByReviewer,
    getAllLegalOwners,
    reviewTicket
}