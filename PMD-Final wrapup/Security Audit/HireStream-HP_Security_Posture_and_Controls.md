# HireStream-HP — Security Posture & Controls

**Application:** HireStream-HP — HPSEDC Overseas Placement Portal
**Owner:** Agentryx (for HPSEDC, Government of Himachal Pradesh)
**Document date:** 2026-07-07 · **Application version at review:** 0.9.18
**Purpose:** Auditor-facing summary of the security controls in place and the
remediation performed in preparation for a CERT-In / OWASP VAPT first pass.

---

## 1. Executive summary

HireStream-HP underwent a structured internal security hardening pass in July 2026
covering the OWASP Top 10 (2021) and CERT-In VAPT expectations. The work included a
full-route authorization sweep, a dependency-vulnerability remediation, and a
line-by-line application security audit followed by fixes. Every fix was verified
live against the running staging deployment (exploit closed **and** legitimate flow
preserved).

**Current posture:**
- **Production runtime dependencies: 0 known vulnerabilities** (`npm audit --omit=dev`).
- **Broken Access Control (OWASP A01):** the two IDOR/authorization sweeps (Batch 1 +
  this pass) closed all identified unguarded mutations and cross-tenant data reads;
  a shared ownership layer (`server/lib/ownership.ts`) now gates them uniformly.
- **Sensitive data exposure:** 2FA secrets and recovery codes are never serialized;
  Aadhaar is masked in all user-serialising responses; documents are per-user
  access-controlled; secrets are not in the repository.
- **Platform hardening:** Helmet (CSP, HSTS-preload, frame-ancestors `none`, nosniff,
  referrer-policy), strict CORS allowlist, session hardening, rate limiting, and
  magic-byte file-upload validation are all in place and verified.

Residual items (Section 6) are limited, documented, and low-risk.

---

## 2. Controls in place (verified)

| Domain | Control |
|---|---|
| **Transport** | HTTPS (nginx); HSTS `max-age=31536000; includeSubDomains; preload`. |
| **Security headers** | Helmet: CSP (`default-src 'self'`, `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`), `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `X-Frame-Options`. `X-Powered-By`/`Server` stripped. API responses `no-store`. TRACE blocked. |
| **Authentication** | bcrypt cost 12; strong password policy (upper/lower/digit/special, 8–128) on reset/change; single-use, 1-hour, race-safe password-reset tokens; generic "invalid credentials" (no user enumeration on login or password-reset). |
| **Session** | httpOnly + `SameSite=Strict` + `Secure` (prod) cookies; 30-minute rolling idle timeout; session **regenerated on login** (fixation-safe, CWE-384); full session invalidation on password reset/change (CWE-613). |
| **Authorization** | Role gates + a shared ownership layer (`userOwnsJob` / `userOwnsApplication` / `userOwnsCandidate`) enforcing per-record ownership on notes, compliance, candidate detail + list, application status, interviews, welfare, offer letters, document verification, and drive interviews. |
| **Rate limiting** | `apiLimiter` (all `/api`), `authLimiter` (login/register/reset), `sensitiveLimiter` (OTP send / password reset / change); OTP per-code attempt cap + crypto-strong OTP; public status-check per-phone verify-fail lockout. |
| **Input handling** | Global input sanitization middleware (strips `<script>`/`<iframe>`/`on*=`); Zod validation on write paths; server-side re-validation on bulk operations; CSV-formula-injection defense on the job importer. |
| **File uploads** | MIME allowlist (PDF/JPG/PNG) + **magic-byte signature verification** (deletes on mismatch) + size cap + empty-file rejection + **server-generated random filenames** (no user-controlled path) + role-scoped destination directories. |
| **Document access** | Sensitive documents (passport, Aadhaar, offer letters) are served only through an auth-gated download endpoint enforcing owner-or-related-staff; they are **not** statically served (only the profile-photo leaf is public). |
| **Injection** | All raw SQL is static or drizzle-parameterized; the superadmin SQL console is SELECT/WITH/EXPLAIN-only, single-statement, keyword-blocklisted, 5-second statement-timeout, rate-capped, and superadmin-gated; the DB role is not a Postgres superuser. |
| **Secrets** | `.env` (SESSION_SECRET / JWT_SECRET / DB creds) is git-ignored and absent from repo history; mobile JWT uses a typed token and refuses to sign if `JWT_SECRET` is unset (no weak fallback). |
| **Mobile auth** | JWT (`mobile_access`) + refresh-token rotation with reuse-detection and per-user cap; self-registration capability-gated (no agent/employer self-register on the single-agency deployment); bearer accepted via `Authorization` header (query-string token restricted to a single media route). |
| **Audit & logging** | State transitions (applications, grievances, placements) and security events (password change, role change) are audit-logged; no passwords, OTPs, tokens, or 2FA secrets are written to logs. |
| **Diagnostics** | The `__routes` introspection endpoint is double-gated (secret token + non-production); no debug endpoints in production. |

---

## 3. OWASP Top 10 (2021) coverage

| # | Category | Status |
|---|---|---|
| A01 | Broken Access Control | **Remediated** — two authorization sweeps; shared ownership layer; all identified IDORs closed. |
| A02 | Cryptographic Failures / Sensitive Data | **Remediated** — 2FA secrets never serialized; Aadhaar masked; no secrets in repo; single-use reset tokens. |
| A03 | Injection | **Controlled** — no user-reachable SQLi; SQL console locked down; server-rendered HTML escaped. |
| A04 | Insecure Design | **Remediated** — the demo quick-login / demo-reset endpoints are governed by an admin-managed feature flag that defaults **OFF in production** (was previously auto-enabled); disabled on STG/PROD unless a superadmin explicitly enables it for a demo. |
| A05 | Security Misconfiguration | **Remediated** — generic 5xx errors (no stack leak); Helmet/CORS verified; no default creds in prod (Section 6.1). |
| A06 | Vulnerable & Outdated Components | **Remediated** — production runtime dependencies: 0 vulnerabilities. |
| A07 | Identification & Auth Failures | **Strong** — session hardening; no enumeration on login/register/reset; rate limiting. |
| A08 | Software & Data Integrity | **Strong** — magic-byte upload validation; server-side re-validation; no unsafe deserialization. |
| A09 | Logging & Monitoring | **Good** — audit coverage; no secrets in logs (minor: phone/email in info logs). |
| A10 | SSRF | **Low exposure** — only admin/superadmin-configured URLs are fetched server-side; no ordinary-user SSRF vector. |

---

## 4. Remediation log (July 2026 hardening)

Two authorization/data-protection sweeps and a dependency pass, all committed and
deployed to staging with live verification.

**Access control (v0.9.10):** removed a legacy application-status route with no
ownership check (any agent/employer could change any application's status by ID);
gated internal-notes read/write, candidate compliance/passport updates, and
candidate-detail to owning staff; hardened the public OTP flow (crypto OTP +
brute-force lockout); closed a mobile self-registration capability bypass.

**Dependency vulnerabilities (v0.9.17):** upgraded `drizzle-orm` (SQL-identifier
escaping advisory, GHSA-gpj5-g38j-94v9) and `nodemailer` (raw-option file-read/SSRF,
GHSA-p6gq-j5cr-w38f). Result: `npm audit --omit=dev` → **0 vulnerabilities**.

**OWASP/CERT-In audit fixes (v0.9.18):**
- **CRITICAL** — the demo quick-login and demo-reset endpoints (which could grant
  anonymous admin access and wipe the database) are now behind an admin-managed
  feature flag that defaults OFF in production, so they are disabled on STG/PROD
  unless a superadmin explicitly enables them for a demo; removed the shipped
  superadmin password from the seed (now env-provisioned).
- **HIGH** — stopped serialising 2FA secrets/recovery codes and raw Aadhaar in user
  exports and lookups (shared `sanitizeUser`); scoped the candidate-browse list for
  employers and stripped passport/Aadhaar; ownership-gated interview `.ics` and drive
  interview listings.
- **MEDIUM** — ownership guards on interview feedback, placement welfare, and offer
  letters; generic 5xx error responses (no stack leakage); restricted mobile
  query-string token auth to a single media route.
- **LOW** — authenticated drive detail; country-rejection ownership; removed
  registration email-enumeration; HTML-escaped the profile-PDF.

Full technical detail: `hirestream-hp/A.PMD/Security_Audit_OWASP_2026-07-07.md` and
`hirestream-hp/A.PMD/Codebase_Audit_2026-07-06.md`.

---

## 5. Testing & verification

Each remediation was verified against the live staging deployment using scripted
smoke tests that assert **both** the exploit is closed and the legitimate path still
works (e.g. an owner can still act; a non-owner is denied). Standing tooling:
`npm run test:deep` (jest + route-health/authz matrix) and `scripts/deep-smoke.mjs`.
Type-checking (`tsc`) and production build pass clean at every release.

---

## 6. Residual items & production-deployment requirements

These are the known, accepted, or ops-owned items an auditor should be aware of.

### 6.1 Production provisioning (ACTION REQUIRED before go-live)
The current environment is a **demo/UAT** deployment and intentionally contains demo
accounts. For the real Government production deployment:
1. **Rotate the superadmin password** and provision it via `SEED_SUPERADMIN_PASSWORD`
   (the seed now requires it in production and no longer ships a default).
2. **Do not seed demo accounts** in production — the destructive demo seed refuses to
   run unless `ALLOW_DEMO_SEED=true` is explicitly set (intended for demo boxes only).
3. Confirm `NODE_ENV=production` (enables CSP, disables dev-login/demo-reset, and the
   generic-error path) and that `SESSION_SECRET` / `JWT_SECRET` are strong and unique.
4. Set `ALLOWED_ORIGINS` to the production origin(s) only.

### 6.2 Accepted / tracked
- **Dev/build-tree dependency advisories** (esbuild/vite/rollup): compile-time only,
  not present in the deployed runtime artifact — accepted; scheduled for a routine
  tooling upgrade.
- **2FA enforcement (A04-2):** 2FA enrolment is implemented; enforcing a mandatory
  second-factor gate at login for 2FA-enabled users is a tracked enhancement
  (requires a login-flow session step).
- **Minor:** phone/email appear in some info-level logs (not secrets) — masking is a
  low-priority follow-up.

---

*Prepared by Agentryx engineering. This document reflects the state at version 0.9.18
and should be re-issued if material security changes are made before the audit.*
