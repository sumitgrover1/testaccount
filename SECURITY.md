# Security

This document describes the security controls built into the Clinic
Management Platform backend and how to report a vulnerability. It is written
for engineers operating or extending this codebase, not end users.

## Reporting a vulnerability

Do not open a public GitHub issue for security reports. Email the maintainers
directly (see repository owner) with a description and reproduction steps.
Please allow a reasonable window to remediate before any public disclosure.

## Threat model summary

This service is an API backend for a multi-specialty clinic, handling staff
authentication credentials and sensitive patient data — demographics, medical
history (allergies, diagnoses, medication, treatment history), before/after
images, consent forms, and billing/payment records. The primary threats it
defends against:

- Credential theft / account takeover of staff accounts (weak passwords, brute force, token theft)
- Privilege escalation (e.g. a receptionist or counselor acting as a doctor/admin)
- Unauthorized access to patient medical records (PHI-equivalent data)
- Injection (SQL injection, stored/reflected XSS via patient/treatment rich-text fields)
- Cross-site request forgery against cookie-based endpoints
- Forged or unauthenticated inbound webhooks (ad-platform lead ingestion)
- Sensitive data exposure via logs, error messages, or over-broad API responses
- Denial of service via oversized payloads or unbounded request rates
- Supply-chain risk from dependencies

## Controls implemented

**Authentication**
- Only clinic staff authenticate against this API — patients are a managed data entity, never an authenticated principal, so there is no public self-registration endpoint (staff accounts are admin-provisioned via `POST /users`).
- Passwords hashed with argon2id (OWASP-recommended), never stored or logged in plaintext.
- JWT access tokens (short-lived, 15m default) + rotating refresh tokens (httpOnly, `SameSite=Strict` cookie).
- Refresh tokens are single-use; reuse of an already-rotated token revokes all sessions for that user (stolen-token detection).
- Per-account lockout after repeated failed logins, in addition to IP-based rate limiting on auth endpoints.
- Login responses are identical for "no such user" and "wrong password" to prevent account enumeration.
- Password reset tokens are single-use, time-boxed, and stored only as a SHA-256 hash — never logged, never returned in an API response body.

**Authorization**
- Role-based access control across eight staff roles (`SUPER_ADMIN`, `CLINIC_OWNER`, `DOCTOR`, `RECEPTIONIST`, `COUNSELOR`, `INVENTORY_MANAGER`, `ACCOUNTANT`, `MARKETING_TEAM`), enforced in middleware, with per-resource ownership checks in service code (e.g. a counselor's pricing discretion is capped by `PRICING_MAX_UNAPPROVED_DISCOUNT_PERCENT`, beyond which a doctor/admin must approve).
- Access-token verification re-checks the user's current `isActive`/lockout state on every request, so a disabled account or role change takes effect immediately rather than waiting out token expiry.
- Elevated fields (`role`, `isActive`) are only ever settable via a dedicated admin-only endpoint/schema — never accepted on the self-service profile-update path, preventing privilege-escalation via mass assignment.

**Input handling**
- All request input validated (and unknown fields stripped) via `zod` schemas before it reaches business logic.
- Rich-text fields (course/treatment/package descriptions) are sanitized server-side with an explicit tag/attribute allowlist before storage, mitigating stored XSS.
- All database access goes through Prisma's parameterized query builder — no string-concatenated SQL.
- Inbound ad-platform lead webhooks are HMAC-signature-verified against the exact raw request bytes before being trusted (see `src/common/utils/webhookSignature.ts`); an unconfigured or invalid signature is rejected outright.

**Transport & session security**
- `helmet` security headers (HSTS, restrictive CSP, no-referrer, etc.).
- Strict CORS allowlist — no wildcard origins, credentials only for known origins.
- CSRF protection (double-submit cookie) on endpoints that rely on the httpOnly refresh-token cookie.
- HTTPS enforced in production when behind a trusted proxy (`TRUST_PROXY=true`).

**Abuse & availability**
- Global and auth-specific rate limiting (Redis-backed when `REDIS_URL` is set, so limits hold across multiple instances); public-facing endpoints (website lead capture, ad-platform webhooks) reuse the stricter auth limiter.
- Request body size capped (100kb) to bound memory usage per request.
- Graceful shutdown drains in-flight requests before closing DB/Redis connections on deploy/restart.

**Observability & compliance**
- Structured JSON logging (`pino`) with automatic redaction of tokens, passwords, and auth headers.
- Append-only `AuditLog` table recording security- and business-relevant actions (auth events, role changes, patient/lead/pricing/inventory/billing mutations) with actor, IP, user agent, and timestamp — for incident investigation and compliance audits.
- A parallel append-only `PriceHistory` table specifically tracks every pricing change (treatment default, package, patient-specific override) with who/why, since pricing disputes are a common audit target in this domain.
- Every request/response/error carries a correlation `X-Request-Id` for tracing across logs.

**Configuration & secrets**
- All configuration validated at boot via `zod` (`src/config/env.ts`); the process refuses to start with a missing/malformed config, and refuses to start in production with placeholder secret values.
- `.env` is git-ignored; only `.env.example` (no real secrets) is committed. Real deployments should source secrets from a managed secrets store (AWS Secrets Manager, Vault, etc.), not `.env` files.
- Third-party integration credentials (OCR provider, notification provider, ad-platform webhook secrets) are optional at boot — a missing secret rejects that specific integration's requests at call time rather than blocking the whole service from starting.

**Supply chain / CI**
- CI runs `npm audit`, ESLint (including `eslint-plugin-security`), TypeScript strict-mode type checking, and CodeQL static analysis on every push/PR.
- Docker image is a multi-stage build that ships only production dependencies and runs as a non-root user.

## Known gaps / recommended next steps

These are explicitly out of scope for this initial build and should be
addressed before handling real patient data in production:

- **OCR and notification providers are stubs** (`src/common/providers/`) — no real supplier-invoice OCR engine or SMS/WhatsApp/email provider is wired up; both need real vendor credentials this environment doesn't have. See README's "Integration points not wired to a live provider" for what's real vs. stubbed.
- **Ad-platform webhook payload parsing is normalized, not vendor-native** — Facebook/Google's actual webhook formats (e.g. Facebook sends only a `leadgen_id` requiring a signed Graph API fetch) aren't implemented; only signature verification and lead ingestion are real.
- Email delivery for password-reset is stubbed (the service computes the token but does not send it) — wire up a transactional email provider.
- No field-level encryption for at-rest PII/medical data beyond what the database/disk provides — evaluate based on your actual compliance target (a clinic handling real patient data should assess HIPAA-equivalent, India's DPDP Act, or other applicable regimes).
- No automated data-retention/erasure job for the audit log or patient data — add one if a specific regulatory regime requires it.
- Patient documents (before/after images, consent forms) are stored as client-supplied URLs (presigned-upload pattern) — the object storage bucket's own access controls, encryption-at-rest, and antivirus/content-type scanning are out of this backend's scope and must be configured on the storage side.
- No in-process scheduler for follow-up reminders or overdue escalation — `followup.service.ts` exposes the functions an external cron/queue should call.
- Add centralized secret rotation procedures for JWT/cookie/webhook secrets.
