import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function sendInviteEmail({
  to,
  inviterName,
  orgName,
  inviteToken,
}: {
  to: string;
  inviterName: string;
  orgName: string;
  inviteToken: string;
}) {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const inviteUrl = `${baseUrl}/auth/accept-invite?token=${inviteToken}`;

  await transporter.sendMail({
    from: `"Styren" <${process.env.GMAIL_USER}>`,
    to,
    subject: `You've been invited to ${orgName} on Styren`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin:0;padding:0;background-color:#fafafa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fafafa;padding:40px 0;">
          <tr>
            <td align="center">
              <table width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border:1px solid #e5e7eb;border-radius:4px;padding:40px;">
                <tr>
                  <td>
                    <div style="margin-bottom:32px;">
                      <span style="display:inline-block;width:32px;height:32px;background-color:#6366f1;border-radius:4px;text-align:center;line-height:32px;color:#ffffff;font-weight:700;font-size:14px;vertical-align:middle;">S</span>
                      <span style="font-weight:600;font-size:18px;color:#111827;vertical-align:middle;margin-left:8px;">Styren</span>
                    </div>

                    <h1 style="font-size:20px;font-weight:600;color:#111827;margin:0 0 16px;">
                      You're invited to join ${orgName}
                    </h1>

                    <p style="font-size:14px;color:#6b7280;line-height:1.6;margin:0 0 24px;">
                      ${inviterName} has invited you to collaborate on <strong style="color:#111827;">${orgName}</strong> using Styren.
                      Click the button below to set up your account and get started.
                    </p>

                    <a href="${inviteUrl}"
                       style="display:inline-block;background-color:#6366f1;color:#ffffff;font-size:14px;font-weight:500;text-decoration:none;padding:10px 24px;border-radius:4px;">
                      Accept Invitation
                    </a>

                    <p style="font-size:12px;color:#9ca3af;margin:24px 0 0;line-height:1.5;">
                      If the button doesn't work, copy and paste this link into your browser:<br>
                      <a href="${inviteUrl}" style="color:#6366f1;word-break:break-all;">${inviteUrl}</a>
                    </p>

                    <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0 16px;">

                    <p style="font-size:12px;color:#9ca3af;margin:0;">
                      This invitation was sent by ${inviterName}. If you weren't expecting this, you can ignore this email.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  });
}
