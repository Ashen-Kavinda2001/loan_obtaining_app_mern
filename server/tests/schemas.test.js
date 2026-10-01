const test = require('node:test');
const assert = require('node:assert/strict');
const {
  memberCreate, memberUpdate, loanCreate, loanDelete, markPaidBody, collectionsQuery, idParams,
} = require('../validators/schemas');

const firstError = (schema, input) => {
  const r = schema.safeParse(input);
  return r.success ? null : r.error.issues[0].message;
};

const member = {
  fullName: '  Kamal Perera ', idNumber: '199012345678', village: 'Matara',
  contactNumber: '077-123-4567', age: '34', groupId: '',
};

test('member create normalizes input and drops unknown fields', () => {
  const r = memberCreate.parse({ ...member, idNumber: ' 901234567v ', createdBy: 99 });
  assert.equal(r.fullName, 'Kamal Perera');
  assert.equal(r.idNumber, '901234567V');
  assert.equal(r.age, 34);
  assert.equal(r.groupId, null);
  assert.equal('createdBy' in r, false);
});

test('member create rejects bad NIC, phone and age with readable messages', () => {
  assert.match(firstError(memberCreate, { ...member, idNumber: '12345' }), /valid NIC/);
  assert.match(firstError(memberCreate, { ...member, idNumber: '' }), /NIC number is required/);
  assert.match(firstError(memberCreate, { ...member, contactNumber: '12345' }), /Sri Lankan phone/);
  assert.match(firstError(memberCreate, { ...member, age: 15 }), /between 18 and 100/);
  assert.match(firstError(memberCreate, { ...member, fullName: '   ' }), /Full name is required/);
  for (const ok of ['0771234567', '+94 77 123 4567', '94771234567', '771234567']) {
    assert.equal(firstError(memberCreate, { ...member, contactNumber: ok }), null, ok);
  }
});

test('member update is partial and leaves absent fields untouched (B16)', () => {
  const r = memberUpdate.parse({ village: ' Galle ' });
  assert.deepEqual(r, { village: 'Galle' });
  assert.equal('groupId' in r, false);
});

test('member update accepts the populated group object the edit form sends back', () => {
  assert.equal(memberUpdate.parse({ groupId: { id: 4, _id: 4, name: 'A' } }).groupId, 4);
  assert.equal(memberUpdate.parse({ groupId: null }).groupId, null);
});

test('loan create defaults the rate and validates amounts and dates', () => {
  const r = loanCreate.parse({ memberId: '3', loanAmount: '50000', interestRate: '', loanDuration: '12', startDate: '2026-10-01' });
  assert.deepEqual(r, { memberId: 3, loanAmount: 50000, interestRate: 30, loanDuration: 12, startDate: '2026-10-01' });
  assert.match(firstError(loanCreate, { ...r, loanAmount: -5 }), /greater than 0/);
  assert.match(firstError(loanCreate, { ...r, loanAmount: 10.123 }), /2 decimal places/);
  assert.match(firstError(loanCreate, { ...r, loanDuration: 600 }), /1 and 520 weeks/);
  assert.match(firstError(loanCreate, { ...r, interestRate: 101 }), /0% and 100%/);
  assert.match(firstError(loanCreate, { ...r, startDate: '2026-02-30' }), /valid start date/);
  assert.match(firstError(loanCreate, { ...r, memberId: 'abc' }), /valid member ID/);
});

test('payment amount must be a positive number, not a boolean or blank', () => {
  assert.equal(markPaidBody.parse({ amountPaid: '5417.50' }).amountPaid, 5417.5);
  assert.notEqual(firstError(markPaidBody, { amountPaid: true }), null);
  assert.notEqual(firstError(markPaidBody, { amountPaid: '' }), null);
  assert.notEqual(firstError(markPaidBody, {}), null);
  assert.match(firstError(markPaidBody, { amountPaid: 0 }), /greater than 0/);
});

test('loan delete needs a reason; ids and weeks are bounded', () => {
  assert.match(firstError(loanDelete, {}), /reason/);
  assert.equal(loanDelete.parse({ reason: '  Duplicate entry ' }).reason, 'Duplicate entry');
  assert.equal(collectionsQuery.parse({}).weeks, 8);
  assert.notEqual(firstError(collectionsQuery, { weeks: '100' }), null);
  assert.equal(idParams.parse({ id: '12' }).id, 12);
  assert.notEqual(firstError(idParams, { id: '1.5' }), null);
});
