# Zoho Mail Guard

A Chrome extension that controls **where your company's Zoho mailbox may be opened** —
which laptop, which Chrome profile, which network, at what hours, and with which account.

Built for a company whose email is hosted on Zoho Mail and who wants a new mailbox to
be usable on company laptops only.

---

## Shuruaat (Hinglish quick start)

1. `chrome://extensions` kholo → top-right **Developer mode** ON → **Load unpacked** →
   is folder ko select karo.
2. Toolbar me shield icon pin karo, uspe click → **Admin settings**.
3. **General** tab: ek **Admin PIN** set karo (warna koi bhi settings badal sakta hai).
4. **Accounts** tab: `Allowed email domains` me apni company ka domain daalo, e.g. `yourcompany.com`.
5. **Devices** tab: har company laptop par extension install karke **Approve this device**
   dabao, phir `Only approved devices...` checkbox ON karo.
6. Pehle hafte **General → Mode → Monitor only** rakho. Audit log dekho. Sab theek lage
   toh **Enforce** kar do.
7. Asli takat ke liye [`docs/ZOHO-ADMIN-SETUP.md`](docs/ZOHO-ADMIN-SETUP.md) aur
   [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) dono follow karo — extension akela kaafi nahi hai.

---

## Read this before you rely on it

An extension runs **inside one browser on one machine**. On its own it does not stop
someone from opening the same mailbox in Firefox, on a phone, or through IMAP in Outlook.

It becomes a real control only in combination with two other things:

| Layer | Does the real work | Where |
|---|---|---|
| **1. Zoho Mail admin** | IP restrictions, IMAP/POP off, 2FA, session control, MDM | [`docs/ZOHO-ADMIN-SETUP.md`](docs/ZOHO-ADMIN-SETUP.md) |
| **2. Chrome enterprise policy** | Force-installs this extension so it cannot be removed, blocks Incognito, pushes the rules | [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) |
| **3. This extension** | Per-device, per-account, per-hour rules that Zoho itself does not offer | this repo |

Deployed as "load unpacked, hope nobody removes it", this is a **guardrail**, not a
security boundary. Force-installed through Chrome policy, with Zoho's own IP and
protocol restrictions behind it, it is a genuine control.

---

## What the extension enforces

| Rule | What it does |
|---|---|
| **Company accounts only** | Blocks any mailbox outside your domains, and refuses to submit a personal address on the Zoho sign-in page. |
| **Approved devices** | Each install gets a device ID; only IDs on the approved list may open mail. |
| **Chrome profile** | Blocks Incognito and Guest windows; optionally restricts to named work profiles. |
| **Working hours** | Days, time windows (including overnight shifts), holidays, in a timezone you choose. |
| **Office network** | Compares the machine's public IP against your allowed IPs / CIDR ranges. |
| **Attachment downloads** | Cancels downloads started from a mail tab. |
| **Copy / print** | Blocks copy-cut in the mail UI (compose box stays usable) and blocks printing. |
| **Watermark** | Diagonal `account · device` overlay, so screenshots carry their source. |
| **Audit log** | Every block (and optionally every allowed opening) recorded locally, exportable as CSV. |
| **Monitor mode** | Log what *would* be blocked without blocking anything — the safe way to start. |
| **Admin PIN** | Settings page is locked behind a PBKDF2-hashed PIN, 10-minute unlock sessions. |

Blocked users see a page that names the failing rule, what to do about it, their
device ID, and your IT contact — not a generic error.

---

## How it works

```
navigation to *.zoho.* ──▶ service worker ──▶ evaluateAccess(policy, context)
                                                     │
        content script reports the signed-in mailbox ┘
                                                     │
                              allowed ──────────────▶ page loads (+ watermark, restrictions)
                              blocked ──────────────▶ tab redirected to blocked.html
                              monitor ──────────────▶ page loads, audit log records the would-be block
```

Every rule lives in one pure function, `evaluateAccess()` in
[`src/common/evaluate.js`](src/common/evaluate.js). It takes a policy and a context and
returns a decision plus the list of checks that ran — that same list is what the popup
shows the user. No `chrome.*` calls inside it, which is why it is unit-testable.

Policy precedence: **defaults < local settings page < enterprise managed policy**.
Anything IT pushes wins and appears read-only in the options page.

### Layout

```
manifest.json               MV3 manifest
src/common/                 policy defaults, the engine, storage, PIN hashing, audit log
src/background/             service worker: navigation guard, downloads guard, messaging
src/content/                account detection, sign-in guard, watermark, copy/print block
src/pages/                  blocked page, popup, admin options page
policies/                   managed-storage schema + ready-made Windows/macOS/Linux policy files
tools/                      icon generator, zip packager
tests/                      unit tests for the engine (node --test)
docs/                       Zoho admin setup, Chrome enterprise deployment
```

---

## Install for testing

```bash
git clone <this repo>            # or just download the folder
# chrome://extensions → Developer mode → Load unpacked → select this folder
```

Nothing to build; there is no bundler and no dependencies.

## Package for distribution

```bash
npm run package        # → dist/zoho-mail-guard-<version>.zip
```

Upload that zip to the Chrome Web Store as an **unlisted** or **private** item, or host
it yourself — see [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

## Tests

```bash
npm test               # unit tests: node --test, no dependencies
npm run test:e2e       # end-to-end in a real Chromium (needs Playwright)
```

The unit tests cover host matching, account rules, overnight/timezone/holiday schedules,
CIDR matching, fail-open behaviour, monitor mode, policy normalisation and CSV escaping.

The end-to-end test loads the unpacked extension into Chromium, serves a fake mailbox and
points `mail.zoho.com` at it, then checks that an unapproved device and a personal account
really are redirected to the blocked page, that monitor mode lets the page through, and
that the audit log records both. On a headless machine run it as
`xvfb-run -a npm run test:e2e` — Chromium only loads extensions in headed mode.

## Regenerate the icons

```bash
npm run icons          # python3 tools/make-icons.py
```

---

## Privacy

Everything stays on the device. The extension has no server, sends no telemetry, and the
audit log lives in `chrome.storage.local` until an admin exports or clears it. The only
outbound request it ever makes is the public-IP lookup, and only when the network rule is
switched on — point `network.lookupUrl` at your own endpoint if you would rather not use
a third party.
