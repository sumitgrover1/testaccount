/** Admin settings page. */
import { MSG } from '../common/constants.js';
import { auditToCsv } from '../common/audit.js';
import { defaultPolicy } from '../common/policy.js';

const $ = (id) => document.getElementById(id);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

let state = null;
/** Working copy the form edits; only written back on Save. */
let draft = null;
let dirty = false;

// ---------------------------------------------------------------------------
// Path helpers
// ---------------------------------------------------------------------------

function getPath(object, path) {
  return path.split('.').reduce((acc, key) => (acc == null ? acc : acc[key]), object);
}

function setPath(object, path, value) {
  const keys = path.split('.');
  const last = keys.pop();
  let node = object;
  for (const key of keys) {
    if (typeof node[key] !== 'object' || node[key] === null) node[key] = {};
    node = node[key];
  }
  node[last] = value;
}

const isManaged = (path) => state?.managedKeys?.includes(path.split('.')[0]);

function markDirty() {
  dirty = true;
  $('saveBar').hidden = false;
}

// ---------------------------------------------------------------------------
// Form <-> draft binding
// ---------------------------------------------------------------------------

function bindInputs() {
  for (const el of $$('[data-path]')) {
    el.addEventListener('change', () => {
      setPath(draft, el.dataset.path, readInput(el));
      markDirty();
    });
    if (el.tagName === 'TEXTAREA' || el.type === 'text' || el.type === 'number') {
      el.addEventListener('input', () => {
        setPath(draft, el.dataset.path, readInput(el));
        markDirty();
      });
    }
  }
}

function readInput(el) {
  if (el.type === 'checkbox') return el.checked;
  if (el.type === 'number') return Number(el.value);
  if (el.dataset.list !== undefined) {
    return el.value
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  }
  return el.value;
}

function writeInputs() {
  for (const el of $$('[data-path]')) {
    const value = getPath(draft, el.dataset.path);
    if (el.type === 'checkbox') el.checked = Boolean(value);
    else if (el.dataset.list !== undefined) el.value = (value || []).join('\n');
    else el.value = value ?? '';
    el.disabled = isManaged(el.dataset.path);
  }
}

// ---------------------------------------------------------------------------
// Repeating sections
// ---------------------------------------------------------------------------

function renderDays() {
  const host = $('days');
  host.textContent = '';
  DAY_NAMES.forEach((name, index) => {
    const label = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = draft.schedule.days.includes(index);
    input.disabled = isManaged('schedule');
    input.addEventListener('change', () => {
      const days = new Set(draft.schedule.days);
      if (input.checked) days.add(index);
      else days.delete(index);
      draft.schedule.days = [...days].sort((a, b) => a - b);
      markDirty();
    });
    label.append(input, document.createTextNode(name));
    host.appendChild(label);
  });
}

function renderWindows() {
  const host = $('windows');
  host.textContent = '';
  draft.schedule.windows.forEach((window, index) => {
    const row = document.createElement('div');
    row.className = 'window';

    const start = document.createElement('input');
    start.type = 'time';
    start.value = window.start;
    start.disabled = isManaged('schedule');
    start.addEventListener('change', () => {
      draft.schedule.windows[index].start = start.value;
      markDirty();
    });

    const end = document.createElement('input');
    end.type = 'time';
    end.value = window.end;
    end.disabled = isManaged('schedule');
    end.addEventListener('change', () => {
      draft.schedule.windows[index].end = end.value;
      markDirty();
    });

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'secondary';
    remove.textContent = 'Remove';
    remove.disabled = isManaged('schedule');
    remove.addEventListener('click', () => {
      draft.schedule.windows.splice(index, 1);
      renderWindows();
      markDirty();
    });

    row.append(start, document.createTextNode('to'), end, remove);
    host.appendChild(row);
  });

  if (!draft.schedule.windows.length) {
    const empty = document.createElement('p');
    empty.className = 'small muted';
    empty.textContent = 'No windows configured — with the schedule on, mail stays blocked all day.';
    host.appendChild(empty);
  }
}

function renderDevices() {
  const body = $('deviceRows');
  body.textContent = '';

  if (!draft.device.approved.length) {
    const row = body.insertRow();
    const cell = row.insertCell();
    cell.colSpan = 4;
    cell.className = 'muted small';
    cell.textContent = 'No devices approved yet.';
    return;
  }

  draft.device.approved.forEach((device, index) => {
    const row = body.insertRow();
    row.insertCell().textContent = device.label || '—';

    const idCell = row.insertCell();
    idCell.className = 'mono';
    idCell.textContent = device.id;
    if (device.id === state.device.id) {
      const tag = document.createElement('span');
      tag.className = 'pill info';
      tag.textContent = 'this device';
      idCell.append(' ', tag);
    }

    row.insertCell().textContent = device.addedAt ? device.addedAt.slice(0, 10) : '—';

    const actions = row.insertCell();
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'danger';
    remove.textContent = 'Remove';
    remove.disabled = isManaged('device');
    remove.addEventListener('click', () => {
      draft.device.approved.splice(index, 1);
      renderDevices();
      markDirty();
    });
    actions.appendChild(remove);
  });
}

function renderAudit(entries) {
  const body = $('auditRows');
  body.textContent = '';

  if (!entries.length) {
    const row = body.insertRow();
    const cell = row.insertCell();
    cell.colSpan = 6;
    cell.className = 'muted small';
    cell.textContent = 'Nothing logged yet.';
    return;
  }

  for (const entry of [...entries].reverse()) {
    const row = body.insertRow();
    row.insertCell().textContent = new Date(entry.at).toLocaleString();

    const result = row.insertCell();
    const pill = document.createElement('span');
    pill.className = `pill ${entry.result === 'allowed' ? 'ok' : entry.result === 'monitor' ? 'warn' : 'bad'}`;
    pill.textContent = entry.result;
    result.appendChild(pill);

    row.insertCell().textContent = entry.reason || entry.code || '';
    row.insertCell().textContent = entry.account || '';
    row.insertCell().textContent = entry.device || '';
    row.insertCell().textContent = entry.ip || '';
  }
}

// ---------------------------------------------------------------------------
// Rendering the whole page
// ---------------------------------------------------------------------------

function renderStatus() {
  const pill = $('statusPill');
  if (!draft.enabled) {
    pill.className = 'pill bad';
    pill.textContent = 'Guard off';
  } else if (draft.mode === 'monitor') {
    pill.className = 'pill warn';
    pill.textContent = 'Monitor only';
  } else {
    pill.className = 'pill ok';
    pill.textContent = 'Enforcing';
  }

  $('managedBanner').hidden = !state.managed;
  if (state.managed) {
    $('managedList').textContent = `Locked sections: ${state.managedKeys.join(', ')}.`;
  }

  $('pinState').textContent = state.hasPin
    ? 'A PIN is set. Anyone opening this page must enter it.'
    : 'No PIN is set yet — anyone using this laptop can change these settings.';

  $('thisDeviceId').textContent = state.device.id;
  $('thisDeviceCreated').textContent = state.device.createdAt
    ? new Date(state.device.createdAt).toLocaleString()
    : '—';
  $('deviceLabel').value = state.device.label || '';

  const net = state.network || {};
  $('currentIp').textContent = !draft.network.enabled
    ? 'network check is off'
    : net.known
      ? net.ip
      : `unknown (${net.error || 'not looked up yet'})`;

  const hasIdentity = state.permissions.includes('identity.email');
  $('identityState').textContent = hasIdentity
    ? `Permission granted. Current profile: ${state.profileEmail || 'not signed in'}.`
    : 'Chrome must be allowed to read the profile email before this rule can work.';
  $('grantIdentity').hidden = hasIdentity;

  const hasDownloads = state.permissions.includes('downloads');
  $('downloadsState').textContent = hasDownloads
    ? 'Downloads permission granted.'
    : 'Grant the downloads permission, otherwise this setting does nothing.';
  $('grantDownloads').hidden = hasDownloads;
}

function renderAll() {
  writeInputs();
  renderDays();
  renderWindows();
  renderDevices();
  renderStatus();
}

// ---------------------------------------------------------------------------
// Loading and saving
// ---------------------------------------------------------------------------

async function loadState() {
  const response = await chrome.runtime.sendMessage({ type: MSG.GET_STATE });
  if (!response?.ok) throw new Error(response?.error || 'Guard is not responding');
  state = response;
  draft = structuredClone(state.policy);
  delete draft.adminPin; // The hash is never edited through the form.
  return state;
}

async function save() {
  const patch = structuredClone(draft);
  delete patch.adminPin;
  const response = await chrome.runtime.sendMessage({ type: MSG.SAVE_POLICY, patch });
  if (!response?.ok) {
    alert(response?.error || 'Could not save.');
    return;
  }
  dirty = false;
  $('saveBar').hidden = true;
  await loadState();
  renderAll();
}

async function refreshAudit() {
  const response = await chrome.runtime.sendMessage({ type: MSG.GET_AUDIT });
  renderAudit(response?.entries || []);
}

// ---------------------------------------------------------------------------
// Wiring
// ---------------------------------------------------------------------------

function wireTabs() {
  for (const tab of $$('.tab')) {
    tab.addEventListener('click', () => {
      $$('.tab').forEach((t) => t.classList.toggle('active', t === tab));
      $$('.panel').forEach((p) =>
        p.classList.toggle('active', p.dataset.panel === tab.dataset.panel),
      );
      if (tab.dataset.panel === 'audit') refreshAudit();
    });
  }
}

function wireButtons() {
  $('save').addEventListener('click', save);

  $('discard').addEventListener('click', async () => {
    await loadState();
    renderAll();
    dirty = false;
    $('saveBar').hidden = true;
  });

  $('lockBtn').addEventListener('click', async () => {
    await chrome.runtime.sendMessage({ type: MSG.LOCK_ADMIN });
    location.reload();
  });

  $('saveDeviceLabel').addEventListener('click', async () => {
    await chrome.runtime.sendMessage({ type: MSG.GET_DEVICE, label: $('deviceLabel').value });
    await loadState();
    renderAll();
  });

  $('approveThis').addEventListener('click', () => {
    if (draft.device.approved.some((d) => d.id === state.device.id)) return;
    draft.device.approved.push({
      id: state.device.id,
      label: $('deviceLabel').value || state.device.label || 'This device',
      addedAt: new Date().toISOString(),
    });
    renderDevices();
    markDirty();
  });

  $('addDevice').addEventListener('click', () => {
    const id = $('newDeviceId').value.trim();
    if (!id) return;
    if (draft.device.approved.some((d) => d.id === id)) return;
    draft.device.approved.push({
      id,
      label: $('newDeviceLabel').value.trim(),
      addedAt: new Date().toISOString(),
    });
    $('newDeviceId').value = '';
    $('newDeviceLabel').value = '';
    renderDevices();
    markDirty();
  });

  $('addWindow').addEventListener('click', () => {
    draft.schedule.windows.push({ start: '09:30', end: '19:00' });
    renderWindows();
    markDirty();
  });

  $('refreshIp').addEventListener('click', async () => {
    const response = await chrome.runtime.sendMessage({ type: MSG.REFRESH_NETWORK });
    state.network = response?.network || state.network;
    renderStatus();
  });

  $('addCurrentIp').addEventListener('click', () => {
    const ip = state.network?.ip;
    if (!ip) return;
    if (!draft.network.allowedIps.includes(ip)) draft.network.allowedIps.push(ip);
    writeInputs();
    markDirty();
  });

  $('grantIdentity').addEventListener('click', async () => {
    await chrome.permissions.request({ permissions: ['identity.email'] });
    await loadState();
    renderAll();
  });

  $('grantDownloads').addEventListener('click', async () => {
    await chrome.permissions.request({ permissions: ['downloads'] });
    await loadState();
    renderAll();
  });

  $('savePin').addEventListener('click', async () => {
    const pin = $('newPin').value;
    if (pin !== $('newPin2').value) {
      alert('The two PINs do not match.');
      return;
    }
    if (pin.length < 4) {
      alert('PIN must be at least 4 characters.');
      return;
    }
    const response = await chrome.runtime.sendMessage({ type: MSG.SET_PIN, pin });
    if (!response?.ok) {
      alert(response?.error || 'Could not set the PIN.');
      return;
    }
    $('newPin').value = '';
    $('newPin2').value = '';
    await loadState();
    renderStatus();
  });

  $('clearPin').addEventListener('click', async () => {
    if (!confirm('Remove the admin PIN? Anyone on this laptop will be able to change the rules.')) {
      return;
    }
    await chrome.runtime.sendMessage({ type: MSG.SET_PIN, pin: '' });
    await loadState();
    renderStatus();
  });

  $('exportPolicy').addEventListener('click', () => {
    const copy = structuredClone(draft);
    delete copy.adminPin;
    $('policyJson').value = JSON.stringify(copy, null, 2);
  });

  $('importPolicy').addEventListener('click', () => {
    try {
      const parsed = JSON.parse($('policyJson').value);
      if (!parsed || typeof parsed !== 'object') throw new Error('Not an object');
      delete parsed.adminPin;
      draft = { ...draft, ...parsed };
      renderAll();
      markDirty();
    } catch (error) {
      alert(`That is not valid policy JSON: ${error.message}`);
    }
  });

  $('resetPolicy').addEventListener('click', () => {
    if (!confirm('Reset every setting on this device back to the defaults?')) return;
    const fresh = defaultPolicy();
    delete fresh.adminPin;
    draft = fresh;
    renderAll();
    markDirty();
  });

  $('exportCsv').addEventListener('click', async () => {
    const response = await chrome.runtime.sendMessage({ type: MSG.GET_AUDIT });
    const csv = auditToCsv(response?.entries || []);
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `zoho-mail-guard-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  });

  $('clearLog').addEventListener('click', async () => {
    if (!confirm('Delete the audit log on this device?')) return;
    await chrome.runtime.sendMessage({ type: MSG.CLEAR_AUDIT });
    await refreshAudit();
  });

  window.addEventListener('beforeunload', (event) => {
    if (!dirty) return;
    event.preventDefault();
    event.returnValue = '';
  });
}

// ---------------------------------------------------------------------------
// Boot: PIN gate first
// ---------------------------------------------------------------------------

async function showApp() {
  $('lock').hidden = true;
  $('app').hidden = false;
  await loadState();
  bindInputs();
  wireTabs();
  wireButtons();
  renderAll();
  refreshAudit();
}

$('lockForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const response = await chrome.runtime.sendMessage({
    type: MSG.UNLOCK_ADMIN,
    pin: $('pinInput').value,
  });
  if (response?.unlocked) {
    await showApp();
  } else {
    $('lockError').hidden = false;
    $('lockError').textContent = 'Wrong PIN.';
    $('pinInput').select();
  }
});

(async function boot() {
  const initial = await chrome.runtime.sendMessage({ type: MSG.GET_STATE });
  if (!initial?.ok) {
    $('lockError').hidden = false;
    $('lockError').textContent = 'Guard is not responding. Reload the extension.';
    return;
  }
  if (!initial.hasPin) {
    // First run: no PIN configured yet, so let the admin straight in to set one.
    await chrome.runtime.sendMessage({ type: MSG.UNLOCK_ADMIN, pin: '' });
    await showApp();
  } else if (initial.adminUnlocked) {
    // The admin session from a recent unlock is still valid.
    await showApp();
  }
})();
