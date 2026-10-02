/**
 * Request validation rules: the single server-side source of truth for members, loans and payments.
 * Each schema also normalizes its input (trim, uppercase NIC, numeric strings → numbers).
 * Unknown fields are dropped, so a client can never set columns such as createdBy or paidAmount.
 */
const { z } = require('zod');
const { isValidDateString } = require('../utils/dates');

// Numeric strings from forms become numbers; anything else is left for z.number() to reject
const toNumber = (value) => (typeof value === 'string' && value.trim() !== '' ? Number(value) : value);
const trimmed  = (value) => (typeof value === 'string' ? value.trim() : value);

const id = (label) => z.preprocess(toNumber,
  z.number({ error: `A valid ${label} is required` })
    .int({ error: `A valid ${label} is required` })
    .positive({ error: `A valid ${label} is required` }));

const money = (label, max) => z.preprocess(toNumber,
  z.number({ error: `${label} must be a number` })
    .positive({ error: `${label} must be greater than 0` })
    .max(max, { error: `${label} cannot exceed Rs. ${max.toLocaleString('en-US')}` })
    .refine((v) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-6, { error: `${label} can have at most 2 decimal places` }));

const text = (label, max = 255) => z.preprocess(trimmed,
  z.string({ error: `${label} is required` })
    .min(1, { error: `${label} is required` })
    .max(max, { error: `${label} must be at most ${max} characters` }));

// ── Members ────────────────────────────────────────────────────────────────

// Sri Lankan NIC: old format 9 digits + V/X, new format 12 digits. Stored without spaces, V/X uppercase.
const nic = z.preprocess(
  (v) => (typeof v === 'string' ? v.replace(/\s+/g, '').toUpperCase() : v),
  z.string({ error: 'NIC number is required' })
    .min(1, { error: 'NIC number is required' })
    .regex(/^(\d{9}[VX]|\d{12})$/, { error: 'Enter a valid NIC (9 digits + V/X, or 12 digits)' }));

// Same shapes utils/smsService.formatPhoneNumber can turn into 94XXXXXXXXX
const isSriLankanPhone = (value) => {
  if (!/^\+?[\d\s()-]+$/.test(value)) return false;
  const digits = value.replace(/\D/g, '');
  return (digits.length === 10 && digits.startsWith('0'))
    || (digits.length === 11 && digits.startsWith('94'))
    || (digits.length === 9 && !digits.startsWith('0'));
};

const phone = z.preprocess(trimmed,
  z.string({ error: 'Contact number is required' })
    .min(1, { error: 'Contact number is required' })
    .max(50, { error: 'Contact number is too long' })
    .refine(isSriLankanPhone, { error: 'Enter a valid Sri Lankan phone number, e.g. 0771234567' }));

const age = z.preprocess(toNumber,
  z.number({ error: 'Age is required' })
    .int({ error: 'Age must be a whole number' })
    .min(18, { error: 'Age must be between 18 and 100' })
    .max(100, { error: 'Age must be between 18 and 100' }));

// '' or null means "no group". The edit form sends the populated { id, name } object back.
const groupId = z.preprocess(
  (v) => {
    if (v === '' || v === null) return null;
    if (v && typeof v === 'object') return v.id ?? v._id ?? null;
    return toNumber(v);
  },
  z.number({ error: 'Invalid group' }).int({ error: 'Invalid group' }).positive({ error: 'Invalid group' }).nullable());

const memberFields = {
  fullName:      text('Full name'),
  idNumber:      nic,
  village:       text('Village'),
  contactNumber: phone,
  age,
  groupId:       groupId.optional(),
};

const memberCreate = z.object(memberFields);
// B16: every field optional; only the fields sent are changed
const memberUpdate = z.object(memberFields).partial();

// ── Loans ──────────────────────────────────────────────────────────────────

const loanCreate = z.object({
  memberId:     id('member ID'),
  loanAmount:   money('Loan amount', 100_000_000),
  interestRate: z.preprocess(
    (v) => (v === undefined || v === null || v === '' ? 30 : toNumber(v)),
    z.number({ error: 'Interest rate must be a number' })
      .min(0, { error: 'Interest rate must be between 0% and 100%' })
      .max(100, { error: 'Interest rate must be between 0% and 100%' })),
  loanDuration: z.preprocess(toNumber,
    z.number({ error: 'Loan duration is required' })
      .int({ error: 'Loan duration must be a whole number of weeks' })
      .min(1, { error: 'Loan duration must be between 1 and 520 weeks' })
      .max(520, { error: 'Loan duration must be between 1 and 520 weeks' })),
  startDate: z.string({ error: 'A valid start date is required' })
    .refine(isValidDateString, { error: 'A valid start date is required (YYYY-MM-DD)' })
    .refine((d) => d >= '2000-01-01' && d <= '2099-12-31', { error: 'Start date is out of range' }),
});

const loanDelete = z.object({
  reason: z.preprocess(trimmed,
    z.string({ error: 'A reason for deleting the loan is required' })
      .min(3, { error: 'A reason for deleting the loan is required (at least 3 characters)' })
      .max(255, { error: 'Reason must be at most 255 characters' })),
});

const collectionsQuery = z.object({
  weeks: z.preprocess(
    (v) => (v === undefined || v === '' ? 8 : toNumber(v)),
    z.number({ error: 'weeks must be a number' })
      .int({ error: 'weeks must be a whole number' })
      .min(1, { error: 'weeks must be between 1 and 26' })
      .max(26, { error: 'weeks must be between 1 and 26' })),
});

// ── Payments ───────────────────────────────────────────────────────────────

const paymentsQuery = z.object({ loanId: id('loanId query param') });
const markPaidBody  = z.object({ amountPaid: money('Amount paid', 100_000_000) });

const idParams = z.object({ id: id('ID') });

module.exports = {
  idParams,
  memberCreate,
  memberUpdate,
  loanCreate,
  loanDelete,
  collectionsQuery,
  paymentsQuery,
  markPaidBody,
};
