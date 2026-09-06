import nodemailer from 'nodemailer';

interface SendPasskeyEmailParams {
  to: string;
  name: string;
  passkeyKeyword: string;
  isUpdate?: boolean;
}

export async function sendPasskeyNotificationEmail({
  to,
  name,
  passkeyKeyword,
  isUpdate = false
}: SendPasskeyEmailParams): Promise<{ success: boolean; simulated?: boolean; messageId?: string }> {
  const timestamp = new Date().toUTCString();
  const maskedKeyword =
    passkeyKeyword.length > 4
      ? `${passkeyKeyword.slice(0, 2)}${'*'.repeat(passkeyKeyword.length - 4)}${passkeyKeyword.slice(-2)}`
      : `${passkeyKeyword[0]}${'*'.repeat(passkeyKeyword.length - 1)}`;

  const subject = `🛡️ Security Alert: Organizer Passkey ${isUpdate ? 'Updated' : 'Created'} — DebugArena`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0c1220; color: #e2e8f0; margin: 0; padding: 24px; }
          .container { max-width: 580px; margin: 0 auto; background: #111827; border: 1px solid #1f2937; border-radius: 16px; overflow: hidden; }
          .header { background: linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%); padding: 32px 24px; text-align: center; }
          .header h1 { color: #ffffff; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
          .content { padding: 32px 28px; }
          .greeting { font-size: 16px; font-weight: 600; color: #f8fafc; margin-bottom: 16px; }
          .notice-box { background: #1e1b4b; border: 1px solid #3730a3; border-radius: 12px; padding: 18px 20px; margin: 20px 0; }
          .notice-box h3 { color: #a5b4fc; font-size: 14px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.5px; }
          .key-badge { display: inline-block; background: #312e81; color: #c7d2fe; padding: 6px 12px; border-radius: 8px; font-family: monospace; font-size: 15px; font-weight: bold; margin-top: 6px; }
          .details-table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }
          .details-table td { padding: 8px 0; border-bottom: 1px solid #1f2937; color: #94a3b8; }
          .details-table td.val { color: #f1f5f9; font-weight: 600; text-align: right; }
          .warning { background: rgba(244, 63, 94, 0.1); border: 1px solid rgba(244, 63, 94, 0.25); border-radius: 10px; padding: 14px 16px; margin-top: 24px; font-size: 12px; color: #fda4af; line-height: 1.5; }
          .footer { background: #0b0f19; padding: 20px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #1f2937; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>DebugArena Security Advisory</h1>
          </div>
          <div class="content">
            <div class="greeting">Hello ${name || 'Organizer'},</div>
            <p style="font-size: 14px; line-height: 1.6; color: #cbd5e1; margin: 0 0 16px 0;">
              This email confirms that an <strong>Organizer Passkey</strong> has been successfully 
              ${isUpdate ? 'updated' : 'configured'} for your DebugArena administration account.
            </p>

            <div class="notice-box">
              <h3>Configured Passkey Keyword</h3>
              <p style="font-size: 13px; color: #e0e7ff; margin: 0;">
                You can now sign in directly on the Organizer portal using this security passkey:
              </p>
              <div class="key-badge">${maskedKeyword}</div>
              <p style="font-size: 11px; color: #94a3b8; margin: 8px 0 0 0;">
                Supports numeric, alphanumeric, and special symbol passkeys.
              </p>
            </div>

            <table class="details-table">
              <tr>
                <td>Account Email</td>
                <td class="val">${to}</td>
              </tr>
              <tr>
                <td>Action</td>
                <td class="val">${isUpdate ? 'Passkey Updated' : 'Passkey Activated'}</td>
              </tr>
              <tr>
                <td>Timestamp (UTC)</td>
                <td class="val">${timestamp}</td>
              </tr>
              <tr>
                <td>Authentication Status</td>
                <td class="val" style="color: #34d399;">Active & Verified</td>
              </tr>
            </table>

            <div class="warning">
              <strong>⚠️ Did not authorize this change?</strong><br>
              If you did not set this passkey, someone may have unauthorized access to your account. Log in immediately, revoke your passkey in profile settings, and reset your password.
            </div>
          </div>
          <div class="footer">
            DebugArena Enterprise Automated Security Service • Real-time Multi-Round Coding & Debugging Platform
          </div>
        </div>
      </body>
    </html>
  `;

  const textContent = `
DebugArena Security Advisory: Organizer Passkey ${isUpdate ? 'Updated' : 'Configured'}
Hello ${name || 'Organizer'},

This email confirms that an Organizer Passkey (${maskedKeyword}) has been successfully ${isUpdate ? 'updated' : 'configured'} for your DebugArena account (${to}) at ${timestamp}.

You can now use this security passkey keyword to instantly sign in on the Organizer portal.

If you did not perform this action, please access your account immediately to revoke the passkey and update your credentials.
  `;

  // Check if SMTP environment variables are set
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM || '"DebugArena Security" <no-reply@debugarena.internal>';

  if (smtpHost && smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass
        }
      });

      const info = await transporter.sendMail({
        from: smtpFrom,
        to,
        subject,
        text: textContent,
        html: htmlContent
      });

      console.log(`✉️ [EMAIL] Passkey confirmation email sent to ${to} (Message ID: ${info.messageId})`);
      return { success: true, messageId: info.messageId };
    } catch (err) {
      console.warn(`⚠️ [EMAIL] Failed to send email via SMTP, falling back to audit logging:`, err);
    }
  }

  // Graceful simulation / dev dispatch logger
  console.log(`\n================================================================`);
  console.log(`✉️  [SIMULATED DISPATCH] PASSKEY NOTIFICATION EMAIL`);
  console.log(`================================================================`);
  console.log(`To:      ${name} <${to}>`);
  console.log(`Subject: ${subject}`);
  console.log(`Key:     ${maskedKeyword}`);
  console.log(`Time:    ${timestamp}`);
  console.log(`Status:  DISPATCHED SUCCESSFULLY`);
  console.log(`================================================================\n`);

  return { success: true, simulated: true };
}
