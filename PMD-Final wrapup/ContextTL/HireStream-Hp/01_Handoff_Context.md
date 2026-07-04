# HireStream-HP · Handoff Context

**For the incoming agent picking up HireStream-HP.**
Author: Claude Opus 4.7 · Date: 4 Jul 2026 · Context version: v1.0

> Read this end-to-end before touching any code. It replaces the prior conversation as your working context. When you finish reading, follow the "First actions" checklist at the bottom.

---

## 0 · TL;DR — where we are, in three sentences

The multi-role `hirestream` portal at `hirestream-stg.agentryx.dev` (v0.7.7.0) is **frozen** — treated as an Agentryx capability asset and reference product. A parallel **`hirestream-hp/`** codebase has been forked at `hirestream-hp.agentryx.dev` (v0.1.0), running on port 5003 with its own Postgres DB, its own PM2 slot, its own SSL cert. **All UAT-03 sprint work and future HPSEDC-specific development happens on the fork — never on the reference.**

---

## 1 · Why we forked (the strategic pivot)

**Trigger:** the MD demo on 22-06-2026 produced a MOM with 20 UAT-03 items ([`../../UAT & Approval/UAT-03/Issue_List_Feature_Request.md`](../../UAT%20%26%20Approval/UAT-03/Issue_List_Feature_Request.md)).

**During the review**, Subhash decided:

1. **Simplify the multi-stakeholder model.** HPSEDC will operate as **the sole agency** in the portal. Employers will not self-register; other agencies (if any) work offline via HPSEDC. This removes the KYB verification flow for external agencies and the multi-role marketplace shape.
2. **Refocus on blue-collar overseas placement** — the actual user base for HPSEDC overseas employment programmes (construction, hospitality, driving, factory, care work). This is a genuine UX pivot — Hindi-first, pictorial, voice-input, WhatsApp-friendly — not just fewer fields.
3. **Preserve the current portal as an asset.** The multi-role architecture is valuable IP for other markets (states, PSUs, private) and for the Agentryx capability library. Rather than strip it down, we **fork** — starting a clean parallel instance for HPSEDC while leaving `hirestream` untouched.
4. **Items 16, 18, 19, 20 (multi-week new modules — post-visa support, fee section, monthly tracking, WhatsApp) are considered likely-non-practical** and will be discussed with the MD for descope. WhatsApp specifically may be reframed as a proper primary channel, not a bolt-on notification.

The fork name is deliberately **`hirestream-hp`** (not `hirestream-uat`) — UAT is a process, "HP" is a permanent product identity.

---

## 2 · What's already provisioned (all live, as of this handoff)

### 2.1 Codebase
- **`/home/subhash.thakur.india/Projects/Recruitment/hirestream-hp/`** — full rsync clone of `hirestream/` (minus `node_modules`, `dist`, `backups`, `logs`, test artefacts).
- `package.json` name → `hirestream-hp` (was `rest-express`).
- `VERSION` → `0.1.0` (fresh product SemVer).
- `.env` fully rewritten with new secrets (regenerated via `openssl rand -hex 32`, DO NOT reuse the `hirestream/` secrets) + new DB URLs + PORT=5003 + APP_URL.
- Kept intact: `client/`, `server/`, `shared/`, `tests/`, `scripts/`, `drizzle.config.ts`, `migrations/`, `A.PMD/`, `docs/`.

### 2.2 Database (both live)
- `postgresql://hirestream:hirestream@localhost:5432/hirestream_hp` — live DB, schema pushed via `drizzle-kit push`; seeded 15 destination countries + 5 system_config rows + 33 notification templates on first boot.
- `postgresql://hirestream:hirestream@localhost:5432/hirestream_hp_test` — Jest isolation target (empty; Jest will TRUNCATE + reseed).

### 2.3 Runtime
- **PM2 app `hirestream-hp`** (id 3), `cwd=/home/subhash.thakur.india/Projects/Recruitment/hirestream-hp`, script `dist/index.js`, listening on port 5003. State persisted (`pm2 save`) so it survives reboot.
- Existing `hirestream` (id 0, port 5000), `agentryx-verify` (id 1, port 5002), `hirestream-synthetic` (id 2, cron) — untouched.

### 2.4 Web layer
- Nginx site `/etc/nginx/sites-available/hirestream-hp.conf` symlinked into `sites-enabled/` — proxies `hirestream-hp.agentryx.dev` → `127.0.0.1:5003`.
- Let's Encrypt cert issued for `hirestream-hp.agentryx.dev` (expires 2026-10-02, autorenew scheduled by certbot).
- HTTP → HTTPS redirect enabled.

### 2.5 DNS
- A record `hirestream-hp` → `34.180.25.44` (same box as `hirestream-stg`). Registered by Subhash in Namecheap.

### 2.6 Verify portal
- New project row inserted in `agentryx_verify.projects` — slug `hirestream-hp`, name "HireStream-HP — HPSEDC single-agency, blue-collar variant". All new feedback for this fork will scope to this project.

### 2.7 Verified live
```bash
$ curl -fs https://hirestream-hp.agentryx.dev/api/v1/version
{"success":true,"data":{"version":"0.1.0"}}
```

---

## 3 · Anatomy of the fork — how it differs from `hirestream/`

At the moment, the ONLY differences from the reference portal are:

- `package.json` name
- `VERSION`
- `.env` (DB URL, PORT, APP_URL, secrets)

**Everything else is IDENTICAL to `hirestream/` at commit `bef9fdf` (multi-role v0.7.7.0).**

The trim / restructure / blue-collar UX work has NOT started. That is what Sprint 1 (below) begins.

**Practical implication:** if you run the app right now, it will look and behave EXACTLY like the multi-role portal — 5 roles, employer registration, agency KYB, all of it. Your job is to progressively trim to the single-agency, blue-collar shape without breaking what remains.

---

## 4 · Standing conventions (**must follow**)

Pulled from auto-memory + the multi-role handoff. Internalise before writing code.

- **Two-gate completion rule** — smoke the backend with the exact UI payload first, then click the UI. Both required before "done".
- **Verify-module sync** — every feature change syncs a Verify seed update **in the same commit cadence**. Use project slug `hirestream-hp`.
- **Never push to git remote without explicit user OK.**
- **Never destructive git operations without explicit instruction.**
- **Never skip hooks** (`--no-verify`).
- **All commits** end with `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>`.
- **Version bumps:** every functional change ships as a new SemVer patch/minor. Rebuild + `pm2 restart hirestream-hp`. VERSION is cached at server startup.
- **Never touch `hirestream/`, `hirestream-stg.agentryx.dev`, or the `hirestream` DB.** They are the reference / capability asset.
- **India blocked** — the country validator rejects India; this stays for HP too (overseas-only mandate).

---

## 5 · Runbook — the commands you'll run repeatedly

```bash
# Where the fork lives
cd /home/subhash.thakur.india/Projects/Recruitment/hirestream-hp

# Type-check + build
npm run check          # tsc — inherits ES2020 target from reference
npm run build          # esbuild + Vite → dist/index.js

# Test suites (against hirestream_hp_test)
npm test               # Jest — no seed carried over; you may need to add seed fixtures for HP
npm run test:deep      # Jest + deep-smoke combined

# Deploy (STG box, that's where you are)
pm2 restart hirestream-hp                # picks up new VERSION at startup
# Wait for the version to be live:
until curl -fs https://hirestream-hp.agentryx.dev/api/v1/version | grep -q "$(cat VERSION)"; do sleep 1; done

# DB access
PGPASSWORD=hirestream psql -h localhost -U hirestream -d hirestream_hp
PGPASSWORD=hirestream psql -h localhost -U hirestream -d hirestream_hp_test
PGPASSWORD=hirestream psql -h localhost -U hirestream -d agentryx_verify

# Log tail
pm2 logs hirestream-hp --lines 100 --nostream

# Schema changes (Drizzle)
# Edit shared/schema.ts, then:
npm run db:push        # applies against DATABASE_URL (hirestream_hp)
npm run db:push:test   # applies against TEST_DATABASE_URL (hirestream_hp_test)
```

**Nginx / SSL runbook (rare, only if adding routes or hitting cert issues):**
```bash
sudo -n cat /etc/nginx/sites-enabled/hirestream-hp.conf
sudo -n nginx -t && sudo -n systemctl reload nginx
sudo -n certbot renew --dry-run                 # verify cert autorenew works
```

---

## 6 · Landmines to avoid (fork-specific)

- **Don't share secrets between the two portals.** SESSION_SECRET and JWT_SECRET in `hirestream-hp/.env` are freshly generated. If you regen them for any reason, invalidate all sessions on this instance — don't copy from `hirestream/`.
- **Don't run `db:push` against `hirestream` DB by accident.** Drizzle reads DATABASE_URL. Always confirm you're in `hirestream-hp/` (`pwd`) before running.
- **Don't restart `hirestream`.** Only `hirestream-hp`. Getting these mixed up would kill the reference product on staging.
- **VERSION file** is what the server reads at startup. Bump → rebuild → `pm2 restart hirestream-hp` — otherwise the footer shows old version.
- **`truncateAllTables()` cascade** in Jest still requires reseed of country_info + `loadValidCountries()`. Same rule as reference.
- **Local curl with `-H "Host: hirestream-hp.agentryx.dev"` on port 80 hit the wrong upstream during setup** — an nginx virtual-host quirk. External HTTPS works fine. Verify via public URL, not local Host header spoofing.
- **10 new Verify-portal feedback items (FB-2026-0008 → 0017) were filed against the REFERENCE portal, not this one.** Do not confuse the queues. New feedback captured via this instance should scope to `hirestream-hp` project.
- **Blue-collar UX is a design pivot** — don't just port the multi-role forms wholesale. Every form and screen needs a re-think. See `04_Blue_Collar_UX_Principles.md`.

---

## 7 · Sprint 0 (already done in this handoff session)

- ✅ DBs provisioned
- ✅ Codebase forked with fresh secrets, VERSION 0.1.0
- ✅ PM2 slot registered, port 5003, running on `dist/index.js`
- ✅ Nginx virtual host + Let's Encrypt SSL
- ✅ `https://hirestream-hp.agentryx.dev/api/v1/version` returns `{"version":"0.1.0"}`
- ✅ Verify portal project `hirestream-hp` seeded
- ✅ These context docs written

**Nothing has been trimmed or restructured yet.** The fork is running the multi-role code identical to the reference.

---

## 8 · Recommended sprint order (starting from here)

The order below is opinionated but justified. It's shaped by: (a) MD-meeting outcomes may reshape scope, so start with reversible work; (b) UX pivot changes almost every screen, so land the UX shell BEFORE new feature logic; (c) items 1-3, 9 from UAT-03 apply almost unchanged, so ship them first as a trust-builder.

| Sprint | What | Version target | Est. |
|---|---|---|---|
| **HP-1 · Wait for MD** | Await MD meeting outcome on items 16-20 disposition + fork approval + blue-collar depth answers | v0.1.0 (no code) | Days 1-3 |
| **HP-2 · Fast wins + rebrand** | UAT items 1, 2, 3, 9, 11 (labels). Rebrand landing/header to "HireStream-HP" or approved name. Nothing else. | v0.2.0 | Day 4-5 |
| **HP-3 · Trim to single-agency** | Remove employer-role UI + routes; remove agency-registration flow; make HPSEDC the fixed single agency. Keep candidate + admin flows. Migrate DB (drop / disable relevant tables' UI paths). | v0.3.0 | Days 6-10 |
| **HP-4 · Profile wizard + blue-collar UX pass 1** | UAT items 4, 5, 6, 7, 8, 10, 12. Hindi as **default** locale. Pictorial job categories (icon cards). Simplified 1-question-per-screen wizard. Larger touch targets, higher contrast. | v0.4.0 | Days 11-18 |
| **HP-5 · Business rules** | UAT items 13, 14, 15, 17. Job-specific documents. Country-rejected filter. Grievance workflow overhaul (informed by blue-collar model). | v0.5.0 | Days 19-24 |
| **HP-6 · Voice + WhatsApp (if approved by MD)** | Voice input for text fields (Speech API where supported, fallback to typing). WhatsApp as primary notification channel (BSP-mediated). This is where item 20 gets a proper reframe. | v0.6.0 | Days 25-40 (external gates parallel) |
| **HP-7 · Verify + Post-visa (if MD keeps 16/19)** | Post-visa 3-mo support ticket + monthly self-check-in. HPSEDC or agency-partner owns triage. Optional module. | v0.7.0 | Days 41-50 |
| **HP-8 · UAT-03 acceptance + closure** | Rerun all 20 items against v0.6.x/v0.7.x, ship acceptance report, request Milestone-2 (40%) payment. | v1.0.0 | Days 51-55 |

**Total: ~8-11 calendar weeks** with realistic MD-decision + external-gate cushion. Some parallelism possible between HP-4 and the external tracks in HP-6.

**Rationale for HP-3 before HP-4:** trimming the multi-role skeleton first means the wizard-restructure work in HP-4 doesn't waste effort on forms that are about to be deleted.

**Rationale for HP-2 before HP-3:** ships something visible + working within 48 hours of MD meeting closure — buys goodwill and shows momentum.

---

## 9 · First actions for the new agent (checklist)

Do these in order at the start of the next session — do not skip:

1. **Read [`README.md`](./README.md)**, this file, then [`02_UAT-03_Issues_and_Fork_Plan.md`](./02_UAT-03_Issues_and_Fork_Plan.md), then [`03_Open_Decisions.md`](./03_Open_Decisions.md).
2. **Verify live state — do not begin work until these all pass:**
   ```bash
   curl -fs https://hirestream-hp.agentryx.dev/api/v1/version   # expect 0.1.0
   curl -fs https://hirestream-stg.agentryx.dev/api/v1/version  # expect 0.7.7.0 — reference intact
   pm2 list --no-color | grep hirestream                        # expect hirestream + hirestream-hp both online
   cd /home/subhash.thakur.india/Projects/Recruitment/hirestream-hp && npm test 2>&1 | tail -6
   ```
   If reference (`hirestream-stg`) is missing or the wrong version, HALT and diagnose. Do not "fix" it.
3. **Run `git status` at the repo root.** The fork is not yet committed to git — either untracked or partially tracked. Ask Subhash for commit strategy (monorepo add, or new repo?). Do not `git add` blindly.
4. **Ask Subhash the open questions in [`03_Open_Decisions.md`](./03_Open_Decisions.md)** — specifically the MD-meeting outcome on items 16-20, and the three blue-collar UX depth decisions. **Do not start Sprint HP-2 code work until those are answered.**
5. **Once cleared, propose Sprint HP-2** (fast wins + rebrand) with the specific label / copy changes for UAT items 1, 2, 3, 9, 11. Get explicit go-ahead before writing code.
6. **Create a STATUS.md** in this folder as a running tracker (per-item state: planned / in progress / shipped / awaiting HPSEDC / blocked). Update every session, same commit as the code change.

---

## 10 · What this session shipped (for provenance)

Session identifier: Claude Opus 4.7 · session `0547f825-9f83-4ebb-b4f9-5448ccca78f1` · 4 Jul 2026.

Prior work in the same session (before this handoff):
- **v0.7.7.0 sprint** on the reference portal — a11y (Skip to Content / Screen Reader / new `/accessibility` page), signup confirm-password, reviewer keyboard shortcuts A/P/R/W, TS baseline cleared to ES2020, schema-fuzz harness alignment. 502/502 Jest still green.
- **Agentryx Project Profile** for HireStream (multi-role) — `.md` + A4 `.pdf` in `PMD-Final wrapup/00.Project Profile/`.
- **UAT-03 initial analysis** — early doc at `PMD-Final wrapup/UAT & Approval/UAT-03/UAT-03_Handoff_and_Sprint_Plan.md`. That doc is now superseded by this folder's `02_UAT-03_Issues_and_Fork_Plan.md` because the fork decision changes the shape of the plan.

**Fork infrastructure delivered in this session** (§7 above).

---

## 11 · Subhash's working style (respect these)

- Prefers direct answers, not options-menus. Give a recommendation with the tradeoff, not a survey.
- Wants to be asked before destructive actions or scope expansion.
- Reads the diff — don't summarise what the diff already shows.
- Corrects fake team sizes and fake numbers instantly — be honest.
- Trusts the sprint-and-ship cadence, not big-bang releases.
- Values the two-gate completion rule — do not skip it even under time pressure.
- Values the **preservation of the multi-role portal** as a strategic asset — never suggest merging or removing it.

---

**End of handoff. Go read `02_UAT-03_Issues_and_Fork_Plan.md` next.**
