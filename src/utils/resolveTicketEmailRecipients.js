export const resolveTicketEmailRecipients = async ({
  ticket,
  senderUserId,
  senderEmail,
  supabaseAdmin
}) => {
  const emailSet = new Set();

  // Ticket raiser (external)
  if (ticket.email && ticket.email !== senderEmail) {
    emailSet.add(ticket.email);
  }

  // Legal owner
  if (ticket.legalOwnerId && ticket.legalOwnerId !== senderUserId) {
    emailSet.add(ticket.legalOwnerId);
  }

  // Reviewer (if exists)
  if (ticket.reviewerId && ticket.reviewerId !== senderUserId) {
    emailSet.add(ticket.reviewerId);
  }

  // Admins + Owners
  const { data: admins } = await supabaseAdmin
    .from("member")
    .select("user_id")
    .eq("organization_id", ticket.organization_id)
    .in("role", ["admin", "owner"]);

  admins?.forEach(m => {
    if (m.user_id !== senderUserId) {
      emailSet.add(m.user_id);
    }
  });

  // Separate raw emails vs userIds
  const userIds = [...emailSet].filter(v => !v.includes("@"));
  const directEmails = [...emailSet].filter(v => v.includes("@"));

  let resolvedEmails = [...directEmails];

  if (userIds.length > 0) {
    const { data: users } = await supabaseAdmin
      .from("user")
      .select("email")
      .in("id", userIds);

    users?.forEach(u => {
      if (u.email) resolvedEmails.push(u.email);
    });
  }

  return [...new Set(resolvedEmails)];
};
