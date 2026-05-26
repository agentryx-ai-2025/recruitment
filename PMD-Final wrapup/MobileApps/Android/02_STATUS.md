# Android — Live Status

> **For any agent / engineer reading this:** this file is your context-pickup point. Read it first. It should reflect reality within the last 24 hours of work. If it doesn't, fix it before doing anything else.

**Last updated:** 2026-05-26 · **Updated by:** Claude + Subhash · **Build version:** dev-0.4.14 (mobile timeline vocabulary fix; backend portal at v0.4.14.0)

## 📱 Tester onboarding — single source of truth

**Expo Go URL:** `exps://hirestream-mobile.agentryx.dev`
(or `exp://hirestream-mobile.agentryx.dev` — both routes work through the nginx + SSL layer that already exists for this subdomain)

Open Expo Go → "Enter URL manually" → paste the URL → Connect. Bundle downloads on first launch (~8.6 MB) then hot-reloads with every code change on the dev box.

This branded URL is **the production-equivalent delivery channel right now** because:
- Play Store listing not yet live (D3 unresolved)
- APK side-loading is friction for HPSEDC testers
- Expo Go gives them the LATEST source bundle every time they re-open the app — zero install/uninstall cycles
- Every source change committed by an engineer goes live to every tester's Expo Go in seconds (Metro hot-reload + Expo Go manifest re-fetch on launch)

> **Backend-side updates that affect mobile (May 26):** portal shipped v0.4.13.0 → v0.4.14.0. v0.4.13 introduced the `interview.conducted_by` setting + new POST `/api/v1/applications/:id/interview-outcome` endpoint replacing the confusing "Mark Selected" one-tap. v0.4.14 closed the HPSEDC UAT report's two open issues: **(a) Mobile timeline milestone lock** — `STAGES` array in `ApplicationDetailScreen.tsx` and `STATUS_CONFIG` in `MyApplicationsScreen.tsx` were using stage keys (`applied/screening/interviewing/offered/accepted`) that don't exist in the database, so `findIndex` returned -1 and every dot stayed grey. Rewrote both maps to use the real status keys (`submitted/reviewed/shortlisted/interview_scheduled/selected/placed`). Also fixed the MyApplications tab buckets which were silently dropping `interview_scheduled` rows from every tab. **(b) Placement offer letter block** — server side: applications transitioning to `selected` now auto-insert a placement row (defaults country/salary from parent job) via the new `PlacementAutoCreate` service; new `PATCH /api/v1/agent/placements/:id` lets employer/agent refine country/salary/startDate; employer placements list now matches derivative jobs via parent requisition (FRS §2.2). All fixes committed in main @ `b355b2b`.

---

## TL;DR — where we are right now

| | |
|---|---|
| **Current phase** | Phase 2–3 — Job browser + Apply + Applications + Profile + Notifications + Filters + Skeletons |
| **Sprint goal** | ✅ Backend shipped · ✅ All 11 screens · ✅ Filter bar · ✅ Skeleton loaders · ✅ Eligibility check |
| **Code shipped** | `hirestream-mobile/` — 11 screens, 3 components, API client, auth context, theme system |
| **Backend shipped** | `/mobile/auth/*` + `/mobile/push/*` + `/mobile/version` + `/mobile/config` + `/mobile/profile` + `/mobile/notifications` + mobileBearer middleware |
| **Play Store status** | No app registered yet |
| **Sentry status** | No project created yet |
| **Verify items** | Backend + UI items ready for Verify seeding |
| **Days into 8-week Android plan** | 1 (5+ weeks of planned work done) |

---

## In flight (active right now)

| Task | Owner | Started | Expected wrap | Notes |
|---|---|---|---|---|
| F0.1 — React Native repo scaffold | Subhash + Antigravity | — | Next session | Blocked until emulator account ready |
| Resolve D1 (HIM Access mobile flow) | HPSEDC IT | — | — | Blocks F1.8 |
| Resolve D3 (Play Store account ownership) | Subhash + HPSEDC | — | — | Blocks F7.1 |
| Resolve D4 (brand assets) | HPSEDC | — | — | Blocks F6.1 |

---

## Just shipped (most recent at top)

| Date | Feature | Build | Notes |
|---|---|---|---|
| 2026-05-26 | **v0.4.14 — UAT hotfix** — mobile timeline status vocabulary + branded URL live | dev-0.4.14 / hirestream@0.4.14.0 | Closes HPSEDC UAT report Issue 1 (timeline grey-dot bug) and Issue 2 (placement auto-create + employer derivative scope). Mobile screens now use real DB status keys. Branded Expo Go URL `exps://hirestream-mobile.agentryx.dev` is the canonical tester onboarding path. |
| 2026-05-25 | _(no mobile change)_ — Backend portal at v0.4.7.0 | hirestream@0.4.7.0 | Photo upload returns clean 413 (was 500), IDOR patched, employer-public jobs blocked, photo avatar consistent across listings. Worth a mobile QA pass before next mobile build — see `PMD-Final wrapup/ContextTL/01_Baseline_Context_v0.4.7.md` |
| 2026-05-12 | Environment Sync (DEV/STG) | dev-0.4.1 | Pointed mobile app to `hirestream.agentryx.dev` so mobile & portal share the same 100% synced DB |
| 2026-05-12 | Universal Login (Email/Username) | hirestream@1.1.1 | Updated backend `getUserByUsername` to universally accept either email or username |
| 2026-05-12 | F5.3–F5.5, F5.7 — Document upload flow | dev-0.4.0 | Gallery/Camera pickers, 5MB limit, multipart upload, view/delete |
| 2026-05-12 | F5.6 — Profile photo upload | dev-0.4.0 | Avatar tap uploads directly to `/api/v1/candidate-self-service/photo` |
| 2026-05-12 | F3.2 — Eligibility check on JobDetail | dev-0.3.0 | Deadline, profile completeness, experience warnings |
| 2026-05-12 | F2.2 — Filter bar (Country/Category/Salary/Experience) | dev-0.3.0 | Horizontal chips + bottom-sheet modal |
| 2026-05-12 | F2.5 — Skeleton loaders (all screens) | dev-0.3.0 | Animated pulse skeletons for Jobs, Apps, Profile, Notifications |
| 2026-05-12 | F5.2 — Profile edit screen | dev-0.2.0 | Full name, phone, language preferences |
| 2026-05-12 | F6.5 — Settings screen | dev-0.2.0 | Notifications toggle, privacy, delete account, app info |
| 2026-05-12 | F3.4 — Application detail screen | dev-0.2.0 | Stage timeline, aging badges, withdraw action |
| 2026-05-12 | F4.1 — Notifications inbox | dev-0.2.0 | Read/unread state, type-based icons |
| 2026-05-12 | F5.1 — Profile screen | dev-0.2.0 | Avatar, personal info, quick actions |
| 2026-05-12 | BottomTabBar component | dev-0.2.0 | Persistent 4-tab nav across all screens |
| 2026-05-12 | Duplicate job listing fix | dev-0.2.0 | Cross-job title+company matching for applied status |
| 2026-05-12 | F3.3 — My Applications screen (Active/Offers/Closed tabs) | dev-0.2.0 | Aging badges (7d/14d), awaiting-action pill, empty states |
| 2026-05-12 | F3.1 — Apply CTA on job detail | dev-0.2.0 | Confirmation dialog, applied/closed states |
| 2026-05-12 | F2.4 — Job detail screen | dev-0.2.0 | Info grid, skills, description, requirements, benefits, sticky apply bar |
| 2026-05-12 | F0.1 — `hirestream-mobile/` repo scaffold (Expo + TypeScript) | dev-0.1.0 | React Native, expo-secure-store, Metro bundler verified |
| 2026-05-12 | F1.2 — Login screen (email + password) | dev-0.1.0 | Form validation, loading states, branded design |
| 2026-05-12 | F1.3 — Register screen (full name, email, phone, password) | dev-0.1.0 | Client-side validation, auto-login after register |
| 2026-05-12 | F1.4 — Forgot password screen | dev-0.1.0 | Success state, anti-enumeration |
| 2026-05-12 | F1.1 — API client (bearer interceptor + auto-refresh) | dev-0.1.0 | 401 retry, concurrent refresh dedup |
| 2026-05-12 | F2.1 — Home screen (job listing + search + pull-to-refresh) | dev-0.1.0 | Cards with salary/location/skills, empty states |
| 2026-05-12 | B3.1 — `GET /mobile/version` + `/mobile/config` | hirestream@1.1.0 | Version kill-switch + feature flags. 2 tests |
| 2026-05-12 | B2.1 — `POST /mobile/push/register` + `mobile_push_tokens` table | hirestream@1.1.0 | Push token upsert + delete. 3 tests |
| 2026-05-12 | B1.3 — `mobileBearer` middleware | hirestream@1.1.0 | Coexists with passport sessions. 3 tests |
| 2026-05-12 | B1.2 — `POST /mobile/auth/refresh` + rotation table | hirestream@1.1.0 | SHA-256 token hash, reuse detection, 5-token cap. 3 tests |
| 2026-05-12 | B1.1 — `POST /mobile/auth/login` + `/register` + JWT signing | hirestream@1.1.0 | HS256 JWT, 15min access / 30d refresh. 6 tests |

---

## Next 3 things (do these in order)

1. **FCM push notifications (F4.4)** — Register device token on login, receive push when application status changes.
2. **Settings/Preferences (F5.8)** — Countries + job-role multi-select.
3. **EAS Build** — Generate signed APK/AAB for internal testing distribution.

---

## Blocked

| Task | Blocked by | Since | Severity | Owner |
|---|---|---|---|---|
| F1.8 (HIM Access SSO) | D1 | 2026-05-12 | Medium — fallback exists (email/password) | HPSEDC IT |
| F6.1 (icon + splash) | D4 | 2026-05-12 | Low — can reuse HireStream web brand as placeholder | HPSEDC |
| F7.1 (Play account) | D3 | 2026-05-12 | High — gates production launch | Subhash |

---

## Health indicators (RAG)

| Dimension | Status | Why |
|---|---|---|
| Schedule | 🟢 | Not started, no slip possible yet |
| Scope | 🟢 | Locked to candidate role v1.0; bilingual deferred per user direction |
| Quality risk | 🟢 | Backend already battle-tested (334 jest + 58 pipeline + 200+ Verify) — mobile is largely UI re-skin |
| Resourcing | 🟡 | Mobile engineer not yet assigned |
| External dependencies | 🟡 | 6 open decisions, 3 blocking |

---

## Backend mobile-surface status

| Endpoint group | Status |
|---|---|
| `/api/v1/mobile/auth/*` (login, register, refresh, logout, forgot-password) | 🟢 **Shipped** — 21 jest tests passing |
| `/api/v1/mobile/push/*` (register, delete) | 🟢 **Shipped** — 3 jest tests passing |
| `/api/v1/mobile/version` | 🟢 **Shipped** |
| `/api/v1/mobile/config` | 🟢 **Shipped** |
| `/api/v1/mobile/profile` (GET + PATCH) | 🟢 **Shipped** |
| `/api/v1/mobile/notifications` (GET + mark-read) | 🟢 **Shipped** |
| `/api/v1/mobile/account` (DELETE) | 🟢 **Shipped** |
| `mobileBearer` middleware | 🟢 **Shipped** — coexists with passport sessions |
| `mobile_refresh_tokens` table | 🟢 **Created** in dev + test DBs |
| `mobile_push_tokens` table | 🟢 **Created** in dev + test DBs |
| FCM project setup (dev/staging) | ⚪ Not started — needs GCP project |
| FCM prod project (under HPSEDC's GCP) | ⚪ Not started |

---

## Quick links

- Roadmap (feature-by-feature backlog): [01_ROADMAP.md](01_ROADMAP.md)
- Dev plan (phases, screens, exit criteria): [00_DEV_PLAN.md](00_DEV_PLAN.md)
- Learnings + issues log: [03_LEARNINGS_AND_ISSUES.md](03_LEARNINGS_AND_ISSUES.md)
- Backend API spec: [../03_DEPENDENCIES.md](../03_DEPENDENCIES.md)
- Effort + risks: [../04_EFFORT_TIMELINE_RISKS.md](../04_EFFORT_TIMELINE_RISKS.md)
- Closure checklist: [../05_CLOSURE_CHECKLIST.md](../05_CLOSURE_CHECKLIST.md)

---

## Status-file update protocol

This file is the single source of truth for "where are we now". It must be edited:

1. **At the end of every working session** — touch `Last updated`, update `In flight`, `Just shipped`, `Next 3 things`, `Blocked`.
2. **When a status changes** — even mid-session if a blocker resolves or a new one appears.
3. **When entering a new phase** — update `Current phase` and `Sprint goal`.
4. **Health indicator changes** — flip RAG and explain in `Why` column.

The `Just shipped` list grows downward (newest at top). Trim entries older than 14 days into [01_ROADMAP.md](01_ROADMAP.md) status columns — don't let this file balloon.

If you (agent or engineer) open this file and it hasn't been touched in >7 days, **assume it's stale**. Reconcile against `git log --since="<last update>"` before trusting any claim here.
