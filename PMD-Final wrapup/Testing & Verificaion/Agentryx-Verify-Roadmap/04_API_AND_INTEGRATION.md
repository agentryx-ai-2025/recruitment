# 04 — Public API and Integration

The contract that lets external portals push data into Verify and subscribe to events. This is the substance of Phase 2 in `03_ROADMAP.md` and the long-term durability of the product depends on getting it right the first time.

---

## Why a separate `/api/v1` namespace

The existing `/api/*` endpoints are coupled to the React client's expectations. They evolve as the UI evolves. Breaking that coupling for an external integration would mean either:

(a) freeze the internal API and lose the velocity to iterate, or
(b) churn the internal API and break partners.

Neither is acceptable. The pattern adopted is:

```
/api/*            ← internal. Used by the React client only. May change without notice.
/api/v1/*         ← public. Stable contract. Versioned. Breaking changes go to /api/v2/*.
```

Both share the same database and business logic — `/api/v1/*` is a thin, stable veneer over the same core.

### Versioning policy

- **Additive changes** (new fields, new endpoints) ship to the current `/api/v1`
- **Breaking changes** (renamed fields, removed endpoints, changed semantics) require a new version: `/api/v2`. Both run in parallel for at least 12 months.
- **Deprecation** announced in response headers (`Deprecation: true`, `Sunset: <date>`) at least 6 months before removal
- **Status changes** like 200→201 for new resources are NOT considered breaking

This is the same policy GitHub, Stripe, and Atlassian use. It is conservative on purpose; partners can plan around it.

---

## Authentication

Three modes, in order of preference:

### 1. API tokens (machine-to-machine)

For CI pipelines, partner portals, automated integrations.

```
Authorization: Bearer agx_pk_<id>_<secret>
```

- Tokens are project-scoped by default. A token issued for project `hirestream-v1.4` cannot read or write data on `hirestream-htis-smoke`.
- Admin tokens (issued by Agentryx) have global scope.
- Tokens have explicit `scopes[]` (see "Scopes" below). A read-only ingest token cannot trigger a signoff.
- Token strings are visible to the user only ONCE at creation. The DB stores `bcrypt(secret)`.
- Token names + creation dates + last-used timestamps shown in the admin UI for audit.

### 2. Session cookies (browser)

For the React client itself. Same as today. No change in v1 — the React client uses `/api/*`, not `/api/v1/*`.

### 3. Magic links (email-based, scoped)

For one-time customer interactions (Phase 3 ticket follow-ups). Token in the URL grants single-row access only. Time-bounded (typically 7 days).

### Token scopes

The minimum useful set:

| Scope | Grants |
|---|---|
| `project:read` | List + read project, requirements, signoffs (read-only) |
| `project:write` | Create / edit requirements (admin-equivalent for that project) |
| `signoff:read` | Read signoff history |
| `signoff:write` | Create / update signoffs at a specified level |
| `sprint:read` | Read sprint list + detail |
| `sprint:write` | Create / deploy / close sprints (used by HireStream CI) |
| `feedback:read` | Read feedback inbox |
| `feedback:write` | Create feedback items |
| `ticket:read` | Read tickets (Phase 3) |
| `ticket:write` | Create / update tickets (Phase 3) |
| `webhook:manage` | Create / revoke webhook subscriptions |
| `*` | Everything (admin-only) |

Tokens hold a list of these. UI defaults to a sensible subset based on the integration type the user picks ("CI deploy push" → `sprint:write` + `signoff:read`).

### Rate limits

- Anonymous (no token, no session): 10 req/min — for the public ticket form (Phase 3)
- Token-authed: 100 req/min per token, 1000 req/min per project
- Session-authed (browser): no limit (trusted)

Limits enforced by token-bucket, returned in `X-RateLimit-*` headers.

---

## Error model

Every error returns JSON in this shape:

```json
{
  "error": "Human-readable description",
  "code": "machine_readable_code",
  "details": { /* optional context */ },
  "request_id": "req_abc123"
}
```

Standard codes:

| Status | Code | Meaning |
|---|---|---|
| 400 | `validation_failed` | Request body / params invalid; details has field-level errors |
| 401 | `unauthenticated` | No valid session / token / link |
| 403 | `forbidden` | Authenticated but missing scope / role |
| 404 | `not_found` | Resource doesn't exist (or caller can't see it) |
| 409 | `conflict` | State precondition failed (e.g. sprint already deployed) |
| 413 | `payload_too_large` | File / body exceeds limit |
| 422 | `unprocessable` | Semantically invalid (e.g. signing off at a level the role can't access) |
| 429 | `rate_limited` | Slow down |
| 500 | `internal_error` | Unexpected; logged with `request_id` |

`request_id` is generated per request and logged server-side. Partners reporting issues quote it; we trace it.

---

## Endpoints (Phase 2 launch surface)

Listed in REST shape. Full OpenAPI spec lives at `/api/v1/openapi.json` once Phase 2 ships.

### Projects

```
GET    /api/v1/projects                   List projects visible to caller
GET    /api/v1/projects/:slug             Project detail (requirements, signoffs, sprints)
PATCH  /api/v1/projects/:slug             Update buildRef, description (admin scope)
```

### Requirements / Rows

```
GET    /api/v1/projects/:slug/rows                        List rows (default rowType=requirement)
POST   /api/v1/projects/:slug/rows                        Create a new row
GET    /api/v1/projects/:slug/rows/:itemRef               Read one row
PATCH  /api/v1/projects/:slug/rows/:itemRef               Update row
DELETE /api/v1/projects/:slug/rows/:itemRef               Delete row (admin)
```

The path uses `:itemRef` (e.g. `1.18`) rather than the database ID — partner systems remember business identifiers, not UUIDs.

### Signoffs

```
GET    /api/v1/projects/:slug/rows/:itemRef/signoffs               List signoffs at every level
PUT    /api/v1/projects/:slug/rows/:itemRef/signoffs/:level        Upsert signoff (PUT for idempotency)
DELETE /api/v1/projects/:slug/rows/:itemRef/signoffs/:level        Clear signoff
```

`PUT` instead of `POST` for upsert is deliberate — partners can retry safely.

### Sprints (used by HireStream CI auto-push)

```
GET    /api/v1/projects/:slug/sprints
POST   /api/v1/projects/:slug/sprints                  Create draft sprint
GET    /api/v1/sprints/:id
PATCH  /api/v1/sprints/:id                             Update name / notes / fixedItemRefs
POST   /api/v1/sprints/:id/deploy                      Mark deployed; bump project buildRef
POST   /api/v1/sprints/:id/close
```

### Events ingest

```
POST   /api/v1/projects/:slug/events
```

Generic event ingest. Body:

```json
{
  "type": "deploy.completed",
  "occurredAt": "2026-05-06T14:23:00Z",
  "source": "hirestream-ci",
  "buildRef": "v0.9.9",
  "fixedItemRefs": ["1.4", "1.6", "2.13"],
  "metadata": { /* free-form */ }
}
```

Verify routes `deploy.completed` to auto-create+deploy a sprint. Other event types accumulate in `audit_log` for analytics.

### Webhooks

```
GET    /api/v1/projects/:slug/webhooks
POST   /api/v1/projects/:slug/webhooks            Subscribe URL to event types
GET    /api/v1/projects/:slug/webhooks/:id
PATCH  /api/v1/projects/:slug/webhooks/:id        Pause / resume / change URL
DELETE /api/v1/projects/:slug/webhooks/:id        Unsubscribe
GET    /api/v1/projects/:slug/webhooks/:id/deliveries    Recent delivery history
POST   /api/v1/projects/:slug/webhooks/:id/redeliver/:deliveryId
```

### Tokens (admin)

```
GET    /api/v1/admin/tokens                       List (admin only)
POST   /api/v1/admin/tokens                       Create — returns plaintext secret ONCE
DELETE /api/v1/admin/tokens/:id                   Revoke
```

---

## Webhook delivery

### Event types (Phase 2 launch)

| Event | Fires when |
|---|---|
| `signoff.created` | A signoff is recorded for the first time at a level |
| `signoff.updated` | An existing signoff's decision or comment changes |
| `signoff.cleared` | A signoff is deleted (decision reset to pending) |
| `sprint.created` | A draft sprint is created |
| `sprint.deployed` | A sprint moves to deployed (and project buildRef bumps) |
| `sprint.closed` | A sprint is closed |
| `feedback.created` | New feedback item submitted |
| `feedback.status_changed` | Feedback status changes (triaged → planned → shipped, etc.) |
| `issue.created` | New issue raised |
| `issue.status_changed` | Issue status changes |
| `requirement.updated` | Test steps, expected result, or evidence changes |

Phase 3+ adds `ticket.*`, Phase 4 adds `test_run.*`, Phase 5 adds `decision.*`, etc.

### Delivery shape

POST to subscriber URL with:

```http
POST /your-webhook-handler HTTP/1.1
Content-Type: application/json
X-Verify-Event: signoff.created
X-Verify-Delivery: dlv_abc123
X-Verify-Signature: sha256=<hmac>
X-Verify-Timestamp: 1730894000

{
  "event": "signoff.created",
  "deliveryId": "dlv_abc123",
  "occurredAt": "2026-05-06T14:23:00Z",
  "project": { "slug": "hirestream-v1.4", "buildRef": "v0.9.9" },
  "data": {
    "rowItemRef": "1.6",
    "level": "hpsedc_staging",
    "decision": "accepted",
    "reviewer": { "id": "rvw_abc", "name": "Subhash Thakur", "organization": "HPSEDC" }
  }
}
```

### Signature verification (subscriber side)

The signature is `sha256(secret + body + timestamp)`. Subscribers MUST verify it before trusting the payload.

```python
def verify(body: bytes, signature: str, timestamp: str, secret: str) -> bool:
    expected = "sha256=" + hmac.new(
        secret.encode(),
        timestamp.encode() + b"." + body,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, signature)
```

The same payload is also signed when re-delivered (subscriber can trust replays).

### Retry policy

Failed deliveries (HTTP 5xx, timeout, network error) retry with exponential backoff:

- Attempt 1: immediate
- Attempt 2: +30s
- Attempt 3: +5m
- Attempt 4: +30m
- Attempt 5: +2h
- Attempt 6: +6h
- Attempt 7: +24h
- Then: dead-letter, surfaced in admin UI

4xx responses (subscriber says "I don't want this") are NOT retried — only 5xx / timeouts.

### Delivery history

Every attempt logged in a `webhook_deliveries` table with:
- attempt count
- request body (truncated to 10 KB)
- response status + body (truncated)
- duration
- error if any

Admin can replay any delivery on demand (Phase 2 UI).

---

## Reference integrations (Phase 2 deliverables)

### HireStream → Verify (deploy auto-push)

Trigger: HireStream's CI pipeline merges to `main` and deploys.

```bash
curl -X POST https://verify.agentryx.dev/api/v1/projects/hirestream-v1.4/events \
  -H "Authorization: Bearer agx_pk_xxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "deploy.completed",
    "occurredAt": "2026-05-06T14:23:00Z",
    "source": "hirestream-ci",
    "buildRef": "v0.9.9",
    "fixedItemRefs": ["1.4", "1.6", "2.13"],
    "metadata": { "commitSha": "abc1234", "deployedBy": "ci-bot" }
  }'
```

Verify creates a `projectSprints` row, marks it `deployed`, bumps `projects.buildRef`. Re-verify chips appear on rejected/waived signoffs for the listed `fixedItemRefs`. The whole sprint module's UX works for CI-driven deploys identically to manual ones.

### Slack notification on signoff change

```bash
curl -X POST https://verify.agentryx.dev/api/v1/projects/hirestream-v1.4/webhooks \
  -H "Authorization: Bearer agx_pk_xxxxx" \
  -d '{
    "url": "https://hooks.slack.com/services/T00/B00/XXX",
    "secret": "share_with_slack_webhook_handler",
    "eventTypes": ["signoff.created", "signoff.updated", "sprint.deployed"]
  }'
```

A small worker on Slack's side (or a Slack workflow) translates the Verify payload into a chat message.

### Status-page update on critical sign-off

Subscribe a webhook from a status-page service. When signoff at `hpsedc_final` rejects with severity comment, post an incident.

---

## What v1 explicitly does NOT include

To keep the surface small enough to support, these are deferred to v2 or later:

- **GraphQL** — REST is enough. Maybe v2 if a partner has a real reason.
- **Streaming events (SSE / WebSockets)** — webhooks cover the use case. Streaming is for v3+.
- **Bulk endpoints** (`POST /api/v1/projects/:slug/rows/bulk`) — adds complexity for a use case we don't have yet.
- **Field-level filtering / GraphQL-style projections** — return the full resource, partners trim what they don't need.
- **OAuth flows / third-party SSO** — Phase 8+ when multi-tenancy demands it.

When a partner asks for any of the above, the conversation is "we'll add it in v2 — for v1, here's how to do the equivalent with what we have".

---

## Stability promise

Once `/api/v1` ships and the first partner integrates, the contract becomes:

- All endpoints documented in `/api/v1/openapi.json` are stable
- Adding a new field is allowed (partners must accept unknown fields)
- Removing a field, changing semantics, or renaming requires a new version
- Any breaking change announced in `Deprecation` + `Sunset` headers at least 6 months ahead
- Both versions run in parallel for at least 12 months

This promise is the value Verify offers partners — they can integrate once and not have it break under them. Without it, they have no incentive to integrate at all.

---

## Implementation checklist (Phase 2)

- [ ] `api_tokens` table + migration
- [ ] `event_outbox` table + dispatcher worker (cron-style polling, no Redis)
- [ ] `webhook_subscriptions` table + delivery worker
- [ ] `webhook_deliveries` table + admin UI for history + replay
- [ ] `/api/v1` Express router mounted alongside `/api`
- [ ] Token auth middleware (separate from session middleware)
- [ ] Scope-check helper (`requireScope("signoff:write")`)
- [ ] Per-token + per-project rate limiter
- [ ] Standardised error envelope helper
- [ ] OpenAPI spec generator or hand-written + linted
- [ ] HireStream → Verify integration as the reference partner
- [ ] Token management UI (admin → settings → tokens)
- [ ] Webhook subscription UI (admin → project → webhooks)
- [ ] Documentation site or `/docs` route with examples

Notional ~2 weeks of engineering for Phase 2. Most of the data already flows; the work is exposing it stably.
