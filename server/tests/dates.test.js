const test = require('node:test');
const assert = require('node:assert/strict');

process.env.TZ = 'Asia/Colombo';
const {
  toLocalDateString, isValidDateString, addDays, startOfWeek, localMidnight, monthRange,
} = require('../utils/dates');

test('local date strings follow the app timezone, not UTC', () => {
  // 2026-09-30 20:00 UTC is already 1 October in Sri Lanka (UTC+5:30)
  assert.equal(toLocalDateString(new Date('2026-09-30T20:00:00Z')), '2026-10-01');
  assert.equal(toLocalDateString(new Date('2026-09-30T18:00:00Z')), '2026-09-30');
});

test('date strings are validated as real calendar dates', () => {
  assert.equal(isValidDateString('2026-10-01'), true);
  assert.equal(isValidDateString('2028-02-29'), true);
  assert.equal(isValidDateString('2026-02-29'), false);
  assert.equal(isValidDateString('2026-13-01'), false);
  assert.equal(isValidDateString('2026-10-01T00:00:00Z'), false);
  assert.equal(isValidDateString(20261001), false);
});

test('day arithmetic crosses month, year and leap days', () => {
  assert.equal(addDays('2026-12-28', 7), '2027-01-04');
  assert.equal(addDays('2028-02-26', 7), '2028-03-04');
  assert.equal(addDays('2026-10-01', -1), '2026-09-30');
});

test('weeks start on Monday', () => {
  assert.equal(startOfWeek('2026-10-01'), '2026-09-28'); // Thursday
  assert.equal(startOfWeek('2026-09-28'), '2026-09-28'); // Monday
  assert.equal(startOfWeek('2026-10-04'), '2026-09-28'); // Sunday
});

test('month range gives local day strings and local-midnight instants', () => {
  const r = monthRange(new Date('2026-02-10T12:00:00+05:30'));
  assert.equal(r.firstDay, '2026-02-01');
  assert.equal(r.lastDay, '2026-02-28');
  assert.equal(r.start.toISOString(), '2026-01-31T18:30:00.000Z');
  assert.equal(r.end.toISOString(), '2026-02-28T18:30:00.000Z');
  assert.equal(localMidnight('2026-10-01').toISOString(), '2026-09-30T18:30:00.000Z');
});
