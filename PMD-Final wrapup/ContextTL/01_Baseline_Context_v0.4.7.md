# HireStream + Agentryx Verify — Baseline Context (v0.4.7.0)

> **READ THIS FIRST.** This is the context-pickup doc. If memory is lost and there's a gap between sessions, reading this single file should align you to 90-95 % of where the project is. Numbered files in this folder are appended after each significant change — the *highest-numbered* one is always the current truth.

**Last updated:** 2026-05-25 · **HireStream build:** v0.4.7.0 · **Verify buildRef on FRS project:** v0.4.5.0 · **Mobile (Android):** dev-0.4.1 · **iOS:** deferred

---

## 1 · What this is (one paragraph)

**HireStream** is the HPSEDC (Himachal Pradesh State Electronics Development Corporation) Overseas Placement Portal — a government portal that lets Himachal residents apply for vetted overseas jobs through licensed recruitment agencies. Three roles use it: **Candidates** (job seekers), **Agents** (recruitment agencies), **Employers** (overseas companies), plus **Admin / Superadmin** for HPSEDC operators. The FRS (Functional Requirements Specification) is the signed contract with HPSEDC; everything in section 1–10 of the FRS is in-scope, section 11+ is *Beyond-FRS* enhancements (separate Verify project).

**Agentryx Verify** is the **compliance-matrix portal** sitting next to HireStream — a second app on the same staging VM. It tracks signoffs (Pass / Partial / Fail / Waived) per FRS requirement across four reviewer levels (Agentryx Internal → HTIS → HPSEDC Staging → HPSEDC Final UAT). It's how we prove to HPSEDC that every contracted feature works.

**Mobile app** (`hirestream-mobile/`) — React Native + Expo, Android-first (iOS deferred). Phase 2/3 complete: 11 screens, full auth + apply flow + profile + notifications. Not yet on Play Store.

---

## 2 · Architecture — what runs where

| Component | Path | URL | pm2 id | Tech |
|---|---|---|---|---|
| HireStream portal | `~/Projects/Recruitment/hirestream` | https://hirestream-stg.agentryx.dev | 0 | Express + React (Vite) + Drizzle + PostgreSQL |
| Agentryx Verify portal | `~/Projects/Recruitment/agentryx-verify` | https://verify-stg.agentryx.dev | 1 | Express + React + Drizzle + PostgreSQL (sep DB) |
| Mobile app (Android) | `~/Projects/Recruitment/hirestream-mobile` | (Expo, not deployed) | — | React Native + Expo |
| Docs / PMD | `~/Projects/Recruitment/PMD-Final wrapup` | — | — | Markdown |

**Monorepo:** one git repo at `~/Projects/Recruitment` → https://github.com/agentryx-ai-2025/recruitment (private). The two inner apps had their `.git` removed during the May 5 monorepo flatten; their history before that is preserved on `microaistudio/hirestream` and `microaistudio/agentryx-verify` separately.

**Infrastructure:**
- GCP VM `hirestream-stg` in `asia-south1-a` (Mumbai), e2-standard-2, Ubuntu 24.04, external IP `34.180.25.44`
- GCP project `project-b0269a48-819d-4969-832` (Anthropic-owned sandbox — **not in any customer Google account**; reachable only via the Claude harness terminal)
- Owner email (Cloud Console): `microaistudio2025@gmail.com` (discovered May 5 by signing into the Console; project ID `project-b0269a48-...` is misleadingly auto-generated)
- Postgres local, two databases: `hirestream` (portal) and `agentryx_verify` (compliance), SSL on, password `hirestream` for the `hirestream` user
- nginx vhost per app with `client_max_body_size 20m`
- HTTPS via Let's Encrypt, TLS 1.2+ only

---

## 3 · Where we are right now (today's truth)

### HireStream

- **Build:** v0.4.7.0 (sourced from `hirestream/VERSION` file → server reads at boot → `GET /api/v1/version` → footer fetches and renders)
- **State:** Pre-launch staging. HTIS has done two test rounds; both DOCX defect lists are closed. ~10h of security-hardening work remains before production launch (`PMD-Final wrapup/Security Audit/Internal/01_Security_Audit_Report_v0.4.5.md` § "Before launch").
- **All HTIS bugs fixed:** BUG-001 through BUG-009 from the Apr-22 DOCX. Photo-upload UX issues from May 25 (no size hint, photo missing in 5 listings) — fixed in v0.4.7.0.
- **Test suite:** 355 / 355 jest passing
- **Flow A E2E (employer post → agent pickup → candidate apply → shortlist → employer review → interview → select → place → accept):** 13 / 13 curl-verified

### Agentryx Verify

- **HireStream-v1.4 project (the FRS contract):** 149 rows total. ~104 signed off (rejected / waived / passed) by the agentryx-internal reviewer. 45 pre-HTIS waivers still need re-review by a human — most are now obsolete since features have shipped. **3 sprints deployed** flagging fixed items for re-verify (Sprint 1 — v0.9.5 tester fixes, Sprint 2 — v0.9.8 HTIS Apr 22, Sprint 3 — v0.4.5.0 workflow + security).
- **HireStream-htis-smoke project:** 77 generic-web-app smoke rows seeded from HTIS's Apr 22 Excel workbook. 21 rejected by HTIS, mostly addressed in HireStream fixes or noted as out-of-scope (admin pagination, mobile-layout breakpoints).
- **HireStream-mobile-v1.0 project:** 5 open issues (HIRE-001 through HIRE-005), mobile-app concerns.
- **HireStream-v1.5-extras project:** Beyond-FRS enhancements. Hidden from non-admin reviewers via the visibility toggle.

### Mobile (Android)

- **Build:** dev-0.4.1
- **State:** Phases 0–3 complete (scaffold, auth, jobs browse + apply, profile, notifications, filters, document upload). Not on Play Store. Backend `/api/v1/mobile/*` endpoints live.
- **Blockers:** D1 (HIM Access mobile SSO flow), D3 (Play Store account ownership at HPSEDC), D4 (brand assets from HPSEDC)

### iOS

- **State:** Not started. Will not start until Android v1.0 reaches Play Store internal track.

---

## 4 · Credentials cheat sheet (test accounts)

| Portal | Username | Password | Role |
|---|---|---|---|
| HireStream | `superadmin` | `hpsedc@super2026` | Superadmin |
| HireStream | `demo_admin` | `test123` | Admin |
| HireStream | `demo_employer` | `test123` | Employer |
| HireStream | `europe_careers` | `test123` | Agent (verified) |
| HireStream | `demo_agent`, `gulf_jobs_direct`, `japan_pathways` | `test123` | Other agents |
| HireStream | `priya_verma` (100 % profile, has placement) | `test123` | Candidate |
| HireStream | `meera_iyer` (88 %, missing docs) | `test123` | Candidate |
| HireStream | `demo_candidate`, `rohan_mehta`, `vikram_negi`, `ananya_bhatt`, `sigma`, `sonam_rai`, `arjun_sharma` | `test123` | Other candidates |
| Verify | `admin` | `admin` | Portal admin (changed from `ulan@2026`) |
| Verify | `agentryx` | `ulan` | Agentryx Internal reviewer |
| Verify | `htis` | `test123` | HTIS reviewer |
| Verify | `hpsedc` | `test456` | HPSEDC Staging reviewer |
| Verify | `uat` | `test789` | HPSEDC Final UAT reviewer |

GitHub PAT for monorepo push lives in `PMD-Final wrapup/keys.md` (gitignored). GCP Console for staging project is **only reachable as `microaistudio2025@gmail.com`** — other Google accounts return PERMISSION_DENIED.

---

## 5 · Where we're heading

### Before production launch (~10h of work)

From the security audit `Before launch` cluster:

1. **H-2** — `npm audit fix` for 8 high-severity transitive npm vulns (~2h)
2. **M-1** — account lockout after N failed logins (~2h)
3. **M-2** — tighten `authLimiter` from 200 → 10-20 attempts per 15 min (~5 min)
4. **M-5** — AES-encrypt `users.aadhaar_number` column before HPSEDC enables Aadhaar collection (~1h)
5. **M-6** — `DELETE /api/v1/candidates/me` endpoint for India DPDP Right to Erasure (~3h)
6. **M-7** — set explicit `INTEGRATION_SECRET_KEY` env var so encrypted secrets survive SESSION_SECRET rotation (~30 min)

Plus operational:

- **Mobile app** — Android v1.0 to Play Store internal track (blocked on HPSEDC items D1/D3/D4)
- **Backup → offsite** — current local snapshots survive VM reboot, not VM destruction. Need GCS bucket in own GCP project for Tier 3 from backup audit
- **External IT security review** — hand the audit report + checklist (`PMD-Final wrapup/Security Audit/Internal/`) to HPSEDC IT and let them run their pass

### Nice-to-have, pre-1.0

- M-3 — clamav on uploads (~3h)
- M-4 — per-user upload quota (~2h)
- L-1 — nonce-based CSP (1d, requires Vite rework)
- iOS app (deferred until Android internal track lives)

---

## 6 · Landmines / things that have bitten us

(In rough order of "most likely to bite again")

- **30-min session timeout** caught us during E2E curl scripts. If a test takes >30 min, re-login mid-script.
- **Derivative job pattern (FRS §2.2):** every candidate-facing job MUST go through an agent. Employer posts a `requisition` (visibility=`agents_only`, no `agentId`), an agent `picks up` to create a `derivative` (visibility=`public`, `agentId` set, `parentRequisitionId` chained). **Any new employer-facing endpoint that queries jobs must include derivatives.** Use `ownedJobIds(db, userId)` from `employer.routes.ts` — don't invent a new filter. v0.4.5.0 hard-pins employer-posted jobs to `agents_only` regardless of client payload — prevents the orphan-application bug that confused HPSEDC's tester.
- **drizzle `sql` with arrays:** Never `` sql`... = ANY(${jsArray}::text[])` ``. Use `inArray(col, jsArray)` from `drizzle-orm`. Regression covered by A2.37 in Verify.
- **nginx `client_max_body_size` per vhost** — any new subdomain needs explicit `20m` setting, default 1 MB silently kills uploads.
- **Single-session-per-user** was a default that silently destroyed Mac sessions when the same user logged in on Windows. Setting `auth.single_session_per_user` is now default OFF. Only password-reset + password-change still unconditionally kill other sessions (CWE-613/384 requirements).
- **Re-seeding Verify can wipe signoffs.** `signoffs.requirementId` has `onDelete: cascade`. Always UPSERT (`onConflictDoUpdate`) on `(projectId, itemRef)`, never DELETE + re-INSERT. Both `seed.ts` and `seed-v15-extras.ts` are now UPSERT-only.
- **provider_config.secrets uses AES-256-GCM with key derived from SESSION_SECRET** (`secrets.service.ts:33`). If SESSION_SECRET ever rotates, every encrypted secret is unrecoverable. Set `INTEGRATION_SECRET_KEY` env var (M-7 above) before production.
- **5 MB file upload limit** (server `env.MAX_FILE_SIZE_MB`). Client UI now matches. Anything raising the limit also needs the nginx `client_max_body_size`.
- **VERSION file is single source of truth** since v0.4.1.0. Don't edit `package.json` version or hardcode strings in the footer; bump `hirestream/VERSION` + restart pm2. The footer fetches `/api/v1/version` on every page load.

---

## 7 · How to do common ops (no thinking required)

```bash
# Connect to the staging Postgres
PGPASSWORD=hirestream psql -h localhost -U hirestream -d hirestream

# Bump a version (4-segment: MAJOR.MINOR.PATCH.HOTFIX)
echo 0.4.8.0 > hirestream/VERSION && cd hirestream && npm run build && pm2 restart hirestream

# Restart either app
pm2 restart hirestream
pm2 restart agentryx-verify

# Tail errors (last 50 lines)
pm2 logs hirestream --lines 50 --nostream --err

# Re-seed Verify projects (signoffs preserved via upsert)
cd ~/Projects/Recruitment/agentryx-verify && npx tsx scripts/seed.ts

# Run the jest suite (3.5 min)
cd ~/Projects/Recruitment/hirestream && npm test -- --testPathPatterns=pipeline

# Create a manual backup snapshot (DB + uploads, single .tar.gz, ~24 MB)
# Auto-scheduled too: superadmin → Backups → toggle on, pick hour, retention days
# Restore: scripts/restore-snapshot.sh <bundle.tar.gz>  (TTY-only, requires "YES RESTORE" confirmation)

# Commit + push to monorepo (PAT in .git/.gh-credentials, no re-auth needed)
git add -A && git commit -m "..." && git push
```

---

## 8 · Where things live (when "where is X?" comes up)

| Concern | Location |
|---|---|
| HireStream server routes | `hirestream/server/routes/*.ts` |
| HireStream shared schema (Drizzle + Zod) | `hirestream/shared/schema.ts` |
| HireStream React pages | `hirestream/client/src/pages/*.tsx` |
| Auth middleware | `hirestream/server/middleware/auth.middleware.ts` |
| Upload middleware (magic-byte, error mapping) | `hirestream/server/middleware/upload.middleware.ts` |
| Rate limiters | `hirestream/server/middleware/rateLimit.middleware.ts` |
| Backup service | `hirestream/server/services/backup.service.ts` |
| Notification dispatcher (single entry point) | `hirestream/server/services/notification.service.ts` |
| AES secret encryption | `hirestream/server/services/secrets.service.ts` |
| Verify FRS matrix source | `hirestream/A.PMD/Dev Plan Architecture & Phasing/Verification & UAT/01_FRS_Compliance_Matrix.md` |
| Verify seed scripts | `agentryx-verify/scripts/{seed,seed-v15-extras,seed-htis,seed_htis_clarifications,refresh_htis_evidence}.ts` |
| Verify schema | `agentryx-verify/shared/schema.ts` |
| Mobile screens | `hirestream-mobile/src/screens/*.tsx` |
| Mobile docs (DEV_PLAN / ROADMAP / STATUS / LEARNINGS) | `PMD-Final wrapup/MobileApps/{Android,iOS}/0*_*.md` |
| Security audit | `PMD-Final wrapup/Security Audit/Internal/0*.md` |
| Dev methodology | `PMD-Final wrapup/AGENTRYX_DEV_METHODOLOGY.md` |
| Authoritative E2E workflow spec | `hirestream/A.PMD/E2E_Workflow__Final_STG.md` |
| Notifications test plan (HTIS) | `hirestream/A.PMD/Notifications_Test_Plan_for_HTIS.{md,html}` |
| HTIS testing methodology | `hirestream/A.PMD/Testing & User Documents/05_HTIS_Testing_Methodology.{md,html}` |

---

## 9 · What shipped in the 5-day burst (May 21 – May 25)

| Ver | Headline | Key files |
|---|---|---|
| **v0.4.1.0** | Workflow integrity — employer can no longer post public jobs (FRS §2.2), candidate can't apply to agents_only jobs, mobile-config TS import fix, single-source VERSION file (server reads → API → footer fetches) | `job.routes.ts`, `VERSION`, `server/index.ts`, `footer.tsx` |
| **v0.4.2.0** | Signals fixes — SMTP false alarm (was checking env only, not admin config), unverified-agency guard turned on; verified Japan Pathways | `superadmin-ops.routes.ts` |
| **v0.4.3.0** | Full-system backup module — HS DB + Verify DB + both apps' uploads → one tar.gz; scheduler with toggle / hour / retention; restore script | `backup.service.ts`, `restore-snapshot.sh`, BackupsView UI |
| **v0.4.4.0** | Pre-HTIS-round-2 E2E sweep fixes — job route safeParse (clean 400 not 500), upload-error handler (413 / 400 mapping), phase-5 test repair, jest unblocked (355/355) | `job.routes.ts`, `upload.middleware.ts`, `document.routes.ts` |
| **v0.4.5.0** | **Security audit (self-conducted) + IDOR fix.** 14 categories, 65 controls, 48 PASS / 2 HIGH (1 fixed) / 7 MEDIUM open. **IDOR on `PATCH /applications/:id/status` patched** — agent could change status of any application by knowing its UUID. | `application.routes.ts`, `Security_Audit_v0.4.5.md` |
| **v0.4.6.0** | Photo upload clean error responses — handleUploadErrors wired to candidate-self-service router (was missed), client size-limit aligned 5 MB, real server message surfaced in toast | `candidate-self-service.routes.ts`, `candidate-dashboard.tsx` |
| **v0.4.7.0** | Photo avatar shared component — extracted PhotoAvatar to `components/shared/`, wired into 5 missed listings (agent-candidate-detail, agent-applicants, employer-review × 2, agent-job-detail, agent-dashboard quick-view), added upload-spec hint | `PhotoAvatar.tsx`, 5 page files |

Plus on Verify portal: closed fake HIRE-003 test issue, bumped FRS project buildRef to v0.4.5.0, deployed Sprint 3 covering 21 itemRefs (16 previously-rejected/waived signoffs now show 🔁 re-verify chip).

Plus monorepo / infra: migrated to `agentryx-ai-2025/recruitment` GitHub, set up per-repo PAT credential helper, organized `PMD-Final wrapup/Security Audit/{Internal,External}/`.

---

## 10 · Open items not in any "before launch" cluster

| Item | Severity | Notes |
|---|---|---|
| 45 agentryx-internal pre-HTIS signoffs on hirestream-v1.4 | low | Need a human walk-through; most are obsolete since features shipped |
| 5 mobile-app open issues (HIRE-001…HIRE-005) | low–med | Mobile codebase scope, not portal |
| 6 Verify feedback items in `submitted` status | low | Admin needs to triage |
| HTIS XLSX clarifications (18.6–18.11) | low | Waiting on HTIS to reply with specifics for multi-tab, delete-confirmation, mobile-layout, toast UX |
| Verify portal own security audit | medium | We audited HireStream; Verify hasn't had its own pass yet |
| Mobile app OWASP MASVS pass | medium | When Android approaches Play Store |
| External pen-test by humans | high (pre-launch) | Internal audit is structured checklist, not adversarial |

---

## How to refresh this doc

Drop a new numbered file in `PMD-Final wrapup/ContextTL/` after any version bump that materially changes architecture, scope, owner, or blockers. Format: `<NN>_Baseline_Context_v<X.Y.Z.B>.md`. The numbered file with the highest prefix is always the truth; older ones are kept as audit trail. Don't edit existing baselines — append new ones.
