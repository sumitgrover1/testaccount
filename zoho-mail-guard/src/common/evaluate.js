/**
 * The policy engine.
 *
 * Deliberately pure: no chrome.* calls, no I/O, no Date.now(). Everything it needs
 * arrives in `ctx`, so the same code runs in the service worker and in `node --test`.
 */
import { CODE } from './constants.js';

/**
 * @typedef {object} GuardContext
 * @property {string}  url            URL being opened.
 * @property {Date}    now            Current time.
 * @property {string}  deviceId       This installation's device ID.
 * @property {boolean} incognito      True for Incognito / Guest windows.
 * @property {string}  [profileEmail] Signed-in Chrome profile email, if known.
 * @property {string}  [ip]           Current public IP, if known.
 * @property {boolean} [ipKnown]      False when the lookup failed or is disabled.
 * @property {string}  [account]      Zoho mailbox detected on the page, if known.
 */

/**
 * @typedef {object} Decision
 * @property {boolean}  allowed   Final answer after mode is applied.
 * @property {boolean}  wouldBlock True when a rule failed, even in monitor mode.
 * @property {string}   code      One of CODE.*
 * @property {string}   reason    Short human sentence.
 * @property {object[]} checks    Every rule that ran, in order.
 */

/** Does `host` match `pattern` exactly, or is it a subdomain of it? */
export function hostMatches(host, pattern) {
  const h = String(host || '')
    .toLowerCase()
    .replace(/\.$/, '');
  const p = String(pattern || '')
    .toLowerCase()
    .replace(/^\*\./, '')
    .replace(/\.$/, '');
  if (!h || !p) return false;
  return h === p || h.endsWith(`.${p}`);
}

export function isProtectedUrl(url, policy) {
  const host = hostOf(url);
  if (!host) return false;
  return policy.protectedHosts.some((p) => hostMatches(host, p));
}

export function isSigninUrl(url, policy) {
  const host = hostOf(url);
  if (!host) return false;
  return policy.signinHosts.some((p) => hostMatches(host, p));
}

export function hostOf(url) {
  try {
    const u = new URL(url);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return '';
    return u.hostname.toLowerCase();
  } catch {
    return '';
  }
}

/** Split an email into its lowercased local part and domain. */
export function splitEmail(email) {
  const value = String(email || '')
    .trim()
    .toLowerCase();
  const at = value.lastIndexOf('@');
  if (at <= 0 || at === value.length - 1) return null;
  return { email: value, local: value.slice(0, at), domain: value.slice(at + 1) };
}

/**
 * Is this mailbox allowed by the account rules?
 * @returns {{ok: boolean, reason: string}}
 */
export function checkAccount(account, policy) {
  const parsed = splitEmail(account);
  if (!parsed) return { ok: true, reason: 'No account detected yet' };

  if (policy.blockedAccounts.includes(parsed.email)) {
    return { ok: false, reason: `${parsed.email} is on the blocked account list` };
  }
  if (policy.allowedAccounts.includes(parsed.email)) {
    return { ok: true, reason: `${parsed.email} is explicitly allowed` };
  }
  if (policy.allowedAccountDomains.length === 0) {
    return { ok: true, reason: 'No account domain restriction configured' };
  }
  const domainOk = policy.allowedAccountDomains.some(
    (d) => parsed.domain === d || parsed.domain.endsWith(`.${d}`),
  );
  return domainOk
    ? { ok: true, reason: `${parsed.domain} is a company domain` }
    : { ok: false, reason: `${parsed.email} is not a company account` };
}

/** Calendar parts of `date` as seen in `timeZone` (empty timeZone = device local). */
export function zonedParts(date, timeZone) {
  const opts = {
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  };
  if (timeZone) opts.timeZone = timeZone;

  let parts;
  try {
    parts = new Intl.DateTimeFormat('en-GB', opts).formatToParts(date);
  } catch {
    // Unknown timezone in the policy — fall back to device local time.
    parts = new Intl.DateTimeFormat('en-GB', { ...opts, timeZone: undefined }).formatToParts(date);
  }

  const get = (type) => parts.find((p) => p.type === type)?.value || '';
  const weekdayIndex = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  // Intl renders midnight as "24" in some locales/engines; normalise it to 0.
  const hour = get('hour') === '24' ? '00' : get('hour');

  return {
    day: weekdayIndex[get('weekday')] ?? date.getDay(),
    date: `${get('year')}-${get('month')}-${get('day')}`,
    minutes: Number(hour) * 60 + Number(get('minute')),
    hhmm: `${hour}:${get('minute')}`,
  };
}

const toMinutes = (hhmm) => {
  const [h, m] = String(hhmm).split(':').map(Number);
  return h * 60 + m;
};

/** Is `minutes` inside the window? Windows where start > end wrap past midnight. */
export function inWindow(minutes, window) {
  const start = toMinutes(window.start);
  const end = toMinutes(window.end);
  if (start === end) return false;
  return start < end ? minutes >= start && minutes < end : minutes >= start || minutes < end;
}

/** @returns {{ok: boolean, code: string, reason: string}} */
export function checkSchedule(now, schedule) {
  if (!schedule.enabled) return { ok: true, code: CODE.ALLOWED, reason: 'Schedule rule off' };

  const { day, date, minutes, hhmm } = zonedParts(now, schedule.timezone);

  if (schedule.holidays.includes(date)) {
    return { ok: false, code: CODE.HOLIDAY, reason: `${date} is marked as a non-working day` };
  }
  if (schedule.days.length && !schedule.days.includes(day)) {
    return { ok: false, code: CODE.OUTSIDE_SCHEDULE, reason: `${date} is not a working day` };
  }
  if (schedule.windows.length && !schedule.windows.some((w) => inWindow(minutes, w))) {
    const windows = schedule.windows.map((w) => `${w.start}–${w.end}`).join(', ');
    return {
      ok: false,
      code: CODE.OUTSIDE_SCHEDULE,
      reason: `${hhmm} is outside working hours (${windows})`,
    };
  }
  return { ok: true, code: CODE.ALLOWED, reason: `${hhmm} is inside working hours` };
}

/** IPv4 dotted-quad to a 32-bit unsigned number, or null when malformed. */
export function ipToInt(ip) {
  const parts = String(ip || '')
    .trim()
    .split('.');
  if (parts.length !== 4) return null;
  let out = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const n = Number(part);
    if (n > 255) return null;
    out = (out << 8) | n;
  }
  return out >>> 0;
}

export function ipInCidr(ip, cidr) {
  const [range, bitsRaw] = String(cidr || '')
    .trim()
    .split('/');
  const bits = Number(bitsRaw);
  if (!Number.isInteger(bits) || bits < 0 || bits > 32) return false;
  const ipInt = ipToInt(ip);
  const rangeInt = ipToInt(range);
  if (ipInt === null || rangeInt === null) return false;
  if (bits === 0) return true;
  const mask = (0xffffffff << (32 - bits)) >>> 0;
  return (ipInt & mask) === (rangeInt & mask);
}

/** @returns {{ok: boolean, reason: string}} */
export function checkNetwork(ctx, network) {
  if (!network.enabled) return { ok: true, reason: 'Network rule off' };
  if (!network.allowedIps.length && !network.allowedCidrs.length) {
    return { ok: true, reason: 'No allowed IPs configured' };
  }
  if (!ctx.ipKnown || !ctx.ip) {
    return network.failOpen
      ? { ok: true, reason: 'Public IP unknown — rule set to fail open' }
      : { ok: false, reason: 'Public IP could not be verified' };
  }
  const ip = String(ctx.ip).trim().toLowerCase();
  if (network.allowedIps.includes(ip)) return { ok: true, reason: `${ip} is an approved IP` };
  if (network.allowedCidrs.some((c) => ipInCidr(ip, c))) {
    return { ok: true, reason: `${ip} is inside an approved range` };
  }
  return { ok: false, reason: `${ip} is not a company network address` };
}

/**
 * Run every rule against the context and return the final decision.
 * @param {object} policy Normalised policy.
 * @param {GuardContext} ctx
 * @returns {Decision}
 */
export function evaluateAccess(policy, ctx) {
  const checks = [];
  const push = (rule, ok, reason) => checks.push({ rule, ok, reason });

  if (!policy.enabled) {
    push('guard', true, 'Guard is switched off');
    return finish(policy, checks, CODE.GUARD_OFF, 'Guard is switched off', true);
  }

  const protectedUrl = isProtectedUrl(ctx.url, policy);
  const signinUrl = isSigninUrl(ctx.url, policy);
  if (!protectedUrl && !signinUrl) {
    push('scope', true, 'Not a protected Zoho Mail address');
    return finish(policy, checks, CODE.NOT_PROTECTED, 'Not a protected address', true);
  }

  // The sign-in page is only guarded for the account rule, so a user can still
  // reach the login screen to sign in with a company account.
  if (signinUrl && !protectedUrl) {
    const account = checkAccount(ctx.account, policy);
    push('account', account.ok, account.reason);
    return account.ok
      ? finish(policy, checks, CODE.ALLOWED, account.reason, true)
      : finish(policy, checks, CODE.ACCOUNT_NOT_ALLOWED, account.reason, false);
  }

  if (policy.profile.blockIncognito && ctx.incognito) {
    push('incognito', false, 'Incognito / Guest window');
    return finish(policy, checks, CODE.INCOGNITO, 'Incognito / Guest window', false);
  }
  push('incognito', true, ctx.incognito ? 'Incognito allowed by policy' : 'Normal window');

  if (policy.device.required) {
    const approved = policy.device.approved.find((d) => d.id === ctx.deviceId);
    if (!approved) {
      push('device', false, `Device ${shortId(ctx.deviceId)} is not approved`);
      return finish(
        policy,
        checks,
        CODE.DEVICE_NOT_APPROVED,
        `Device ${shortId(ctx.deviceId)} is not approved`,
        false,
      );
    }
    push('device', true, `Approved device: ${approved.label || shortId(ctx.deviceId)}`);
  } else {
    push('device', true, 'Device rule off');
  }

  const allowedProfiles = policy.profile.allowedProfileEmails;
  if (allowedProfiles.length) {
    const email = String(ctx.profileEmail || '').toLowerCase();
    if (!email) {
      push('profile', false, 'Chrome profile is not signed in');
      return finish(
        policy,
        checks,
        CODE.PROFILE_NOT_ALLOWED,
        'Chrome profile is not signed in',
        false,
      );
    }
    if (!allowedProfiles.includes(email)) {
      push('profile', false, `Chrome profile ${email} is not allowed`);
      return finish(
        policy,
        checks,
        CODE.PROFILE_NOT_ALLOWED,
        `Chrome profile ${email} is not allowed`,
        false,
      );
    }
    push('profile', true, `Chrome profile ${email} is allowed`);
  } else {
    push('profile', true, 'Chrome profile rule off');
  }

  const schedule = checkSchedule(ctx.now, policy.schedule);
  push('schedule', schedule.ok, schedule.reason);
  if (!schedule.ok) return finish(policy, checks, schedule.code, schedule.reason, false);

  const network = checkNetwork(ctx, policy.network);
  push('network', network.ok, network.reason);
  if (!network.ok) return finish(policy, checks, CODE.NETWORK_NOT_ALLOWED, network.reason, false);

  const account = checkAccount(ctx.account, policy);
  push('account', account.ok, account.reason);
  if (!account.ok) return finish(policy, checks, CODE.ACCOUNT_NOT_ALLOWED, account.reason, false);

  return finish(policy, checks, CODE.ALLOWED, 'All rules passed', true);
}

function finish(policy, checks, code, reason, ok) {
  const monitorOnly = !ok && policy.mode === 'monitor';
  return {
    allowed: ok || monitorOnly,
    wouldBlock: !ok,
    monitorOnly,
    code,
    reason,
    checks,
  };
}

export function shortId(id) {
  const value = String(id || '');
  return value ? value.slice(0, 8).toUpperCase() : 'unknown';
}
