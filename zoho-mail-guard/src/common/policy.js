/**
 * Policy shape, defaults and normalisation.
 * Pure module — safe to import from the service worker, extension pages and tests.
 */
import { DEFAULT_PROTECTED_HOSTS, DEFAULT_SIGNIN_HOSTS } from './constants.js';

/** @returns {object} a fresh copy of the default policy. */
export function defaultPolicy() {
  return {
    version: 1,
    /** Master switch. When false the extension does nothing at all. */
    enabled: true,
    /**
     * 'enforce' — actually block and redirect to the blocked page.
     * 'monitor' — allow everything, but write every would-be block to the audit log.
     *             Use this for the first week of a rollout.
     */
    mode: 'enforce',

    /** Hosts the guard applies to. Matched as exact host or ".suffix" of the host. */
    protectedHosts: [...DEFAULT_PROTECTED_HOSTS],
    signinHosts: [...DEFAULT_SIGNIN_HOSTS],

    /** Only these email domains count as "company mail". Empty = any account allowed. */
    allowedAccountDomains: [],
    /** Specific mailboxes that are always allowed even if their domain is not listed. */
    allowedAccounts: [],
    /** Mailboxes that are never allowed, even if their domain is listed. */
    blockedAccounts: [],

    /**
     * Where the content script looks for the signed-in mailbox. Zoho ships UI
     * changes regularly, so this is policy data rather than hard-coded selectors.
     */
    accountSelectors: [
      '[data-zmuser]',
      '#zmailuserinfo',
      '.zmUserMailId',
      '.userMailId',
      '[id*="userMail" i]',
      '[class*="userMail" i]',
      '[class*="accountMail" i]',
      '[aria-label*="@" i]',
      '[title*="@" i]',
    ],

    device: {
      /** When true, only devices whose ID is in approvedDeviceIds may open mail. */
      required: false,
      /** [{ id, label, addedAt }] */
      approved: [],
    },

    profile: {
      /** Block Incognito / Guest windows. */
      blockIncognito: true,
      /** When non-empty, the signed-in Chrome profile email must be in this list. */
      allowedProfileEmails: [],
    },

    schedule: {
      enabled: false,
      /** IANA timezone, e.g. "Asia/Kolkata". Empty string = device local time. */
      timezone: 'Asia/Kolkata',
      /** 0 = Sunday … 6 = Saturday. */
      days: [1, 2, 3, 4, 5],
      /** Local-time windows. A window may cross midnight (start > end). */
      windows: [{ start: '09:30', end: '19:00' }],
      /** ISO dates (YYYY-MM-DD) on which mail stays closed. */
      holidays: [],
    },

    network: {
      enabled: false,
      /** Endpoint that returns the public IP. Must return JSON {ip} or a bare IP string. */
      lookupUrl: 'https://api.ipify.org?format=json',
      /** Exact public IPv4 addresses that are considered "the office". */
      allowedIps: [],
      /** IPv4 CIDR ranges, e.g. "203.0.113.0/24". */
      allowedCidrs: [],
      /** How long a successful lookup is trusted, in minutes. */
      cacheMinutes: 10,
      /** If the lookup fails: true = keep access, false = block. */
      failOpen: true,
    },

    restrictions: {
      /** Cancel downloads started from a Zoho Mail tab (needs the "downloads" permission). */
      blockAttachmentDownloads: false,
      /** Block copy / cut on the mail UI. */
      blockCopy: false,
      /** Block Ctrl+P and window.print() on the mail UI. */
      blockPrint: false,
      /** Show a diagonal watermark with the account + device label. */
      watermark: true,
      /** Text of the watermark. {account} and {device} are substituted. */
      watermarkText: 'CONFIDENTIAL · {account} · {device}',
    },

    /** Message shown to the user on the blocked page. */
    contact: {
      supportName: 'IT Helpdesk',
      supportEmail: '',
      note: '',
    },

    /** PBKDF2 record of the admin PIN, or null when no PIN is set. */
    adminPin: null,

    audit: {
      enabled: true,
      maxEntries: 500,
      /** Also log allowed navigations, not just blocks. */
      logAllowed: false,
    },
  };
}

/** Deep-merge `patch` onto `base` for plain objects; arrays are replaced wholesale. */
export function mergePolicy(base, patch) {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) return base;
  const out = Array.isArray(base) ? [...base] : { ...base };
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    const current = out[key];
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      current &&
      typeof current === 'object' &&
      !Array.isArray(current)
    ) {
      out[key] = mergePolicy(current, value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

const lower = (list) =>
  (Array.isArray(list) ? list : [])
    .map((v) =>
      String(v || '')
        .trim()
        .toLowerCase(),
    )
    .filter(Boolean);

/** Clamp / clean a policy so the engine never has to defend against junk input. */
export function normalisePolicy(input) {
  const p = mergePolicy(defaultPolicy(), input || {});

  p.mode = p.mode === 'monitor' ? 'monitor' : 'enforce';
  p.protectedHosts = lower(p.protectedHosts);
  p.signinHosts = lower(p.signinHosts);
  p.allowedAccountDomains = lower(p.allowedAccountDomains).map((d) => d.replace(/^@/, ''));
  p.allowedAccounts = lower(p.allowedAccounts);
  p.blockedAccounts = lower(p.blockedAccounts);
  p.accountSelectors = (Array.isArray(p.accountSelectors) ? p.accountSelectors : [])
    .map((s) => String(s || '').trim())
    .filter(Boolean);

  p.device.approved = (Array.isArray(p.device.approved) ? p.device.approved : [])
    .map((d) => (typeof d === 'string' ? { id: d, label: '' } : d))
    .filter((d) => d && typeof d.id === 'string' && d.id.trim())
    .map((d) => ({
      id: d.id.trim(),
      label: String(d.label || '').trim(),
      addedAt: d.addedAt || null,
    }));

  p.profile.allowedProfileEmails = lower(p.profile.allowedProfileEmails);

  p.schedule.days = (Array.isArray(p.schedule.days) ? p.schedule.days : [])
    .map(Number)
    .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
  p.schedule.windows = (Array.isArray(p.schedule.windows) ? p.schedule.windows : [])
    .filter((w) => w && isHhMm(w.start) && isHhMm(w.end))
    .map((w) => ({ start: w.start, end: w.end }));
  p.schedule.holidays = (Array.isArray(p.schedule.holidays) ? p.schedule.holidays : [])
    .map((d) => String(d).trim())
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d));

  p.network.allowedIps = lower(p.network.allowedIps);
  p.network.allowedCidrs = lower(p.network.allowedCidrs);
  p.network.cacheMinutes = clampNumber(p.network.cacheMinutes, 1, 240, 10);

  p.audit.maxEntries = clampNumber(p.audit.maxEntries, 20, 5000, 500);

  return p;
}

export function isHhMm(value) {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function clampNumber(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}
