
/**
 * A collection of CSS style strings used for formatting email templates.
 * These are designed to be "Beautiful" and "Premium" while remaining compatible with most email clients.
 */
export const EMAIL_STYLES = {
  /** Outer wrapper for the entire email background */
  wrapper: `
    background-color: #f8fafc;
    padding: 40px 20px;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  `,
  /** CSS styles for the main email white card */
  container: `
    max-width: 600px;
    margin: 0 auto;
    background-color: #ffffff;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.02);
    border: 1px solid #f1f5f9;
  `,
  /** CSS styles for the email header section */
  header: `
    background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
    padding: 32px;
    text-align: center;
  `,
  /** CSS styles for the text within the email header */
  headerText: `
    color: #ffffff;
    font-size: 28px;
    font-weight: 800;
    margin: 0;
    letter-spacing: -0.025em;
    text-shadow: 0 2px 4px rgba(0,0,0,0.1);
  `,
  /** CSS styles for the main body content of the email */
  body: `
    padding: 40px 32px;
    color: #334155;
    line-height: 1.6;
  `,
  /** CSS styles for call-to-action buttons in the email */
  button: `
    display: inline-block;
    background-color: #4f46e5;
    color: #ffffff;
    padding: 14px 28px;
    border-radius: 10px;
    text-decoration: none;
    font-weight: 600;
    margin-top: 24px;
    text-align: center;
    box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2);
  `,
  /** CSS styles for the email footer section */
  footer: `
    padding: 32px;
    text-align: center;
    background-color: #ffffff;
    color: #94a3b8;
    font-size: 14px;
    border-top: 1px solid #f1f5f9;
  `
};

/**
 * Wraps the provided content in a standardized, premium email layout.
 * 
 * @param {string} title - The title of the email to be displayed in the body.
 * @param {string} content - The HTML content to be included in the email body.
 * @returns {string} The complete HTML email template.
 */
export function wrapEmailTemplate(title: string, content: string): string {
  const currentYear = new Date().getFullYear();

  return `
    <div style="${EMAIL_STYLES.wrapper}">
      <div style="${EMAIL_STYLES.container}">
        <div style="${EMAIL_STYLES.header}">
          <h1 style="${EMAIL_STYLES.headerText}">Travyntra</h1>
        </div>
        <div style="${EMAIL_STYLES.body}">
          <h2 style="margin-top: 0; color: #0f172a; font-size: 24px; font-weight: 700; letter-spacing: -0.025em;">${title}</h2>
          <div style="font-size: 16px; color: #475569;">
            ${content}
          </div>
        </div>
        <div style="${EMAIL_STYLES.footer}">
          <p style="margin: 0 0 12px 0;">&copy; ${currentYear} Travyntra. All rights reserved.</p>
          <p style="margin: 0; font-size: 12px;">This is an automated message from the Travyntra platform. Please do not reply to this email.</p>
        </div>
      </div>
    </div>
  `;
}

/**
 * Generates a beautiful HTML template for a general notification email.
 * 
 * @param {string} title - The headline for the notification.
 * @param {string} message - The message content of the notification.
 * @param {string} [actionUrl] - Optional URL for a call-to-action button.
 * @param {string} [actionText] - Optional label for the call-to-action button.
 * @returns {string} The complete HTML email template for the notification.
 */
export function getGeneralNotificationTemplate(title: string, message: string, actionUrl?: string, actionText?: string): string {
  const buttonHtml = actionUrl
    ? `<div style="text-align: center; margin-top: 24px;">
         <a href="${actionUrl}" target="_blank" style="${EMAIL_STYLES.button}">${actionText || "View Details"}</a>
       </div>`
    : "";

  const bodyContent = `
    <p style="margin-bottom: 24px;">${message}</p>
    ${buttonHtml}
  `;

  return wrapEmailTemplate(title, bodyContent);
}

/**
 * Generates an HTML template for a daily digest summary email.
 * 
 * @param {string} userName - The name of the user receiving the digest.
 * @param {number} pendingCount - The number of unread notifications.
 * @param {number} approvalCount - The number of requests awaiting approval.
 * @param {string} actionUrl - URL linking to the user's dashboard.
 * @returns {string} The complete HTML email template for the daily digest.
 */
export function getDigestEmailTemplate(userName: string, pendingCount: number, approvalCount: number, actionUrl: string): string {
  const hasNotifications = pendingCount > 0;
  const hasApprovals = approvalCount > 0;
  const isCaughtUp = !hasNotifications && !hasApprovals;

  let itemsHtml = "";
  if (hasNotifications) {
    itemsHtml += `
      <div style="padding: 12px 0; border-bottom: 1px solid #f1f5f9;">
        <span style="color: #4f46e5; font-weight: 700; font-size: 18px;">${pendingCount}</span>
        <span style="margin-left: 8px;">Unread notification${pendingCount === 1 ? "" : "s"}</span>
      </div>`;
  }
  if (hasApprovals) {
    itemsHtml += `
      <div style="padding: 12px 0;">
        <span style="color: #4f46e5; font-weight: 700; font-size: 18px;">${approvalCount}</span>
        <span style="margin-left: 8px;">Request${approvalCount === 1 ? "" : "s"} waiting for approval</span>
      </div>`;
  }

  const bodyContent = `
    <p>Hello ${userName},</p>
    <p>Here's a quick look at what's waiting for you on Travyntra today:</p>
    
    <div style="background-color: #f8fafc; padding: 12px 24px; border-radius: 12px; margin: 24px 0; border: 1px solid #f1f5f9;">
      ${isCaughtUp ? '<p style="text-align: center; margin: 12px 0;">You are all caught up! No pending actions.</p>' : itemsHtml}
    </div>

    <div style="text-align: center;">
      <a href="${actionUrl}" target="_blank" style="${EMAIL_STYLES.button}">Go to Dashboard</a>
    </div>
  `;

  return wrapEmailTemplate("Daily Snapshot", bodyContent);
}

/**
 * Generates an HTML template for a new staff welcome email.
 * 
 * @param {string} userName - The name of the new staff member.
 * @param {string} email - The email address of the new staff member.
 * @param {string} password - The temporary password for the account.
 * @param {string} loginUrl - URL for the login page.
 * @returns {string} The complete HTML email template for the welcome email.
 */
export function getStaffWelcomeTemplate(userName: string, email: string, password: string, loginUrl: string): string {
  const bodyContent = `
    <p>Hello ${userName},</p>
    <p>Welcome to the team! You've been added as a staff member on the Travyntra platform. Your account is ready for use.</p>
    
    <div style="background-color: #f8fafc; padding: 24px; border-radius: 12px; margin: 24px 0; border: 1px solid #f1f5f9;">
      <p style="margin: 0 0 12px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; font-weight: 700;">Login Credentials</p>
      <p style="margin: 0 0 8px 0;"><strong>Email:</strong> ${email}</p>
      <p style="margin: 0;"><strong>Temporary Password:</strong> <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">${password}</code></p>
    </div>

    <p style="font-size: 14px; color: #64748b;">For security reasons, please log in and update your password immediately after your first sign-in.</p>

    <div style="text-align: center;">
      <a href="${loginUrl}" target="_blank" style="${EMAIL_STYLES.button}">Login to Portal</a>
    </div>
  `;

  return wrapEmailTemplate("Welcome to Travyntra", bodyContent);
}

/**
 * Generates a beautiful HTML template for OTP verification email.
 * 
 * @param {string} userName - The name of the user.
 * @param {string} otpToken - The OTP token.
 * @returns {string} The complete HTML email template for OTP verification.
 */
export function getOtpEmailTemplate(userName: string, otpToken: string): string {
  const bodyContent = `
    <p>Hello ${userName},</p>
    <p>Welcome to Travyntra! To complete your registration and verify your account, please use the following one-time password:</p>
    
    <div style="background-color: #f8fafc; padding: 40px 24px; border-radius: 16px; margin: 32px 0; text-align: center; border: 2px dashed #e2e8f0;">
      <div style="font-size: 14px; text-transform: uppercase; letter-spacing: 0.2em; color: #94a3b8; margin-bottom: 20px; font-weight: 700;">Your Verification Code</div>
      <span style="font-size: 48px; font-weight: 800; letter-spacing: 12px; color: #4f46e5; font-family: 'Courier New', Courier, monospace;word-break:break-all;">${otpToken}</span>
    </div>

    <p style="color: #64748b; font-size: 14px; text-align: center;">This code will expire in <strong>10 minutes</strong>.<br/>If you did not request this code, you can safely ignore this email.</p>
  `;

  return wrapEmailTemplate("Verify Your Account", bodyContent);
}

/**
 * Generates a beautiful HTML template for password reset OTP email.
 * 
 * @param {string} userName - The name of the user.
 * @param {string} otpToken - The OTP token.
 * @returns {string} The complete HTML email template for password reset.
 */
export function getPasswordResetTemplate(userName: string, otpToken: string): string {
  const bodyContent = `
    <p>Hello ${userName},</p>
    <p>We received a request to reset your password. Please use the following one-time password to proceed with the reset:</p>
    
    <div style="background-color: #f8fafc; padding: 40px 24px; border-radius: 16px; margin: 32px 0; text-align: center; border: 2px dashed #fcd34d;">
      <div style="font-size: 14px; text-transform: uppercase; letter-spacing: 0.2em; color: #94a3b8; margin-bottom: 20px; font-weight: 700;">Password Reset Code</div>
      <span style="font-size: 48px; font-weight: 800; letter-spacing: 12px; color: #d97706; font-family: 'Courier New', Courier, monospace;word-break:break-all;">${otpToken}</span>
    </div>

    <p style="color: #64748b; font-size: 14px; text-align: center;">This code will expire in <strong>10 minutes</strong>.<br/>If you did not request a password reset, you can safely ignore this email and your password will remain unchanged.</p>
  `;

  return wrapEmailTemplate("Reset Your Password", bodyContent);
}
