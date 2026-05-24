# HireStream — Self-Conducted Security Audit

**Build under test:** v0.4.5.0
**Audit date:** 2026-05-24
**Auditor:** Self-audit (Agentryx dev team, pre-IT-review)
**Scope:** HireStream portal (`hirestream-stg.agentryx.dev`). Verify portal not audited here.
**Method:** Live black-box + grey-box (DB + code review) checks against an OWASP-shaped checklist of 14 categories.

---

## Executive summary

| Severity | Count | Status after audit |
|---|---|---|
| **Critical** | 0 | — |
| **High** | 2 | 1 fixed in-audit, 1 open (dependency vulns) |
| **Medium** | 7 | All open — see remediation table |
| **Low** | 3 | All open — acceptable for current phase |
| **Pass** | 48 controls | Confirmed |

**One real vulnerability surfaced and was patched during the audit:** an IDOR in `PATCH /applications/:id/status` let any agent change the status of any application by knowing its ID, regardless of who owned the underlying job. Fix shipped in v0.4.5.0.

**Overall posture:** strong foundations (helmet, bcrypt 12, AES-256-GCM, SameSite=Strict cookies, HSTS preload, TLS 1.2-only, comprehensive CSP). The medium-severity findings are mostly pre-launch hygiene items — none would prevent a controlled HTIS / HPSEDC pilot. The 8 high-severity npm vulns are in transitive deps and need triage before production launch.

---

## Score by category

| # | Category | Score | Notes |
|---|---|---|---|
| A | Authentication & Session | **PASS** | bcrypt 12, anti-enum, HttpOnly/Secure/SameSite=Strict, 30-min sessions, 2FA infrastructure, 256-bit reset tokens. Missing: account lockout (rate-limit only). |
| B | Authorization & RBAC | **PASS** (post-fix) | One IDOR found + fixed during audit. Role gates and cross-role checks all work. |
| C | Input Validation & Injection | **PASS** | SQLi blocked (Drizzle parameterized), XSS prevented (React + server stores literal), NoSQLi blocked by Zod, command-injection N/A, path-traversal blocked. |
| D | HTTP Security Headers | **PASS** | HSTS preload, comprehensive CSP, X-Frame SAMEORIGIN, COOP/CORP same-origin, X-Powered-By off, HTTP→HTTPS 301. Minor: CSP allows 'unsafe-inline' (Vite requirement). |
| E | File Upload Security | **PASS w/ gaps** | Magic-byte + MIME + size + empty + random-filename all work. Missing: virus scan (clamav), per-user quota. |
| F | Cryptography & Secrets | **PASS w/ gap** | bcrypt 12, AES-256-GCM, 65-char SESSION_SECRET. Gap: encryption key derived from SESSION_SECRET (rotation loses encrypted data). |
| G | Rate Limiting & Brute Force | **PARTIAL** | 3-tier limits (api/auth/sensitive). authLimiter at 200 per 15 min is too loose for login brute-force; OWASP recommends 5-10. |
| H | Logging & Audit Trail | **PASS** | audit_log captures status changes + auth events, no creds in logs. |
| I | Error Handling | **PASS** | No stack traces leaked, anti-enum on user lookup. Minor: JSON parse errors echo original input fragment. |
| J | CSRF & CORS | **PASS** | SameSite=Strict cookies, no Access-Control-Allow-Origin for unlisted origins. |
| K | Privacy & PII | **PARTIAL** | Major: aadhaar_number column stored plaintext (currently 0 rows, but a landmine). Missing: candidate self-delete (GDPR Article 17 / India PDP Right to Erasure). Profile-PDF export partially covers data-portability. |
| L | Dependency Vulnerabilities | **FAIL** | 0 critical, **8 high**, 14 moderate, 2 low. `npm audit fix` should be run + tested. |
| M | Infrastructure | **PASS** | TLS 1.2-only with ECDHE-ECDSA-AES256-GCM-SHA384, TLS 1.0/1.1 rejected, DB SSL=on, HSTS preload. |
| N | Business Logic | **PASS** | Duplicate-apply blocked (409), invalid status transitions rejected (400), negative quantities rejected. |

---

## Findings & remediation

### HIGH-severity

**H-1 — IDOR on `PATCH /api/v1/applications/:id/status` (FIXED in v0.4.5.0)**
- **What:** Any authenticated agent could change the status of any application, including those on jobs owned by other agencies.
- **Reproduction:** `curl -b agent_a.cookie -X PATCH -d '{"status":"reviewed"}' …/applications/<other_agent_app>/status` returned `HTTP 200` and changed the row.
- **Impact:** Malicious agent could reject every applicant on a competitor's job, mark them placed, or add embarrassing rejection feedback.
- **Root cause:** [server/routes/application.routes.ts:36](../../../hirestream/server/routes/application.routes.ts#L36) fetched the application by id and went straight to status update with no ownership check. The bulk-status endpoint already filtered correctly; this single-status path was missed.
- **Fix:** Added ownership guard — `if (user.role === 'agent') job.agentId === user.id` and equivalent for employer (direct + via parent requisition). Admin/superadmin bypass preserved. Lives at [application.routes.ts:38-58](../../../hirestream/server/routes/application.routes.ts#L38-L58). Verified: cross-agent attempts now return `403`; own-job updates still work.

**H-2 — 8 high-severity transitive npm dependencies (OPEN)**
- **What:** `npm audit` reports 8 high-severity vulns across drizzle-orm, express (body-parser), lodash, minimatch, path-to-regexp, picomatch, rollup, systeminformation.
- **Impact:** Depending on the specific advisories, range from ReDoS to prototype-pollution. Mostly transitive (we don't import these directly).
- **Remediation:** Run `npm audit fix` in a branch, run the full jest suite, ship if green. If `fix` requires `--force` (breaking changes), pin updates one-by-one. Target: zero high before production launch.

### MEDIUM-severity

**M-1 — No account lockout on repeated failed logins**
- Only IP-based rate limit (authLimiter, 200 attempts per 15 min). A slow distributed attacker could try many usernames per minute.
- Add `failed_login_count` + `locked_until` columns on `users`. After 5 failures in 15 min, lock account for 15 min. Reset counter on successful login.

**M-2 — Auth rate limit too permissive**
- 200 attempts per 15 min per IP = 13 per minute. OWASP recommends 5-10 for login. Tighten `authLimiter.max` to 10–20.

**M-3 — No virus scan on uploaded files**
- Magic-byte verification catches type spoofing but not malicious payloads in valid PDFs/images.
- Install clamav-daemon + clamd-scan after multer write, before persisting. Reject on infected. ~1h work + ~150MB extra disk for AV signatures.

**M-4 — No per-user upload quota**
- Disk-fill DoS: a malicious candidate could upload 10MB files until disk is full.
- Add row count limit (e.g., max 20 documents per candidate) and total bytes limit (e.g., max 50MB per candidate) — enforce in `document.routes.ts` POST.

**M-5 — aadhaar_number stored as plaintext**
- Column exists at `users.aadhaar_number`. Currently 0 rows have data, but the moment HPSEDC turns on Aadhaar collection, plaintext PII goes into the DB.
- Apply field-level encryption (AES-256-GCM via the existing `secrets.service.ts`) before storing. Document key-rotation runbook.

**M-6 — No candidate self-delete endpoint**
- GDPR Article 17 / India DPDP Act Right to Erasure: a candidate must be able to request account deletion. Currently only admin can delete.
- Add `DELETE /api/v1/candidates/me` that soft-deletes (sets `deleted_at`), nukes PII fields, and anonymizes related rows. Hard-purge by background job 30 days later.

**M-7 — Encryption key derived from SESSION_SECRET**
- `secrets.service.ts:30` derives the AES key from `SHA-256(SESSION_SECRET)` if `INTEGRATION_SECRET_KEY` is unset. Logs a warning on boot but doesn't fail.
- If SESSION_SECRET ever rotates (good security practice), every encrypted secret in `provider_config.secrets` becomes unrecoverable.
- Set `INTEGRATION_SECRET_KEY` explicitly in env, document key-rotation procedure separately, and make the boot warning a hard fail in production.

### LOW-severity

**L-1 — CSP allows `'unsafe-inline'` and `'unsafe-eval'` for scripts**
- Vite's bundler requires inline scripts. Acceptable trade-off for SPA, but every reflected-XSS class becomes more impactful.
- Long-term: switch to nonce-based CSP if/when migrating away from Vite.

**L-2 — JSON parse error echoes user input fragment**
- `Unexpected token 'N', "NOT JSON" is not valid JSON` — the first 30 bytes of the bad body. Minor info disclosure.
- Wrap with a generic 400 message: "Invalid JSON body."

**L-3 — 14 moderate-severity npm deps**
- Same triage as H-2; lower urgency.

---

## Checklist — full record (48 PASS items)

### A. Authentication & Session Management
- [x] A1. Password hashing uses bcrypt (cost ≥ 10) — verified stored hashes use `$2b$10$` or `$2b$12$`
- [x] A2. Anti-enumeration: login response identical for wrong-user vs wrong-password
- [x] A3. Session cookie has `HttpOnly`, `Secure`, `SameSite=Strict`
- [x] A4. Session timeout configured — 30 min idle
- [x] A5. Password reset tokens cryptographically random — `crypto.randomBytes(32)` = 256 bits
- [x] A6. OTP sending rate-limited — `sensitiveLimiter` (50 / 15 min)
- [x] A7. 2FA infrastructure present — `twofa.routes.ts` + schema fields
- [ ] **A8. Account lockout** — M-1 above

### B. Authorization & RBAC
- [x] B1. Unauthenticated requests to protected routes → 401
- [x] B2. Candidate role can't reach agent endpoints → 403
- [x] B3. Candidate role can't reach employer endpoints → 403
- [x] B4. Candidate role can't reach admin endpoints → 403
- [x] B5. Admin role can't reach superadmin endpoints → 403
- [x] B6. `PATCH /me` cannot reach other users' rows (server uses session userId)
- [x] B7. **IDOR on application status — FIXED H-1**
- [x] B8. Employer cannot edit other employer's jobs → 403
- [x] B9. Role-escalation via PATCH rejected
- [x] B10. Cross-user GET returns 404 (no enumeration)

### C. Input Validation & Injection
- [x] C1. SQLi in query params and body fields blocked (Drizzle parameterized)
- [x] C2. SQLi in PATCH body blocked
- [x] C3. Stored XSS — server stores literal, React escapes on render
- [x] C4. Reflected XSS — user input not echoed in error responses
- [x] C5. Path traversal blocked on file downloads (`path.basename` filter)
- [x] C6. Command injection blocked (no `exec` of user input)
- [x] C7. SSRF — no user-controllable URLs in `fetch()` calls
- [x] C8. NoSQL operator injection blocked by Zod type validation
- [x] C9. Drizzle `sql` template interpolations are parameterized (verified)
- [x] C10. `dangerouslySetInnerHTML` only in shadcn chart.tsx (CSS vars, not user data)

### D. HTTP Security Headers
- [x] D1. `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
- [x] D2. Comprehensive CSP (default-src 'self', frame-ancestors 'none', object-src 'none')
- [x] D3. `X-Frame-Options: SAMEORIGIN`
- [x] D4. `X-Content-Type-Options: nosniff`
- [x] D5. `Referrer-Policy: no-referrer`
- [x] D6. `Cross-Origin-Opener-Policy: same-origin` + `Cross-Origin-Resource-Policy: same-origin`
- [x] D7. `X-Powered-By` not sent
- [x] D8. HTTP → HTTPS 301 redirect
- [x] D9. API responses have `Cache-Control: no-store`

### E. File Upload Security
- [x] E1. Magic-byte signature verification (PDF/JPG/PNG)
- [x] E2. MIME-type whitelist via multer fileFilter
- [x] E3. File size limit (5 MB env-default)
- [x] E4. Empty files rejected
- [x] E5. Filename auto-generated (timestamp + 16 hex chars), no user input
- [x] E6. Files stored outside web root (`uploads/` vs `dist/public/`)
- [x] E7. Per-document-type leaf paths (docs vs photos, namespaced under `hs/`)
- [ ] **E8. Virus scanning** — M-3
- [ ] **E9. Per-user quota** — M-4

### F. Cryptography & Secrets
- [x] F1. bcrypt cost 12 for new password hashes
- [x] F2. AES-256-GCM for at-rest secrets in `provider_config`
- [x] F3. crypto.randomBytes(32) = 256-bit tokens (password reset + mobile refresh)
- [x] F4. SESSION_SECRET is 65 chars (well above min 10)
- [x] F5. No credentials logged at info/debug level
- [ ] **F6. Independent INTEGRATION_SECRET_KEY** — M-7

### G. Rate Limiting & Brute Force
- [x] G1. Global API rate limit (apiLimiter: 2000 per 15 min per IP)
- [x] G2. Sensitive-op limiter (sensitiveLimiter: 50 per 15 min) on OTP send, integration test, etc.
- [ ] **G3. Auth limiter too permissive** — M-2 (currently 200; should be 10–20)

### H. Logging & Audit Trail
- [x] H1. `audit_log` table tracks state transitions (10 events captured in last test session)
- [x] H2. Application status changes logged via `logTransition()` (PWS §8)
- [x] H3. Failed login attempts captured in audit log
- [x] H4. No passwords / tokens / secrets in logs

### I. Error Handling
- [x] I1. No stack traces in API responses (production NODE_ENV)
- [x] I2. No file paths leaked in error messages
- [x] I3. 404 returned for both bogus and unauthorized user lookups (anti-enum)
- [ ] **I4. JSON parse error echoes user input** — L-2

### J. CSRF & CORS
- [x] J1. SameSite=Strict on session cookies (primary CSRF defense)
- [x] J2. CORS doesn't reflect unlisted origins
- [x] J3. ALLOWED_ORIGINS whitelist driven by env var
- [x] J4. No wildcard `*` with `credentials: true`

### K. Privacy & PII
- [x] K1. PII inventory: documented (20 columns across 5 tables)
- [x] K2. Profile-PDF export available (partial data-portability)
- [ ] **K3. aadhaar_number plaintext** — M-5
- [ ] **K4. Candidate self-delete missing** — M-6
- [ ] K5. Data retention policy — not documented (out of scope for v0.4.x)

### L. Dependency Vulnerabilities
- [ ] **L1. 8 high-severity vulns** — H-2
- [ ] L2. 14 moderate — L-3

### M. Infrastructure
- [x] M1. TLS 1.2+ only (1.0/1.1 rejected)
- [x] M2. Strong cipher (ECDHE-ECDSA-AES256-GCM-SHA384)
- [x] M3. Database connection has `ssl=on`
- [x] M4. HSTS preload-eligible

### N. Business Logic
- [x] N1. Duplicate application blocked (409)
- [x] N2. Invalid status values rejected (400)
- [x] N3. Negative quantities rejected via Zod (`min(1)` on targetHires)
- [x] N4. Workflow bypass blocked (terminal-state lock; can't skip-to-placed manually)

---

## Recommended next sprint — security hardening

Effort estimate to close all M-severity items:

| Item | Effort | Priority |
|---|---|---|
| H-2 — npm audit fix + retest | 2h | **before launch** |
| M-1 — account lockout | 2h | **before launch** |
| M-2 — tighten authLimiter | 5min | **before launch** |
| M-5 — encrypt aadhaar_number | 1h | **before HPSEDC enables Aadhaar** |
| M-6 — candidate self-delete | 3h | **before HPSEDC publishes URL** (PDP Act) |
| M-7 — independent INTEGRATION_SECRET_KEY | 30min | **before launch** |
| M-3 — clamav on uploads | 3h | nice-to-have |
| M-4 — per-user upload quota | 2h | nice-to-have |
| L-1 — nonce-based CSP | 1d | future (Vite-bound) |
| L-2 — generic JSON parse error | 5min | nice-to-have |

Total to "production-ready security baseline": **~10 hours of work**.

---

## What this audit did NOT cover

- **Verify portal** (`verify-stg.agentryx.dev`) — separate codebase. Should get an equivalent pass.
- **Mobile app** — runs on Android/iOS, not via curl. Need a mobile-specific pen-test pass (OWASP MASVS).
- **Penetration testing** — a real attacker with persistence and skill. This was a structured-checklist audit, not an adversarial engagement. An external IT-team red-team would do that.
- **DDoS resistance** — Cloudflare / WAF level, not application level.
- **Physical / personnel security** — out of scope.

---

**Recommendation:** ship the in-audit fix (IDOR H-1) immediately as v0.4.5.0, then prioritize the "before launch" cluster in the next sprint. The portal is **safe to hand to HTIS for testing today**; production launch should wait until the 5 "before launch" items are closed.
