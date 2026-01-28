import prisma from "../lib/prisma.js";
import { createClient } from "@supabase/supabase-js";
import { sendTicketConfirmationEmail } from "../lib/emails/ticketConfirmation.js";

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

    // 1️⃣ Fetch ticket
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
      else if (req.user.email === ticket.email) {
        senderType = "EXTERNAL";
      }

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

    return res.status(201).json({
      message: "Message sent successfully",
      data: newMessage
    });

  } catch (err) {
    next(err);
  }
};

export { createTicketMessage}