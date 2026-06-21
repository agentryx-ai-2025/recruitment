# HireStream — STAGING Readiness Phase Plan

**Created:** 2026-05-27 · **Owner:** Subhash + Claude · **Target:** HPSEDC hand-off ready

This plan groups every outstanding item from:
1. **HPSEDC Test Feedback Final** (8 items, dated today) — `PMD-Final wrapup/Corrections & Bug Fixes/HPSEDC_Test_Feedback_Final.docx`
2. **Employer dashboard best-practice rework** (your earlier feedback in chat) — current employer view is functionally-equivalent to agent but the wrong mental model for an employer
3. **Standing follow-ups carried over** — UX dead-ends from the v0.4.17 audit, Verify portal seed sync (22 versions stale), Metro under systemd
4. **Matching Engine v2 spec** — companion document at `Architecture & Logic/HireStream_Matching_Engine.pdf`

…into **5 phases**, sequenced so each phase ends at a clean shippable state. Estimated **~7 working days** total — Phase 1 inflated by 0.5d to absorb three gap-closures identified during coverage review (existing-field surfacing, expanded document-type vocabulary, full HPSEDC category seed); Phase 3 inflated by 0.5d to absorb the Matching Engine Parameters admin module + IELTS-aware language scoring.

---

## Phase 1 — Foundation Fixes (~1.5 days · v0.4.31)
**Goal:** Close every quick-win HPSEDC item end-to-end so the next phase starts on a clean base. Tightened to absorb three gap-closures identified during coverage review (marked **★** below — without these, HPSEDC retest would flag the same items again because the existing fields are not surfaced/expanded correctly).

### Code changes
| HPSEDC ref | What | Where |
|---|---|---|
| Item 6 | Remove "Candidates with 3+ years get significantly better matches" hint | `candidate-profile-form.tsx:369` + `profile-wizard.tsx:737` |
| Item 4 (new) | Add `fatherName`, `motherName`, `permanentAddressLine1/2`, `permanentCity`, `permanentPinCode` to candidates schema | `shared/schema.ts` + drizzle migration |
| Item 4 (new) | Wizard form fields + validation for above | `profile-wizard.tsx` |
| **Item 4 ★ (gap A)** | **Surface existing passport / preferred country / language proficiency fields as first-class wizard sections** (they exist but are buried in the Compliance panel — HPSEDC didn't notice them). Reorganise the wizard into 6 clearly-labelled sections: Identity · Address · Education · Experience · Documents · Compliance &amp; Preferences (passport, country, language). | `profile-wizard.tsx` |
| Item 7 | Persistent ✓ tick mark on each document slot after upload — slot shows uploaded filename + Remove button instead of just toast-and-disappear | `profile-wizard.tsx` document section |
| **Item 7 ★ (gap B)** | **Expand `documents.type` enum** from `cv \| passport \| certificate \| other` to all HPSEDC-listed types: `cv \| passport \| identity_proof \| educational_certificate \| experience_certificate \| offer_letter \| other`. UI shows a dedicated slot per type with its own ✓ indicator. | `shared/schema.ts` + `document.routes.ts` validation + `profile-wizard.tsx` |
| Item 8 (schema) | Add `jobs.category` enum + controlled vocabulary | `shared/schema.ts` + seed |
| **Item 8 ★ (gap C)** | **Seed the controlled vocabulary with HPSEDC's exact 10 categories**: Factory Worker · Construction Worker · Driver · Electrician · Plumber · Helper · Technician · Hospitality Staff · Caregiver · Warehouse Worker. Plus additional admin-extendable: Healthcare · IT · Engineering · Sales · Education · Other. | seed script |
| Item 8 (UI) | Category dropdown on Job Poster form (required) · category badge on every job card · category filter on Browse Jobs + Applications Pipeline | `job-creation-form.tsx` + listing pages |

### Verify portal sync
- Seed new feedback items + schema items into Verify so testers can sign them off
- Add explicit test cases per HPSEDC item: "candidate sees Father/Mother name fields", "candidate sees passport slot in Identity section", "Experience Certificate has its own upload slot", "job posting requires a category from the controlled list", "Browse Jobs filter by Caregiver shows only caregiver roles"
- Buildref bump: current → next minor

### Test
- 7 new integration tests:
  - candidate registration with parent names persists round-trip
  - permanent address distinct from current address (both can be filled independently)
  - passport / preferred country / language fields visible in wizard top-level (not nested in Compliance)
  - document upload for each of the 6 new doc types sets persistent ✓
  - rejected MIME types do not show ✓
  - job posting without category → 400 validation error
  - Browse Jobs filtered by "Driver" returns only driver-category jobs

### HPSEDC item coverage at end of Phase 1
| Item | Coverage after Phase 1 |
|---|---|
| 4 — Candidate fields | ✅ All 6 sub-fields visible + persistent (Father/Mother new + Passport/Country/Language surfaced) |
| 6 — Experience hint | ✅ Removed |
| 7 — Document upload | ✅ Persistent ✓ + 6 distinct doc-type slots covering HPSEDC's full list |
| 8 — Job categories | ✅ Controlled vocab seeded with all 10 HPSEDC categories + 6 extras; required on post; filterable everywhere |

### Deliverable
v0.4.31.0 shipped. **Outcome:** Phases 1's HPSEDC items (4, 6, 7, 8) closed completely, not partially. HPSEDC retest of these four items should pass on first attempt.

---

## Phase 2 — Verification Workflows (~1.5 days · v0.4.32)
**Goal:** Close the two big workflow gaps HPSEDC flagged (Items 1 and 3) — employer verification doesn't exist, agency verification is minimal.

### Employer Verification (Item 1)
- **Schema:** new `employer_documents` table (employerId, type, fileUrl, status, uploadedAt, verifiedAt, verifiedBy)
- **Frontend:** `EmployerRegisterForm` component for first-time employer onboarding
  - Required fields: company name, CIN, GST, PAN, registered office address, authorised signatory name + ID type/number, contact email/phone
  - Required uploads: CIN/registration certificate, GST cert, PAN card, authorised signatory ID, office address proof
  - Optional uploads: Labour/recruitment permissions, agreement/undertaking
- **Admin queue:** new tab in Admin Console → "Employer Approvals" with Approve / Reject (with reason) workflow
- **Dashboard banner:** if `employers.verified === false`, show "Verification pending — admin will review within 48 hours" on employer dashboard; gate Post Job until verified
- **Notification:** candidate gets verification-result email + in-app

### Agency Verification (Item 3)
- **Schema:** new `agency_documents` table (mirrors employer_documents)
- **Frontend:** extend `AgencyRegisterForm` with all 9 docs HPSEDC listed:
  - MEA RA License (mandatory + verify license number against MEA pattern)
  - Certificate of Incorporation/Registration
  - PAN Card
  - GST Registration
  - Office Address Proof
  - Authorised Signatory ID Proof
  - Labour/Recruitment Permissions (if applicable)
  - Experience/Work Orders related to overseas recruitment (multi-upload)
  - Agreement/Undertaking
- **Admin queue:** existing Agency Approvals tab extended with doc review section + reject reasons
- **Status tracking:** banner on agent dashboard if not verified; verification log audit

### Verify portal sync
- New Verify project section "Verification Workflows" with seed items for both flows
- Demo accounts: unverified employer + unverified agent for testers

### Test
- E2E tests:
  - Employer register → docs upload → admin approves → employer can post jobs
  - Agent register → docs upload → admin approves → agent can pick requisitions
  - Reject flow surfaces reason on rejected user's dashboard

### Deliverable
v0.4.32.0 shipped. **Outcome:** Both employer and agency workflows are HPSEDC-compliant for production go-live.

---

## Phase 3 — Matching Engine v2 + Parameters Module + Education Polish (~2 days · v0.4.33)
**Goal:** Address HPSEDC Items 2 and 5 — extend matching per spec, build admin Parameters module, polish education data model. Reference spec: `Architecture & Logic/HireStream_Matching_Engine.pdf` (3-page approved doc).

### 3A. Matching Engine v2 — Schema & Engine
- **Schema additions on candidates:**
  - `qualificationLevel` text — school / diploma / bachelor / master / doctorate
  - `preferredCategories[]` text array
  - `preferredSalaryMin`, `preferredSalaryMax`, `preferredSalaryCurrency`
  - `languageProficiency` jsonb (already exists; structured as `{ english: "C1", hindi: "native", ... }`)
  - `ieltsBand` decimal (already exists; surface in wizard)
- **Schema additions on jobs:**
  - `category` (lands in Phase 1, required)
  - `qualificationRequired` text (nullable)
  - `languagesRequired` jsonb (nullable) — `{ english: "B2", arabic: "A2" }` for CEFR or `{ english_ielts: 6.0 }` for IELTS countries
  - `requiredIeltsBand` decimal (nullable) — convenience field for IELTS countries
- **Engine rewrite:** 7-factor scorer per spec (Skills 30 / Exp 20 / Qual 10 / Country 15 / Lang 10 / Cat 10 / Salary 5); weights + missing-criteria policies + threshold read from `system_settings.matching.*` on every score request
- **IELTS-aware Language factor (HPSEDC ask):**
  - For IELTS countries (UK / AUS / NZ / CAN / IE), use the candidate's `ieltsBand` against `job.requiredIeltsBand` — meets/exceeds = full marks, one band below = half, more below = 0
  - For other countries, use CEFR (A1–C2) levels in `languageProficiency` jsonb
  - Engine auto-selects CEFR vs IELTS based on `job.country` — no extra config needed on the job posting form
- **Backward compat:** missing inputs default per the §4 policy in the spec doc — no v1 score drops on rollout
- **Engine version exposed via `/api/v1/matching/version`**

### 3B. Matching Engine Parameters Module (Admin) — NEW
New admin tab `/admin/matching-engine` with five panels per the spec doc §7:
- **Weight tuner** — "music equalizer" with 7 vertical sliders, sum-to-100 enforced on save, live colour-coded fills
- **Missing-criteria policy** — editable Full/Half/Zero dropdowns for each job-side/candidate-side cell
- **Threshold & engine toggle** — recommendation threshold slider · v1/v2 radio · recompute-on-profile-change toggle · show-breakdown-to-candidate toggle
- **Live preview** — admin picks a candidate + job, sees breakdown render live as weights are dragged
- **Audit trail** — every weight/policy/threshold change written to `audit_log` with actor + from/to + reason; shown in a table within the module

### 3C. UI surfaces
- Explainability panel on every match: Recommended Jobs cards (candidate) + Application Detail (all roles) + per-applicant row (agent/employer)
- Breakdown shows 7 factor rows: `Skills 25/30 — "5/6 skills match (react, node, ts, css, html)"`
- Toggleable expand/collapse so the breakdown isn't visually dominant when not needed

### 3D. Job Poster form — new optional fields
- **Qualification** (single-select dropdown) — optional; "Not specified" maps to full marks for everyone
- **Languages required** (multi-row picker) — pick language + CEFR level; for English in IELTS countries the form auto-switches to "Required IELTS band" numeric input (4.0–9.0)
- **Category** (lands in Phase 1, required)
- Each optional field shows a score-impact hint: *"Specifying narrows your candidate pool. Leaving empty means all levels are eligible."*

### 3E. Education enhancements (HPSEDC Item 5)
- **Schema:** `candidateEducation` gets `type` enum (school | university | diploma | certification | course), `board` text (distinct from `institution`), `subject` text
- **Wizard:** separate sections for *Schooling* (10th/12th board), *Higher Education* (degree), *Certifications & Skill Courses*
- **Search:** Browse Jobs filter "matching my education level"

### 3F. Verify portal sync
- Seed all new fields + weight-tuner walk-through
- Reference the Matching Engine PDF as supporting doc
- Add IELTS-country test cases to the seed (e.g. job in UK with required IELTS 6.0, candidate with band 7.0 → expected score)

### Test
- 10+ new integration tests covering: each factor's edge cases (empty inputs → neutral) · IELTS-country routing (job.country=UK switches to IELTS scoring) · weight-change live-effect (admin saves → next score uses new weights) · sum-to-100 rejection · audit-trail write

### Deliverable
v0.4.33.0 shipped. **Outcome:** Matching engine matches HPSEDC's expected feature set; IELTS handled correctly for IELTS countries; education data model supports their full requirement; admin can tune everything from the UI without code changes.

---

## Phase 4 — Employer Dashboard Best-Practice Rework (~1 day · v0.4.34)
**Goal:** Replace the "agent-clone" employer dashboard with one that matches employer mental model — requisition-centric, decision-focused, agency-scorecard rather than candidate-pool-health.

### Overview view rework
- **Hero:** Awaiting your decision (keep as-is — best widget on the page)
- **Requisitions board** (NEW, replaces aggregate Pipeline strip): one card per open requisition showing:
  - Job title + country + targetHires + fill progress bar
  - Stage breakdown (X applied / Y shortlisted / Z awaiting your decision)
  - Latest pending action ("Approve Meera Iyer for interview")
  - "Review queue" button → drops into per-requisition `employer-review.tsx`
- **Compliance for accepted hires** (NEW side panel): list of my placements with passport / PCC / medical / PBBY / PDO status, traffic-light icons; click-through to chase the candidate

### Reports tab — branched from ReportsBI for employer
Drop the agent-specific sections, add employer-specific ones:
- **Drop:** Stage drop-off, Stale applicants (agent's operational concern, not employer's)
- **Drop:** Skill demand-supply (agent's vendor management, not employer's)
- **Add:** Agency scorecard — which agency placed how many of my hires, time-to-fill per agency, avg match score per agency
- **Add:** Per-requisition fill metrics (target vs actual, time-to-fill, time-to-first-shortlist)
- **Keep:** Welfare SLA, Compliance alerts (employers care about these for their hires)
- **Keep:** HPSEDC PBBY/PDO/ECR (legal compliance)
- **Keep:** Top destination countries, Applications trend

### Sidebar rework
| Before | After |
|---|---|
| Dashboard | Dashboard |
| My Jobs | **My Requisitions** |
| Applications Pipeline | **Decisions to Make** (filtered to awaiting-my-decision) |
| Offers & Placements | **Hires & Compliance** (placements + compliance status) |
| Reports | **Agency Performance** (rebranded Reports for employer) |
| Activity | Activity |

### Stat tiles
Already partially fixed in v0.4.30 — refine:
- Open requisitions → keep
- Total applicants → keep
- **Decisions awaiting you** (NEW) → count of `awaitingDecision`
- **Time-to-fill (avg)** (NEW) → average days from posting to first hire

### Verify portal sync
- Demo flow updated: employer logs in → sees requisition board → makes a decision → tracks compliance

### Deliverable
v0.4.34.0 shipped. **Outcome:** Employer dashboard reads as employer-mental-model, not agent-clone.

---

## Phase 5 — Staging Polish & Workflow Documentation (~1 day · v0.4.35 / v0.5.0-rc1)
**Goal:** Everything HPSEDC asked for at the end of their feedback — *"a detailed workflow document along with a proper functional demonstration of all modules may be provided to facilitate effective testing, validation, and assessment of the application."*

### Workflow documentation suite
Generate PDF specs in `PMD-Final wrapup/Architecture & Logic/` for each role + module:
1. **Candidate Workflow** — registration → profile → apply → interview → offer → acceptance → placement → welfare check-ins
2. **Agent / Recruitment Agency Workflow** — registration + verification → pickup requisitions → screen → shortlist → schedule → record outcome → issue offer → post-placement welfare
3. **Employer Workflow** — registration + verification → post requisition → review shortlists → approve interviews → record outcomes → track hires → compliance
4. **Admin Workflow** — verification queues, complaint handling, system settings, audit log, matching-engine tuning
5. **Compliance & Audit Workflow** — Emigration Act §1983 alignment: PBBY, PDO, ECR/ECNR, MEA RA license, welfare SLA
6. **Module Architecture Index** — one-page summary of which screen does what, which endpoint backs it, and which DB table is involved (useful for HPSEDC IT auditors)

Each is 1-2 page, government-stakeholder formatted (same style as the Matching Engine PDF).

### Cleanup / followups carried from earlier audits
- UX dead-ends from v0.4.17 audit: make notifications clickable (deep-link to action), add document rejection-feedback path, welfare reply confirmation, native mobile accept/decline (deferred — mobile accept is by design but UX needs polish)
- **Verify portal seed sync** — catch up all 22+ versions of drift. Seed new verification flows, matching v2, employer rework, all category data.
- **Metro under systemd** — finally move from `nohup` to a proper systemd unit so the mobile Expo URL survives a VM reboot.
- **Mobile docs sync** — `PMD-Final wrapup/MobileApps/Android/02_STATUS.md` + `01_ROADMAP.md` updated to reflect v0.5.0 staging-ready state

### Smoke test pass
End-to-end:
1. New candidate registers → profile → uploads docs → applies
2. Agent picks up → reviews → shortlists → schedules interview
3. Employer approves shortlist → interview recorded → selected
4. Placement auto-created → candidate accepts → visa workflow
5. Welfare check-in at 30 days

Take screenshots at each step, embed in workflow PDFs.

### Release
- **VERSION → v0.5.0-rc1** (release candidate for HPSEDC sign-off)
- Comprehensive release notes covering all 5 phases
- Mobile bundle rebuilt
- Verify portal fully synced

### Deliverable
**v0.5.0-rc1 → STAGING READY.** Hand to HPSEDC for sign-off testing.

---

## Risk Register

| Risk | Mitigation |
|---|---|
| HPSEDC sends more feedback mid-phase | Park new items in `Phase 6 - Backlog`, keep current sequencing |
| Schema migration breaks existing data | All Phase 1+3 fields nullable with sensible defaults; backfill scripts pre-staged |
| Verify portal sync drift compounds | Phase 5 has dedicated time for the full sync sweep |
| Mobile bundle vs web feature drift | Mobile changes deferred to Phase 5 except for status vocabulary (already shipped v0.4.14) |
| Employer rework breaks existing demo data | New views layer on top of existing endpoints; old views remain available via URL until cutover |

## Out-of-Scope (Explicitly NOT in this plan)

- **EAS production mobile builds** — still Expo Go for staging. Production APK build deferred until Play Store account ready (HPSEDC D3 blocker).
- **DigiLocker / UIDAI integration** — env vars exist, real integration deferred until credentials are provisioned.
- **PBBY auto-enrolment API** — manual entry for now; auto-enrolment via NIC partner API deferred.
- **ML-driven re-rank** — Matching Engine v2 explicitly defers this to v3.

---

## Cadence

Each phase ends with: type-check clean · integration tests pass · build + restart · git commit + push · Verify seed updated · this document marked completed.

Phase status (updated as we ship):

- [ ] **Phase 1** — Foundation Fixes (v0.4.31)
- [ ] **Phase 2** — Verification Workflows (v0.4.32)
- [ ] **Phase 3** — Matching Engine v2 + Parameters Module + IELTS + Education (v0.4.33)
- [ ] **Phase 4** — Employer Dashboard Best-Practice Rework (v0.4.34)
- [ ] **Phase 5** — Staging Polish + Documentation → **v0.5.0-rc1 STAGING READY**
