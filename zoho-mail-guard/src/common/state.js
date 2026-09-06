/**
 * Storage layer: effective policy, device identity, network cache, admin session.
 *
 * Precedence: defaults  <  local (options page)  <  managed (enterprise policy).
 * Anything an admin pushes through Chrome policy therefore wins and is shown
 * as read-only in the options page.
 */
import { ADMIN_UNLOCK_MS, KEYS } from './constants.js';
import { defaultPolicy, mergePolicy, normalisePolicy } from './policy.js';

async function readManaged() {
  try {
    const managed = await chrome.storage.managed.get(KEYS.policy);
    const value = managed && managed[KEYS.policy];
    return value && typeof value === 'object' ? value : null;
  } catch {
    // No managed storage configured on this machine — perfectly normal.
    return null;
  }
}

async function readLocal() {
  const store = await chrome.storage.local.get(KEYS.policy);
  const value = store[KEYS.policy];
  return value && typeof value === 'object' ? value : {};
}

/**
 * @returns {Promise<{policy: object, managed: boolean, managedKeys: string[], local: object}>}
 */
export async function getPolicyState() {
  const [local, managed] = await Promise.all([readLocal(), readManaged()]);
  const merged = mergePolicy(mergePolicy(defaultPolicy(), local), managed || {});
  return {
    policy: normalisePolicy(merged),
    managed: Boolean(managed),
    managedKeys: managed ? Object.keys(managed) : [],
    local,
  };
}

export async function getPolicy() {
  return (await getPolicyState()).policy;
}

/** Persist the locally editable policy. Managed keys still win on read. */
export async function saveLocalPolicy(patch) {
  const local = await readLocal();
  const next = normalisePolicy(mergePolicy(mergePolicy(defaultPolicy(), local), patch));
  await chrome.storage.local.set({ [KEYS.policy]: next });
  return getPolicyState();
}

/**
 * A stable per-installation identifier.
 *
 * Honest limitation: this lives in extension storage, so a user who can remove
 * or reinstall the extension gets a new ID. It is a real control only when the
 * extension is force-installed through Chrome enterprise policy — see DEPLOYMENT.md.
 */
export async function getDevice() {
  const store = await chrome.storage.local.get(KEYS.device);
  if (store[KEYS.device]?.id) return store[KEYS.device];

  const device = {
    id: crypto.randomUUID(),
    label: '',
    createdAt: new Date().toISOString(),
  };
  await chrome.storage.local.set({ [KEYS.device]: device });
  return device;
}

export async function setDeviceLabel(label) {
  const device = await getDevice();
  device.label = String(label || '').slice(0, 60);
  await chrome.storage.local.set({ [KEYS.device]: device });
  return device;
}

/** Chrome profile email, when the optional "identity.email" permission is granted. */
export async function getProfileEmail() {
  try {
    if (!chrome.identity?.getProfileUserInfo) return '';
    const info = await chrome.identity.getProfileUserInfo({ accountStatus: 'ANY' });
    return (info?.email || '').toLowerCase();
  } catch {
    return '';
  }
}

/**
 * Current public IP, cached for policy.network.cacheMinutes.
 * @returns {Promise<{ip: string, known: boolean, at: string, error?: string}>}
 */
export async function getPublicIp(network, { force = false } = {}) {
  if (!network.enabled) return { ip: '', known: false, at: '' };

  const store = await chrome.storage.local.get(KEYS.netCache);
  const cached = store[KEYS.netCache];
  const ttl = network.cacheMinutes * 60 * 1000;
  if (!force && cached?.at && Date.now() - new Date(cached.at).getTime() < ttl) {
    return cached;
  }

  let result;
  try {
    const response = await fetch(network.lookupUrl, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const text = (await response.text()).trim();
    let ip = text;
    if (text.startsWith('{')) {
      const json = JSON.parse(text);
      ip = json.ip || json.query || json.address || '';
    }
    ip = String(ip).trim();
    if (!ip) throw new Error('Lookup returned no address');
    result = { ip, known: true, at: new Date().toISOString() };
  } catch (error) {
    result = {
      ip: '',
      known: false,
      at: new Date().toISOString(),
      error: String(error.message || error),
    };
  }

  await chrome.storage.local.set({ [KEYS.netCache]: result });
  return result;
}

export async function isAdminUnlocked() {
  const store = await chrome.storage.session.get(KEYS.unlockUntil);
  return Number(store[KEYS.unlockUntil] || 0) > Date.now();
}

export async function startAdminSession() {
  await chrome.storage.session.set({ [KEYS.unlockUntil]: Date.now() + ADMIN_UNLOCK_MS });
}

export async function endAdminSession() {
  await chrome.storage.session.remove(KEYS.unlockUntil);
}
