/** Toolbar popup: why is this tab allowed or blocked, and what is this device. */
import { CODE, MSG } from '../common/constants.js';

const $ = (id) => document.getElementById(id);

function setPill(el, kind, label) {
  el.className = `pill ${kind}`;
  el.textContent = label;
}

async function currentTabId() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.id;
}

async function render() {
  const tabId = await currentTabId();
  const state = await chrome.runtime.sendMessage({ type: MSG.GET_STATE, tabId });
  if (!state?.ok) {
    $('tabReason').textContent = 'Guard is not responding. Try reloading the extension.';
    return;
  }

  const { policy, device, decision, network, account, managed } = state;

  if (!policy.enabled) setPill($('modePill'), 'bad', 'Guard off');
  else if (policy.mode === 'monitor') setPill($('modePill'), 'warn', 'Monitor only');
  else setPill($('modePill'), 'ok', 'Enforcing');

  if (!decision || decision.code === CODE.NOT_PROTECTED) {
    setPill($('tabPill'), 'info', 'Not company mail');
    $('tabReason').textContent = 'This page is not a protected Zoho Mail address.';
  } else if (decision.wouldBlock && decision.monitorOnly) {
    setPill($('tabPill'), 'warn', 'Would block');
    $('tabReason').textContent =
      `${decision.reason} — logged only, because the guard is in monitor mode.`;
  } else if (decision.wouldBlock) {
    setPill($('tabPill'), 'bad', 'Blocked');
    $('tabReason').textContent = decision.reason;
  } else {
    setPill($('tabPill'), 'ok', 'Allowed');
    $('tabReason').textContent = decision.reason;
  }

  const list = $('checks');
  list.textContent = '';
  for (const check of decision?.checks || []) {
    const li = document.createElement('li');
    li.className = check.ok ? 'pass' : 'fail';
    li.innerHTML =
      '<span class="mark"></span><span class="rule"></span><span class="detail"></span>';
    li.querySelector('.mark').textContent = check.ok ? '✓' : '✕';
    li.querySelector('.rule').textContent = check.rule;
    li.querySelector('.detail').textContent = check.reason;
    list.appendChild(li);
  }

  $('deviceLabel').textContent = device.label || 'Unnamed device';
  $('deviceId').textContent = device.id;
  $('account').textContent = account || 'not detected';
  $('network').textContent = !policy.network.enabled
    ? 'check off'
    : network.known
      ? network.ip
      : `unknown (${network.error || 'lookup failed'})`;

  $('managedNote').textContent = managed ? 'Managed by IT policy' : '';
  $('copyId').dataset.id = device.id;
}

$('options').addEventListener('click', () => chrome.runtime.openOptionsPage());

$('copyId').addEventListener('click', async (event) => {
  await navigator.clipboard.writeText(event.currentTarget.dataset.id || '');
  event.currentTarget.textContent = 'Copied';
  setTimeout(() => {
    event.currentTarget.textContent = 'Copy Device ID';
  }, 1800);
});

$('recheck').addEventListener('click', async () => {
  $('recheck').disabled = true;
  await chrome.runtime.sendMessage({ type: MSG.REFRESH_NETWORK }).catch(() => {});
  await render();
  $('recheck').disabled = false;
});

render();
