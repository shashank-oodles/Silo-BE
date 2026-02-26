import { createClient } from "@supabase/supabase-js";
import { sendChatMail } from "../lib/emails/ticketChat.js";
import { resolveTicketEmailRecipients } from "../utils/resolveTicketEmailRecipients.js";
import { sendChatBroadcastEmail, sendCommentBroadcastEmail } from "../lib/emails/sendChatBroadcastEmail.js";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// const createTicketMessage = async (req, res, next) => {
//   try {
//     const { ticketId } = req.params;
//     const { message, attachments = [] } = req.body;

//     if (!ticketId || !message) {
//       return res.status(400).json({
//         error: "ticketId and message are required"
//       });
//     }

//     const { data: ticket, error: ticketError } = await supabaseAdmin
//       .from("Ticket")
//       .select(`
//         id,
//         email,
//         legalOwnerId,
//         organization_id
//       `)
//       .eq("id", ticketId)
//       .maybeSingle();

//     if (ticketError) {
//       return res.status(500).json({ error: "Failed to fetch ticket" });
//     }

//     if (!ticket) {
//       return res.status(404).json({ error: "Ticket not found" });
//     }

//     let senderType = null;
//     let senderId = null;

//     // External user (ticket raiser)
//     if (!req.user) {
//       if (req.body.email !== ticket.email) {
//         return res.status(403).json({
//           error: "Unauthorized external sender"
//         });
//       }

//       senderType = "EXTERNAL";
//       senderId = ticket.email;
//     }

//     // Logged-in user
//     if (req.user) {
//       senderId = req.user.id;

//       // Admin
//       if (req.user.role === "admin" || req.user.role === "owner" || req.user.role === "legal" || req.user.role === "member") {
//         senderType = req.user.role.toUpperCase();
//       }

//       // // Legal owner
//       // else if (req.user.id === ticket.legalOwnerId) {
//       //   senderType = "LEGAL";
//       // }

//       // Ticket creator (internal)
//       // else if (req.body.email === ticket.email) {
//       //   senderType = "EXTERNAL";
//       // }

//       else {
//         return res.status(403).json({
//           error: "You are not allowed to message on this ticket"
//         });
//       }
//     }

//     // 3️⃣ Insert message
//     const { data: newMessage, error: insertError } = await supabaseAdmin
//       .from("TicketMessage")
//       .insert({
//         ticketId: ticket.id,
//         senderId,
//         senderType,
//         message,
//         attachments
//       })
//       .select()
//       .single();

//     if (insertError) {
//       console.log(insertError)
//       return res.status(500).json({
//         error: "Failed to create message",
//         details: insertError.message
//       });
//     }

//     // try {if(senderType === "EXTERNAL")
//     //   await sendChatMail({ to: ticket.email, ticketId: ticket.id });
//     // } catch (error) {

//     // }

//     return res.status(201).json({
//       message: "Message sent successfully",
//       data: newMessage
//     });

//   } catch (err) {
//     next(err);
//   }
// };

// const getTicketMessages = async (req, res, next) => {
//   try {
//     const { ticketId } = req.params;

//     if (!ticketId) {
//       return res.status(400).json({
//         error: "ticketId is required"
//       });
//     }

//     // Fetch ticket (to understand context)
//     const { data: ticket, error: ticketError } = await supabaseAdmin
//       .from("Ticket")
//       .select("id, email, legalOwnerId, organization_id")
//       .eq("id", ticketId)
//       .maybeSingle();

//     if (ticketError || !ticket) {
//       return res.status(404).json({
//         error: "Ticket not found"
//       });
//     }

//     // Determine viewer type
//     // const isExternalViewer = !req.user;
//     if (!req.query.user_id) {
//       if (ticket.email !== req.query.email) {
//         return res.status(403).json({ error: "Access denied" });
//       }
//     }


//     // Fetch messages
//     const { data: messages, error } = await supabaseAdmin
//       .from("TicketMessage")
//       .select(`
//         id,
//         message,
//         attachments,
//         senderType,
//         created_at
//       `)
//       .eq("ticketId", ticketId)
//       .order("created_at", { ascending: true });

//     if (error) {
//       return res.status(500).json({
//         error: "Failed to fetch messages",
//         details: error.message
//       });
//     }

//     // Compute alignment per viewer
//     const formattedMessages = messages.map(msg => {
//       // let alignment;

//       // if (isExternalViewer) {
//       //   // Ticket raiser view
//       //   alignment = msg.senderType === "EXTERNAL"
//       //     ? "RIGHT"
//       //     : "LEFT";
//       // } else {
//       //   // Admin / Legal view
//       //   alignment = msg.senderType === "EXTERNAL"
//       //     ? "LEFT"
//       //     : "RIGHT";
//       // }

//       return {
//         id: msg.id,
//         message: msg.message,
//         attachments: msg.attachments,
//         senderType: msg.senderType,
//         // alignment,
//         createdAt: msg.created_at
//       };
//     });

//     return res.status(200).json({
//       ticketId,
//       // viewerType: isExternalViewer ? "EXTERNAL" : "INTERNAL",
//       messages: formattedMessages
//     });

//   } catch (err) {
//     next(err);
//   }
// };

const createTicketMessage = async (req, res, next) => {
  try {
    const { ticketId } = req.params;
    const { message, attachments = [] } = req.body;

    if (!ticketId || !message) {
      return res.status(400).json({
        error: "ticketId and message are required"
      });
    }

    const { data: ticket, error: ticketError } = await supabaseAdmin
      .from("Ticket")
      .select(`
        id,
        email,
        legalOwnerId,
        reviewerId,
        organization_id
      `)
      .eq("id", ticketId)
      .maybeSingle();

    if (ticketError || !ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    let senderType;
    let senderId = null;

    // External user
    if (!req.user) {
      if (req.body.email !== ticket.email) {
        return res.status(403).json({ error: "Unauthorized external sender" });
      }

      senderType = "EXTERNAL";
    }

    // Internal user
    if (req.user) {
      senderType = req.user.role.toUpperCase();
      senderId = req.user.id;
    }

    // Insert message
    const { data: newMessage, error: insertError } = await supabaseAdmin
      .from("TicketMessage")
      .insert({
        ticketId: ticket.id,
        senderId,
        senderType,
        message,
        attachments
      })
      .select()
      .single();

    if (insertError) {
      return res.status(500).json({
        error: "Failed to create message",
        details: insertError.message
      });
    }

    // 🔔 EMAIL BROADCAST (non-blocking)
    try {
      const recipients = await resolveTicketEmailRecipients({
        ticket,
        senderUserId: req.user?.id ?? null,
        senderEmail: req.user?.email ?? ticket.email,
        supabaseAdmin
      });

      const senderName = req.user?.email ?? ticket.email;

      for (const email of recipients) {
        await sendChatBroadcastEmail({
          to: email,
          senderName,
          ticketId: ticket.id,
          message,
          // ticketUrl: `${process.env.FRONTEND_BASE_URL}/tickets/${ticket.id}`
        });
      }
    } catch (emailErr) {
      console.error("Email broadcast failed:", emailErr);
    }

    return res.status(201).json({
      message: "Message sent successfully",
      data: newMessage
    });

  } catch (err) {
    next(err);
  }
};

const createComment = async (req, res, next) => {
  try {
    const { ticketId } = req.params;
    const { comment } = req.body;

    if (!ticketId || !comment) {
      return res.status(400).json({
        error: "ticketId and comment are required"
      });
    }

    const { data: ticket, error: ticketError } = await supabaseAdmin
      .from("Ticket")
      .select(`
        id,
        email,
        legalOwnerId,
        reviewerId,
        organization_id
      `)
      .eq("id", ticketId)
      .maybeSingle();

    if (ticketError || !ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    let senderType;
    let senderId = null;

    // Internal user
    if (req.user) {
      senderType = req.user.role.toUpperCase();
      senderId = req.user.id;
    } else {
      return res.status(403).json({ error: "Only internal users can comment" });
    }

    if (senderType === "MEMBER") {
      return res.status(403).json({ error: "Members are not allowed to comment" });
    }

    // Insert message
    const { data: newComment, error: insertError } = await supabaseAdmin
      .from("ticket_comments")
      .insert({
        ticketId: ticket.id,
        senderId,
        senderType,
        comment
      })
      .select()
      .single();

    if (insertError) {
      return res.status(500).json({
        error: "Failed to create message",
        details: insertError.message
      });
    }

    // EMAIL BROADCAST (non-blocking)
    try {
      const recipients = await resolveTicketEmailRecipients({
        ticket,
        senderUserId: req.user?.id ?? null,
        senderEmail: req.user?.email ?? ticket.email,
        supabaseAdmin
      });

      const senderName = req.user?.email ?? ticket.email;

      for (const email of recipients) {
        await sendCommentBroadcastEmail({
          to: email,
          senderName,
          ticketId: ticket.id,
          comment,
          // ticketUrl: `${process.env.FRONTEND_BASE_URL}/tickets/${ticket.id}`
        });
      }
    } catch (emailErr) {
      console.error("Email broadcast failed:", emailErr);
    }

    return res.status(201).json({
      message: "Comment added successfully",
      data: newComment
    });

  } catch (err) {
    next(err);
  }
};

const getTicketMessages = async (req, res, next) => {
  try {
    const { ticketId } = req.params;

    if (!ticketId) {
      return res.status(400).json({
        error: "ticketId is required"
      });
    }

    // Fetch ticket (needed for access + external email)
    const { data: ticket, error: ticketError } = await supabaseAdmin
      .from("Ticket")
      .select(`
        id,
        email,
        organization_id
      `)
      .eq("id", ticketId)
      .maybeSingle();

    if (ticketError) {
      return res.status(500).json({
        error: "Failed to fetch ticket",
        details: ticketError.message
      });
    }

    if (!ticket) {
      return res.status(404).json({
        error: "Ticket not found"
      });
    }

    // External access check (no auth user)
    // External users must match ticket email
    if (!req.user) {
      const requesterEmail = req.query.email;

      if (!requesterEmail || requesterEmail !== ticket.email) {
        return res.status(403).json({
          error: "Access denied"
        });
      }
    }

    // Fetch messages
    const { data: messages, error: messageError } = await supabaseAdmin
      .from("TicketMessage")
      .select(`
        id,
        message,
        attachments,
        senderType,
        senderId,
        created_at
      `)
      .eq("ticketId", ticketId)
      .order("created_at", { ascending: true });

    if (messageError) {
      return res.status(500).json({
        error: "Failed to fetch messages",
        details: messageError.message
      });
    }

    // Collect internal senderIds (FKs only, nullable-safe)
    const internalSenderIds = [
      ...new Set(
        (messages || [])
          .filter(m => m.senderId) // FK exists → internal user
          .map(m => m.senderId)
      )
    ];

    // Fetch sender emails in ONE query
    let userEmailMap = {};

    if (internalSenderIds.length > 0) {
      const { data: users, error: userError } = await supabaseAdmin
        .from("user")
        .select("id, email")
        .in("id", internalSenderIds);

      if (userError) {
        return res.status(500).json({
          error: "Failed to fetch sender emails",
          details: userError.message
        });
      }

      userEmailMap = (users || []).reduce((acc, user) => {
        acc[user.id] = user.email;
        return acc;
      }, {});
    }

    // Shape final response
    const formattedMessages = (messages || []).map(msg => {
      let senderEmail = null;

      if (msg.senderId) {
        // Internal user → lookup from user table
        senderEmail = userEmailMap[msg.senderId] || null;
      } else if (msg.senderType === "EXTERNAL") {
        // External user → ticket email
        senderEmail = ticket.email;
      } else {
        // SYSTEM message
        senderEmail = null;
      }

      return {
        id: msg.id,
        message: msg.message,
        attachments: msg.attachments,
        senderType: msg.senderType,
        senderEmail,
        createdAt: msg.created_at
      };
    });

    return res.status(200).json({
      ticketId,
      messages: formattedMessages
    });

  } catch (err) {
    next(err);
  }
};

const getTicketComments = async (req, res, next) => {
  try {
    const { ticketId } = req.params;

    if (!ticketId) {
      return res.status(400).json({
        error: "ticketId is required"
      });
    }

    // Fetch ticket
    const { data: ticket, error: ticketError } = await supabaseAdmin
      .from("Ticket")
      .select(`
        id,
        email,
        organization_id
      `)
      .eq("id", ticketId)
      .maybeSingle();

    if (ticketError) {
      return res.status(500).json({
        error: "Failed to fetch ticket",
        details: ticketError.message
      });
    }

    if (!ticket) {
      return res.status(404).json({
        error: "Ticket not found"
      });
    }

    // ✅ External users can VIEW comments but not CREATE them
    if (!req.user) {
      const requesterEmail = req.query.email;

      if (!requesterEmail || requesterEmail !== ticket.email) {
        return res.status(403).json({
          error: "Access denied"
        });
      }
    }

    // Fetch comments
    const { data: comments, error: commentError } = await supabaseAdmin
      .from("ticket_comments")
      .select(`
        id,
        comment,
        senderType,
        senderId,
        created_at
      `)
      .eq("ticketId", ticketId)
      .order("created_at", { ascending: true });

    if (commentError) {
      return res.status(500).json({
        error: "Failed to fetch comments",
        details: commentError.message
      });
    }

    // ✅ Since only internal users can comment, all senderId will exist
    const senderIds = [
      ...new Set(
        (comments || []).map(c => c.senderId).filter(Boolean)
      )
    ];

    let userEmailMap = {};

    if (senderIds.length > 0) {
      const { data: users, error: userError } = await supabaseAdmin
        .from("user")
        .select("id, email, name")
        .in("id", senderIds);

      if (userError) {
        return res.status(500).json({
          error: "Failed to fetch sender details",
          details: userError.message
        });
      }

      userEmailMap = (users || []).reduce((acc, user) => {
        acc[user.id] = { email: user.email, name: user.name };
        return acc;
      }, {});
    }

    // ✅ Simplified formatting - all comments are from internal users
    const formattedComments = (comments || []).map(comment => {
      const senderInfo = userEmailMap[comment.senderId] || {};

      return {
        id: comment.id,
        comment: comment.comment,
        senderType: comment.senderType,
        senderEmail: senderInfo.email || null,
        senderName: senderInfo.name || null,
        createdAt: comment.created_at
      };
    });

    return res.status(200).json({
      ticketId,
      comments: formattedComments
    });

  } catch (err) {
    next(err);
  }
};

const getTicketDetails = async (req, res, next) => {
  try {
    const { ticketId } = req.params;

    if (!ticketId) {
      return res.status(400).json({
        error: "ticketId is required"
      });
    }

    // Fetch tickets
    // const { data: tickets, error } = await supabaseAdmin
    //   .from("Ticket")
    //   .select(`
    //     id,
    //     workflowStatus,
    //     priority,
    //     assignedTeamId,
    //     legalOwnerId,
    //     payload,
    //     description,
    //     created_at
    //   `)
    //   .eq("id", ticketId)

    const { data: ticketsRaw, error } = await supabaseAdmin
      .from("Ticket")
      .select(`
    id,
    workflowStatus,
    priority,
    assignedTeamId,
    legalOwnerId,
    payload,
    description,
    created_at,
    team:assignedTeamId(name),
    user:legalOwnerId(name)
  `)
      .eq("id", ticketId);

    // ✅ Transform the data to flatten the structure
    const tickets = ticketsRaw.map(ticket => ({
      id: ticket.id,
      workflowStatus: ticket.workflowStatus,
      priority: ticket.priority,
      assignedTeamId: ticket.assignedTeamId,
      legalOwnerId: ticket.legalOwnerId,
      payload: ticket.payload,
      description: ticket.description,
      created_at: ticket.created_at,
      assignedTeamName: ticket.team?.name || null,
      legalOwnerName: ticket.user?.name || null
    }));

    // If it's a single ticket query, get the first item
    const ticket = tickets[0];

    if (error) {
      return res.status(500).json({
        error: "Failed to fetch tickets",
        details: error.message
      });
    }

    return res.status(200).json({ tickets });

  } catch (err) {
    next(err);
  }
};

const getTicketStatus = async (req, res, next) => {
  try {
    const { ticket_id } = req.params;

    if (!ticket_id) {
      return res.status(400).json({
        error: "ticket_id is required"
      });
    }

    const { data: ticket, error } = await supabaseAdmin
      .from("Ticket")
      .select("id, workflowStatus")
      .eq("id", ticket_id)
      .maybeSingle();

    if (error) {
      return res.status(500).json({
        error: "Failed to fetch ticket status",
        details: error.message
      });
    }

    if (!ticket) {
      return res.status(404).json({
        error: "Ticket not found",
        details: `No ticket found with id ${ticket_id}`
      });
    }

    return res.status(200).json({
      ticketId: ticket.id,
      workflowStatus: ticket.workflowStatus
    });
  } catch (err) {
    next(err);
  }
}

const getAllTickets = async (req, res, next) => {
  try {
    const { id: userId, role, organizationId } = req.user;

    let query = supabaseAdmin
      .from("Ticket")
      .select(`
        id,
        email,
        priority,
        workflowStatus,
        legalOwnerId,
        reviewerId,
        reviewed,
        payload,
        categoryId,
        requestFormId,
        created_at,
        updated_at,

        category:categoryId (
          id,
          name
        ),

        requestForm:requestFormId (
          id,
          name,
          slug
        ),

        legalowner:legalOwnerId (
          id,
          name,
          email
        ),

        reviewer:reviewerId (
          id,
          name,
          email
        )
      `)
      .eq("organization_id", organizationId)
      .eq("createdBy", userId)
      .order("created_at", { ascending: false });


    // // ADMIN / OWNER → all tickets
    // if (role === "admin" || role === "owner") {
    //   // no extra filters
    // }

    // // LEGAL
    // else if (role === "legal") {
    //   // Check if user is reviewer on ANY ticket
    //   const { data: reviewerCheck, error } = await supabaseAdmin
    //   //   .from("Ticket")
    //   //   .select("id")
    //   //   .eq("organization_id", organizationId)
    //   //   .eq("reviewerId", userId)
    //   //   .limit(1);

    //   // if (error) {
    //   //   return res.status(500).json({
    //   //     error: "Failed to verify reviewer role"
    //   //   });
    //   // }

    //   // const isReviewer = reviewerCheck.length > 0;

    //   // if (!isReviewer) {
    //   //   // Only tickets where user is legal owner
    //   //   query = query.eq("legalOwnerId", userId);
    //   // }
    //   query = query.eq("reviewerId", userId)
    //   // else: reviewer → see all tickets
    // }

    // // MEMBER
    // else if (role === "member") {
    //   query = query.eq("email", req.user.email);
    // }

    // // Unknown role
    // else {
    //   return res.status(403).json({
    //     error: "Invalid role"
    //   });
    // }

    const { data: tickets, error } = await query;


    if (error) {
      return res.status(500).json({
        error: "Failed to fetch tickets",
        details: error.message
      });
    }

    // Shape response
    const response = (tickets || []).map(ticket => ({
      id: ticket.id,
      email: ticket.email,

      priority: ticket.priority,
      workflowStatus: ticket.workflowStatus,
      reviewed: ticket.reviewed,

      legalOwnerId: ticket.legalOwnerId,
      reviewerId: ticket.reviewerId,
      legalName: ticket.legalowner?.name ?? null,
      reviewerName: ticket.reviewer?.name ?? null,

      summary: ticket.payload?.summary ?? null,
      startDate: ticket.payload?.startDate ?? null,
      endDate: ticket.payload?.endDate ?? null,
      attachments: ticket.payload?.attachments ?? [],

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
        : null,

      createdAt: ticket.created_at,
      updatedAt: ticket.updated_at
    }));

    return res.status(200).json({
      count: response.length,
      tickets: response
    });

  } catch (err) {
    next(err);
  }
};

const getTicketsForReview = async (req, res, next) => {
  try {
    const { id: userId, role, organizationId } = req.user;

    let query = supabaseAdmin
      .from("Ticket")
      .select(`
        id,
        email,
        priority,
        workflowStatus,
        legalOwnerId,
        reviewerId,
        reviewed,
        payload,
        categoryId,
        requestFormId,
        created_at,
        updated_at,

        category:categoryId (
          id,
          name
        ),

        requestForm:requestFormId (
          id,
          name,
          slug
        ),

        legalowner:legalOwnerId (
          id,
          name,
          email
        ),

        reviewer:reviewerId (
          id,
          name,
          email
        )
      `)
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false });


    // ADMIN / OWNER → all tickets
    if (role === "admin" || role === "owner") {
      // no extra filters
    }

    // LEGAL
    else if (role === "legal") {
      // Check if user is reviewer on ANY ticket
      const { data: reviewerCheck, error } = await supabaseAdmin
      //   .from("Ticket")
      //   .select("id")
      //   .eq("organization_id", organizationId)
      //   .eq("reviewerId", userId)
      //   .limit(1);

      // if (error) {
      //   return res.status(500).json({
      //     error: "Failed to verify reviewer role"
      //   });
      // }

      // const isReviewer = reviewerCheck.length > 0;

      // if (!isReviewer) {
      //   // Only tickets where user is legal owner
      //   query = query.eq("legalOwnerId", userId);
      // }
      query = query.eq("reviewerId", userId)
      // else: reviewer → see all tickets
    }

    // MEMBER
    else if (role === "member") {
      query = query.eq("email", req.user.email);
    }

    // Unknown role
    else {
      return res.status(403).json({
        error: "Invalid role"
      });
    }

    const { data: tickets, error } = await query;


    if (error) {
      return res.status(500).json({
        error: "Failed to fetch tickets",
        details: error.message
      });
    }

    // Shape response
    const response = (tickets || []).map(ticket => ({
      id: ticket.id,
      email: ticket.email,

      priority: ticket.priority,
      workflowStatus: ticket.workflowStatus,
      reviewed: ticket.reviewed,

      legalOwnerId: ticket.legalOwnerId,
      reviewerId: ticket.reviewerId,
      legalName: ticket.legalowner?.name ?? null,
      reviewerName: ticket.reviewer?.name ?? null,

      summary: ticket.payload?.summary ?? null,
      startDate: ticket.payload?.startDate ?? null,
      endDate: ticket.payload?.endDate ?? null,
      attachments: ticket.payload?.attachments ?? [],

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
        : null,

      createdAt: ticket.created_at,
      updatedAt: ticket.updated_at
    }));

    return res.status(200).json({
      count: response.length,
      tickets: response
    });

  } catch (err) {
    next(err);
  }
};

const generateUsageReport = async (req, res, next) => {
  try {
    const { format = 'json', startDate, endDate, organizationId } = req.query;

    // ✅ Only admin/owner can access usage reports
    if (!['admin', 'owner'].includes(req.user.role)) {
      return res.status(403).json({
        error: "Access denied. Only admins and owners can generate usage reports."
      });
    }

    // Date filtering
    let dateFilter = {};
    if (startDate) dateFilter.gte = startDate;
    if (endDate) dateFilter.lte = endDate;

    // Organization filtering (owner can only see their org, admin sees all)
    let orgFilter = {};
    if (req.user.role === 'owner') {
      orgFilter = { eq: req.user.organizationId };
    } else if (organizationId) {
      orgFilter = { eq: organizationId };
    }

    // ✅ Fetch comprehensive usage data
    const reportData = await generateUsageMetrics(dateFilter, orgFilter);

    // ✅ Return data in requested format
    switch (format.toLowerCase()) {
      case 'csv':
        return downloadCSVReport(res, reportData);
      case 'pdf':
        return downloadPDFReport(res, reportData);
      case 'excel':
      case 'xlsx':
        return downloadExcelReport(res, reportData);
      default:
        return res.status(200).json({
          generatedAt: new Date().toISOString(),
          dateRange: { startDate, endDate },
          data: reportData
        });
    }

  } catch (err) {
    console.error('Usage report error:', err);
    next(err);
  }
};

const generateUsageMetrics = async (dateFilter, orgFilter) => {
  try {
    // ✅ 1. Total Users by Role
    let userQuery = supabaseAdmin
      .from('member')
      .select('role, organization_id, user_id, created_at');

    if (Object.keys(orgFilter).length > 0) {
      const [operator, value] = Object.entries(orgFilter)[0];
      userQuery = userQuery[operator]('organization_id', value);
    }

    if (dateFilter.gte) userQuery = userQuery.gte('created_at', dateFilter.gte);
    if (dateFilter.lte) userQuery = userQuery.lte('created_at', dateFilter.lte);

    const { data: members, error: memberError } = await userQuery;
    if (memberError) throw memberError;

    // ✅ 2. Organizations Data
    let orgQuery = supabaseAdmin
      .from('organization')
      .select('id, name, created_at');

    if (Object.keys(orgFilter).length > 0) {
      const [operator, value] = Object.entries(orgFilter)[0];
      orgQuery = orgQuery[operator]('id', value);
    }

    const { data: organizations, error: orgError } = await orgQuery;
    if (orgError) throw orgError;

    // ✅ 3. Tickets Data
    let ticketQuery = supabaseAdmin
      .from('Ticket')
      .select('id, workflowStatus, organization_id, created_at');

    if (Object.keys(orgFilter).length > 0) {
      const [operator, value] = Object.entries(orgFilter)[0];
      ticketQuery = ticketQuery[operator]('organization_id', value);
    }

    if (dateFilter.gte) ticketQuery = ticketQuery.gte('created_at', dateFilter.gte);
    if (dateFilter.lte) ticketQuery = ticketQuery.lte('created_at', dateFilter.lte);

    const { data: tickets, error: ticketError } = await ticketQuery;
    if (ticketError) throw ticketError;

    // ✅ 4. Categories Data
    let categoryQuery = supabaseAdmin
      .from('Category')
      .select('id, organization_id, isActive, created_at');

    if (Object.keys(orgFilter).length > 0) {
      const [operator, value] = Object.entries(orgFilter)[0];
      categoryQuery = categoryQuery[operator]('organization_id', value);
    }

    const { data: categories, error: categoryError } = await categoryQuery;
    if (categoryError) throw categoryError;

    // ✅ 5. Request Forms Data
    let formQuery = supabaseAdmin
      .from('RequestForm')
      .select('id, organization_id, created_at');

    if (Object.keys(orgFilter).length > 0) {
      const [operator, value] = Object.entries(orgFilter)[0];
      formQuery = formQuery[operator]('organization_id', value);
    }

    const { data: requestForms, error: formError } = await formQuery;
    if (formError) throw formError;

    // ✅ Calculate metrics
    const usersByRole = members.reduce((acc, member) => {
      acc[member.role] = (acc[member.role] || 0) + 1;
      return acc;
    }, {});

    const ticketsByStatus = tickets.reduce((acc, ticket) => {
      acc[ticket.workflowStatus] = (acc[ticket.workflowStatus] || 0) + 1;
      return acc;
    }, {});

    const usersByOrganization = members.reduce((acc, member) => {
      const orgName = organizations.find(o => o.id === member.organization_id)?.name || 'Unknown';
      acc[orgName] = (acc[orgName] || 0) + 1;
      return acc;
    }, {});

    return {
      summary: {
        totalUsers: members.length,
        totalOrganizations: organizations.length,
        totalTickets: tickets.length,
        totalCategories: categories.length,
        totalRequestForms: requestForms.length,
        activeCategories: categories.filter(c => c.isActive).length
      },
      breakdown: {
        usersByRole,
        ticketsByStatus,
        usersByOrganization
      },
      organizations: organizations.map(org => ({
        id: org.id,
        name: org.name,
        userCount: members.filter(m => m.organization_id === org.id).length,
        ticketCount: tickets.filter(t => t.organization_id === org.id).length,
        categoryCount: categories.filter(c => c.organization_id === org.id).length,
        createdAt: org.created_at
      }))
    };

  } catch (error) {
    console.error('Error generating usage metrics:', error);
    throw error;
  }
};

// const downloadCSVReport = (res, reportData) => {
//   const csv = require('csv-writer');
//   const path = require('path');
//   const fs = require('fs');

//   const fileName = `silo-usage-report-${new Date().toISOString().split('T')[0]}.csv`;
//   const filePath = path.join('/tmp', fileName);

//   const csvWriter = csv.createObjectCsvWriter({
//     path: filePath,
//     header: [
//       { id: 'metric', title: 'Metric' },
//       { id: 'value', title: 'Value' },
//       { id: 'category', title: 'Category' }
//     ]
//   });

//   // Flatten data for CSV
//   const csvData = [];

//   // Summary metrics
//   Object.entries(reportData.summary).forEach(([key, value]) => {
//     csvData.push({
//       metric: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
//       value: value,
//       category: 'Summary'
//     });
//   });

//   // Users by role
//   Object.entries(reportData.breakdown.usersByRole).forEach(([role, count]) => {
//     csvData.push({
//       metric: `${role} Users`,
//       value: count,
//       category: 'Users by Role'
//     });
//   });

//   // Organizations
//   reportData.organizations.forEach(org => {
//     csvData.push({
//       metric: org.name,
//       value: `${org.userCount} users, ${org.ticketCount} tickets`,
//       category: 'Organizations'
//     });
//   });

//   csvWriter.writeRecords(csvData)
//     .then(() => {
//       res.download(filePath, fileName, (err) => {
//         if (err) {
//           console.error('Download error:', err);
//           res.status(500).json({ error: 'Download failed' });
//         }
//         // Clean up temp file
//         fs.unlinkSync(filePath);
//       });
//     })
//     .catch(err => {
//       console.error('CSV generation error:', err);
//       res.status(500).json({ error: 'CSV generation failed' });
//     });
// };

const downloadCSVReport = (res, reportData) => {
  import('path').then(async (path) => {
    import('fs').then(async (fs) => {
      try {
        const fileName = `silo-usage-report-${new Date().toISOString().split('T')[0]}.csv`;

        // ✅ Build CSV manually (no external library needed)
        let csvContent = 'Metric,Value,Category\n';

        // Summary metrics
        Object.entries(reportData.summary).forEach(([key, value]) => {
          const metric = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
          csvContent += `"${metric}","${value}","Summary"\n`;
        });

        // Users by role
        Object.entries(reportData.breakdown.usersByRole).forEach(([role, count]) => {
          csvContent += `"${role} Users","${count}","Users by Role"\n`;
        });

        // Tickets by status
        Object.entries(reportData.breakdown.ticketsByStatus || {}).forEach(([status, count]) => {
          csvContent += `"${status} Tickets","${count}","Tickets by Status"\n`;
        });

        // Organizations
        reportData.organizations.forEach(org => {
          csvContent += `"${org.name}","${org.userCount} users, ${org.ticketCount} tickets","Organizations"\n`;
        });

        // ✅ Send CSV directly as response
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.send(csvContent);

      } catch (err) {
        console.error('CSV generation error:', err);
        res.status(500).json({ error: 'CSV generation failed' });
      }
    });
  });
};

const downloadPDFReport = async (res, reportData) => {
  try {
    // Using puppeteer for PDF generation (install: npm install puppeteer)
    const puppeteer = await import('puppeteer');

    const fileName = `silo-usage-report-${new Date().toISOString().split('T')[0]}.pdf`;

    // ✅ Generate HTML content for PDF
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>SILO Usage Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
          .header { text-align: center; border-bottom: 2px solid #2c3e50; padding-bottom: 20px; margin-bottom: 30px; }
          .section { margin-bottom: 30px; }
          .section h2 { color: #2c3e50; border-left: 4px solid #3498db; padding-left: 15px; }
          .metric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px; }
          .metric-card { background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #3498db; }
          .metric-value { font-size: 24px; font-weight: bold; color: #2c3e50; }
          .metric-label { color: #7f8c8d; font-size: 14px; margin-top: 5px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
          th { background-color: #f8f9fa; font-weight: bold; color: #2c3e50; }
          .footer { text-align: center; margin-top: 40px; color: #7f8c8d; font-size: 12px; border-top: 1px solid #ddd; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>SILO Usage Report</h1>
          <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
        </div>
        
        <div class="section">
          <h2>Summary Metrics</h2>
          <div class="metric-grid">
            ${Object.entries(reportData.summary).map(([key, value]) => `
              <div class="metric-card">
                <div class="metric-value">${value}</div>
                <div class="metric-label">${key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</div>
              </div>
            `).join('')}
          </div>
        </div>
        
        <div class="section">
          <h2>Users by Role</h2>
          <table>
            <thead>
              <tr><th>Role</th><th>Count</th><th>Percentage</th></tr>
            </thead>
            <tbody>
              ${Object.entries(reportData.breakdown.usersByRole).map(([role, count]) => {
      const percentage = ((count / reportData.summary.totalUsers) * 100).toFixed(1);
      return `<tr><td>${role}</td><td>${count}</td><td>${percentage}%</td></tr>`;
    }).join('')}
            </tbody>
          </table>
        </div>
        
        ${Object.keys(reportData.breakdown.ticketsByStatus || {}).length > 0 ? `
        <div class="section">
          <h2>Tickets by Status</h2>
          <table>
            <thead>
              <tr><th>Status</th><th>Count</th><th>Percentage</th></tr>
            </thead>
            <tbody>
              ${Object.entries(reportData.breakdown.ticketsByStatus || {}).map(([status, count]) => {
      const percentage = ((count / reportData.summary.totalTickets) * 100).toFixed(1);
      return `<tr><td>${status}</td><td>${count}</td><td>${percentage}%</td></tr>`;
    }).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}
        
        <div class="section">
          <h2>Organizations</h2>
          <table>
            <thead>
              <tr><th>Organization</th><th>Users</th><th>Tickets</th><th>Categories</th></tr>
            </thead>
            <tbody>
              ${reportData.organizations.map(org => `
                <tr>
                  <td>${org.name}</td>
                  <td>${org.userCount}</td>
                  <td>${org.ticketCount}</td>
                  <td>${org.categoryCount}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        
        <div class="footer">
          <p>Generated by SILO - Legal AI Assistant Platform</p>
        </div>
      </body>
      </html>
    `;

    // ✅ Generate PDF using puppeteer
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setContent(htmlContent);

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' }
    });

    await browser.close();

    // ✅ Send PDF as download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(pdfBuffer);

  } catch (err) {
    console.error('PDF generation error:', err);
    res.status(500).json({ error: 'PDF generation failed' });
  }
};

// const downloadExcelReport = async (res, reportData) => {
//   try {
//     // Using exceljs (install: npm install exceljs)
//     const ExcelJS = await import('exceljs');

//     const fileName = `silo-usage-report-${new Date().toISOString().split('T')[0]}.xlsx`;

//     // ✅ Create workbook and worksheets
//     const workbook = new ExcelJS.Workbook();

//     // Metadata
//     workbook.creator = 'SILO Platform';
//     workbook.created = new Date();

//     // ✅ Summary Sheet
//     const summarySheet = workbook.addWorksheet('Summary', {
//       headerFooter: { firstHeader: 'SILO Usage Report - Summary' }
//     });

//     summarySheet.columns = [
//       { header: 'Metric', key: 'metric', width: 30 },
//       { header: 'Value', key: 'value', width: 15 }
//     ];

//     // Add summary data
//     Object.entries(reportData.summary).forEach(([key, value]) => {
//       summarySheet.addRow({
//         metric: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
//         value: value
//       });
//     });

//     // Style summary sheet header
//     summarySheet.getRow(1).font = { bold: true, size: 12 };
//     summarySheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3498DB' } };
//     summarySheet.getRow(1).font.color = { argb: 'FFFFFFFF' };

//     // ✅ Users by Role Sheet
//     const rolesSheet = workbook.addWorksheet('Users by Role');

//     rolesSheet.columns = [
//       { header: 'Role', key: 'role', width: 20 },
//       { header: 'Count', key: 'count', width: 15 },
//       { header: 'Percentage', key: 'percentage', width: 15 }
//     ];

//     Object.entries(reportData.breakdown.usersByRole).forEach(([role, count]) => {
//       const percentage = ((count / reportData.summary.totalUsers) * 100).toFixed(1) + '%';
//       rolesSheet.addRow({ role, count, percentage });
//     });

//     // Style roles sheet header
//     rolesSheet.getRow(1).font = { bold: true, size: 12 };
//     rolesSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF27AE60' } };
//     rolesSheet.getRow(1).font.color = { argb: 'FFFFFFFF' };

//     // ✅ Tickets by Status Sheet (if data exists)
//     if (Object.keys(reportData.breakdown.ticketsByStatus || {}).length > 0) {
//       const ticketsSheet = workbook.addWorksheet('Tickets by Status');

//       ticketsSheet.columns = [
//         { header: 'Status', key: 'status', width: 20 },
//         { header: 'Count', key: 'count', width: 15 },
//         { header: 'Percentage', key: 'percentage', width: 15 }
//       ];

//       Object.entries(reportData.breakdown.ticketsByStatus || {}).forEach(([status, count]) => {
//         const percentage = ((count / reportData.summary.totalTickets) * 100).toFixed(1) + '%';
//         ticketsSheet.addRow({ status, count, percentage });
//       });

//       // Style tickets sheet header
//       ticketsSheet.getRow(1).font = { bold: true, size: 12 };
//       ticketsSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE74C3C' } };
//       ticketsSheet.getRow(1).font.color = { argb: 'FFFFFFFF' };
//     }

//     // ✅ Organizations Sheet
//     const orgsSheet = workbook.addWorksheet('Organizations');

//     orgsSheet.columns = [
//       { header: 'Organization ID', key: 'id', width: 25 },
//       { header: 'Name', key: 'name', width: 25 },
//       { header: 'Users', key: 'userCount', width: 15 },
//       { header: 'Tickets', key: 'ticketCount', width: 15 },
//       { header: 'Categories', key: 'categoryCount', width: 15 }
//     ];

//     reportData.organizations.forEach(org => {
//       orgsSheet.addRow({
//         id: org.id,
//         name: org.name,
//         userCount: org.userCount,
//         ticketCount: org.ticketCount,
//         categoryCount: org.categoryCount
//       });
//     });

//     // Style organizations sheet header
//     orgsSheet.getRow(1).font = { bold: true, size: 12 };
//     orgsSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF9B59B6' } };
//     orgsSheet.getRow(1).font.color = { argb: 'FFFFFFFF' };

//     // ✅ Generate Excel buffer
//     const excelBuffer = await workbook.xlsx.writeBuffer();

//     // ✅ Send Excel as download
//     res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
//     res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
//     res.send(excelBuffer);

//   } catch (err) {
//     console.error('Excel generation error:', err);
//     res.status(500).json({ error: 'Excel generation failed' });
//   }
// };

const downloadExcelReport = async (res, reportData) => {
  try {
    // ✅ Correct way to import ExcelJS with dynamic import
    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.default.Workbook(); // Use .default for ES6 modules

    const fileName = `silo-usage-report-${new Date().toISOString().split('T')[0]}.xlsx`;

    // Metadata
    workbook.creator = 'SILO Platform';
    workbook.created = new Date();

    // ✅ Summary Sheet
    const summarySheet = workbook.addWorksheet('Summary', {
      headerFooter: { firstHeader: 'SILO Usage Report - Summary' }
    });

    summarySheet.columns = [
      { header: 'Metric', key: 'metric', width: 30 },
      { header: 'Value', key: 'value', width: 15 }
    ];

    // Add summary data
    Object.entries(reportData.summary).forEach(([key, value]) => {
      summarySheet.addRow({
        metric: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
        value: value
      });
    });

    // Style summary sheet header
    summarySheet.getRow(1).font = { bold: true, size: 12 };
    summarySheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF3498DB' }
    };
    summarySheet.getRow(1).font.color = { argb: 'FFFFFFFF' };

    // ✅ Users by Role Sheet
    const rolesSheet = workbook.addWorksheet('Users by Role');

    rolesSheet.columns = [
      { header: 'Role', key: 'role', width: 20 },
      { header: 'Count', key: 'count', width: 15 },
      { header: 'Percentage', key: 'percentage', width: 15 }
    ];

    Object.entries(reportData.breakdown.usersByRole).forEach(([role, count]) => {
      const percentage = ((count / reportData.summary.totalUsers) * 100).toFixed(1) + '%';
      rolesSheet.addRow({ role, count, percentage });
    });

    // Style roles sheet header
    rolesSheet.getRow(1).font = { bold: true, size: 12 };
    rolesSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF27AE60' }
    };
    rolesSheet.getRow(1).font.color = { argb: 'FFFFFFFF' };

    // ✅ Tickets by Status Sheet (if data exists)
    if (Object.keys(reportData.breakdown.ticketsByStatus || {}).length > 0) {
      const ticketsSheet = workbook.addWorksheet('Tickets by Status');

      ticketsSheet.columns = [
        { header: 'Status', key: 'status', width: 20 },
        { header: 'Count', key: 'count', width: 15 },
        { header: 'Percentage', key: 'percentage', width: 15 }
      ];

      Object.entries(reportData.breakdown.ticketsByStatus || {}).forEach(([status, count]) => {
        const percentage = ((count / reportData.summary.totalTickets) * 100).toFixed(1) + '%';
        ticketsSheet.addRow({ status, count, percentage });
      });

      // Style tickets sheet header
      ticketsSheet.getRow(1).font = { bold: true, size: 12 };
      ticketsSheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE74C3C' }
      };
      ticketsSheet.getRow(1).font.color = { argb: 'FFFFFFFF' };
    }

    // ✅ Organizations Sheet
    const orgsSheet = workbook.addWorksheet('Organizations');

    orgsSheet.columns = [
      { header: 'Organization ID', key: 'id', width: 25 },
      { header: 'Name', key: 'name', width: 25 },
      { header: 'Users', key: 'userCount', width: 15 },
      { header: 'Tickets', key: 'ticketCount', width: 15 },
      { header: 'Categories', key: 'categoryCount', width: 15 },
      { header: 'Forms', key: 'formCount', width: 15 }
    ];

    reportData.organizations.forEach(org => {
      orgsSheet.addRow({
        id: org.id,
        name: org.name,
        userCount: org.userCount,
        ticketCount: org.ticketCount,
        categoryCount: org.categoryCount,
        formCount: org.formCount || 0
      });
    });

    // Style organizations sheet header
    orgsSheet.getRow(1).font = { bold: true, size: 12 };
    orgsSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF9B59B6' }
    };
    orgsSheet.getRow(1).font.color = { argb: 'FFFFFFFF' };

    // ✅ Generate Excel buffer
    const excelBuffer = await workbook.xlsx.writeBuffer();

    // ✅ Send Excel as download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(excelBuffer);

  } catch (err) {
    console.error('Excel generation error:', err);
    res.status(500).json({ error: 'Excel generation failed' });
  }
};


export { createTicketMessage, createComment, getTicketMessages, getTicketComments, getTicketDetails, getAllTickets, getTicketsForReview, getTicketStatus, generateUsageReport };