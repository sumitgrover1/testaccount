/** The page a user lands on when a rule says no. */
import { CODE, CODE_TEXT, MSG } from '../common/constants.js';

const params = new URLSearchParams(location.search);
const code = params.get('code') || 'BLOCKED';
const reason = params.get('reason') || 'Access is not allowed from here.';
const blockedUrl = params.get('url') || '';

const text = (id, value) => {
  document.getElementById(id).textContent = value;
};

/** Next steps tailored to the rule that actually failed. */
const STEPS = {
  [CODE.INCOGNITO]: [
    'Close this Incognito or Guest window.',
    'Open company mail in your normal, signed-in Chrome profile.',
  ],
  [CODE.DEVICE_NOT_APPROVED]: [
    'Company mail only opens on laptops your IT team has approved.',
    'Send the Device ID below to IT and ask them to add this machine.',
  ],
  [CODE.PROFILE_NOT_ALLOWED]: [
    'Switch to your company Chrome profile (top-right avatar → your work profile).',
    'If you are already in it, ask IT to add your profile address to the allow list.',
  ],
  [CODE.OUTSIDE_SCHEDULE]: [
    'Company mail is open only during the working hours your organisation has set.',
    'Try again inside those hours, or ask IT for an exception if this is urgent.',
  ],
  [CODE.HOLIDAY]: [
    'Today is marked as a non-working day, so company mail is switched off.',
    'Contact IT if you need access for something urgent.',
  ],
  [CODE.NETWORK_NOT_ALLOWED]: [
    'Connect to the office Wi-Fi, or start the company VPN, then reload.',
    'Mobile hotspots and home broadband are not on the approved list.',
  ],
  [CODE.ACCOUNT_NOT_ALLOWED]: [
    'Sign out of the personal Zoho account and sign in with your company mailbox.',
    'Personal mail can still be used in a different browser profile.',
  ],
};

const DEFAULT_STEPS = [
  'Reload the page once — some checks (like the network check) refresh every few minutes.',
  'If it keeps failing, send the details below to your IT team.',
];

async function render() {
  text('reason', reason);
  text('code', code.replace(/_/g, ' '));
  text('explain', CODE_TEXT[code] || 'A company access rule stopped this page from loading.');
  text('url', blockedUrl);
  text('time', new Date().toLocaleString());
  text('device', params.get('device') || 'this device');
  text('deviceId', params.get('deviceId') || '—');
  text('account', params.get('account') || 'not detected');

  const list = document.getElementById('steps');
  for (const step of STEPS[code] || DEFAULT_STEPS) {
    const li = document.createElement('li');
    li.textContent = step;
    list.appendChild(li);
  }

  const state = await chrome.runtime.sendMessage({ type: MSG.GET_STATE }).catch(() => null);
  const contact = state?.policy?.contact;
  if (contact) {
    const parts = [];
    if (contact.supportName) parts.push(`Contact ${contact.supportName}`);
    if (contact.supportEmail) parts.push(contact.supportEmail);
    if (contact.note) parts.push(contact.note);
    text('contact', parts.join(' · '));
  }
}

document.getElementById('retry').addEventListener('click', async () => {
  await chrome.runtime.sendMessage({ type: MSG.REFRESH_NETWORK }).catch(() => {});
  if (blockedUrl) location.replace(blockedUrl);
  else location.reload();
});

document.getElementById('copy').addEventListener('click', async () => {
  const lines = [
    'Zoho Mail Guard — blocked access',
    `Code:      ${code}`,
    `Reason:    ${reason}`,
    `Device:    ${params.get('device') || ''}`,
    `Device ID: ${params.get('deviceId') || ''}`,
    `Account:   ${params.get('account') || ''}`,
    `Address:   ${blockedUrl}`,
    `Time:      ${new Date().toISOString()}`,
  ];
  await navigator.clipboard.writeText(lines.join('\n'));
  const button = document.getElementById('copy');
  button.textContent = 'Copied';
  setTimeout(() => {
    button.textContent = 'Copy details for IT';
  }, 2000);
});

render();
