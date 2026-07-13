# Security

This document describes the security controls built into the LMS backend and
how to report a vulnerability. It is written for engineers operating or
extending this codebase, not end users.

## Reporting a vulnerability

Do not open a public GitHub issue for security reports. Email the maintainers
directly (see repository owner) with a description and reproduction steps.
Please allow a reasonable window to remediate before any public disclosure.

## Threat model summary

This service is an API backend for a Learning Management System handling
authentication credentials, personal data (names, emails), and educational
records (enrollments, grades). The primary threats it defends against:

- Credential theft / account takeover (weak passwords, brute force, token theft)
- Privilege escalation (a student acting as an instructor/admin)
- Injection (SQL injection, stored/reflected XSS via course content)
- Cross-site request forgery against cookie-based endpoints
- Sensitive data exposure via logs, error messages, or over-broad API responses
- Denial of service via oversized payloads or unbounded request rates
- Supply-chain risk from dependencies

## Controls implemented

**Authentication**
- Passwords hashed with argon2id (OWASP-recommended), never stored or logged in plaintext.
- JWT access tokens (short-lived, 15m default) + rotating refresh tokens (httpOnly, `SameSite=Strict` cookie).
- Refresh tokens are single-use; reuse of an already-rotated token revokes all sessions for that user (stolen-token detection).
- Per-account lockout after repeated failed logins, in addition to IP-based rate limiting on auth endpoints.
- Login responses are identical for "no such user" and "wrong password" to prevent account enumeration.
- Password reset tokens are single-use, time-boxed, and stored only as a SHA-256 hash — never logged, never returned in an API response body.

**Authorization**
- Role-based access control (`ADMIN`, `INSTRUCTOR`, `STUDENT`) enforced in middleware, with per-resource ownership checks in service code (e.g. an instructor can only edit their own courses).
- Access-token verification re-checks the user's current `isActive`/lockout state on every request, so a disabled account or role change takes effect immediately rather than waiting out token expiry.
- Elevated fields (`role`, `isActive`) are only ever settable via a dedicated admin-only endpoint/schema — never accepted on the self-service profile-update path, preventing privilege-escalation via mass assignment.

**Input handling**
- All request input validated (and unknown fields stripped) via `zod` schemas before it reaches business logic.
- Rich-text fields (course descriptions) are sanitized server-side with an explicit tag/attribute allowlist before storage, mitigating stored XSS.
- All database access goes through Prisma's parameterized query builder — no string-concatenated SQL.

**Transport & session security**
- `helmet` security headers (HSTS, restrictive CSP, no-referrer, etc.).
- Strict CORS allowlist — no wildcard origins, credentials only for known origins.
- CSRF protection (double-submit cookie) on endpoints that rely on the httpOnly refresh-token cookie.
- HTTPS enforced in production when behind a trusted proxy (`TRUST_PROXY=true`).

**Abuse & availability**
- Global and auth-specific rate limiting (Redis-backed when `REDIS_URL` is set, so limits hold across multiple instances).
- Request body size capped (100kb) to bound memory usage per request.
- Graceful shutdown drains in-flight requests before closing DB/Redis connections on deploy/restart.

**Observability & compliance**
- Structured JSON logging (`pino`) with automatic redaction of tokens, passwords, and auth headers.
- Append-only `AuditLog` table recording security-relevant actions (auth events, role changes, course/enrollment mutations) with actor, IP, user agent, and timestamp — for incident investigation and compliance audits.
- Every request/response/error carries a correlation `X-Request-Id` for tracing across logs.

**Configuration & secrets**
- All configuration validated at boot via `zod` (`src/config/env.ts`); the process refuses to start with a missing/malformed config, and refuses to start in production with placeholder secret values.
- `.env` is git-ignored; only `.env.example` (no real secrets) is committed. Real deployments should source secrets from a managed secrets store (AWS Secrets Manager, Vault, etc.), not `.env` files.

**Supply chain / CI**
- CI runs `npm audit`, ESLint (including `eslint-plugin-security`), TypeScript strict-mode type checking, and CodeQL static analysis on every push/PR.
- Docker image is a multi-stage build that ships only production dependencies and runs as a non-root user.

## Known gaps / recommended next steps

These are explicitly out of scope for this initial scaffold and should be
addressed before handling real student data in production:

- Email delivery for verification/password-reset is stubbed (the service
  computes the token but does not send it) — wire up a transactional email provider.
- No field-level encryption for at-rest PII beyond what the database/disk
  provides — evaluate based on your actual compliance target (FERPA/GDPR/SOC 2).
- No automated data-retention/erasure job for the audit log or user data — add
  one if a specific regulatory regime (e.g. GDPR right-to-erasure) applies.
- No file-upload handling yet; if course materials/assignment uploads are added, enforce strict content-type/size validation and antivirus scanning before storage.
- Add centralized secret rotation procedures for JWT/cookie secrets.
