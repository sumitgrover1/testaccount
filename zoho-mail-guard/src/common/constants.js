/**
 * Shared constants for Zoho Mail Guard.
 * No chrome.* access here so this file can be imported from tests too.
 */

/** Storage keys. */
export const KEYS = {
  policy: 'policy',
  device: 'device',
  audit: 'auditLog',
  netCache: 'networkCache',
  unlockUntil: 'adminUnlockUntil',
};

/** Decision codes returned by the policy engine. */
export const CODE = {
  ALLOWED: 'ALLOWED',
  NOT_PROTECTED: 'NOT_PROTECTED',
  GUARD_OFF: 'GUARD_OFF',
  MONITOR_ONLY: 'MONITOR_ONLY',
  INCOGNITO: 'INCOGNITO',
  DEVICE_NOT_APPROVED: 'DEVICE_NOT_APPROVED',
  PROFILE_NOT_ALLOWED: 'PROFILE_NOT_ALLOWED',
  OUTSIDE_SCHEDULE: 'OUTSIDE_SCHEDULE',
  HOLIDAY: 'HOLIDAY',
  NETWORK_NOT_ALLOWED: 'NETWORK_NOT_ALLOWED',
  ACCOUNT_NOT_ALLOWED: 'ACCOUNT_NOT_ALLOWED',
};

/** Human readable text for every decision code (shown on the blocked page). */
export const CODE_TEXT = {
  [CODE.INCOGNITO]: 'Company mail cannot be opened in an Incognito or Guest window.',
  [CODE.DEVICE_NOT_APPROVED]: 'This device is not on the approved device list.',
  [CODE.PROFILE_NOT_ALLOWED]: 'This Chrome profile is not allowed to open company mail.',
  [CODE.OUTSIDE_SCHEDULE]: 'Company mail is only available during allowed working hours.',
  [CODE.HOLIDAY]: 'Company mail is switched off for today (non-working day).',
  [CODE.NETWORK_NOT_ALLOWED]: 'You are not on an approved company network.',
  [CODE.ACCOUNT_NOT_ALLOWED]: 'This Zoho account is not a company account.',
};

/**
 * Zoho hostnames that actually serve mailboxes, per data centre.
 * A host is "protected" when it matches one of these suffix patterns.
 */
export const DEFAULT_PROTECTED_HOSTS = [
  'mail.zoho.com',
  'mail.zoho.in',
  'mail.zoho.eu',
  'mail.zoho.com.au',
  'mail.zoho.com.cn',
  'mail.zoho.jp',
  'mail.zoho.ca',
  'mail.zoho.sa',
  'mail.zoho.uk',
  'mail.zohocloud.ca',
  'workplace.zoho.com',
  'workplace.zoho.in',
  'workplace.zoho.eu',
];

/** Zoho sign-in hosts — watched so a personal login can be stopped before it happens. */
export const DEFAULT_SIGNIN_HOSTS = [
  'accounts.zoho.com',
  'accounts.zoho.in',
  'accounts.zoho.eu',
  'accounts.zoho.com.au',
  'accounts.zoho.com.cn',
  'accounts.zoho.jp',
  'accounts.zoho.ca',
  'accounts.zoho.sa',
  'accounts.zoho.uk',
  'accounts.zohocloud.ca',
];

export const MSG = {
  GET_STATE: 'guard:getState',
  REPORT_ACCOUNT: 'guard:reportAccount',
  RE_EVALUATE: 'guard:reEvaluate',
  POLICY_CHANGED: 'guard:policyChanged',
  UNLOCK_ADMIN: 'guard:unlockAdmin',
  SET_PIN: 'guard:setPin',
  LOCK_ADMIN: 'guard:lockAdmin',
  SAVE_POLICY: 'guard:savePolicy',
  GET_AUDIT: 'guard:getAudit',
  CLEAR_AUDIT: 'guard:clearAudit',
  GET_DEVICE: 'guard:getDevice',
  REFRESH_NETWORK: 'guard:refreshNetwork',
};

/** Admin session length after a correct PIN, in milliseconds. */
export const ADMIN_UNLOCK_MS = 10 * 60 * 1000;
