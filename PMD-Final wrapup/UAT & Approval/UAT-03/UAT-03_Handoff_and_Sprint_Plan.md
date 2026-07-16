# UAT-03 · Handoff & Sprint Plan

**For the incoming agent picking up UAT-03.**
Author: Claude Opus 4.7 · Date: 4 Jul 2026 · Context version: v1.0

> This document is a session-handoff brief. Read it end-to-end before touching any code. It replaces the prior conversation as your working context. When you finish reading, follow the "First actions" checklist at the bottom.

---

## 0 · TL;DR

- **Project:** HireStream — HPSEDC Overseas Placement Portal.
- **Where we are:** live on staging at **v0.7.7.0**, Jest **502 / 502** passing, TypeScript compile clean, HPSEDC **Milestone-1 (40 %) design approval cleared**.
- **What triggered this handoff:** the MD demo on 22-06-2026 produced a MOM with **20 UAT-03 items** ([Issue_List_Feature_Request.md](./Issue_List_Feature_Request.md)) — a substantial batch that spans copy tweaks, profile-wizard restructure, cross-cutting business rules, and four brand-new modules including WhatsApp integration.
- **Recommended shape:** four sprints (**UAT-A → UAT-D**) over **4-6 calendar weeks**, some parallelism possible after Sprint UAT-A ships.
- **First move:** ship Sprint **UAT-A** (5 label / copy items) within 24 hours — cheap, visible, demonstrates rapid MOM response to the MD.

---

## 1 · Project fundamentals

**Client.** HPSEDC (Himachal Pradesh State Electronic Development Corporation), Department of Information Technology, Government of Himachal Pradesh. Overseas-placement portal — India is **explicitly rejected** as a destination at the validator layer.

**Payment structure.** HPSEDC Work Order runs on **40 / 40 / 20 milestones**: (1) DESIGN approval / SRS sign-off (40 %) — **already paid**; (2) DELIVERY / UAT acceptance (40 %) — **the current UAT-03 round is the gate for this milestone**; (3) POST-GO-LIVE (20 %). See [memory `project_payment_milestones`](../../../../.claude/projects/-home-subhash-thakur-india-Projects-Recruitment/memory/project_payment_milestones.md).

**Delivery environment.** You are operating **on the hirestream-stg staging box, NOT a dev workstation**. PM2 runs three apps: `hirestream` (port 5000), `hirestream-synthetic` (cron), `agentryx-verify` (port 5002). Deploy = `npm run build` + `pm2 restart hirestream`.

**Team model.** Lean Agentryx delivery — founder / solution architect (**Subhash Thakur**, the user) + AI-agent fleet. There is **no 6-person team** — do not fabricate one, the user previously called this out. Your role is the fleet.

---

## 2 · Where things live

| Purpose | Path |
|---|---|
| Web codebase | `/home/subhash.thakur.india/Projects/Recruitment/hirestream/` |
| Mobile codebase | `/home/subhash.thakur.india/Projects/Recruitment/hirestream-mobile/` |
| Verify sister app | `/home/subhash.thakur.india/Projects/Recruitment/agentryx-verify/` |
| PMD (project mgmt docs) | `/home/subhash.thakur.india/Projects/Recruitment/PMD-Final wrapup/` |
| This UAT round | `PMD-Final wrapup/UAT & Approval/UAT-03/` |
| Auto-memory | `~/.claude/projects/-home-subhash-thakur-india-Projects-Recruitment/memory/` |
| Session credentials | `PMD-Final wrapup/keys.md` (**gitignored — never commit**) |
| Live staging | `https://hirestream-stg.agentryx.dev` |

**Databases (all on localhost):**
- `postgresql://hirestream:hirestream@localhost:5432/hirestream` — live
- `postgresql://hirestream:hirestream@localhost:5432/hirestream_test` — Jest isolation target
- `postgresql://hirestream:hirestream@localhost:5432/agentryx_verify` — sister app / feedback capture

---

## 3 · Current state (as of this handoff)

- **git HEAD:** `bef9fdf` — "backup: pre-demo-build snapshot" (user-authored, layered on the sprint push `746cd3e v0.7.7.0`).
- **Web VERSION:** `0.7.7.0` — live and reporting via `/api/v1/version`.
- **Tests:** Jest 502 / 502 passing, 36 suites (verified at v0.7.7.0 ship). TS compile 100 % clean (target=ES2020, downlevelIteration=true).
- **Bundle:** dist/index.js 696.7 KB.
- **PM2:** `hirestream` online; `hirestream-synthetic` stopped in current runtime; `agentryx-verify` online.
- **Recently-shipped feature surface** (last 3 days):
  - v0.7.5.0 — post-verification profile edit + regulated-field re-verification (employer + agency, field-class split + audit_log).
  - v0.7.7.0 — a11y (skip-link + `/accessibility` page + Screen Reader link wired), signup confirm-password, reviewer keyboard shortcuts A/P/R/W, TS baseline cleared, schema-fuzz harness alignment.
- **Uncommitted files in tree:** the environment prompt showed several `M` files across hirestream/client and hirestream/server + several untracked `PMD-Final wrapup/` folders. **Run `git status` first — do not blindly stage.** Investigate whether any of the modifications are the user's in-progress work before touching.
- **Recent Agentryx Project Profile** (authored just before this handoff): `PMD-Final wrapup/00.Project Profile/HireStream_HPSEDC-Overseas-Placement-Portal_Project-Profile_v1.0.{md,html,pdf}` — case-study asset for capability library.
- **Latest resolved feedback (Verify portal):** 7 items closed as of v0.7.7.0 — FB-2026-0001, 0002, 0003, 0004, 0007, 0010; FB-2026-0005 kept "planned" for v1.5. **10 new feedback items (FB-2026-0008 → 0017) sit in "submitted"** and are separate from this UAT round — do not confuse them.

---

## 4 · Standing conventions (**must follow**)

Pulled from auto-memory — internalise these before writing any code.

- **Two-gate completion rule** — smoke the backend with the **exact UI payload** first, then click the UI. Both required before "done". Ref: `feedback_testing_methodology`.
- **Verify-module sync** — every HireStream feature change triggers a matching Verify seed update **in the same commit cadence, without prompting**. Ref: `feedback_verify_module_sync`.
- **Smoke-test coverage** — smoke sibling endpoints that share tables, not just the changed path. Drizzle `sql` with arrays previously broke sibling queries. Ref: `feedback_smoke_test_coverage`.
- **Deep testing framework** — `npm run test:deep` (jest + smoke) + `scripts/deep-smoke.mjs` (route health + authz matrix, any env). Run/extend before releases. Ref: `feedback_deep_testing_framework`.
- **Mobile docs protocol** — every mobile platform folder has 4 standard docs (DEV_PLAN / ROADMAP / STATUS / LEARNINGS). Update status + roadmap **every working session, in the same commit as code**. Ref: `feedback_mobile_docs_protocol`.
- **Never push to git remote without explicit user OK.**
- **Never destructive git operations without explicit instruction.**
- **Never skip hooks** (`--no-verify`).
- **All commits** end with `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>`.
- **Version bumps:** every functional change ships as a new SemVer patch/minor. Rebuild + PM2 restart is required for the footer to pick up the new version (server caches VERSION at startup).
- **Country validation** — jobs.country must match a row in `country_info` with `is_active = true`. India is blocked at the validator. Tests seed 18 countries after `truncateAllTables()`; do not remove that reseed.

---

## 5 · UAT-03 scope — the 20 items, coded to source

The MOM items grouped by nature and mapped to where the work lands. Effort estimates are for a lean Agentryx delivery (single engineer + AI fleet) and assume the two-gate completion rule.

### Category A — Fast wins (labels / copy / small UX)

| # | Item | Where it lives | Effort |
|---|---|---|---|
| **1** | "Sex" → "Gender" on registration form | `client/src/pages/auth-page.tsx` (register form) + `client/src/components/candidate/candidate-profile-form.tsx` + `client/src/pages/profile-wizard.tsx` — need to check all three | 15 min |
| **2** | Replace "Recommend" with a more suitable term (**needs clarification** — where does "Recommend" appear? Likely agent / referrer UX) | grep `client/src/` for `Recommend` first | 20 min after clarification |
| **3** | "Address" → "Correspondence Address" | `candidate-profile-form.tsx` + `profile-wizard.tsx` — likely 2-3 label swaps | 15 min |
| **9** | Differentiate Certification vs Certificate Course | UI copy + form UX in candidate profile / certification section; probably no schema change if we relabel an existing field | 30 min |
| **11** | Improve Brief Description section | `candidate-profile-form.tsx` — needs clarification on *what* needs improving (character limit? placeholder? prompt guidance?) | 30-45 min after clarification |

**Sprint UAT-A total: 2-3 hours + clarifications on 2 and 11.** Ship as **v0.7.8.0**.

### Category B — Profile-wizard restructure

These items all touch the candidate profile schema and wizard. Bundle them so we have one coordinated migration, one QA cycle, and one HPSEDC re-review.

| # | Item | Notes |
|---|---|---|
| **4** | Identity section mandatory | Wizard step already exists; convert soft-required to hard-required. Watch: existing incomplete profiles must still be able to log in and complete. |
| **5** | Prevent duplicate education entries (e.g. 10th only once) | Dedupe by `level` enum. Simple client-side + server-side check. |
| **6** | "Passed" flag on Formal Education | New boolean column on `candidate_education`. Migration needed. |
| **7** | Separate University and Institution fields | Currently combined? Confirm by reading `shared/schema.ts` for `candidate_education`. Migration + form change. |
| **8** | Review Education / Certification / Skill Course sections | Broadest of the group — likely a wizard UX overhaul. May absorb items 5, 6, 7, 9. |
| **10** | Experience in months (e.g. 42 months) | Column is likely `experience_years` (numeric). Migrate to `experience_months` or add a new column and coerce display. Watch: matching-service uses experience for scoring — retune if unit changes. |
| **12** | Language Proficiency + passport info | New section. Passport info probably already collected — verify. Language proficiency is new: name + level (elementary/intermediate/professional/native). |

**Sprint UAT-B total: 3-5 days.** Ship as **v0.7.9.0** or **v0.8.0.0** if schema migration is significant. Migrations must be additive-then-drop over two releases if profile data is live in production.

### Category C — Business-rule / filtering logic

| # | Item | Notes |
|---|---|---|
| **13** | Country rejected → not shown again as option | Needs new tracking: `application_country_rejections(candidate_id, country_code, reason, rejected_at)` or reuse `applications.status='rejected'` + join to jobs.country. Filter applies to job-search UI. Watch: differentiate agency-rejected from country-rejected (visa refusal ≠ agency non-shortlist). |
| **14** | Salary expectations align with job-category | Add `min_salary / max_salary / currency` per category to `job_categories` reference table (or new `category_salary_bands`); enforce in job-creation form + in candidate preference form. |
| **15** | Show only job-specific required documents | Currently the doc slot list is likely static. Need `job.required_documents` array or `job_document_requirements` table; join to candidate doc list at application time. |
| **17** | Improve Grievance section | Needs scoping — user asked to "review and improve"; may be UX polish or workflow re-design. Grep `client/src/pages/grievance-page.tsx` and `server/routes/grievance.routes.ts` first, then propose. |

**Sprint UAT-C total: 3-5 days** (item 17 depends on scoping outcome). Ship as **v0.8.1.0**.

### Category D — New modules (multi-week, some external gates)

Each item is a mini-project. Do NOT bundle these — one at a time so each can be scoped, QA'd and signed off cleanly.

**Item 16 — Post-visa 3-month issue-support process.** New workflow module. Candidate submits a "post-placement issue" ticket within 3 months of visa approval; HPSEDC / agency owns triage. Requires schema (`post_placement_tickets`), workflow states, SLA countdown, notification channel, admin queue. Effort: **4-7 days.** Blocks on HPSEDC input for the SLA and process rules.

**Item 18 — Fee section with details.** Purpose ambiguous — HPSEDC service fee? Agency commission structure? Candidate placement fee? **Needs HPSEDC scoping call.** If it's a payment gateway integration, timeline lengthens because gateway onboarding (HDFC / SBI / BillDesk / etc.) takes weeks. Effort: **1 week for informational-only section; 3-5 weeks if payment integration required.**

**Item 19 — Monthly tracking / reporting for visa holders.** Ongoing candidate-status tracking after visa approval; monthly self-report or agency-check-in. New collection surface, admin oversight dashboard, exportable reports. Effort: **5-7 days.** Composes with item 16 (both are post-visa lifecycle).

**Item 20 — WhatsApp notifications + communication.** **External-gated.** Meta Business Verification for WhatsApp Business API typically takes **7-14 days**; template approval another **2-5 days per template**. Choice of BSP (WATI, Gupshup, Interakt, Twilio, Meta direct) affects cost and template limits. Effort: **1 week integration work + 2-3 weeks external gates in parallel.**

**Sprint UAT-D total: 3-4 weeks calendar, driven by external gates and HPSEDC scoping calls.** Ship in sub-versions **v0.8.2.0 → v0.8.5.0**.

---

## 6 · Recommended sprint plan

| Sprint | Items | Version target | Calendar | Depends on |
|---|---|---|---|---|
| **UAT-A** — Fast wins | 1, 2, 3, 9, 11 | v0.7.8.0 | Day 1 (24 hrs) | Clarifications on items 2 and 11 from user |
| **UAT-B** — Profile-wizard overhaul | 4, 5, 6, 7, 8, 10, 12 | v0.7.9.0 or v0.8.0.0 | Days 2-6 (3-5 days) | UAT-A shipped (avoids merge conflict on wizard) |
| **UAT-C** — Business-rule layer | 13, 14, 15, 17 | v0.8.1.0 | Days 7-11 (3-5 days) | Scoping on item 17 |
| **UAT-D1** — Fee module | 18 | v0.8.2.0 | Days 12-16 (**or parallel to UAT-C**) | HPSEDC scope call: informational vs payment gateway |
| **UAT-D2** — Post-visa lifecycle | 16, 19 | v0.8.3.0 | Days 17-24 (1 week) | HPSEDC input on SLA / process rules |
| **UAT-D3** — WhatsApp | 20 | v0.8.5.0 | Days 12-30 (**external gates in parallel from Day 12**) | Meta Business Verification, BSP selection, template approval |

**Total: ~30 calendar days with light parallelism** (4-5 weeks realistic including QA cycles).

**Rationale for this ordering:**
- **UAT-A first** — quick, visible response to the MD; buys goodwill for the longer sprints below.
- **UAT-B before UAT-C** — wizard restructure creates the schema surfaces (education / certification / language / passport) that later filters (like item 13) will query.
- **UAT-C before UAT-D** — business rules refine existing flows; new modules are additive.
- **UAT-D3 (WhatsApp) started early in parallel** — external gates are the critical path.

---

## 7 · Runbook — commands the new agent will run repeatedly

```bash
# Where you are (staging box, not dev)
cd /home/subhash.thakur.india/Projects/Recruitment/hirestream

# Type-check + build
npm run check          # tsc — should be 100% clean (baseline cleared v0.7.7.0)
npm run build          # esbuild + Vite — target dist/index.js

# Test suites
npm test               # Jest (502/502 currently; adjust as you add tests)
npm run test:deep      # Jest + deep-smoke combined
node scripts/deep-smoke.mjs --url https://hirestream-stg.agentryx.dev  # any env

# Deploy (staging is where you are)
pm2 restart hirestream        # picks up new VERSION at startup
# Wait for live update:
until curl -fs https://hirestream-stg.agentryx.dev/api/v1/version | grep -q "$(cat VERSION)"; do sleep 1; done

# DB access
PGPASSWORD=hirestream psql -h localhost -U hirestream -d hirestream
PGPASSWORD=hirestream psql -h localhost -U hirestream -d agentryx_verify

# Log tail
pm2 logs hirestream --lines 100 --nostream
```

Migration workflow: `npm run db:generate` (Drizzle Kit generates SQL) → review → `npm run db:migrate` (apply). **Never edit an already-applied migration; add a new one.**

---

## 8 · Landmines to avoid

- **VERSION cache** — the server reads `VERSION` at startup. Bump the file, rebuild, `pm2 restart` — otherwise the footer keeps showing the old version even after you push. This has confused the user twice.
- **PM2 env vars** — set them in `ecosystem.config.cjs`, not shell exports; shell exports don't survive `pm2 restart` after a reboot.
- **Drizzle `sql` with arrays** — an earlier bug: using `sql` template with an array parameter silently broke sibling queries that shared the table. Prefer `inArray()` and always smoke sibling endpoints.
- **`truncateAllTables()` cascades** — the country_info table has an FK to users; TRUNCATE users CASCADE wipes country_info. Test helper must reseed 18 countries + call `loadValidCountries()` after truncate. Do not remove.
- **CLAUDE.md doesn't exist here** — conventions live in auto-memory. Read the memory index first, not a nonexistent CLAUDE.md.
- **The user says "we"** — refers to the founder-led delivery, not a large team. Don't invent teammates.
- **NEVER commit `PMD-Final wrapup/keys.md`** — gitignored; contains staging credentials.
- **"Ultrareview" is a paid user-triggered CLI action** — you cannot launch it yourself; do not attempt.
- **India is not a valid destination** — enforced at validator, not just UI. Any new form field that accepts a country must round-trip through `country-validator.service.ts`.
- **Existing UAT-03 file has 20 items but items 2 and 11 are ambiguous** — do NOT guess. Bring them back to the user for clarification before shipping. See §11.
- **10 new Verify-portal feedback items (FB-2026-0008 → 0017)** sit in submitted status. Some (e.g. "buggy keyboard") may actually be commentary on already-shipped features. **They are separate from UAT-03** — do not merge queues.

---

## 9 · Open decisions requiring user / HPSEDC input

Before Sprint UAT-D can start, get these decisions:

1. **Item 2** — where does "Recommend" appear in the current UI and what is the preferred replacement term?
2. **Item 11** — what specifically about "Brief Description" needs improving? (Character limit? Placeholder text? AI-assisted prompt? Field split?)
3. **Item 17** — what's the specific pain in the Grievance section? UX polish or workflow redesign?
4. **Item 18 (Fee section)** — informational display only, or full payment-gateway integration? If integration, which gateway? HDFC, SBI, BillDesk, PayU, Razorpay?
5. **Item 16 (Post-visa 3-month support)** — what's the SLA? Who owns triage (HPSEDC staff, agency, or hybrid)? What are the escalation rules?
6. **Item 20 (WhatsApp)** — approved BSP? Meta Business Verification account holder? Template list to seed?
7. **Milestone linkage** — does closing all 20 items trigger the Milestone-2 payment (40 %), or is there a separate acceptance gate?

Bring these questions back to Subhash before designing the corresponding sprints.

---

## 10 · Reference documents on disk

- [PMD-Final wrapup/UAT & Approval/UAT-03/Issue_List_Feature_Request.md](./Issue_List_Feature_Request.md) — the source MOM.
- [PMD-Final wrapup/00.Project Profile/HireStream_HPSEDC-Overseas-Placement-Portal_Project-Profile_v1.0.pdf](../../00.Project%20Profile/HireStream_HPSEDC-Overseas-Placement-Portal_Project-Profile_v1.0.pdf) — case study, useful capability context.
- [PMD-Final wrapup/AGENTRYX_DEV_METHODOLOGY.md](../../AGENTRYX_DEV_METHODOLOGY.md) — 9-strategic-doc + 6-file-stream-template standard.
- `hirestream/A.PMD/E2E_Workflow__Final_STG.md` — authoritative pipeline doc, FRS-aligned. Consult before changing pipeline behaviour.
- `PMD-Final wrapup/Corrections & Bug Fixes/HireStream_UAT_Final_Report.pdf` — prior UAT round's response, useful format reference for the UAT-03 closure report.
- `PMD-Final wrapup/MobileApps/` — mobile-app planning package (not part of UAT-03 but active).
- `PMD-Final wrapup/Agentryx-Verify-Roadmap/Testing & Verification Architecture/` — embedded-testing 5-layer spec.

---

## 11 · First actions for the new agent (checklist)

Do these in order at the start of the next session — do not skip:

1. **Read this document end-to-end.** Do not begin work until you have.
2. **Read the auto-memory index** at `~/.claude/projects/-home-subhash-thakur-india-Projects-Recruitment/memory/MEMORY.md` and load any memory files it points to that this handoff mentions.
3. **Run `git status` inside `hirestream/`** — the environment has uncommitted files. Investigate what they are before staging anything. If they're mid-work by Subhash, leave them alone and ask.
4. **Verify current state:**
   ```bash
   curl -fs https://hirestream-stg.agentryx.dev/api/v1/version
   cd /home/subhash.thakur.india/Projects/Recruitment/hirestream && npm test 2>&1 | tail -6
   ```
   Confirm v0.7.7.0 live + 502 / 502 Jest still green. If not, halt and diagnose.
5. **Ask Subhash for clarifications on items 2, 11, 17, 18** (§9 above). Do not guess.
6. **Once cleared, propose Sprint UAT-A** to Subhash with the specific label / copy changes for items 1, 3, 9 (and 2, 11 after clarification). Get "go ahead" before writing code.
7. **Ship UAT-A within 24 hours** as v0.7.8.0. This is the confidence-builder for the MD.
8. **Create a UAT-03 tracking doc** in the same folder — a running STATUS.md that tracks per-item state (planned / in progress / shipped / awaiting HPSEDC / blocked). Update it every session, in the same commit as code.
9. **Create Verify-portal entries** for each UAT-03 item so the feedback system mirrors the MOM — one row per item, references pointing back to `Issue_List_Feature_Request.md`.

---

## 12 · What to inherit from this session (context recap for the new agent)

**Prior session identity.** The prior agent (Claude Opus 4.7, session 0547f825-9f83-4ebb-b4f9-5448ccca78f1) shipped:
- **Multi-day platform work** — Phase 3 (embedded testing framework), Phase 4 (Operator Console), country lifecycle (v0.7.4.x), E2E audit recovery (502 / 502), post-verification edit gap closure (v0.7.5.0), a11y + reviewer keyboard shortcuts sprint (v0.7.7.0).
- **The Agentryx Project Profile PDF** just before this handoff.
- **7 Verify-portal feedback closures** with admin_notes pointing at the shipping commits.

**Subhash's working style** (respect these — they saved reworks before):
- Prefers direct answers, not options-menus. Give a recommendation with the tradeoff.
- Wants to be asked before destructive actions or scope expansion.
- Reads the diff — don't summarise what the diff already shows.
- Corrects fake team sizes and fake numbers instantly — be honest.
- Trusts the sprint-and-ship cadence, not big-bang releases.
- Values the Two-gate completion rule — do not skip it even under time pressure.

**The Agentryx Dev Methodology** (spec at `PMD-Final wrapup/AGENTRYX_DEV_METHODOLOGY.md`) is the standard for structuring project work — 9 strategic docs + 6 file-stream templates. When you start UAT-03 sprints, structure the tracking docs accordingly.

**The Agentryx Verify portal** is the standard companion feedback capture app for every Agentryx delivery. It runs on the same box (port 5002). Every feature change should sync a Verify seed entry in the same commit.

---

## 13 · One-line summary of the way ahead

**Sprint UAT-A ships in 24 hours (labels only). UAT-B (wizard) in the following week. UAT-C (business rules) in the week after. UAT-D (new modules, WhatsApp) runs 3-4 weeks in parallel with external gates. All sequenced to close Milestone-2 (40 %) cleanly.**

---

*End of handoff. Go read the memory index and run `git status` before you do anything else.*
