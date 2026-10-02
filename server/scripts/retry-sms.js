/**
 * Retries receipt SMS that the gateway definitely did not send (status 'failed'), up to 3 attempts
 * and only for receipts from the last 2 days (services/smsReceipts.retryFailed).
 * Receipts with an unclear result ('unknown') are never retried here: the customer may already
 * have them, so a person decides with the Resend button on the loan page.
 *
 * cPanel → Cron Jobs, every 30 minutes ("*\/30 * * * *"), same "source …/activate" prefix as
 * sync-overdue.js:
 *   source /home/<user>/nodevenv/backend/<version>/bin/activate && node /home/<user>/backend/scripts/retry-sms.js
 */
const { run } = require('./bootstrap');

run(async () => {
  const { retryFailed } = require('../services/smsReceipts');
  const r = await retryFailed();
  console.log(`[${new Date().toISOString()}] sms retry: ${r.retried} retried, ${r.sent} sent, ` +
    `${r.stillFailing} still failing, ${r.stuck} interrupted marked unknown`);
});
