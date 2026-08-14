// src/services/emailService.js
import { BrevoClient } from '@getbrevo/brevo';

const brevo = new BrevoClient({ apiKey: import.meta.env.VITE_BREVO_API_KEY });

/**
 * Send a transactional email via Brevo.
 * @param {Object} params
 * @param {string|string[]} params.to - Recipient email(s) or array of objects {email, name}
 * @param {string} params.subject - Email subject
 * @param {string} [params.htmlContent] - HTML body (optional)
 * @param {string} [params.textContent] - Plain text body (optional)
 * @returns {Promise<any>} API response
 */
export const sendEmail = async ({ to, subject, htmlContent, textContent }) => {
  const email = {
    subject,
    sender: {
      name: import.meta.env.VITE_EMAIL_SENDER_NAME || 'CRM System',
      email: import.meta.env.VITE_EMAIL_SENDER_ADDRESS || 'no-reply@example.com',
    },
    to: Array.isArray(to) ? to : [{ email: to }],
    htmlContent: htmlContent || undefined,
    textContent: textContent || undefined,
  };
  try {
  const data = await brevo.transactionalEmails.sendTransacEmail(email);
  console.log('Brevo email sent:', data);
  return data;
} catch (error) {
    console.error('Brevo email error:', error);
    throw error;
  }
};
