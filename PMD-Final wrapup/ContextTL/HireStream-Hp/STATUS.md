# HireStream-HP · STATUS

Running tracker. Update every working session, in the same commit as the code change.

**Current version:** v0.3.0 (HP-3b single mega-agency shipped)
**Live:** https://hirestream-hp.agentryx.dev · PM2 id 3 · port 5003
**Last updated:** 2026-07-04 — HP-3b shipped (mega-agency + association + slim admin)

---

## Shipped

### v0.5.7–v0.5.10 — focus fix, completion loop, 3-tier registration model
- **v0.5.7** — fixed `/apply` inputs losing focus after one char (screens rendered as `<Current/>` remounted each keystroke → render by calling the function; state lifted so screens are hook-free).
- **v0.5.8** — completion loop: a blue-collar profile is "ready" once essentials are filled (documents optional) — stops the "Complete profile" → `/apply` loop at 88%. + tier schema (`registration_tier`, `wants_callback`).
- **v0.5.9 / v0.5.10 — 3-tier registration model (Assisted · Standard · Professional):**
  - Entry screen `/start` (3 cards); dashboard "Complete profile" → `/start`.
  - **Standard** → `/apply`. **Professional** → `/profile` (guided flow next). **Assisted** → name+phone → `wants_callback=true`.
  - **Admin callback queue** — `GET /admin/callback-requests` + "Callbacks" tab (click-to-call, "Done"). Verified end-to-end.
  - Guided **Professional** flow designed by Fable 5 (14 screens, branching education) — drafts ready, **integration pending**.
- **v0.7.3 — resume-where-you-left-off + working voice input (live-test fixes).**
  1. **Resume bug fixed.** The `/apply` (and `/apply/pro`) flows re-mounted at `useState(0)` every visit, so a returning user always restarted at the trade grid even though each step auto-saves. Now, on load, the flow derives the furthest-answered screen from the saved profile (+ language/education rows) and jumps there — guarded to run once so it never fights manual Back/Next. Verified: answer 3 screens → reload → resumes on the education screen, not the trade grid.
  2. **Microphone now works.** `MicField` was a visual-only placeholder ("SpeechRecognition wired later"). Wired to the Web Speech API — **Hindi-aware** (`hi-IN` when the page is in Hindi, else `en-IN`), pulses red while listening, appends the transcript. The mic only renders when the browser supports it (Chrome/Edge + HTTPS + mic permission), so it's never a dead button. Fixes voice input across both `/apply` and `/apply/pro`. (Live transcription needs a real device/mic to eyeball; button wiring verified.)
- **v0.7.2 — Standard (blue-collar) is now a _complete_ profile.** Per the stakeholder call, the blue-collar form is often filled *with help* (child / CSC / café) from the candidate's documents — so it now captures the document-level identity data, not just the thin essentials. Added two screens to `/apply` (now 10 screens): **ID details** (date of birth required + Aadhaar optional, 12-digit-validated) and **Passport** (number + expiry, **skippable** — most first-timers are registering *because* they don't have one yet). New columns `candidates.date_of_birth` + `candidates.aadhaar_number` (migrated on the live DB; `aadhaarNumber` was previously only on `users`, so the PATCH had silently dropped it — caught in smoke). Server validates DOB (real past date) + Aadhaar (12 digits). Prefill + review rows added. Verified: backend PATCH persists all four identity fields; full 10-screen UI click-through reaches ID → Passport → review with DOB shown.
- **v0.7.1 — tier model made practical (stakeholder round 2).** The three tiers are a *spectrum of self-entry*, all backstopped by the mobile number + HPSEDC follow-up. Presentation fixes: on the dashboard, Standard is the visible default (`Fill my details — about 5 minutes`) and Professional + Callback are now **proper equal-weight option cards** (icon + title + one-line who-it's-for + chevron), not tiny links. The **callback tier is now admin-configurable** — new `capability.assisted_callback_enabled` flag (default on, in `/config/public` + `useCapabilities`); when HPSEDC turns it off, the callback disappears from the dashboard AND `/start` (incl. a stale `?mode=assisted` link). The callback is framed as the **slower fallback** — copy now nudges self-completion ("This takes longer. If you can, fill the form yourself — a family member or Common Service Centre can help."). Verified: default + both cards render; flag exposed.
- **v0.7.0 — UX overhaul from live stakeholder review (Fable 5 design).** Four fixes, all verified live:
  1. **Tiers now visible on the dashboard (P1).** The profile card is tier-aware: first-timers get one big default (`Fill my details — about 5 minutes` → `/apply`) plus two slim alternatives (`We will call you` → `/start?mode=assisted`, `Have a degree or diploma?` → `/apply/pro`); a returning user sees `Continue where you left off` + `Change how you register`; an **assisted** user sees a `HPSEDC will call you on {phone}` status strip instead of a nagging "Complete profile". Fixes the logical hole where assisted users were told to self-complete forever.
  2. **Fraud reframed + demoted (P2).** The giant red "Report a fraud agent" button is gone (nonsensical when HPSEDC is the only agent). Replaced by a calm amber advisory: *"HPSEDC never asks for money…"* + a `Did someone ask you for money? Report it` link. Elevated in its place: `Need help? Ask HPSEDC` + an optional **helpline** button.
  3. **Professional path is a peer, not an escape hatch (P3).** On `/apply` it's now a full-width violet tile IN the trade grid ("Nurse, engineer, teacher or other degree job?"); picking a diploma/degree on the education screen shows an inline "switch to the professional form" nudge (dismissable); degree-holders get a discovery link on the review screen and on the completed dashboard.
  4. **Documents: upload a file OR take a photo (P4).** Root cause was `capture="environment"` forcing the camera and bypassing the file picker. Now each slot opens a chooser sheet — **Upload a file (PDF or photo)** first, **Take a photo** second — with separate inputs; PDF thumbnails, in-place **Replace**. Copy no longer says "camera only".
  - **Trust (Fable verdict):** configurable **HPSEDC helpline** (`contact.helpline_phone`/`_hours` in system_settings, exposed via `/config/public`, shown ONLY when set — no fake number ships) and an **HPSEDC registration number** (`HP-XXXXXX`, derived from candidate id) shown as a govt "receipt" on the ready state.
  - New strings added to en+hi (Hindi first-draft). Verified: State-A tiers, money advisory, in-grid pro tile, doc chooser (PDF accepted), reg number `HP-187026`.
- **v0.6.4 — Hindi pass, increment 5: `/apply/pro` (14-screen Professional flow) — applicant Hindi pass COMPLETE.** `pro` namespace + `choices` extended (pro edu levels, degree types, fields, 9 more destination countries). All 14 screens (name → contact → education branch → degree → field → institution → experience → certificates → skills → languages → countries → IELTS → passport → review) in `t()`; data labels display Hindi, store English. Verified live in Devanagari. **Every applicant-facing surface is now Hindi-enabled** (dashboard + all 3 tiers + documents). Still first-draft copy — HPSEDC/native review pending before go-live.
- **v0.6.3 — Hindi pass, increment 4: `/start` (3-tier entry) + `/documents`.** `start` + `documents` namespaces; both fully in `t()` (doc slots keyed by type). Verified live in Devanagari with a fresh candidate. Remaining: `/apply/pro` (14-screen Professional flow) — the last blue-collar/applicant surface.
- **v0.6.2 — Hindi pass, increment 3: `/apply` tap-choices.** Added a `choices` namespace (trades, education levels, proficiency, Gulf countries, languages) keyed by stable slug; every choice now *displays* in Hindi while still *storing* its canonical English value in the DB (a `tx()` helper falls back to the raw value for out-of-list entries). Verified live: trade cards render राजमिस्त्री/ड्राइवर etc.
- **v0.6.1 — Hindi pass, increment 2: the `/apply` flow + QuestionShell chrome.** `shell` + `simpleApply` namespaces; 8-screen flow + shared shell (trust bar/footer, Next/Back/Skip) in `t()`. Verified live in Devanagari.
- **v0.6.0 — Hindi pass, increment 1: the simplified candidate dashboard.** Added a `simpleDash` namespace to `en.json` + `hi.json` (Fable-drafted Hindi) and converted `candidate-dashboard-simple.tsx` to `t()`. Verified live: language=hi renders the dashboard in Devanagari; the header हिं toggle switches it. **First-draft Hindi — needs a native-speaker review before go-live.** Remaining flows: `/start`, `/documents`, `/apply/pro` — same i18n pattern to apply.
- **v0.5.12 — camera-first documents page (`/documents`) → profile reaches 100%.** DOC slots (Aadhaar/ID, passport, education cert, experience letter, other), `<input capture="environment">`, live status, reuses the existing upload endpoint. Dashboard offers "Add your documents (optional)" when the docs check is the only one missing. Verified: 88% → upload → 100%. **Applicant part is now functionally complete** (all 3 tiers + documents). Remaining: Hindi pass.
- **v0.5.11 — Professional flow integrated (all 3 tiers now live).** New `simple-apply-pro.tsx` (14 one-question screens, branching education level→degree→field→institution, experience/cert add-lists, IELTS-conditional, passport) at `/apply/pro`. Same QuestionShell + call-as-function (focus-safe) pattern. Professional card + `/apply` escape route here (replacing the dense `/profile` wizard). Reuses existing endpoints — no new schema. Verified: branch write (B.Sc Nursing → proper `candidate_education` row) + UI renders/advances with focus retained.

### v0.5.6 — /apply: contact screen + experience-completion fix (profile 50% → 88%)
Subhash flagged the `/apply` profile as too thin (50%, and it promised "we'll call your phone" but never asked for one). Diagnosis: the 8-check completion metric — `/apply` filled only 4 (name, email, skills, education). Fixes:
- **New contact screen** (phone required + home town/district) → fills phone + location.
- **Experience check bug** — it counted `candidate_experience` *rows*, but `/apply` sets `candidates.experience_months`; now the check accepts the months value.
- Result verified: a completed `/apply` → **88%** (7/8), only `documents` missing. `/apply` is now 8 screens.
- The last 12% (documents) + the "Complete profile" loop close with **HP-4c "Add more" (#4)** — camera-first doc upload — next.

### v0.5.5 — fix: stale cross-account cache (fresh account showed another user's data)
Subhash registered a fresh candidate and the dashboard showed **Arjun's** profile + placement. **Not a server leak** — verified a fresh session's API returns only its own data (empty). Root cause: `queryClient` has `staleTime: Infinity`, and while `login` cleared the cache, **`register` and `logout` did not** — so a prior demo account's cached profile/apps bled into the next session (on SPA-internal navigation, no full reload). Fix: `register` + `logout` now `removeQueries` (all keys except `/auth/me`), mirroring `login`. My simplified dashboard just surfaced this pre-existing bug prominently.

### v0.5.4 — simplified blue-collar candidate dashboard (default)
Designed with **Fable 5**, English copy (Hindi pass later). New `candidate-dashboard-simple.tsx` — the **default** for candidates; the detailed dashboard opens via `?full=1` ("See the full dashboard" link).
- 4 blocks only: govt **trust band** → **profile** (one fat progress bar + one 56px "Complete your profile" → `/apply`, or a calm "ready ✓") → **My application** (one big pictorial status — Being reviewed / Interview / Selected / Job confirmed — with a 4-dot step strip, not the 6-col funnel; offer-pending → amber "make a decision") → **Help** (File a complaint / Report a fraud agent).
- Dropped for this audience: 5-stat KPI row, gamified Journey, "How are you doing", recommendations, announcements.
- Reuses the same 3 query keys (shared cache, no new endpoints). Verified live (arjun_thakur): simple markers present, zero detailed artifacts.

### v0.5.3 — admin slim-down: agency CSV export + leaderboard gated

### v0.5.2 — /apply as default candidate entry + 3-role demo login
- **`/apply` is now the default** — the candidate dashboard's primary "Complete/Edit Profile" CTAs point to the blue-collar `/apply` flow (detailed wizard stays as the escape). Granular "add education/experience" + journey deep-links still use the detailed wizard.
- **3-role one-click demo login** — the demo panel now shows **Candidates · Super Agency · Admin**. "Super Agency" re-purposes the (single-agency-hidden) Agencies tab to show just **HPSEDC** (`hpsedc_agency`), one-click. Verified: tabs = [Candidates, Super Agency, Admin]; HPSEDC dev-login 200.

### v0.5.1 — demo-login panel gated + HP DB seeded (login fix)
Subhash reported "can't log in / all 4 roles still show." Root causes + fixes:
- **Demo panel not gated** (separate surface from the HP-3a register dropdown) → now hides Agencies/Employers tabs when those capabilities are off (Candidates + Admin only).
- **HP DB had no users** (only `hpsedc_agency`) → ran `scripts/seed.ts` on the HP DB (50 users: 26 blue-collar candidates + admin + superadmin + agencies/employers), then restarted so the boot seed re-created the mega-agency + `default_agency_user_id`. Normal login verified 200 (arjun_thakur/test123, demo_admin/test123, hpsedc_agency/test123, superadmin/hpsedc@super2026).
- **One-click quick-login off in prod** → set `feature.quick_login_enabled=true` on the HP DB **(user-authorized)** — dev-login now 200.

**Follow-ups flagged:**
- `scripts/seed.ts` is the *reference multi-role* seed — it wrote marketplace (agency/employer) rows to HP, hidden by the single-agency UI. **Build a HP-only seed** (candidates + admin + mega-agency, no marketplace) before go-live.
- `useDemoLogin` swallows the dev-login error (silent fail on 403) — add a toast.

### v0.5.0 — HP-4c · blue-collar simplified application flow (the fork's core UX pivot)
The separate, blue-collar-first route — designed with **Fable 5**, engineered + wired by Opus. Live at **`/apply`**.
- **7 one-question screens:** pictorial **trade grid** (18 trades) → name → experience (months stepper) → **education as levels** (No schooling→Graduate, not free-text degrees) → languages (tap + Little/Good/Very-good) → destination (flag cards) → review. Govt trust chrome, 56px targets, segmented progress, "Report a fraud agent".
- **Same schema** — writes skills/preferredCategories, experienceMonths, qualificationLevel + a candidate_education row, candidate_languages, preferredCountries. **Per-screen save** (2G-safe) + prefill on return.
- **Escape link** → the existing detailed `/profile` wizard for degree-holders (kept as-is).
- **Optional "Add more"** design in hand (reuses detailed components) — folds into the review screen next.
- **Matching fix:** added `below_matric` as the lowest `QUAL_ORDER` tier so no-schooling/5th/8th candidates score against it instead of as blank.
- **Two-gate PASS:** Playwright — trade grid renders, tap Mason advances to name; DB — `skills={Mason}`, `categories={construction}` persisted.
- **Not yet default:** `/apply` is live but the dashboard's "complete profile" CTAs still point to `/profile`. **Awaiting Subhash's review of the live flow before rewiring the default entry.**
- Files: `client/src/pages/simple-apply.tsx` + `simple-apply/{reference,QuestionShell}.tsx`.

### v0.4.4 — HP-4b.5 · Identity mandatory + seed refresh (UAT 4)
- **UAT-4** Identity section mandatory — the wizard's first step now requires Gender + Father's + Mother's name (marked required) before Continue; passport stays optional (first-timers don't have one). Existing incomplete test profiles aren't a concern (disposable data).
- **Seed refresh** — `scripts/seed.ts` now sets `experience_months` on every candidate (matching reads it) and seeds `candidate_languages` (Hindi native + English + some Arabic). Validated on the test DB: 26 candidates w/ months, 55 languages.
- **Item 4 → done. Now 9 of 20 live (1, 3, 4, 5, 6, 7, 9, 10, 12).**
- Note: `scripts/seed.ts` is still the *reference multi-role* seed (creates employer/agency accounts HP disables) — a single-agency seed adaptation is a follow-up before it's run on live HP.

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
