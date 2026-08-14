/**
 * WhatsApp Service Module
 * Primary Provider: Meta WhatsApp Business Cloud API (Official Meta Graph API)
 * Secondary Provider: Brevo WhatsApp / Twilio WhatsApp API
 * Fallback: Simulation Mode
 */

/**
 * Format phone number for WhatsApp (E.164 without leading '+')
 */
const formatWhatsAppNumber = (phoneStr) => {
  if (!phoneStr || typeof phoneStr !== 'string') return null;
  let cleaned = phoneStr.replace(/\D/g, '').trim();

  // If 10 digits provided, default to India (+91)
  if (cleaned.length === 10) {
    cleaned = `91${cleaned}`;
  }

  return cleaned;
};

/**
 * Send Text Message via WhatsApp
 * @param {Object} options
 * @param {string} options.to - Recipient phone number (e.g., "+919876543210" or "9876543210")
 * @param {string} options.message - Text message content
 * @param {string} [options.previewUrl=false] - Whether to render link previews
 */
export const sendWhatsAppMessage = async ({ to, message, previewUrl = false }) => {
  const recipient = formatWhatsAppNumber(to);

  if (!recipient) {
    return { success: false, message: 'Invalid or missing WhatsApp recipient phone number.' };
  }
  if (!message || typeof message !== 'string') {
    return { success: false, message: 'WhatsApp message content is required.' };
  }

  // 1. Primary: Meta WhatsApp Business Cloud API
  const metaAccessToken = process.env.WHATSAPP_TOKEN || process.env.META_WA_TOKEN;
  const metaPhoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.META_WA_PHONE_ID;

  if (metaAccessToken && metaPhoneNumberId && !metaAccessToken.includes('your_meta')) {
    try {
      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: recipient,
        type: 'text',
        text: {
          preview_url: previewUrl,
          body: message
        }
      };

      const res = await fetch(`https://graph.facebook.com/v18.0/${metaPhoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${metaAccessToken.trim()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok && data.messages && data.messages[0]?.id) {
        console.log(`[whatsappService Meta] 💬 WhatsApp message sent to ${recipient} | ID: ${data.messages[0].id}`);
        return { success: true, messageId: data.messages[0].id, provider: 'meta_cloud_api' };
      } else {
        console.error(`[whatsappService Meta Error] Status ${res.status}:`, data);
      }
    } catch (e) {
      console.error('[whatsappService Meta Exception]:', e.message);
    }
  }

  // 2. Secondary: Twilio WhatsApp API
  const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioWaFromNumber = process.env.TWILIO_WHATSAPP_NUMBER || process.env.TWILIO_PHONE_NUMBER;

  if (twilioAccountSid && twilioAuthToken && twilioWaFromNumber) {
    try {
      const fromFormatted = twilioWaFromNumber.startsWith('whatsapp:') ? twilioWaFromNumber : `whatsapp:${twilioWaFromNumber}`;
      const toFormatted = `whatsapp:+${recipient}`;

      const authHeader = Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString('base64');
      const twilioBody = new URLSearchParams({
        To: toFormatted,
        From: fromFormatted,
        Body: message
      });

      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${authHeader}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: twilioBody.toString()
      });

      const data = await res.json();
      if (res.ok && data.sid) {
        console.log(`[whatsappService Twilio] 💬 WhatsApp message sent to ${recipient} | SID: ${data.sid}`);
        return { success: true, messageId: data.sid, provider: 'twilio_whatsapp' };
      }
    } catch (e) {
      console.error('[whatsappService Twilio Exception]:', e.message);
    }
  }

  // 3. Fallback: Log Simulated WhatsApp Message
  console.log(`\n================== 💬 SIMULATED WHATSAPP DELIVERY 💾 ==================`);
  console.log(`TO:      +${recipient}`);
  console.log(`MESSAGE: ${message}`);
  console.log(`======================================================================\n`);
  return { success: true, simulated: true, provider: 'simulated' };
};

/**
 * Send Meta Pre-Approved WhatsApp Template Message
 * @param {Object} options
 * @param {string} options.to - Recipient phone number
 * @param {string} options.templateName - Approved template name (e.g., "task_assignment_alert")
 * @param {string} [options.languageCode="en_US"] - Template language code
 * @param {Array<string>} [options.parameters] - Array of dynamic parameter values
 */
export const sendWhatsAppTemplate = async ({ to, templateName, languageCode = 'en_US', parameters = [] }) => {
  const recipient = formatWhatsAppNumber(to);
  const metaAccessToken = process.env.WHATSAPP_TOKEN || process.env.META_WA_TOKEN;
  const metaPhoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.META_WA_PHONE_ID;

  if (!recipient) {
    return { success: false, message: 'Invalid recipient phone number.' };
  }

  if (metaAccessToken && metaPhoneNumberId) {
    try {
      const templateComponents = parameters.length > 0 ? [
        {
          type: 'body',
          parameters: parameters.map(p => ({ type: 'text', text: String(p) }))
        }
      ] : [];

      const payload = {
        messaging_product: 'whatsapp',
        to: recipient,
        type: 'template',
        template: {
          name: templateName,
          language: { code: languageCode },
          components: templateComponents
        }
      };

      const res = await fetch(`https://graph.facebook.com/v18.0/${metaPhoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${metaAccessToken.trim()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok && data.messages && data.messages[0]?.id) {
        console.log(`[whatsappService Meta Template] 💬 Template ${templateName} sent to ${recipient}`);
        return { success: true, messageId: data.messages[0].id, provider: 'meta_cloud_api' };
      }
      return { success: false, error: data.error?.message || 'Failed to send WhatsApp template' };
    } catch (e) {
      console.error('[whatsappService Template Exception]:', e.message);
      return { success: false, error: e.message };
    }
  }

  console.log(`\n================== 💬 SIMULATED WHATSAPP TEMPLATE 💾 ==================`);
  console.log(`TO:       +${recipient}`);
  console.log(`TEMPLATE: ${templateName} (${languageCode})`);
  console.log(`PARAMS:   ${JSON.stringify(parameters)}`);
  console.log(`======================================================================\n`);
  return { success: true, simulated: true, provider: 'simulated' };
};

const whatsappService = {
  sendWhatsAppMessage,
  sendWhatsAppTemplate
};

export default whatsappService;
