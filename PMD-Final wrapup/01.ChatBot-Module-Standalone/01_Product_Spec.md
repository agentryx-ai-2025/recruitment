# Agentryx Converse — Product & Functional Specification

**Version:** v1.0 · **Date:** 2026-07-06 · **Owner:** Agentryx / Subhash · **Status:** Approved for Phase-0 build

> **What this document is.** The product-level specification for **Agentryx Converse**, the standalone, embeddable conversational-support module for all Agentryx portals. It defines the vision, personas, numbered functional requirements, user stories, capability matrix, SLAs, i18n, accessibility, and compliance posture. Technical realization is in [02_Architecture.md](02_Architecture.md); UX in [03_Design_and_UX.md](03_Design_and_UX.md); delivery plan in [04_Build_Phasing_and_Plan.md](04_Build_Phasing_and_Plan.md).

---

## 1. Vision

Every Agentryx portal — HireStream, Verify, and every future product — needs the same thing: a way for its users to **ask a question inside the product and get an answer**, whether that answer comes from a human staff member five minutes later, an AI assistant instantly, or a human tomorrow morning because nobody was online at 23:40.

Today each portal either builds this ad-hoc (HireStream-HP's "Ask HPSEDC" support thread) or doesn't have it at all. Agentryx Converse replaces ad-hoc builds with **one module, built once, embedded everywhere**:

- A **drop-in chat widget** any portal adds with one `<script>` tag (or an npm SDK for deeper integration).
- An **agent console** where human staff across one or many portals answer conversations from a unified inbox.
- A **pluggable Responder seam** so the entity answering can be a human, an AI grounded on a per-portal knowledge base, a hybrid (AI first, human on escalation), or a rules engine — switchable per portal and per queue without code changes.
- A **pluggable Transport seam** so the same conversation thread can flow through the in-portal widget today and WhatsApp, email, or SMS tomorrow.
- **One thread model for async and real-time.** A message answered in 4 seconds and a message answered in 14 hours live in the same conversation with the same guarantees. Offline is not an error state; it is the default state the system is designed around.

The strategic bet: conversational support is a **horizontal capability**, not a portal feature. Building it as a standalone multi-tenant service converts every future portal's "we need a chat/help feature" from a 6-week build into a 1-day integration.

### 1.1 Naming

The module is named **Agentryx Converse** ("Converse" in short form throughout these docs). The service identifier is `converse`; the widget global is `AgentryxConverse`; the npm package is `@agentryx/converse-sdk`.

---

## 2. Goals & Non-Goals

### 2.1 Goals

| # | Goal | Success signal |
|---|---|---|
| G-1 | Portal-agnostic: zero portal-specific logic in the core service | HireStream and Verify both embed the same deployed service with config-only differences |
| G-2 | Human-manned support with a professional agent console | HPSEDC staff answer candidate queries from the Converse console, not from ad-hoc admin pages |
| G-3 | Async-first: no message is ever lost because nobody was online | 100% of messages sent while agents are offline are answered later with the user notified |
| G-4 | Optional AI answering, grounded on a per-portal KB, with safe human handoff | AI resolves ≥40% of conversations on an enabled portal without human touch, with zero ungrounded policy answers |
| G-5 | Many humans + many bots concurrently, with routing, queues, and supervision | 10+ concurrent agents across 2+ portals with no assignment collisions |
| G-6 | Embeddable in under a day | A new portal reaches "first live conversation" within one working day using the integration checklist ([04 §8](04_Build_Phasing_and_Plan.md)) |
| G-7 | Government-grade compliance posture (HPSEDC context) | PII inventory, retention, consent, and audit trail documented and implemented (§10) |

### 2.2 Non-Goals (v1 line)

| # | Non-goal | Why |
|---|---|---|
| NG-1 | A general-purpose team-chat product (Slack/Teams clone) | Converse is user↔organization support, not staff↔staff messaging |
| NG-2 | Voice / video calling | Different infrastructure class; revisit post-Phase-5 if demanded |
| NG-3 | A public SaaS offering with self-serve signup | Converse is an internal Agentryx platform module; tenants are provisioned by Agentryx |
| NG-4 | Replacing formal case/ticket systems (e.g. HireStream's Grievance module) | Grievances are formal, SLA-bound, legally significant records. Converse can *link out* to them (FR-44) but does not replace them |
| NG-5 | Training or fine-tuning custom LLMs | The AI Responder uses hosted Claude models with RAG; no model training pipeline |
| NG-6 | Social-media channel coverage (Instagram/Facebook DMs) in the committed roadmap | Architecture permits it via the Transport seam; not scheduled |

---

## 3. Personas

Five personas. Each maps to a distinct surface and permission tier (see [02_Architecture.md §11 Security](02_Architecture.md)).

### P1 — End User ("Visitor")
The person seeking help: a HireStream candidate asking about a recruitment drive, a Verify user asking why a test run failed, or an anonymous visitor on a public page. May be **authenticated** (identity asserted by the host portal via a signed embed token) or **anonymous** (identified by a device-scoped visitor ID). Expects: instant acknowledgement, honest expectation-setting when nobody is online, notification when answered, and a thread that survives page reloads and device changes (when authenticated).

### P2 — Human Agent ("Agent")
Staff who answer conversations — e.g. an HPSEDC operator. Works the **Agent Console**: a unified inbox filtered to their queues, real-time threads, canned responses, KB-suggested answers, transfer, and presence control. Success metric: time-to-first-response and resolution volume without tab-juggling across portals.

### P3 — Supervisor
A senior agent/team lead. Everything P2 has, plus: sees all queues and all agents' conversations, monitors live queue depth and agent presence, reassigns and force-transfers, reviews AI-answered transcripts, manages canned-response libraries, and views performance reports. Accountable for SLA adherence.

### P4 — Admin / Integrator
Two sub-roles sharing a surface. The **portal admin** configures a tenant: branding/theming, business hours, queues and routing rules, AI on/off and thresholds, KB content, retention policy, agent accounts. The **integrator** (an Agentryx engineer) embeds the widget/SDK into a portal, wires SSO token minting, and configures webhooks. Success metric: G-6 — one-day integration.

### P5 — AI Responder ("Bot")
A first-class *participant*, not a bolt-on. An AI Responder is a configured entity with a name, avatar, model binding (default: Anthropic Claude), a KB scope, a confidence threshold, guardrails, and an escalation policy. Multiple bots can exist per tenant (e.g. a triage bot + per-topic specialist bots, FR-38). The design constraint this persona imposes: **everything an agent can do through the console, a bot must be able to do through the Responder API** — read the thread, reply, mark handled, transfer, escalate.

---

## 4. Functional Requirements

Requirements are numbered FR-1… and grouped. **Priority:** P0 = Phase 0–1 (must ship first), P1 = Phases 2–3, P2 = Phases 4–5 (committed roadmap), P3 = future/architecture-must-not-preclude. Phase mapping detail is in [04_Build_Phasing_and_Plan.md §2](04_Build_Phasing_and_Plan.md).

### 4.1 Core conversation model

| ID | Requirement | Priority |
|---|---|---|
| FR-1 | The system SHALL model all interactions as **Conversations** containing ordered **Messages** from **Participants** (end user, human agent, bot, system). One thread model serves both async and real-time exchange. | P0 |
| FR-2 | An end user SHALL be able to start a conversation and send text messages (≤ 4,000 chars) from the embedded widget. | P0 |
| FR-3 | Every inbound user message SHALL be durably persisted before any acknowledgement is returned; no message is lost due to agent absence, widget closure, or transient disconnect. | P0 |
| FR-4 | A conversation SHALL have a lifecycle: `open → pending (awaiting user) → resolved → closed`, with reopen on new user message within a configurable window (default 72 h; after that a new conversation is opened with a link to the prior one). | P0 |
| FR-5 | Messages SHALL support types beyond plain text: quick-reply option sets, structured cards (title/body/actions/link), file attachments (FR-6), and system notices (e.g. "Transferred to Priya"). | P1 |
| FR-6 | Attachments: users and agents SHALL be able to exchange files (images, PDF; configurable allowlist; default max 10 MB), virus-scanned before delivery, stored per-tenant. | P1 |
| FR-7 | Read state SHALL be tracked per participant (delivered / read), surfaced as read receipts in widget and console. | P1 |
| FR-8 | Typing indicators SHALL be exchanged in real time between user and the assigned responder when both are connected. | P1 |
| FR-9 | An authenticated user's conversation history SHALL persist across sessions and devices; an anonymous visitor's history persists per device (localStorage visitor ID) and SHALL be mergeable into an authenticated identity on login. | P0 (persist) / P1 (merge) |
| FR-10 | Users SHALL be able to view their past (closed) conversations from the widget. | P1 |

### 4.2 Human-manned answering (Agent Console)

| ID | Requirement | Priority |
|---|---|---|
| FR-11 | Agents SHALL work from a unified **Inbox** listing conversations with: last message preview, unread count, wait time, channel, queue, assignee, and status — filterable by queue, status, and assignee. | P0 |
| FR-12 | Agents SHALL open any permitted thread and reply; replies deliver in real time if the user is connected, otherwise queue for notification (FR-19). | P0 |
| FR-13 | Conversations SHALL be assignable to a specific agent. Assignment modes: manual claim ("Pick up"), supervisor assignment, and automatic routing (FR-31). An assigned conversation is locked against double-reply collisions with a visible "X is viewing/typing" indicator. | P0 (manual) / P2 (auto) |
| FR-14 | Agents SHALL be able to **transfer** a conversation to another agent or queue, with an optional handover note; the transfer is recorded as a system message. | P1 |
| FR-15 | Agents SHALL have **canned responses** (personal + shared team library) insertable via shortcut (`/` picker), with variable substitution (user name, portal name). | P1 |
| FR-16 | Agent **presence** SHALL be first-class: `online / away / offline`, set explicitly and inferred on disconnect (heartbeat timeout → away → offline). Presence drives routing (FR-31) and widget expectation-setting (FR-18). | P1 |
| FR-17 | Agents SHALL be able to add **private internal notes** to a conversation, visible to staff only, never to the end user, clearly visually distinct. | P1 |

### 4.3 Offline persistence & async continuity

| ID | Requirement | Priority |
|---|---|---|
| FR-18 | When no eligible responder is online (per queue presence + business hours, FR-45), the widget SHALL set expectations immediately: an automatic acknowledgement message stating that the team is offline and when a reply can be expected, and (for anonymous users) SHALL offer to capture an email/phone for the reply notification. | P0 |
| FR-19 | When a staff/bot reply lands while the user is not connected, the system SHALL notify the user via the tenant's configured channels: in-portal notification (via host-portal `notify()` webhook), email, SMS, and/or push — with a deep link back to the conversation. | P0 (in-portal + email) / P2 (SMS, push) |
| FR-20 | The agent inbox SHALL make backlog visible and workable: conversations awaiting first response sort by wait time, with visual SLA-breach indicators (FR-58). | P0 |
| FR-21 | The user's widget SHALL sync missed messages on reconnect/reopen — full thread state recovery from the server, never from client cache alone. | P0 |

### 4.4 AI Responder & Knowledge Base (the Responder seam)

| ID | Requirement | Priority |
|---|---|---|
| FR-22 | The answering entity SHALL be abstracted behind a **Responder interface** with at least four implementations: `HumanResponder` (route to inbox only), `AIResponder`, `HybridResponder` (AI first, human fallback), `RulesResponder` (keyword/menu flows). Responder choice is per-tenant **and** per-queue configuration, changeable at runtime without deployment. | P0 (seam) / P1–P2 (impls) |
| FR-23 | The AI Responder SHALL answer using **retrieval-augmented generation** over the tenant's Knowledge Base only. It SHALL NOT answer tenant-policy questions from model world-knowledge alone. | P2 |
| FR-24 | Admins SHALL manage the KB: upload documents (Markdown, PDF, DOCX, HTML), add FAQ pairs, crawl allowed portal URLs; content is chunked, embedded, and versioned; stale sources flaggable. KBs are strictly per-tenant (no cross-tenant retrieval). | P2 |
| FR-25 | AI answers SHALL carry **citations** to the KB sources used, renderable in the widget as expandable references. | P2 |
| FR-26 | The AI Responder SHALL compute a **confidence signal** per draft answer; below the configured threshold it SHALL NOT send the answer, and SHALL instead escalate to a human queue with the draft attached as an internal note for the agent. | P2 |
| FR-27 | The user SHALL always be able to summon a human ("Talk to a human" affordance, plus intent detection on phrases like "human/agent/person"); AI-to-human handoff transfers the full transcript and is announced to the user. | P2 |
| FR-28 | Guardrails: the AI Responder SHALL refuse and escalate on out-of-scope topics, legal/medical/financial advice, abusive content, and prompt-injection attempts; every AI turn is logged with retrieval set, prompt hash, model ID, latency, token counts, and confidence for audit (FR-61). | P2 |
| FR-29 | AI responses SHALL be visibly labeled as automated ("Aria · AI assistant") — no impersonation of humans. Required for trust and for EU-AI-Act-style transparency norms. | P2 |
| FR-30 | The LLM provider binding SHALL be swappable behind a provider interface. Default binding: Anthropic Claude — `claude-haiku-4-5` for triage/classification, `claude-sonnet-5` for standard grounded answering, `claude-opus-4-8` reserved for complex-reasoning queues. Model choice is per-tenant config. | P2 |

### 4.5 Routing, queues & multi-agent (human and bot)

| ID | Requirement | Priority |
|---|---|---|
| FR-31 | A **routing engine** SHALL assign inbound conversations to queues by rule (page URL/context, user attributes, language, channel, keyword/intent), and to agents within a queue by strategy: `broadcast` (anyone claims), `round-robin`, `least-active`, with per-agent concurrent-conversation caps. | P2 |
| FR-32 | **Queues** SHALL be first-class: named, per-tenant, with member agents, an optional bound Responder config, business-hours calendar, and SLA targets. | P1 (basic) / P2 (full) |
| FR-33 | Agents SHALL have **skills** (tags: language `hi`, topic `payments`, portal `hirestream`); routing rules MAY require skills; skill-based routing falls back to queue default when no skilled agent is online. | P2 |
| FR-34 | Multiple human agents SHALL work concurrently without collision: assignment locks, live inbox updates, and concurrent-view indicators (see FR-13). | P0 (locks) / P1 (live) |
| FR-35 | Multiple **AI agents/bots** SHALL be configurable per tenant — e.g. a triage bot that classifies and routes, plus specialist bots per queue. Bots are Participants with their own identity and are routed to exactly like human agents. | P2 |
| FR-36 | Supervisors SHALL have an oversight surface: live queue depths, agent presence/load, any-conversation view ("whisper" internal notes, barge-in reply, force-reassign), and AI-transcript review with a feedback flag that feeds KB improvement. | P2 |
| FR-37 | Every assignment, transfer, escalation, and resolution SHALL be recorded as auditable events on the conversation timeline. | P0 |
| FR-38 | A **triage flow** SHALL be supported: bot collects topic (quick replies) → routes to queue → human or specialist bot answers. Composable from FR-22 + FR-31; no bespoke code per tenant. | P2 |

### 4.6 Multi-tenancy & embedding

| ID | Requirement | Priority |
|---|---|---|
| FR-39 | One Converse deployment SHALL serve multiple **tenants** (portal/brand = tenant). All data — conversations, KB, config, files, analytics — is isolated per tenant; cross-tenant access is impossible at the query layer, not merely filtered in application code (see [02 §9 Tenancy](02_Architecture.md)). | P0 |
| FR-40 | Embedding SHALL work three ways: (a) drop-in `<script>` widget with `data-` attributes; (b) npm SDK (`@agentryx/converse-sdk`) exposing headless client + React components; (c) raw REST/WS API for fully custom UIs (incl. mobile apps). | P0 (a) / P1 (b) / P0 (c, since a & b are built on it) |
| FR-41 | The host portal SHALL be able to assert the end user's identity via a short-lived signed **embed token** (HMAC/JWT minted server-side by the portal); unauthenticated embeds fall back to anonymous visitor identity. | P0 |
| FR-42 | Theming SHALL be per-tenant: colors, logo, launcher icon/position, widget copy (welcome text, offline text), fonts — via design tokens, no code fork (see [03 §7](03_Design_and_UX.md)). | P0 (basic) / P1 (full white-label) |
| FR-43 | The host portal SHALL be able to pass **context** with a conversation (current page/route, user plan, arbitrary key-values) shown to agents as a context panel and usable in routing rules. | P1 |
| FR-44 | Converse SHALL support configurable **hand-out links** to portal-native formal processes (e.g. "File a formal grievance") rendered as cards — integration by config, not code (see NG-4). | P1 |

### 4.7 Business rules & operations

| ID | Requirement | Priority |
|---|---|---|
| FR-45 | Per-tenant/per-queue **business hours** calendars (with holidays, timezone-aware) SHALL drive online/offline expectation-setting and routing. | P1 |
| FR-46 | **Webhooks**: tenants SHALL be able to subscribe server-to-server to events (`conversation.created`, `message.created`, `conversation.resolved`, `handoff.requested`, …) with HMAC-signed payloads and retry-with-backoff. | P2 |
| FR-47 | **Automation hooks**: rule-based actions (auto-tag, auto-close idle conversations after N days with notice, auto-responder templates outside business hours). | P2 |
| FR-48 | **CSAT**: on resolution, the user MAY be asked a 1–5 rating + optional comment, per-tenant toggleable; results feed reporting. | P2 |
| FR-49 | **Analytics & reporting**: volumes, first-response time, resolution time, AI deflection rate, CSAT, per-agent and per-queue, with date-range filters and CSV export. | P2 |
| FR-50 | **Omnichannel transports**: WhatsApp (Business Cloud API), email (inbound parse + outbound), SMS — each mapping into the same Conversation model via the Transport seam; a conversation MAY span channels (start in widget, continue on WhatsApp). | P3 (committed direction; WhatsApp first) |
| FR-51 | Rate limiting and abuse controls: per-visitor message rate limits, spam heuristics, agent-side block, profanity/link filters (configurable). | P0 (rate limits) / P2 (rest) |

### 4.8 Cross-cutting (quality attributes as requirements)

| ID | Requirement | Priority |
|---|---|---|
| FR-52 | i18n: all widget and console strings externalized (i18next); **en + hi shipped at v1**; per-tenant default language; user language auto-detected from host portal or browser and overridable. RTL-safe layout. | P0 (en/hi widget) / P1 (console hi) |
| FR-53 | Accessibility: widget and console SHALL meet **WCAG 2.1 AA** (keyboard-complete, screen-reader announced messages, contrast tokens, reduced-motion) — mandatory for the government (GIGW-adjacent) context. Details in [03 §9](03_Design_and_UX.md). | P0 |
| FR-54 | The widget SHALL degrade gracefully: if WebSocket is unavailable, fall back to SSE, then long-polling; if the Converse service is down, the widget hides or shows a configurable static fallback — it must never break the host portal. | P0 |
| FR-55 | Data retention: per-tenant retention policy (default 24 months) with automated purge/anonymization jobs; user data-export and delete-on-request flows (see §10). | P1 |
| FR-56 | Consent: anonymous visitors see a first-message privacy notice with link to the tenant's policy; contact-capture (FR-18) is opt-in with explicit purpose statement. | P0 |
| FR-57 | Audit: immutable audit log of staff actions (view thread, export, delete, config change) and all AI turns (FR-28). | P1 |
| FR-58 | SLA instrumentation: per-queue first-response and resolution targets; breach flags in inbox and supervisor view; breach events available to webhooks. | P2 |
| FR-59 | Observability: structured logs, metrics (message throughput, WS connections, responder latency, notification delivery), health endpoints, error alerting (see [02 §12](02_Architecture.md)). | P0 |
| FR-60 | Mobile: the widget SHALL be fully usable on mobile web (full-screen sheet mode); the REST/WS API SHALL support native mobile apps (React Native) as first-class clients. | P0 (mobile web) / P2 (RN kit) |
| FR-61 | Every AI interaction SHALL be reconstructable for audit: input, retrieval set, output, model, version, confidence — retained per the tenant's retention policy. | P2 |

---

## 5. User Stories (selected, per persona)

**End user**
- US-1 (FR-2, FR-3): *As a candidate on HireStream, I click the chat launcher, type "When is the Shimla drive?", and see my message delivered — even at midnight.*
- US-2 (FR-18, FR-19): *As a user messaging out of hours, I'm told "Our team is offline — we usually reply by 10:00 IST" and I get an email with a link when the answer arrives.*
- US-3 (FR-25, FR-27): *As a user, when the AI answers, I can see which help articles it used, and I can tap "Talk to a human" at any point.*
- US-4 (FR-9): *As a user who started chatting on my laptop, I see the same thread on my phone after logging in.*

**Human agent**
- US-5 (FR-11, FR-20): *As an HPSEDC operator starting my shift, I open the inbox and see overnight messages sorted by longest-waiting, each with the user's context.*
- US-6 (FR-13, FR-34): *As one of six agents online, I click "Pick up" and the conversation is mine — colleagues see it's taken instantly.*
- US-7 (FR-15, FR-36-adjacent): *As an agent, I type `/kyb` and my canned KYB-documents answer is inserted with the candidate's name filled in.*
- US-8 (FR-26): *As an agent, I receive an AI-escalated conversation with the AI's draft answer attached as a note — I edit and send in 20 seconds instead of writing from scratch.*

**Supervisor**
- US-9 (FR-36): *As a supervisor, I see queue "Candidate Support" has 14 waiting and only 2 agents online; I pull two agents from "Employer Support" with drag-reassignment.*
- US-10 (FR-49): *As a supervisor, I export last month's first-response times per agent for the HPSEDC monthly review.*

**Admin / Integrator**
- US-11 (FR-40, FR-41, G-6): *As an Agentryx engineer launching a new portal, I paste the widget snippet, add a 15-line token-mint endpoint, set the brand colors in the admin console — live the same day.*
- US-12 (FR-22): *As an admin, I flip queue "General FAQ" from Human to Hybrid with a 0.75 confidence threshold — no deployment, effective immediately.*
- US-13 (FR-24): *As an admin, I upload the revised drive-eligibility PDF; the old version is superseded in retrieval within minutes.*

**AI Responder**
- US-14 (FR-23, FR-26, FR-27): *As the configured bot, I receive a new user message, retrieve top-k KB chunks, draft a cited answer at confidence 0.62 — below the 0.75 threshold — so I post an expectation-setting note to the user and escalate to the human queue with my draft attached.*
- US-15 (FR-35, FR-38): *As the triage bot, I present topic quick-replies, classify "payment not received" to the Payments queue, and hand over to the payments specialist bot.*

---

## 6. Capability Matrix — Present vs Future

| Capability | Phase 0 (seed-parity, standalone) | Phase 1 (async human) | Phase 2 (real-time) | Phase 3 (AI/RAG) | Phase 4–5 (multi-agent, omni) |
|---|:---:|:---:|:---:|:---:|:---:|
| Persistent conversation threads (FR-1..4) | ● | ● | ● | ● | ● |
| Drop-in widget embed (FR-40a) | ● | ● | ● | ● | ● |
| Agent inbox + reply + notify (FR-11,12,19) | ● | ● | ● | ● | ● |
| Multi-tenant isolation (FR-39) | ● | ● | ● | ● | ● |
| Offline ack + expectation-setting (FR-18) | ◐ static | ● | ● | ● | ● |
| Attachments, cards, quick replies (FR-5,6) | — | ◐ attach | ● | ● | ● |
| WebSocket real-time, typing, read receipts (FR-7,8) | — | — | ● | ● | ● |
| Presence, business hours (FR-16,45) | — | ◐ | ● | ● | ● |
| Canned responses, transfer, notes (FR-14,15,17) | — | ◐ | ● | ● | ● |
| Responder seam in code (FR-22) | ● seam | ● | ● | ● | ● |
| AI Responder + KB/RAG + citations + handoff (FR-23..30) | — | — | — | ● | ● |
| Routing engine, skills, queues (FR-31..33) | — | ◐ 1 queue | ◐ | ◐ | ● |
| Multiple bots, triage flows (FR-35,38) | — | — | — | ◐ | ● |
| Supervisor console (FR-36) | — | — | ◐ | ◐ | ● |
| Webhooks, automation (FR-46,47) | — | — | — | ◐ | ● |
| CSAT + analytics (FR-48,49) | — | — | — | — | ● |
| WhatsApp / email / SMS transports (FR-50) | — | — | — | — | ● WhatsApp first |
| npm SDK / React kit (FR-40b) | — | ● | ● | ● | ● |

Legend: ● full · ◐ partial · — not yet. Authoritative phase scope lives in [04_Build_Phasing_and_Plan.md](04_Build_Phasing_and_Plan.md).

---

## 7. Service-Level Targets

These are **product** targets; the engineering budgets that meet them are in [02 §13 Scalability](02_Architecture.md).

| Metric | Target | Notes |
|---|---|---|
| Message persist acknowledgement | p95 < 500 ms | From widget send to durable-write ack |
| Real-time delivery (both connected) | p95 < 1 s end-to-end | Phase 2+ |
| AI first response (grounded) | p95 < 8 s, with progressive "thinking" indicator | Phase 3+; streaming tokens begin < 3 s |
| Offline reply notification dispatch | < 60 s after agent reply | Email/in-portal; SMS best-effort per gateway |
| Human first-response (business hours) | Per-tenant SLA config; default target 4 business hours | Instrumented per FR-58 |
| Service availability | 99.5% monthly (single-region, PM2/VM class) | Widget degrades gracefully per FR-54 |
| Widget footprint | ≤ 60 KB gzipped loader + lazy main bundle | Must not degrade host-portal Lighthouse scores |

---

## 8. Internationalization

- **Shipped locales:** English (`en`) and Hindi (`hi`) at v1 — matching the HireStream-HP house standard (i18next). Locale files are part of the widget bundle (lazy per-locale chunks) and the console.
- **Per-tenant default + per-user override** (FR-52). The embed token or `data-locale` attribute sets the initial locale.
- **Content vs chrome:** Converse translates its own chrome (buttons, states, notices). Message *content* is whatever participants write; the AI Responder answers in the user's language when the KB supports it (KB entries may be tagged per-language; retrieval prefers language-matched chunks, falls back to `en` with the model translating — flagged in the citation).
- Dates/times localized with the tenant timezone; Devanagari-safe typography tokens in [03 §7](03_Design_and_UX.md).

---

## 9. Accessibility

WCAG 2.1 AA is a P0 requirement (FR-53), not a hardening task — the government-adjacent client context (GIGW alignment) makes this contractual-grade. Summary of commitments (full treatment in [03 §9](03_Design_and_UX.md)):

- Launcher and widget fully keyboard operable; focus trapped in the open window, restored on close; `Esc` closes.
- New messages announced via `aria-live=polite` region; unread counts announced.
- All color pairs meet 4.5:1 (3:1 large text); theming tokens are contrast-validated at config time — an admin cannot save an inaccessible theme without an explicit override warning.
- Reduced-motion honored (no bouncing launcher, no animated typing dots for `prefers-reduced-motion`).
- Agent console: full keyboard workflow (j/k thread navigation, `r` reply focus, `/` canned picker) and screen-reader labeled controls.

---

## 10. Compliance, Privacy & Data Protection

### 10.1 PII inventory (Converse-held data)

| Data | Where | Why | Retention |
|---|---|---|---|
| User display name, email/phone (if captured) | `participant`, `contact_capture` | Identify + notify | Tenant retention policy (default 24 mo), then anonymized |
| Conversation transcripts | `message` | Service delivery, audit | Same |
| Attachments | Per-tenant object storage | Service delivery | Same; virus-scanned at ingest |
| Visitor ID (anonymous) | localStorage + `participant` | Thread continuity | Purged with transcripts |
| IP address, user agent | Access/audit logs | Abuse prevention, security | 90 days |
| AI turn logs (prompt, retrieval set, output) | `ai_turn_log` | FR-61 audit | Tenant retention policy |
| Agent identity + action audit | `audit_log` | FR-57 | 7 years (government audit norm), config-hardened |

### 10.2 Controls

- **Consent (FR-56):** first-contact privacy notice; explicit opt-in for contact capture with stated purpose ("only to notify you of the reply").
- **Retention (FR-55):** per-tenant policy; nightly purge job anonymizes expired conversations (PII columns nulled, transcript optionally redacted vs deleted per tenant setting); deletions cascade to KB-unrelated attachments and AI turn logs.
- **Data-subject rights:** admin-triggered export (JSON bundle of a user's conversations) and delete; both audit-logged. Aligns with GDPR/DPDP-Act expectations.
- **AI-specific:** no tenant conversation or KB data is used to train models; LLM calls go to the configured provider (default Anthropic API) with data-retention posture documented per tenant; AI labeling per FR-29; full turn audit per FR-61.
- **Isolation:** tenant isolation is structural (FR-39, [02 §9](02_Architecture.md)) — the primary control against cross-portal data leakage.
- **Security controls** (authn/z, rate limiting, encryption in transit/at rest, secret handling): [02 §11](02_Architecture.md).

### 10.3 Auditability

Every staff read/write on user data and every config change is an `audit_log` row (who, what, when, tenant, object). AI turns are separately logged (FR-61). Both are exportable for HPSEDC-style audits. Gaps, if any arise during build, are tracked honestly per the Agentryx methodology's security-doc protocol (never silently emptied).

---

## 11. Open Product Decisions

| # | Decision | Options | Leaning | Owner | Needed by |
|---|---|---|---|---|---|
| D-1 | Bot display identity default | Generic "Assistant" vs named persona per tenant | Named per tenant (e.g. "Aria"), configured at tenant setup | Product | Phase 3 |
| D-2 | Anonymous chat allowed by default? | On / Off per tenant | Off for HPSEDC portals (authenticated only), On capable for public marketing pages | Product | Phase 1 |
| D-3 | Grievance-module linkage depth for HireStream | Card link-out only vs API-create grievance from chat | Card link-out (NG-4); revisit after Phase 4 | Product + HPSEDC | Phase 2 |
| D-4 | CSAT scale | 1–5 stars vs thumbs | 1–5 (HPSEDC reporting compatibility) | Product | Phase 5 |

---

*End of Product Specification v1.0 · 2026-07-06. Next: [02_Architecture.md](02_Architecture.md).*
