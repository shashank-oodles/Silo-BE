import transporter from "../mailer.js";

export const sendTicketConfirmationEmail = async ({ to }) => {

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: "Your request has been received",
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
