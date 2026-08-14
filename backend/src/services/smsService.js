/**
 * SMS Service Module
 * Primary Provider: Brevo (Sendinblue) Transactional SMS API v3
 * Secondary Provider: Twilio SMS API
 */

const BREVO_API_URL = 'https://api.brevo.com/v3';

/**
 * Format mobile number to E.164 standard (e.g., +919876543210)
 */
const formatMobileNumber = (mobileStr) => {
  if (!mobileStr || typeof mobileStr !== 'string') return null;
  let cleaned = mobileStr.replace(/[^\d+]/g, '').trim();

  // If 10-digit number without country code, default to India (+91)
  if (!cleaned.startsWith('+') && cleaned.length === 10) {
    cleaned = `+91${cleaned}`;
  } else if (!cleaned.startsWith('+') && cleaned.length > 10) {
    cleaned = `+${cleaned}`;
  }

  return cleaned;
};

/**
 * Send Transactional SMS
 * @param {Object} options
 * @param {string} options.to - Recipient phone number (e.g., "+919876543210" or "9876543210")
 * @param {string} options.message - Text message (max 160 chars per SMS segment)
 * @param {string} [options.sender] - Alphanumeric Sender ID (max 11 chars e.g. "KODBRAND")
 * @param {string} [options.tag] - Tracking tag
 */
export const sendSms = async ({ to, message, sender = null, tag = 'crm_sms' }) => {
  const recipient = formatMobileNumber(to);

  if (!recipient) {
    return { success: false, message: 'Invalid or missing recipient mobile number.' };
  }
  if (!message || typeof message !== 'string') {
    return { success: false, message: 'SMS message text is required.' };
  }

  const senderId = (sender || process.env.BREVO_SMS_SENDER || process.env.SMS_SENDER_ID || 'KODBRAND').substring(0, 11);

  // 1. Primary: Try Brevo Transactional SMS API
  const brevoApiKey = process.env.BREVO_API_KEY || process.env.SENDINBLUE_API_KEY;
  if (brevoApiKey && !brevoApiKey.includes('your_brevo_api_key') && brevoApiKey.trim() !== '') {
    try {
      const payload = {
        sender: senderId,
        recipient,
        content: message,
        type: 'transactional',
        tag
      };

      const res = await fetch(`${BREVO_API_URL}/transactionalSMS/send`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'api-key': brevoApiKey.trim()
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok && (data.reference || data.messageId)) {
        console.log(`[smsService Brevo] 📱 SMS sent to ${recipient} | Ref: ${data.reference || data.messageId}`);
        return { success: true, reference: data.reference || data.messageId, provider: 'brevo_sms' };
      } else {
        console.error(`[smsService Brevo Error] Status ${res.status}:`, data);
      }
    } catch (e) {
      console.error('[smsService Brevo Exception]:', e.message);
    }
  }

  // 2. Secondary: Try Twilio SMS API if configured
  const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioFromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (twilioAccountSid && twilioAuthToken && twilioFromNumber) {
    try {
      const authHeader = Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString('base64');
      const twilioBody = new URLSearchParams({
        To: recipient,
        From: twilioFromNumber,
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
        console.log(`[smsService Twilio] 📱 SMS sent to ${recipient} | SID: ${data.sid}`);
        return { success: true, messageId: data.sid, provider: 'twilio_sms' };
      }
    } catch (e) {
      console.error('[smsService Twilio Exception]:', e.message);
    }
  }

  // 3. Fallback: Log Simulated SMS
  console.log(`\n================== 📱 SIMULATED SMS DELIVERY 💾 ==================`);
  console.log(`TO:      ${recipient}`);
  console.log(`SENDER:  ${senderId}`);
  console.log(`MESSAGE: ${message}`);
  console.log(`=================================================================\n`);
  return { success: true, simulated: true, provider: 'simulated' };
};

/**
 * Send OTP Verification SMS
 * @param {string} to - Recipient phone number
 * @param {string|number} otpCode - One-Time Password
 */
export const sendOtpSms = async (to, otpCode) => {
  const message = `Your KOD.BRAND verification code is: ${otpCode}. Valid for 10 minutes. Do not share this code with anyone.`;
  return sendSms({ to, message, tag: 'otp_verification' });
};

/**
 * Send Alert SMS
 * @param {string} to - Recipient phone number
 * @param {string} alertTitle - Alert title
 * @param {string} details - Details
 */
export const sendAlertSms = async (to, alertTitle, details) => {
  const message = `⚠️ KOD.BRAND ALERT: ${alertTitle}. ${details}`;
  return sendSms({ to, message, tag: 'urgent_alert' });
};

const smsService = {
  sendSms,
  sendOtpSms,
  sendAlertSms
};

export default smsService;
