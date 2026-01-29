import { createClient } from "@supabase/supabase-js";
import { sendChatMail } from "../lib/emails/ticketChat.js";

const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

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
        organization_id
      `)
      .eq("id", ticketId)
      .maybeSingle();

    if (ticketError) {
      return res.status(500).json({ error: "Failed to fetch ticket" });
    }

    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    let senderType = null;
    let senderId = null;

    // External user (ticket raiser)
    if (!req.user) {
      if (req.body.email !== ticket.email) {
        return res.status(403).json({
          error: "Unauthorized external sender"
        });
      }

      senderType = "EXTERNAL";
      senderId = ticket.email;
    }

    // Logged-in user
    if (req.user) {
      senderId = req.user.id;

      // Admin
      if (req.user.role === "admin" || req.user.role === "owner" || req.user.role === "legal" || req.user.role === "member") {
        senderType = req.user.role.toUpperCase();
      }

      // // Legal owner
      // else if (req.user.id === ticket.legalOwnerId) {
      //   senderType = "LEGAL";
      // }

      // Ticket creator (internal)
      // else if (req.body.email === ticket.email) {
      //   senderType = "EXTERNAL";
      // }

      else {
        return res.status(403).json({
          error: "You are not allowed to message on this ticket"
        });
      }
    }

    // 3️⃣ Insert message
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
      console.log(insertError)
      return res.status(500).json({
        error: "Failed to create message",
        details: insertError.message
      });
    }

    // try {if(senderType === "EXTERNAL")
    //   await sendChatMail({ to: ticket.email, ticketId: ticket.id });
    // } catch (error) {
      
    // }

    return res.status(201).json({
      message: "Message sent successfully",
      data: newMessage
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

    // Fetch ticket (to understand context)
    const { data: ticket, error: ticketError } = await supabaseAdmin
      .from("Ticket")
      .select("id, email, legalOwnerId, organization_id")
      .eq("id", ticketId)
      .maybeSingle();

    if (ticketError || !ticket) {
      return res.status(404).json({
        error: "Ticket not found"
      });
    }

    // Determine viewer type
    // const isExternalViewer = !req.user;

    // Fetch messages
    const { data: messages, error } = await supabaseAdmin
      .from("TicketMessage")
      .select(`
        id,
        message,
        attachments,
        senderType,
        created_at
      `)
      .eq("ticketId", ticketId)
      .order("created_at", { ascending: true });

    if (error) {
      return res.status(500).json({
        error: "Failed to fetch messages",
        details: error.message
      });
    }

    // Compute alignment per viewer
    const formattedMessages = messages.map(msg => {
      // let alignment;

      // if (isExternalViewer) {
      //   // Ticket raiser view
      //   alignment = msg.senderType === "EXTERNAL"
      //     ? "RIGHT"
      //     : "LEFT";
      // } else {
      //   // Admin / Legal view
      //   alignment = msg.senderType === "EXTERNAL"
      //     ? "LEFT"
      //     : "RIGHT";
      // }

      return {
        id: msg.id,
        message: msg.message,
        attachments: msg.attachments,
        senderType: msg.senderType,
        // alignment,
        createdAt: msg.created_at
      };
    });

    return res.status(200).json({
      ticketId,
      // viewerType: isExternalViewer ? "EXTERNAL" : "INTERNAL",
      messages: formattedMessages
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
    const { data: tickets, error } = await supabaseAdmin
      .from("Ticket")
      .select(`
        id,
        workflowStatus,
        priority,
        assignedTeamId,
        legalOwnerId,
        payload,
        created_at
      `)
      .eq("id", ticketId)

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



export { createTicketMessage, getTicketMessages, getTicketDetails }