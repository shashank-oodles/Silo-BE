// import transporter from "../mailer.js";

// export const sendTicketConfirmationEmail = async ({ to }) => {

//   await transporter.sendMail({
//     from: process.env.EMAIL_FROM,
//     to,
//     subject: "Your request has been received",
//     html: `
//       <p>Dear Customer,</p>

//       <p>
//         Thank you for using our service. Your request has been successfully submitted.
//       </p>

//       <p>
//         We look forward to resolving your issue.
//       </p>

//       <p>
//         Kind regards,<br/>
//         Support Team
//       </p>
//     `
//   });
// };

import transporter from "../mailer.js";

export const sendTicketConfirmationEmail = async ({ to, referenceId }) => {
  const statusUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/external-request/status?referenceId=${referenceId}`;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: "Your request has been received",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">
          Request Confirmation
        </h2>

        <p>Dear Customer,</p>

        <p>
          Thank you for using our service. Your request has been successfully submitted.
        </p>

        <p>
          <strong>Reference ID:</strong> ${referenceId}
        </p>

        <p>
          You can track your request status at any time by clicking the link below:
        </p>

        <p style="text-align: center; margin: 30px 0;">
          <a href="${statusUrl}" 
             style="background-color: #3498db; 
                    color: white; 
                    padding: 12px 30px; 
                    text-decoration: none; 
                    border-radius: 5px; 
                    display: inline-block;
                    font-weight: bold;">
            Track Request Status
          </a>
        </p>

        <p style="color: #7f8c8d; font-size: 12px;">
          Or copy and paste this link into your browser:<br/>
          <a href="${statusUrl}" style="color: #3498db;">${statusUrl}</a>
        </p>

        <p>
          We look forward to resolving your issue.
        </p>

        <p>
          Kind regards,<br/>
          Support Team
        </p>
      </div>
    `
  });
};