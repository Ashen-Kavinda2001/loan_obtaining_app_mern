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

/**
 * Sends a generic SMS message via text.lk API.
 * Uses JSON body with api_token in the payload (text.lk's required format).
 * @param {string} recipientPhone - Raw or formatted recipient number
 * @param {string} messageText    - Text message content
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
const sendSMS = async (recipientPhone, messageText) => {
  const isEnabled = process.env.SMS_ENABLED !== 'false';
  const apiToken  = process.env.TEXTLK_API_TOKEN;
  const senderId  = process.env.TEXTLK_SENDER_ID || 'TextLKDemo';

  if (!isEnabled) {
    console.log('ℹ️  SMS sending is disabled (SMS_ENABLED=false).');
    return { success: false, error: 'SMS disabled' };
  }

  if (!apiToken || apiToken === 'your-api-token-here') {
    console.warn('⚠️  TEXTLK_API_TOKEN is not configured in .env. Skipping SMS.');
    return { success: false, error: 'API token not configured' };
  }

  const formattedRecipient = formatPhoneNumber(recipientPhone);
  if (!formattedRecipient) {
    console.warn(`⚠️  Invalid recipient phone number: ${recipientPhone}`);
    return { success: false, error: 'Invalid phone number' };
  }

  return new Promise((resolve) => {
    const https = require('https');

    const payload = JSON.stringify({
      recipient:  formattedRecipient,
      sender_id:  senderId,
      message:    messageText,
      api_token:  apiToken,
    });

    const req = https.request({
      hostname: 'app.text.lk',
      port:     443,
      path:     '/api/http/sms/send',
      method:   'POST',
      timeout:  3500, // 3.5s safety timeout prevents hanging
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
          return resolve({ success: false, error: data.message || `HTTP ${res.statusCode}`, data });
        }

        console.log(`📱 SMS sent to ${formattedRecipient} via text.lk:`, data);
        resolve({ success: true, data });
      });
    });

    req.on('timeout', () => {
      req.destroy();
      console.warn('⚠️  text.lk request timed out after 3.5s.');
      resolve({ success: false, error: 'SMS gateway timeout' });
    });

    req.on('error', (err) => {
      console.error('❌ Error sending SMS via text.lk:', err.message);
      resolve({ success: false, error: err.message });
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

  const formattedAmount = Number(amountPaid).toLocaleString();
  const formattedBalance = Number(remainingBalance).toLocaleString();

  const message = `Dear ${memberName}, your loan payment of Rs. ${formattedAmount} (Week ${monthNumber}) has been received. Remaining balance: Rs. ${formattedBalance}. Thank you! - FGI Loan Services`;

  return sendSMS(contactNumber, message);
};

module.exports = {
  formatPhoneNumber,
  sendSMS,
  sendPaymentConfirmationSMS,
};
