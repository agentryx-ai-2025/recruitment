# HPSEDC Mobile Application — Planning Package

**Owner:** Agentryx · **Doc set version:** v0.1 · **Last updated:** 2026-05-12

This folder is the planning package for the **HPSEDC Overseas Placement Portal mobile application** — the iOS and Android counterpart to the existing HireStream web app. It is a response to the open scope flagged by **STIS + HPSEDC** during UAT of the web portal.

---

## 1. Is a mobile app actually in scope?

**Yes — contractually required.** The FRS leaves no ambiguity:

| Source | Quote |
|---|---|
| FRS title page | *"Functional Requirements Specifications for Overseas Placement Portal **& Mobile Application** (HPSEDC)"* |
| FRS §2.8 *Other Features* | *"Platform: Web application compatible with major browsers and responsive on smartphones and tablets, **iOS and Android applications.**"* |
| FRS §3.2 *Non-Functional* | *"Usability: …mobile responsiveness; accessibility features…"* (web responsive — does **not** substitute for native apps) |

Full FRS-derived scope analysis lives in [01_SCOPE.md](01_SCOPE.md).

---

## 2. Strategic position — "very basic" interpretation

The user instruction is: a **basic mobile app for both stores**, built primarily to **close the contracted FRS scope**, not to ship a feature-rich mobile experience that competes with the web app.

That framing drives every recommendation in this package:

- **Audience priority for v1.0:** Candidates only. Agents + Admin stay on the web.
  *(Candidates are the volume users; the FRS §2.2 module list for "Candidate" is also the smallest, most stable surface.)*
- **Feature priority for v1.0:** Browse jobs · Apply · Track application status · Get notifications · Manage profile.
- **Out of scope for v1.0:** Agency dashboards, employer review queues, admin reports, drive management, scorecards, kanban, analytics.
- **Platform priority:** **Android first** (per user direction + 4× larger Indian install base), then iOS port from the same codebase.

This is captured fully in [02_STRATEGY_AND_STACK.md](02_STRATEGY_AND_STACK.md).

---

## 3. Document index

### Top-level — strategic (write once, edit rarely)

This folder follows the **Agentryx development methodology** — see [../AGENTRYX_DEV_METHODOLOGY.md](../AGENTRYX_DEV_METHODOLOGY.md) for the generic template that any project should instantiate. The HPSEDC mobile app is one instantiation of it.

| # | Doc | Purpose |
|---|---|---|
| 00 | [README.md](00_README.md) | This file — executive summary + doc index |
| 01 | [SCOPE](01_SCOPE.md) | What the contract / FRS requires; in-scope vs out-of-scope; requirement traceability |
| 02 | [STRATEGY & STACK](02_STRATEGY_AND_STACK.md) | Architecture and tech-stack choices, with rationale and alternatives |
| 03 | [DEPENDENCIES](03_DEPENDENCIES.md) | What this project needs from other systems / teams (here: backend API adaptations + FCM + APNs) |
| 04 | [EFFORT, TIMELINE & RISKS](04_EFFORT_TIMELINE_RISKS.md) | Effort matrix per phase, critical path, risk register, mitigations |
| 05 | [CLOSURE CHECKLIST](05_CLOSURE_CHECKLIST.md) | Line-by-line list to declare the project "done" against the contract |
| 06 | [DECISIONS](06_DECISIONS.md) | Architecture Decision Records (ADRs). Why we chose what we chose — captured once, never re-litigated |
| 07 | [RUNBOOK](07_RUNBOOK.md) | Incident-response playbook — the 3 AM doc when something is on fire |
| 08 | [SECURITY & COMPLIANCE](08_SECURITY_AND_COMPLIANCE.md) | Data flows, PII handling, GDPR/PDPA/GIGW/ISO 27001 mapping to implementation evidence |

### Platform folders — execution (live, updated every working session)

| Folder | Status | Contains |
|---|---|---|
| [Android/](Android/) | 🟡 **Active** (current focus) | Dev plan + roadmap + live status + learnings log. The agent context-pickup point for anyone working on the Android build. |
| [iOS/](iOS/) | ⏸ Deferred until Android v1.0 internal track ships | Same four-doc structure, currently stubbed. |

**Standard execution-stream template** used in each platform folder (and in any future "stream" of work — frontend / backend / mobile / etc.):

| File | Edit frequency | Why it exists |
|---|---|---|
| `00_DEV_PLAN.md` | Rare | One-time implementation plan — phases, milestones, exit criteria |
| `01_ROADMAP.md` | Every status change | Feature backlog organised by phase, with status + owner + deps + estimate/actual + Verify item |
| `02_STATUS.md` | Every working session | Live "where are we now" snapshot — the agent/engineer entry point |
| `03_LEARNINGS_AND_ISSUES.md` | Whenever a non-obvious lesson lands | Running incident + lessons log |
| `04_CHANGELOG.md` | Every release | Per-build release notes — also feeds Play Store / App Store listings |
| `README.md` | Rare | Folder-local index + onboarding pointer |

**For any future agent or engineer reading this folder:** start at the platform folder's `02_STATUS.md`, then `01_ROADMAP.md`, then `03_LEARNINGS_AND_ISSUES.md`. The top-level docs (01–08) only need re-reading if scope or architecture is shifting.

---

## 4. Top-level recommendation — at a glance

| Decision | Recommendation | Rationale |
|---|---|---|
| Stack | **React Native (Expo, Bare workflow)** with TypeScript | Reuses TypeScript skills + shared types from `hirestream/shared/`. One codebase, two platforms. Mature push, file upload, camera, deep-link tooling. |
| Auth | Add **JWT bearer-token flow** at `/api/v1/mobile/auth/*` alongside existing session auth | Mobile clients handle cookies poorly; bearer tokens are the standard. Existing `passport-local` strategy stays intact for web. |
| Push | **FCM (Android)** + **APNs (iOS)** behind a unified `/api/v1/mobile/push/register` backend endpoint | Industry standard; aligns with FRS §2.2 "Notifications" requirement |
| Scope v1.0 | **Candidate role only**, 12 screens (see [03_Android_Dev_Plan.md §3](03_Android_Dev_Plan.md)) | Minimal but FRS-complete for candidate workflow |
| Effort v1.0 (Android) | **6–8 weeks** for 1 senior mobile engineer | Includes: backend adaptations, app build, Play Store submission |
| iOS port | **+2–3 weeks** after Android v1.0 ships | Shared codebase; iOS-specific work = APNs cert, App Store account, iOS-only UX polish, TestFlight |
| Total to "FRS-closed" | **~10–12 weeks** | Both stores, push enabled, candidate flow end-to-end |

---

## 5. Decisions still needed from HPSEDC / Subhash before kickoff

1. **HIM Access SSO on mobile** — does HPSEDC have a mobile SDK or a web-OAuth fallback? *(Critical-path blocker for login screen.)*
2. **Aadhaar verification on mobile** — same question. Likely fine to defer to web-view in v1.0.
3. **Play Store + App Store developer accounts** — under whose name (HPSEDC vs. Agentryx)? Annual cost = ₹2,000 (Play, one-time) + $99/yr (Apple).
4. **App branding** — does HPSEDC have an icon set / colour palette? If not, reuse the HireStream web brand.
5. **Distribution strategy** — public Play Store / App Store, or internal/closed track first?
6. **Multilingual scope for v1.0** — FRS §2.8 says multilingual; should v1.0 ship English + Hindi, or English-only and Hindi in v1.1?

These are surfaced in [04_EFFORT_TIMELINE_RISKS.md §3](04_EFFORT_TIMELINE_RISKS.md) as flagged risks. They do **not** block the planning phase, but several gate the start of implementation.

---

## 6. Relationship to existing HireStream + Verify codebase

- **No new repo.** The mobile app will live as a sibling workspace under `~/Projects/Recruitment/hirestream-mobile/` (separate package, same monorepo philosophy as `agentryx-verify/`).
- **Shared types** (`shared/schema.ts`, `shared/api-types.ts`) will be linked, not duplicated. Drizzle schema is the contract.
- **Verify project** (`agentryx-verify`) will track mobile-app signoff items in a new project `hirestream-mobile-v1.0` once development begins. Seeding pattern follows the existing `scripts/seed-v15-extras.ts` upsert convention.
- **HireStream backend** gains a new route group `/api/v1/mobile/*` for bearer-auth endpoints + push registration. Existing web endpoints are untouched.

---

## 7. Status

Live status now lives **inside the platform folders**, not here. Don't update this section — it will drift.

- For Android (current focus): [Android/02_STATUS.md](Android/02_STATUS.md)
- For iOS (deferred): [iOS/02_STATUS.md](iOS/02_STATUS.md)

This top-level README only updates when:
- A new top-level doc is added (00-07)
- The strategic recommendation in §4 changes
- A platform folder graduates from deferred → active

Everything else is execution detail, owned by the platform folders.
