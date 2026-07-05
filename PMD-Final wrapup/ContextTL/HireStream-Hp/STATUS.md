# HireStream-HP · STATUS

Running tracker. Update every working session, in the same commit as the code change.

**Current version:** v0.3.0 (HP-3b single mega-agency shipped)
**Live:** https://hirestream-hp.agentryx.dev · PM2 id 3 · port 5003
**Last updated:** 2026-07-04 — HP-3b shipped (mega-agency + association + slim admin)

---

## Shipped

### v0.4.3 — HP-4b.4 · dedup education + cert/course differentiation (UAT 5, 9)
- **UAT-5** Duplicate education blocked — server 409 on same `(type, degree)` (case-insensitive) for a candidate; wizard surfaces the message. Smoke: add "10th" twice → 201 then 409; "12th" still 201.
- **UAT-9** Certification vs Skill Course — the `type` picker already separates them; added an inline helper explaining the difference with blue-collar examples (ITI/NSDC/NCVT trade cert vs short course).
- **Items 5 + 9 → done. Now 8 of 20 live (1, 3, 5, 6, 7, 9, 10, 12).**

### v0.4.2 — HP-4b.2/.3 · languages + experience-in-months (UAT 10, 12)
- **UAT-12** Language proficiency — new `/candidates/languages` API (GET/POST/DELETE, dedup 409, level enum) + a Languages section in the wizard Skills step (quick-add chips for Hindi/English/Punjabi/Pahari/Arabic/…, Basic→Native levels). Backend smoke: 201/409/400 all correct.
- **UAT-10** Total experience now captured in **months** (e.g. 42), with a live "≈ N yrs" hint. Writes `experience_months` (+ keeps `experience` years in sync); the **matching engine** now reads months (÷12) with a years fallback. Backend smoke: `experienceMonths:42` persists.
- **Items 10 + 12 → done. Now 6 of 20 live (1, 3, 6, 7, 10, 12).**

### v0.4.1 — HP-4b.1 · education fields wired (UAT 6, 7)
Surfaces the HP-4a schema in the profile wizard's Education step.
- **UAT-7** "University / Affiliating Body" field (higher-ed types), distinct from Institution. Shown in saved records.
- **UAT-6** "Passed / Completed" checkbox (default checked); a "Not passed" badge shows on records where unchecked.
- API already accepted both (auto-included via `createInsertSchema`). Backend smoke green — `university` + `isPassed:false` persist and read back. Client-only change (no Jest surface).
- **Items 6 + 7 → done. Now 4 of 20 live (1, 3, 6, 7).**

### v0.4.0 — HP-2 · fast-win label fixes (UAT 1, 3)
Live on staging. Pure UI label swaps in `profile-wizard.tsx` (hardcoded strings;
locale files carry no keys for them, so no i18n change). Field/column names
unchanged (`sex` stays as the column).
- **UAT-1** "Sex (as per passport)" → **"Gender (as per passport)"**.
- **UAT-3** the current/postal "Address" section header → **"Correspondence Address"** (Permanent Address unchanged).
- Verified: both strings present in the live-served wizard bundle. (Full Playwright wizard render timed out on multi-step nav — harness issue, not a label failure. No test references these labels → no suite surface.)
- **Item 2** ("Recommend") located but NOT changed — awaiting the replacement term. Candidates: agent-side `Recommendation` label (`agent-drive-detail.tsx:497`) + candidate-side "Recommended For You / Jobs" (`candidate-dashboard.tsx:547/1567`).

### HP-4a — profile data-model foundation (schema + migration)
Additive, backward-compatible. Applied to **both** `hirestream_hp` (surgical
`ALTER`/`CREATE ... IF NOT EXISTS`) and `hirestream_hp_test` (drizzle push).
No drops, no data loss; reference DB untouched.

- **UAT-6** `candidate_education.is_passed BOOLEAN NOT NULL DEFAULT true`.
- **UAT-7** `candidate_education.university` (nullable; `institution` stays = school/college name).
- **UAT-10** `candidates.experience_months` (nullable; backfilled `= experience×12` — 0 rows, HP has no real candidates yet). Old `experience` (years) kept for safe cutover.
- **UAT-12** new `candidate_languages` table (language + proficiency + read/write/speak flags).
- **UAT-9** (cert vs course) needs **no schema** — `candidate_education.type` already has `certification` + `course` values; it's a UI-bucketing task in HP-4b/c.

**Note:** schema/DB foundation only — the wizard/API field wiring is HP-4b. Not version-bumped/deployed yet (no runtime behaviour change; extra DB columns are inert until code uses them).

### v0.3.0 — HP-3b · single HPSEDC mega-agency
Builds on the HP-3a flag layer. Still disable-not-delete — no deleted routes.

- **Mega-agency seed** (`default-agency.seed.ts`, wired into boot): idempotently creates the `hpsedc_agency` operator (role=agent) + a **verified** `recruitment_agents` row ("HPSEDC — Overseas Placement Cell"), and records its user id in `capability.default_agency_user_id`. Password from `DEFAULT_AGENCY_PASSWORD` (fallback `test123` + warning — **rotate before go-live**).
- **Single-mode job association** (`job.routes.ts` choke point): in `agency_mode=single`, every new job is owned by the mega-agency regardless of creator; marketplace mode keeps creator ownership. Falls back to creator if the mega-agency isn't seeded.
- **Slim admin** (`admin-dashboard.tsx`): the Agencies + Employers approval tabs (and the Overview agency metric card / "Agency Verifications" pending item / "Review now" button) are hidden when those capabilities are off. Code stays; re-enabling the flag restores them.
- **Hermetic isolation test**: rebuilt the orphaned `data-isolation.test.ts` as a self-seeding suite (candidate + agent/job isolation) — **un-skipped**. Proves the preserved multi-agency isolation still holds (the expand-path guard).

**Verification:**
- Boot seed confirmed live: `hpsedc_agency` + verified agency + `default_agency_user_id` set; reference intact at 0.7.7.0.
- Live smoke: mega-agency login → posts a job → `agent_id` = mega-agency, public (cleaned up).
- New Jest coverage: single-mode association forces mega-agency ownership even for a different creator.
- Admin slim-down verified structurally (typecheck + same `useCapabilities` mechanism Playwright-verified for the register dropdown in HP-3a). **Not** clicked live — no admin account on HP, and I declined to escalate one on the live DB unprompted.

### v0.2.0 — HP-3a · capability-flag layer (disable-not-delete)

### v0.2.0 — HP-3a · capability-flag layer (disable-not-delete)
Single-agency gating via a new `capability` settings category — **zero schema
changes, zero deleted routes**. Flip the flags ON to re-expand into a full
marketplace (employers + external agencies) with no code changes.

- `settings.service.ts`: new `capability` category + 3 specs — `capability.employer_self_registration` (default **false**), `capability.agency_self_registration` (default **false**), `capability.agency_mode` (default **single**). Reference DB unaffected.
- `auth.routes.ts`: register handler rejects disabled self-register roles with 403 ("This account type is not open for self-registration on this portal").
- `routes.ts`: new public `GET /api/v1/config/public` — exposes ONLY the non-sensitive capability booleans (the map found the client had no way to read settings).
- `use-capabilities.ts` (new client hook): fetches the above; **safe fallback = single-agency shape** so the UI never wrongly offers a disabled role.
- `auth-page.tsx`: register role dropdown hides Employer + Agency when their flags are off.

**Two-gate smoke (both PASS, live on v0.2.0):**
- Backend: `/config/public` → `{employer:false, agency:false, mode:single}`; register employer → 403; agent → 403; candidate → 201. Smoke users cleaned from live DB.
- UI (Playwright, live): register dropdown shows only "Job Seeker (Candidate)".

**Regression caught + fixed:** the gate initially broke 219 inherited tests (they register employer/agent users → 403 → cascade). Fix: the test env runs capabilities ENABLED (the inherited suite validates the *preserved* marketplace) — re-seeded in `truncateAllTables` + `setup.ts` via `updateSetting`. New `capability-gating.test.ts` covers the gate both ways (enabled→201, disabled→403). Also extracted the config endpoint into `public-config.routes.ts` (mounted in prod + `createTestApp`). **Final: 492 passed / 0 failed / 15 skipped (37 suites).**

**Deferred to HP-3b:** seed the single HPSEDC mega-agency row + auto-associate jobs/candidates; slim-admin UI hide; defensive nav gating; rebuild the skipped data-isolation suite as a hermetic single-agency test (`TODO(HP-3)`).

---

## Session-start checklist (01_Handoff_Context.md §9)

| # | Action | State |
|---|---|---|
| 1 | Read README + 4 numbered docs | ✅ done |
| 2 | Verify live state (HP 0.1.0 · ref 0.7.7.0 · PM2 · tests) | ✅ versions + PM2 pass · tests running |
| 3 | `git status` — fork untracked, ask commit strategy | ✅ confirmed untracked (`?? hirestream-hp/`) — Q6 open |
| 4 | Ask the 6 blocking questions (03_Open_Decisions.md) | ⏳ asked, awaiting Subhash |
| 5 | Propose Sprint HP-2 (labels + rebrand) | ⛔ blocked on Q1–Q6 |
| 6 | Create this STATUS.md | ✅ done |

---

## Live-state verification (2026-07-04)

- `curl hirestream-hp …/version` → `0.1.0` ✅
- `curl hirestream-stg …/version` → `0.7.7.0` ✅ (reference intact)
- PM2: `hirestream` (id 0) online, `hirestream-hp` (id 3) online ✅ · `hirestream-synthetic` stopped
- `git status`: `hirestream-hp/` **untracked** — not yet in monorepo, not its own repo
- Jest suite: **487/502 pass · 15 fail (2 suites)** — both are inherited test-fixture debt, NOT product bugs (see below)

### Test-baseline notes (2026-07-04)

**Sprint-0 env gaps fixed this session:**
- `hirestream_hp_test` had 0 tables — schema never pushed. Fixed via `drizzle-kit push` against `TEST_DATABASE_URL`.
- `npm run db:push:test` is broken — `dotenv-cli` not installed in the fork. **TODO:** `npm i -D dotenv-cli` (or drop the dotenv wrapper).

**15 remaining failures — inherited from reference `bef9fdf`, not fork regressions, not product bugs:**
1. **14 × `data-isolation.test.ts`** — logs in as `demo_employer_b` / `demo_agent_b` / `demo_admin_b` / `demo_candidate_b`, which **no seed script creates anywhere in the repo**. The reference `hirestream_test` had them as leftover manual rows; the fresh fork DB doesn't → 401. Fix: seed the `_b` isolation cast (add to `scripts/seed.ts` or the suite's `beforeAll`).
2. **1 × `grievances-content.test.ts` "resolves grievance with notes"** — expects an admin PATCH `status='resolved'` → 200, but `grievance.routes.ts:264` deliberately returns **403** (staff can't self-resolve; the complainant confirms). Stale test contradicting current product behavior. Fix: update test to complainant-confirms model.

Both fixes are the first task of HP-2 (needed for a clean two-gate baseline). Product code is intact.

---

## Six blocking questions (from 03_Open_Decisions.md)

| Q | Topic | Answer (2026-07-04) |
|---|---|---|
| 1 | MD outcome on items 16/18/19/20 | 🟢 **Park all four** — HPSEDC lacks resources; raise formal descope with MD |
| 2 | Hindi-first vs bilingual | 🟢 Not one of the 20 → keep existing bilingual toggle, don't force Hindi-default |
| 3 | Voice input | 🟢 Not requested → optional, implement only if cheap (HP-4) |
| 4 | WhatsApp | 🟢 **Not primary channel**; even bolt-on is Meta-gated (not a quick win). Use SMS/in-app for notify-candidates; WhatsApp parked with #19/20 |
| 5 | Fork identity | 🟢 Give it a distinct govt identity; wordmark "HireStream-HP" |
| 6 | Commit strategy | 🟢 Add to existing monorepo as sibling folder (done: baseline `923c0e1`) |

**New architecture decisions (this session):**
- **Disable-not-delete** for HP-3: gate roles behind `capability.*` flags, keep multi-role code intact + reversible (mega-agency ready to expand). Shipped v0.2.0.
- **Job creation = HPSEDC-side Smart Importer** (not employer self-service). Foreign gov-to-gov demand (PDF/Excel/CSV) → standard job format (`jobs`/requisition schema already fits: `targetHires`, `category`, `qualificationRequired`, `country`, `salary`...). Template-first parser → **Claude/hybrid AI extraction** → mandatory human review gate → publish. Lands in **HP-5**.
- **Hybrid pluggable AI provider** (cloud: Gemini/OpenAI/Claude + on-prem 7B→larger) via existing encrypted `provider_config` pattern. 7B too small for extraction now → cloud (Claude default) now, on-prem when capable + for data-sovereignty. HP-5.

---

## UAT-03 item status (20 items)

| # | Item | Sprint | State |
|---|---|---|---|
| 1 | "Sex" → "Gender" | HP-2 | planned |
| 2 | Replace "Recommend" | HP-2 | needs clarification |
| 3 | "Address" → "Correspondence Address" | HP-2 | planned |
| 4 | Identity section mandatory | HP-4 | planned |
| 5 | Prevent duplicate education entries | HP-4 | planned |
| 6 | "Passed" flag on Formal Education | HP-4 | planned |
| 7 | Separate University / Institution | HP-4 | planned |
| 8 | Review Education/Cert/Skill sections | HP-4 | planned |
| 9 | Certification vs Certificate Course | HP-2/HP-4 | planned |
| 10 | Experience in months | HP-4 | planned |
| 11 | Improve Brief Description | HP-2 | needs clarification |
| 12 | Language Proficiency + passport | HP-4 | planned |
| 13 | Country-rejected → not shown again | HP-5 | planned |
| 14 | Salary aligns with job category | HP-5 | planned |
| 15 | Job-specific required documents | HP-5 | planned |
| 16 | Post-visa 3-mo support | HP-7 | ? MD decision |
| 17 | Improve Grievance section | HP-5 | needs clarification |
| 18 | Fee section | HP-7 | ? MD decision |
| 19 | Monthly visa-holder tracking | HP-6 | ? MD decision |
| 20 | WhatsApp | HP-6 | ? MD decision, external gated |

---

## Landmines (fork-specific — from 01_Handoff §6)

- Don't restart/modify `hirestream` (reference). Only `hirestream-hp`.
- Don't `db:push` against `hirestream` DB — confirm `pwd` first.
- Don't share/regen secrets across portals.
- Bump VERSION → rebuild → `pm2 restart hirestream-hp` (VERSION cached at startup).
- New feedback scopes to Verify project slug `hirestream-hp` (not the reference queue).
