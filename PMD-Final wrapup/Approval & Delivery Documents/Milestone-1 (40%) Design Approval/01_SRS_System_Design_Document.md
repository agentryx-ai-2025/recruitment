# Software Requirements Specification (SRS) & System Design Document

## Overseas Placement Portal & Mobile Application (HPSEDC) — *HireStream*

---

### Document Control

| Field | Detail |
|-------|--------|
| Document title | Software Requirements Specification (SRS) & System Design Document |
| Project | Overseas Placement Portal & Mobile Application (HPSEDC) — *HireStream* |
| Prepared by | M/s HTIS Telecom Private Limited, E-94, 1st Floor, Eltop Area, Near CDAC Phase 8, Industrial Area, Mohali |
| Submitted to | Himachal Pradesh State Electronics Development Corporation Limited (HPSEDC), Shimla |
| Work Order reference | HPSEDC-SOFT/08/2025 (E-File No. 287782), dated 13.01.2026 |
| RFE reference | SEDC/Software-EMP/2K24-22560 |
| Governing FRS | Functional Requirements Specification for Overseas Placement Portal (HPSEDC) |
| Document version | 1.0 (Design-Approval Submission) |
| Milestone | Payment Term 1 — Approval of design (SRS/FRS) by the department — 40% |
| Classification | Government — Project Deliverable |

**Revision history**

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0 | (on submission) | HTIS Telecom Pvt. Ltd. | Initial SRS / design submission for departmental design approval |

**Approval (see also Document C — Design Approval Sign-off)**

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Prepared by (HTIS Telecom) | | | |
| Reviewed by (HPSEDC – concerned dept.) | | | |
| Approved by (HPSEDC – Data Controller) | | | |

---

## 1. Introduction

### 1.1 Purpose

This Software Requirements Specification (SRS) defines the design of the **Overseas Placement Portal & Mobile Application** (product name *HireStream*) developed by M/s HTIS Telecom Private Limited for HPSEDC. It elaborates how each requirement of the HPSEDC **Functional Requirements Specification (FRS)** is realised in the system architecture, data design, functional modules, user interface, external interfaces, and non-functional characteristics.

This document is submitted as the principal deliverable for **Work Order Payment Term 1 — "Approval of design (based on deliverables SRS/FRS) by the department" (40%)**. It is intended to be reviewed and approved by the concerned department of HPSEDC.

### 1.2 Scope

The system is a secure, bilingual, web and mobile platform that facilitates **regulated overseas employment** for the youth of Himachal Pradesh. It connects three primary actors — **Job Seekers (Candidates)**, **Recruiting Agencies**, and the **HPSEDC Administrator/Authority** — to streamline job matching, reduce migration risk, and promote safe, regulated international employment.

In scope (per FRS §1.2):

- User registration and profile management for job seekers and recruiting agencies.
- Document upload by candidates (CV, passport, certificates).
- Job posting, searching, and applying for jobs.
- Scrutiny of candidates and scheduling of recruitment drives and interviews by recruiting agencies.
- Entry of placement details and issuing of appointment letters to selected candidates by the recruiting agencies.
- Acceptance and confirmation of job offers by candidates.
- Support features: dashboards, FAQs, grievances, notifications, informational resources.
- Administrative tools for content management, approvals, reporting, and admin oversight.
- Bilingual interface (English and Hindi).

### 1.3 Definitions, acronyms and abbreviations

| Term | Meaning |
|------|---------|
| FRS | Functional Requirements Specification (HPSEDC-supplied contract spec) |
| SRS | Software Requirements Specification (this document) |
| Job Seeker / Candidate | Individual seeking overseas employment opportunities |
| Recruiting Agency / Agent | Entity requesting/sourcing candidates for overseas placement |
| Employer | Overseas employer entity whose requisitions agencies fulfil (modeled distinctly from agency, see §3.3) |
| Administrator / HPSEDC Authority | Authorised HPSEDC personnel managing and overseeing the portal |
| GIGW | Guidelines for Indian Government Websites |
| HIM Access / HIM Parivar | Government of Himachal Pradesh Single Sign-On service (himparivar.hp.gov.in) |
| RBAC | Role-Based Access Control |
| PII | Personally Identifiable Information |
| SDC | State Data Centre |
| PG | Performance Guarantee |

### 1.4 References

1. Functional Requirements Specification for Overseas Placement Portal (HPSEDC).
2. Work Order HPSEDC-SOFT/08/2025 (E-File No. 287782), dated 13.01.2026.
3. RFE No. SEDC/Software-EMP/2K24-22560 (Terms & Conditions).
4. Guidelines for Indian Government Websites (GIGW), Government of India.
5. Dept. of IT, GoHP letter SITE-F05(3)/7/2020-IT-GoHP(E-20797)-162 dated 16.03.2023.
6. HireStream UAT Final Report (HPSEDC test cycle).

---

## 2. Overall Description

### 2.1 Product perspective

*HireStream* is a self-contained, cloud-deployable platform comprising:

- A **responsive web application** (works on major browsers, smartphones and tablets).
- **Native mobile applications** for Android and iOS (API-driven; mobile auth, config, and push endpoints are built into the backend).
- A **central application server** exposing a versioned REST API (`/api/v1`).
- A **relational database** holding all candidate, agency, employer, job, application, placement, and administrative data.

The platform is designed to be hosted on government cloud / State Data Centre infrastructure in conformance with the Dept. of IT (GoHP) hosting instructions [ref. 5].

### 2.2 Product functions (FRS §2.1)

- Secure user registration and profile creation.
- Job postings by verified recruiting agencies and targeted job searches by job seekers.
- Document upload, application submission, and application-status tracking.
- Informational and support services, including training notifications and grievance handling.
- Administrative dashboards for monitoring and reporting.

### 2.3 User roles and characteristics (FRS §2.2)

| Role | Responsibilities | Key module capabilities |
|------|------------------|--------------------------|
| **Candidate** | Register, upload documents, apply for jobs, track status | Registration & login (OTP / email-mobile verification; SSO via HIM Access), profile & document management, job search & one-click apply, application tracking, notifications, offer acceptance, grievances |
| **Recruiting Agency** | Register, post jobs, view applicants, schedule drives & interviews, manage placements | Agency registration & license info, job posting, candidate management (shortlist/scrutiny), recruitment-drive & interview scheduling, placement entry & appointment letters, visa/passport assistance |
| **HPSEDC Administrator / Authority** | Approve agency registrations, approve recruitment drives, overall portal management, reporting | Agency & drive verification/approval, MIS dashboard, reporting by district/agency/skill/placement status, content management, grievance oversight, audit oversight |

### 2.4 Operating environment

- **Client:** any modern browser (Chrome, Firefox, Edge, Safari) on desktop, tablet, or smartphone; Android and iOS native apps.
- **Server:** Linux host running Node.js (process-managed by PM2) behind an Nginx reverse proxy with TLS termination.
- **Database:** PostgreSQL.
- **Deployment target:** government cloud / SDC, horizontally scalable.

### 2.5 Design and implementation constraints (FRS §2.9)

- Data encryption in transit (HTTPS/TLS) and at rest for sensitive fields; compliance with GDPR/PDPA-equivalent data-protection principles and **GIGW** guidelines.
- Custom development limited to essential features; open-source, well-maintained libraries leveraged where possible.
- Bilingual (English + Hindi) interface.
- Accessibility provisions for *divyangjans* and uniformity with the State Government website header (GIGW).

### 2.6 Assumptions and dependencies

The following are **HPSEDC-side deliverables / dependencies**, designed for in the architecture as pluggable, admin-configurable interfaces and to be activated when HPSEDC provides production credentials/endpoints:

- HIM Parivar / HIM Access SSO endpoint and client credentials.
- Aadhaar / UIDAI verification API access.
- DigiLocker integration credentials.
- Email and SMS gateway provider credentials.
- CERT-In empanelled external security audit (post-staging).

---

## 3. System Architecture & Design

### 3.1 Architectural style

The system follows a **modular, layered, client-server architecture** with a clear separation between presentation, application, and data tiers:

```
 ┌──────────────────────────────────────────────────────────────┐
 │  PRESENTATION TIER                                             │
 │  • Responsive Web SPA (React + Vite, Tailwind, Radix UI)       │
 │  • Android / iOS native apps (consume the same REST API)       │
 └───────────────┬──────────────────────────────────────────────┘
                 │  HTTPS / TLS (REST, JSON) — /api/v1
 ┌───────────────▼──────────────────────────────────────────────┐
 │  APPLICATION TIER  (Node.js + Express, PM2)                    │
 │  • Auth & session (passport, express-session, OTP, JWT mobile) │
 │  • Role-based access control middleware (RBAC)                 │
 │  • Domain route modules (candidate, agency, employer, admin…)  │
 │  • Services (matching engine, deployment/pre-departure,        │
 │    notifications, provider-config, document handling)          │
 │  • Security: helmet, rate-limiting, input validation (zod)     │
 │  • Logging & audit (winston, audit_log)                        │
 └───────────────┬──────────────────────────────────────────────┘
                 │  SQL (drizzle-orm)
 ┌───────────────▼──────────────────────────────────────────────┐
 │  DATA TIER  (PostgreSQL)                                       │
 │  • Relational schema (~36 tables) + audit log                 │
 │  • File store (namespaced upload roots) for documents/photos  │
 └──────────────────────────────────────────────────────────────┘
        │                                   │
   ┌────▼─────┐                       ┌─────▼──────────────────┐
   │ Nginx    │                       │ Pluggable integrations │
   │ (TLS,    │                       │ (HPSEDC-side creds):    │
   │ reverse  │                       │ HIM SSO, UIDAI/Aadhaar, │
   │ proxy)   │                       │ DigiLocker, Email/SMS   │
   └──────────┘                       └────────────────────────┘
```

### 3.2 Technology stack

| Layer | Technology |
|-------|------------|
| Web frontend | React 18, Vite, Wouter (routing), TanStack Query, React Hook Form + Zod, Radix UI / shadcn components, Tailwind CSS, Recharts, i18next (bilingual) |
| Backend | Node.js, Express, TypeScript |
| Auth & security | passport / passport-local, express-session (PostgreSQL-backed, rolling idle timeout), OTP (otplib / input-otp), JWT (mobile), bcrypt, Helmet, express-rate-limit |
| Data access | Drizzle ORM, drizzle-zod (schema-derived validation) |
| Database | PostgreSQL |
| Documents / media | Multer (uploads with magic-byte verification), Archiver (bulk export), PDFKit (PDF generation), QRCode |
| Notifications | In-app notifications; Nodemailer (email) and SMS via pluggable provider adapters |
| Scheduling / ops | node-cron (digests/SLA jobs), Winston (structured logging), systeminformation (health) |
| Mobile | API-driven Android/iOS; mobile auth (refresh tokens), config, and push-token endpoints |

### 3.3 Logical module decomposition

The application server is decomposed into domain route modules and supporting services. Principal modules:

- **Authentication & Identity** — registration, login, OTP/email-mobile verification, HIM Access SSO hook, 2FA, password reset, mobile auth.
- **Candidate** — profile wizard, education/experience, document management, self-service, public status check.
- **Job & Application** — job listing/search/filter, apply, application lifecycle, notes, matching engine.
- **Recruiting Agency** — agency registration, job posting (derivative jobs), applicant management, drives, interviews, placements, productivity.
- **Employer** — requisition posting, review queue (aggregated across agency derivatives), approve-for-interview, welfare notes, placement readiness.
- **HPSEDC Administrator / Authority** — agency & drive approval, oversight, reporting/MIS, content (FAQ, announcements, training events), audit.
- **Superadmin / Operations** — system settings, provider configuration, system controls, data-management operations.
- **Cross-cutting services** — matching engine, notifications, document/upload handling (namespaced storage), grievance handling, audit logging.

### 3.4 Deployment architecture

- **Reverse proxy:** Nginx terminates TLS, enforces upload size limits per virtual host, and proxies to the Node.js application.
- **Application process:** managed by PM2 (restart/monitoring).
- **Database:** PostgreSQL with role-scoped access.
- **Static & media:** public assets and candidate photos served from a public path; sensitive documents served only through authenticated, authorisation-gated endpoints.
- **Hosting:** designed for government cloud / SDC; scalable horizontally behind the reverse proxy.

---

## 4. Data Design

### 4.1 Overview

The relational schema comprises approximately **36 tables** plus an immutable **audit log**. The principal entities and relationships:

| Entity (table) | Purpose | Key relationships |
|----------------|---------|-------------------|
| `users` | Account + role (candidate / agent / employer / admin / superadmin) | 1–1 with role profile tables |
| `candidates` | Candidate profile, contact, address, preferences, photo | belongs to `users`; has many documents, education, experience |
| `candidate_education`, `candidate_experience`, `candidate_references` | Qualifications, work history, references | belong to `candidates` |
| `documents` | Uploaded candidate documents (CV, passport, certificates) | belong to `candidates` |
| `recruitment_agents` | Recruiting agency profile, licence info, verification status | belongs to `users`; has many jobs, drives |
| `agency_documents`, `agency_reviews` | Agency licence docs and ratings | belong to `recruitment_agents` |
| `employers`, `employer_documents` | Overseas employer entities and their documents | post requisitions |
| `jobs` | Job openings / requisitions (incl. derivative jobs picked up by agencies) | belong to agency/employer; have many applications |
| `applications` | Candidate application to a job; status lifecycle | link `candidates` ↔ `jobs` |
| `application_notes` | Internal notes / scorecards on applications | belong to `applications` |
| `recruitment_drives` | Drive scheduling | belong to agencies |
| `interviews` | Interview scheduling, results, scorecards | belong to `applications` |
| `placements` | Placement details, offer/appointment, welfare, deployment | belong to `applications` |
| `grievances` | Candidate grievances and resolution | belong to users |
| `notifications`, `notification_templates`, `email_templates` | In-app + templated communications | belong to users |
| `saved_jobs`, `saved_searches`, `saved_segments` | Candidate/agent convenience features | belong to users |
| `faq`, `announcements`, `training_events`, `country_info` | Informational content | admin-managed |
| `system_settings`, `provider_config` | Configurable behaviour + encrypted integration credentials | global |
| `otp_codes`, `password_reset_tokens`, `mobile_refresh_tokens`, `mobile_push_tokens` | Auth + mobile session artefacts | belong to users |
| `candidate_agent_tags` | Agent-applied candidate tags | link candidates ↔ agents |
| `audit_log` | Immutable record of all significant actions/transitions | references actor + resource |

### 4.2 Data integrity & retention

- Foreign-key constraints enforce referential integrity; sensitive deletes are constrained.
- All significant state changes are written to `audit_log` (actor, action, resource, timestamp) for traceability and reporting.
- PII fields are protected by RBAC and encryption; integration credentials in `provider_config` are stored encrypted.

---

## 5. Functional Design (per FRS workflows)

The following sub-sections map directly to the FRS workflow diagrams (FRS §2.3–§2.7) and describe how each is implemented.

### 5.1 Candidate registration & profile management (FRS §2.3)

`Registration (Aadhaar/email-mobile verification, OTP, optional HIM Access SSO) → Profile creation (personal, education, experience) → Document upload (CV, passport, certificates) → Profile maintenance (job role & country preferences)`.

Implemented via the authentication module + a guided **profile wizard**, document module (typed uploads with format/size and magic-byte verification), and candidate self-service. Public **status check** allows status lookup without login.

### 5.2 Job search & application (FRS §2.4)

`Browse openings → advanced filters (location, sector, salary, experience) → view job description → submit application (one-click, tailored documents) → track status → receive notifications`.

Server-side filtering (including salary range), one-click apply, and an application-status timeline. A matching engine scores candidate–job fit on multiple weighted factors.

### 5.3 Recruiting-agency registration & job posting (FRS §2.5)

`Agency registration (company + licence details) → licence verification & HPSEDC admin approval → job posting → manage postings (edit/update/close) → view & manage applicants → analytics`.

Agencies register and submit licence documents; HPSEDC admin verifies and approves before the agency can post. Agencies pick up employer requisitions, creating **derivative job postings** visible to candidates.

### 5.4 HPSEDC Admin verification & approval (FRS §2.6)

`Document verification of recruiting agencies → agency approval/rejection → system monitoring → report generation → grievance handling`.

The admin/authority module provides agency & drive approval queues, oversight dashboards, MIS reporting, and grievance management, all backed by the audit log.

### 5.5 Recruitment process (FRS §2.7)

`Organize recruitment drives → review applications → shortlist candidates → schedule interviews → conduct interviews & record results → make selection → issue appointment letters`.

#### Application state machine

| From → To | Actor | Notes |
|-----------|-------|-------|
| *(none)* → `submitted` | Candidate | On apply |
| `submitted` → `reviewed` | Agent | Candidate sees "Viewed" |
| `reviewed` → `shortlisted` | Agent | Surfaces in Employer Review Queue |
| `shortlisted` → `interview_scheduled` | Agent | Writes interview row |
| `interview_scheduled` → `selected` | Employer (primary, FRS §2.7) | Final selection |
| any active → `rejected` | Agent / Employer | Reason captured; **employer name scrubbed** from candidate-facing message (FRS §5) |
| `selected` → `placed` | Agent | Placement + appointment letter; candidate accepts offer |
| terminal → change | Admin only | Override |

The **Employer Review Queue aggregates shortlisted applicants across all derivative jobs** of an employer's requisitions into one unified list. Placement entry, appointment-letter issuance, offer acceptance, welfare follow-up, and pre-departure readiness are supported on the placement record.

### 5.6 Overall workflow (FRS §2.7 "Overall")

`User registration & verification → job posting & searching → recruitment drives → application & matching → interview & selection → placement & follow-up → reporting & monitoring`.

---

## 6. User Interface / UX Design (FRS §3.1)

- **Navigation:** clean, responsive layout with primary menus (Home, Jobs, Register/Login, Apply, Support) and role-specific dashboards (Candidate, Agency, Employer, Admin, Superadmin).
- **Responsiveness:** mobile-first responsive web; native Android/iOS apps.
- **Bilingual:** English and Hindi via i18next, switchable at runtime.
- **Accessibility (GIGW / divyangjans):** semantic, accessible component library (Radix UI), keyboard navigation, screen-reader support, and conformance toward WCAG accessibility standards; State-Government header uniformity.
- **File uploads:** PDF/JPG/PNG up to size limits, with type and magic-byte verification.
- **Key screens (illustrative):** landing, auth, candidate dashboard & profile wizard, job listing & detail, application detail, agency dashboard & job/applicant management, recruitment drives, interviews, employer dashboard & review queue, admin dashboard & oversight, superadmin system controls, FAQ, grievances, public status check.

---

## 7. External Interface Requirements (FRS §2.8, §3.1)

All external integrations are designed as **pluggable, admin-configurable adapters**; production activation depends on HPSEDC-supplied credentials (see §2.6).

| Interface | Design | Status |
|-----------|--------|--------|
| **HIM Access / HIM Parivar SSO** | OAuth/SSO login hook with admin-configured client credentials and callback | Adapter built; awaiting HPSEDC credentials |
| **Aadhaar / UIDAI verification** | Verification API adapter via provider-config | Adapter built; awaiting access |
| **DigiLocker** | Document fetch/upload adapter | Adapter built; awaiting credentials |
| **Email gateway** | Nodemailer / SMTP provider via provider-config | Built; configure provider |
| **SMS gateway** | Pluggable SMS provider via provider-config | Built; configure provider |
| **MIS dashboard** | Built-in admin MIS + reporting by district/agency/skill/placement status | Built |
| **Software interfaces** | File upload (PDF/JPG, ≤5 MB per FRS); secure REST APIs (JSON) for data exchange | Built |

---

## 8. Non-Functional Design (FRS §3.2)

| Attribute | Requirement (FRS) | Design response |
|-----------|-------------------|-----------------|
| **Performance** | Page load < 3s; 5,000 concurrent users; 99.9% uptime | SPA with client-side caching (TanStack Query), server-side filtering/pagination, indexed queries, stateless API behind a scalable reverse proxy |
| **Security** | RBAC; PII encryption; regular vulnerability scans; ISO 27001 alignment | RBAC middleware on every protected route; Helmet security headers; rate limiting; input validation (Zod); encrypted credentials; session hardening (rolling idle timeout); audit logging; CERT-In external audit planned post-staging |
| **Usability** | Intuitive UI/UX; mobile responsiveness; accessibility (screen readers) | Responsive design, accessible component library, bilingual support |
| **Scalability** | Cloud-based architecture for easy scaling | Stateless application tier, externalised sessions, horizontally scalable behind Nginx |
| **Reliability** | Data backups; user-friendly error handling | Structured error responses; database backup strategy on SDC; structured logging & monitoring |

---

## 9. Standards & Compliance (FRS §2.9, Work Order §4–§6)

- **GIGW** conformance — accessibility for *divyangjans*, State-Government header uniformity, and content guidelines.
- **Data protection** — HTTPS/TLS in transit; encryption of sensitive data; GDPR/PDPA-equivalent principles.
- **Security audit** — internal security audit completed; **CERT-In empanelled external audit** to be undertaken post-staging; any audit observations to be resolved by the vendor per Work Order §4.
- **IT-dept hosting instructions** — deployment per Dept. of IT (GoHP) letter [ref. 5].
- **Maintainability & handover (FRS §3.3)** — modular code design; documentation for handover.
- **Testing (FRS §3.3)** — unit, integration, and **User Acceptance Testing** — UAT completed by the HPSEDC team (see UAT Final Report).

---

## 10. Requirements Traceability Matrix (FRS → Design)

Legend — **Status:** ✅ Designed & implemented · 🔌 Designed; pluggable, HPSEDC-side credential pending.

| FRS ref | Requirement | SRS / design section | Status |
|---------|-------------|----------------------|--------|
| §1.2 | Registration & profile management (candidates, agencies) | §5.1, §5.3 | ✅ |
| §1.2 | Document upload by candidates | §4.1, §5.1 | ✅ |
| §1.2 | Job posting, searching, applying | §5.2, §5.3 | ✅ |
| §1.2 | Scrutiny & scheduling of drives/interviews by agencies | §5.5 | ✅ |
| §1.2 | Placement details & appointment letters by agencies | §5.5 | ✅ |
| §1.2 | Acceptance/confirmation of offers by candidates | §5.5 | ✅ |
| §1.2 | Support: dashboards, FAQs, grievances, notifications, info | §2.3, §6, §9 | ✅ |
| §1.2 | Admin tools: content mgmt, approvals, reporting, oversight | §5.4 | ✅ |
| §1.2 | Bilingual interface (English + Hindi) | §2.5, §6 | ✅ |
| §2.1 | Secure registration & profile creation | §5.1 | ✅ |
| §2.1 | Job postings by verified agencies + targeted search | §5.2, §5.3 | ✅ |
| §2.1 | Document upload, submission, status tracking | §5.1, §5.2 | ✅ |
| §2.1 | Informational/support services incl. training & grievances | §5.4, §9 | ✅ |
| §2.1 | Admin dashboards for monitoring & reporting | §5.4 | ✅ |
| §2.2 | Candidate module (registration, profile, search, apply, notifications) | §2.3, §5.1, §5.2 | ✅ |
| §2.2 | Recruiting Agency module (registration, posting, candidate mgmt, drives, interviews, visa/passport assist) | §2.3, §5.3, §5.5 | ✅ |
| §2.2 | HPSEDC Authority module (approvals, dashboard, reporting) | §2.3, §5.4 | ✅ |
| §2.3 | Candidate registration & profile-management workflow | §5.1 | ✅ |
| §2.3 | OTP authentication | §3.2, §5.1 | ✅ |
| §2.4 | Job application workflow (browse → filter → apply → track → notify) | §5.2 | ✅ |
| §2.5 | Agency registration & job-posting workflow incl. licence verification & approval | §5.3, §5.4 | ✅ |
| §2.6 | Admin verification & approval workflow (doc verify, approve/reject, monitor, report, grievances) | §5.4 | ✅ |
| §2.7 | Recruitment process workflow (drives → review → shortlist → interview → select → appointment) | §5.5 | ✅ |
| §2.7 | Overall workflow incl. placement & follow-up, reporting & monitoring | §5.6 | ✅ |
| §2.8 | Web app (browsers) + responsive + iOS/Android apps | §2.1, §3, §6 | ✅ |
| §2.8 | Aadhaar/UIDAI verification (API) — SSO (HIM Access) | §7 | 🔌 |
| §2.8 | DigiLocker integration | §7 | 🔌 |
| §2.8 | Email/SMS gateway integration | §7 | 🔌 |
| §2.8 | MIS dashboard for administrators | §5.4, §7 | ✅ |
| §2.8 | Multilingual support | §6 | ✅ |
| §2.9 | Data encryption (HTTPS/TLS) + GDPR/PDPA-equivalent + GIGW | §8, §9 | ✅ |
| §2.9 | Leverage open-source libraries; limit custom dev | §3.2 | ✅ |
| §3.1 | Clean responsive UI with navigation menus | §6 | ✅ |
| §3.1 | File upload (PDF/JPG ≤5 MB); email/SMS interfaces | §7 | ✅ / 🔌 |
| §3.1 | Secure APIs for data exchange | §3.1, §7 | ✅ |
| §3.2 | Performance (<3s, 5,000 users, 99.9%) | §8 | ✅ |
| §3.2 | Security (RBAC, PII encryption, vuln scans, ISO 27001) | §8, §9 | ✅ |
| §3.2 | Usability (intuitive, mobile, accessibility) | §6, §8 | ✅ |
| §3.2 | Scalability (cloud-based) | §3.4, §8 | ✅ |
| §3.2 | Reliability (backups, error handling) | §8 | ✅ |
| §3.3 | Maintainability (modular, documentation/handover) | §3.3, §9 | ✅ |
| §3.3 | Testing (unit, integration, UAT) | §9 | ✅ |

> **Coverage summary:** All FRS functional and non-functional requirements are designed and implemented. The four items marked 🔌 (HIM Access SSO, Aadhaar/UIDAI, DigiLocker, Email/SMS gateway) are fully designed as admin-configurable adapters and are pending HPSEDC-side production credentials per the agreed division of responsibilities.

---

## 11. Conclusion

This SRS demonstrates that the design of the Overseas Placement Portal & Mobile Application fully addresses every requirement of the HPSEDC FRS, and that the design has been realised in a working, UAT-tested system. M/s HTIS Telecom Private Limited submits this document to HPSEDC for **design approval** and the consequent release of the **first 40% installment** under Work Order HPSEDC-SOFT/08/2025.
