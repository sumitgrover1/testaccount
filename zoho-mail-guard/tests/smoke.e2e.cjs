/**
 * End-to-end smoke test: loads the unpacked extension into a real Chromium and
 * checks that the guard actually redirects a tab.
 *
 *   npm run test:e2e            (needs Playwright; on a headless box: xvfb-run -a npm run test:e2e)
 *
 * A fake mailbox is served on localhost and Chromium is told to resolve
 * mail.zoho.com to it, so the manifest's real match patterns are exercised
 * rather than a stand-in host.
 */
const http = require('http');
const os = require('os');
const path = require('path');
const fs = require('fs');
const { createRequire } = require('module');

const EXT = path.resolve(__dirname, '..');
const PORT = 8899;
const ORIGIN = `http://mail.zoho.com:${PORT}`;
const FAKE_MAILBOX = `<!doctype html><title>fake mailbox</title>
<body><h1>inbox</h1><span class="zmUserMailId">staff@company.com</span></body>`;

let failures = 0;
const check = (ok, message) => {
  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${message}`);
};

/** Playwright may be installed globally rather than in this folder. */
function loadPlaywright() {
  const candidates = [
    'playwright',
    '/opt/node22/lib/node_modules/playwright',
    path.join(os.homedir(), '.npm-global/lib/node_modules/playwright'),
  ];
  for (const candidate of candidates) {
    try {
      return createRequire(__filename)(candidate);
    } catch {
      /* try the next one */
    }
  }
  return null;
}

/** Wait until the tab's URL satisfies `predicate`, or give up. */
async function waitForUrl(page, predicate, timeoutMs = 10000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate(page.url())) return true;
    await page.waitForTimeout(250);
  }
  return false;
}

async function openMailbox(page) {
  // Park on a neutral page first so a stale blocked.html cannot be mistaken
  // for the result of this navigation.
  await page.goto('about:blank');
  await page.goto(ORIGIN).catch(() => {});
}

async function setPolicy(page, patch) {
  await page.evaluate(async (update) => {
    const { policy = {} } = await chrome.storage.local.get('policy');
    await chrome.storage.local.set({ policy: { ...policy, ...update } });
  }, patch);
  await page.waitForTimeout(700); // let the storage listener re-guard open tabs
}

(async () => {
  const playwright = loadPlaywright();
  if (!playwright) {
    console.log('SKIP  Playwright is not installed — run: npm i -D playwright');
    process.exit(0);
  }

  const server = http.createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(FAKE_MAILBOX);
  });
  await new Promise((resolve) => server.listen(PORT, '127.0.0.1', resolve));

  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zmg-e2e-'));
  const context = await playwright.chromium.launchPersistentContext(userDataDir, {
    headless: false, // Chromium only loads extensions in headed mode
    args: [
      `--disable-extensions-except=${EXT}`,
      `--load-extension=${EXT}`,
      '--host-resolver-rules=MAP mail.zoho.com 127.0.0.1, MAP accounts.zoho.com 127.0.0.1',
    ],
  });

  try {
    let [worker] = context.serviceWorkers();
    if (!worker) worker = await context.waitForEvent('serviceworker', { timeout: 20000 });
    check(Boolean(worker), 'service worker starts');

    const extId = new URL(worker.url()).host;

    // --- extension pages ---------------------------------------------------
    const options = await context.newPage();
    await options.goto(`chrome-extension://${extId}/src/pages/options.html`);
    await options.waitForSelector('#app:not([hidden])', { timeout: 10000 });
    check(
      (await options.textContent('#statusPill')).includes('Enforcing'),
      'options page opens and defaults to Enforcing',
    );
    check(
      (await options.textContent('#thisDeviceId')).length > 20,
      'a device ID is generated on first run',
    );

    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${extId}/src/pages/popup.html`);
    await popup.waitForSelector('#deviceId');
    check((await popup.textContent('#deviceId')).length > 20, 'popup reports the device ID');

    const blockedPage = await context.newPage();
    await blockedPage.goto(
      `chrome-extension://${extId}/src/pages/blocked.html?code=DEVICE_NOT_APPROVED&reason=test+reason`,
    );
    await blockedPage.waitForSelector('#steps li');
    check(
      (await blockedPage.textContent('#reason')) === 'test reason',
      'blocked page shows the failing reason',
    );
    check(
      (await blockedPage.$$('#steps li')).length === 2,
      'blocked page shows rule-specific next steps',
    );

    // --- the guard on a real navigation ------------------------------------
    await setPolicy(options, {
      enabled: true,
      mode: 'enforce',
      protectedHosts: ['mail.zoho.com'],
      signinHosts: ['accounts.zoho.com'],
      device: { required: false, approved: [] },
      allowedAccountDomains: [],
    });

    const page = await context.newPage();
    await openMailbox(page);
    await page.waitForTimeout(1500);
    check(page.url().startsWith(ORIGIN), 'mailbox opens when every rule passes');

    await setPolicy(options, {
      device: { required: true, approved: [{ id: 'a-different-laptop', label: 'Other' }] },
    });
    await openMailbox(page);
    check(
      await waitForUrl(page, (url) => url.includes('DEVICE_NOT_APPROVED')),
      'an unapproved device is redirected to the blocked page',
    );

    await setPolicy(options, {
      device: { required: false, approved: [] },
      allowedAccountDomains: ['othercorp.com'],
    });
    await openMailbox(page);
    check(
      await waitForUrl(page, (url) => url.includes('ACCOUNT_NOT_ALLOWED')),
      'a non-company mailbox is blocked after the content script reports it',
    );

    await setPolicy(options, { mode: 'monitor' });
    await openMailbox(page);
    await page.waitForTimeout(3000);
    check(!page.url().includes('blocked.html'), 'monitor mode lets the page through');

    // --- audit log ----------------------------------------------------------
    const entries = await options.evaluate(async () => {
      const { auditLog } = await chrome.storage.local.get('auditLog');
      return auditLog || [];
    });
    check(
      entries.some((e) => e.result === 'blocked'),
      'enforced blocks are logged as "blocked"',
    );
    check(
      entries.some((e) => e.result === 'monitor'),
      'monitor-mode blocks are logged as "monitor"',
    );
    check(
      entries.every((e) => !String(e.url).includes('?')),
      'audit log strips query strings from URLs',
    );
  } finally {
    await context.close();
    server.close();
  }

  console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed');
  process.exit(failures ? 1 : 0);
})().catch((error) => {
  console.error('smoke test crashed:', error);
  process.exit(2);
});
