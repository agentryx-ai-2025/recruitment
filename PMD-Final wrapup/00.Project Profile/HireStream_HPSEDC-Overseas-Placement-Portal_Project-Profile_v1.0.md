---
project: HireStream — HPSEDC Overseas Placement Portal
client_sector: HPSEDC (Himachal Pradesh State Electronic Development Corporation) — Department of Information Technology, Government of Himachal Pradesh
industry: GovTech / e-governance; international labour mobility & overseas placement
engagement_type: full-stack product build + platform delivery + advisory (FRS / SOW / SRS authorship)
duration_status: 2025–2026 · in delivery (web platform live on staging at v0.7.7.0; mobile app in planning; Milestone-1 design approval cleared)
team: Lean Agentryx delivery — founder / solution architect plus an integrated AI-agent fleet covering full-stack engineering, QA & testing automation, DevOps, and project management
delivery_model: hybrid (staging on managed Linux; production-ready for HPSEDC on-prem hand-over)
descriptor: A configuration-driven, multi-role overseas-placement platform that takes a Himachal Pradesh candidate from registration to verified placement abroad through KYB-licensed agencies and employers — wrapped in an embedded testing framework with a pre-merge confidence gate that calibrates release risk on every push.
tags: [GovTech, e-governance, overseas placement, KYB verification, multi-role platform, workflow / BPM, audit log, configurable policy engine, embedded testing, LLM triage, confidence scoring, country lifecycle, WCAG 2.1 AA, GIGW, React, TypeScript, Express, Drizzle ORM, PostgreSQL, Jest, Playwright, Loki, PM2, React Native, Expo]
confidentiality: Internal
version: v1.0
date: 29 Jun 2026
---

# PROJECT PROFILE — HireStream (HPSEDC Overseas Placement Portal)

## 1. Snapshot

Himachal Pradesh has no purpose-built digital infrastructure for the lifecycle of an overseas job-seeker — verifying licensed recruitment agencies, vetting employers, matching candidates to genuine vacancies abroad, and giving the State visibility into who is being placed where. Agentryx designed and is delivering **HireStream** — a multi-role, configuration-driven web platform for **HPSEDC** that takes a Himachal resident from registration through a KYB-verified agency / employer to a placement offer outside India, with a paired Android-first mobile app, a grievance channel, and an admin oversight console. The platform is live on staging at **v0.7.7.0** with 502 / 502 automated tests passing, follows WCAG 2.1 AA and GIGW accessibility standards, and ships with a proprietary embedded testing framework that calibrates release risk on every push.

## 2. The Challenge

Existing overseas-placement workflows in HP are spread across paper files, ad-hoc spreadsheets, individual agency portals and word-of-mouth referrals. The State has no canonical view of: which agencies hold a valid MEA license, which employers are real legal entities (CIN / GST / PAN), how many HP residents are currently in active applications, where placements end up, or whose grievance is open with whom. The pain is concrete — fraudulent agencies, mis-sold contracts, and applicants stranded abroad — and it is a national-policy concern (overseas employment is governed by the Ministry of External Affairs and is explicitly out of scope for domestic placement).

Hard constraints set the design: an **overseas-only** scope (India must be rejected as a destination by the system, not by guidelines), KYB verification gated by HPSEDC review before an agency or employer can post jobs, **bilingual interface** (English / Hindi), **WCAG 2.1 AA + GIGW** accessibility for a Government of India portal, an **FRS / SOW / SRS** documentation pipeline tied to a 40 / 40 / 20 milestone-payment structure, an audit-grade record of who changed what and when, and a delivery cadence that ships verifiable increments every few days rather than waterfall releases.

## 3. What We Built

A multi-role, multi-module web platform built around five distinct dashboards — Candidate, Agency (recruitment agent), Employer, Admin and Superadmin — each persona-tuned and sharing a single backend, a single configurable workflow engine and a single audit trail.

The product covers the **candidate journey** end-to-end (registration, multi-step profile wizard, document upload, job search, application with status timeline, grievance filing, public no-login status check); the **employer / agency journey** (KYB verification flow with document uploads, post-verification profile editing with regulated-field re-verification gates, job posting subject to country validation, applicant review with bulk actions and keyboard shortcuts, drives / events for batch hiring, offers & placements tracking with appointment-letter generation); and the **State journey** (admin oversight with role-segmented user management, country administration with an ISO 3166-1 picker, dashboards consistent with golden numbers, exportable reports, an **Operator Console** that toggles five system features at runtime without redeploy, and a unified grievance queue). The platform is bundled with **HireStream Mobile** (React Native + Expo, Android-first; planning package complete) and a sister application — the **Agentryx Verify** portal — that captures user feedback against the running build with reference codes, statuses and admin notes that feed back into release decisions.

## 4. Architecture & How It Works

A pragmatic full-stack, configuration-driven design. The web client is React + Vite with wouter for routing, TanStack Query for data, Tailwind for styling, and a lazy-loaded route bundle to keep the initial payload small. The backend is TypeScript + Express, with strict Zod request validation, role-based middleware, and a Drizzle ORM layer over PostgreSQL. The schema is intentionally normalised: candidates, employers, agencies, jobs, applications, drives, grievances, country_info, system_config, audit_log, notifications, and a `feedback_items` mirror in the Verify side-car DB. Field-level policy lives in code (the **field-class split** — separating CONTACT fields that edit freely from REGULATED fields that reset `verified = false` and write to audit_log on change); platform policy lives in the database (`system_config` table read through a single `lib/config.mjs` helper, so an admin can toggle synthetic monitor / LLM triage / daily digest / Loki ingestion / notifications without a deploy).

Wrapped around the application is a **5-layer embedded testing framework** — the Agentryx standard pattern, prototyped on HireStream. **Layer 1** (Jest unit + integration suite, 502 / 502 passing, 36 suites, real-Postgres `truncateAllTables()`-with-reseed isolation). **Layer 2** (deep-smoke route-health + authz-matrix across roles, runnable against any environment). **Layer 3** (synthetic monitor under PM2 cron — heartbeat against critical endpoints, JSON status files). **Layer 4** (log mining via Loki + Promtail, with an LLM triage stage calling an OpenAI-compatible API on Mistral / Nexus for failure summarisation). **Layer 5** (a **per-PR confidence score** that fuses smoke pass-rate, fuzz delta vs baseline, test counts and coverage, surfaced as a **pre-merge gate** with an admin `bypass-confidence` override label). Key design decisions: **PostgreSQL + Drizzle** (one schema, type-safe migrations, FK-cascade isolation in tests); **PM2 ecosystem.config.cjs** for env persistence (so DEEP_URL / SLACK_WEBHOOK_URL / MIN_INTERVAL_SECONDS survive reboots); **DB-driven country lifecycle** (a country_info table with `is_active`, ISO codes and an in-memory validator cache that is reloaded after `truncateAllTables()`); **Loki filesystem-only** (no Alertmanager — simpler ops on a single-node delivery); **on-prem-ready** but staged in the cloud so HPSEDC can take the build as-is.

## 5. Technology Stack

- **Frontend:** React, Vite, wouter, TanStack Query, TailwindCSS, lucide-react, framer-motion, i18next (English + Hindi), react-hook-form + Zod resolvers, code-split lazy routes.
- **Backend:** TypeScript, Node.js, Express, Drizzle ORM, Zod, bcrypt, express-session, Winston structured logging.
- **Data:** PostgreSQL (live, test, and a Verify side-car DB), Drizzle migrations, normalised relational schema with audit_log and system_config tables, FK-cascade-aware test reseed.
- **Integrations:** OpenAI-compatible LLM (Mistral via Nexus) for log triage, Slack webhook for monitor alerts, GitHub API for confidence-gate orchestration, IELTS-aware matching service, resume parser with country-normalising aliases.
- **Infra & deployment:** PM2 (ecosystem config, multi-app — `hirestream`, `hirestream-synthetic`, `agentryx-verify`), Loki + Promtail, esbuild + Vite production bundle (~697 KB), single-node Linux staging with on-prem migration path.
- **Security & compliance:** Argon-class password hashing (bcrypt cost 12), CSRF-aware session cookies, RBAC across 5 roles, audit_log on all regulated-field changes, WCAG 2.1 AA + GIGW accessibility (sr-only skip link, dedicated /accessibility page with screen-reader directory), KYB document verification for employers (CIN / GST / PAN) and agencies (MEA license + expiry).
- **QA & testing:** Jest (502 / 502 passing, 36 suites), Playwright E2E + video pipeline (Piper TTS narration, stage cards, issue badges, frame-verify), deep-smoke route-health + authz matrix, schema-fuzz with baseline-calibrated regression detection, two-gate completion rule (backend smoke with exact UI payload + UI click — both required for "done").
- **Mobile (in delivery):** React Native, Expo, Android-first; planning package and 4-doc protocol (DEV_PLAN / ROADMAP / STATUS / LEARNINGS) per platform folder.

## 6. Capabilities & Expertise Demonstrated

- **GovTech delivery against an FRS / SOW / SRS pipeline** → authored the design package that cleared HPSEDC's Milestone-1 (40 %) approval; release cadence pinned to a 40 / 40 / 20 payment schedule.
- **Multi-role workflow engineering** → 5 personas, 7 dashboards, a single shared application state-machine (submitted → reviewed → shortlisted → interview_scheduled → selected → placed → rejected), with bulk actions, keyboard shortcuts, and role-segmented data isolation.
- **KYB / regulatory verification engineering** → field-class split (CONTACT vs REGULATED), automatic `verified = false` reset + audit-log write on regulated change, dialog UX that explains the consequence to the user before they edit.
- **Configurable policy engine** → DB-backed `system_config` table + Operator Console UI lets HPSEDC toggle five platform features at runtime without redeploy; the same pattern powers the country lifecycle (ISO 3166-1 picker, enable / disable, India blocked at the validator).
- **Embedded testing & release engineering** → the 5-layer embedded framework is now Agentryx's standard pattern, prototyped here; Jest + deep-smoke + synthetic monitor + Loki + per-PR confidence gate fused into one release pipeline.
- **LLM-augmented operations** → on-call log mining with a Mistral-class LLM via an OpenAI-compatible API; graceful degradation when the external endpoint is unreachable.
- **Accessibility & GIGW compliance for Indian government portals** → WCAG 2.1 AA targets, sr-only focus-visible skip link, dedicated /accessibility page listing seven supported screen readers, bilingual interface, focus indicators throughout.
- **AI-augmented small-team delivery** → an Agentryx founder-led delivery with an integrated AI-agent fleet replaces a conventional 5-8 person team; the project is the proof point for the **Agentryx Dev Methodology** (a 9-strategic-doc + 6-file-stream-template standard now reused across Agentryx engagements).
- **Product & UX engineering** → role-aware dashboards, post-verification edit flows, an audited grievance thread, exportable reports, a sister Verify portal for live feedback capture.

## 7. Hard Problems Solved / Innovations

- **The "verified entity drift" problem.** A verified employer or agency could silently change CIN / GST / MEA-license values via direct API call and stay verified — a real compliance hole. Solved with a **field-class split** at the API layer: every PATCH handler classifies each incoming field as CONTACT or REGULATED, diffs against current values, and on any regulated change writes an audit_log entry **and** flips `verified = false` (only if the entity is currently verified). The UI catches up with a coloured banner that explains the policy before the user edits, so the consequence is visible, not surprising.
- **Calibrating release risk for a small team shipping daily.** The 5-layer embedded framework produces a **per-PR confidence score** (smoke pass-rate × fuzz-delta-vs-baseline × test count × coverage) backed by a **calibrated baseline.json** that captures *known acceptable* findings (e.g. handler-scoped authz LEAKs that the data-isolation suite separately validates as safe). The score is exposed as a GitHub-checks gate with a `bypass-confidence` admin override, so high-confidence merges land instantly while low-confidence ones force a second look.
- **Test isolation against a normalised schema with FK cascades.** `truncateAllTables()` CASCADE-wiped the country_info table because of an `updated_by → users.id` FK — invalidating the live country-validator cache between tests and breaking 170 previously-green tests. Solved with a post-truncate reseed + `loadValidCountries()` reload, restoring 502 / 502 passing — and along the way the audit surfaced two real product bugs (matching-service IELTS_COUNTRIES alias drift after country-naming canonicalisation; resume-parser country extraction that recognised aliases but didn't normalise output).
- **Country lifecycle as data, not as code.** Replaced a four-country hardcoded dropdown with a DB-driven `country_info` table seeded from ISO 3166-1, with searchable add-modal, completeness pips, enable / disable, and an India-blocked rule enforced at the validator (not at the UI), so the rule survives direct API calls as well as form input.

## 8. Outcomes & Impact

**Measured.** Web platform live on staging at v0.7.7.0; **502 / 502 Jest tests** passing across 36 suites; TypeScript compile 100 % clean; production bundle 696.7 KB; PM2 uptime continuous across rebuilds. **8 HPSEDC test-report issues** raised by the State's test team resolved and re-verified. HPSEDC **Milestone-1 (40 %) approval cleared** on the FRS / SOW / SRS design package. Seven Verify-portal user-feedback items closed this release window (a11y skip-link + screen-reader page; signup confirm-password; reviewer keyboard shortcuts A / P / R / W; missing offers & placements tab — already shipped; mobile signup deferred to the companion app; duplicate items consolidated).

**Projected (to validate in HPSEDC production rollout).** Replaces a paper / spreadsheet / phone-call placement workflow estimated at **days of cycle time per applicant** with a same-session digital flow; gives HPSEDC its first single-source view of overseas applicants, verified agencies and live placements; the embedded confidence gate is projected to catch ~70-90 % of regressions at PR time rather than UAT, based on the baseline calibration against staging.

## 9. Roadmap & Evolution

**Phase 1** Core multi-role platform (candidate / agency / employer / admin dashboards, KYB, jobs, applications, drives) — **delivered**. **Phase 2** Country lifecycle, post-verification edit, role-segmented user management, dashboard data-consistency fixes, reviewer ergonomics — **delivered (v0.7.x)**. **Phase 3** Embedded testing framework (5 layers, confidence gate) — **delivered (v0.6.x → v0.7.1.0)**. **Phase 4** Operator Console (DB-backed system_config + status view) — **delivered (v0.7.0.x)**. **Phase 5** HireStream Mobile (React Native + Expo, Android-first then iOS) — **in planning, package complete**. **Phase 6** HPSEDC on-prem migration and production cut-over — **dependent on State infrastructure readiness**. Track parallel to release: the **Agentryx Verify** portal evolves alongside HireStream as the standard embedded-feedback application across all Agentryx engagements.

## 10. Reusable IP & Assets (internal)

- **Agentryx Dev Methodology** — the 9-strategic-doc + 6-file-stream-template standard, prototyped on HireStream and documented in `PMD-Final wrapup/AGENTRYX_DEV_METHODOLOGY.md`; bootstrapping spec for every new Agentryx project.
- **5-layer embedded testing architecture** — Jest + deep-smoke + synthetic monitor + Loki/LLM-triage + per-PR confidence gate. Standing spec at `PMD-Final wrapup/Agentryx-Verify-Roadmap/Testing & Verification Architecture/`. Reused across applications.
- **Field-class split + audit-log pattern** — the CONTACT vs REGULATED enforcement, regulated-change audit write, and verification reset is a transferable pattern for any compliance-bearing entity-edit screen.
- **DB-driven configurable policy engine** — `system_config` table + Operator Console UI + `lib/config.mjs` helper. Reusable for any platform that needs runtime feature toggling without redeploys.
- **Country lifecycle pattern** — ISO 3166-1 picker, `is_active` toggle, in-memory validator cache, rule-as-data enforcement (India-blocked at validator layer).
- **Agentryx Verify portal** — the sister embedded-feedback application, with reference codes, statuses, admin notes and project-scoping. Standard companion app for every Agentryx delivery.
- **Mobile delivery protocol** — 4-doc per-platform spec (DEV_PLAN / ROADMAP / STATUS / LEARNINGS) updated every working session in the same commit as the code.
- **Two-gate completion rule** — backend smoke with the exact UI payload + UI click; both required before "done". Captured in `feedback_testing_methodology`.

## References / Artifacts

- Codebase — `Recruitment/hirestream` (web), `Recruitment/hirestream-mobile` (React Native), `Recruitment/agentryx-verify` (sister app).
- HPSEDC design package — `PMD-Final wrapup/Approval & Delivery Documents/Milestone-1 (40%) Design Approval/`.
- Architecture & logic — `PMD-Final wrapup/Architecture & Logic/HireStream_Matching_Engine.{md,html,pdf}`, `PMD-Final wrapup/Agentryx-Verify-Roadmap/`.
- Test report response — `PMD-Final wrapup/Corrections & Bug Fixes/HireStream_UAT_Final_Report.pdf`.
- Demo script — `PMD-Final wrapup/Presentation or Demo/Demo Script/HireStream_Live_Demo_Script.pdf`.
- Mobile planning package — `PMD-Final wrapup/MobileApps/`.
- Methodology — `PMD-Final wrapup/AGENTRYX_DEV_METHODOLOGY.md`.
- Live staging — `https://hirestream-stg.agentryx.dev`.

---

## Author's note — suggested template refinement (v1.2 → v1.3)

Two minor improvements surfaced while authoring this profile:

1. **A "Team & delivery model" guidance line.** v1.2 inherits the Vardhman example of "~8–13 across …" which prompts authors to list a large team by default. Agentryx is increasingly delivering with a **lean human team + AI-agent fleet** (this project is the prototype). A one-line author note alongside `team:` — *"State the actual delivery model honestly; 'founder + AI-agent fleet' is a valid and differentiating answer"* — would prevent authors from inflating headcount to look like a traditional consultancy. The fact that HireStream was delivered this way **is** the capability claim, not something to hide.
2. **Front-matter `live_url` and `commit_sha` keys.** The Quality Checklist asks for evidence-led claims but the front-matter has no slot for the live URL or the verified commit at the moment of authoring. Adding two optional keys — `live_url:` and `commit_sha:` — would give an evaluator a deterministic pointer to verify the profile against the actual running build, which is especially valuable for in-delivery projects.
