**Project:** Overseas Placement Portal & Mobile Application (HPSEDC) — *HireStream*
**Prepared by:** M/s HTIS Telecom Private Limited, Mohali · htistelecom.in
**Submitted to:** Himachal Pradesh State Electronics Development Corporation Ltd. (HPSEDC), Shimla
**Work Order:** HPSEDC-SOFT/08/2025 (E-File No. 287782), dated 13.01.2026
**RFE:** SEDC/Software-EMP/2K24-22560
**Milestone:** Payment Term 1 — *Approval of design (based on deliverables SRS/FRS) by the department* = **40%** (₹1,77,000 of ₹4,42,500 incl. GST)

---

## Purpose of this submission

Under the Work Order, the **first 40% installment is released on the department's approval of the design**, evidenced by the SRS/FRS deliverables. HPSEDC has supplied the FRS (the contract specification). M/s HTIS Telecom Private Limited hereby submits the **Software Requirements Specification (SRS) / System Design Document** elaborating the design, together with the accompanying transmittal and verification documents, for HPSEDC's formal **design approval** and the release of the first installment.

The portal has already been developed and User Acceptance Tested by the HPSEDC team; the SRS therefore documents the **as-built, working design**.

## Documents in this submission

| # | Document | Purpose |
|---|----------|---------|
| A | Software Requirements Specification (SRS) & System Design Document | The primary deliverable for design approval — full system design with a clause-by-clause FRS Requirements Traceability Matrix |
| B | Forwarding / Covering Letter | HTIS → HPSEDC letter submitting the SRS and requesting design approval + release of the 40% installment |
| C | Design Approval — Departmental Sign-off | Verification & approval sheet for the concerned department of HPSEDC to execute |
| D | Milestone-1 Deliverables Checklist | Work Order term-1 → artifact mapping for the dealing officer |

## Dependencies to be activated by HPSEDC

The following external integrations are designed into the system as pluggable, admin-configurable interfaces, to be activated once HPSEDC provides the production credentials/endpoints (these are HPSEDC-side dependencies, addressed after staging):

- HIM Parivar / HIM Access SSO (himparivar.hp.gov.in/ssointegration)
- Aadhaar / UIDAI verification API
- DigiLocker integration
- Email / SMS gateway
- CERT-In empanelled external security audit
