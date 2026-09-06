# Chrome side: deploy the extension so it cannot simply be removed

Loading the extension by hand is fine for a pilot. For real control it has to be
**force-installed by policy**: then the user cannot disable it, cannot remove it, and
cannot edit its rules — even the settings page shows IT's values as read-only.

Three steps: get an extension ID, force-install it, push the rules.

---

## Step 0 — Decide how the extension reaches the laptops

| Option | Good for | Notes |
|---|---|---|
| **Chrome Web Store, unlisted** | Almost everyone | $5 one-time developer fee. Unlisted means it never appears in search; only your policy (or a direct link) installs it. Automatic updates. |
| **Chrome Web Store, private to your domain** | Google Workspace customers | Visible only inside your organisation. |
| **Self-hosted CRX + update URL** | No Web Store account | You host the `.crx` and an `update.xml`; Chrome only accepts this via `ExtensionInstallForcelist`, and you sign and version it yourself. |
| **Load unpacked** | Pilot on 1–2 laptops | The user can remove it. Not a control. |

Build the package with:

```bash
npm run package        # → dist/zoho-mail-guard-<version>.zip
```

Upload that zip to the [Chrome Web Store developer dashboard](https://chrome.google.com/webstore/devconsole),
set visibility to **Unlisted** (or **Private**), and publish. Once published, the URL
contains the **extension ID** — a 32-character string like `abcdefghijklmnopqrstuvwxyzabcdef`.
You need it for everything below.

*(For a pilot, the ID is on `chrome://extensions` with Developer mode on.)*

---

## Step 1 — Set up Chrome Browser Cloud Management (free)

This is the console that pushes policy to Chrome on Windows, macOS and Linux without any
other MDM. It is free and does not require Google Workspace.

1. Go to **https://admin.google.com** and sign up for **Chrome Browser Cloud Management**
   (Menu → Devices → Chrome → Managed browsers). If you have no Google account for the
   company, create one — you are not migrating email, only using the console.
2. **Devices → Chrome → Managed browsers → Enroll**. Download the **enrollment token**.
3. Put the token on each laptop:
   - **Windows** (as Administrator):
     ```
     reg add "HKLM\SOFTWARE\Policies\Google\Chrome\CloudManagementEnrollmentToken" ^
       /ve /t REG_SZ /d "YOUR-ENROLLMENT-TOKEN" /f
     ```
   - **macOS**: add `CloudManagementEnrollmentToken` (string) to the
     `com.google.Chrome` managed preferences, or deploy the profile from Jamf/Intune.
   - **Linux**: create `/etc/opt/chrome/policies/enrollment/CloudManagementEnrollmentToken`
     containing the token.
4. Restart Chrome. The browser appears under **Managed browsers** within a few minutes.
   Confirm on the laptop at `chrome://policy` — it should show the enrollment token and
   "Machine policies" as active.

Group the laptops into an **Organizational Unit** (e.g. `Clinic / Front desk`) so the
policies below apply to the right machines only.

---

## Step 2 — Force-install the extension and close the bypasses

In the Admin console: **Devices → Chrome → Apps & extensions → Users & browsers**, pick
the OU, add the extension by ID, and set **Installation policy → Force install** and
**Pin to toolbar**.

Then under **Devices → Chrome → Settings → Users & browsers**, set:

| Policy | Value | Why |
|---|---|---|
| **Incognito mode** | Disallow | Extensions are off in Incognito unless allowed; disallowing it closes the hole. |
| **Guest mode** | Disallow | A guest profile has no extensions at all. |
| **Browser sign-in** | Force sign-in | Ties the browser to the work profile. |
| **Restrict sign-in to pattern** | `.*@yourcompany\.com` | Stops a personal Google profile from being used. |
| **Developer tools** | Disallow (or "on force-installed extensions" only) | Otherwise the extension's storage can be inspected and edited. |
| **Blocked extensions** | Block VPN/proxy categories | These defeat the IP restriction on the Zoho side. |
| **URL blocklist** *(optional)* | `mail.zoho.com` on non-work OUs | Belt and braces for machines that should never touch mail. |

Same settings, applied by hand instead of the console:

- Windows → [`policies/windows/zoho-mail-guard.reg`](../policies/windows/zoho-mail-guard.reg)
- macOS → [`policies/macos/com.google.Chrome.plist`](../policies/macos/com.google.Chrome.plist)
- Linux → [`policies/linux/chrome-managed-policy.json`](../policies/linux/chrome-managed-policy.json)

Replace `REPLACE_WITH_EXTENSION_ID` in each before use.

---

## Step 3 — Push the guard's own rules

The extension reads enterprise policy from Chrome's **managed storage** under the key
`policy`, described by [`policies/managed-schema.json`](../policies/managed-schema.json).
Anything you push there overrides the local settings page and appears there greyed out.

Easiest way to build the payload:

1. Configure everything the way you want it on **one** laptop through the options page.
2. **Advanced → Export policy JSON**, copy the result.
3. Paste it as the value of `policy` in your platform's policy file
   (see [`policies/example-policy.json`](../policies/example-policy.json) for the shape).

In the Cloud Management console, use **Apps & extensions → the extension → Policy for
extensions** and paste the JSON object there.

A realistic starting policy:

```json
{
  "policy": {
    "enabled": true,
    "mode": "monitor",
    "allowedAccountDomains": ["yourcompany.com"],
    "device": { "required": false, "approved": [] },
    "profile": { "blockIncognito": true },
    "schedule": {
      "enabled": true,
      "timezone": "Asia/Kolkata",
      "days": [1, 2, 3, 4, 5, 6],
      "windows": [{ "start": "09:00", "end": "20:30" }]
    },
    "contact": { "supportName": "IT Helpdesk", "supportEmail": "it@yourcompany.com" },
    "audit": { "enabled": true, "logAllowed": true, "maxEntries": 1000 }
  }
}
```

Note `"mode": "monitor"` and `"logAllowed": true` — start there.

---

## Step 4 — Collect the device IDs

The device rule needs each laptop's ID:

1. Install the extension on the laptop (force-install does this automatically).
2. Open the popup → **Copy Device ID**, or read it in the options page under **Devices**.
3. Add each one to `device.approved` in the policy, with a label you will recognise
   (`"Reception laptop — Dell 5410"`), then set `device.required` to `true`.

For a small fleet it is quicker to visit each laptop once. For a larger one, ask staff to
paste the ID into a form on their first day — the blocked page shows it too, so anyone who
gets blocked can send it to you without help.

---

## Rollout plan that doesn't cause a support storm

| Week | Do this |
|---|---|
| 1 | Force-install with `mode: "monitor"` and `logAllowed: true`. Nothing is blocked. |
| 2 | Read the audit logs. Every entry marked `monitor` is something you *would* have broken — fix the policy, not the person. |
| 3 | Switch to `"enforce"` with only the account rule and Incognito block on. |
| 4 | Turn on the device rule once every legitimate laptop's ID is in the list. |
| 5 | Add the schedule, then the network rule (with `failOpen: true`). |
| 6+ | Consider the data-leak controls: downloads, copy, print, watermark. |

Turn on the network rule **last** and keep `failOpen: true` until you have watched it for
a week — a lookup outage with `failOpen: false` locks out everybody at once.

---

## Verifying it works

On a managed laptop:

- `chrome://policy` → **Reload policies** → the extension's `policy` value appears under
  its ID with **Status: OK**. A red "Schema validation error" means the JSON doesn't match
  `managed-schema.json`.
- `chrome://extensions` → the extension shows **Installed by enterprise policy** and has
  no Remove button.
- Options page → the blue "Managed by enterprise policy" banner names the locked sections.
- Popup → open the mailbox and check each rule shows ✓.

Test the blocks deliberately, one at a time:

| Rule | How to test |
|---|---|
| Account | Sign in with a personal Zoho account. |
| Device | Change `device.approved` to a wrong ID and reload the mail tab. |
| Incognito | Ctrl+Shift+N and open the mailbox. |
| Schedule | Set a window that has already passed today. |
| Network | Put an IP that isn't yours in `allowedIps` with `failOpen: false`. |

---

## Known limits — state these to whoever signs off

- **Other browsers.** Policy and extension are Chrome-only. Block or uninstall Firefox and
  Edge on company laptops, or repeat the exercise for each browser.
- **Local admin rights.** A user who is a local administrator can edit the registry or the
  managed-preferences file. Take away local admin, or accept the gap.
- **The device ID is storage, not hardware.** Reinstalling the extension generates a new
  one. This only matters if the user can uninstall it — which force-install prevents.
- **Screenshots and phone cameras.** The watermark makes a leak traceable; nothing makes it
  impossible.
- **The mailbox itself.** Everything here protects the browser. Zoho's own restrictions
  ([`ZOHO-ADMIN-SETUP.md`](ZOHO-ADMIN-SETUP.md)) protect the mailbox. You need both.
