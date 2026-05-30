# 02 · Log Mining & Runtime Observability

The runtime / production-time half of the embedded framework — Layer 4 in the 5-layer model. While L1-L3 ask "is the *code* correct?", L4 asks "is the *running system* behaving the way it did yesterday?". This is where 30-80% of issues are visible *before* a human reports them — if anyone reads the logs.

This doc defines the standard for every Agentryx app: the structured-log contract, the three tiers of analysis, the tools, and the phased buildout.

---

## 1. The premise

In every production incident retro across Agentryx so far, the timeline reads roughly the same:

```
   T+0     bug ships
   T+1h    error appears in logs (no one reading)
   T+3h    error count climbs to 200+ (logs still un-read)
   T+5h    first user reports it via support
   T+7h    on-call investigates, opens the logs, sees it immediately
```

The information was sitting in plain text from `T+1h`. The 6-hour delay isn't a data problem — it's a *human attention* problem. **People are doing the same job a log-mining module can do:** scan structured records, cluster similar errors, notice when the count or shape changes, and surface the top issues.

A back-of-envelope from a few months of HireStream incidents suggests **30-80% of issues that hit production** were visible in logs *before* a user reported them. Even at the low end of that range, automating the scan recovers most of the lost time.

This doc is how we build that.

---

## 2. Anti-goals

What this is **not**:

- **Not** an alternative to Sentry / Datadog / Honeycomb. Those are great — and we'll integrate with them where they fit. This doc defines what's *embedded in every Agentryx app* by default, with progressive complexity. You should be able to run the basic version with zero SaaS dependency.
- **Not** a metrics platform. We rely on logs as the primary signal because logs already exist in every app; metrics require deliberate instrumentation and we add them where they pay back.
- **Not** an APM. Distributed tracing is valuable but not in scope for Phase 1-2; it's added later for cross-app workflows.

The framing: **start with structured logs anyone can grep, graduate to aggregation, anomaly detection, and LLM triage as scale demands.**

---

## 3. The structured-log contract

The single most important thing in this doc. Every Agentryx app emits JSON lines (Pino default) with **mandatory** fields. Without this contract, none of the downstream tiers work.

### 3.1 · Mandatory fields

Every log line has these — non-negotiable:

| Field | Type | Example | Purpose |
|---|---|---|---|
| `t` (or `time`) | ISO 8601 string | `"2026-05-30T07:14:32.118Z"` | ordering, windowing |
| `level` | enum: `debug \| info \| warn \| error \| fatal` | `"error"` | severity routing |
| `app` | string | `"hirestream"` | cross-app rollup (Phase 5) |
| `env` | enum: `local \| ci \| stg \| prod` | `"stg"` | scope of analysis |
| `buildRef` | string | `"v0.4.44.0"` | regression attribution |
| `requestId` | uuid | `"r-7e8a..."` | trace per request across log lines |
| `route` | string | `"GET /api/v1/candidates/applications"` | per-endpoint aggregation |
| `statusCode` | integer | `200` | the obvious one |
| `durationMs` | integer | `158` | latency aggregation |
| `userRole` | enum or `"anon"` | `"candidate"` | per-role error rate |
| `userIdHash` | string (sha256, truncated) | `"sha-9f4a"` | **never raw user IDs**; allows per-user dedupe without PII |
| `msg` | string | `"interview status enum mismatch"` | human-readable summary |

### 3.2 · Conditional fields

Required *when applicable*:

| Field | When required | Example |
|---|---|---|
| `errorClass` | level ≥ `error` | `"ZodValidationError"` |
| `errorStack` | level ≥ `error` | `"at applyJob (server/...)"` |
| `targetId` | mutations | `"job:7e8a..."` (the entity being mutated) |
| `dbQueryMs` | DB-touching requests | `42` |
| `cacheHit` | cache-touching | `true` |

### 3.3 · Forbidden in logs

Hard rules — enforced by the logger config (Pino redact paths):

- ❌ Raw passwords, tokens, API keys, session IDs
- ❌ Raw email addresses (hash them: `email:sha-...`)
- ❌ Full PII (passport numbers, addresses, full names) — only hashes / first-name-only / counts
- ❌ Free-form bodies of user input (truncate to 200 chars max; redact if uncertain)

### 3.4 · Enforcement

- **In code**: a thin wrapper `lib/logger.ts` exposes typed log methods (`log.requestEnd({route, statusCode, ...})`) that *make it harder to omit a mandatory field* than to include it.
- **In CI**: a lint rule rejects raw `console.log` outside of `tests/` and `scripts/`.
- **At runtime**: a Pino `redact` config strips any field matching the forbidden list (defence in depth).

---

## 4. Three tiers of analysis

Progressive complexity. Each tier delivers value on its own; later tiers presume the earlier ones are in place.

### Tier 1 · Real-time anomaly detection
**Latency target:** seconds. **Dependency:** structured logs (§3) shipped to a queryable store.

Maintain a **rolling baseline** per `route × env`:

- error-rate (`statusCode ≥ 500 / total`)
- 4xx rate
- latency p50, p95, p99
- distinct `errorClass` count
- request count (catches *disappearance* — a route going silent is often as bad as one erroring)

A request batch (e.g. last 60 seconds) is compared to the baseline (e.g. trailing 24h, same hour-of-day). Alert when:

- error rate exceeds `baseline + 3σ`
- p95 latency exceeds `baseline × 2`
- a novel `errorClass` appears (not seen in the trailing 7 days)
- request count drops below `baseline × 0.3` for a route that normally sees traffic

Alerts route to:
- **Slack / channel** for warn-level (advisory)
- **PagerDuty / phone** for crit-level (sustained > 5 min)

### Tier 2 · Daily digest
**Latency target:** minutes (daily run). **Dependency:** Tier 1.

A single email / channel post, each morning. Built to be **read in 90 seconds**:

```
HireStream · stg · 24h digest · 2026-05-30
─────────────────────────────────────────────
  Errors: 47 (▼ 12% vs 7d avg)        Top routes by error rate:
  Slowest p95: /jobs/saved/my (1.8s)    1. /agencies/documents  4.1%   ← NEW
  Novel error classes: 2 (↑)            2. /candidates/profile  0.9%
                                        3. /admin/oversight/funnel 0.6%

  ⚠ ROUTE SHADOW SUSPECT  /agencies/documents 404 — 41 hits, all auth=agent,
    all to a literal child path. Compare to /:id pattern at agency.routes.ts:274.

  ⚠ ENUM-DRIFT SUSPECT   "interview" status value seen 38× from /api/...
    Canonical enum is "interview_scheduled" — see shared/schema.ts.

  Latency regressions vs 7d:
    /candidates/applications   p95 158ms ▲ from 84ms (+88%) — investigate.

  New errorClass seen first time:
    1. AgencyDocsNotFound  (41×, /agencies/documents)
    2. ApplicationStatusEnumMismatch  (38×, client side)
```

Crucially the digest is **opinionated and pre-triaged** — it doesn't dump raw logs, it surfaces the patterns. The two annotated examples above are the *kind* of finding the digest should surface — both are the 30 May bug class, both would have been flagged by this digest within 24h of shipping.

### Tier 3 · LLM-assisted triage
**Latency target:** minutes (on-demand or scheduled). **Dependency:** Tier 2 producing pattern candidates.

The hardest job in log triage isn't seeing that something's wrong — it's **clustering similar errors** and **proposing where in the code** to look. Both are tasks an LLM is genuinely good at, given the right framing.

Workflow:

1. Tier 2 surfaces an `errorClass` cluster (e.g. "41× `AgencyDocsNotFound` on `/agencies/documents`").
2. Triage script calls the Claude API with:
   - The cluster summary (route, count, sample messages, sample userRoles)
   - The relevant source files (the route handler + nearby routes)
   - The structured-log spec (so it knows what each field means)
3. Claude returns:
   - Hypothesised root cause (1-3 candidates ranked)
   - Specific lines in code to inspect
   - A draft issue title + description
   - A confidence level on the hypothesis
4. The output appears in the daily digest as a collapsible **"Proposed root cause"** section under each cluster.

Hard rules:
- Claude **proposes**, humans **confirm**. No auto-merge / auto-anything.
- Prompt is cached (Anthropic prompt cache); cluster summary + source snippets are the variable part.
- PII redaction: the request that reaches the API never contains user data — only hashes, counts, route names, error classes, source code.
- Cost cap: per-cluster trigger, with daily budget; auto-skip clusters seen and triaged in last 7 days.

What this gives you: a junior engineer reading the digest can act on it without a senior to interpret. The 6-hour incident timeline from §1 compresses to ~30 minutes.

---

## 5. Tools per tier

| Tier | Default tool | Cost / complexity | Graduates to |
|---|---|---|---|
| Logger | **Pino** (already standard) | zero, in every app | — |
| File-only collection | rotated JSON logs on disk | zero | — |
| Tier 1 (real-time) — local | bespoke `tools/log-analyzer/watch.mjs` (tail + Z-score) | minimal | — |
| Tier 1 — production | **Loki** + Promtail (self-hosted) or **Grafana Cloud Logs** | medium | OpenSearch / ELK if scale demands |
| Tier 1 alerting | **Alertmanager** (Loki) or Grafana alerts → Slack/PagerDuty | low | — |
| Tier 2 (digest) | `tools/log-analyzer/digest.mjs` — runs on cron, reads Loki, posts to channel | low | — |
| Tier 3 (LLM triage) | `tools/log-analyzer/triage.mjs` — Anthropic Claude API, prompt-cached | usage-based | — |
| Trace correlation | **OpenTelemetry** SDK → Loki/Tempo | medium | when cross-app work begins |
| Synthetic monitoring | **`deep-smoke.mjs` on cron** (already exists) | zero | — |

The progression matters: file-grep first, aggregation next, anomaly detection after, LLM triage last. **Each step delivers value alone.** Skipping ahead (e.g. wiring LLM triage onto un-structured logs) wastes most of the LLM call.

---

## 6. Phased buildout (this layer specifically)

Cross-references the full roadmap in `03_ROADMAP_AND_INTEGRATION.md`, but specifically for L4:

| Phase | Deliverable | Effort | Unblocks |
|---|---|---|---|
| **0 (today)** | Pino structured logs already in HireStream — partially mandatory-field compliant | done | nothing yet |
| **1** | Enforce the full mandatory-field schema (§3) across HireStream + Verify app; redaction config; `lib/logger.ts` wrapper | 1-2 days | everything downstream |
| **2** | `tools/log-analyzer/watch.mjs` — local file tail + Z-score on the 60s/24h baseline; Slack webhook on warn/crit | 1 day | real-time alerting (Tier 1) |
| **3** | Loki + Promtail on the staging VM; Grafana dashboards; alertmanager → Slack | 1 day | scale beyond single-host file logs |
| **4** | `tools/log-analyzer/digest.mjs` — daily Loki query → opinionated digest → channel post | 1 day | Tier 2 |
| **5** | `tools/log-analyzer/triage.mjs` — Claude API integration with prompt caching, source-snippet context, PII redaction | 2 days | Tier 3 |
| **6** | Cross-app rollup (HireStream + Verify + future apps) in a single digest; common error taxonomy | 2 days | cross-product visibility |

Total: ~9 dev-days to the full Tier-3 vision for HireStream. Substantially cheaper if the next Agentryx app is built on the same skeleton from commit #1.

---

## 7. How L4 feeds the confidence score

The runtime layer contributes its slice of the per-PR confidence score (`01_EMBEDDED_TESTING_ARCHITECTURE.md` §6) by surfacing **what changed in the wild** since the prior release:

- A PR that ships, then introduces a novel error class within 24h → its score retroactively drops by ~15 points (the `× 0.85` penalty in the score formula). This is visible in the trend chart.
- A PR that ships with *no* novel error class and no anomaly spike → its score is confirmed by lived experience, not just pre-deploy gates.

The point: the confidence score is not a one-shot moment-of-merge value. It's continuously re-evaluated by L4. Releases age into confidence (or out of it).

---

## 8. PII, security, and legal

A few hard constraints carried through every Tier:

- **No raw PII in logs.** Hashes only. Enforced by Pino `redact` config + a CI lint rule that fails on `log.X({email})` patterns.
- **Logs retained 90 days hot, 13 months cold.** Aligns with most regulatory baselines; adjusted per project.
- **LLM triage payloads stripped of PII before send.** The triage script *transforms* hashed identifiers and route names into the prompt; user-content fields are never in the payload.
- **Alerts go to a private channel.** Error messages can leak partial PII (e.g. an email validation error containing the email). Never auto-broadcast.
- **Audit trail of triage actions.** Every Claude API call's prompt + response is itself logged (with its own PII redaction). When something escapes triage, this lets us improve the prompt rather than guess.

---

## 9. Glossary cross-link

Repeated terms (*layer / signal / gate / confidence score / bridge*) are defined in `00_README.md` §Glossary. Tier-specific terms above are defined inline.
