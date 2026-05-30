# Embedded Testing & Verification Architecture

**Scope:** an in-application, real-time testing & verification module that ships *inside* every Agentryx app. **Not** the external Verify portal — that lives in the parent folder.

**Status:** architecture v0.1 · **Date:** 2026-05-30 · **Anchor implementation:** `hirestream/scripts/deep-smoke.mjs` (committed v0.4.44.0)

---

## Why this folder exists

Today, every Agentryx project gets functional Jest tests and Playwright e2e specs. That's a healthy *baseline* — and on HireStream alone, 485 of them pass. But the audit on 30 May 2026 surfaced two real production-affecting bugs (a 404-shadow on `/agencies/documents` and a status-enum typo that silently dropped interview-stage applications from the candidate UI) that **all 485 tests passed cleanly**. Both were caught by ad-hoc probing — route health and authorization matrix checks — which weren't in the standard stack.

That pattern (clean green light, real bug in production) is not unique to one project. It happens whenever testing is *layered on top* of an app late, rather than designed in from the first commit. We're at the right moment to fix this **before** the next Agentryx app is built — because the cost of bolting verification on later is at least an order of magnitude higher than designing it in.

This folder defines that architecture: a **standard embedded testing & verification framework** that every Agentryx app adopts from day one, gives the developer a confidence signal on every change, and surfaces 30-80% of issues already visible in logs before a human has to read them.

---

## The two halves of the verification stack

The full Agentryx verification stack has two distinct halves. Understanding the boundary is the most important architectural decision in this folder:

| | **Embedded Testing & Verification Framework** (this folder) | **Agentryx Verify portal** (parent folder roadmap) |
|---|---|---|
| **Lives** | Inside every Agentryx app's repo | A standalone product (`verify-stg.agentryx.dev`) |
| **Runs** | Automated — on save, pre-commit, CI, pre-deploy, in production | Humans log in and click |
| **Produces** | Machine-readable signals: test verdicts, route health, log anomalies, per-PR confidence score | Stakeholder verdicts: sign-offs across organisations (Agentryx → contractor → end-customer) |
| **Audience** | Developers, CI/CD, monitoring | QA reviewers, contractors, end-customer reps, regulators |
| **Question it answers** | "Does the code work, and are we *sure*?" | "Do the humans who own this *agree* that it's acceptable?" |
| **Output flows** | → produces signals consumed by → | ← shows automated signals as objective evidence alongside human verdicts |

They are **not redundant**. The embedded framework reduces what humans need to manually re-verify, freeing the Verify portal's reviewers to focus on the judgment-heavy questions (UX appropriateness, business-rule fit, cross-stakeholder acceptance) that automation cannot answer.

Where they meet — the **bridge** — is documented in `03_ROADMAP_AND_INTEGRATION.md`. The existing Verify product roadmap (parent folder, `00`–`05`) is unchanged and remains the source of truth for the external portal.

---

## How to read this set

| File | Purpose | Audience |
|---|---|---|
| `00_README.md` | This file. Framing + reading order. | Everyone |
| `01_EMBEDDED_TESTING_ARCHITECTURE.md` | The 5-layer model, the dev-lifecycle integration, the per-PR confidence score, the standard folder/file/tool stack every Agentryx app adopts. | Architects, tech leads, any engineer starting a new Agentryx app |
| `02_LOG_MINING_AND_RUNTIME_OBSERVABILITY.md` | The runtime side: structured-log contract, anomaly detection, daily digest, LLM-assisted triage. How we extract the 30-80% of issues already visible in logs. | Engineering, ops, future on-call rotation |
| `03_ROADMAP_AND_INTEGRATION.md` | Phased buildout from today's deep-smoke harness (Phase 0, live) through cross-app confidence rollup; the bridge into the external Verify portal. | Sequencing decisions, planning, budget |

**Suggested order:** start with `01` to know the architecture, then `02` for the runtime/log side, then `03` for the buildout sequence and how it ties back to the external Verify portal.

---

## Anchor principles

These show up repeatedly across the docs. They're the constraints that keep the framework honest.

1. **Designed in, not bolted on.** Testing/verification is a first-class module in the project structure from the first commit — not a `tests/` folder that grows organically and reactively.
2. **Signals, not just gates.** A gate (red/green) tells you *whether* to proceed. A signal (confidence score with components) tells you *what to look at*. We want both — but if forced to pick, prefer signals: they don't lull people into false confidence on green.
3. **Coverage breadth over test count.** 485 tests passing didn't prevent the 30 May bugs because *the dimensions weren't covered*. Adding more tests in already-covered dimensions does not raise true confidence. New tests should add a *dimension*, not just a row.
4. **Automation should reduce, not duplicate, human work.** Anything humans do manually and repeatedly — route probing, log triage, regression sweeps — is a candidate to automate. Verify portal reviewers should be doing *judgment*, not re-running checks a machine can run.
5. **Observability ≥ assertions.** A test that asserts `status === 200` is fine. A log that records `route × status × latency × error class` lets you find a thousand different problems you didn't write a test for. Invest in both, but never let assertions starve observability.
6. **Stop bolting things on at the end** — the recurring cost of late-stage hardening is the single biggest reason mature codebases are fragile. Every Agentryx project should pass the Day 1 checklist (see `01`) before it ships any user-visible feature.

---

## Glossary

A few terms recur. Defining them once here:

- **Layer** — a vertical slice of the embedded framework (contract / surface / schema / runtime / confidence). See `01`.
- **Signal** — a numeric or categorical output from a layer (e.g. "route health: 105/105", "log anomaly score: 1.4σ"). Composable into the confidence score.
- **Gate** — a binary go/no-go check (e.g. "all signals must be green to merge"). Built *on top of* signals.
- **Confidence score** — a composite numeric rollup of all layers' signals, attached to a commit / PR / release. Definition + formula in `01`.
- **Day-1 checklist** — the minimum embedded-framework footprint every new Agentryx app must have *before* feature work begins. Listed in `01`.
- **Bridge** — the integration point where embedded signals are published into the external Verify portal as objective evidence. Detailed in `03`.

---

## What this is NOT

- It is **not** a replacement for the external Verify portal. Verify remains the cross-stakeholder consensus layer.
- It is **not** a single tool — it is an *architecture* that composes existing tools (Jest, Playwright, Stryker, Zod, Pino, schemathesis, OpenAPI, Sentry, etc.) into a coherent per-app framework.
- It is **not** a one-off project deliverable. The whole point is *standard and repeatable*, applied identically to every Agentryx app.
- It is **not** dogma. Each project's tech stack will vary; the *layers* and *principles* are universal, the specific tool choices are project-appropriate.
