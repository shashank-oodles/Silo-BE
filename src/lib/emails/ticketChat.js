import transporter from "../mailer.js";

export const sendChatMail = async ({ to, ticketId }) => {

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: "New reply on Ticket #${ticketId}",
    html: `
      <p>Dear Customer,</p>

      <p>
        Thank you for using our service. Your request has been successfully submitted.
      </p>

      <p>
        We look forward to resolving your issue.
      </p>

      <p>
        Kind regards,<br/>
        Support Team
      </p>
    `
  });
};
