/**
 * Content script running on every Zoho page.
 *
 * Three jobs:
 *   1. Tell the service worker which mailbox is signed in (so the account rule works).
 *   2. Stop a personal account from being typed into the Zoho sign-in page.
 *   3. Apply the on-page restrictions: watermark, copy block, print block.
 *
 * Plain script (no modules) because content scripts are not loaded as ESM.
 */
(() => {
  'use strict';

  const MSG = {
    GET_STATE: 'guard:getState',
    REPORT_ACCOUNT: 'guard:reportAccount',
    POLICY_CHANGED: 'guard:policyChanged',
  };
  const EMAIL_RE = /\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/i;
  const SCAN_INTERVAL_MS = 4000;

  let policy = null;
  let lastReported = '';
  let overlayEl = null;
  /** 'mail' | 'signin' | 'none' — which rules apply to the page we are on. */
  let scope = 'none';

  const send = (message) =>
    new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage(message, (response) => {
          void chrome.runtime.lastError;
          resolve(response || null);
        });
      } catch {
        resolve(null); // Extension reloaded / context invalidated.
      }
    });

  // -------------------------------------------------------------------------
  // Scope: this script is injected on every Zoho host, but only mailbox pages
  // get watermarked and restricted. Zoho CRM, Books and the marketing site
  // share those hostnames and must be left completely alone.
  // -------------------------------------------------------------------------

  function hostMatches(host, pattern) {
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

  function currentScope() {
    const host = location.hostname;
    if ((policy.protectedHosts || []).some((p) => hostMatches(host, p))) return 'mail';
    if ((policy.signinHosts || []).some((p) => hostMatches(host, p))) return 'signin';
    return 'none';
  }

  // -------------------------------------------------------------------------
  // Account detection
  // -------------------------------------------------------------------------

  function firstEmailIn(text) {
    const match = String(text || '').match(EMAIL_RE);
    return match ? match[0].toLowerCase() : '';
  }

  /** Look through the configured selectors, then a bounded generic sweep. */
  function detectAccount() {
    const selectors = policy?.accountSelectors || [];
    for (const selector of selectors) {
      let nodes = [];
      try {
        nodes = document.querySelectorAll(selector);
      } catch {
        continue; // Bad selector pushed by policy — ignore it.
      }
      for (const node of nodes) {
        const email =
          firstEmailIn(node.getAttribute?.('data-zmuser')) ||
          firstEmailIn(node.getAttribute?.('title')) ||
          firstEmailIn(node.getAttribute?.('aria-label')) ||
          firstEmailIn(node.textContent);
        if (email) return email;
      }
    }

    // Fallback: the mailbox almost always appears in the top chrome of the page.
    const header = document.querySelector('header, #zmailheader, [role="banner"]');
    const fromHeader = firstEmailIn(header?.innerText);
    if (fromHeader) return fromHeader;

    return firstEmailIn(document.title);
  }

  async function reportAccount() {
    if (!policy || scope === 'none') return;
    const account = detectAccount();
    if (account === lastReported) return;
    lastReported = account;
    await send({ type: MSG.REPORT_ACCOUNT, account });
  }

  // -------------------------------------------------------------------------
  // Sign-in page: refuse a non-company account before the login is attempted
  // -------------------------------------------------------------------------

  const LOGIN_SELECTORS = [
    '#login_id',
    'input[name="LOGIN_ID"]',
    'input[name="lid"]',
    'input[type="email"]',
    'input[autocomplete="username"]',
  ];

  function loginField() {
    for (const selector of LOGIN_SELECTORS) {
      const el = document.querySelector(selector);
      if (el && el.offsetParent !== null) return el;
    }
    return null;
  }

  function accountAllowed(email) {
    const value = String(email || '')
      .trim()
      .toLowerCase();
    const at = value.lastIndexOf('@');
    if (at <= 0) return true; // Not an email yet (Zoho also accepts a plain username).

    const domain = value.slice(at + 1);
    if (policy.blockedAccounts.includes(value)) return false;
    if (policy.allowedAccounts.includes(value)) return true;
    if (!policy.allowedAccountDomains.length) return true;
    return policy.allowedAccountDomains.some((d) => domain === d || domain.endsWith(`.${d}`));
  }

  function guardSignIn(event) {
    if (scope !== 'signin') return;
    if (!policy?.enabled || policy.mode === 'monitor') return;
    if (!policy.allowedAccountDomains.length && !policy.blockedAccounts.length) return;

    const field = loginField();
    if (!field || !field.value) return;
    if (accountAllowed(field.value)) {
      hideOverlay();
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    const domains = policy.allowedAccountDomains.map((d) => `@${d}`).join(', ');
    showOverlay(
      'Personal account not allowed',
      domains
        ? `Sign in with your company mailbox (${domains}). ${field.value} is not a company account.`
        : `${field.value} is not allowed to sign in on this device.`,
    );
  }

  function installSignInGuard() {
    document.addEventListener('submit', guardSignIn, true);
    document.addEventListener(
      'keydown',
      (event) => {
        if (event.key === 'Enter') guardSignIn(event);
      },
      true,
    );
    document.addEventListener(
      'click',
      (event) => {
        const target = event.target instanceof Element ? event.target : null;
        if (!target) return;
        const button = target.closest('button, input[type="submit"], [role="button"], .zbutton');
        if (button) guardSignIn(event);
      },
      true,
    );
  }

  // -------------------------------------------------------------------------
  // On-page restrictions
  // -------------------------------------------------------------------------

  function applyRestrictions() {
    const root = document.documentElement;
    if (scope !== 'mail' || !policy?.enabled || policy.mode === 'monitor') {
      root.classList.remove('zmg-block-print');
      removeWatermark();
      return;
    }

    root.classList.toggle('zmg-block-print', Boolean(policy.restrictions.blockPrint));

    if (policy.restrictions.watermark) drawWatermark();
    else removeWatermark();
  }

  function watermarkText() {
    const template = policy.restrictions.watermarkText || 'CONFIDENTIAL';
    return template
      .replace('{account}', lastReported || 'unknown account')
      .replace('{device}', guardState?.device?.label || shortId(guardState?.device?.id));
  }

  function shortId(id) {
    return id ? String(id).slice(0, 8).toUpperCase() : 'this device';
  }

  function drawWatermark() {
    if (!document.body) return;
    let layer = document.getElementById('zmg-watermark');
    if (!layer) {
      layer = document.createElement('div');
      layer.id = 'zmg-watermark';
      layer.setAttribute('aria-hidden', 'true');
      document.body.appendChild(layer);
    }
    const text = watermarkText();
    if (layer.dataset.text === text) return;
    layer.dataset.text = text;
    layer.textContent = '';
    for (let i = 0; i < 60; i += 1) {
      const span = document.createElement('span');
      span.textContent = text;
      layer.appendChild(span);
    }
  }

  function removeWatermark() {
    document.getElementById('zmg-watermark')?.remove();
  }

  function installClipboardGuard() {
    for (const type of ['copy', 'cut']) {
      document.addEventListener(
        type,
        (event) => {
          if (scope !== 'mail' || !policy?.enabled || policy.mode === 'monitor') return;
          if (!policy.restrictions.blockCopy) return;
          const target = event.target;
          // Let people still copy inside their own compose box.
          if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;
          event.preventDefault();
          event.stopPropagation();
          toast('Copying from company mail is disabled on this device.');
        },
        true,
      );
    }

    document.addEventListener(
      'keydown',
      (event) => {
        if (scope !== 'mail' || !policy?.enabled || policy.mode === 'monitor') return;
        if (!policy.restrictions.blockPrint) return;
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'p') {
          event.preventDefault();
          event.stopPropagation();
          toast('Printing company mail is disabled on this device.');
        }
      },
      true,
    );
  }

  // -------------------------------------------------------------------------
  // Small UI helpers
  // -------------------------------------------------------------------------

  function showOverlay(title, body) {
    if (!document.body) return;
    if (!overlayEl) {
      overlayEl = document.createElement('div');
      overlayEl.id = 'zmg-overlay';
      overlayEl.innerHTML =
        '<div class="zmg-card"><h1></h1><p></p><button type="button">Understood</button></div>';
      overlayEl.querySelector('button').addEventListener('click', hideOverlay);
      document.body.appendChild(overlayEl);
    }
    overlayEl.querySelector('h1').textContent = title;
    overlayEl.querySelector('p').textContent = body;
    overlayEl.classList.add('zmg-visible');
  }

  function hideOverlay() {
    overlayEl?.classList.remove('zmg-visible');
  }

  let toastTimer = null;
  function toast(text) {
    if (!document.body) return;
    let el = document.getElementById('zmg-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'zmg-toast';
      document.body.appendChild(el);
    }
    el.textContent = text;
    el.classList.add('zmg-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('zmg-visible'), 3000);
  }

  // -------------------------------------------------------------------------
  // Boot
  // -------------------------------------------------------------------------

  let guardState = null;

  async function loadState() {
    const response = await send({ type: MSG.GET_STATE });
    if (!response?.ok) return false;
    guardState = response;
    policy = response.policy;
    scope = currentScope();
    return true;
  }

  async function tick() {
    if (!policy || scope === 'none') return;
    await reportAccount();
    applyRestrictions();
  }

  let started = false;

  async function start() {
    if (!(await loadState())) return;
    if (scope === 'none') return; // Some other Zoho product — not our business.
    if (started) {
      tick();
      return;
    }
    started = true;

    installSignInGuard();
    installClipboardGuard();

    const run = () => {
      tick();
      const observer = new MutationObserver(() => {
        clearTimeout(observer._t);
        observer._t = setTimeout(tick, 500);
      });
      observer.observe(document.documentElement, { childList: true, subtree: true });
      setInterval(tick, SCAN_INTERVAL_MS);
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', run, { once: true });
    } else {
      run();
    }
  }

  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type === MSG.POLICY_CHANGED) {
      if (message.downloadBlocked) toast('Attachment downloads are disabled on this device.');
      // A policy change can bring this host into scope, so go through start() again.
      start();
    }
  });

  start();
})();
