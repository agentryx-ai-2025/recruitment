# HireStream-HP · Delivery Appendix — value beyond the 20 issues

**Purpose.** A running, report-ready record of *every* enhancement, feature, and
polish delivered on HireStream-HP **beyond** (and alongside) the 20 UAT-03 issues.
This becomes the **Appendix** to the UAT-03 acceptance report, so HPSEDC sees the
full value delivered — not only the contracted twenty.

**Convention.** Every entry: what · why (value) · where (version / commit).
Maintained every working session in the same cadence as the code. UAT-03
line-item status lives in [`STATUS.md`](./STATUS.md); designed-but-unbuilt ideas
live in [`05_Enhancement_Roadmap.md`](./05_Enhancement_Roadmap.md).

Legend: ✅ delivered · 🟡 partial/foundation · 📐 designed (roadmap).

---

## A · Architecture & platform (strategic, not in the 20)

| # | Item | Value | Where |
|---|---|---|---|
| A1 | ✅ **Product fork** — HireStream-HP as a fully separate app (own folder, DB, PM2 instance, SSL, DNS) | Preserves the multi-role portal as a reusable Agentryx asset while HPSEDC gets a dedicated variant | v0.1.0 |
| A2 | ✅ **Capability-flag layer** (`capability.*` settings) — single-agency by config, fully reversible | "Disable-not-delete": flip flags to re-expand to a marketplace; zero code change; multi-agency-ready for the future | v0.2.0 / HP-3a |
| A3 | ✅ **HPSEDC mega-agency** seeded on boot (verified agency + operator) | Models HPSEDC as the sole agency now, add others later with no rework | v0.3.0 / HP-3b |
| A4 | ✅ **Single-mode job ownership** — all jobs auto-owned by the mega-agency | Correct ownership for the demand-driven govt model | v0.3.0 / HP-3b |
| A5 | ✅ **Slim admin** — external employer/agency approval UI hidden when disabled | Cleaner day-to-day admin for HPSEDC staff | v0.3.0 / HP-3b |
| A6 | ✅ **Public config endpoint + client capability hook** | Lets the UI adapt to deployment config (net-new infra the reference lacked) | v0.2.0 / HP-3a |

## B · Data model foundation

| # | Item | Value | Where |
|---|---|---|---|
| B1 | 🟡 `candidate_education.is_passed` + `.university` | Backs UAT-6 + UAT-7 | HP-4a |
| B2 | 🟡 `candidates.experience_months` (+ backfill) | Backs UAT-10 (precise blue-collar experience) | HP-4a |
| B3 | 🟡 `candidate_languages` table | Backs UAT-12 (first-class language proficiency) | HP-4a |

## C · Features & UX delivered

| # | Item | Value | Where |
|---|---|---|---|
| C1 | ✅ UAT-1 "Sex" → "Gender", UAT-3 "Address" → "Correspondence Address" | MD MOM fixes | v0.4.0 / HP-2 |
| C2 | ✅ UAT-6 "Passed/Completed" toggle + UAT-7 "University/Affiliating Body" field in Education | MD MOM fixes, blue-collar-clear | v0.4.1 / HP-4b.1 |
| C3 | ✅ UAT-12 Language proficiency — full CRUD API + wizard section (quick-add chips, Basic→Native) | First-class language capture for overseas placement; dedup-guarded | v0.4.2 / HP-4b.2 |
| C4 | ✅ UAT-10 Experience in months (+ live "≈ N yrs" hint); **matching engine reads months** | Precise blue-collar experience; better match scores | v0.4.2 / HP-4b.3 |
| C5 | ✅ UAT-5 Duplicate-education guard (server 409 + client message) | Data hygiene; no two "10th Grade" rows | v0.4.3 / HP-4b.4 |
| C6 | ✅ UAT-9 Certification vs Skill Course helper (blue-collar examples) | Clear differentiation; ITI/NSDC trade certs land right | v0.4.3 / HP-4b.4 |
| C7 | ✅ UAT-4 Identity section mandatory (Gender + parents' names gate the wizard) | Emigration-paperwork completeness enforced up front | v0.4.4 / HP-4b.5 |
| C8 | ✅ Seed refresh — `experience_months` on all candidates + `candidate_languages` (Hindi/English/Arabic) | Fresh demo/test data exercises the new HP-4b features | v0.4.4 / HP-4b.5 |
| C9 | ✅ **Blue-collar simplified application flow** (`/apply`) — 7 one-question screens, pictorial trades, education-as-levels, designed w/ Fable 5 | The fork's core UX pivot: a form a mason/plumber can actually complete; same schema | v0.5.0 / HP-4c |
| C10 | ✅ Matching: `below_matric` qualification tier | No-schooling/5th/8th candidates score fairly, not as blank | v0.5.0 / HP-4c |
| C11 | ✅ `/apply` wired as the **default** candidate entry + 3-role one-click demo (Candidates·Super Agency·Admin) | Coherent blue-collar entry; easy demo/testing | v0.5.2 |
| C12 | ✅ **Simplified blue-collar candidate dashboard** (default; detailed via `?full=1`), designed w/ Fable 5 | A mason/driver instantly sees profile + application status + help | v0.5.4 |
| C13 | ✅ Admin slim-down (agency CSV export + leaderboard gated) | HPSEDC admin console reads single-agency | v0.5.3 |

## D · Quality, testing & reliability (engineering value)

| # | Item | Value | Where |
|---|---|---|---|
| D1 | ✅ **Test DB provisioned** — `hirestream_hp_test` had 0 tables; schema pushed | Fork's test suite was 100% failing on a setup gap; now runnable | HP-3a session |
| D2 | ✅ **Grievance test corrected** to the complainant-confirms model (+ 403 guard coverage) | Test now matches real product behaviour; better coverage | HP-3a |
| D3 | ✅ **data-isolation suite rebuilt hermetic** (was orphaned + skipped) | Self-seeding tenant-isolation coverage; guards the multi-agency expand path | HP-3b |
| D4 | ✅ **capability-gating test** (gate both ways + single-mode association) | Locks the single-agency behaviour against regression | HP-3a/b |
| D5 | ✅ **Fixture-deletion bug fixed** (`documents.test.ts` was deleting a committed fixture each run) | Stops spurious git deletions after every `npm test` | fixture commit |
| D6 | ✅ **Clean green baseline** — full suite 497/497, 0 skipped (was 15 skipped) | Trustworthy regression net before feature work | HP-3b→HP-4a |

## E · Known follow-ups / notes

| # | Item | Note |
|---|---|---|
| E1 | `dotenv-cli` not installed → `npm run db:push:test` broken | Workaround in place; install to restore the script |
| E2 | Mega-agency seeded with fallback password | Set `DEFAULT_AGENCY_PASSWORD` + rotate before go-live |

## F · Designed enhancements (roadmap — see 05)

| # | Item | Bundles into |
|---|---|---|
| F1 | 📐 Agency-side "Top Matched Candidates" (proactive two-sided matching + filters/weights) | HP-5 |
| F2 | 📐 Candidate-side blue-collar filters (trade filter, salary sort, dual currency) | HP-4c |
| F3 | 📐 Salary-expectation redesign (structured job salary, derived percentile bands, dual-currency bounded input, guardrails) | HP-5 / UAT-14 |

---

_Last updated: 2026-07-05 (session), after HP-4c — 9 of 20 UAT items live + the blue-collar `/apply` flow (the fork's core UX pivot)._
