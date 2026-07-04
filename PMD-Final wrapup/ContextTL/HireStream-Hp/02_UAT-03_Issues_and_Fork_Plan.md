# UAT-03 · 20 Issues + Fork-Context Disposition

**Source MOM:** [`../../UAT & Approval/UAT-03/Issue_List_Feature_Request.md`](../../UAT%20%26%20Approval/UAT-03/Issue_List_Feature_Request.md) — MD meeting minutes, 22-06-2026.

**Disposition context.** After the initial MOM, Subhash decided to **fork** rather than trim the reference portal (see [`01_Handoff_Context.md`](./01_Handoff_Context.md)). This reframes the disposition of several items — some become simpler, some become larger, some may be dropped in the MD follow-up. This file captures the current best-thinking disposition; treat it as a live document and update per sprint outcome.

**Legend:**
- **A** = fast win (< 1 day)
- **B** = medium (1-3 days)
- **C** = large (multi-day)
- **D** = new module (multi-week, likely external gates)
- **?** = pending MD-meeting decision / Subhash input

---

## The 20 items

### 1. "Sex" → "Gender" on registration form · **A**

**Where in code:** `client/src/pages/auth-page.tsx`, `client/src/components/candidate/candidate-profile-form.tsx`, `client/src/pages/profile-wizard.tsx` (three touchpoints — grep first).
**Notes:** Trivial label swap. Bilingual — update i18n keys (`en.json` + `hi.json`) too.
**Sprint:** HP-2.

### 2. Replace "Recommend" with a more suitable term · **A · ?**

**Where in code:** unknown — likely agent / referrer UX. Grep `client/src/` for `Recommend` first.
**Blocker:** need Subhash to clarify **where** it appears and **what** the replacement should be.
**Sprint:** HP-2 after clarification.

### 3. "Address" → "Correspondence Address" · **A**

**Where in code:** `candidate-profile-form.tsx` + `profile-wizard.tsx` — likely 2-3 label swaps.
**Notes:** Also verify neither the API contract nor DB column changes are needed (just labels).
**Sprint:** HP-2.

### 4. Make Identity section mandatory · **B**

**Where in code:** `profile-wizard.tsx` (step gating) + `server/routes/candidate.routes.ts` (server-side validation) + `shared/validators.ts`.
**Watch:** existing incomplete profiles must still be able to log in and complete their identity — do not lock them out.
**Sprint:** HP-4.

### 5. Prevent duplicate education entries · **B**

**Where in code:** `candidate-profile-form.tsx` (education section) + server insert route.
**Impl:** dedupe by `level` enum (10th, 12th, diploma, undergraduate, postgraduate, etc.). Client-side filter unavailable options; server-side reject with 409.
**Sprint:** HP-4.

### 6. "Passed" flag on Formal Education · **B**

**Where in code:** `shared/schema.ts` (`candidate_education`) — add `is_passed BOOLEAN NOT NULL DEFAULT true`. Form gets a checkbox.
**Watch:** default `true` for existing rows to avoid data loss.
**Sprint:** HP-4.

### 7. Separate University and Institution fields · **B**

**Where in code:** `shared/schema.ts` (`candidate_education`) — split into `institution TEXT` (school / college name) and `university TEXT` (affiliating body, if applicable).
**Watch:** migration — existing rows have combined data. One-shot migration to split at " - " or leave as institution, university NULL.
**Sprint:** HP-4.

### 8. Review Education / Certification / Skill Course sections · **C**

**Scope:** broadest of the profile-wizard items. Likely absorbs items 5, 6, 7, 9. Design pass first — proposal to Subhash for one-question-per-screen blue-collar-friendly wizard for these three sections (which are typically the hardest for low-literacy users).
**Sprint:** HP-4.

### 9. Differentiate Certification vs Certificate Course · **A**

**Where in code:** existing single "certifications" list (probably). Split into two: Certifications (formal, e.g. AWS SAA, PMP, ITI trade cert) and Certificate Courses (short trainings, e.g. NIELIT 3-month, industrial safety course). Two distinct list-adds in the wizard.
**Notes:** Blue-collar users care about **trade certs** (welder, electrician, plumber) more than about "certifications" — model the differentiation in a way that lets ITI/NSDC trade certs live in the right bucket.
**Sprint:** HP-2 (labelling) + HP-4 (structural split).

### 10. Experience in months (e.g. 42 months) · **B**

**Where in code:** `shared/schema.ts` — column is `experience_years INTEGER`. Options:
  (a) Rename to `experience_months INTEGER` — cleanest.
  (b) Add `experience_months` + compute years for backward compat.
  (a) is cleaner for the fork (no back-compat) → do (a) and update matching-service to divide by 12 for display.
**Watch:** matching-service uses experience for job scoring — retune.
**Sprint:** HP-4.

### 11. Improve Brief Description section · **A · ?**

**Where in code:** `candidate-profile-form.tsx` — the "brief description" (about-me) field.
**Blocker:** need Subhash to clarify **what** needs improving — character limit? Placeholder guidance? Voice input? For blue-collar users, this is likely the LEAST useful field; consider **removing it or replacing with structured tags**.
**Sprint:** HP-2 after clarification.

### 12. Language Proficiency + passport info · **B**

**Where in code:** new `candidate_languages` table (name enum, level: elementary / intermediate / professional / native). Passport info likely already collected — verify.
**Notes:** For blue-collar overseas placement, language proficiency (spoken Hindi / English / Malayalam / Arabic / …) matters more than resume phrasing. Model as a first-class section, not buried.
**Sprint:** HP-4.

### 13. Country rejected → not shown again · **C**

**Where in code:** new tracking table `application_country_rejections(candidate_id, country_code, reason, rejected_at)` OR reuse `applications.status = 'rejected'` + join on `jobs.country`.
**Watch:** differentiate **agency rejection** from **country / visa rejection** (visa refusal ≠ agency non-shortlist). Only the country rejection filters future job listings for that candidate.
**Sprint:** HP-5.

### 14. Salary expectations align with job category · **B**

**Where in code:** new column `job_categories.min_salary / max_salary / currency` (or a `category_salary_bands` table). Enforce in job-creation form + in candidate preference form.
**Notes:** For blue-collar targeting, salary bands per category (mason / driver / cook / factory worker) are actually well-published (MEA emigration data, NSDC labour market intel). Seed from those tables rather than free-form.
**Sprint:** HP-5.

### 15. Show only job-specific required documents · **B**

**Where in code:** currently the doc slot list is static. Need `jobs.required_documents JSONB` OR a `job_document_requirements` table; join to candidate doc list at application time.
**Notes:** Blue-collar-specific docs (police clearance certificate / medical fitness certificate / trade test result) differ per destination country. Model as a **per-country requirement matrix** rather than per-job — jobs inherit their country's matrix.
**Sprint:** HP-5.

### 16. Post-visa 3-month issue-support process · **D · ?**

**Scope:** new workflow module. Candidate submits a "post-placement issue" ticket within 3 months of visa approval; HPSEDC owns triage.
**Reality check:** HPSEDC likely does NOT have staff for a helpline. Realistic reframes:
  (a) Show contact info + Indian embassy link post-arrival ("If you have a problem, contact the Indian Embassy in ${destination_country}. Phone: … Email: …")
  (b) Simple ticket queue with 30-day SLA for HPSEDC to acknowledge, no active support workflow.
  (c) Full module as described.
**Recommend:** propose (a) or (b) to MD. (c) is 4-7 days work and probably won't be used.
**Sprint:** HP-7 IF kept.

### 17. Improve Grievance section · **B · ?**

**Where in code:** `client/src/pages/grievance-page.tsx`, `server/routes/grievance.routes.ts`.
**Blocker:** "improve" is vague — polish or workflow redesign? For blue-collar users, the grievance UX needs to be **voice-input-friendly, Hindi-first, and possibly WhatsApp-primary** (raise a grievance by sending a WhatsApp message). That's a different scope than tweaking a form.
**Sprint:** HP-5 after clarification.

### 18. Fee section · **D · ?**

**Ambiguous.** HPSEDC service fee? Agency commission? Candidate placement fee?
**Reality check:** if HPSEDC is the sole agency and the programme is subsidised, there's likely **no candidate-side fee**. If there is, it's a static "₹500 registration fee" page.
**Recommend:** propose "informational only" to MD unless there's a real payment flow. Payment-gateway integration (HDFC / BillDesk / Razorpay) is 3-5 weeks of work including onboarding — do not embark without HPSEDC signing the fee model in writing.
**Sprint:** HP-7 IF kept + scoped.

### 19. Monthly tracking / reporting for visa holders · **D · ?**

**Scope:** ongoing candidate-status tracking after visa approval; monthly self-report or agency-check-in.
**Reality check:** requires candidates to self-report from abroad. Retention will be poor without an incentive. Realistic realisation: **WhatsApp-based monthly check-in** (bot asks "still there? any issue?"), tied to item 20.
**Recommend:** MERGE with item 20 as one WhatsApp-first product; drop the standalone monthly-portal module.
**Sprint:** HP-6 as part of WhatsApp block IF kept.

### 20. WhatsApp notifications + communication · **D · ?**

**External-gated.**
- Meta Business Verification for WhatsApp Business API: **7-14 days** typical.
- Template approval: **2-5 days per template**.
- BSP selection (WATI, Gupshup, Interakt, Twilio, Meta Direct) drives per-message cost and template flexibility.

**Reframe recommendation:** for blue-collar users, WhatsApp should not be a "notification bolt-on" — it should be **the primary interaction channel**. That means:
  * Register-via-WhatsApp (send "start" to a number, get onboarded via bot flow)
  * Job alerts as WhatsApp messages
  * Grievance filing via WhatsApp
  * Monthly check-ins (item 19) as WhatsApp
  * Portal is the admin / agent / employer surface (though we're removing external agencies and employers, so it becomes admin-only + candidate profile view)

**This is a much bigger product decision than "add notifications."** Discuss with MD before starting.

**Sprint:** HP-6, blocked on BSP approval + MD scope.

---

## Sprint-mapped table

| Sprint | UAT items | Effort |
|---|---|---|
| **HP-2** — fast wins + rebrand | 1, 2\*, 3, 9 (labels), 11\* | 1-2 days |
| **HP-3** — trim to single-agency | (no UAT items directly; enables the rest) | 3-5 days |
| **HP-4** — profile wizard + blue-collar UX | 4, 5, 6, 7, 8, 9 (structural), 10, 12 | 5-7 days |
| **HP-5** — business rules | 13, 14, 15, 17\* | 5-7 days |
| **HP-6** — voice + WhatsApp | 19, 20 (merged), voice input | 3-5 weeks (external gates) |
| **HP-7** — optional new modules | 16\*, 18\* | 1-2 weeks if kept |
| **HP-8** — UAT acceptance | rerun all items | 3-5 days |

**\* = needs Subhash / MD clarification before Sprint starts.**

---

## Recommended sequence of MD-decisions (Subhash to drive)

Get these decisions from HPSEDC / MD before Sprint HP-4 starts, in this order:

1. **Fork approval** — is HPSEDC OK with the "we're building a new dedicated variant for you" positioning?
2. **Single-agency model — permanent or starting position?** (Drives whether we ever add back multi-agency later.)
3. **Items 16, 18, 19, 20 disposition:**
   - 16 → drop / reframe to "embassy link" / keep as ticket queue?
   - 18 → drop / reframe to informational-only / keep as payment integration?
   - 19 + 20 → merge as WhatsApp-first channel, or keep separate?
4. **Item 2** — the "Recommend" term replacement.
5. **Item 11** — what specifically to improve in "Brief Description" (or replace with structured tags?).
6. **Item 17** — Grievance improvement scope.

The answers reshape sprints HP-2, HP-5, HP-6, HP-7. Sprint HP-3 (trim) can proceed independently of these.

---

## Blue-collar UX overlay (applies to every item)

Every item above needs the blue-collar UX lens applied — see [`04_Blue_Collar_UX_Principles.md`](./04_Blue_Collar_UX_Principles.md). Key applications:

- **Item 8 (education review)** — pictorial level cards, not dropdowns; Hindi labels default.
- **Item 12 (language)** — self-rate with pictorial thumbs-up/star, not with words like "professional working proficiency".
- **Item 14 (salary)** — Rupee icons + destination-country flag; "expected monthly salary" in local currency + INR equivalent.
- **Item 15 (documents)** — camera-first upload UX; live thumbnail preview.
- **Item 17 (grievance)** — voice-first with WhatsApp fallback.
- **Item 20 (WhatsApp)** — primary channel, not notification bolt-on.

---

**End of UAT-03 disposition. Read [`03_Open_Decisions.md`](./03_Open_Decisions.md) next.**
