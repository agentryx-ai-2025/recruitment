# HireStream-HP · Enhancement Roadmap (value-adds beyond UAT-03)

**Purpose.** Three enhancements designed in session (4 Jul 2026) that go *beyond*
the contracted UAT-03 twenty. They are captured here so they aren't lost, and
**bundled into the relevant sprints** so they ship with related work — but
tracked **distinctly** from the 20 so UAT-03 *acceptance* (measured against the
20) stays clean and these read as bonus value, not scope-creep.

Author: Claude Opus 4.8 · in partnership with Subhash (the demand-driven model,
the "unreasonable salary" catch, and the "sample from published jobs" idea are his).

---

## Bundling map

| # | Enhancement | Bundles into | Related UAT item | Status |
|---|---|---|---|---|
| 1 | Agency-side matching — "Top Matched Candidates" | **HP-5** (Smart Importer companion) | none (net-new) | Designed |
| 2 | Candidate-side blue-collar filter gaps | **HP-4c** (blue-collar UX) | none (polish) | Designed |
| 3 | Salary-expectation redesign | **HP-5 / UAT-14** (this *is* item 14 done right) | **UAT-14** | Designed |

**Acceptance note:** UAT-03 sign-off is scored against the 20 items only. #1 and
#2 are bonus. #3 delivers UAT-14 and *also* adds value beyond its literal ask.

---

## 1 · Agency-side matching — "Top Matched Candidates"

**Problem.** The matching engine today is one-directional: proactive
recommendations exist only for **candidates** (`GET /recommendations/for-me` →
top jobs). The **agency** side only *ranks candidates who already applied* — it
never proactively surfaces best-fit candidates for a demand. In a demand-driven
model ("a foreign govt needs 50 masons"), the agency-side feed is arguably the
*more* valuable half and doesn't exist.

**Naming.** "**Top Matched Candidates**" (engine output) — NOT refer/endorse/
recommend, which stay reserved for the interview-scorecard *verdict* (UAT item 2).

**Design — three layers:**
1. **Base ranking (exists):** the 7-factor aggregate score, per candidate↔job
   pair, ranked high→low. Stable, auditable, explainable. Never mutated.
2. **Hard filters (must-haves per demand):** gate the list by non-negotiables
   from the demand letter — trade test = pass, language ≥ level, ≥ N years.
   Higher priority than re-weighting: a great aggregate score with no trade test
   is useless for that demand.
3. **Soft re-prioritisation:** *within* the filtered set, boost a parameter for
   this demand. Start with **secondary sort** ("sort top matches by Language ▾" —
   uses stored per-factor scores, zero recompute); then optional **weight
   sliders** that re-rank live (stored scores stay immutable → audit intact).

**Force-multipliers:**
- **Saved "demand weight profile"** per job/demand (Gulf construction ≠ Japan
  caregiving), set once.
- **Smart Importer (HP-5) auto-fills** the filters/weights from the demand letter.
- **Explainability preserved** — when a re-weight moves someone up, show the delta.

**Effort:** real feature (agency-facing view + filter/weight UI + reverse query),
a few days. Scoring logic already exists. Sequence with HP-5.

---

## 2 · Candidate-side blue-collar filter gaps

The candidate browse (`JobSearchBoard`) already has search + country filter +
sort-by-match/date/salary + the "Recommended For You" feed. It's the *more*
complete half. Gaps are blue-collar polish (none are UAT items):

- **Trade/category filter** — candidates can filter by country but not by their
  *trade* (mason/driver/cook). First filter a blue-collar user wants; pairs with
  the **pictorial category grid** (HP-4c).
- **Salary sort is a stub** — code literally comments "salary sort would need
  numeric parsing" and does nothing. Blue-collar users rank pay highly → fix it.
- **Dual currency** (SAR + INR) — display only (see #3).
- **Optional naming:** "Recommended Jobs" → plainer "Jobs For You" / "Best
  Matches" for low-literacy users. HPSEDC's call; bundle with item-2/11 wording.

Also: this browse filters **client-side** (fetches all, filters in browser).
Fine now; move server-side if demand volume grows.

**Bundles into HP-4c.**

---

## 3 · Salary-expectation redesign (this *is* UAT-14)

**Problem (official feedback).** Candidate salary expectation was a *scoring
input*, so an unrealistic number mis-scored the candidate (unfairly penalised, or
gamed). A great mason shouldn't rank lower for writing an optimistic figure.

**Two conclusions locked in:**
- **Scoring toggle = nothing to build.** Salary is already a *weighted* factor in
  the 7-factor engine; weights are admin-tunable at runtime. Dial it low or to 0.
- **The job listing needs a structured salary** — today `jobs.salary` is free
  text; that's the root weakness.

**Key insight:** make bad input *impossible*, not just discouraged — bound the
input at the source; the candidate picks *within a correct range*, never a blank box.

**Mechanism:**
- **Structure job salary:** `salary_min` / `salary_max` / `salary_currency`,
  entered at posting (no extra work — HPSEDC writes salary anyway). This is the
  cap source.
- **Derive bands, don't hand-configure them (Subhash's Option 2):** the engine
  aggregates published-job salaries per **profession × country × currency** and
  derives the band. Self-maintaining; no band-table upkeep. Safeguards:
  1. **Percentiles (P10–P90), not raw min/max** — one typo'd job won't blow up
     the range. *Most important safeguard.*
  2. **Seed reference table (MEA/NSDC) as cold-start backstop** — use it until
     ≥ N (~5) real jobs exist for that profession×country, then switch to derived.
  3. **Bucket by profession × country × currency**, recompute nightly/weekly.
  - **Bands:** 3 tiers (entry/mid/high) from the P10–P90 range. Simple.
- **Candidate input = dual-currency bounded slider:** default **INR** (they think
  in rupees) with a toggle to destination currency; live equivalent always shown;
  slider **capped** at the job's `salary_max` (job context) or the derived band
  max (profile context). Store canonically (amount + currency + rate-at-entry);
  normalise to the job's currency for any cap/filter/score.
- **Guardrails on BOTH fields:**
  - Job salary: `min ≤ max`, currency required, warn-if-outside-band (catches a
    demand-letter typo). Smart Importer pre-fills; HPSEDC confirms.
  - Candidate expectation: structurally bounded by the slider; **missing =
    neutral** in scoring (never penalise a blank).
- **Exchange rate:** small `currency_rates` table refreshed weekly (Frankfurter /
  ExchangeRate-API); one `<Money>` dual-display component; rate-at-entry stored.

**Honest caveat:** until real job volume exists, derived bands are only as good as
the seed backstop — safeguard #2 is not optional; it carries the first few months.

**Bundles into HP-5 / UAT-14.**

---

## Cross-reference

- UAT items + sprint plan: [`02_UAT-03_Issues_and_Fork_Plan.md`](./02_UAT-03_Issues_and_Fork_Plan.md)
- Blue-collar principles: [`04_Blue_Collar_UX_Principles.md`](./04_Blue_Collar_UX_Principles.md)
- Live status: [`STATUS.md`](./STATUS.md)
