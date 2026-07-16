# Agentryx Converse — Standalone Conversational-Support Module

**Version:** v1.0 · **Date:** 2026-07-06 · **Owner:** Agentryx / Subhash · **Status:** Specification package — approved for Phase-0 build

---

## Elevator pitch

**Agentryx Converse** is a standalone, multi-tenant, embeddable chat/support module that any Agentryx portal — HireStream, Verify, and every future product — drops in via a one-line `<script>` widget, an npm SDK, or a REST/WebSocket API. Human staff answer from a unified agent console; when nobody is online, messages persist, users get honest expectation-setting, and they're notified when the answer lands — async and real-time share one thread model. An optional AI Responder, grounded on a per-portal knowledge base (RAG, Claude-powered, citations, confidence-gated, human-handoff), can be switched on per portal and per queue without a deployment; routing, skills, multiple bots, supervision, and omnichannel (WhatsApp/email/SMS) follow in later phases. It generalizes the "Ask HPSEDC" support thread already proven in HireStream-HP into a build-once, embed-everywhere platform capability.

---

## How the documents relate

```
00_README.md ──── you are here: index, glossary, changelog
      │
01_Product_Spec.md ──── WHAT & WHY: vision, personas, FR-1…FR-61,
      │                 stories, capability matrix, SLAs, i18n, a11y, compliance
      ▼
02_Architecture.md ──── HOW (engineering): components, domain & data model,
      │                 Responder + Transport seams, APIs & events, tenancy,
      │                 routing, AI/RAG boundary, security, scale, embed/SDK,
      │                 migration from the HireStream-HP seed
      ▼
03_Design_and_UX.md ─── HOW (experience): widget, agent console, supervisor,
      │                 admin console, theming tokens, states, mobile, WCAG,
      │                 component inventory, ASCII wireframes
      ▼
04_Build_Phasing_and_Plan.md ── WHEN & IN WHAT ORDER: 6 phases with exit
                        criteria + effort, Gantt, tech-stack rationale,
                        testing strategy, risks, portal-integration checklist
```

Read order for a stakeholder: 01 → 04. Read order for the implementing engineer: 01 §4 → 02 (all) → 04 §2 → 03 as screens are built. Cross-references use the form "see 02_Architecture.md §Data Model". Requirement IDs (FR-n), goals (G-n), and phase numbers are stable identifiers across all four documents.

## Document index

| # | File | Purpose | Edit frequency |
|---|---|---|---|
| 00 | [00_README.md](00_README.md) | Package index, pitch, glossary, changelog | Rare |
| 01 | [01_Product_Spec.md](01_Product_Spec.md) | Product/functional specification (FR-1…FR-61) | Rare; re-open on scope change |
| 02 | [02_Architecture.md](02_Architecture.md) | Technical architecture & data/API contracts | Rare; changes become ADRs at build time |
| 03 | [03_Design_and_UX.md](03_Design_and_UX.md) | UX/UI specification & wireframes | Rare; refined during each phase's UI work |
| 04 | [04_Build_Phasing_and_Plan.md](04_Build_Phasing_and_Plan.md) | Phased delivery plan, stack, testing, risks, integration checklist | Re-score risks monthly once build starts |

At build kickoff this package is instantiated as a standard Agentryx-methodology project (9 strategic docs + `Service/`, `Widget-SDK/`, `Console/` streams) per `../AGENTRYX_DEV_METHODOLOGY.md`; these four documents seed 01_SCOPE, 02_STRATEGY_AND_STACK, 04_EFFORT_TIMELINE_RISKS, and the stream DEV_PLANs respectively.

## Glossary

| Term | Meaning |
|---|---|
| **Converse** | This module: the Agentryx Converse service + widget + SDK + consoles |
| **Tenant** | One portal/brand served by a shared Converse deployment; the isolation boundary (FR-39) |
| **End user / Visitor** | The person seeking help; portal-authenticated (embed token) or anonymous (visitor ID) |
| **Conversation / Message / Participant** | The core thread model: ordered messages from participants (end user, agent, bot, system) in one conversation — identical for async and real-time |
| **Responder** | The pluggable seam deciding *who answers*: Human, AI, Hybrid, or Rules — configured per queue (FR-22) |
| **Transport / Channel** | The pluggable seam deciding *where messages travel*: in-portal widget, WhatsApp, email, SMS, API (FR-50) |
| **Queue** | Named routing target with member agents, an optional Responder config, business hours, and SLA targets |
| **Assignment / Claim** | Exclusive ownership of a conversation by one agent or bot; claims are atomic (collision-proof) |
| **Presence** | Staff availability state (online/away/offline) driving routing and the widget's truthful availability strip |
| **Embed token** | Short-lived JWT minted by the host portal asserting the end user's identity to Converse |
| **KB / RAG** | Per-tenant Knowledge Base whose chunks ground AI answers via retrieval-augmented generation, with citations |
| **Confidence gate** | Threshold below which an AI draft is never sent and instead escalates to a human queue with the draft attached (FR-26) |
| **Handoff / Escalation** | AI→human transfer: user-requested, intent-detected, guardrail-triggered, or confidence-gated (FR-27) |
| **Outbox** | Transactional table guaranteeing at-least-once delivery of notifications and webhooks |
| **Seq** | Per-conversation monotonic message counter; the basis of ordering, read state, and reconnect healing |
| **Agent console / Supervisor view / Admin console** | The staff SPA: inbox+thread work, oversight+reporting, and tenant configuration respectively |
| **Widget** | The embeddable end-user chat UI (iframe-isolated launcher + window) |
| **SDK** | `@agentryx/converse-sdk`: headless TypeScript client + React bindings; the widget and console are its first consumers |
| **Seed** | The HireStream-HP "Ask HPSEDC" support thread (`support.routes.ts` + `support_messages`) that Converse generalizes; migration path in 02_Architecture.md §15 |

## Key facts at a glance

- **Name:** Agentryx Converse · service `converse` · widget global `AgentryxConverse` · npm `@agentryx/converse-sdk`
- **Phases:** 6 (Phase 0 foundation/seed-parity → async human → real-time → AI/RAG → multi-agent/routing → omnichannel/insight), ~36 person-weeks total
- **Stack:** Node/TypeScript/Express + drizzle/Postgres (+pgvector), Preact widget, React console, `ws` realtime, Anthropic Claude behind a swappable provider seam
- **Default LLM tiering:** `claude-haiku-4-5` (triage/screens) · `claude-sonnet-5` (grounded answers) · `claude-opus-4-8` (complex queues, opt-in)
- **First tenants:** hirestream-hp (Phase 0 cutover), Verify (Phase 1)

## Changelog

| Version | Date | Author | Changes |
|---|---|---|---|
| v1.0 | 2026-07-06 | Agentryx (Fable, principal product architect) | Initial complete package: product spec (61 FRs), architecture, design/UX, 6-phase build plan |

---

*Questions or scope changes: open them against 01_Product_Spec.md §11 (Open Product Decisions) — decisions become ADRs once the build's 06_DECISIONS.md exists.*
