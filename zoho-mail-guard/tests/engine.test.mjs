/**
 * Unit tests for the pure parts of the guard.
 * Run with:  node --test tests/
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { normalisePolicy, defaultPolicy, mergePolicy } from '../src/common/policy.js';
import {
  checkAccount,
  checkNetwork,
  checkSchedule,
  evaluateAccess,
  hostMatches,
  inWindow,
  ipInCidr,
  isProtectedUrl,
  splitEmail,
  zonedParts,
} from '../src/common/evaluate.js';
import { auditToCsv } from '../src/common/audit.js';
import { CODE } from '../src/common/constants.js';

const policyWith = (patch) => normalisePolicy(mergePolicy(defaultPolicy(), patch));

const ctx = (patch = {}) => ({
  url: 'https://mail.zoho.com/zm/#mail/folder/inbox',
  now: new Date('2026-09-07T12:00:00+05:30'), // a Monday, midday IST
  deviceId: 'device-a',
  incognito: false,
  profileEmail: '',
  ip: '',
  ipKnown: false,
  account: '',
  ...patch,
});

// --- host matching ---------------------------------------------------------

test('hostMatches covers exact hosts and subdomains only', () => {
  assert.equal(hostMatches('mail.zoho.com', 'mail.zoho.com'), true);
  assert.equal(hostMatches('eu.mail.zoho.com', 'mail.zoho.com'), true);
  assert.equal(hostMatches('mail.zoho.com.evil.example', 'mail.zoho.com'), false);
  assert.equal(hostMatches('notmail.zoho.com', 'mail.zoho.com'), false);
  assert.equal(hostMatches('MAIL.ZOHO.COM.', 'mail.zoho.com'), true);
});

test('only the configured hosts are protected', () => {
  const policy = policyWith({});
  assert.equal(isProtectedUrl('https://mail.zoho.in/zm/', policy), true);
  assert.equal(isProtectedUrl('https://www.zoho.com/mail/', policy), false);
  assert.equal(isProtectedUrl('javascript:alert(1)', policy), false);
  assert.equal(isProtectedUrl('not a url', policy), false);
});

// --- accounts --------------------------------------------------------------

test('splitEmail rejects malformed addresses', () => {
  assert.equal(splitEmail('nope'), null);
  assert.equal(splitEmail('@company.com'), null);
  assert.equal(splitEmail('user@'), null);
  assert.deepEqual(splitEmail('  User@Company.COM '), {
    email: 'user@company.com',
    local: 'user',
    domain: 'company.com',
  });
});

test('account rule allows the company domain and its subdomains', () => {
  const policy = policyWith({ allowedAccountDomains: ['company.com'] });
  assert.equal(checkAccount('sumit@company.com', policy).ok, true);
  assert.equal(checkAccount('sumit@mail.company.com', policy).ok, true);
  assert.equal(checkAccount('sumit@gmail.com', policy).ok, false);
  assert.equal(checkAccount('sumit@notcompany.com', policy).ok, false);
});

test('block list beats allow list, and no domains configured means no restriction', () => {
  const policy = policyWith({
    allowedAccountDomains: ['company.com'],
    allowedAccounts: ['auditor@partner.com'],
    blockedAccounts: ['exemployee@company.com'],
  });
  assert.equal(checkAccount('auditor@partner.com', policy).ok, true);
  assert.equal(checkAccount('exemployee@company.com', policy).ok, false);
  assert.equal(checkAccount('anyone@anywhere.com', policyWith({})).ok, true);
});

// --- schedule --------------------------------------------------------------

test('zonedParts reads the clock in the policy timezone', () => {
  const parts = zonedParts(new Date('2026-09-07T03:30:00Z'), 'Asia/Kolkata');
  assert.equal(parts.date, '2026-09-07');
  assert.equal(parts.day, 1); // Monday
  assert.equal(parts.hhmm, '09:00');
  assert.equal(parts.minutes, 540);
});

test('zonedParts falls back to local time for a bogus timezone', () => {
  const parts = zonedParts(new Date('2026-09-07T03:30:00Z'), 'Mars/Olympus');
  assert.match(parts.hhmm, /^\d{2}:\d{2}$/);
});

test('inWindow handles windows that cross midnight', () => {
  assert.equal(inWindow(600, { start: '09:30', end: '19:00' }), true);
  assert.equal(inWindow(1200, { start: '09:30', end: '19:00' }), false);
  assert.equal(inWindow(60, { start: '22:00', end: '06:00' }), true);
  assert.equal(inWindow(1380, { start: '22:00', end: '06:00' }), true);
  assert.equal(inWindow(720, { start: '22:00', end: '06:00' }), false);
  assert.equal(inWindow(720, { start: '12:00', end: '12:00' }), false);
});

test('schedule blocks outside hours, on non-working days and on holidays', () => {
  const schedule = policyWith({
    schedule: { enabled: true, timezone: 'Asia/Kolkata', days: [1, 2, 3, 4, 5] },
  }).schedule;

  assert.equal(checkSchedule(new Date('2026-09-07T12:00:00+05:30'), schedule).ok, true);
  assert.equal(
    checkSchedule(new Date('2026-09-07T22:00:00+05:30'), schedule).code,
    CODE.OUTSIDE_SCHEDULE,
  );
  assert.equal(
    checkSchedule(new Date('2026-09-06T12:00:00+05:30'), schedule).code,
    CODE.OUTSIDE_SCHEDULE,
  );

  const withHoliday = { ...schedule, holidays: ['2026-09-07'] };
  assert.equal(
    checkSchedule(new Date('2026-09-07T12:00:00+05:30'), withHoliday).code,
    CODE.HOLIDAY,
  );
});

// --- network ---------------------------------------------------------------

test('ipInCidr matches ranges and rejects junk', () => {
  assert.equal(ipInCidr('203.0.113.7', '203.0.113.0/24'), true);
  assert.equal(ipInCidr('203.0.114.7', '203.0.113.0/24'), false);
  assert.equal(ipInCidr('10.1.2.3', '10.0.0.0/8'), true);
  assert.equal(ipInCidr('1.2.3.4', '0.0.0.0/0'), true);
  assert.equal(ipInCidr('999.0.0.1', '203.0.113.0/24'), false);
  assert.equal(ipInCidr('203.0.113.7', '203.0.113.0/33'), false);
  assert.equal(ipInCidr('203.0.113.7', 'garbage'), false);
});

test('network rule honours failOpen when the IP is unknown', () => {
  const network = policyWith({
    network: { enabled: true, allowedCidrs: ['203.0.113.0/24'], failOpen: true },
  }).network;

  assert.equal(checkNetwork({ ip: '203.0.113.9', ipKnown: true }, network).ok, true);
  assert.equal(checkNetwork({ ip: '8.8.8.8', ipKnown: true }, network).ok, false);
  assert.equal(checkNetwork({ ip: '', ipKnown: false }, network).ok, true);
  assert.equal(checkNetwork({ ip: '', ipKnown: false }, { ...network, failOpen: false }).ok, false);
});

// --- the whole engine ------------------------------------------------------

test('a normal tab on an unprotected site is left alone', () => {
  const decision = evaluateAccess(policyWith({}), ctx({ url: 'https://example.com/' }));
  assert.equal(decision.code, CODE.NOT_PROTECTED);
  assert.equal(decision.allowed, true);
});

test('incognito is blocked when the policy says so', () => {
  const decision = evaluateAccess(policyWith({}), ctx({ incognito: true }));
  assert.equal(decision.code, CODE.INCOGNITO);
  assert.equal(decision.allowed, false);
});

test('an unapproved device is blocked, an approved one is not', () => {
  const policy = policyWith({
    device: { required: true, approved: [{ id: 'device-a', label: 'Reception' }] },
  });
  assert.equal(evaluateAccess(policy, ctx()).allowed, true);
  assert.equal(
    evaluateAccess(policy, ctx({ deviceId: 'device-b' })).code,
    CODE.DEVICE_NOT_APPROVED,
  );
});

test('a personal mailbox is blocked on the mail host', () => {
  const policy = policyWith({ allowedAccountDomains: ['company.com'] });
  assert.equal(
    evaluateAccess(policy, ctx({ account: 'me@gmail.com' })).code,
    CODE.ACCOUNT_NOT_ALLOWED,
  );
  assert.equal(evaluateAccess(policy, ctx({ account: 'me@company.com' })).allowed, true);
});

test('the sign-in page is only checked for the account rule', () => {
  const policy = policyWith({
    allowedAccountDomains: ['company.com'],
    device: { required: true, approved: [] },
    schedule: { enabled: true, days: [] },
  });
  const signin = ctx({ url: 'https://accounts.zoho.com/signin' });

  // Device and schedule would both fail, but the user must still be able to reach the login form.
  assert.equal(evaluateAccess(policy, signin).allowed, true);
  assert.equal(
    evaluateAccess(policy, { ...signin, account: 'me@gmail.com' }).code,
    CODE.ACCOUNT_NOT_ALLOWED,
  );
});

test('monitor mode reports the failure but still allows the page', () => {
  const policy = policyWith({
    mode: 'monitor',
    device: { required: true, approved: [] },
  });
  const decision = evaluateAccess(policy, ctx());
  assert.equal(decision.allowed, true);
  assert.equal(decision.wouldBlock, true);
  assert.equal(decision.monitorOnly, true);
  assert.equal(decision.code, CODE.DEVICE_NOT_APPROVED);
});

test('a disabled guard allows everything', () => {
  const policy = policyWith({ enabled: false, device: { required: true, approved: [] } });
  assert.equal(evaluateAccess(policy, ctx()).code, CODE.GUARD_OFF);
});

test('rules are reported in order so the popup can explain the decision', () => {
  const policy = policyWith({
    allowedAccountDomains: ['company.com'],
    device: { required: true, approved: [{ id: 'device-a' }] },
  });
  const decision = evaluateAccess(policy, ctx({ account: 'me@company.com' }));
  assert.deepEqual(
    decision.checks.map((c) => c.rule),
    ['incognito', 'device', 'profile', 'schedule', 'network', 'account'],
  );
  assert.ok(decision.checks.every((c) => c.ok));
});

// --- policy normalisation --------------------------------------------------

test('normalisePolicy cleans junk without throwing', () => {
  const policy = normalisePolicy({
    mode: 'nonsense',
    allowedAccountDomains: ['  @Company.COM ', '', null],
    device: { approved: ['plain-id', { id: '  x  ', label: ' Laptop ' }, { label: 'no id' }] },
    schedule: {
      days: [1, 9, 'x', 6],
      windows: [
        { start: '25:00', end: '10:00' },
        { start: '09:00', end: '17:00' },
      ],
    },
    audit: { maxEntries: 99999 },
  });

  assert.equal(policy.mode, 'enforce');
  assert.deepEqual(policy.allowedAccountDomains, ['company.com']);
  assert.deepEqual(
    policy.device.approved.map((d) => d.id),
    ['plain-id', 'x'],
  );
  assert.deepEqual(policy.schedule.days, [1, 6]);
  assert.deepEqual(policy.schedule.windows, [{ start: '09:00', end: '17:00' }]);
  assert.equal(policy.audit.maxEntries, 5000);
});

test('mergePolicy replaces arrays instead of concatenating them', () => {
  const merged = mergePolicy({ a: [1, 2], b: { c: 1, d: 2 } }, { a: [3], b: { d: 9 } });
  assert.deepEqual(merged, { a: [3], b: { c: 1, d: 9 } });
});

// --- audit export ----------------------------------------------------------

test('CSV export escapes quotes and defuses formula injection', () => {
  const csv = auditToCsv([
    { at: '2026-09-06T10:00:00Z', result: 'blocked', reason: 'said "no"', account: '=cmd()' },
  ]);
  const [header, row] = csv.split('\r\n');
  assert.equal(header, 'at,result,code,reason,url,account,device,ip,mode');
  assert.ok(row.includes('"said ""no"""'));
  assert.ok(row.includes(`"'=cmd()"`));
});
