/**
 * smsService.js — SMS Notification utility for Text.lk API.
 *
 * Environment variables required in .env:
 *   TEXTLK_API_TOKEN - Your API token from text.lk dashboard
 *   TEXTLK_SENDER_ID  - Approved sender ID (e.g. "TextLKDemo")
 *   SMS_ENABLED       - Set to "true" to enable sending (default: true if token is set)
 */

/**
 * Normalizes Sri Lankan phone numbers to 94XXXXXXXXX format.
 * e.g., '077-123-4567' -> '94771234567'
 *       '0712345678'   -> '94712345678'
 *       '+94771234567' -> '94771234567'
 * @param {string} phone
 * @returns {string|null}
 */
const formatPhoneNumber = (phone) => {
  if (!phone) return null;
  const cleaned = phone.toString().replace(/\D/g, '');

  if (cleaned.startsWith('94') && cleaned.length === 11) {
    return cleaned;
  }
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    return `94${cleaned.slice(1)}`;
  }
  if (cleaned.length === 9) {
    return `94${cleaned}`;
  }
  return cleaned;
};

// Connection errors that happen before anything reaches the gateway: nothing was sent, safe to retry
const NOT_SENT_ERRORS = new Set(['ENOTFOUND', 'EAI_AGAIN', 'ECONNREFUSED', 'ENETUNREACH', 'EHOSTUNREACH', 'CERT_HAS_EXPIRED']);

/**
 * Sends a generic SMS message via text.lk API.
 * Uses JSON body with api_token in the payload (text.lk's required format).
 * @param {string} recipientPhone - Raw or formatted recipient number
 * @param {string} messageText    - Text message content
 * @returns {Promise<{success: boolean, outcome: string, data?: any, error?: string, recipient?: string}>}
 *   outcome (stored in SmsLogs.status, see models/SmsLog.js):
 *     'sent' accepted · 'failed' rejected or unreachable, nothing sent · 'unknown' no clear answer ·
 *     'skipped' not attempted (disabled, no token, bad number)
 */
const sendSMS = async (recipientPhone, messageText) => {
  const isEnabled = process.env.SMS_ENABLED !== 'false';
  const apiToken  = process.env.TEXTLK_API_TOKEN;
  const senderId  = process.env.TEXTLK_SENDER_ID || 'TextLKDemo';

  if (!isEnabled) {
    console.log('ℹ️  SMS sending is disabled (SMS_ENABLED=false).');
    return { success: false, outcome: 'skipped', error: 'SMS disabled' };
  }

  if (!apiToken || apiToken === 'your-api-token-here') {
    console.warn('⚠️  TEXTLK_API_TOKEN is not configured in .env. Skipping SMS.');
    return { success: false, outcome: 'skipped', error: 'API token not configured' };
  }

  const formattedRecipient = formatPhoneNumber(recipientPhone);
  if (!formattedRecipient) {
    console.warn(`⚠️  Invalid recipient phone number: ${recipientPhone}`);
    return { success: false, outcome: 'skipped', error: 'Invalid phone number' };
  }

  // TEXTLK_API_URL only exists so tests can point at a fake gateway
  const url = new URL(process.env.TEXTLK_API_URL || 'https://app.text.lk/api/http/sms/send');

  return new Promise((resolve) => {
    const transport = url.protocol === 'http:' ? require('http') : require('https');

    const payload = JSON.stringify({
      recipient:  formattedRecipient,
      sender_id:  senderId,
      message:    messageText,
      api_token:  apiToken,
    });

    const req = transport.request({
      hostname: url.hostname,
      port:     url.port || (url.protocol === 'http:' ? 80 : 443),
      path:     url.pathname,
      method:   'POST',
      timeout:  30000, // 30s timeout allows text.lk Cloudflare + telco delivery to complete
      headers: {
        'Accept':         'application/json',
        'Content-Type':   'application/json',
        'Content-Length':  Buffer.byteLength(payload),
      },
    }, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        let data;
        try { data = JSON.parse(body); } catch { data = { raw: body }; }

        if (res.statusCode >= 400 || data.status === 'error') {
          console.error(`❌ text.lk error (HTTP ${res.statusCode}):`, data);
          // A 5xx may come from a proxy after the SMS was queued, so only a 4xx or an explicit
          // error answer is a definite "not sent"
          const outcome = res.statusCode >= 500 ? 'unknown' : 'failed';
          return resolve({ success: false, outcome, error: data.message || `HTTP ${res.statusCode}`, data, recipient: formattedRecipient });
        }

        console.log(`📱 SMS sent to ${formattedRecipient} via text.lk:`, data);
        resolve({ success: true, outcome: 'sent', data, recipient: formattedRecipient });
      });
    });

    req.on('timeout', () => {
      req.destroy();
      console.warn('⚠️  text.lk request timed out after 30s.');
      resolve({ success: false, outcome: 'unknown', error: 'SMS gateway timeout', recipient: formattedRecipient });
    });

    req.on('error', (err) => { // after a timeout this fires too; the promise already settled as 'unknown'
      console.error('❌ Error sending SMS via text.lk:', err.message);
      const outcome = NOT_SENT_ERRORS.has(err.code) ? 'failed' : 'unknown';
      resolve({ success: false, outcome, error: err.message, recipient: formattedRecipient });
    });

    req.write(payload);
    req.end();
  });
};

/**
 * Sends a payment confirmation SMS to a member.
 * @param {object} params
 * @param {string} params.memberName      - Name of the customer
 * @param {string} params.contactNumber   - Customer phone number
 * @param {number} params.amountPaid      - Amount paid in this transaction
 * @param {number} params.monthNumber     - Installment week number
 * @param {number} params.remainingBalance - Remaining loan balance
 */
const sendPaymentConfirmationSMS = async ({
  memberName,
  contactNumber,
  amountPaid,
  monthNumber,
  remainingBalance,
}) => {
  if (!contactNumber) {
    console.warn('⚠️  No contact number provided for SMS notification.');
    return;
  }

  return sendSMS(contactNumber, paymentConfirmationMessage({ memberName, amountPaid, monthNumber, remainingBalance }));
};

// The receipt text, shared by sendPaymentConfirmationSMS and services/smsReceipts
const paymentConfirmationMessage = ({ memberName, amountPaid, monthNumber, remainingBalance }) => {
  const formattedAmount = Number(amountPaid).toLocaleString();
  const formattedBalance = Number(remainingBalance).toLocaleString();
  return `Dear ${memberName}, your loan payment of Rs. ${formattedAmount} (Week ${monthNumber}) has been received. Remaining balance: Rs. ${formattedBalance}. Thank you! - FGI Loan Services`;
};

module.exports = {
  formatPhoneNumber,
  sendSMS,
  sendPaymentConfirmationSMS,
  paymentConfirmationMessage,
};
