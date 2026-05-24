# Agentryx Development Methodology

**Version:** v1.0 · **Date:** 2026-05-12 · **Owner:** Subhash / Agentryx

> **What this document is.** This is the master specification for how Agentryx structures, tracks, and ships a development project. Hand this file to any agent or new engineer at the start of a project; they should be able to spin up the complete documentation scaffold without further instruction. It is meant to be portable across projects (mobile apps, web apps, backend services, internal tools).
>
> **What this document is not.** It is not a code style guide, not a sprint methodology like Scrum or Kanban, and not a project-management framework. It governs **documentation, tracking, and learning**, which are the layers most teams under-invest in.

---

## 1. Philosophy

Five principles, in priority order:

1. **Docs are a tool for engineers, not a deliverable for auditors.** If a doc is not used during a working session, it should not exist. Conversely, if it is used, it must be current — a stale doc is worse than no doc.
2. **Two layers: strategy and execution.** Strategy is written once and edited rarely; execution is updated every working session. Mixing them produces docs that are either always stale (because the execution churn drags the strategy with it) or always wrong (because the strategy is buried in execution detail).
3. **Update cadence beats completeness.** A scrappy entry written today is worth more than a polished entry written next month. Especially for learnings — fresh memory degrades fast.
4. **Every requirement has a tracking row.** Whether it's an FRS clause, a customer ask, or a self-imposed quality bar, if it isn't represented as a row in some tracker (roadmap, Verify project, runbook, security inventory), it will be missed.
5. **Decisions are append-only.** Past choices have context; rewriting them destroys that context. Supersede, don't edit.

---

## 2. The standard project structure

Every project folder follows this two-layer layout:

```
<project-name>/
├── 00_README.md                  ← executive summary + index
├── 01_SCOPE.md                   ← what's in, what's out, requirement traceability
├── 02_STRATEGY_AND_STACK.md      ← architecture, tech-stack choices + rationale
├── 03_DEPENDENCIES.md            ← what we need from other systems / teams
├── 04_EFFORT_TIMELINE_RISKS.md   ← effort matrix, critical path, risk register
├── 05_CLOSURE_CHECKLIST.md       ← line-by-line "done" criteria
├── 06_DECISIONS.md               ← ADR log (append-only)
├── 07_RUNBOOK.md                 ← incident response playbooks
├── 08_SECURITY_AND_COMPLIANCE.md ← PII inventory, controls, gaps
│
├── <stream-1>/                   ← per execution stream (platform / module / service)
│   ├── 00_DEV_PLAN.md            ← phases, milestones, exit criteria
│   ├── 01_ROADMAP.md             ← feature backlog (with DoD + Est/Actual)
│   ├── 02_STATUS.md              ← live "where are we" snapshot
│   ├── 03_LEARNINGS_AND_ISSUES.md← running log of surprises
│   ├── 04_CHANGELOG.md           ← per-build release notes
│   └── README.md                 ← folder-local index + pickup guide
│
└── <stream-2>/
    └── (same six files)
```

### What is a "stream"?

A **stream** is a unit of execution that has its own build artifact, release cadence, or test surface. Examples:

| Project type | Streams |
|---|---|
| Mobile app | `Android/`, `iOS/` |
| Web SaaS | `Frontend/`, `Backend/`, `Admin/` (if admin ships separately) |
| Backend service | `API/`, `Workers/`, `Migration/` |
| Single-team monolith | one stream: `App/` |
| Library / SDK | one stream: `Library/` |

Add a stream only when separation is real. Don't pre-split — fold streams back together if it turns out they don't ship independently.

### Numbering rules

- **Strategic docs (root):** numbered `00–08`, ordered roughly by lifecycle (scope → strategy → deps → effort → closure → decisions → runbook → security). Append new top-level docs as `09`, `10`, etc. — never insert in the middle.
- **Stream docs (folder):** numbered `00–04` + a `README`. Always exactly six files; if a project doesn't yet have a changelog, the file still exists as an empty template.
- **Inside roadmap rows:** task IDs `F0.1, F0.2, …, F1.1, …` where the digit before the dot is the phase number. Backend dependencies get `B-` prefix. iOS-specific tasks get `I-` prefix. Don't renumber when items split — append sub-letters: `F2.3a, F2.3b`.

---

## 3. The strategic documents (root level, 9 files)

### `00_README.md`

**Purpose:** Executive summary + doc index. The 30-second pickup for someone new to the project.

**Required sections:**
1. One-line project description with owner, version, last-updated date
2. **Is this in scope?** — link to evidence (contract / FRS / customer ask)
3. **Strategic position** — 3–5 bullet summary of the framing
4. **Document index** — table of every doc with link + purpose + edit frequency
5. **Top-level recommendation** — table of key decisions with rationale
6. **Open questions blocking kickoff** — numbered list, each with an owner
7. **Status pointer** — link to stream-folder STATUS.md files (live status does **not** live here)

**Edit frequency:** Rare. Only when adding a new top-level doc, changing the strategic framing, or when a stream graduates from deferred to active.

---

### `01_SCOPE.md`

**Purpose:** Map every contract / FRS / customer requirement to a delivery commitment. Define what is explicitly **out** of scope and why.

**Required sections:**
1. Direct requirement quotes from source documents, with citations (page / section / line)
2. Interpretation — how we read the requirement, including ambiguities resolved
3. In-scope features table — requirement → delivered feature → priority (P0/P1/P2)
4. Out-of-scope clarifications, with justification
5. Standards + compliance that propagate (privacy, accessibility, security)
6. What existing infrastructure gives us "for free"

**Edit frequency:** Rare. Re-open if the scope is renegotiated.

---

### `02_STRATEGY_AND_STACK.md`

**Purpose:** Architecture and tech-stack decisions. Should answer "why this tech, why not the alternatives, what does this commit us to".

**Required sections:**
1. The strategic question
2. Stack alternatives — head-to-head comparison table
3. Recommended stack — full table (language, framework, deps, deploy, test, CI)
4. Repository / workspace decision — file layout
5. Build and release flow — diagram or sequence
6. Decisions to confirm with the customer before kickoff

**Edit frequency:** Rare. Most of this becomes an ADR if it changes.

---

### `03_DEPENDENCIES.md`

**Purpose:** Catalogue everything this project needs from systems or teams outside its boundary. New tables, new endpoints, new credentials, new env vars, new third-party SDKs.

**Required sections:**
1. Current state of the upstream / sibling system
2. Net changes required (additive, migratory, breaking)
3. New schema (tables, columns, indexes) — exact DDL
4. New endpoints — method, path, request/response shapes
5. New middleware / interceptors / workers
6. Environment variables
7. Security considerations specific to the new surface
8. Migration + rollout plan
9. Exit criteria

**Edit frequency:** Until the dependency surface stabilises; then rare.

---

### `04_EFFORT_TIMELINE_RISKS.md`

**Purpose:** Honest effort matrix, critical path, risk register, and cost estimate.

**Required sections:**
1. Effort matrix — phases × person-days
2. Sensitivity — what blows out the estimate by 50%
3. Critical path — sequence and dependencies
4. Risk register — table of risks with likelihood, impact, mitigation, owner
5. Cost estimate — cash outlays (developer accounts, SaaS, etc.), not engineering time
6. Engineer / team profile required
7. Definition of done at programme level

**Edit frequency:** Re-score risks monthly (see §6 protocol).

---

### `05_CLOSURE_CHECKLIST.md`

**Purpose:** The list you hold up at signoff. Every box must be ticked, with evidence.

**Required sections:**
1. Contractual scope evidence
2. Per-stream production launch checklist (one per stream)
3. Backend / dependency surface checklist
4. Tracking + QA project checklist (e.g. Verify items signed off)
5. Operational readiness
6. Compliance + handover (privacy, source code, signing keys, accounts transferred)
7. Written signoff (customer + internal)
8. How to use this checklist

**Edit frequency:** Rare. Tick items as they land.

---

### `06_DECISIONS.md`

**Purpose:** ADR log. Append-only record of non-trivial choices.

**Required sections:**
1. ADR template
2. Decisions to date — chronological list
3. Pending decisions — issues that will become ADRs once resolved
4. Anti-patterns

**Edit frequency:** Append-only. Never edit past ADRs; supersede them.

**ADR severity gate:** mandatory for stack choice, auth model, data model, deployment strategy, third-party SDK adoption, security/compliance choices, scope cuts, vendor lock-in. Skip for trivia.

---

### `07_RUNBOOK.md`

**Purpose:** The 3-AM doc. What to check, in what order, when something is broken.

**Required sections:**
1. On-call essentials — owners, escalation, dashboard links, key commands
2. Incident severity matrix (SEV-1 / 2 / 3)
3. Playbooks — one `P-N` section per incident type, all using the same five-section shape: Symptom / First checks / Likely causes / Fix / Verify
4. Standing operational lessons (graduated from learnings log)
5. Quick commands cheatsheet
6. How to add a new playbook

**Edit frequency:** Append after the first occurrence of any incident type. Refine after each subsequent occurrence.

---

### `08_SECURITY_AND_COMPLIANCE.md`

**Purpose:** Map regulatory + standards requirements to concrete implementation evidence. Track gaps honestly.

**Required sections:**
1. Regulatory + standards inventory — table
2. Data flow inventory — every PII column / file with source, storage, transmission, retention, deletion path
3. Security controls — table mapping each control to its implementation location
4. User-facing privacy disclosures — store form values, privacy policy URLs
5. Required user-facing flows (delete account, data export, opt-outs)
6. Compliance evidence artifacts for audit
7. **Known gaps + roadmap** — honest, dated, with mitigation owners
8. Update protocol

**Edit frequency:** Commit-by-commit when PII / data flows change. §7 (gaps) is the one part that should never be silently emptied.

---

## 4. The execution-stream template (6 files per stream)

Inside each stream folder, these six files always exist. They are the live, continuously-updated layer.

### `00_DEV_PLAN.md`

**Purpose:** Implementation plan for this stream — phases, milestones, screen/module inventory, exit criteria per phase.

**Required sections:**
1. Scope guardrails — in-scope / out-of-scope for v1.0
2. Phased milestones — table of phases with duration, exit criteria, key risks
3. Inventory of artefacts (screens for UI, endpoints for API, etc.)
4. Technical decisions specific to this stream
5. Dependencies on upstream / sibling systems
6. CI / CD pipeline for this stream
7. Test strategy (unit / integration / E2E / manual / accessibility)
8. Store / deployment submission checklist
9. Definition of done at stream-v1.0 level

**Edit frequency:** Rare.

---

### `01_ROADMAP.md`

**Purpose:** Living feature backlog organised by phase.

**Required sections:**
1. Update protocol + legend
2. Definition of Done (DoD) checklist — listed below
3. Estimation tracking note
4. One table per phase. Every table has these columns:

```
| # | Feature/Task | Status | Owner | Depends on | Est (d) | Actual (d) | Verify item | Last touched | Notes |
```

5. Backend / external dependencies table (if applicable)
6. Open product decisions table (D-IDs, owner, resolved?)
7. Roadmap maintenance rules

**Definition of Done — universal checklist** every row must satisfy before flipping to 🟢:
- Code merged to main
- Unit + integration tests exist and pass in CI
- Manual smoke complete
- Verify item seeded in tracking project
- Stream's `02_STATUS.md` updated
- Stream's `04_CHANGELOG.md` updated if part of a build
- Any new PII → `08_SECURITY_AND_COMPLIANCE.md` updated
- Any non-obvious lesson → `03_LEARNINGS_AND_ISSUES.md` updated
- Any architectural choice → `06_DECISIONS.md` updated

**Edit frequency:** Every status change. Don't batch.

---

### `02_STATUS.md`

**Purpose:** Live "where are we right now" snapshot. The agent / engineer entry point.

**Required sections:**
1. Last-updated date + updated-by + current build version
2. TL;DR table — current phase, sprint goal, code shipped, key external statuses
3. In flight (active right now) — table of tasks with owner, started, expected wrap
4. Just shipped — most recent at top, trim to last 14 days
5. Next 3 things (do these in order)
6. Blocked — table of blocked tasks with blocker, since-date, severity, owner
7. Health indicators (RAG) on schedule / scope / quality / resourcing / dependencies
8. Quick links to other docs
9. Update protocol — staleness rule (>7 days untouched = treat as stale, reconcile against git log)

**Edit frequency:** Every working session. If untouched >7 days, treat as untrustworthy.

---

### `03_LEARNINGS_AND_ISSUES.md`

**Purpose:** Running log of surprises, root causes, lessons. The "we will not commit this mistake twice" doc.

**Required sections:**
1. Update protocol
2. **Standing lessons** — patterns lifted from repeated entries (graduated from individual entries)
3. Entry template
4. Entries (reverse-chronological, newest at top)
5. Anticipated learnings — pre-build hypotheses based on industry experience; replaced by real entries as they fire

**Entry shape:**
```
### YYYY-MM-DD · <one-line title>
> Severity: S1 / S2 / S3
> What happened: plain-English paragraph
> Root cause: the actual cause, not the symptom
> Resolution: what we did, with version numbers / file:line
> Lesson: directive — "always X" / "never Y", not descriptive
> Related: roadmap rows, Verify items, commits
```

**Edit frequency:** Same day a lesson lands. Don't curate or polish — raw beats absent. After 2–3 occurrences of the same lesson, lift it to the Standing lessons section.

---

### `04_CHANGELOG.md`

**Purpose:** Per-build release notes. Mirrors what users see in the store listing.

**Required sections:**
1. Legend — release channels (internal / beta / production / withdrawn)
2. Entries — reverse-chronological, one per build
3. Writing-style guidance — lead with user-visible change, reference roadmap row IDs

**Versioning:** semver-aligned with the backend; include the store build code monotonically.

**Edit frequency:** Same commit as the version bump.

---

### `README.md`

**Purpose:** Folder index + onboarding pointer. The 30-second tour of this stream.

**Required sections:**
1. What this folder is
2. Files in this folder — table with what / edit-frequency
3. How a new engineer or agent picks up context (read order)
4. Update obligations summary

**Edit frequency:** Rare.

---

## 5. Status markers — universal legend

Use these consistently across all docs:

| Marker | Meaning |
|---|---|
| ⚪ | Not started |
| 🟡 | In progress |
| 🟢 | Done (DoD satisfied) |
| ⛔ | Blocked |
| ⏸ | Deferred |
| ✅ | Verified / signed off (used in closure checklist) |
| ⏳ | Pending external input |

For health indicators (RAG): 🟢 green / 🟡 amber / 🔴 red.

---

## 6. Process protocols (more important than any doc)

These are the cadences that keep the docs from going stale. Without them, the docs decay regardless of how well they're structured.

### 6.1 Update-on-commit rule

Every commit that changes app behaviour must touch:
- `01_ROADMAP.md` (status column, last-touched date, actual days if completed)
- `02_STATUS.md` (Last updated, In flight, Just shipped)

If a PR diff modifies code but doesn't touch the stream's STATUS / ROADMAP, the docs are immediately stale. Optional: a pre-commit hook that fails if no `02_STATUS.md` change exists in a code commit.

### 6.2 Verify-sync rule

No roadmap row may flip to 🟢 without its Verify item M-number existing in the tracking project's database. The Verify item is the test artefact; the roadmap row is the planning artefact. They are paired.

### 6.3 Weekly status review

15-minute review every Monday. One person opens `02_STATUS.md`, walks down:
- Is "Last updated" within the last 5 working days? If not, why?
- Is anything in "In flight" stuck? Move to Blocked or accept the slip.
- Is "Next 3 things" still the right next 3 things?
- Any health-indicator RAG flips?

No formal artefact required; the review's value is the forcing function.

### 6.4 Risk decay protocol

Re-score the risk register in `04_EFFORT_TIMELINE_RISKS.md` monthly. Add a "Last reviewed" column. A risk that's been High for 8 weeks without mitigation either no longer exists or is actively eating the project — flag accordingly.

### 6.5 Customer feedback loop during build

Don't wait for UAT. For any external customer (HPSEDC, STIS, etc.), share:
- Weekly: 2-minute video / GIF of in-progress UI
- Phase boundary: short written summary of what shipped + screenshots
- Open decisions: explicit list in the weekly update

UAT-only feedback loops produce surprises and rework. Continuous-low-bandwidth feedback produces alignment.

### 6.6 ADR-for-every-fork rule

Whenever a discussion has more than one defensible answer that takes >30 minutes to resolve, write an ADR. Even if the decision feels obvious in hindsight, the future-version-of-you trying to reverse it deserves to know why.

### 6.7 Learnings-same-day rule

A lesson written one week after the incident is half-remembered and half-fabricated. Write within 24 hours, ugly and raw. Polish later if it graduates to a Standing lesson.

---

## 7. Bootstrapping a new project (for an agent)

If you (an agent or engineer) are starting a new project and have only this methodology doc, here is the sequence:

1. **Create the project folder.**
   ```
   mkdir -p /path/to/projects/<project-name>
   cd /path/to/projects/<project-name>
   ```

2. **Create the 9 strategic docs (00–08).** Use the templates in §3. Even if a doc is mostly empty initially (e.g. you haven't identified gaps yet for §08), create it with the section skeleton — empty sections drive the conversation that fills them.

3. **Identify the streams.** Read the project's contract / FRS / customer brief. Decide what units of execution have independent build / release / test surfaces. Create one folder per stream.

4. **For each stream, create the 6 execution docs (00–04 + README).** Use the templates in §4.

5. **Fill `00_README.md` first.** It is the doc that gates the others — if you can't summarise the project in one page, you don't understand it yet.

6. **Fill `01_SCOPE.md` second.** Quote the source contract / FRS verbatim. Mark every requirement P0/P1/P2.

7. **Fill `02_STRATEGY_AND_STACK.md`** with the head-to-head alternative analysis.

8. **Open `06_DECISIONS.md`** and capture every choice made in steps 5–7 as an ADR. These are the foundational decisions.

9. **Fill `03_DEPENDENCIES.md`, `04_EFFORT_TIMELINE_RISKS.md`, `05_CLOSURE_CHECKLIST.md`** in any order.

10. **`07_RUNBOOK.md` and `08_SECURITY_AND_COMPLIANCE.md`** start mostly as skeletons. Fill the inventory tables; leave playbooks / gaps to populate during the build.

11. **For each stream, fill `00_DEV_PLAN.md`** with the phased plan.

12. **For each stream, fill `01_ROADMAP.md`** with every feature row, organised by phase. Each row gets: ID, description, status ⚪, owner TBD, dependencies, Est/Actual blank, Verify item M-number reserved, Last touched —, notes.

13. **For each stream, fill `02_STATUS.md`** with the initial "pre-build / planning" snapshot.

14. **For each stream, `03_LEARNINGS_AND_ISSUES.md` and `04_CHANGELOG.md`** start empty with the template skeleton.

15. **For each stream, `README.md`** is the folder index.

16. **Save a memory pointer** so future agent sessions know to pick up from `02_STATUS.md`.

The whole bootstrap should take a focused agent ~45 minutes for a small project, ~2 hours for a complex one. Iterate — don't try to perfect any single doc on the first pass.

---

## 8. Anti-patterns to avoid

| Anti-pattern | Why it's bad | What to do instead |
|---|---|---|
| **Architecture.md doc** | Becomes lying documentation within 3 months as code drifts | Let the code be the architecture; if you need to explain a non-obvious choice, write an ADR |
| **API contract reference duplicated in markdown** | Drifts from the actual server code | Read `server/routes/`; if needed, generate OpenAPI from code |
| **Separate "test plan" doc** | Duplicates content already in DEV_PLAN | Keep test strategy in the stream's DEV_PLAN |
| **Postmortem subfolder before you have 3+ incidents** | Premature ceremony | Use LEARNINGS log; spin out postmortems only when volume justifies |
| **Status doc that's edited only at end-of-sprint** | Always lies between sprints | Update at end of each working session |
| **Learnings log curated for cleanliness** | Suppresses the bits worth remembering | Raw + ugly + dated beats polished + missing |
| **One giant ROADMAP.md with no phase grouping** | Can't scan, can't tell what's next | One table per phase; tasks numbered with phase prefix |
| **Verify items added retroactively** | Decouples planning from QA | Reserve M-numbers when creating the roadmap row; seed when feature ships |
| **Renaming / renumbering past ADRs** | Breaks backlinks; loses history | Supersede with a new ADR |
| **Single-stream project that adds folders prematurely** | Bureaucratic overhead | Don't create stream folders unless ≥2 independent build/release surfaces exist |
| **Gap section emptied "to look good" before audit** | Auditors trust honest gap logs more than empty ones | Keep gaps with target dates + owners; mitigations are evidence of maturity |
| **Top-level README that contains live status** | Drifts; nobody updates the top of the index every day | Live status only in stream `02_STATUS.md` |
| **Estimation columns left blank "to fill in later"** | Calibration data lost forever | Force-fill Est on 🟡 transition, Actual on 🟢 transition |

---

## 9. Example: how `MobileApps/` instantiates this methodology

For a concrete reference, the [`MobileApps/` folder](MobileApps/) is the first project to fully instantiate this methodology. Map of what is what:

| Methodology doc | Instance | Notes |
|---|---|---|
| `00_README.md` | [MobileApps/00_README.md](MobileApps/00_README.md) | HPSEDC mobile app exec summary |
| `01_SCOPE.md` | [MobileApps/01_SCOPE.md](MobileApps/01_SCOPE.md) | FRS §2.8 mobile scope analysis |
| `02_STRATEGY_AND_STACK.md` | [MobileApps/02_STRATEGY_AND_STACK.md](MobileApps/02_STRATEGY_AND_STACK.md) | React Native + Expo over alternatives |
| `03_DEPENDENCIES.md` | [MobileApps/03_DEPENDENCIES.md](MobileApps/03_DEPENDENCIES.md) | HireStream backend mobile-surface adaptations |
| `04_EFFORT_TIMELINE_RISKS.md` | [MobileApps/04_EFFORT_TIMELINE_RISKS.md](MobileApps/04_EFFORT_TIMELINE_RISKS.md) | 11–13 week timeline, 15-item risk register |
| `05_CLOSURE_CHECKLIST.md` | [MobileApps/05_CLOSURE_CHECKLIST.md](MobileApps/05_CLOSURE_CHECKLIST.md) | HPSEDC + STIS signoff line-by-line |
| `06_DECISIONS.md` | [MobileApps/06_DECISIONS.md](MobileApps/06_DECISIONS.md) | ADR-0001 through ADR-0005 |
| `07_RUNBOOK.md` | [MobileApps/07_RUNBOOK.md](MobileApps/07_RUNBOOK.md) | P1–P6 playbooks + 8 standing operational lessons |
| `08_SECURITY_AND_COMPLIANCE.md` | [MobileApps/08_SECURITY_AND_COMPLIANCE.md](MobileApps/08_SECURITY_AND_COMPLIANCE.md) | GDPR/PDPA/GIGW/ISO 27001 mapping |
| Stream: Android | [MobileApps/Android/](MobileApps/Android/) | 8 phases, 60+ feature rows, currently pre-build |
| Stream: iOS | [MobileApps/iOS/](MobileApps/iOS/) | Deferred until Android internal track ships |

This methodology was extracted **from** the mobile-app planning exercise, not designed in the abstract — it reflects real working patterns that survived contact with a customer engagement.

---

## 10. Versioning this methodology

This document itself is versioned. When the methodology changes (e.g. we add a 9th strategic doc, or change the streams template), increment the version at the top and add an entry below.

### Methodology changelog

- **v1.0 — 2026-05-12** — Initial version. 9 strategic docs + 6-file stream template + 7 process protocols, extracted from the HPSEDC mobile-app planning exercise.

---

## 11. Quick reference card

For an agent or engineer with 30 seconds and the question "what do I do":

```
Strategic docs (root)           Stream docs (folder)
─────────────────────           ──────────────────────────
00 README — index               00 DEV_PLAN — implementation plan
01 SCOPE — what's in/out        01 ROADMAP — feature backlog
02 STRATEGY — tech choices      02 STATUS — live "where are we"
03 DEPS — what we need          03 LEARNINGS — surprises log
04 EFFORT — timeline + risks    04 CHANGELOG — release notes
05 CLOSURE — signoff list       README — folder index
06 DECISIONS — ADR log
07 RUNBOOK — incidents          Touch on every commit:
08 SECURITY — PII + compliance      01_ROADMAP, 02_STATUS

Universal markers:              Universal cadences:
  ⚪ not started                   commit → update status + roadmap
  🟡 in progress                   weekly → 15-min status review
  🟢 done                          monthly → re-score risks
  ⛔ blocked                       on incident → add runbook + lesson
  ⏸ deferred                      on choice → write an ADR
```
