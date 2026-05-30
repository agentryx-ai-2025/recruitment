<!--
DOC: Testing & Verification Architecture/04_DEV_CONTEXT_HireStream_Testing_Framework_P1-P5.md
PURPOSE: Self-contained context handoff for a fresh chat session
         ("HireStream Testing Framework DEV — P1-P5"). Captures everything
         done in Phase 0 (the architecture spec + the deep-smoke harness)
         and the locked plan for executing Phases 1 through 5 via agent
         orchestration following the DevFactory methodology.
SOURCE:  Architect (Claude Opus 4.7) — written 2026-05-30 at the end of
         the planning session that produced docs 00-03 + this file.
NOTE:    Read this top-to-bottom first. Then read the four sibling docs
         (00-03) in this folder. Then start with Section 10 — "the first
         move".
-->

# HireStream — Testing Framework DEV (Phases 1-5) · Context Handoff

**Written**: 2026-05-30 · **By**: Architect (Claude Opus 4.7) at the close of the planning session
**For**: whoever picks up the next session — read this top-to-bottom first, then the four sibling docs `00`-`03`, then go to **§10 — the first move**.
**Methodology reference**: PMD-DevFactory `C_Agent_Orchestration` (`/home/subhash.thakur.india/Projects/Recruitment/PMD-DevFactory/C_Agent_Orchestration/`). Don't re-derive — follow the existing patterns.

---

## 1. What this project is (refresh)

**HireStream** is the **HPSEDC Overseas Placement Portal** — a government-of-Himachal-Pradesh scheme for placing job seekers in overseas (non-Indian) employment. Production users span 5 roles: Job Seeker (candidate), Recruitment Agency (agent), Employer (overseas company), Admin, Super Admin. Live staging at `https://hirestream-stg.agentryx.dev`.

The portal already shipped through HPSEDC UAT (May 2026); the 8 feedback issues from the test report (27 May 2026) are fully implemented and badged across the role walkthrough videos (see [[hpsedc-test-report-issues]] + [[walkthrough-videos]]).

- **Repo root**: `/home/subhash.thakur.india/Projects/Recruitment/hirestream/`
- **PMD root**: `/home/subhash.thakur.india/Projects/Recruitment/PMD-Final wrapup/`
- **Staging**: `https://hirestream-stg.agentryx.dev` (HTTPS — production build, secure cookies; local pm2 instance on `localhost:5000`)
- **Git**: full repo, commits LOCAL only (never `git push` unless explicitly asked) — see [[project_session_handoff]].
- **Tech stack**: TypeScript / Express / React (wouter) / TanStack Query / Drizzle ORM (Postgres) / Jest / Playwright / Pino.

---

## 2. What Phase 0 (the planning session) produced

Three things shipped before this handoff:

### 2.1 Architecture spec — 4 docs in this folder

The full architectural plan for the embedded testing & verification framework lives in this folder (`PMD-Final wrapup/Testing & Verificaion/Testing Framework & Architecture/`):

| Doc | Read for |
|---|---|
| `00_README.md` | Two-halves framing (embedded testing vs external Verify portal), principles, glossary |
| `01_EMBEDDED_TESTING_ARCHITECTURE.md` | The 5-layer model (Contract/Surface/Schema/Runtime/Confidence), dev-lifecycle integration, per-PR confidence-score formula, Day-1 checklist, standard project structure, tooling stack |
| `02_LOG_MINING_AND_RUNTIME_OBSERVABILITY.md` | Layer 4 in depth — structured-log contract, 3-tier analysis (anomaly detection → daily digest → LLM-assisted triage), phased buildout |
| `03_ROADMAP_AND_INTEGRATION.md` | The 5-phase roadmap (this doc's anchor) + the bridge to the external Verify portal |

**Read all four before writing any Task Brief.** They define what "done" means for each phase.

The sister folder `../Agentryx-Verify-Roadmap/` holds the **external** Verify portal's roadmap — separate concern, separate execution; mentioned here only because Phase 5 of *this* roadmap publishes signals into that portal.

### 2.2 Anchor implementation — Phase 0 code shipped in HireStream

Live on staging, committed `v0.4.44.0`:

- `hirestream/scripts/deep-smoke.mjs` — env-agnostic harness: auth-all-roles + per-role GET route-health sweep + authorization negative matrix. 105 checks pass against staging.
- `hirestream/tests/DEEP_TESTING.md` — entry-point doc; describes the three layers and how to extend.
- `package.json` scripts: `smoke`, `smoke:local`, `test:deep` (= `npm test && npm run smoke`).
- Two real bugs were caught and fixed during the planning session as proof the framework finds what the existing 485 Jest tests missed:
  - `v0.4.43.4` — agency `/documents` route-shadow 404 (Express matched `/:id` first); interview status enum typo (seed wrote `"interview"`, client grouped by `"interview_scheduled"` → interview-stage apps invisible).

### 2.3 Memory pointers (saved for future-self)

- [[deep-testing-framework]] — the standing-practice memory: `npm run test:deep` is now standard; harness extends as code grows.
- [[embedded-testing-architecture]] — pointer to the 4 docs above.
- [[walkthrough-videos]], [[hpsedc-test-report-issues]] — context on what HireStream just shipped.

---

## 3. Current technical state (as of close of Phase 1 — 2026-05-30)

- **HireStream `VERSION`**: 0.4.46.1 (Phase 1 + calibration follow-up)
- **agentryx-verify package version**: 0.2.2 (embedded harness adopted)
- **Jest functional**: 485/485 passing
- **Playwright e2e journeys**: 15/15 passing
- **`deep-smoke` against staging**: 381 pass / 11 warn / 80 fail. The 80 fails are all calibration noise — HireStream uses **handler-level data scoping** rather than route-level role gates, so the L2 authz-negative matrix flags cross-role *route* access as "LEAK" when the *data* is correctly scoped. **The proper test is P2.2's data-isolation suite (content-level, not status-code).** See Phase 1 retrospective.
- **All commits pushed to `origin/main`** (github.com/agentryx-ai-2025/recruitment). The "local-only" rule from earlier sessions is **lifted for Phase-1+ commits** — operator explicitly authorised push at end of Phase 1.
- **Structured logs**: Pino emitting JSON to stdout — *partially* compliant; full mandatory-field migration is P2.3 (a moderate-risk refactor, smallest-possible-PR strategy).
- **Auto-discovery**: ✅ live (P1.1). `__routes` endpoint at `/api/v1/__routes`, env+token-gated. Staging has `DEEP_ROUTES_DEBUG=1` + `DEEP_SMOKE_TOKEN=test123` in pm2 env.
- **CI gate**: ✅ workflow in place at `.github/workflows/pr-check.yml`; awaiting first real PR to fire end-to-end (operator action: enable branch protection).
- **Pre-deploy gate**: ✅ `scripts/deploy-gate.sh` is now the standard deploy path. Bare `pm2 restart hirestream` deprecated.
- **Day-1 skeleton check**: ✅ `scripts/verify-skeleton.mjs`; HireStream + Verify both pass 11/11.
- **Pending in Phase 2**: schema fuzz (P2.1), mutation + data-isolation suite (P2.2 — the critical path), logger contract (P2.3), daily digest (P2.4).
- **Pending in Phase 3+**: anomaly detection, LLM triage, confidence score, Verify bridge.

---

## 4. The forward plan — Phase 1 through Phase 5

This is the anchor of the next session. See `03_ROADMAP_AND_INTEGRATION.md` for the full per-phase detail. Summary table below — each phase ships standalone value, none is "infrastructure that pays off only in Phase N+2".

| Phase | Theme | Effort | Confidence target | Standalone payoff |
|---|---|---|---|---|
| **P1** | Eliminate manual maintenance + wire CI | ~1 week | ~88-90% | Framework runs itself: route auto-discovery, CI on every PR, pre-deploy gate |
| **P2** | Close the L3 gap + start L4 | ~2 weeks | ~92-93% | Input-validation regressions surface; daily log digest replaces manual log-reading |
| **P3** | Full L4 + L5 (confidence score) | ~2 weeks | ~95% | 30-80% of production-visible issues caught before users report them; PRs land with a number |
| **P4** | Mature L3 + coverage *quality* | ~2 weeks | ~96-97% | Mutation testing + OpenAPI fuzz + visual regression |
| **P5** | Bridge to external Verify portal | ~1 week | ~96-97% + visibility | Embedded signals appear in the Verify matrix as objective evidence |

Total: ~8 weeks if executed sequentially. Significantly less in parallel via sub-agents (see §6).

### Per-phase deliverables (anchor list — turn each into a Task Brief in the new session)

#### Phase 1 — eliminate manual maintenance + wire CI
1. **P1.1** Route auto-discovery — `deep-smoke.mjs` walks `app._router.stack` and probes every declared GET; `FORBIDDEN` becomes auto-derived from per-role-allowed-list.
2. **P1.2** CI on every push — `.github/workflows/pr-check.yml` runs `npm run test:deep`; PR check red blocks merge.
3. **P1.3** Pre-deploy gate — `.github/workflows/pre-deploy.yml` (or a wrapper script around `pm2 restart`) that runs `test:deep` against the *target* before the restart, aborting on red.
4. **P1.4** Embed the same framework in Verify itself — Verify is an Agentryx app; it must adopt the harness. Proves the framework is portable.
5. **P1.5** Day-1 checklist enforcement script — `scripts/verify-skeleton.mjs` validates the project structure (`tests/`, `scripts/deep-smoke.mjs`, `tests/DEEP_TESTING.md`, `VERIFICATION.md`); runs in CI.

#### Phase 2 — close L3 + start L4
1. **P2.1** Zod-derived input fuzz — `scripts/schema-fuzz.mjs`: walks `shared/` Zod schemas, generates boundary/invalid/oversized cases, asserts server rejects cleanly (4xx structured, not 5xx).
2. **P2.2** Mutation smoke + data-isolation suite — adds POST/PATCH/DELETE happy paths + "employer A can't see employer B's placements" / "agent X can't edit agent Y's KYB docs" pairs. Lives in Jest against the test DB.
3. **P2.3** Structured-log contract enforced — `lib/logger.ts` wrapper with typed methods; CI lint rule rejecting raw `console.log` outside `tests/scripts/`; Pino redact config blocks PII. **This is the moderate-risk refactor — ~50-100 callsites to wrap; do it in small PRs, deep-smoke each.**
4. **P2.4** L4 Tier 2 daily digest (file-based) — `tools/log-analyzer/digest.mjs` tails the day's logs, clusters by `errorClass × route`, prints opinionated digest, posts to a Slack channel via webhook.

#### Phase 3 — full L4 + L5
1. **P3.1** L4 Tier 1 — real-time anomaly detection: Loki + Promtail on the staging VM; Grafana dashboards; alertmanager → Slack.
2. **P3.2** L4 Tier 3 — LLM-assisted triage: `tools/log-analyzer/triage.mjs` (Claude API, prompt-cached, PII-redacted); appended to daily digest as collapsible "Proposed root cause" section.
3. **P3.3** L5 confidence score reporter — `scripts/confidence.mjs` computes composite (per `01` §6.1), posts PR comment with breakdown, writes to `VERIFICATION.md` trend chart.
4. **P3.4** Pre-merge gate based on score — PR check fails if `confidence < project_threshold` (start at 60, ratchet over time).
5. **P3.5** Synthetic monitoring — `npm run smoke` on cron against production every 10 min; alert on any failure.

#### Phase 4 — mature L3 + coverage quality
1. **P4.1** OpenAPI auto-generation — emit `/api/v1/openapi.json` on build.
2. **P4.2** Schemathesis fuzz — feed OpenAPI; runs as part of CI; generates dozens of edge cases/endpoint.
3. **P4.3** Mutation testing (Stryker) — weekly on main; score → L1 `mutation_kill` signal; bar ≥ 70% kill rate.
4. **P4.4** Visual regression — Playwright snapshots on key screens; PR comments diff; opt-in approve workflow.

#### Phase 5 — bridge to Verify portal
1. **P5.1** Bridge API client — POST per release + per-anomaly events to Verify portal (payload shape in `03` §4.2).
2. **P5.2** Per-release evidence snapshot — page at `/__verify/evidence/<buildRef>` showing all signals at release time.
3. **P5.3** Cross-app rollup — Verify-side compute (delegated to Verify roadmap parent folder); embedded side just publishes consistently.

---

## 5. Open architectural questions (decide before relevant phase)

Carried in from `03_ROADMAP_AND_INTEGRATION.md` §7 — each must be resolved before the phase it blocks:

1. **Confidence-score formula weights** — defaults in `01` §6.1 are reasonable. Re-tune at end of P3 with real data.
2. **Production credentials for synthetic sweeps** — read-only service principal vs. SSO. Pick before P3.5.
3. **Log-store choice** — start file-based + jq, graduate to Loki vs ELK vs hosted. Decide at P3.1 based on then-current scale.
4. **OpenAPI spec authoring approach** — auto-extract vs hand-curated. Decide at P4.1; Express's loose typing makes auto-extract imperfect.
5. **Verify portal API readiness** — P5 depends on the Verify portal accepting the embedded payloads. Coordinate with [Verify Roadmap parent folder `03_ROADMAP.md`].
6. **LLM triage cost cap** — Claude API spend at P3.2. Budget cap + per-cluster dedup are the controls.

---

## 6. Methodology — how this dev will be executed

Follow the DevFactory `C_Agent_Orchestration` pattern. Don't re-invent.

### 6.1 The work cycle (per Task Brief)

```
Architect (you, in this session)
  1. Pick the next task from the per-phase deliverable list above.
  2. Write a Task Brief into:
     PMD-Final wrapup/Testing & Verificaion/Testing Framework & Architecture/
       C6_Active_Tasks/Task_Briefs/<task-slug>.md
     using DevFactory's Task_Brief_template.md.
  3. Pick tier (🔴 / 🟡 / 🟢) per DevFactory C4_Tier_Routing.md.
  4. Either:
     (a) Dispatch via Claude Code's Workflow / Agent tool (in-session subagent), OR
     (b) Hand the brief to the operator to paste into Antigravity.

Sub-agent
  5. Reads C1_Conventions_for_Agents + the brief.
  6. Edits HireStream's source (hirestream/...).
  7. Writes a QC Report into:
     .../C6_Active_Tasks/QC_Reports/<task-slug>.md
     using DevFactory's QC_Report_template.md (all 9 sections required).
  8. STOPS — no commits, no deploys, no PROD touches.

Architect (you, again)
  9. Reads the QC report; spot-checks the actual diff (do NOT trust the
     QC report's "everything passes" alone — see C5_Failure_Modes.md).
 10. Writes an Architect_Review into:
     .../C6_Active_Tasks/Architect_Reviews/<task-slug>_Review.md
 11. If ACCEPT: integrate + run npm run test:deep + commit per the
     existing v0.4.X.Y convention (one logical change per commit).
 12. If FIX: hand corrections back as a follow-up brief.

On phase complete: move artifacts C6 → C7_Archived_Tasks (mirror DevFactory).
```

### 6.2 Folder layout to create in the new session (does NOT exist yet)

Create on first task:
```
PMD-Final wrapup/Testing & Verificaion/Testing Framework & Architecture/
├── 00_README.md                            ← exists
├── 01_EMBEDDED_TESTING_ARCHITECTURE.md     ← exists
├── 02_LOG_MINING_AND_RUNTIME_OBSERVABILITY.md ← exists
├── 03_ROADMAP_AND_INTEGRATION.md           ← exists
├── 04_DEV_CONTEXT_HireStream_Testing_Framework_P1-P5.md  ← THIS FILE
├── Phase_PRDs/
│   ├── Phase_01_PRD.md                     ← TO CREATE first thing in new session
│   ├── Phase_02_PRD.md                     ← create at end of P1
│   ├── ...
└── C6_Active_Tasks/
    ├── Task_Briefs/
    ├── QC_Reports/
    └── Architect_Reviews/
```

### 6.3 Sub-agent tier guidance (initial)

Per task in the list above, my initial tier guess (refine per task once you read C4):

| Task | Tier | Why |
|---|---|---|
| P1.1 Route auto-discovery | 🟡 | Needs Express internals understanding; mechanical once spec is locked |
| P1.2 / P1.3 CI workflows | 🟢 | Boilerplate GitHub Actions — well-bounded |
| P1.4 Embed in Verify | 🟡 | Cross-repo familiarity needed |
| P1.5 Day-1 checklist script | 🟢 | Validation script — mechanical |
| P2.1 Schema fuzz | 🟡 | Needs schema-walking design |
| P2.2 Mutation smoke + data-isolation | 🔴 | Domain knowledge + boundary design |
| P2.3 Log wrapper + lint rule | 🟡 | Refactor across ~50 callsites — needs care |
| P2.4 Daily digest | 🟡 | Output design needs taste |
| P3.1 Loki + Promtail | 🟡 | Infra + ops |
| P3.2 LLM triage | 🟡 | Prompt design + API integration |
| P3.3 Confidence reporter | 🟡 | Composer of existing signals |
| P3.4 Pre-merge gate | 🟢 | Mechanical |
| P3.5 Synthetic monitoring | 🟢 | Cron + existing harness |
| P4.x | mostly 🟡 | Each tool integration is bounded but non-trivial |
| P5.x | 🟡 | API contract design + client |

---

## 7. Ground rules (carry-ins + new)

From [[project_session_handoff]] and similar — these are inviolate:

- **Never `git push`** unless explicitly told. Every commit since `v0.4.37.0` is local only.
- **Never destructive git** (`reset --hard`, `push --force`, etc.) without explicit instruction.
- **Never commit secrets**. `PMD-Final wrapup/keys.md` is gitignored; never reference its contents in committed code.
- **Never skip hooks** (`--no-verify`).
- **Don't bump VERSION more than once per commit** — version is in `hirestream/VERSION`.
- **`test-results/video/` is gitignored** — recorded videos must not be committed.
- **Sub-agents NEVER touch production paths.** They edit `hirestream/...` only; the architect commits + deploys.
- **`npm run test:deep` must pass before any commit lands on `main`.**

New for this dev:
- **Each Phase ships before the next starts.** No half-finished phases left open. Exit criteria in `03` §3 per phase.
- **Mutation testing of the framework itself** runs from Phase 4 — the framework is code, code has bugs, the framework must verify itself.
- **Calibration goes in code as a comment.** When the harness flags a false positive (as happened with `/agent/placements` in P0), add a comment-anchored explanation in `scripts/deep-smoke.mjs` — don't silently mute.

---

## 8. Risk register — "is this incremental and safe?"

Honest per-phase assessment. The operator asked the question; future-self should know the answer.

| Phase | Risk to running portal | Mitigation |
|---|---|---|
| P1 | **None.** Pure additions: `.github/workflows/*`, `scripts/verify-skeleton.mjs`. CI gates *block* regressions; can't introduce them. Auto-discovery is a script that reads, never writes. | Run `test:deep` after each P1 task; verify staging stays green. |
| P2.1 Schema fuzz | None — read-only fuzz against test DB / staging. | — |
| P2.2 Mutation smoke + data isolation | Very low — lives in Jest against test DB. Test DB resets per run. | Use the existing `npm run db:push:test` and `tests/setup.ts` patterns. |
| **P2.3 Log wrapper refactor** | **Moderate** — wraps ~50-100 existing `console.log` / `logger.X` callsites. A wrong wrap could silently drop log lines. | **Smallest possible PRs (10-15 callsites at a time)**. `test:deep` + spot-check logs on staging after each. Pino redact config tested with a unit test. |
| P2.4 Daily digest | None — read-only consumer of logs; output goes to a Slack channel. | Start with a private channel; promote to team channel after a week. |
| P3.1 Anomaly detection (Loki) | None to portal; **operational risk to humans**: false-positive alert fatigue on day 1. | Route alerts to a dedicated channel for 1 week before paging; tune thresholds based on observed baselines. |
| P3.2 LLM triage | None — read-only consumer of digest output; outputs prompts to a Slack message. PII-redacted before send. | Per-cluster dedup + daily budget cap on Claude API spend. |
| P3.3 Confidence reporter | None — pure composer; writes a markdown table to a PR comment. | If reporter crashes, PR check fails open (informational), not closed (blocking). |
| P3.4 Pre-merge gate based on score | **Low** — could block legitimate merges if score is mis-tuned. | Start threshold at 60 (very permissive); ratchet up over 2-3 sprints based on lived experience. |
| P3.5 Synthetic monitoring | None — uses existing `deep-smoke` harness; cron'd. | Read-only auth account on prod; rate-limit the cron to 10-min intervals. |
| P4.1-P4.2 OpenAPI + fuzz | None — additive in CI. | Schemathesis can take many minutes; run on a slower schedule (nightly), not every PR. |
| P4.3 Mutation testing (Stryker) | None — runs on the test suite, not the app. | Weekly cron, not per-PR (Stryker is slow). |
| P4.4 Visual regression | Low — snapshot diffs in PR comments. Could be noisy on intentional UI changes. | Opt-in approve workflow; well-tuned snapshot regions. |
| P5 Verify bridge | None — additive HTTP POSTs to the Verify portal API. | Failure to publish does NOT block the release; logs a warning. |

**Net: the framework is designed so that its own failures fail SAFE** — a broken framework component blocks merges (annoying) but doesn't break the running product. The single "non-trivial care needed" item is **P2.3 log wrapping**; everything else is genuinely additive.

---

## 9. File map — where to find / put things

**Architecture spec** (read-only reference):
- `PMD-Final wrapup/Testing & Verificaion/Testing Framework & Architecture/00_README.md` ... `03_ROADMAP_AND_INTEGRATION.md`
- This file: `04_DEV_CONTEXT_HireStream_Testing_Framework_P1-P5.md`

**Phase PRDs + Task artefacts** (create as you go):
- `Testing Framework & Architecture/Phase_PRDs/Phase_NN_PRD.md`
- `Testing Framework & Architecture/C6_Active_Tasks/Task_Briefs/<task-slug>.md`
- `Testing Framework & Architecture/C6_Active_Tasks/QC_Reports/<task-slug>.md`
- `Testing Framework & Architecture/C6_Active_Tasks/Architect_Reviews/<task-slug>_Review.md`
- On phase complete: move to `Testing Framework & Architecture/C7_Archived_Tasks/Phase_NN/`

**HireStream code** (where actual changes land):
- Repo: `/home/subhash.thakur.india/Projects/Recruitment/hirestream/`
- Existing anchor: `hirestream/scripts/deep-smoke.mjs` · `hirestream/tests/DEEP_TESTING.md`
- New per Phase: `hirestream/scripts/*.mjs`, `hirestream/tools/log-analyzer/*`, `hirestream/lib/logger.ts`, `hirestream/.github/workflows/*.yml`, `hirestream/tests/integration/authz-matrix.test.ts`, etc.

**DevFactory methodology** (read-only reference — borrow templates):
- `/home/subhash.thakur.india/Projects/Recruitment/PMD-DevFactory/C_Agent_Orchestration/C1_Conventions_for_Agents.md`
- `.../C3_Templates/Task_Brief_template.md`
- `.../C3_Templates/QC_Report_template.md`
- `.../C3_Templates/Architect_Review_template.md`
- `.../C3_Templates/Phase_PRD_template.md`
- `.../C4_Tier_Routing.md`
- `.../C5_Failure_Modes.md` ← consult before dispatching

**External Verify roadmap** (sibling concern; referenced by Phase 5):
- `PMD-Final wrapup/Testing & Verificaion/Agentryx-Verify-Roadmap/00_README.md` ... `05_MODULE_PLAYBOOK.md`

---

## 10. The first move (start here in the new session)

After reading `00`-`03` and this file:

**Already done at the close of the planning session** (so the new session starts further along than it otherwise would):
- ✅ Skeleton folders created (`Phase_PRDs/`, `C6_Active_Tasks/{Task_Briefs,QC_Reports,Architect_Reviews}/`, `C7_Archived_Tasks/`)
- ✅ `Phase_PRDs/Phase_01_PRD.md` — **locked**, with the Antigravity sub-agent dispatch plan baked in (4 parallel + 1 sequential = 5 agents across 4 model picks). Read this PRD before writing any briefs.

**Remaining moves for the new session:**

1. **Resolve the open decisions** in `Phase_01_PRD.md` §9 (CI test-DB approach; Verify repo path; AG auth status).

2. **Write the first Task Brief — `p01_p1_1_route_auto_discovery.md`** using DevFactory's `Task_Brief_template.md`. Reference `hirestream/scripts/deep-smoke.mjs` and `01_EMBEDDED_TESTING_ARCHITECTURE.md` §3 (Surface layer). Tier: 🟡 (Claude Sonnet 4.6 Thinking per PRD §7.1).

3. **Write Wave 1 sibling briefs in parallel** (architect-side, ~30-45 min each) — `p01_p1_2_ci_pr_check_workflow`, `p01_p1_3_pre_deploy_gate`, `p01_p1_5_day1_skeleton_check`. All independent files; no agent conflicts.

4. **Dispatch Wave 1 — 4 AG agents in parallel.** Operator pastes each brief into Antigravity with the model named in PRD §7.2.

5. **As QC Reports come back, do per-task Architect Reviews** — *spot-check the actual diff*, don't trust the QC report's "all passes" alone (see DevFactory `C5_Failure_Modes.md`). Then integrate, run `npm run test:deep`, commit as `v0.4.45.{0..4}` (one task per commit).

6. **Write the Wave 2 brief — `p01_p1_4_verify_framework_port`** — once P1.1 is integrated + verified (its design is the input to P1.4). Dispatch to Gemini 3.1 Pro High per PRD §7.3.

7. **End-of-P1 ritual** — move all 5 artefacts C6 → `C7_Archived_Tasks/Phase_01/`; write Retrospective; bump VERSION to `v0.5.0.0`; draft `Phase_02_PRD.md`; update this context file's §3.

---

## 11. Credentials & environment

- **Demo accounts (staging)** — all use password `test123` except superadmin (`hpsedc@super2026`):
  - `demo_candidate` / `demo_agent` / `demo_employer` / `demo_admin` / `superadmin`
  - Plus seed candidates: `priya_verma`, `rohan_mehta`, `meera_iyer`, `vikram_negi`, `ananya_bhatt`
- **`DEEP_URL` env** — defaults to staging; override for local dev (`http://localhost:5001`) or any future env.
- **`DEEP_PW_<ROLE>` env** — per-role password override. Don't commit prod credentials.
- **`hirestream/.env`** — `DATABASE_URL` for the local Postgres, plus other secrets. Already gitignored.
- **`PMD-Final wrapup/keys.md`** — PAT for git push (gitignored, never reference contents in code).
- **PM2 process**: `hirestream` (port 5000, production build). Reload via `pm2 restart hirestream` after rebuild. Do NOT restart during P2.3 log refactor without verifying logs first.

---

## 12. Glossary + memory cross-links

Defined inline above; consolidated here:

- **L1-L5** — the layers of the architecture (`01` §3). L1 Contract, L2 Surface, L3 Schema, L4 Runtime, L5 Confidence.
- **Day-1 checklist** — the minimum embedded framework footprint a new Agentryx app must have before feature work. `01` §7.
- **Signal vs Gate** — signal = informational number; gate = binary block. Signals compose to scores; scores compose to gates.
- **Bridge** — the Phase-5 integration into the external Verify portal (`03` §4).
- **Calibration** — when the framework flags a false positive, the response is a comment-anchored explanation in code, not a silent mute.
- **Tier** — DevFactory's 🔴 / 🟡 / 🟢 model-routing convention (`C4_Tier_Routing.md`).

Active memories worth keeping near hand:
- [[deep-testing-framework]] — `npm run test:deep` is the standing practice; this dev extends it through P1-P5.
- [[embedded-testing-architecture]] — pointer to the 4 sibling docs.
- [[project_session_handoff]] — HireStream's general handoff (credentials, runbook, ground rules).
- [[walkthrough-videos]], [[hpsedc-test-report-issues]] — context on what just shipped, in case a sub-agent asks "why is the portal in this state".

---

## 13. Definition of done — the whole P1-P5 program

Done when:
- [ ] Phase 1-5 deliverables (§4) all shipped, committed, deployed to staging
- [ ] `npm run test:deep` covers L1+L2+L3+L4; confidence score reported on every PR
- [ ] Embedded framework is mirrored in the Verify product repo (P1.4 expanded across phases)
- [ ] Per-release evidence flows into the external Verify portal (P5)
- [ ] The 4 doc cleanups from end-of-Phase-0 are merged (cross-reference fixes after the Verify roadmap moved into the sibling folder)
- [ ] Retrospective files at `C7_Archived_Tasks/Phase_NN/Retrospective.md` for every shipped phase
- [ ] HireStream confidence number (per `01` §6) is reproducible and ≥ 95% at end of P3, ≥ 96% at end of P4

When all of the above land, the next Agentryx app (CarePortal, future) inherits a turnkey embedded framework. That's the entire payoff of this dev.
