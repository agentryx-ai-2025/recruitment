# 08 — Security & Compliance

**Purpose:** Map FRS §2.9 + §3.2 compliance requirements to concrete implementation evidence. This is the doc HPSEDC auditors and Apple/Google policy reviewers ask for. Maintain it commit-by-commit, not at audit time.

---

## 1. Regulatory + standards inventory

| Standard | Source | Applies to | Our compliance posture |
|---|---|---|---|
| **GDPR / PDPA-equivalent** | FRS §2.9 | All personal data | Lawful basis = consent (registration) + contract (placement). Right to access, delete, rectify implemented. |
| **GIGW (Guidelines for Indian Government Websites)** | FRS §2.9 + government default | Web + mobile UX | Accessibility (WCAG AA), Hindi support (web v0.10, mobile v1.1), no third-party tracking without disclosure |
| **ISO 27001** | FRS §3.2 | Information security management | Defer formal audit; align controls during build (encryption, RBAC, audit log, deployment process) |
| **Google Play Data Safety** | Play Store policy | Mobile-Android | Filled at submission; lists every category we collect + purpose |
| **Apple App Privacy** | App Store policy | Mobile-iOS | Filled at submission; nutrition-label format |
| **Indian DPDPA 2023** | Indian law | Indian users | Consent + purpose limitation + breach reporting within 72h |

---

## 2. Data flow inventory — what PII we touch

| Data category | Source | Stored at | Transmitted via | Retained for | Deletion path |
|---|---|---|---|---|---|
| Email | User registration | `users.email` (Postgres) | HTTPS to backend | Until account deleted | `DELETE /api/v1/me` cascades |
| Phone | User registration / OTP | `users.phone` | HTTPS | Until deletion | Same |
| Aadhaar number (last 4 only) | Optional verification step | `candidate_verifications.aadhaar_last4` (hashed) | HTTPS, never logged | 1 year post-deletion (audit) | Auto-purged via cron |
| Date of birth | Profile | `candidates.date_of_birth` | HTTPS | Until deletion | Cascade |
| Address (line 1/2, city, pin) | Profile (added v0.9.5) | `candidates.address_line_1` etc. | HTTPS | Until deletion | Cascade |
| Passport scan | Document upload | `uploads/hs/candidates/docs/` (FS) | HTTPS multipart | Until deletion | File + DB row cascade |
| Photo | Profile photo upload (web v0.9.3) | `uploads/hs/candidates/photos/` | HTTPS multipart | Until deletion | Cascade |
| Application history | Apply to job | `applications` table | HTTPS | Until deletion | Cascade |
| Device push token | Mobile registration | `mobile_push_tokens.token` | HTTPS | Until logout / token expiry | `DELETE /api/v1/mobile/push/register` |
| Crash reports | Sentry capture | Sentry SaaS (EU region recommended) | HTTPS | 30 days (Sentry retention setting) | Sentry per-event deletion API |
| Login audit log | Auth events | `auth_events` table | HTTPS | 7 years (ISO 27001 alignment) | Quarterly anonymisation cron |

**Data NOT collected** (state this clearly in privacy policy + store listings):
- Precise location (no GPS request in mobile v1.0)
- Contacts / address book
- Microphone / camera background access
- Advertising ID / cross-app tracking (no ATT prompt needed on iOS)
- Biometric data (face / fingerprint)
- Social-graph data

---

## 3. Security controls — how

| Control | Implementation | Evidence location |
|---|---|---|
| **TLS in transit** | nginx termination on staging + prod VMs, Let's Encrypt certs | `/etc/nginx/sites-enabled/hirestream.conf` |
| **Cert pinning (mobile)** | Deferred to v1.1 — high effort, marginal value while domain is stable | (planned) |
| **Encryption at rest** | Postgres on VM disk (LUKS not configured — gap, see §7); uploads on same disk | (gap flagged) |
| **Token storage on device** | `expo-secure-store` → Android Keystore / iOS Keychain | `lib/auth.ts` once built |
| **Password hashing** | bcrypt (cost factor 12) via existing passport-local strategy | `server/auth/passport-local.ts` |
| **JWT signing** | HS256 with 64-char `JWT_SECRET`; rotation supported via `JWT_SECRET_PREVIOUS` | `server/auth/mobileBearer.ts` (planned) |
| **Refresh token rotation** | 30-day TTL, one-time use, reuse detection revokes entire chain | `mobile_refresh_tokens.rotated_to` chain |
| **Rate limiting** | `authLimiter` on `/api/v1/auth/*` and `/api/v1/mobile/auth/*` | `server/middleware/rate-limit.ts` |
| **Magic-byte file validation** | Server-side check on every upload | `server/middleware/upload.ts` (v0.9.5) |
| **Upload namespace segregation** | `uploads/hs/candidates/{docs,photos}/` — Verify and HireStream have disjoint roots | (v0.9.7) |
| **Audit logging** | Every auth event + state transition in `audit_logs` table | Existing |
| **Single-session enforcement** | Opt-in via `auth.single_session_per_user` setting; default OFF (v0.8.3) | Admin settings |
| **Account deletion** | `DELETE /api/v1/me` cascades across all PII tables + revokes tokens | Existing |
| **CSRF protection (web)** | passport sessions + same-site cookie | Existing |
| **CSRF protection (mobile)** | N/A — Bearer tokens immune | — |
| **Content Security Policy (web)** | helmet CSP config | `server/index.ts` |
| **HSTS** | nginx config (`Strict-Transport-Security`) | nginx vhost |
| **CORS** | Whitelist allowed origins (web app + verify app); deny by default | `server/index.ts` |

---

## 4. Mobile-specific privacy disclosures

### Google Play Data Safety form — what to declare

| Data type | Collected? | Shared? | Purpose | Required / optional |
|---|---|---|---|---|
| Email address | Yes | No | Account management, communications | Required |
| Phone number | Yes | No | Account management, OTP | Required |
| Name | Yes | No | Account, displayed to recruiters | Required |
| Address | Yes | No | Eligibility for region-specific jobs | Optional |
| Photos / videos | Yes (profile photo, doc scans) | Shared with recruiting agencies user applies to | Profile + applications | Optional (photo); required (CV/passport for applying) |
| Documents (CV, passport, certs) | Yes | Shared with recruiting agencies user applies to | Job applications | Required for applying |
| App activity (in-app interactions) | Yes (notifications opened, jobs viewed) | No | Analytics, push targeting | Required |
| Device IDs (FCM token) | Yes | Sent to Google FCM only | Push delivery | Required |
| Crash logs | Yes | Shared with Sentry | App diagnostics | Optional (user can opt out via settings — F4.6) |
| Approximate location | No | — | — | — |
| Precise location | No | — | — | — |
| Contacts | No | — | — | — |
| Financial info | No | — | — | — |
| Health info | No | — | — | — |

Security practices section: encryption in transit ✓, data deletion request ✓, follows Play Families policy n/a (18+ app), independent security review ✗ (defer to v1.5 if HPSEDC requires).

### Apple App Privacy nutrition label — same content, different schema

Mirror the above, mapped to Apple's "Data used to track you" / "Data linked to you" / "Data not linked to you" buckets. Nothing in this app falls under "Data used to track you" because we don't share data with third-party trackers.

---

## 5. Required user-facing flows

| Flow | Where it lives | Status |
|---|---|---|
| Privacy policy (in-app + hosted URL) | Settings screen + public web page | ⚪ Not built (F6.5) |
| Terms of service | Same | ⚪ Not built |
| Consent at registration | Registration screen — "I agree to the Privacy Policy and Terms" checkbox | ⚪ Not built (F1.3) |
| Account deletion (in-app) | Settings → Delete account → confirm | ⚪ Not built (F6.6) — **Required by Play Store + App Store** |
| Data export request | Settings → "Download my data" (JSON dump) | ⏸ Deferred — handle manually via support for v1.0, automate in v1.1 |
| Push notification opt-out | Settings → Notification preferences | ⚪ Not built (F4.6) |
| Crash reporting opt-out | Same | ⚪ Not built |

---

## 6. Compliance evidence for HPSEDC audit

When HPSEDC asks "show us your security posture", these are the artifacts to present:

1. **This document** — `08_SECURITY_AND_COMPLIANCE.md` (the inventory)
2. **Architecture diagram** — embed below or maintain externally
3. **Audit log query** — sample `audit_logs` rows showing every auth event
4. **Penetration test report** — TBD; budget for one before public production launch
5. **Privacy policy URL** — public, version-controlled
6. **Deletion-flow demo** — screen recording of `DELETE /api/v1/me` clearing all PII
7. **Backup + restore procedure** — **gap, see §7**

---

## 7. Known gaps + roadmap

These are real exposure points, flagged honestly. Each has a planned mitigation.

| Gap | Risk | Planned mitigation | Owner | Target |
|---|---|---|---|---|
| **No DB backups on staging VM** — incident 2026-04-19 lost signoff data | High (data loss) | Configure WAL archiving + nightly logical dumps to a separate volume | Subhash | Before mobile v1.0 production |
| **No LUKS / disk-level encryption on VM** | Medium (physical access) | GCP boot-disk encryption is on; data-disk not separately encrypted; review | Subhash | v1.1 |
| **No certificate pinning on mobile** | Low (MITM via rogue CA) | Add `react-native-ssl-pinning` post-eject | Mobile engineer | v1.1 |
| **No penetration test** | Medium (unknown vulnerabilities) | Schedule before public production | Subhash | Before public production |
| **`JWT_SECRET` rotation procedure undocumented** | Medium (operational risk) | Document in runbook (P1 covers detection; need add procedure) | Backend engineer | Before mobile v1.0 |
| **Sentry retention not yet configured** | Low (over-retention of crash data) | Set 30-day retention in Sentry project settings | Mobile engineer | At Sentry project creation (F0.4) |
| **Data-export request flow is manual** | Low (GDPR right-to-portability) | Automate JSON export from settings | Mobile + backend | v1.1 |
| **No formal ISO 27001 audit** | Low (not contractually required, but useful for state-gov references) | Defer; align controls now | Subhash | Future |

---

## 8. Update protocol

This file is **commit-by-commit**, not annual:

1. **Adding a new data category to the schema** (e.g. a new PII column) → update §2 in the same commit.
2. **Adding a new third-party SDK** (e.g. PostHog) → update §3 + §4 with the data it sees.
3. **Adding a new user-facing privacy flow** → update §5.
4. **Closing a gap from §7** → move it from §7 to §3 with the evidence row populated.
5. **Discovering a new gap** → add to §7 within 24h, even if no mitigation is ready.

Treat §7 like the runbook: honest, current, dated. A gap log that's empty is suspicious; a gap log that names real issues with target dates is what auditors trust.
