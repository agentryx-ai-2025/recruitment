# Agentryx Converse — Build Phasing & Delivery Plan

**Version:** v1.0 · **Date:** 2026-07-06 · **Owner:** Agentryx / Subhash · **Status:** Approved for Phase-0 build

> **What this document is.** The delivery plan for Agentryx Converse: phase table, per-phase scope/deliverables/exit criteria/effort, milestone timeline, tech-stack recommendation with rationale, testing & verification strategy, risk register, and the reuse-in-any-portal integration checklist. Requirements (FR-n): [01_Product_Spec.md](01_Product_Spec.md). Technical detail: [02_Architecture.md](02_Architecture.md). When the build starts, this plan is instantiated as an Agentryx-methodology project (9 strategic docs + `Service/`, `Widget-SDK/`, `Console/` streams) per `AGENTRYX_DEV_METHODOLOGY.md`; this document seeds those files.

---

## 1. Phasing Logic

Six phases. Each phase ships something **usable in production by a real tenant** — no phase is pure infrastructure. The sequence de-risks in order of certainty: we know humans must answer (Phases 0–2) before we tune how AI answers (Phase 3) and how teams scale (Phase 4–5). The Responder and Transport seams are built as *interfaces* in Phase 0 even though only trivial implementations exist then — retrofitting seams is the expensive mistake this plan avoids.

Effort assumes the proven Agentryx working model: **1 senior full-stack engineer + agentic tooling**, with a second engineer joining for Phases 3–5. Person-weeks (pw) include testing and docs per the house Definition of Done.

## 2. Phase Table

| Phase | Name | Scope (headline) | Effort | Depends on |
|---|---|---|---|---|
| **0** | Foundation & seed-parity | Standalone service, core schema, tenancy, embed token, widget v0, agent inbox v0, notify pipeline, both seams as code, HireStream-HP migration | 5 pw | — |
| **1** | Human-manned async, production-grade | Offline ack + expectation flow, business hours, contact capture, conversation lifecycle, canned responses, attachments, npm SDK, console hardening, second tenant (Verify) | 5 pw | 0 |
| **2** | Real-time layer | WebSocket gateway + fallbacks, typing, read receipts, presence, live inbox, transfer, notes, supervisor v0 (watch/reassign), 2FA | 5 pw | 1 |
| **3** | AI Responder & RAG | KB ingestion + pgvector retrieval, AIResponder + Hybrid + Rules, citations, confidence gating, guardrails, handoff, AI turn audit, KB admin UI, KB-suggest for agents | 7 pw | 1 (2 for streaming UX) |
| **4** | Multi-agent & routing at scale | Routing engine (rules/strategies/skills/caps), queues full, multiple bots + triage flow, supervisor dashboard full, SLA engine, webhooks, automation hooks, Redis split | 6 pw | 2, 3 |
| **5** | Omnichannel & insight | WhatsApp transport (first), email transport, CSAT, analytics & reporting, retention automation + data-rights tooling, RN component kit, SMS (best-effort) | 8 pw | 4 |
| | **Total** | | **36 pw** (~9 months at 1–2 engineers) | |

### Phase 0 — Foundation & seed-parity (5 pw)

*Goal: Converse exists as a standalone service and HireStream-HP's "Ask HPSEDC" runs on it with zero feature loss.*

- **Scope:** repo + CI + PM2 deploy skeleton; Postgres schema for tenant/staff/end_user/queue(single default)/conversation/message/participant/receipt/event/outbox ([02 §5](02_Architecture.md)); tenant-scoped repository layer + RLS; embed-token session exchange + visitor sessions; REST v1 for end-user + staff cores ([02 §6](02_Architecture.md)); polling-based widget v0 (launcher, window, text messages, history, static offline banner); console v0 (login, inbox list, thread, reply, resolve, atomic claim); `notification_outbox` + `user.notify` portal webhook + email sender; `Responder`/`Transport` interfaces with `HumanResponder`/`WidgetTransport`; rate limiting; structured logs + health endpoints + deep-smoke script; migration script from `support_messages` and HireStream-HP cutover ([02 §15](02_Architecture.md)).
- **Deliverables:** deployed service (staging + prod), widget loader v0, console v0, OpenAPI spec, migration executed, integration snippet in HireStream-HP.
- **Exit criteria:** HireStream-HP candidates use the widget end-to-end; legacy support routes read-only; authz matrix smoke green incl. cross-tenant denial; message-persist p95 < 500 ms; a second *test* tenant provisioned proving isolation; zero data loss in migration (row-count + spot-audit).
- **Key risks:** scope creep toward Phase 1 polish (mitigation: seed-parity is the bar, nothing more).

### Phase 1 — Human-manned async, production-grade (5 pw)

*Goal: the async support experience is excellent, not merely functional — and a second real tenant is live.*

- **Scope:** truthful availability strip + offline ack flow with reply-by expectations (FR-18); business-hours config + admin editor (FR-45); anonymous contact capture + consent copy (FR-56); lifecycle full (pending/resolved/closed/reopen, FR-4); unread dividers, day separators, conversation history list (FR-9/10); canned responses with `/` picker (FR-15); attachments with scanning (FR-6); visitor→auth merge (FR-9); `@agentryx/converse-sdk` headless + React bindings, widget rebased onto it (FR-40b); admin console v1 (branding tokens + copy + embed page); i18n en/hi across widget; onboard **Verify** as tenant #2.
- **Exit criteria:** Verify live conversations in prod; offline→notify→return-and-read loop verified on both tenants; SDK published to the internal registry with a working example app; theme-contrast validation active; a11y keyboard/screen-reader pass on widget.

### Phase 2 — Real-time layer (5 pw)

*Goal: when both sides are online it feels instant; presence is trustworthy.*

- **Scope:** WS gateway + SSE + long-poll fallbacks with `after_seq` healing ([02 §6.5](02_Architecture.md)); typing (FR-8); delivery/read receipts (FR-7); staff presence with heartbeat inference (FR-16) wired to availability strip; live inbox (`inbox.changed`); transfer with handover notes (FR-14); internal notes (FR-17); supervisor v0: any-thread watch, whisper, reassign; concurrent-view indicators; TOTP 2FA for admin roles.
- **Exit criteria:** p95 delivery < 1 s both-connected; fallback chain proven by chaos test (kill WS mid-session, no message loss or dupes); presence accuracy verified (pull cable → away → offline at spec timings); 6 agents concurrent on staging with zero claim collisions in a 500-conversation soak.

### Phase 3 — AI Responder & RAG (7 pw)

*Goal: an admin can switch a queue to AI/Hybrid and it answers well, safely, with citations — and hands off cleanly.*

- **Scope:** KB pipeline: upload/FAQ/crawl → chunk → embed → pgvector, versioned docs, reindex jobs (FR-24); `LlmProvider` seam with Anthropic default — `claude-haiku-4-5` triage/screen/self-grade, `claude-sonnet-5` grounded answers, `claude-opus-4-8` per-queue opt-in (FR-30); `AIResponder` full pipeline ([02 §10.4](02_Architecture.md)): retrieval, grounded generation, citations (FR-25), confidence gate (FR-26), streaming to widget (`ai.thinking`/`ai.stream`); `RulesResponder` + `HybridResponder` (FR-22); guardrails + injection screening (FR-28); handoff: user affordance + intent + tool + gate (FR-27); AI labeling (FR-29); `ai_turn_log` audit (FR-61); token budgets + degrade; KB admin UI + retrieval-hit stats; agent KB-suggest panel + escalated-draft card; supervisor AI-review list.
- **Exit criteria:** on a pilot queue (HireStream-HP "General FAQ"): ≥ 40% AI resolution over a 2-week pilot with zero confirmed ungrounded policy answers in supervisor review; every AI answer carries ≥ 1 citation or is an explicit "I don't know + handing off"; sub-threshold answers never reach users (log-verified); red-team suite (30 injection/abuse prompts) fully refused-or-escalated; p95 first token < 3 s.

### Phase 4 — Multi-agent & routing at scale (6 pw)

*Goal: many humans and many bots, correctly routed, supervised, and automatable.*

- **Scope:** routing engine complete: rule evaluation (channel/URL/context/locale/intent), strategies (broadcast/round-robin/least-active), skills, caps, offline fallbacks (FR-31/33); queue management UI + rule tester; multiple bot identities + triage-bot flow (FR-35/38); supervisor dashboard full (queue depths, agent load, barge, live table — [03 §3](03_Design_and_UX.md)); SLA engine: targets, timers, breach flags + events (FR-58); outbound webhooks with signing + retries (FR-46); automation hooks (auto-tag, idle auto-close, out-of-hours templates, FR-47); infrastructure: Redis (BullMQ workers out-of-process, pub/sub event bus, shared presence) per [02 §13](02_Architecture.md).
- **Exit criteria:** routing simulation suite (100 synthetic conversations across rules/skills/strategies) routes 100% per spec; 10 concurrent agents + 2 bots on staging without collision or misroute; SLA breach fires inbox flag + webhook within 30 s; webhook delivery survives consumer downtime (retry-verified); zero-downtime deploy proven with Redis-backed presence.

### Phase 5 — Omnichannel & insight (8 pw)

*Goal: the same thread reaches users on WhatsApp and email; the operation is measurable; compliance tooling is push-button.*

- **Scope:** `WhatsAppTransport` (Meta Cloud API: number binding, inbound webhook, 24-h session window + template messages, capability degradation) — first omni target (FR-50); `EmailTransport` (reply-token threading, HTML rendering); `SMSTransport` best-effort; cross-channel continuation UX; CSAT prompt + reporting (FR-48); analytics: volumes/FRT/resolution/deflection/CSAT by queue/agent/date + CSV (FR-49); retention automation: purge/anonymize jobs, export/erase tooling with audit (FR-55); React Native component kit on the headless SDK (FR-60); push notification channel.
- **Exit criteria:** a HireStream-HP conversation started in-widget continues on WhatsApp with full console visibility; template-window rules honored (no policy violations in Meta review); monthly HPSEDC-format report exportable; retention job verified against a seeded aged dataset (PII gone, aggregates intact); RN kit demo app exchanging messages.

## 3. Milestone Timeline (ASCII Gantt)

Assumes start 2026-08-03 (post-HPSEDC wrap-up), 1 engineer Phases 0–2, 2 engineers Phases 3–5 (calendar compresses to ~5.5 months of elapsed time for 36 pw).

```
2026            Aug         Sep         Oct         Nov         Dec         Jan'27
                ├───────────┼───────────┼───────────┼───────────┼───────────┼──────
P0 Foundation   ██████████░
  M1 ▲ HireStream-HP live on Converse (seed-parity)        (end Sep w1)
P1 Async prod            ░██████████
  M2 ▲ Verify onboarded · SDK v1 · offline flow complete   (mid Oct)
P2 Real-time                        ██████████
  M3 ▲ Real-time GA: presence/typing/receipts/supervisor v0 (mid Nov)
P3 AI & RAG                              ███████████████        (2nd eng joins)
  M4 ▲ AI pilot live on 1 queue → pilot report              (mid Dec)
P4 Multi-agent                                     ████████████
  M5 ▲ Routing+SLA+webhooks GA · Redis split                (mid Jan)
P5 Omnichannel                                            ████████████████
  M6 ▲ WhatsApp + email + analytics + retention GA          (end Feb'27)
```

P3 overlaps P2's tail (KB pipeline has no realtime dependency); P5 overlaps P4's tail (transport work is independent of routing). Every milestone M-n is a customer-demoable release per the house weekly-feedback protocol.

## 4. Rough-Order Effort Summary

| Phase | Service | Widget/SDK | Console | QA/hardening | Total pw |
|---|---|---|---|---|---|
| 0 | 2.5 | 1.0 | 1.0 | 0.5 | 5 |
| 1 | 1.5 | 1.5 | 1.0 | 1.0 | 5 |
| 2 | 2.0 | 1.0 | 1.5 | 0.5 | 5 |
| 3 | 3.5 | 1.0 | 1.5 | 1.0 | 7 |
| 4 | 3.0 | 0.5 | 1.5 | 1.0 | 6 |
| 5 | 4.0 | 1.5 | 1.5 | 1.0 | 8 |
| **Σ** | 16.5 | 6.5 | 8.0 | 5.0 | **36** |

Sensitivity (what blows this up 50%): WhatsApp Business verification/review lead times (start the application in Phase 3, not Phase 5); AI answer-quality tuning if the KB content is thin (mitigate: KB authoring is a *tenant* obligation in the integration checklist, §8); a third simultaneous tenant onboarding during Phases 1–2.

## 5. Tech-Stack Recommendation

**Principle: maximize reuse of the proven Agentryx house stack; add new technology only where a phase demands it.** Alternatives were weighed; the decision column is final (each becomes an ADR at kickoff).

| Layer | Choice | Rationale / rejected alternatives |
|---|---|---|
| Service runtime | **Node 22 + TypeScript + Express** | House standard (HireStream); team velocity beats marginal Fastify perf; NestJS rejected as ceremony without payoff at this team size |
| ORM / DB | **drizzle-orm + PostgreSQL 16** | House standard; RLS + partial unique indexes + JSONB carry the whole design; no second datastore until Phase 4 |
| Vector search | **pgvector (HNSW)** | Keeps RAG inside Postgres — one backup/restore/isolation story; dedicated vector DBs (Pinecone/Qdrant) rejected: operational surface for < 1 M chunks/tenant is unjustified |
| Realtime | **`ws` library, in-process → split at Phase 4**; SSE + long-poll fallbacks | Socket.io rejected (protocol lock-in, heavier client); raw `ws` + our `after_seq` healing is smaller and matches the durable-first design |
| Queue/workers | **In-process outbox worker → BullMQ + Redis at Phase 4** | Don't operate Redis before its value ships (presence sharing + multi-process fan-out) |
| Widget | **Preact + iframe** | Bundle budget (≤ 60 KB loader+core) rules out full React; iframe = style isolation + CSP safety in third-party pages |
| Console | **React 18 + wouter + TanStack Query + Tailwind + shadcn/ui** | Identical to HireStream client — zero onboarding cost |
| SDK | **TypeScript, framework-free core + React bindings** (tsup dual ESM/CJS) | RN compatibility by construction; widget/console dogfood it |
| LLM | **Anthropic Claude** via `LlmProvider` seam — haiku-4-5 / sonnet-5 / opus-4-8 tiering ([02 §10.4](02_Architecture.md)) | Best grounded-answer + tool-use behavior for support workloads; seam keeps provider swappable (FR-30) |
| i18n | **i18next** (en/hi) | House standard |
| Files | **S3-compatible object storage** (MinIO on-VM initially) | Tenant-prefixed keys; swap to managed S3 without code change |
| Email/SMS | Tenant portal-notify webhook first; **Nodemailer + house SMS gateway** as built-ins | Reuses HireStream's `notify()` investment (FR-19) |
| Deploy | **PM2 on VM + nginx**, staging + prod; Docker image published from CI for future container hosting | Matches current Agentryx ops; containers are an option, not a migration |
| CI | GitHub Actions: typecheck, lint (incl. repository-boundary rule), jest, deep-smoke vs ephemeral Postgres, widget-size budget gate, axe a11y | Extends the house embedded-testing architecture |

## 6. Testing & Verification Strategy

Per the Agentryx embedded-testing standard (5-layer) and the deep-testing house rule ("jest alone has gaps"):

| Layer | What | When |
|---|---|---|
| 1. Unit (jest) | Services: seq assignment, claim atomicity, routing evaluation, confidence gating, token budgets; pure logic ≥ 80% coverage | Every commit |
| 2. Integration (jest + ephemeral Postgres) | Repository layer vs RLS (cross-tenant queries must return empty), outbox delivery, migration script on a `support_messages` fixture | Every commit |
| 3. Deep-smoke (`scripts/deep-smoke.mjs`) | Route health + **full authz matrix**: end-user / agent / supervisor / admin / API key / cross-tenant on every endpoint; runs against any env incl. prod-read-only | Every commit + pre-release + post-deploy |
| 4. E2E (Playwright) | Widget↔console round-trip: send → inbox → claim → reply → notify → widget read; offline flow; reconnect healing; claim-collision race; a11y (axe) on widget + console | Pre-release |
| 5. Scenario/soak & AI eval | Phase 2: 6-agent 500-conversation soak, WS chaos kill; Phase 3: **AI eval harness** — golden Q/A set per tenant KB scored for groundedness/citation/handoff correctness + 30-prompt red-team suite, run on every KB or prompt change; Phase 4: routing simulation (100 synthetic conversations) | Phase gates + on change |

House rules applied: every feature is smoke-tested with the **exact UI payload** then clicked in the UI before "done"; sibling endpoints sharing tables get smoke coverage on any change; each shipped feature seeds a Verify item in the same commit cadence; per-phase exit criteria (§2) are the release gates, checked against the closure checklist when the methodology scaffold is instantiated.

## 7. Risk Register

| # | Risk | L | I | Mitigation | Owner |
|---|---|---|---|---|---|
| R-1 | Seed-parity cutover disrupts live HPSEDC support | M | H | Read-only legacy routes for one release; row-count + spot-audit migration checks; rollback = repoint widget to legacy page | Eng |
| R-2 | Scope creep in P0/P1 (console "just one more feature") | H | M | Phase bar = exit criteria only; new asks → Phase-4 backlog rows | PM |
| R-3 | AI gives an ungrounded answer on a government portal | M | H | Retrieval-only grounding, confidence gate defaults conservative (0.75), citations mandatory, pilot on one low-stakes queue, supervisor review before widening | Eng+Product |
| R-4 | WhatsApp Business approval delays P5 | H | M | Start Meta verification during P3; email transport is the P5 fallback headline | PM |
| R-5 | WS at scale on single VM (fd limits, restarts dropping presence) | M | M | Fallback chain + `after_seq` healing designed in; Redis presence at P4; load test at P2 exit | Eng |
| R-6 | Cross-tenant leak bug | L | H | Structural isolation (3 layers incl. RLS); authz-matrix deep-smoke incl. cross-tenant on every commit | Eng |
| R-7 | Widget degrades host-portal performance/Lighthouse | M | M | 60 KB loader budget CI-gated; async loading; iframe isolation | Eng |
| R-8 | LLM cost overrun on AI-enabled tenants | M | M | Per-tenant daily token budgets + auto-degrade to Hybrid-rules; haiku-first tiering; cost metric per tenant ([02 §12](02_Architecture.md)) | Ops |
| R-9 | Thin tenant KBs → poor AI quality → trust damage | H | M | KB authoring is a tenant onboarding obligation (§8); retrieval-hit stats expose gaps; "I don't know + handoff" over guessing | Product |
| R-10 | Single-engineer bus factor Phases 0–2 | M | M | Methodology docs from day 1 (STATUS/ROADMAP per stream); 2nd engineer joins P3 with P0–P2 docs as onboarding | PM |

Re-score monthly per the house risk-decay protocol.

## 8. Reuse-in-Any-Portal Integration Checklist

The G-6 promise: a new portal goes live in one working day. The integrator runs this list top to bottom.

**Provisioning (Converse admin, ~30 min)**
- [ ] Create tenant: slug, name, default locale, anonymous on/off (D-2), retention months
- [ ] Generate + deliver embed key and (if server integration) API key
- [ ] Register allowed origins (CORS + iframe postMessage)
- [ ] Configure theme tokens + logo + launcher (contrast check passes)
- [ ] Set widget copy per locale: welcome, offline, ack, privacy notice
- [ ] Create queues (or accept default), assign staff, set roles/skills
- [ ] Set business hours + holidays; SLA targets
- [ ] Choose per-queue Responder mode (default: Human)

**Portal-side (host engineering, ~2–4 h)**
- [ ] Server endpoint minting the embed token (JWT, ≤ 10 min TTL, per [02 §9.2](02_Architecture.md)) — ~15 lines
- [ ] Paste the widget snippet with `data-tenant` + `data-token-endpoint` ([02 §14.1](02_Architecture.md))
- [ ] Pass context on load: `AgentryxConverse.setContext({ role, page, … })` (FR-43)
- [ ] Implement + register the `user.notify` webhook mapping to the portal's `notify()` service (FR-19) — or accept Converse built-in email
- [ ] (Optional) Configure hand-out cards to portal-native flows (FR-44)

**Verification (both, ~1 h)**
- [ ] Deep-smoke against the tenant: session mint, send, inbox, reply, notify
- [ ] Send as authenticated user → agent reply → notification received → thread read on second device
- [ ] Offline-hours test: truthful strip + ack + async reply loop
- [ ] Cross-tenant denial spot-check with another tenant's credentials
- [ ] a11y quick pass: keyboard open/compose/close, screen-reader announce
- [ ] Mobile-web sheet check on one Android + one iOS browser

**If enabling AI (Phase 3+, adds ~1 day of tenant content work)**
- [ ] Author/upload KB: FAQs + policy docs; verify chunks indexed
- [ ] Run the golden-question eval for this tenant; review answers + citations
- [ ] Set confidence threshold (start 0.8), escalation queue, guardrail topics, token budget
- [ ] Pilot on one queue for 2 weeks; supervisor reviews transcripts before widening

---

*End of Build Phasing & Plan v1.0 · 2026-07-06. Package index: [00_README.md](00_README.md).*
