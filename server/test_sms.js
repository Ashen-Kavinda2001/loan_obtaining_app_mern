/**
 * test_sms.js — Verification script for text.lk SMS utility.
 */
require('dotenv').config();
const { formatPhoneNumber, sendPaymentConfirmationSMS } = require('./utils/smsService');

console.log('--- Testing formatPhoneNumber ---');
const testNumbers = [
  '077-123-4567',
  '0712345678',
  '+94771234567',
  '94761234567',
  '781234567',
  '077 456 7890',
];

testNumbers.forEach((num) => {
  console.log(`  "${num}" -> "${formatPhoneNumber(num)}"`);
});

console.log('\n--- Testing sendPaymentConfirmationSMS with dummy credentials ---');
(async () => {
  // Test with unconfigured token (should safely skip without throwing)
  const result = await sendPaymentConfirmationSMS({
    memberName: 'Kamal Perera',
    contactNumber: '077-123-4567',
    amountPaid: 5417,
    monthNumber: 1,
    remainingBalance: 43332,
  });

  console.log('Result with placeholder token:', result);
  console.log('\n✅ All tests executed cleanly.');
  process.exit(0);
})();
