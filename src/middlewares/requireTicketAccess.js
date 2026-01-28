import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

// middlewares/requireTicketAccess.js
export const requireTicketAccess = async (req, res, next) => {
  try {
    const { ticketId } = req.params;

    if (!ticketId) {
      return res.status(400).json({
        error: "ticketId is required"
      });
    }

    const { data: ticket, error } = await supabase
      .from("Ticket")
      .select("id, email, legalOwnerId, organization_id")
      .eq("id", ticketId)
      .maybeSingle();

    if (error || !ticket) {
      return res.status(404).json({
        error: "Ticket not found"
      });
    }

    // External user
    if (!req.user) {
      if (req.body.email !== ticket.email) {
        return res.status(403).json({
          error: "Unauthorized external user"
        });
      }
      return next();
    }

    // Logged-in user
    const { id, role, organizationId } = req.user;

    if (organizationId !== ticket.organization_id) {
      return res.status(403).json({
        error: "Cross-organization access denied"
      });
    }

    if (
      role === "admin" ||
      id === ticket.legalOwnerId ||
      req.user.email === ticket.email
    ) {
      return next();
    }

    return res.status(403).json({
      error: "You are not allowed to message on this ticket"
    });

  } catch (err) {
    next(err);
  }
};
