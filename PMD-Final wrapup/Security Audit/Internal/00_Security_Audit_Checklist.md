# HireStream — Security Audit Checklist

**Purpose:** Reusable, OWASP-aligned checklist for self-conducted security audits before handing the portal to the IT-review team. Use this as the test plan on every release that affects auth, data handling, or infrastructure.

**Score rubric per item:**
- **PASS** — control implemented, verified live
- **PARTIAL** — implemented but with documented gaps
- **FAIL** — control missing or broken
- **N/A** — not applicable to this build
- **DEFERRED** — accepted risk, tracked in a backlog ticket

**Severity rubric for findings:**
- **CRITICAL** — exploitable now, system-wide impact (data loss, account takeover at scale, RCE)
- **HIGH** — exploitable now, scoped impact (IDOR on one resource type, persistent XSS, known CVE in direct dep)
- **MEDIUM** — exploitable under conditions, or compliance-relevant gap (no account lockout, plaintext PII column)
- **LOW** — best-practice deviation with low real-world risk (verbose error msg, transitive CVE)

**Audit cadence:** every minor version (`vX.Y.*`), or any release that touches `server/middleware`, `server/routes/auth*`, `server/services/secrets*`, `server/routes/admin*`, or upload paths.

---

## A. Authentication & Session Management

| # | Control | Method |
|---|---|---|
| A1 | Password hashing uses bcrypt with cost ≥ 10 | Grep `bcrypt.hash` in routes; inspect a real stored hash for `$2b$` prefix and cost factor |
| A2 | Login response is identical for wrong-user vs wrong-password (anti-enumeration) | curl two failed logins; diff the `error.message` fields |
| A3 | Session cookie has `HttpOnly`, `Secure`, `SameSite=Strict` | `curl -i` a login response; inspect `Set-Cookie` header |
| A4 | Session timeout enforced (max 30 min idle for sensitive portals) | Read `routes.ts` session config; verify `maxAge` |
| A5 | Password-reset tokens cryptographically random (≥ 128 bits, ideally 256) | Grep `crypto.randomBytes`; verify byte count |
| A6 | OTP send + verify rate-limited | Grep `sensitiveLimiter` on `/auth/send-otp` etc. |
| A7 | 2FA / TOTP infrastructure present (even if optional) | Confirm `twofa.routes.ts` exists + schema fields |
| A8 | Account lockout after N failed login attempts | Grep `locked_until` / `failed_attempts` columns or middleware |
| A9 | Logout invalidates server-side session (not just client cookie clear) | curl logout, then attempt /me with old cookie → 401 |
| A10 | Password change kills other sessions (CWE-613) | Check session regeneration on password change |

---

## B. Authorization & RBAC

| # | Control | Method |
|---|---|---|
| B1 | Unauthenticated request to protected route → 401 | curl without cookie |
| B2 | Candidate cannot reach agent-only endpoints → 403 | curl with candidate cookie |
| B3 | Candidate cannot reach employer endpoints → 403 | curl with candidate cookie |
| B4 | Candidate cannot reach admin endpoints → 403 | curl with candidate cookie |
| B5 | Admin cannot reach superadmin endpoints → 403 | curl with admin cookie |
| B6 | `PATCH /me`-style endpoints cannot reach other users' rows | Verify returned ID equals caller's |
| B7 | **IDOR: agent A cannot modify resources owned by agent B** | curl agent-A PATCH on agent-B's resource → 403 |
| B8 | **IDOR: employer A cannot edit employer B's jobs** | curl employer-A PUT on employer-B's job → 403 |
| B9 | Role escalation via `PATCH /me { role: 'superadmin' }` rejected | Verify role in DB unchanged after PATCH |
| B10 | Cross-user GET returns 404 (no enumeration via 401-vs-404 split) | curl unauthorized GET on real ID and bogus ID; should match |

---

## C. Input Validation & Injection

| # | Control | Method |
|---|---|---|
| C1 | SQL injection in query params and body fields blocked | Send `' OR 1=1--` and `'; DROP TABLE …;--`; verify tables intact |
| C2 | SQLi in JSON PATCH body blocked | Same |
| C3 | Stored XSS — server stores literal text, frontend escapes on render | Send `<script>…</script>` in profile field; verify React escapes |
| C4 | Reflected XSS — error responses don't echo user input | grep response for sent payload |
| C5 | Path traversal on file downloads blocked (`path.basename` filter) | curl `../../../etc/passwd` in document download |
| C6 | Command injection — no `exec()` of user input | grep `child_process.exec*` callsites for user-controlled args |
| C7 | SSRF — no user-controllable URL in `fetch()` / `http.get` | grep `fetch(` + audit URL source |
| C8 | NoSQL operator injection blocked by Zod type validation | Send `{"username":{"$ne":null}}`; expect 400 |
| C9 | Drizzle raw `sql` templates use parameterized interpolation | grep `sql\`` + manually verify `${var}` becomes a placeholder |
| C10 | `dangerouslySetInnerHTML` only used with trusted data | grep in `client/src/`; manually verify each usage |

---

## D. HTTP Security Headers

| # | Control | Method |
|---|---|---|
| D1 | `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` | `curl -I /` |
| D2 | Content-Security-Policy present, restrictive defaults (default-src 'self', frame-ancestors 'none', object-src 'none') | `curl -I /` |
| D3 | `X-Frame-Options: SAMEORIGIN` or `DENY` | `curl -I /` |
| D4 | `X-Content-Type-Options: nosniff` | `curl -I /` |
| D5 | `Referrer-Policy: no-referrer` (or `strict-origin-when-cross-origin`) | `curl -I /` |
| D6 | `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Resource-Policy: same-origin` | `curl -I /` |
| D7 | `X-Powered-By` header NOT sent | `curl -I /` |
| D8 | HTTP → HTTPS 301 redirect | `curl -I http://...` |
| D9 | API responses include `Cache-Control: no-store, no-cache, must-revalidate` | `curl -I /api/v1/...` |

---

## E. File Upload Security

| # | Control | Method |
|---|---|---|
| E1 | Magic-byte signature verification per allowed MIME type | Spoof a `.txt` as `application/pdf`; expect 400 |
| E2 | MIME-type whitelist via multer `fileFilter` | Send `text/plain` upload; expect 400 |
| E3 | File size limit enforced (≤ 10 MB) | Upload >limit file; expect 413 |
| E4 | Empty files rejected | Upload zero-byte file; expect 400 |
| E5 | Filenames auto-generated (timestamp + random), no user-supplied basename | Read multer storage config |
| E6 | Files stored outside web root | Verify `uploads/` is sibling-of `dist/`, not inside `dist/public/` |
| E7 | Per-document-type leaf paths (docs vs photos, app-namespaced) | List `uploads/hs/candidates/{docs,photos}/` |
| E8 | Virus scan (clamav) on uploaded files | Check for `clamd` integration; or scan a known EICAR file |
| E9 | Per-user upload quota (row count + total bytes) | Read upload route for quota check |

---

## F. Cryptography & Secrets

| # | Control | Method |
|---|---|---|
| F1 | New password hashes use bcrypt cost ≥ 12 | grep `bcrypt.hash(…, 12)` |
| F2 | At-rest encryption (AES-256-GCM) for `provider_config.secrets` and any PII columns | Read `secrets.service.ts`; verify `aes-256-gcm` algorithm |
| F3 | Cryptographic tokens ≥ 256 bits | `crypto.randomBytes(32)` |
| F4 | SESSION_SECRET ≥ 32 chars, not the default | grep env, count chars |
| F5 | No credentials logged at info/debug | grep `logger.*password`, `logger.*token`, `console.log.*secret` |
| F6 | Independent `INTEGRATION_SECRET_KEY` env var (NOT derived from SESSION_SECRET) | Read `secrets.service.ts` `getKey()` |
| F7 | TLS certificate validity ≥ 30 days remaining | `openssl s_client` + check `notAfter` |
| F8 | Database connection uses SSL | `SHOW ssl` in psql |

---

## G. Rate Limiting & Brute Force

| # | Control | Method |
|---|---|---|
| G1 | Global API rate limit (e.g. 2000 req per 15 min per IP) | Read `apiLimiter` config |
| G2 | Sensitive-op limiter (OTP send, integration test, password reset) | Read `sensitiveLimiter` |
| G3 | Auth limiter ≤ 20 attempts per 15 min per IP | Read `authLimiter.max` |
| G4 | Rate limits configurable at runtime (admin settings) | Check `getSetting('ratelimit.*')` usage |

---

## H. Logging & Audit Trail

| # | Control | Method |
|---|---|---|
| H1 | `audit_log` table captures state transitions (PWS §8) | Query recent rows |
| H2 | Application status changes logged via `logTransition()` | Read application.routes.ts |
| H3 | Failed login attempts captured | Query for `action ILIKE '%login%'` |
| H4 | No passwords / tokens / secrets in logs | grep `logger.*` for credential references |
| H5 | Log rotation configured (pm2 + logrotate or built-in) | Inspect pm2 ecosystem.config |

---

## I. Error Handling

| # | Control | Method |
|---|---|---|
| I1 | No stack traces leaked in API responses (NODE_ENV=production) | Trigger an error; grep response for `at ` / file paths |
| I2 | No file paths leaked in error messages | grep response for `/home/`, `node_modules` |
| I3 | 404 returned for both bogus and unauthorized GETs (anti-enumeration) | curl bogus + real-but-unauthorized; compare |
| I4 | JSON parse errors return generic message (don't echo input) | curl with malformed body |
| I5 | Validation errors return field-specific 400, not 500 | curl with invalid Zod payload; expect 400 |

---

## J. CSRF & CORS

| # | Control | Method |
|---|---|---|
| J1 | Session cookies have `SameSite=Strict` (primary CSRF defense) | Covered by A3 |
| J2 | CORS doesn't reflect unlisted origins | curl with bogus `Origin` header; check for `Access-Control-Allow-Origin` |
| J3 | `ALLOWED_ORIGINS` whitelist driven by env var, not wildcard | Read env config |
| J4 | No wildcard `*` with `credentials: true` | Read CORS config |

---

## K. Privacy & PII

| # | Control | Method |
|---|---|---|
| K1 | PII columns inventoried + documented | Query information_schema for `passport`/`aadhaar`/`phone`/`email`/`address`/`dob` columns |
| K2 | Profile-PDF / data export available (FRS 1.x, data portability) | Verify endpoint exists |
| K3 | Sensitive PII (aadhaar, passport, medical) encrypted at rest | Check encryption applied to fields |
| K4 | Candidate self-delete endpoint (GDPR Art. 17 / India DPDP Right to Erasure) | Verify `DELETE /api/v1/candidates/me` exists |
| K5 | Data retention policy documented (auto-purge after N days post-deletion) | Check for background job + documented retention |
| K6 | Consent capture on registration | Verify checkbox + DB column on signup |

---

## L. Dependency Vulnerabilities

| # | Control | Method |
|---|---|---|
| L1 | Zero high or critical npm vulns (production deps) | `npm audit --production` |
| L2 | All direct deps within 2 major versions of latest | `npm outdated` |
| L3 | Lockfile committed (npm/yarn) — reproducible installs | Check `package-lock.json` exists in git |
| L4 | License audit — no GPL/AGPL in proprietary build | `license-checker --excludePackages` |

---

## M. Infrastructure

| # | Control | Method |
|---|---|---|
| M1 | TLS ≥ 1.2 only; TLS 1.0/1.1 rejected | `openssl s_client -tls1` should fail |
| M2 | Strong cipher suite (e.g. ECDHE-ECDSA-AES256-GCM-SHA384) | `openssl s_client` + check `Cipher` line |
| M3 | Database connection uses SSL | `SHOW ssl` returns `on` |
| M4 | HSTS preload-eligible (1y + includeSubDomains + preload) | Covered by D1 |
| M5 | nginx `client_max_body_size` matches upload limit | Inspect vhost config |
| M6 | nginx hides upstream version | grep `server_tokens off;` |
| M7 | Firewall closes all ports except 80, 443, 22 (SSH) | `nmap -sT` from external |
| M8 | OS + Postgres + Node patched to latest LTS | `apt list --upgradable`, `psql --version`, `node --version` |

---

## N. Business Logic

| # | Control | Method |
|---|---|---|
| N1 | Duplicate application blocked (409) | Apply twice as same candidate to same job |
| N2 | Invalid status transitions rejected (400/403) | Try `submitted → placed` directly |
| N3 | Negative quantities rejected via Zod | Submit `targetHires: -5` |
| N4 | Workflow bypass blocked (terminal-state lock) | Try to mutate a `placed` application status |
| N5 | Race condition — concurrent pickup of the same requisition | Parallel curl pickup; expect deterministic outcome |
| N6 | Time-of-check vs time-of-use — placement created from non-selected app rejected | Try POST /placements with submitted-status app |

---

## Out of scope for this checklist

- **Penetration testing** — adversarial humans with persistence. Hire an external red team.
- **Mobile app (React Native)** — use OWASP MASVS checklist; this checklist is web-only.
- **Cloud / IAM posture (GCP)** — separate audit (CIS GCP Benchmark).
- **DDoS / WAF / CDN** — Cloudflare or equivalent, infra layer.
- **Physical / personnel security** — out of application scope.
- **Code obfuscation / IP protection** — not a security control.

---

## How to use this checklist

1. **Copy this file** into the audit run folder, name it `Audit_v<X.Y.Z>_<date>.md`.
2. **Add a "Result" and "Notes" column** to each table; fill in PASS / PARTIAL / FAIL / N/A / DEFERRED with one-line justification.
3. **Write findings** for any FAIL or PARTIAL, with severity (CRITICAL / HIGH / MEDIUM / LOW), reproduction steps, and recommended fix.
4. **Tabulate** in the executive summary at the top: totals by score, totals by severity, list of HIGH/CRITICAL items requiring fix-before-release.
5. **Ship the report** alongside any in-audit fixes in the same release commit.
6. **Re-run** on every minor version bump or any security-sensitive change.

The current run sits at [Security_Audit_Report_v0.4.5.md](./Security_Audit_Report_v0.4.5.md).
