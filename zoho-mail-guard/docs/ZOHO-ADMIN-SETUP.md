# Zoho side: create the mailbox and lock down where it can be used

This is the half that actually stops a mailbox from being opened somewhere you don't
want it. The Chrome extension refines what happens *inside* an approved laptop; the
settings on this page decide whether a login is possible at all.

> Zoho moves menu items between releases and the exact wording differs by plan
> (Mail Lite / Mail Premium / Zoho One / Workplace). Where a path below doesn't match
> what you see, search the Admin Console for the **bold** term — the capability is the
> same, only the label moved. Some controls (IP restriction, MDM, SAML SSO) are not
> available on the free plan.

Admin Console: **https://mailadmin.zoho.com**

---

## 1. Create the new mailbox

1. **Users → Add User.**
2. Fill first/last name and the mail ID, and pick the verified domain from the dropdown.
   (No domain in the list? Finish **Domains → Add domain → verify (TXT/CNAME) → set MX**
   first — a mailbox cannot exist on an unverified domain.)
3. Set a strong temporary password and tick **Force password change on first login**.
4. Assign the licence/plan seat if your plan asks for one.
5. Optional but recommended: put every staff mailbox in a **Group** (e.g. `staff`) so the
   policies below can be applied to the group instead of one user at a time.

Do **not** hand over the password yet. Apply steps 2–6 first, then share it — otherwise
the first login happens before any of the controls exist.

---

## 2. Force 2FA and kill the password-only paths

**Security → Multi-Factor Authentication** (org level, or Zoho Directory for Zoho One)

- Enforce **OneAuth** or **TOTP** for all users. Make it mandatory, not optional.
- **Disable application-specific passwords.** They are the standard way around 2FA — with
  IMAP off (next step) nobody needs them anyway.
- Set the **session timeout** to something short enough to matter (2–8 hours).

---

## 3. Turn off every non-browser way in

**Users → <the user> → Mail Account**, or org-wide via **Mail Settings → Mail Policy**:

| Setting | Set to | Why |
|---|---|---|
| IMAP Access | **Off** | Otherwise Outlook / Thunderbird / any phone mail app reads the mailbox with no extension in sight. |
| POP Access | **Off** | Same, plus it copies mail off the server permanently. |
| ActiveSync (EAS) | **Off** | The default mail app on most phones. |
| SMTP for external clients | **Off** unless a device genuinely needs to send | Leave on only for a printer/scanner that emails, and use a dedicated mailbox for it. |
| Email forwarding | **Disallow** | A forward rule quietly copies everything to a personal Gmail. |
| Auto-forward / external sharing | **Disallow** | Same reason. |

If some staff must use a desktop client, keep IMAP on **only for those users** and accept
that the extension's rules do not apply to them. Say so out loud when you decide it.

---

## 4. Restrict where a login may come from

**Security and Compliance → Allowed IPs** (on Zoho One / Directory: **Security → IP
restriction**)

- Add the office's **static public IP** — this is the single most effective control on
  this page. From any other network, the login simply fails.
- If the office IP is dynamic, don't use this yet: route staff through a **VPN with a
  fixed exit IP** and allow that IP instead. A dynamic IP in the allow list locks
  everyone out the moment the ISP renews the lease.
- Add a **second** allowed IP (an admin's home, or a backup connection) before you turn
  this on, and keep one super-admin account exempt. Locking out every admin means a
  support ticket to Zoho to get back in.
- Not sure what the office IP is? Open the extension popup on an office laptop — it shows
  the current public IP — or visit any "what is my IP" service from the office.

**How to tell whether your IP is static:** check it on two different days at different
times. If it changed, it is dynamic — ask your ISP for a static IP (usually a small
monthly add-on) or use the VPN route.

---

## 5. Control mobile devices

**Zoho Directory / MDM → Device Management** (or Zoho Mail's own mobile policy)

- Require **device enrolment** before the Zoho Mail app can open a company mailbox.
- Require a **device passcode** and enable **remote wipe** of company mail.
- Block **copy to personal apps** where the plan supports it.

With ActiveSync and IMAP off (step 3) and MDM enrolment required, personal phones are
effectively out. If you want phones fully out, skip MDM and just leave the mobile app
unenrolled — the mailbox then only works in a browser.

---

## 6. The strongest version: SSO with device checks

If you want a hard "only this laptop" guarantee rather than a strong approximation:

1. Set up **SAML SSO** for Zoho (Zoho Directory, Entra ID, Okta or Google Workspace as
   the identity provider).
2. In the identity provider, add a **conditional access** rule requiring a **managed /
   compliant device** — checked with a device certificate the laptop holds and a personal
   machine does not.
3. Disable direct Zoho password login for the affected users so SSO is the only route.

That moves the "which device" decision to a certificate that cannot be copied by typing a
password somewhere else. It is more setup than everything above combined, so it is worth
it once you are past a handful of users, or if the mail is genuinely sensitive.

---

## 7. Watch it

- **Reports → Audit / Login history** — review failed and unusual logins weekly.
- **Users → <user> → Sessions** — sign out all sessions when a laptop is lost or someone
  leaves.
- The extension's own audit log (options page → Audit log → Export CSV) tells you which
  device and which account, which Zoho's log cannot.

---

## Offboarding checklist

When someone leaves, in this order:

1. Reset the mailbox password.
2. **Sign out all sessions.**
3. Remove their device ID from the extension's approved list (or the enterprise policy).
4. Add their address to the extension's **blocked accounts** list.
5. Convert the mailbox to a shared/archived mailbox, or delete it once mail is exported.
