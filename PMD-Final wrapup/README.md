# HireStream + Agentryx Verify — Final Staging Wrap-up

**Point Claude at this file** (or anything in this folder) and it gets instantly aligned to where we are, what's shipped, what's next, and which assumptions are locked. Written 2026-04-19 at the end of the multi-sprint implementation + UAT-prep cycle.

---

## 0 · The three documents you should know exist

| Document | Where | Purpose |
|---|---|---|
| **This file** | `PMD-Final wrapup/README.md` | PM-facing index. Point Claude here. |
| **E2E Workflow spec** | `hirestream/A.PMD/E2E_Workflow__Final_STG.md` | **Binding contract** for how the pipeline must behave. FRS-grounded. Any PR changing pipeline behavior must update this doc in the same PR. |
| **FRS source** | `hirestream/A.PMD/FRS/FRS.txt` | HPSEDC's original requirements spec. §2.2 / §2.4 / §2.5 / §2.6 / §2.7 are load-bearing for the pipeline. |

**In addition**, there are three Claude-only memory files in `~/.claude/projects/.../memory/` that auto-load into every new session — a session-handoff snapshot plus three behavioral discipline rules. Those are Claude's internal notes; no action needed from you.

---

## 1 · Project state (as of 2026-04-19)

Two repos on one staging VM (34.180.25.44):

| Repo | Path | Live at | pm2 | Head |
|---|---|---|---|---|
| **hirestream** | `~/Projects/Recruitment/hirestream` | https://hirestream-stg.agentryx.dev | id 0 | **v0.8.6** · `38d2775` |
| **agentryx-verify** | `~/Projects/Recruitment/agentryx-verify` | https://verify-stg.agentryx.dev | id 1 | **v1.6.2** · `6cbf3a7` |

- Both online and healthy.
- **Pipeline test suite: 58 / 58 green.**
- **Backend curl smoke: 36 endpoints across 4 roles all 200.**
- **Flow A end-to-end smoke (16 steps): clean after v0.8.6.**
- Commits are local; **nothing has been pushed to GitHub yet** — awaiting your OK.

---

## 2 · Workflow lock (the answer to "how does the pipeline actually work?")

Full spec is in `A.PMD/E2E_Workflow__Final_STG.md`. Synthesis:

### Flow A — Employer-led (the default, per FRS §2.7)

```
Employer posts requisition   (visibility = agents_only — candidates never see it)
        ↓
Agent picks up               (creates a derivative, visibility = public)
        ↓
Candidate applies to derivative → submitted
        ↓
Agent scrutinises → reviewed → shortlisted          (FRS §2.2)
        ↓
Employer reviews shortlist → approve-for-interview  (FRS §2.7)
        ↓
Agent schedules interview                           (FRS §2.2)
        ↓
Employer (or agent) interviews → scorecard
        ↓
Employer marks selected                             (FRS §2.7)
        ↓
Agent creates placement, issues appointment letter  (FRS §2.2)
        ↓
Candidate accepts → welfare check-ins 30/60/90 day
```

### Flow B — Agent-led

Same pipeline, but the employer is off-platform. Agent does every step; no employer handoff in the middle.

### Key invariants (never violate these)

- **Candidates NEVER see** an agents_only job, not in the list, not by direct URL. Closed in v0.8.6.
- **Multiple agencies** can pick up the same requisition in `open` mode (default). Each creates its own derivative. Employer's Review Queue aggregates across all of them.
- **Pinned agents** are exclusive only in `pinned_only` mode. In `open` mode, they just get a priority badge.
- **Employer name is scrubbed** on any candidate-facing negative notification (FRS §5).
- **Every status transition** writes to `audit_log` with `actorRole`, `from`, `to`, `reason`.
- **Cascade close** — when a requisition closes, all derivatives close with it.

### Configuration (everything is a knob)

20+ settings in `system_settings` are admin-editable from **Admin → System Config**. Full matrix is in the E2E spec §6. Highlights:

| Knob | Default | Effect |
|---|---|---|
| `requisition.pairing_mode` | `open` | `open` = multi-agent pickup; `pinned_only` = pinned agent only |
| `agency.require_verification_to_post` | `true` | Unverified agencies blocked from posting |
| `pipeline.terminal_states` | `[]` (UAT) | Set to `["placed","rejected"]` for prod |
| `rejection.require_reason` | `false` (UAT) | Turn on for prod |
| `notifications.hide_employer_in_negatives` | `true` | FRS §5 scrubbing — leave on |
| `auth.single_session_per_user` | `false` | ON kills other devices on login (HTIS strict). Default OFF = multi-device like Aadhaar/Naukri |
| `auth.session_timeout_minutes` | `30` | HTIS T5 compliance |

---

## 3 · What got built this session (chronological)

| Ver | Scope |
|---|---|
| **v0.8.0** | 16 quick-wins (Phase 1/2/3 from industry benchmarking): fraud report, viewed-badge, profile gaps, similar jobs, Easy Apply, bulk actions, compare candidates, public agency page, candidate tags, saved searches + email digest, agency leaderboard, funnel analytics, kanban view, interview scorecards, @mentions, fraud watchlist. **Plus admin-configurable integrations** (SMTP/SMS/Aadhaar/HIM Access/DigiLocker) with encrypted `provider_config`. **Plus bug fixes**: derivative-job authorization in employer review queue + approve/reject/request-replacement; duplicate notifications; rejection severity. |
| **v0.8.1** | Country info card + 15 seeded countries, `/status-check` public page, duplicate candidate detection + merge, time-in-stage alerts on kanban, "why you can't apply" reasons, **server-side salary filter (FRS 1.15 blocker fix)**, welfare-overdue badges |
| **v0.8.2** | Removed data-saver toggle (per your feedback — not useful on 4G/5G) |
| **v0.8.3** | **Mac session fix** — multi-device sessions by default. Previously the login handler was killing any other active session for that user, which manifested as "works on Windows, all 401s on Mac" |
| **v0.8.4** | **Applicants list regression fix** (drizzle `sql ... = ANY(arr)` was mis-serializing into pg text[], threw 22P02 on every call). Plus pickup-button state (emerald "Already picked up — open" link). Plus newest/oldest/match sort on applicants. |
| **v0.8.5** | Employer requisition detail page aggregates applicants across derivatives. New endpoint `/employer/requisitions/:id/applicants`. Fixes "hero card shows 4, detail page shows 0". |
| **v0.8.6** | **Visibility leak on `GET /jobs/:id`** — candidates with the UUID could bypass the list filter. Detail route now returns 404 to non-agencies. Caught by Flow A E2E smoke. |
| **v1.6.0** (verify) | Screenshot attach: clipboard paste + drag-drop (Mac), 10 MB multer limit, JSON error handler on /api |
| **v1.6.1** (verify) | nginx `client_max_body_size 20m` added to verify-stg vhost (was defaulting to 1 MB, rejecting 3.5 MB screenshots before they reached Node) |
| **v1.6.2** (verify) | **Seed → 181 items**, new SECTION 9 "End-to-End Workflow Verification" with 10 flow-level scenarios |

---

## 4 · Verify module — 181 test items across 9 sections

| Section | Items | Focus |
|---|---|---|
| 1 · Candidate Experience | ~40 | Registration, profile, apply, track, notifications, country info, public status check |
| 2 · Agency Productivity | ~38 | Pickup, applicants, bulk actions, kanban, tags, scorecards, placements |
| 3 · Employer Workflow | ~17 | Requisitions, review queue, decisions, welfare observation |
| 4 · Admin / HPSEDC Oversight | ~35 | Agencies, compliance, welfare SLA, grievances, leaderboard, funnel, fraud watch, duplicates, integrations, settings, audit |
| 5 · Regulatory / MEA Compliance | ~10 | Employer scrubbing, ECR, passport, PBBY, PDO, welfare 30/60/90 |
| 6 · Platform Configuration | ~6 | Pairing mode, pipeline gates, salary filter, upload limits |
| 7 · Pipeline & Workflow Governance | ~20 | State machine, visibility, cascade close, audit |
| 8 · Account Security & Notifications UX | ~36 | Login, 2FA, OTP, password rules, change password, multi-device, integrations, notification severity / save / dismiss |
| **9 · End-to-End Workflow Verification** | **10** | **Flow A, Flow B, multi-agent, pinned, cascade, scrubbing, visibility matrix, scorecard auth, admin override, public status check** |

Live at: https://verify-stg.agentryx.dev/p/hirestream-v1.5-extras

---

## 5 · What's next (immediate)

**User-blocked, not engineering-blocked.** Waiting for you to:

1. **UI walkthrough on Mac** — click through Section 9 / E9.1 Flow A end-to-end as each role, report anything that doesn't match the spec. Backend is curl-verified; UI is not yet walked.
2. **Decide whether to push commits to GitHub** — eight unpushed commits on hirestream (v0.8.0 through v0.8.6) and five on agentryx-verify (v1.5.8 through v1.6.2).

**Not started (waiting for user signal)** — these are documented in E2E Workflow §7 punch list as items #11-#15:

- `interview.conducted_by` setting + scorecard authorization
- `employer.can_override_agent_rejection` + rescue endpoint
- `pinned_agent.priority_badge_in_open_mode` + UI badge
- **Automated pipeline E2E test** (the 16-step Flow A as a jest test) — this is the regression net. Until it exists, Section 9 items are reviewer-driven, not code-enforced.

---

## 6 · The landmines (what to avoid in any future change)

Called out because they've already bitten us:

1. **Derivative-job authorization.** Any employer-facing endpoint that reads jobs must use `employerOwnsJob()` from `server/routes/employer.routes.ts` — not a raw `WHERE employerId = user.id` filter. The pattern has already caused four distinct bugs (review queue, approve-for-interview, request-replacement, welfare-note, requisition detail aggregation). Fixing one doesn't fix the others automatically.

2. **drizzle `sql` with JS arrays.** Never write `` sql`... = ANY(${arr}::text[])` `` — drizzle's tagged template doesn't round-trip JS arrays into pg `text[]`. Use `inArray(column, arr)` instead. Single-line mistake that took out the whole applicants list endpoint for a sprint.

3. **nginx `client_max_body_size` is per-vhost.** Any new subdomain added to `/etc/nginx/sites-enabled/hirestream.conf` needs an explicit `client_max_body_size 20m;` or it defaults to 1 MB. nginx rejects the request *before* it reaches Node, so multer's own limit is irrelevant.

4. **Session-kill on login is destructive.** Never re-enable unconditionally. It's behind `auth.single_session_per_user`, default OFF. Only password-reset and password-change should unconditionally invalidate other sessions (those are CWE-613/CWE-384 security requirements).

---

## 7 · How Claude should behave on this project (committed disciplines)

Already saved to Claude's persistent memory — every new session loads these automatically:

1. **Backend smoke + UI click-through are both mandatory** before declaring a feature "done". Curl with the exact UI payload shape (including empties/nulls), then click the actual UI. Neither is optional.
2. **Keep Verify in sync.** Every feature change in hirestream gets a matching Verify item in the same sprint, without you having to ask.
3. **Smoke-test siblings, not just the changed path.** When adding a new query or column, curl every other endpoint that reads from the same table. drizzle `sql` template mistakes specifically broke sibling queries once — that regression is now covered.

---

## 8 · Runbook

```bash
# ────── Rebuild + restart ──────
cd ~/Projects/Recruitment/hirestream
npm run build && pm2 restart hirestream

cd ~/Projects/Recruitment/agentryx-verify
npm run build && pm2 restart agentryx-verify

# ────── Re-seed Verify ──────
cd ~/Projects/Recruitment/agentryx-verify
npx tsx scripts/seed-v15-extras.ts

# ────── Pipeline test suite (~3.5 min) ──────
cd ~/Projects/Recruitment/hirestream
npm test -- --testPathPatterns=pipeline

# ────── DB access ──────
PGPASSWORD=hirestream psql -h localhost -U hirestream -d hirestream
```

---

## 9 · Access

| Role | Username | Password |
|---|---|---|
| admin | `demo_admin` | `test123` |
| superadmin | `superadmin` | `hpsedc@super2026` |
| employer | `demo_employer` | `test123` |
| agent (verified) | `europe_careers` | `test123` |
| agent (various) | `demo_agent`, `gulf_jobs_direct`, `japan_pathways` | `test123` |
| candidate (100% profile) | `priya_verma` | `test123` |
| candidate (88% profile) | `meera_iyer` | `test123` |
| candidate (misc) | `rohan_mehta`, `vikram_negi`, `ananya_bhatt`, `arjun_sharma` | `test123` |

---

## 10 · Directory map

```
Projects/Recruitment/
├── PMD-Final wrapup/
│   └── README.md                    ← YOU ARE HERE
├── hirestream/                      ← candidate / agent / employer / admin portal
│   ├── A.PMD/
│   │   ├── E2E_Workflow__Final_STG.md    ← binding workflow contract
│   │   ├── FRS/FRS.txt                   ← HPSEDC contract
│   │   ├── Release Notes/                ← per-version release notes
│   │   └── (other PM docs)
│   ├── client/                       ← Vite + React SPA
│   ├── server/                       ← Express + Drizzle + Passport
│   ├── shared/schema.ts              ← single source of truth for DB schema
│   └── tests/integration/            ← jest + supertest pipeline tests
└── agentryx-verify/                 ← HPSEDC/HTIS sign-off portal
    ├── scripts/seed-v15-extras.ts    ← 181 items across 9 sections
    ├── client/                       ← Vite + React reviewer UI
    └── server/                       ← Express + Drizzle + magic-link auth
```

---

**How to use this file**: when you open a new Claude chat and want to pick up exactly here, say something like *"read Projects/Recruitment/PMD-Final wrapup/README.md before we continue"*. Claude will read this file (and everything it references), load the auto-memory session handoff, and be aligned to where we are without you having to re-explain.
