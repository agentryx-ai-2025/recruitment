<!--
TASK BRIEF
SLUG: p03_p3_1_loki_promtail_alerts
PHASE: 03 — Full L4 + L5 confidence score
TIER: 🟡 (substantial — infra-rich cross-system work)
AG MODEL: Gemini 3.1 Pro (High)
WAVE: 1 (parallel with p03_p3_2 and p03_p3_5)
-->

# Task Brief — p03_p3_1_loki_promtail_alerts

**Assigned tier**: 🟡 — Gemini 3.1 Pro (High)
**Effort estimate**: 3 h
**Workspace**: DEV only — `hirestream/infra/` (NEW directory), `hirestream/docs/anomaly-detection-runbook.md` (NEW)
**Files NOT in scope**: any product code (`server/`, `client/`, `shared/`, `scripts/`). NO actual deployment to the staging VM — that's the operator's handoff.
**Deliverable QC report path**: `/home/subhash.thakur.india/Projects/Recruitment/PMD-Final wrapup/Testing & Verificaion/Testing Framework & Architecture/C6_Active_Tasks/QC_Reports/p03_p3_1_loki_promtail_alerts.md`

**Mandatory pre-reads:**
1. `/home/subhash.thakur.india/Projects/Recruitment/PMD-DevFactory/C_Agent_Orchestration/C1_Conventions_for_Agents.md`
2. `/home/subhash.thakur.india/Projects/Recruitment/PMD-DevFactory/C_Agent_Orchestration/C5_Failure_Modes.md` — **especially the Gemini Pro "over-confidence on unfamiliar codebases" warning from Phase 2 retro**. Loki + Promtail + alertmanager span 3 different config languages; your tier's failure mode is hand-waving over the integration details. Be specific.
3. `PMD-Final wrapup/Testing & Verificaion/Testing Framework & Architecture/02_LOG_MINING_AND_RUNTIME_OBSERVABILITY.md` §4 Tier 1 — the architectural intent. Read the alert-thresholds list (3σ error rate, 2× p95 latency, novel errorClass in 7d, request-count drop below 0.3×).
4. `PMD-Final wrapup/Testing & Verificaion/Testing Framework & Architecture/Phase_PRDs/Phase_03_PRD.md` §2 row P3.1 + §5 (risks).
5. `hirestream/tools/log-analyzer/digest.mjs` (P2.4 output) — the Tier 2 daily digest reads the same `logs/app.log` you'll be tailing here. Same NDJSON contract.
6. `hirestream/server/config/logger.config.ts` — confirms Winston's `logs/app.log` JSON output. Match.

**Phase 2 retro lesson — apply rigorously here:** the QC report MUST use the literal 9-section format from `PMD-DevFactory/C_Agent_Orchestration/C3_Templates/QC_Report_template.md`. Do NOT invent or rename section headings. Phase 2 saw severe abbreviation at every tier including Opus 4.6; this is non-negotiable.

---

## 1. Background — why this task exists

P2.4 ships a daily digest that catches issues within 24 h. That's a 24× improvement over "wait for users to report" — but a 4xx storm or 5xx burst on the morning of a release shouldn't have to wait until tomorrow's digest. **L4 Tier 1 is the real-time layer**: structured logs streamed into Loki, queryable per route × time, with alertmanager thresholds firing within minutes.

This is Phase 3 deliverable P3.1 (see `Phase_03_PRD.md` §2).

---

## 2. What you must change

### 2.1 — Discovery first (do NOT skip)

Answer in QC §3 BEFORE writing any config:

1. **What's the existing log-rotation config for `hirestream/logs/app.log`?** Winston typically rotates by size; Promtail needs to handle rotated files (`*.gz`). Check `server/config/logger.config.ts` and document.
2. **What's the staging VM's resource budget?** Loki + Promtail + Grafana at minimal config consume ~512 MB RAM + ~100 MB disk per day at the current log volume. Confirm with operator (note in QC §7 if blocking).
3. **Is there an existing Grafana instance?** If yes, this should connect to it rather than spin up a new one. If no, the docker-compose adds one.
4. **What's the Slack webhook URL pattern (or which env var holds it)?** P2.4 already uses `SLACK_WEBHOOK_URL` — reuse the same env. Document the channel naming convention (P2.4 went to `#deep-smoke-digest`; alerts should go to a separate `#deep-smoke-anomaly` per `Phase_03_PRD.md` §5).

### 2.2 — Create `hirestream/infra/docker-compose.loki.yml`

A docker-compose file that brings up:
- **Loki** (v2.9 or newer) — log aggregator + query engine. Single-node config for staging. File-system-backed storage (not S3) at `infra/loki-data/`. Retention: 90 days (per `02` §8).
- **Promtail** (matching Loki version) — log shipper. Tails `hirestream/logs/app.log` + `hirestream/logs/error.log` + the rotated `*.gz` siblings. Parses the JSON line per the Winston schema (P2.4 discovery: `timestamp`, `level`, `path`, `statusCode`, `duration`, `requestId`, `message`, `stack`).
- **Grafana** (latest LTS) — dashboards + alerting UI. Default admin password from env (operator-provided; don't commit a default).
- **Alertmanager** (Prometheus-compatible) — wired to Slack webhook from env.

Networking: all four on a shared docker network. Loki exposed on `:3100` (localhost only), Grafana on `:3000`, Alertmanager on `:9093`. No port published to public internet — the staging VM's nginx will proxy `/grafana` if the operator wants UI access (out of scope for this brief).

### 2.3 — Create `hirestream/infra/promtail.yaml`

Promtail's config. Specifically:
- Server section (port `:9080`, listen localhost).
- Positions file at `infra/promtail-positions.yaml` (in-volume — preserve cursor across restarts).
- Clients section: ship to `http://loki:3100/loki/api/v1/push`.
- **Single scrape config** for the HireStream Winston logs:
  - `job: hirestream-api`
  - `__path__: /var/log/hirestream/*.log` (the docker volume mount — operator maps `hirestream/logs/` to this path).
  - Pipeline stages: `json` parser extracting `timestamp/level/path/statusCode/duration/errorClass`, `labels` step elevating `level/path/statusCode` to Loki labels (cardinality is bounded — `path` is the API path template, not user data), `timestamp` step using the parsed `timestamp` field.

### 2.4 — Create `hirestream/infra/alertmanager.yaml`

Alertmanager config:
- Global: `slack_api_url` from env (substitute via docker-compose env section, not hardcoded).
- Single receiver: `slack-deep-smoke-anomaly`.
- Route: all alerts to that receiver; group by `alertname`; group_wait `30s`; repeat_interval `4h`.
- Inhibition rules: a `critical` alert suppresses a sibling `warning` on the same `(route, errorClass)` pair.

### 2.5 — Create the alert rules — `hirestream/infra/grafana-alerts.json` (or a `grafana-provisioning/` directory)

Four alert rules per `02 §4 Tier 1`:
1. **Error rate spike** — `rate(error_count{level="error"}[5m])` exceeds baseline + 3σ (use a tunable `error_rate_threshold` annotation; default 5/min).
2. **p95 latency regression** — `histogram_quantile(0.95, …)` for any route exceeds `2 × baseline_p95` for ≥5 min. (If Winston isn't emitting duration histograms, document in QC §7 — the agent should NOT instrument the application.)
3. **Novel error class** — an `errorClass` label value appears for the first time in the trailing 7 days, with ≥10 occurrences in the last 5 min.
4. **Route disappearance** — request count for a normally-active route drops below `0.3 × baseline` for ≥10 min.

If Grafana's alert rule JSON is awkward, use a YAML or HCL alternative the agent prefers; document the choice in QC §4.

### 2.6 — Create `hirestream/docs/anomaly-detection-runbook.md`

≤80 lines. Cover:
- **Operator deploy steps**: `docker compose -f infra/docker-compose.loki.yml up -d` on the staging VM; map the volumes; set the Slack webhook env; verify Promtail is shipping (`curl localhost:3100/ready`).
- **First-time alert tuning**: route alerts to `#deep-smoke-anomaly` for 1 week (advisory severity only) BEFORE promoting to `#oncall-pager`. Document the threshold-tuning workflow.
- **Adding a new alert rule**: edit `grafana-alerts.json`, redeploy Grafana via docker-compose.
- **Querying ad hoc**: a few example LogQL queries (`{job="hirestream-api"} |~ "errorClass.*NotFound"`, etc.).
- **Disaster recovery**: where Loki's WAL lives; how to recover after a crash.

### 2.7 — Do NOT auto-deploy from this brief

The agent writes the configs but does NOT run docker compose, does NOT push to staging. The runbook documents the deploy steps for the operator. **This is the operator handoff point** for P3.1.

---

## 3. What you must NOT change

- Do **NOT** modify any HireStream application code (`server/`, `client/`, `shared/`, `scripts/`, `tools/`, `lib/`).
- Do **NOT** modify `server/config/logger.config.ts` or instrument the application for Prometheus metrics. (If duration histograms are needed for alert rule #2 and Winston doesn't emit them, STOP and document in QC §7 — a separate brief will handle instrumentation.)
- Do **NOT** modify `tools/log-analyzer/digest.mjs` (P2.4's territory).
- Do **NOT** commit Slack webhook URLs, API keys, or any secret. Use env-var substitution (`${SLACK_WEBHOOK_URL}` etc.).
- Do **NOT** add new npm dependencies — this brief is all docker/config/yaml, no Node code.
- Do **NOT** modify `package.json`.
- Do **NOT** run `docker compose up`, `pm2 restart`, or any deploy action. The brief is config-only.
- Do **NOT** commit, push.

---

## 4. Validation steps (mandatory; paste raw output into QC §3)

```bash
cd /home/subhash.thakur.india/Projects/Recruitment/hirestream

# Step 1 — YAML lint
for f in infra/docker-compose.loki.yml infra/promtail.yaml infra/alertmanager.yaml; do
  python3 -c "import yaml,sys; yaml.safe_load(open('$f')); print('$f OK')" 2>&1 || echo "$f FAILED"
done

# Step 2 — docker compose config validates (without starting anything)
docker compose -f infra/docker-compose.loki.yml config 2>&1 | tail -20
# Expected: prints the merged config without errors

# Step 3 — promtail config dry-run validate
docker run --rm -v $PWD/infra/promtail.yaml:/etc/promtail/config.yml grafana/promtail:2.9.0 -config.file=/etc/promtail/config.yml -dry-run 2>&1 | tail -10 || echo "(promtail dry-run not available — manual review only)"

# Step 4 — grafana-alerts.json is valid JSON / YAML
node -e "JSON.parse(require('fs').readFileSync('infra/grafana-alerts.json','utf8')); console.log('OK')" 2>&1

# Step 5 — runbook present
wc -l docs/anomaly-detection-runbook.md
head -15 docs/anomaly-detection-runbook.md

# Step 6 — no secrets committed
grep -rE "hooks\.slack\.com|sk-|xoxb-|webhook.*[a-zA-Z0-9]{20,}" infra/ docs/ 2>&1 | head
# Expected: NO matches (or only the env-var reference like ${SLACK_WEBHOOK_URL})
```

**Expected outputs**: see inline.

---

## 5. QC report — required

**Use the literal template at** `PMD-DevFactory/C_Agent_Orchestration/C3_Templates/QC_Report_template.md`. Save to `C6_Active_Tasks/QC_Reports/p03_p3_1_loki_promtail_alerts.md`.

**Non-negotiable: all 9 sections, EXACT section headers from the template.** Phase 2 confirmed every tier abbreviates QC under apparently-automated dispatch including the highest. This brief restates: do not abbreviate, do not rename headers, do not omit §2 diffs even for new files.

Specifically for this task:
- §3 MUST include the §2.1 discovery answers (all 4).
- §4 MUST flag any deviation between Winston's actual log fields and the doc §3.1 contract (e.g. P2.4 discovered `duration` ≠ `durationMs`).
- §7 MUST surface the duration-histogram question (alert rule #2) if Winston doesn't already emit it.

---

## 6. After QC report is written, STOP

Do NOT commit. Do NOT push. Do NOT deploy. Architect integrates the configs into a single commit; operator runs `docker compose up` on the staging VM separately.

---

## 7. Acceptance — done when

> "`infra/docker-compose.loki.yml`, `infra/promtail.yaml`, `infra/alertmanager.yaml`, `infra/grafana-alerts.json` all parse clean; `docker compose config` validates without errors; `docs/anomaly-detection-runbook.md` documents the operator deploy steps; no secrets in any committed file. The four alert rules from `02 §4 Tier 1` are encoded (with at least a documented stub for the duration-histogram one if Winston doesn't emit yet)."
