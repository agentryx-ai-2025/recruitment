# Agentryx Verify — Strategy & Roadmap

**Version snapshot:** v1.9.1 · **Date:** 2026-05-06 · **Status:** Live at https://verify-stg.agentryx.dev

This folder contains the strategy, current-state inventory, and roadmap for Agentryx Verify — a multi-stakeholder collaboration hub for software delivery that began as a UAT sign-off portal and is now expanding into a single source of truth for Dev, Support, and Updates.

---

## Why this document set exists

Today, every software project — from a 5-person startup to a 500-person enterprise — fragments its work across 10+ tools: Jira for tickets, Confluence for docs, Zendesk for support, Linear for engineering, Statuspage for incidents, Slack for everything else, plus countless spreadsheets. Each tool optimises for one persona; nothing aligns the contractor, sub-contractor, end-customer, and dev team on a single pane.

Agentryx Verify started as a sign-off matrix for one project (HPSEDC × HTIS × Agentryx) and stumbled into something rare: **two stakeholder organisations using it without training**. HTIS reviewers (the main contractor's QA team) said no other tool — including Jira — let them work this fast. HPSEDC (the government end-customer) finished their first review round in 30 minutes with no onboarding session.

That is the anchor. The architecture, schema, and UX are now mature enough that we can broaden the product without breaking the anchor — provided we are disciplined about what gets added and how.

These documents lay out that discipline.

---

## How to read this set

| File | Purpose | Audience |
|---|---|---|
| `00_README.md` | This file. Index + reading order. | Everyone |
| `01_CURRENT_STATE.md` | Comprehensive inventory of what exists today: schema, routes, UI surfaces, modules, deployment, capabilities. | New engineers, partners doing diligence, future-self in 3 months |
| `02_VISION.md` | The octopus-hub model. Distinguishes "stakeholder consensus hub" from "system of record". Lists what fits the product and what doesn't. | Product / strategic decisions |
| `03_ROADMAP.md` | Phase-by-phase plan. Phase 1 is foundation polish; every later phase ships visible functionality. | Sequencing and prioritisation |
| `04_API_AND_INTEGRATION.md` | Public API design draft. Versioning, auth, webhooks. The contract that lets external portals plug in. | Engineering, partner integrations |
| `05_MODULE_PLAYBOOK.md` | Recipe for adding a new module without breaking the anchor. Reusable patterns from Feedback / Sprints / Issues. | Engineers building Support, Test Mgmt, etc. |

**Suggested reading order:** start with `01` (know what exists), then `02` (know what we're aiming for), then `03` (the path), then `04` and `05` as reference when actually building.

---

## One-page snapshot

**What it is today:** Multi-stakeholder UAT sign-off portal with secondary modules for ideas/feedback inbox, sprint releases, and issues log. Three projects live, two organisations actively using.

**What's distinctive:** Zero-training matrix UX, sequential pipeline of stakeholder verdicts (Agentryx → HTIS → HPSEDC Staging → HPSEDC Final), each blind to the others. Sprint-deploy → re-verify loop closes feedback to delivery without losing signoffs.

**Where it's going:** Single hub that pulls deploy events, support tickets, ideas, decisions, and test results into one matrix-style canvas. External portals (HireStream and others) push data in via API; reviewers across all stakeholder orgs see the same source of truth.

**Where it's NOT going:** It is not a replacement for Jira, GitHub, Zendesk, or Datadog. Verify is the *consensus* layer above those systems, not the system of record for code, tickets, or telemetry.

---

## Document conventions

- **File paths** in code references use the structure of the live repo at `/home/subhash.thakur.india/Projects/Recruitment/agentryx-verify`.
- **Versions** follow the buildRef convention used by the product itself (e.g. `v1.9.1`).
- **Phases** in the roadmap are numbered but not date-bound — sequence matters more than calendar.
- **"Anchor"** throughout these docs means the matrix-as-the-UI design that makes the product self-explanatory. Protecting the anchor is the single most important architectural constraint.
