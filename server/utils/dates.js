/**
 * Local-date helpers. A "date string" is 'YYYY-MM-DD' in the app timezone (config/timezone.js).
 * Date-only maths is done on strings in UTC so no timezone or DST rule can shift the day.
 */

const pad = (n) => String(n).padStart(2, '0');

// 'YYYY-MM-DD' of an instant, in the process (app) timezone
const toLocalDateString = (date = new Date()) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const todayLocal = () => toLocalDateString(new Date());

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

// True only for a real calendar date in 'YYYY-MM-DD' form ('2026-02-30' is rejected)
const isValidDateString = (value) => {
  const m = typeof value === 'string' && DATE_RE.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
};

const addDays = (dateStr, days) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
};

// Monday of the week containing dateStr
const startOfWeek = (dateStr) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dayOfWeek = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = Sunday
  return addDays(dateStr, -((dayOfWeek + 6) % 7));
};

// The instant of local midnight at the start of dateStr (for comparing DATETIME columns)
const localMidnight = (dateStr) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
};

// The local calendar month containing `date`: day strings for DATEONLY columns,
// and [start, end) instants for DATETIME columns
const monthRange = (date = new Date()) => {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end   = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return {
    firstDay: toLocalDateString(start),
    lastDay:  addDays(toLocalDateString(end), -1),
    start,
    end,
  };
};

module.exports = {
  toLocalDateString,
  todayLocal,
  isValidDateString,
  addDays,
  startOfWeek,
  localMidnight,
  monthRange,
};
