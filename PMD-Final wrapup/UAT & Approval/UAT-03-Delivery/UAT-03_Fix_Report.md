# HireStream-HP · UAT-03 Fix Report

**Portal:** HireStream-HP (HPSEDC Overseas Placement) · https://hirestream-hp.agentryx.dev
**Against:** UAT-03 issue list / MOM (20 items)
**Summary:** **18 of 20 fixed & live**, 1 out of scope, 1 deferred to Phase 2.

| # | Issue | What was done | Status |
|---|-------|---------------|--------|
| 1 | "Sex" → "Gender" | Label changed on registration/profile (field unchanged). | ✅ Fixed |
| 2 | Replace "Recommend" term | Renamed to **"Jobs for You"** (a govt body shouldn't appear to *endorse* a job). | ✅ Fixed |
| 3 | "Address" → "Correspondence Address" | Label updated. | ✅ Fixed |
| 4 | Identity section mandatory | Identity fields required; **documents (ID + passport) now required** before a profile is "ready". | ✅ Fixed |
| 5 | Prevent duplicate education | Server rejects a duplicate education level (409). | ✅ Fixed |
| 6 | "Passed" flag on education | Added a Passed / Completed toggle. | ✅ Fixed |
| 7 | Separate University & Institution | Two distinct fields (institution + affiliating university). | ✅ Fixed |
| 8 | Review Education / Certification / Skill sections | All three rebuilt blue-collar-friendly in the new application flows. | ✅ Fixed |
| 9 | Certification vs Certificate Course | Differentiated (formal certification vs short course). | ✅ Fixed |
| 10 | Experience in months | Captured in months (with a "≈ N years" hint); matching uses months. | ✅ Fixed |
| 11 | Improve Brief Description | Reworked to plain guidance + examples ("What work did you do here?"). | ✅ Fixed |
| 12 | Language proficiency + passport | First-class language section (Basic → Native); passport captured. | ✅ Fixed |
| 13 | Rejected country not shown again | Agency records a visa/country rejection; those jobs are hidden from that candidate. | ✅ Fixed |
| 14 | Salary aligned to job category | Typical monthly pay band per category × country shown on each job. | ✅ Fixed |
| 15 | Show only job-specific required documents | Each job shows only its country's required documents (have / needed). | ✅ Fixed |
| 16 | Post-visa 3-month support | New **Support** module — raise an issue + official Govt-of-India channels (MADAD/eMigrate); HPSEDC works the queue. | ✅ Fixed |
| 17 | Improve Grievance section | Voice input, "Someone asked me for money / Fraud" category, fraud deep-link. | ✅ Fixed |
| 18 | Fee section | **No candidate-side fee** in this government programme — removed from scope. | ⛔ Out of scope |
| 19 | Monthly tracking of visa holders | Monthly **check-in** ("I'm fine" / "I need help") in the Support module. | ✅ Fixed |
| 20 | WhatsApp notifications | Requires Meta WhatsApp-Business verification + a messaging partner (external, ~2 weeks). | ⏳ Deferred to Phase 2 |

---

**Notes for approval**

- **18/20 delivered and verified live** on the portal.
- **#18 (Fee)** — dropped: the programme has no candidate fee; the "HPSEDC never asks for money" advisory reinforces this to applicants.
- **#20 (WhatsApp)** — deferred to **Phase 2**. It needs Meta Business verification and a messaging-service partner (a 2–3 week external process); the in-portal notification side is ready to connect once those are approved.

Beyond the 20 items, the fork also delivered the HPSEDC single mega-agency model, a blue-collar-first application experience, Hindi (first-draft), and a configurable dashboard — see the **User & Testing Guide**.
