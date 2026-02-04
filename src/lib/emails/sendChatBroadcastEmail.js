import transporter from "../mailer.js";

export const sendChatBroadcastEmail = async ({
  to,
  senderName,
  ticketId,
  message,
//   ticketUrl
}) => {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: `New message on Ticket #${ticketId}`,
    html: `
      <p><strong>${senderName}</strong> sent a new message:</p>

      <blockquote style="background:#f5f5f5;padding:10px;">
        ${message}
      </blockquote>

      <small>This is an automated notification.</small>
    `
  });
};

//  <p>
//         <a href="${ticketUrl}">View Ticket</a>
//       </p>