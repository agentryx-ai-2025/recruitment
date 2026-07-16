# Agentryx Converse — Technical Architecture

**Version:** v1.0 · **Date:** 2026-07-06 · **Owner:** Agentryx / Subhash · **Status:** Approved for Phase-0 build

> **What this document is.** The engineering architecture for Agentryx Converse: system context, components, domain model, the two pluggable seams (Responder, Transport), data model, API surface, event model, tenancy, presence/offline mechanics, routing engine, AI/RAG boundary, security, observability, scalability, and the embed/SDK story — plus the migration path from the HireStream-HP seed. Functional requirements referenced as FR-n are defined in [01_Product_Spec.md §4](01_Product_Spec.md).

---

## 1. Architectural Principles

1. **Standalone service, stable contract.** Converse is its own deployable (own repo, own database, own release cadence). Portals integrate through three public surfaces only: widget embed, npm SDK, REST/WS API. No portal imports Converse tables; Converse imports nothing from any portal.
2. **One thread model.** Async and real-time are the same `conversation`/`message` rows; real-time is a *delivery optimization*, never a separate data path. This is the single most important lesson generalized from the HireStream-HP seed (§15).
3. **Two seams, everything else concrete.** Pluggability is expensive; we buy it exactly where the future demands it — **who answers** (Responder) and **where the message travels** (Transport) — and keep the rest boringly concrete (Express, Postgres, drizzle).
4. **Durable-write-first.** Every inbound message hits Postgres before any ack, fan-out, or responder invocation (FR-3). All delivery mechanisms are retryable consumers of the durable record.
5. **Tenant isolation is structural.** Every table carries `tenant_id`; every query path goes through a tenant-scoped repository layer; Postgres RLS is the backstop (§9).
6. **House-stack aligned.** Same stack family as HireStream (React, TanStack Query, Tailwind, Express, drizzle-orm/Postgres, i18next, PM2) so any Agentryx engineer is productive on day one. Rationale and alternatives in [04 §5](04_Build_Phasing_and_Plan.md).

---

## 2. System Context

```
                                   ┌──────────────────────────────────────────────┐
                                   │            AGENTRYX CONVERSE SERVICE          │
 HOST PORTALS (tenants)            │                                              │
┌───────────────┐  embed token     │  ┌────────────┐   ┌───────────────────────┐  │
│  HireStream   │─────mint────┐    │  │  REST API  │   │  Realtime Gateway     │  │
│  ┌─────────┐  │             │    │  │ (Express)  │   │  (WS / SSE / poll)    │  │
│  │ Widget◄─┼──┼── <script> ─┼───►│  └─────┬──────┘   └──────────┬────────────┘  │
│  └─────────┘  │             │    │        │   Conversation Core │               │
├───────────────┤             │    │  ┌─────▼─────────────────────▼───────────┐   │
│    Verify     │   webhooks  │    │  │ Services: conversations · messages ·  │   │
│  ┌─────────┐  │◄────────────┼────│  │ participants · presence · routing ·   │   │
│  │ Widget  │  │             │    │  │ notifications · audit                 │   │
│  └─────────┘  │             │    │  └─────┬─────────────┬────────────┬──────┘   │
├───────────────┤             │    │        │             │            │          │
│ Future portal │             │    │  ┌─────▼─────┐ ┌─────▼──────┐ ┌───▼───────┐  │
│  / mobile app │── REST/WS ──┼───►│  │ RESPONDER │ │ TRANSPORT  │ │ Postgres  │  │
└───────────────┘             │    │  │   seam    │ │   seam     │ │ (+pgvector│  │
                              │    │  ├───────────┤ ├────────────┤ │  +object  │  │
 STAFF                        │    │  │ Human     │ │ Widget(WS) │ │  storage) │  │
┌───────────────┐             │    │  │ AI (RAG)  │ │ WhatsApp   │ └───────────┘  │
│ Agent Console │─────────────┘    │  │ Hybrid    │ │ Email      │                │
│ Supervisor    │──── REST/WS ────►│  │ Rules     │ │ SMS        │                │
│ Admin Console │                  │  └─────┬─────┘ └─────┬──────┘                │
└───────────────┘                  └────────┼─────────────┼───────────────────────┘
                                            │             │
                                   ┌────────▼───┐  ┌──────▼──────────────────┐
                                   │ Anthropic  │  │ Meta WA Cloud API · SMTP │
                                   │ Claude API │  │ · SMS gateway · FCM/push │
                                   └────────────┘  └─────────────────────────┘
```

Boundary rules: host portals never talk to Postgres; Converse never calls portal internals except through **outbound webhooks** and the portal-registered **notify endpoint** (FR-19). The Agent/Supervisor/Admin consoles are Converse-served web apps (one SPA, role-gated), not portal pages.

---

## 3. Component Breakdown

| # | Component | Responsibility | Phase |
|---|---|---|---|
| C-1 | **API server** (Express + drizzle) | REST endpoints, authn/z, validation, rate limiting, tenant scoping | 0 |
| C-2 | **Realtime gateway** (`ws` on same process initially) | WS connections, SSE fallback, presence heartbeats, event fan-out | 2 |
| C-3 | **Conversation core** (services layer) | Conversation/message lifecycle, read state, assignment locks, audit | 0 |
| C-4 | **Responder dispatcher** + implementations | Invokes the configured Responder per queue on inbound messages (§7) | 0 (seam) / 3 (AI) |
| C-5 | **Transport layer** + adapters | Normalizes channel I/O into the core model (§8) | 0 (widget) / 5 (omni) |
| C-6 | **Routing engine** | Queue selection rules, agent selection strategies, skills, caps (§10.3) | 1 (single queue) / 4 |
| C-7 | **Notification service** | Outbound user notifications: portal-notify webhook, email, SMS, push; retry queue | 0 (email+portal) |
| C-8 | **KB & RAG pipeline** | Ingestion (chunk/embed), retrieval, grounded generation, guardrails, turn logging (§10.4) | 3 |
| C-9 | **Worker runtime** (in-process queue → BullMQ when Redis arrives) | Notifications, webhooks, ingestion, retention purge, SLA timers | 0 (minimal) |
| C-10 | **Widget** (Preact, bundled standalone) | End-user chat UI; loader + lazy bundle | 0 |
| C-11 | **Console SPA** (React + TanStack Query + Tailwind) | Agent inbox/threads, supervisor, admin config, KB manager | 0 (inbox) → 4 |
| C-12 | **SDK** (`@agentryx/converse-sdk`) | Headless TS client (REST+WS) + React bindings; widget is built on it | 1 |
| C-13 | **Admin/Config store** | Tenant, queue, responder, theming, business hours, retention config | 0 → grows |

Deployment shape: Phase 0–2 is a **single Node process** (API + WS + in-process workers) under PM2 + Postgres — matching Agentryx ops reality. The component boundaries above are module boundaries in one codebase, so Phase 4+ can split C-2 and C-9 into separate processes without redesign (§13).

---

## 4. Domain Model

```
 Tenant 1──* Queue 1──* QueueMember *──1 StaffUser(agent)
   │            │
   │            └──1 ResponderConfig ──* BotIdentity (AI participants)
   │
   ├──* Conversation 1──* Message 1──* Attachment
   │        │   │              └──* MessageReceipt (per participant: delivered/read)
   │        │   └──* ConversationParticipant *──1 (EndUser | StaffUser | BotIdentity)
   │        ├──* ConversationEvent (assigned/transferred/escalated/resolved…)
   │        └──1 Assignment (current) ──1 StaffUser | BotIdentity
   │
   ├──* EndUser (portal-asserted or anonymous visitor)
   ├──* Channel (widget | whatsapp | email | sms | api) ── binding config
   ├──* KbCollection 1──* KbDocument 1──* KbChunk (embedding)
   ├──* CannedResponse · RoutingRule · BusinessHours · WebhookSubscription
   └──* AuditLog · AiTurnLog · CsatResponse
```

Key semantics:

- **Conversation** — the thread. Belongs to a tenant, a queue, and an origin channel; has status (`open|pending|resolved|closed`), priority, SLA timestamps, and a `context` JSONB (host-portal-provided, FR-43).
- **Message** — ordered by `(conversation_id, seq)`; `seq` is a per-conversation monotonic counter assigned at insert (gap-free ordering for sync, §9.3). `kind` distinguishes `text|quick_replies|card|attachment|system|note` (notes are staff-only, FR-17). `sender_participant_id` links to the participant — human, bot, end user, or `system`.
- **Participant** — the polymorphic join that makes "multiple humans + multiple bots" natural (FR-34/35): a conversation has N participants with roles `end_user|agent|bot|system`, each with join/leave times. Read receipts hang off participants, not user types.
- **Assignment** — exactly zero or one *current* assignee per conversation (partial unique index), with full history in `conversation_event`. Assignee can be a StaffUser or a BotIdentity — routing treats them uniformly (FR-31/35).
- **Presence** — ephemeral state (in-memory + `staff_presence` snapshot row) per staff user: `online|away|offline`, last-heartbeat, current load (open assignment count). §9.4.
- **Channel** — a per-tenant transport binding (e.g. this tenant's WhatsApp number, inbound email address). A conversation records `origin_channel`; each message records the channel it traveled on, so cross-channel continuation (FR-50) is a message-level property.
- **EndUser** — one row per person per tenant. `external_id` = the host portal's user ID (from the embed token) or `visitor:<uuid>` for anonymous; merging visitor→authenticated (FR-9) re-points `end_user_id`.
- **KB entities** — per-tenant collections → documents (versioned) → chunks with embeddings (§10.4).

---

## 5. Data Model (Postgres + drizzle-orm)

### 5.1 ERD

```
┌──────────┐       ┌─────────────┐      ┌──────────────────┐
│  tenant  │1─────*│    queue    │1────*│  queue_member    │*──┐
└────┬─────┘       └──────┬──────┘      └──────────────────┘   │
     │                    │1                                    │
     │                    ▼1                               ┌────▼─────┐
     │             ┌─────────────────┐                     │staff_user│
     │             │ responder_config│                     └────┬─────┘
     │             └─────────────────┘                          │1
     │1                                                         ▼*
     ├────────*┌──────────────┐                          ┌──────────────┐
     │         │ conversation │1───────────────────────*─│  assignment  │ (current:
     │         └───┬─────┬────┘                          └──────────────┘  partial uniq)
     │             │1    │1
     │             │     └────────*┌────────────────────────┐
     │             │               │conversation_participant │*──(end_user | staff_user
     │             │               └───────────┬─────────────┘        | bot_identity)
     │             ▼*                          │1
     │       ┌──────────┐                      ▼*
     │       │ message  │1──────*┌──────────────────┐   ┌────────────┐
     │       └────┬─────┘        │ message_receipt  │   │ attachment │
     │            │1─────────────└──────────────────┘   └────────────┘
     │            └───────*(attachment)
     │
     ├───*┌──────────┐  ├───*┌───────────────┐  ├───*┌──────────────┐
     │    │ end_user │  │    │ kb_collection │1─*┌──►│ kb_document  │1─*► kb_chunk
     │    └──────────┘  │    └───────────────┘   │   └──────────────┘     (vector)
     │
     ├───*: channel · routing_rule · business_hours · canned_response ·
     │     webhook_subscription · bot_identity · csat_response
     └───*: conversation_event · audit_log · ai_turn_log · notification_outbox
```

### 5.2 Tables (key columns; full DDL generated by drizzle migrations)

All tables: `id uuid pk default gen_random_uuid()`, `tenant_id uuid not null references tenant(id)` (except `tenant` itself and `staff_user` which is tenant-scoped via `staff_tenant`), `created_at timestamptz default now()`. Indexes noted where load-bearing.

| Table | Key columns beyond standard | Notes |
|---|---|---|
| `tenant` | `slug uniq`, `name`, `status`, `theme jsonb`, `settings jsonb` (locale default, retention months, anonymous_allowed, widget copy), `embed_key_hash`, `api_key_hash` | One row per portal/brand (FR-39) |
| `staff_user` | `email uniq`, `name`, `password_hash` (or SSO subject), `avatar_url` | Global staff identity |
| `staff_tenant` | `staff_user_id`, `tenant_id`, `role enum(agent,supervisor,admin)`, `skills text[]` | Staff↔tenant membership + role + skills (FR-33). Uniq `(staff_user_id, tenant_id)` |
| `staff_presence` | `staff_user_id`, `tenant_id`, `state enum(online,away,offline)`, `last_heartbeat_at`, `active_conversations int` | Snapshot; source of truth for routing (FR-16) |
| `end_user` | `external_id`, `kind enum(portal,visitor)`, `display_name`, `email`, `phone`, `locale`, `merged_into uuid null` | Uniq `(tenant_id, external_id)`; merge per FR-9 |
| `bot_identity` | `name`, `avatar_url`, `responder_config_id`, `active bool` | AI participants as first-class identities (FR-35) |
| `queue` | `slug`, `name`, `default_responder_config_id`, `business_hours_id null`, `sla jsonb` (first_response_min, resolve_min), `routing_strategy enum(broadcast,round_robin,least_active)`, `agent_cap int` | Uniq `(tenant_id, slug)` (FR-32) |
| `queue_member` | `queue_id`, `staff_user_id` | Membership |
| `responder_config` | `mode enum(human,ai,hybrid,rules)`, `bot_identity_id null`, `model text` (e.g. `claude-sonnet-5`), `confidence_threshold numeric`, `kb_collection_ids uuid[]`, `guardrails jsonb`, `escalation_queue_id null`, `rules jsonb` | The Responder seam's configuration record (FR-22) |
| `channel` | `type enum(widget,whatsapp,email,sms,api)`, `binding jsonb` (WA number id, inbound address…), `status` | Transport bindings (FR-50) |
| `conversation` | `queue_id`, `end_user_id`, `origin_channel_id`, `status enum(open,pending,resolved,closed)`, `subject null`, `context jsonb`, `priority int`, `last_message_at`, `first_response_at null`, `resolved_at null`, `reopened_from uuid null`, `tags text[]` | Idx `(tenant_id,status,last_message_at desc)` for inbox; idx `(tenant_id,end_user_id)` |
| `assignment` | `conversation_id`, `assignee_kind enum(staff,bot)`, `staff_user_id null`, `bot_identity_id null`, `assigned_by`, `active bool` | **Partial unique index on `(conversation_id) where active`** — the collision lock (FR-13/34) |
| `conversation_participant` | `conversation_id`, `role enum(end_user,agent,bot,system)`, `end_user_id / staff_user_id / bot_identity_id` (exactly one), `joined_at`, `left_at null` | Check constraint: exactly one identity FK set |
| `message` | `conversation_id`, `seq bigint`, `sender_participant_id`, `kind enum(text,quick_replies,card,attachment,system,note)`, `body text`, `payload jsonb` (card/quick-reply structure), `channel_id`, `visibility enum(public,internal)`, `edited_at null` | **Uniq `(conversation_id, seq)`**; idx `(conversation_id, seq)` covers thread fetch + sync-after (FR-21) |
| `message_receipt` | `message_id`, `participant_id`, `delivered_at null`, `read_at null` | Uniq `(message_id, participant_id)` (FR-7) |
| `attachment` | `message_id`, `file_key`, `filename`, `mime`, `size_bytes`, `scan_status enum(pending,clean,blocked)` | Object storage key is tenant-prefixed (FR-6) |
| `conversation_event` | `conversation_id`, `type enum(created,assigned,unassigned,transferred,escalated,status_changed,sla_breach,csat_sent…)`, `actor_participant_id null`, `data jsonb` | Append-only timeline (FR-37); feeds webhooks |
| `routing_rule` | `priority int`, `match jsonb` (channel, url pattern, context keys, language, intent), `action jsonb` (queue_id, required_skills, priority) | Ordered evaluation (FR-31) |
| `business_hours` | `timezone`, `weekly jsonb`, `holidays date[]` | (FR-45) |
| `canned_response` | `scope enum(personal,team)`, `owner_staff_id null`, `shortcut`, `title`, `body` (with `{{vars}}`) | (FR-15) |
| `kb_collection` | `name`, `locale_strategy jsonb` | (FR-24) |
| `kb_document` | `collection_id`, `source_type enum(upload,faq,url)`, `title`, `uri null`, `version int`, `status enum(active,superseded,stale)`, `content_hash` | Versioned; supersede-not-edit |
| `kb_chunk` | `document_id`, `ord int`, `text`, `embedding vector(1024)`, `lang`, `token_count` | **pgvector**; HNSW index per collection filter |
| `ai_turn_log` | `conversation_id`, `message_id null`, `model`, `prompt_hash`, `retrieval jsonb` (chunk ids + scores), `output text`, `confidence numeric`, `outcome enum(sent,escalated,refused)`, `latency_ms`, `tokens_in/out` | FR-61 audit; retention-scoped |
| `notification_outbox` | `end_user_id`, `conversation_id`, `channel enum(portal,email,sms,push)`, `payload jsonb`, `status enum(pending,sent,failed)`, `attempts int`, `next_attempt_at` | Transactional-outbox pattern for FR-19 reliability |
| `webhook_subscription` | `url`, `events text[]`, `secret`, `status` | HMAC-signed delivery (FR-46) |
| `csat_response` | `conversation_id`, `score int`, `comment` | (FR-48) |
| `audit_log` | `actor_kind/id`, `action`, `object_kind/id`, `data jsonb`, `ip` | Append-only (FR-57) |

**Migration note:** the HireStream-HP `support_messages` table (candidateId, senderRole, senderUserId, body, readByAdmin, readByCandidate, createdAt) maps cleanly: each distinct `candidate_id` → one `conversation`; each row → one `message`; `sender_role` → participant role; the two read booleans → `message_receipt` rows. Migration script detail in §15.

---

## 6. API Surface

### 6.1 Conventions

- Base: `https://converse.agentryx.in/api/v1`. Versioned path; additive-only within v1.
- Envelope: `{ success, data, error? }` (house style). Errors: `{ success:false, error:{ code, message, details? } }` with stable machine `code`s.
- Tenant resolution: from the auth credential (embed token / staff session / API key) — **never** from a client-supplied ID.
- Pagination: cursor-based (`?after=<cursor>&limit=`) on all list endpoints.
- Idempotency: mutation endpoints accept `Idempotency-Key` header (message send uses client-generated `client_msg_id`, deduped per conversation).

### 6.2 End-user API (widget/SDK; auth: embed token or visitor token)

| Method & path | Purpose | FR |
|---|---|---|
| `POST /session` | Exchange embed token (or nothing → anonymous) for a scoped session JWT + WS ticket; returns tenant theme/config bootstrap | FR-40/41 |
| `GET /me/conversations` | List my conversations (open + closed) | FR-10 |
| `POST /conversations` | Start conversation `{ queue_hint?, context?, first_message }` | FR-2 |
| `GET /conversations/:id/messages?after_seq=` | Thread fetch / gap sync | FR-21 |
| `POST /conversations/:id/messages` | Send `{ client_msg_id, kind, body, payload? }` → durable ack with `seq` | FR-2/3 |
| `POST /conversations/:id/read` | Mark read up to `seq` | FR-7 |
| `POST /conversations/:id/typing` | Typing signal (also available over WS) | FR-8 |
| `POST /conversations/:id/handoff` | Request a human (AI conversations) | FR-27 |
| `POST /conversations/:id/csat` | Submit rating | FR-48 |
| `POST /me/contact` | Opt-in contact capture for offline notify | FR-18/56 |
| `POST /attachments` → `POST …/messages` | Two-step upload then attach | FR-6 |

### 6.3 Staff API (console; auth: staff session, role-gated per `staff_tenant.role`)

| Method & path | Purpose | FR |
|---|---|---|
| `GET /staff/inbox?queue=&status=&assignee=&after=` | Inbox list with previews, unread, wait, SLA flags | FR-11/20 |
| `GET /staff/conversations/:id` | Full thread + participants + context + events | FR-12/43 |
| `POST /staff/conversations/:id/messages` | Reply (`visibility: public|internal` for notes) | FR-12/17 |
| `POST /staff/conversations/:id/claim` | Atomic claim (409 if already assigned) | FR-13 |
| `POST /staff/conversations/:id/transfer` | `{ to: queue|staff|bot, note? }` | FR-14 |
| `POST /staff/conversations/:id/status` | Resolve / close / reopen | FR-4 |
| `PUT /staff/presence` | Set online/away/offline | FR-16 |
| `GET/POST/PUT /staff/canned` | Canned response CRUD | FR-15 |
| `GET /staff/kb/suggest?conversation_id=` | KB-suggested answers for the thread | FR-26-adjacent |
| Supervisor: `GET /staff/overview` (queues, presence, load), `POST …/reassign`, `GET /staff/reports?…`, `GET /staff/ai-review?…` | Oversight + reporting | FR-36/49 |

### 6.4 Admin & integration API (auth: staff-admin session or tenant API key)

| Method & path | Purpose |
|---|---|
| `GET/PUT /admin/tenant` | Theme, copy, locales, retention, anonymous toggle |
| `CRUD /admin/queues`, `/admin/routing-rules`, `/admin/business-hours` | Routing config |
| `CRUD /admin/responders`, `/admin/bots` | Responder configs, thresholds, model, escalation |
| `CRUD /admin/kb/collections|documents` + `POST /admin/kb/documents/:id/reindex` | KB management |
| `CRUD /admin/staff`, `/admin/webhooks` | Staff accounts, webhook subscriptions |
| `POST /admin/users/:id/export` · `POST /admin/users/:id/erase` | Data-subject rights (FR-55) |
| `GET /admin/audit?…` | Audit log query (FR-57) |
| Server-to-server: `POST /integration/messages` (inject message via API channel), `GET /integration/conversations/:id` | Headless portal integrations (FR-40c) |

### 6.5 Realtime protocol (WebSocket, with SSE + long-poll fallback)

Connect: `wss://…/rt?ticket=<one-time ticket from POST /session or staff login>`. One socket per client, multiplexing all subscribed conversations. Every event carries `event_id` and, for message events, the conversation `seq` — clients that miss events call `GET …/messages?after_seq=` to heal (the socket is a hint; Postgres is the truth).

**Server → client events**

| Event | Payload core | Audience |
|---|---|---|
| `message.created` | message row (respecting `visibility`) | Both |
| `message.receipt` | `{ message_id, participant_id, read_at }` | Both |
| `typing` | `{ conversation_id, participant, until }` | Both |
| `conversation.updated` | status/assignee/queue changes | Both |
| `presence.changed` | staff presence (console); queue online/offline summary (widget) | Console / Widget |
| `inbox.changed` | inbox delta (new/claimed/SLA-flag) | Console |
| `ai.thinking` / `ai.stream` | progressive AI response tokens | Widget |

**Client → server frames:** `subscribe {conversation_id}`, `typing`, `read {seq}`, `heartbeat` (15 s; drives presence, §9.4). Sends still go over REST (durability + idempotency in one path); the socket is receive-optimized. Fallbacks: `GET /rt/sse?…` (same event stream) and `GET /rt/poll?since_event=` (FR-54).

### 6.6 Outbound webhooks (FR-46)

`conversation.created|assigned|transferred|resolved`, `message.created` (public only), `handoff.requested`, `sla.breached`, `csat.submitted`. Delivery: POST JSON, `X-Converse-Signature: hmac-sha256(secret, body)`, retries 5× with exponential backoff via `notification_outbox`-style worker. The **portal-notify integration** (FR-19) is a reserved webhook (`user.notify`) the host portal maps onto its own `notify()` service (in-app/email/SMS/push) — this is how Converse reuses HireStream's existing notification muscle without coupling to it; tenants without a portal notify endpoint use Converse's built-in email/SMS senders.

---

## 7. The Responder Seam

The core never asks "is AI enabled?". It asks the **dispatcher** to run the queue's configured Responder after each end-user message is persisted.

```ts
// server/responders/types.ts — the entire contract
export interface ResponderContext {
  tenant: TenantConfig;
  conversation: Conversation;         // incl. context jsonb, queue, status
  thread: Message[];                  // public messages, ordered
  trigger: Message;                   // the message that fired dispatch
  tools: {
    reply(msg: DraftMessage): Promise<Message>;       // send as the bot participant
    replyStream(start: () => TokenSink): Promise<Message>; // streaming variant
    escalate(to: QueueRef, note?: string): Promise<void>;  // human handoff (FR-27)
    setStatus(s: ConversationStatus): Promise<void>;
    log(turn: AiTurnLogDraft): Promise<void>;         // FR-61
  };
}
export interface Responder {
  readonly mode: "human" | "ai" | "hybrid" | "rules";
  onUserMessage(ctx: ResponderContext): Promise<ResponderOutcome>;
  // outcome: { handled: boolean }  — handled=false ⇒ conversation flows to the human inbox
}
```

| Implementation | Behavior |
|---|---|
| `HumanResponder` | Always `handled:false`; posts the offline/business-hours auto-ack when applicable (FR-18). This is Phase 0/1 — and the permanent fallback of every other mode. |
| `RulesResponder` | Evaluates `responder_config.rules` (keyword → canned answer, menu trees of quick replies); unmatched → `handled:false`. Cheap deflection without any LLM. |
| `AIResponder` | RAG pipeline (§10.4): retrieve → generate grounded+cited draft → confidence gate → send or `escalate()` with draft note. |
| `HybridResponder` | Composition: `RulesResponder` → `AIResponder` → human, with per-stage thresholds; also enforces "human business hours only for escalation targets". |

Design guarantees: Responders run **out of the request path** (dispatcher consumes the durable message; user's send-ack never waits on an LLM); a Responder crash or timeout degrades to `handled:false` (human inbox) — AI failure can never lose a message; Responders act only through `ctx.tools`, so every capability is audited and every Responder action is a normal participant action (satisfying persona P5's constraint). Config is data (`responder_config` row), so switching a queue Human→Hybrid is an admin-console click (FR-22, US-12).

---

## 8. The Transport Seam

A Transport adapts a channel's wire format to the core model. The core sees only normalized inbound events and delivery instructions.

```ts
export interface Transport {
  readonly type: "widget" | "whatsapp" | "email" | "sms" | "api";
  // inbound: webhook/socket → normalize → core.ingestMessage(...)
  handleInbound(raw: unknown, channel: Channel): Promise<NormalizedInbound>;
  // outbound: core asks the transport to deliver a persisted message
  deliver(msg: Message, recipient: EndUserAddress): Promise<DeliveryResult>;
  capabilities(): { richCards: boolean; typing: boolean; receipts: boolean; maxLen: number };
}
```

- **WidgetTransport** (Phase 0): inbound = REST/WS from the widget; delivery = WS push if connected, else `notification_outbox` (§9.3). Full capabilities.
- **WhatsAppTransport** (Phase 5, first omni target): inbound = Meta Cloud API webhook → map WA contact to `end_user` by phone; outbound = WA send API, honoring the 24-hour session window (outside it, use approved template messages — the capability map lets the core downgrade cards→text automatically).
- **EmailTransport**: inbound parse (reply-token in address, `conv+<id>@…`) appends to the thread; outbound renders the thread delta as HTML mail.
- **SMSTransport**: text-only capability; long messages chunked.
- **APITransport**: for portals injecting messages server-side (FR-40c).

Because capability negotiation lives in the transport, message *kinds* (cards, quick replies) are authored once; each transport renders or degrades them. Cross-channel continuity (FR-50) works because `message.channel_id` is per-message, not per-conversation.

---

## 9. Tenancy, Presence & Offline Mechanics

### 9.1 Tenant isolation (FR-39)

Three layers, defense-in-depth:
1. **Credential-scoped tenancy** — tenant ID derives from the authenticated credential only (§6.1).
2. **Repository layer** — all data access goes through `forTenant(tenantId)` repositories; no raw table access from route handlers (lint-enforced import boundary).
3. **Postgres RLS** as backstop — policies on every tenant-carrying table keyed to `current_setting('app.tenant_id')`, set per request/transaction. A bug in layer 2 returns zero rows, not another tenant's rows.

Files in object storage are keyed `tenants/<tenant_id>/…`; KB retrieval filters by collection → tenant before vector search; per-tenant encryption of webhook secrets and channel bindings.

### 9.2 Identity & sessions

- **End users:** portal mints an embed token (JWT, `HS256` with the tenant's embed key, TTL ≤ 10 min, claims: `sub` = portal user ID, `name`, `email?`, `locale?`) → `POST /session` → Converse session JWT (TTL 24 h, renewable). Anonymous: widget generates a `visitor:<uuid>` kept in localStorage; server issues a visitor-scoped session. Login-time merge per FR-9.
- **Staff:** email+password (argon2) or portal-SSO later; session cookie (httpOnly, SameSite=Lax) for the console; role from `staff_tenant`.

### 9.3 Offline message storage & catch-up (FR-3/18/19/21)

The async path *is* the primary path:

```
user send ──► REST persist (message + receipts + event) ──► 201 {seq}
                     │
                     ├─► fan-out: WS push to connected participants (best-effort)
                     ├─► responder dispatch (async, §7)
                     └─► for each offline participant who should be notified:
                          notification_outbox row ──► worker ──► portal-notify
                          webhook │ email │ SMS │ push (per tenant config,
                          throttled: max 1 notification per conversation per
                          15 min, batched "you have replies")
reconnect ──► GET messages?after_seq=<last local seq> ──► gap healed
```

`seq` (per-conversation counter, assigned inside the insert transaction via `UPDATE conversation SET last_seq = last_seq + 1 RETURNING`) makes client sync trivial and total-ordered. The transactional outbox guarantees at-least-once notification with dedupe keys.

### 9.4 Presence (FR-16)

- Console heartbeats every 15 s over WS. Miss 2 → `away`; miss 8 (2 min) → `offline`. Explicit state overrides inference (an agent can set `away` while connected).
- In-memory presence map (per process) + `staff_presence` snapshot written on transitions — restart-safe and, later, shared via Redis pub/sub when multi-process (§13).
- **Queue availability** = any member `online` AND within business hours → drives the widget's online/offline banner (FR-18) and routing eligibility. The widget receives availability in the session bootstrap and via `presence.changed` events.

---

## 10. Routing Engine & AI/RAG Boundary

### 10.1 Queue selection (conversation → queue)

On conversation creation: evaluate `routing_rule` rows in priority order; first match wins; no match → tenant default queue. Match dimensions: origin channel, page URL pattern, `context` keys (e.g. `role=candidate`), user locale, and (Phase 3+) the triage bot's intent classification (FR-38 — the triage bot simply calls `transfer(queue)` via responder tools).

### 10.2 Responder gate

The queue's `responder_config` runs first (§7). `handled:true` → no human routing. `handled:false` → the conversation enters the human assignment flow with any bot note attached.

### 10.3 Agent selection (conversation → agent) (FR-31/33/34)

Per queue strategy:
- `broadcast` (default until Phase 4): conversation appears unassigned in all members' inboxes; **claim** is an atomic `INSERT assignment … WHERE NOT EXISTS(active)` — the partial unique index makes double-claim impossible; loser gets 409 + inbox refresh.
- `round_robin`: next online, under-cap member in rotation; skip offline.
- `least_active`: online member with lowest `active_conversations`.
- Skills filter first (`staff_tenant.skills ⊇ required_skills`), then strategy; no eligible agent online → conversation waits unassigned (visible, SLA-timed) and the offline ack (FR-18) covers expectation-setting. Reassignment on agent going offline with open assignments: supervisor-visible flag (auto-requeue configurable).

### 10.4 AI/RAG integration boundary (FR-23–30, FR-61)

```
            ┌────────────────────  AIResponder.onUserMessage ───────────────────┐
            │ 1 PREP     thread window (last N public msgs) + conversation ctx  │
            │ 2 RETRIEVE embed query (user msg + condensed thread)              │
            │            → pgvector top-k per bound kb_collection               │
            │            → language-preference filter → rerank → cite-set       │
            │ 3 GENERATE Claude call (model from responder_config):             │
            │            system = tenant persona + guardrails + "answer ONLY    │
            │            from CONTEXT; if insufficient say so" + citation format│
            │            tools  = [escalate_to_human, ask_clarifying_question]  │
            │ 4 GATE     confidence = f(retrieval scores, model self-grade,     │
            │            groundedness check) ; < threshold → escalate(draft)    │
            │ 5 ACT      reply (streamed, labeled per FR-29, citations FR-25)   │
            │            or escalate(queue, draft-as-note) per FR-26/27         │
            │ 6 LOG      ai_turn_log row (always, incl. refusals)               │
            └────────────────────────────────────────────────────────────────────┘
```

- **Ingestion (C-8):** upload/FAQ/crawl → extract text → chunk (~500 tokens, heading-aware, overlap 50) → embed → `kb_chunk`. Documents are versioned; re-upload supersedes (old chunks flagged inactive, kept for audit). Embeddings via a pluggable `Embedder` (default: hosted embedding API; pgvector 1024-dim; swap = config + reindex job).
- **LLM provider seam (FR-30):** a thin `LlmProvider` interface (`complete`, `stream`, `countTokens`) with the Anthropic implementation as default. Model policy: `claude-haiku-4-5` for triage/intent + confidence self-grade, `claude-sonnet-5` for grounded answering (the workhorse), `claude-opus-4-8` opt-in per queue for complex reasoning. Per-tenant API-key override supported (tenant pays own usage).
- **Guardrails (FR-28):** layered — retrieval-only grounding instruction; input screen (injection patterns, abuse) via a fast haiku classification; output checks (no PII echo beyond the user's own, citation-presence for factual claims); hard topic blocklist per tenant → refuse-and-escalate. Every guardrail trip is an `ai_turn_log` row with `outcome:refused`.
- **Handoff (FR-27):** user affordance + intent detection + `escalate_to_human` tool + confidence gate all converge on the same `tools.escalate()` — one code path, fully evented.
- **Cost control:** per-tenant daily token budgets; over budget → HybridResponder degrades to rules+human automatically (evented, admin-alerted).

---

## 11. Security

| Area | Control |
|---|---|
| End-user authn | Embed-token exchange (§9.2); embed keys per tenant, rotatable; token TTL ≤ 10 min, aud/iss checked |
| Staff authn | Argon2 passwords, session cookies (httpOnly/SameSite), optional TOTP 2FA (admin roles mandatory Phase 2+), login throttling |
| Authz | Role gates (agent/supervisor/admin) per tenant via `staff_tenant`; per-queue visibility for agents; object-level checks in the repository layer; RLS backstop (§9.1) |
| API keys | Tenant server keys hashed at rest, scoped (integration vs admin), rotatable, last-used tracked |
| Rate limiting (FR-51) | Per visitor/session: message sends (e.g. 10/min burst 20), conversation creates (5/hr), attachment uploads; per IP on `/session`; per tenant global caps. 429 + Retry-After; widget backs off gracefully |
| Abuse | Attachment virus scan (clamav) before delivery; MIME allowlist; link/profanity filters (config); agent block-user; anonymous chat off by default for HPSEDC tenants (D-2) |
| Transport security | TLS everywhere; WS over TLS; HSTS; widget iframe sandboxing + `postMessage` origin checks; strict CORS per tenant's registered origins |
| Injection | Parameterized queries via drizzle; prompt-injection screening (§10.4); webhook payloads signed (HMAC) both directions |
| Secrets | Env-injected (PM2 ecosystem), never in repo; channel bindings and webhook secrets encrypted at rest (AES-256-GCM, KMS-style key file) |
| Audit | §5.2 `audit_log` + `ai_turn_log`; admin console access logged |

Threats explicitly designed against: cross-tenant leakage (structural isolation), spoofed end-user identity (signed embed tokens only), message loss (durable-write-first + outbox), inbox race conditions (atomic claim), LLM data exfiltration via prompt injection (retrieval-scoped grounding + screens), widget as XSS vector into the host (iframe isolation; the loader script touches the host DOM only to place the iframe).

---

## 12. Observability

- **Structured logs** (pino, JSON): every request with tenant/route/latency; responder dispatches; notification deliveries; guardrail trips. Correlation ID propagated widget→REST→worker.
- **Metrics** (Prometheus endpoint `/metrics`): message throughput, persist latency, WS connection count, presence counts, responder latency + outcome mix, notification success/failure, queue depths, SLA breach counter, LLM tokens + cost per tenant.
- **Health:** `/healthz` (process), `/readyz` (DB + object storage + LLM reachability), consumed by PM2/monitor scripts.
- **Alerting hooks:** error-rate and outbox-backlog thresholds → ops webhook (reuses house alerting).
- **Deep-smoke compatible:** ships with a `scripts/deep-smoke.mjs` — route health + authz matrix (agent vs supervisor vs admin vs end-user vs cross-tenant) — per the Agentryx embedded-testing standard; test strategy detail in [04 §6](04_Build_Phasing_and_Plan.md).

---

## 13. Scalability

Honest sizing: HPSEDC-class tenants are hundreds of concurrent users, not millions. The architecture is deliberately **simple now, splittable later**:

| Stage | Shape | Ceiling (est.) |
|---|---|---|
| Phase 0–2 | One Node process (API+WS+workers) + Postgres, PM2, single VM | ~2–3 k concurrent WS, ~50 msg/s — far above near-term need |
| Phase 3–4 | Same + Redis (BullMQ workers out-of-process, presence/pub-sub shared) | ~10 k WS across 2–3 API replicas behind nginx (sticky WS) |
| Phase 5+ | Realtime gateway split to its own process pool; read replicas; per-tenant partitioning of `message` if any tenant crosses ~50 M rows | Horizontal |

What makes the later stages cheap: fan-out already goes through an event bus abstraction (in-process EventEmitter now, Redis pub/sub later — one adapter swap); workers already consume the outbox/queue abstraction; WS clients already heal via `after_seq` so gateway restarts are invisible; no server-side per-connection state beyond the presence map.

---

## 14. Embed & SDK Story (FR-40)

### 14.1 Drop-in widget (Phase 0)

```html
<script async src="https://converse.agentryx.in/widget/v1/loader.js"
        data-tenant="hirestream-hp"
        data-locale="hi"
        data-token-endpoint="/api/converse-token"><!-- portal-minted embed token -->
</script>
```

Loader (~8 KB) injects a sandboxed iframe (launcher + window), fetches the tenant bootstrap (theme, availability, copy), lazy-loads the main bundle on first open. Host-page API: `AgentryxConverse.open() / close() / identify(token) / setContext({...}) / on(event, cb)`. If `data-token-endpoint` is absent → anonymous mode (if tenant allows).

### 14.2 npm SDK (Phase 1)

`@agentryx/converse-sdk`: **headless core** (typed REST client + realtime subscription with reconnect/heal logic, framework-free) and **React bindings** (`<ConverseProvider>`, `useConversation()`, `useInbox()` for portals that build custom UIs, e.g. the HireStream mobile app in React Native — the headless core is RN-compatible by construction). The official widget and console are both built on this SDK — the SDK is not a side artifact, it is the first consumer.

### 14.3 Raw REST/WS

Everything in §6, for non-JS stacks and server-side integrations. OpenAPI spec generated from route schemas (zod) and published per version.

---

## 15. Migration Path from the HireStream-HP Seed (Phase 0 input)

The seed (`hirestream-hp/server/routes/support.routes.ts` + `support_messages` table) already proved the core bet: an async thread with role-gated inbox, reply-with-notify, and a code-level note that it is Responder-agnostic and Transport-pluggable. Converse Phase 0 generalizes it:

| Seed concept | Converse generalization |
|---|---|
| `support_messages.candidate_id` (implicit thread) | Explicit `conversation` row per thread; candidate → `end_user` |
| `sender_role: 'candidate'\|'hpsedc'` | `conversation_participant.role`; "hpsedc" → tenant staff |
| `read_by_admin` / `read_by_candidate` booleans | `message_receipt` per participant |
| `/threads` grouped SQL (latest + unread per candidate) | `GET /staff/inbox` (same shape, indexed, cursor-paged) |
| `notify()` call on reply | `notification_outbox` → `user.notify` portal webhook → HireStream's existing `notify()` service |
| Role gate `['admin','superadmin','agent']` | `staff_tenant.role` + queue membership |

**Cutover plan:** (1) stand up Converse with tenant `hirestream-hp`; (2) one-shot migration script transforms `support_messages` → conversations/messages/participants/receipts (grouped by candidate, ordered by `created_at`, `seq` assigned in order); (3) HireStream-HP adds the token-mint endpoint + registers its notify webhook; (4) the candidate "Ask HPSEDC" page swaps to the Converse widget, and the admin support inbox page is replaced by a link to the Converse console; (5) `support.routes.ts` endpoints are kept read-only for one release, then removed. Verify-module seed items updated in the same commit cadence per house rule.

---

*End of Architecture v1.0 · 2026-07-06. Next: [03_Design_and_UX.md](03_Design_and_UX.md).*
