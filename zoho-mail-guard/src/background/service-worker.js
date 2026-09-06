/**
 * Zoho Mail Guard — background service worker.
 *
 * Everything funnels through `guardTab()`: a navigation, a periodic re-check, a
 * policy change or an account report from the content script all end up asking
 * the same pure engine the same question and acting on one answer.
 */
import { CODE, MSG } from '../common/constants.js';
import { evaluateAccess, isProtectedUrl, isSigninUrl, shortId } from '../common/evaluate.js';
import { appendAudit, clearAudit, readAudit } from '../common/audit.js';
import { hashPin, verifyPin } from '../common/pin.js';
import {
  endAdminSession,
  getDevice,
  getPolicy,
  getPolicyState,
  getProfileEmail,
  getPublicIp,
  isAdminUnlocked,
  saveLocalPolicy,
  setDeviceLabel,
  startAdminSession,
} from '../common/state.js';

const BLOCKED_PAGE = 'src/pages/blocked.html';
const RECHECK_ALARM = 'guard-recheck';

/** tabId -> last account reported by the content script for that tab. */
const tabAccounts = new Map();
/** tabId -> last decision, so the popup can explain the current tab. */
const tabDecisions = new Map();

chrome.runtime.onInstalled.addListener(async () => {
  await getDevice();
  await ensureAlarm();
  await refreshBadge();
});

chrome.runtime.onStartup.addListener(async () => {
  await ensureAlarm();
  await refreshBadge();
});

async function ensureAlarm() {
  const existing = await chrome.alarms.get(RECHECK_ALARM);
  if (!existing) chrome.alarms.create(RECHECK_ALARM, { periodInMinutes: 1 });
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === RECHECK_ALARM) reguardAllTabs();
});

// ---------------------------------------------------------------------------
// Navigation guarding
// ---------------------------------------------------------------------------

chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  if (details.frameId !== 0) return;
  guardTab(details.tabId, details.url);
});

chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
  if (details.frameId !== 0) return;
  guardTab(details.tabId, details.url);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url) guardTab(tabId, changeInfo.url, tab);
});

chrome.tabs.onRemoved.addListener((tabId) => {
  tabAccounts.delete(tabId);
  tabDecisions.delete(tabId);
});

function isOwnPage(url) {
  return typeof url === 'string' && url.startsWith(chrome.runtime.getURL(''));
}

/** Build the full context the engine needs for one URL in one tab. */
async function buildContext(url, tab, policy) {
  const [device, profileEmail, net] = await Promise.all([
    getDevice(),
    policy.profile.allowedProfileEmails.length ? getProfileEmail() : Promise.resolve(''),
    getPublicIp(policy.network),
  ]);

  return {
    url,
    now: new Date(),
    deviceId: device.id,
    deviceLabel: device.label,
    incognito: Boolean(tab?.incognito),
    profileEmail,
    ip: net.ip,
    ipKnown: net.known,
    account: tab ? tabAccounts.get(tab.id) || '' : '',
  };
}

/**
 * Evaluate one tab and enforce the answer.
 * @returns {Promise<import('../common/evaluate.js').Decision|null>}
 */
async function guardTab(tabId, url, knownTab) {
  if (!url || isOwnPage(url)) return null;

  const policy = await getPolicy();
  if (!policy.enabled) return null;
  if (!isProtectedUrl(url, policy) && !isSigninUrl(url, policy)) return null;

  let tab = knownTab;
  if (!tab) {
    try {
      tab = await chrome.tabs.get(tabId);
    } catch {
      return null; // Tab closed mid-flight.
    }
  }

  const ctx = await buildContext(url, tab, policy);
  ctx.account = tabAccounts.get(tabId) || '';

  const decision = evaluateAccess(policy, ctx);
  tabDecisions.set(tabId, { decision, url, at: Date.now() });

  if (decision.code === CODE.NOT_PROTECTED || decision.code === CODE.GUARD_OFF) return decision;

  if (decision.wouldBlock) {
    await logDecision(policy, decision, ctx, decision.monitorOnly ? 'monitor' : 'blocked');
    if (!decision.monitorOnly) {
      await redirectToBlockedPage(tabId, decision, ctx);
    }
  } else if (policy.audit.logAllowed) {
    await logDecision(policy, decision, ctx, 'allowed');
  }

  await refreshBadge(tabId);
  return decision;
}

async function redirectToBlockedPage(tabId, decision, ctx) {
  const params = new URLSearchParams({
    code: decision.code,
    reason: decision.reason,
    url: ctx.url,
    device: ctx.deviceLabel || shortId(ctx.deviceId),
    deviceId: ctx.deviceId,
    account: ctx.account || '',
  });
  const target = `${chrome.runtime.getURL(BLOCKED_PAGE)}?${params.toString()}`;
  try {
    await chrome.tabs.update(tabId, { url: target });
  } catch {
    // Tab vanished; nothing to do.
  }
}

async function logDecision(policy, decision, ctx, result) {
  if (!policy.audit.enabled) return;
  await appendAudit(
    {
      result,
      code: decision.code,
      reason: decision.reason,
      url: safeUrl(ctx.url),
      account: ctx.account || '',
      device: ctx.deviceLabel || shortId(ctx.deviceId),
      ip: ctx.ipKnown ? ctx.ip : '',
      mode: policy.mode,
    },
    policy.audit.maxEntries,
  );
}

/** Keep the path but drop query strings — mail URLs can carry message content. */
function safeUrl(url) {
  try {
    const u = new URL(url);
    return `${u.origin}${u.pathname}`;
  } catch {
    return String(url || '');
  }
}

/** Re-check every open Zoho tab, e.g. when the clock rolls out of working hours. */
async function reguardAllTabs() {
  const policy = await getPolicy();
  if (!policy.enabled) return;
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (!tab.url || isOwnPage(tab.url)) continue;
    if (!isProtectedUrl(tab.url, policy) && !isSigninUrl(tab.url, policy)) continue;
    await guardTab(tab.id, tab.url, tab);
  }
  await refreshBadge();
}

// ---------------------------------------------------------------------------
// Attachment download control
// ---------------------------------------------------------------------------

function registerDownloadGuard() {
  if (!chrome.downloads?.onCreated) return;
  if (chrome.downloads.onCreated.hasListener(onDownloadCreated)) return;
  chrome.downloads.onCreated.addListener(onDownloadCreated);
}

async function onDownloadCreated(item) {
  const policy = await getPolicy();
  if (!policy.enabled || !policy.restrictions.blockAttachmentDownloads) return;

  const fromMail =
    isProtectedUrl(item.referrer || '', policy) || isProtectedUrl(item.url || '', policy);
  if (!fromMail) return;

  try {
    await chrome.downloads.cancel(item.id);
    await chrome.downloads.erase({ id: item.id });
  } catch {
    // Already finished or cancelled — best effort.
  }

  const device = await getDevice();
  await appendAudit(
    {
      result: 'blocked',
      code: 'DOWNLOAD_BLOCKED',
      reason: `Attachment download blocked: ${item.filename || item.url || 'unknown file'}`,
      url: safeUrl(item.referrer || item.url || ''),
      device: device.label || shortId(device.id),
      mode: policy.mode,
    },
    policy.audit.maxEntries,
  );

  notifyTabs({ type: MSG.POLICY_CHANGED, downloadBlocked: true });
}

registerDownloadGuard();
chrome.permissions?.onAdded?.addListener(registerDownloadGuard);

// ---------------------------------------------------------------------------
// Badge
// ---------------------------------------------------------------------------

async function refreshBadge(tabId) {
  const policy = await getPolicy();
  let text = 'ON';
  let color = '#137333';

  if (!policy.enabled) {
    text = 'OFF';
    color = '#5f6368';
  } else if (policy.mode === 'monitor') {
    text = 'MON';
    color = '#b06000';
  }

  const blocked = tabId ? tabDecisions.get(tabId)?.decision?.wouldBlock : false;
  if (blocked) {
    text = '!';
    color = '#c5221f';
  }

  await chrome.action.setBadgeText({ text });
  await chrome.action.setBadgeBackgroundColor({ color });
}

function notifyTabs(message) {
  chrome.tabs.query({}, (tabs) => {
    for (const tab of tabs) {
      if (!tab.id) continue;
      chrome.tabs.sendMessage(tab.id, message).catch(() => {});
    }
  });
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && !changes.policy) return;
  if (area === 'session') return;
  reguardAllTabs();
  notifyTabs({ type: MSG.POLICY_CHANGED });
});

// ---------------------------------------------------------------------------
// Messaging
// ---------------------------------------------------------------------------

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender)
    .then((result) => sendResponse({ ok: true, ...result }))
    .catch((error) => sendResponse({ ok: false, error: String(error?.message || error) }));
  return true; // async response
});

async function handleMessage(message, sender) {
  switch (message?.type) {
    case MSG.GET_STATE:
      return getStateForUi(message.tabId ?? sender?.tab?.id);

    case MSG.REPORT_ACCOUNT:
      return reportAccount(message, sender);

    case MSG.RE_EVALUATE: {
      await reguardAllTabs();
      return {};
    }

    case MSG.GET_DEVICE: {
      if (typeof message.label === 'string') return { device: await setDeviceLabel(message.label) };
      return { device: await getDevice() };
    }

    case MSG.UNLOCK_ADMIN: {
      const policy = await getPolicy();
      if (!policy.adminPin) {
        await startAdminSession();
        return { unlocked: true, noPinSet: true };
      }
      const ok = await verifyPin(String(message.pin || ''), policy.adminPin);
      if (ok) await startAdminSession();
      return { unlocked: ok };
    }

    case MSG.LOCK_ADMIN: {
      await endAdminSession();
      return {};
    }

    case MSG.SET_PIN: {
      await requireAdmin();
      const state = await getPolicyState();
      if (state.managedKeys.includes('adminPin')) {
        throw new Error('The admin PIN is set by enterprise policy and cannot be changed here.');
      }
      const pin = String(message.pin || '');
      if (pin && pin.length < 4) throw new Error('PIN must be at least 4 characters.');
      await saveLocalPolicy({ adminPin: pin ? await hashPin(pin) : null });
      return {};
    }

    case MSG.SAVE_POLICY: {
      await requireAdmin();
      const state = await saveLocalPolicy(message.patch || {});
      await reguardAllTabs();
      await refreshBadge();
      return { policy: state.policy, managedKeys: state.managedKeys };
    }

    case MSG.GET_AUDIT:
      return { entries: await readAudit() };

    case MSG.CLEAR_AUDIT: {
      await requireAdmin();
      await clearAudit();
      return {};
    }

    case MSG.REFRESH_NETWORK: {
      const policy = await getPolicy();
      const net = await getPublicIp(policy.network, { force: true });
      await reguardAllTabs();
      return { network: net };
    }

    default:
      throw new Error(`Unknown message: ${message?.type}`);
  }
}

async function requireAdmin() {
  const policy = await getPolicy();
  if (!policy.adminPin) return; // No PIN configured yet — first run.
  if (!(await isAdminUnlocked())) throw new Error('Admin session is locked. Enter the PIN first.');
}

async function reportAccount(message, sender) {
  const tabId = sender?.tab?.id;
  const account = String(message.account || '')
    .trim()
    .toLowerCase();
  if (!tabId) return {};

  const previous = tabAccounts.get(tabId);
  if (account) tabAccounts.set(tabId, account);
  else tabAccounts.delete(tabId);

  if (account !== previous) {
    const decision = await guardTab(tabId, sender.tab.url, sender.tab);
    return { decision };
  }
  return {};
}

async function getStateForUi(tabId) {
  const [{ policy, managed, managedKeys }, device] = await Promise.all([
    getPolicyState(),
    getDevice(),
  ]);
  const [profileEmail, net, unlocked] = await Promise.all([
    getProfileEmail(),
    getPublicIp(policy.network),
    isAdminUnlocked(),
  ]);

  let tab = null;
  if (tabId !== undefined && tabId !== null) {
    try {
      tab = await chrome.tabs.get(tabId);
    } catch {
      tab = null;
    }
  }

  let decision = tabId ? tabDecisions.get(tabId)?.decision || null : null;
  if (tab?.url && !decision && !isOwnPage(tab.url)) {
    const ctx = await buildContext(tab.url, tab, policy);
    decision = evaluateAccess(policy, ctx);
  }

  const permissions = await chrome.permissions.getAll();

  return {
    policy,
    managed,
    managedKeys,
    device,
    profileEmail,
    network: net,
    adminUnlocked: unlocked,
    hasPin: Boolean(policy.adminPin),
    permissions: permissions.permissions || [],
    tab: tab ? { id: tab.id, url: tab.url, incognito: tab.incognito } : null,
    decision,
    account: tabId ? tabAccounts.get(tabId) || '' : '',
  };
}
