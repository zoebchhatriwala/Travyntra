
/**
 * A collection of CSS style strings used for formatting email templates.
 */
export const EMAIL_STYLES = {
  /** CSS styles for the main email container */
  container: `
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    max-width: 600px;
    margin: 0 auto;
    background-color: #ffffff;
    border-radius: 12px;
    overflow: hidden;
    border: 1px solid #e2e8f0;
  `,
  /** CSS styles for the email header section */
  header: `
    background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%);
    padding: 24px;
    text-align: center;
  `,
  /** CSS styles for the text within the email header */
  headerText: `
    color: #ffffff;
    font-size: 24px;
    font-weight: 700;
    margin: 0;
  `,
  /** CSS styles for the main body content of the email */
  body: `
    padding: 32px 24px;
    color: #1e293b;
    line-height: 1.6;
  `,
  /** CSS styles for call-to-action buttons in the email */
  button: `
    display: inline-block;
    background-color: #4f46e5;
    color: #ffffff;
    padding: 12px 24px;
    border-radius: 8px;
    text-decoration: none;
    font-weight: 600;
    margin-top: 16px;
  `,
  /** CSS styles for the email footer section */
  footer: `
    padding: 24px;
    text-align: center;
    background-color: #f8fafc;
    color: #64748b;
    font-size: 13px;
    border-top: 1px solid #e2e8f0;
  `
};

/**
 * Wraps the provided content in a standardized email layout with header, body, and footer.
 * 
 * @param {string} title - The title of the email to be displayed in the body.
 * @param {string} content - The HTML content to be included in the email body.
 * @returns {string} The complete HTML email template.
 */
export function wrapEmailTemplate(title: string, content: string): string {
  // Retrieve the container style
  const containerStyle = EMAIL_STYLES.container;
  // Retrieve the header style
  const headerStyle = EMAIL_STYLES.header;
  // Retrieve the header text style
  const headerTextStyle = EMAIL_STYLES.headerText;
  // Retrieve the body style
  const bodyStyle = EMAIL_STYLES.body;
  // Retrieve the footer style
  const footerStyle = EMAIL_STYLES.footer;

  // Get the current date object
  const now = new Date();
  // Get the current year for the copyright notice
  const currentYear = now.getFullYear();

  // Construct the full HTML structure
  const htmlTemplate = `
    <div style="${containerStyle}">
      <div style="${headerStyle}">
        <h1 style="${headerTextStyle}">Travyntra</h1>
      </div>
      <div style="${bodyStyle}">
        <h2 style="margin-top: 0; color: #0f172a;">${title}</h2>
        ${content}
      </div>
      <div style="${footerStyle}">
        <p>&copy; ${currentYear} Travyntra. All rights reserved.</p>
        <p>This is an automated message, please do not reply.</p>
      </div>
    </div>
  `;

  // Return the generated HTML string
  return htmlTemplate;
}

/**
 * Generates an HTML template for a general notification email.
 * 
 * @param {string} title - The headline for the notification.
 * @param {string} message - The message content of the notification.
 * @param {string} [actionUrl] - Optional URL for a call-to-action button.
 * @param {string} [actionText] - Optional label for the call-to-action button.
 * @returns {string} The complete HTML email template for the notification.
 */
export function getGeneralNotificationTemplate(title: string, message: string, actionUrl?: string, actionText?: string): string {
  // Default text for the action button
  const defaultActionText = "View Details";

  // Text to use for the button
  const buttonLabel = actionText || defaultActionText;

  // Retrieve the button style
  const buttonStyle = EMAIL_STYLES.button;

  // determine if a button should be included based on the presence of an action URL
  const hasActionUrl = !!actionUrl;

  // Initialize the button HTML variable
  let buttonHtml = "";

  // Construct the button HTML if a URL is provided
  if (hasActionUrl) {
    buttonHtml = `<a href="${actionUrl}" style="${buttonStyle}">${buttonLabel}</a>`;
  }

  // Combine message and button into the final content area
  const bodyContent = `
    <p>${message}</p>
    ${buttonHtml}
  `;

  // Wrap the body content in the master email layout
  const finalTemplate = wrapEmailTemplate(title, bodyContent);

  // Return the complete template
  return finalTemplate;
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
  // check if there are any unread notifications
  const hasNotifications = pendingCount > 0;

  // Initialize the notification suffix
  let notificationSuffix = "s";

  // Check if pluralization is needed
  if (pendingCount === 1) {
    notificationSuffix = "";
  }

  // Initialize the notification item HTML
  let notificationItem = "";

  // construct the notification item link
  if (hasNotifications) {
    notificationItem = `<li><strong>${pendingCount}</strong> unread notification${notificationSuffix}</li>`;
  }

  // Check if there are any pending approvals
  const hasApprovals = approvalCount > 0;

  // Initialize the approval suffix
  let approvalSuffix = "s";

  // Check if pluralization is needed
  if (approvalCount === 1) {
    approvalSuffix = "";
  }

  // Initialize the approval item HTML
  let approvalItem = "";

  // Construct the approval item line
  if (hasApprovals) {
    approvalItem = `<li><strong>${approvalCount}</strong> request${approvalSuffix} waiting for your approval</li>`;
  }

  // check if the user is completely caught up
  const isCaughtUp = pendingCount === 0 && approvalCount === 0;

  // Initialize the caught up message
  let caughtUpMessage = "";

  // Construct the "caught up" notice
  if (isCaughtUp) {
    caughtUpMessage = '<p>You are all caught up! No pending actions.</p>';
  }

  // Retrieve the button style
  const buttonStyle = EMAIL_STYLES.button;

  // Assemble the body content with dynamic list items
  const bodyContent = `
    <p>Hello ${userName},</p>
    <p>Here is your daily summary of activity on Travyntra:</p>
    
    <div style="background-color: #f1f5f9; padding: 16px; border-radius: 8px; margin: 16px 0;">
      <ul style="margin: 0; padding-left: 20px;">
        ${notificationItem}
        ${approvalItem}
      </ul>
    </div>

    ${caughtUpMessage}

    <a href="${actionUrl}" style="${buttonStyle}">Go to Dashboard</a>
  `;

  // Define the title for the digest email
  const templateTitle = "Daily Digest";

  // Wrap the content in the master email layout
  const resultTemplate = wrapEmailTemplate(templateTitle, bodyContent);

  // Return the complete template
  return resultTemplate;
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
  const buttonStyle = EMAIL_STYLES.button;

  const bodyContent = `
    <p>Hello ${userName},</p>
    <p>You have been added as a staff member to the agency portal on Travyntra.</p>
    <p>Here are your temporary login credentials:</p>
    
    <div style="background-color: #f1f5f9; padding: 16px; border-radius: 8px; margin: 16px 0;">
      <p style="margin: 0 0 8px 0;"><strong>Email:</strong> ${email}</p>
      <p style="margin: 0;"><strong>Password:</strong> ${password}</p>
    </div>

    <p>Please log in and change your password immediately.</p>

    <a href="${loginUrl}" style="${buttonStyle}">Login to Portal</a>
  `;

  return wrapEmailTemplate("Welcome to the Team", bodyContent);
}
