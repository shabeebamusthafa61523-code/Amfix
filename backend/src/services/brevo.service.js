/**
 * Brevo (formerly Sendinblue) Service
 * Handles Transactional Emails, Template Emails, and Transactional SMS via Brevo REST API v3
 */

const BREVO_API_URL = 'https://api.brevo.com/v3';

/**
 * Get configured Brevo API Key
 */
const getBrevoApiKey = () => {
  const key = process.env.BREVO_API_KEY || process.env.SENDINBLUE_API_KEY;
  if (!key || key.includes('your_brevo_api_key') || key.trim() === '') {
    return null;
  }
  return key.trim();
};

/**
 * Send Transactional Email via Brevo API v3
 * @param {Object} options
 * @param {string|Array<string>} options.to - Recipient email or array of emails
 * @param {string} options.subject - Email subject line
 * @param {string} options.htmlContent - HTML body
 * @param {string} [options.textContent] - Plain text fallback
 * @param {string} [options.senderName] - Custom sender name
 * @param {string} [options.senderEmail] - Custom sender email
 * @param {Array<{email: string, name?: string}>} [options.cc] - Optional CC recipients
 * @param {Object} [options.params] - Template / dynamic params
 */
export const sendBrevoEmail = async ({
  to,
  subject,
  htmlContent,
  textContent = '',
  senderName = null,
  senderEmail = null,
  cc = null,
  params = null
}) => {
  const apiKey = getBrevoApiKey();

  // Normalize recipient email array
  let recipients = [];
  if (typeof to === 'string') {
    recipients = [{ email: to.trim() }];
  } else if (Array.isArray(to)) {
    recipients = to.map(email => (typeof email === 'string' ? { email: email.trim() } : email));
  }

  if (recipients.length === 0) {
    return { success: false, message: 'No valid recipient emails provided.' };
  }

  const defaultSenderEmail = senderEmail || process.env.BREVO_SENDER_EMAIL || process.env.SMTP_FROM_EMAIL || 'no-reply@kodbrand.com';
  const defaultSenderName = senderName || process.env.BREVO_SENDER_NAME || 'KOD.BRAND CRM';

  // If no Brevo API key is provided, log warning & return null to let caller fallback
  if (!apiKey) {
    console.warn('[Brevo Service] ⚠️ BREVO_API_KEY is not set in environment. Skipping Brevo API call.');
    return { success: false, fallbackRequired: true, message: 'BREVO_API_KEY missing' };
  }

  try {
    const payload = {
      sender: {
        name: defaultSenderName,
        email: defaultSenderEmail
      },
      to: recipients,
      subject: subject || 'KOD.BRAND CRM Notification',
      htmlContent: htmlContent || textContent || '<p>No content</p>'
    };

    if (textContent) payload.textContent = textContent;
    if (Array.isArray(cc) && cc.length > 0) payload.cc = cc;
    if (params && typeof params === 'object') payload.params = params;

    const response = await fetch(`${BREVO_API_URL}/smtp/email`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': apiKey
      },
      body: JSON.stringify(payload)
    });

    const responseData = await response.json();

    if (response.ok && responseData.messageId) {
      console.log(`[Brevo Email] 🚀 Email sent successfully to ${recipients.map(r => r.email).join(', ')} | Message ID: ${responseData.messageId}`);
      return { success: true, messageId: responseData.messageId, provider: 'brevo' };
    } else {
      console.error(`[Brevo Email Error] API returned status ${response.status}:`, responseData);
      return { success: false, error: responseData.message || 'Failed to send Brevo email', details: responseData };
    }
  } catch (error) {
    console.error('[Brevo Email Exception]:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Send Transactional Email using a pre-designed Brevo Template ID
 * @param {Object} options
 * @param {string|Array<string>} options.to - Recipient email(s)
 * @param {number} options.templateId - Brevo Template ID
 * @param {Object} [options.params] - Dynamic key-value pairs matching Brevo template tags (e.g. {{params.userName}})
 */
export const sendBrevoTemplateEmail = async ({ to, templateId, params = {} }) => {
  const apiKey = getBrevoApiKey();
  if (!apiKey) {
    return { success: false, fallbackRequired: true, message: 'BREVO_API_KEY missing' };
  }

  let recipients = [];
  if (typeof to === 'string') {
    recipients = [{ email: to.trim() }];
  } else if (Array.isArray(to)) {
    recipients = to.map(email => (typeof email === 'string' ? { email: email.trim() } : email));
  }

  try {
    const payload = {
      to: recipients,
      templateId: parseInt(templateId, 10),
      params
    };

    const response = await fetch(`${BREVO_API_URL}/smtp/email`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': apiKey
      },
      body: JSON.stringify(payload)
    });

    const responseData = await response.json();

    if (response.ok) {
      console.log(`[Brevo Template Email] 🚀 Template ${templateId} sent to ${recipients.map(r => r.email).join(', ')}`);
      return { success: true, messageId: responseData.messageId, provider: 'brevo' };
    } else {
      console.error(`[Brevo Template Error] API returned status ${response.status}:`, responseData);
      return { success: false, error: responseData.message || 'Failed to send template email' };
    }
  } catch (error) {
    console.error('[Brevo Template Email Exception]:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Send Transactional SMS via Brevo SMS API v3
 * @param {Object} options
 * @param {string} options.recipientMobile - Mobile number formatted with country code (e.g., "+919876543210" or "919876543210")
 * @param {string} options.message - SMS message text (max 160 chars per SMS segment)
 * @param {string} [options.sender] - Sender ID (max 11 alphanumeric chars e.g. "KODBRAND")
 * @param {string} [options.tag] - Tag for tracking
 */
export const sendBrevoSms = async ({ recipientMobile, message, sender = null, tag = 'crm_notification' }) => {
  const apiKey = getBrevoApiKey();

  if (!recipientMobile || typeof recipientMobile !== 'string') {
    return { success: false, message: 'Invalid recipient mobile number' };
  }

  // Ensure recipient mobile format starts with digits/country code (strip extra spaces or dashes)
  let cleanMobile = recipientMobile.replace(/[^\d+]/g, '').trim();
  if (!cleanMobile.startsWith('+') && cleanMobile.length === 10) {
    // Default to India +91 if 10 digits provided
    cleanMobile = `+91${cleanMobile}`;
  }

  const senderName = sender || process.env.BREVO_SMS_SENDER || 'KODBRAND';

  if (!apiKey) {
    console.log(`\n================== 📱 SIMULATED SMS DELIVERY 💾 ==================`);
    console.log(`TO:      ${cleanMobile}`);
    console.log(`SENDER:  ${senderName}`);
    console.log(`MESSAGE: ${message}`);
    console.log(`=================================================================\n`);
    return { success: true, simulated: true };
  }

  try {
    const payload = {
      sender: senderName.substring(0, 11),
      recipient: cleanMobile,
      content: message,
      type: 'transactional',
      tag
    };

    const response = await fetch(`${BREVO_API_URL}/transactionalSMS/send`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': apiKey
      },
      body: JSON.stringify(payload)
    });

    const responseData = await response.json();

    if (response.ok && (responseData.reference || responseData.messageId)) {
      console.log(`[Brevo SMS] 📱 SMS sent successfully to ${cleanMobile} | Reference: ${responseData.reference || responseData.messageId}`);
      return { success: true, reference: responseData.reference || responseData.messageId, provider: 'brevo' };
    } else {
      console.error(`[Brevo SMS Error] API returned status ${response.status}:`, responseData);
      return { success: false, error: responseData.message || 'Failed to send Brevo SMS', details: responseData };
    }
  } catch (error) {
    console.error('[Brevo SMS Exception]:', error.message);
    return { success: false, error: error.message };
  }
};

const brevoService = {
  sendBrevoEmail,
  sendBrevoTemplateEmail,
  sendBrevoSms
};

export default brevoService;
