
export const EMAIL_STYLES = {
    container: `
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    max-width: 600px;
    margin: 0 auto;
    background-color: #ffffff;
    border-radius: 12px;
    overflow: hidden;
    border: 1px solid #e2e8f0;
  `,
    header: `
    background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%);
    padding: 24px;
    text-align: center;
  `,
    headerText: `
    color: #ffffff;
    font-size: 24px;
    font-weight: 700;
    margin: 0;
  `,
    body: `
    padding: 32px 24px;
    color: #1e293b;
    line-height: 1.6;
  `,
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
    footer: `
    padding: 24px;
    text-align: center;
    background-color: #f8fafc;
    color: #64748b;
    font-size: 13px;
    border-top: 1px solid #e2e8f0;
  `
};

export function wrapEmailTemplate(title: string, content: string) {
    return `
    <div style="${EMAIL_STYLES.container}">
      <div style="${EMAIL_STYLES.header}">
        <h1 style="${EMAIL_STYLES.headerText}">Travyntra</h1>
      </div>
      <div style="${EMAIL_STYLES.body}">
        <h2 style="margin-top: 0; color: #0f172a;">${title}</h2>
        ${content}
      </div>
      <div style="${EMAIL_STYLES.footer}">
        <p>&copy; ${new Date().getFullYear()} Travyntra. All rights reserved.</p>
        <p>This is an automated message, please do not reply.</p>
      </div>
    </div>
  `;
}

export function getGeneralNotificationTemplate(title: string, message: string, actionUrl?: string, actionText?: string) {
    const buttonHtml = actionUrl
        ? `<a href="${actionUrl}" style="${EMAIL_STYLES.button}">${actionText || "View Details"}</a>`
        : "";

    const content = `
    <p>${message}</p>
    ${buttonHtml}
  `;

    return wrapEmailTemplate(title, content);
}

export function getDigestEmailTemplate(userName: string, pendingCount: number, approvalCount: number, actionUrl: string) {
    const content = `
    <p>Hello ${userName},</p>
    <p>Here is your daily summary of activity on Travyntra:</p>
    
    <div style="background-color: #f1f5f9; padding: 16px; border-radius: 8px; margin: 16px 0;">
      <ul style="margin: 0; padding-left: 20px;">
        ${pendingCount > 0 ? `<li><strong>${pendingCount}</strong> unread notification${pendingCount === 1 ? '' : 's'}</li>` : ''}
        ${approvalCount > 0 ? `<li><strong>${approvalCount}</strong> request${approvalCount === 1 ? '' : 's'} waiting for your approval</li>` : ''}
      </ul>
    </div>

    ${pendingCount === 0 && approvalCount === 0 ? '<p>You are all caught up! No pending actions.</p>' : ''}

    <a href="${actionUrl}" style="${EMAIL_STYLES.button}">Go to Dashboard</a>
  `;

    return wrapEmailTemplate("Daily Digest", content);
}
