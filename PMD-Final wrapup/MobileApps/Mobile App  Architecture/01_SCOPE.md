# 01 — FRS Mobile Scope Analysis

**Source document:** `hirestream/A.PMD/FRS/FRS.txt` (HPSEDC contracted FRS) · **Date:** 2026-05-12

---

## 1. Direct mobile mentions in the FRS

| FRS reference | Line(s) | Verbatim text |
|---|---|---|
| Title page | 1–5 | *"Functional Requirement Specifications (FRS Document) for **Overseas Placement Portal & Mobile Application (HPSEDC)**"* |
| §1.2 Scope | 62–77 | Lists candidate registration, job posting/search, application tracking, grievances, notifications, dashboards, admin tools — does not platform-restrict any of these |
| §2.2 User Roles (Candidate module) | 95–117 | Registration & Login (Aadhaar / email / mobile / HIM Access SSO), Profile Management, Job Search & Application, Notifications (Email/SMS alerts) |
| §2.4 Job Application Workflow | 168–174 | Browse → search filters (location, sector, salary, experience) → view detail → apply with documents → track status → receive notifications |
| §2.8 Other Features | 214–221 | *"Platform: Web application compatible with major browsers and responsive on smartphones and tablets, **iOS and Android applications**"* — also Aadhaar/UIDAI API, HIM Access SSO, DigiLocker, Email/SMS gateway, MIS dashboard, **Multilingual Support** |
| §3.1 UI/UX | 230–235 | Clean responsive design, file upload PDF/JPG max 5MB, secure APIs |
| §3.2 Non-Functional | 237–244 | Page load <3s, 5,000 concurrent users, 99.9% uptime, ISO 27001, mobile responsiveness, **accessibility (screen reader)** |

### Interpretation

The phrasing in §2.8 — *"Web application **compatible with** major browsers **and responsive on** smartphones and tablets, **iOS and Android applications**"* — is structured as **three platforms**:

1. Browser web app (✅ shipped — `hirestream-stg.agentryx.dev`)
2. Mobile-responsive web (✅ shipped — same web app, responsive layouts via Tailwind)
3. **Native iOS + Android applications** (⛔ **not yet built — this is the open scope**)

A responsive web app does **not** discharge requirement #3. The contracted artifact is native mobile applications, distributable via Google Play and Apple App Store.

---

## 2. FRS-mandated mobile capabilities (candidate-facing)

Mapping FRS §2.2 + §2.4 + §2.8 to concrete mobile features. **Everything below is contractually required for the candidate role.** Agency and Admin roles are *not* required on mobile per a strict FRS reading — the FRS only specifies "iOS and Android applications" without saying *all* roles must be available, and §2.2 lists role responsibilities without per-platform constraints. We will deliver candidate-only on mobile in v1.0 and note that agency/admin remain web-only.

| FRS capability | Mobile feature | Priority |
|---|---|---|
| Aadhaar-based or email/mobile verification (§2.2) | Login screen with email + OTP path; Aadhaar may defer to in-app WebView in v1.0 | P0 |
| SSO login (HIM Access) (§2.2) | "Sign in with HIM Access" button, in-app WebView/OAuth | P0 — *blocked on HIM Access mobile SDK availability* |
| Personal details, education, work experience (§2.2) | Profile screen with view + edit | P0 |
| Preference of job roles, countries (§2.2) | Preferences tab inside profile | P0 |
| Edit/update profile information (§2.2) | Profile edit screens | P0 |
| Upload documents — CV, passport, certificates (§2.2) | Document upload using device camera + file picker | P0 |
| View job openings by location, skill, salary (§2.2/§2.4) | Job list + filter + search | P0 |
| Apply with one-click (§2.2) | Apply button on job detail | P0 |
| Track application status (§2.2/§2.4) | "My Applications" screen | P0 |
| Notifications — Email/SMS alerts for job matches, drives, interview calls, status updates (§2.2) | Push notifications (FCM/APNs) + in-app notification inbox | P0 |
| File upload PDF/JPG max 5MB (§3.1) | Document picker with size/type validation | P0 |
| Aadhaar/UIDAI verification API (§2.8) | Deep link to UIDAI flow or in-app WebView | P1 — *may defer to web for v1.0 with redirect* |
| DigiLocker integration (§2.8) | Deep link to DigiLocker app or WebView | P1 |
| Multilingual support (§2.8) | English + Hindi at minimum | P1 — *English-only acceptable for v1.0 if Hindi shipped in v1.1* |
| Accessibility — screen reader (§3.2) | Native accessibility labels on every interactive element | P0 — *non-negotiable for GIGW compliance* |
| Performance — page load <3s (§3.2) | Optimised image loading, skeleton loaders, paginated job list | P0 |
| Security — encryption, role-based access (§3.2) | TLS everywhere, secure token storage in OS keystore (Android Keystore / iOS Keychain) | P0 |

---

## 3. Out-of-scope clarifications

The FRS does **not** explicitly require any of the following on mobile. They will be deferred to a later phase or kept web-only:

- Agency dashboards (job posting, applicant management, drive scheduling)
- Employer review queue (the HPSEDC-internal employer role)
- Admin verification + approval workflows (§2.6)
- MIS reporting (§2.2 Govt/Authority)
- Grievance triage UI for admins (candidates can still raise grievances from mobile)

Justification: §2.2 lists three user types — Candidate, Recruiting Agency, Govt/Authority. Of these, **only the Candidate** has a usage pattern (browse jobs on the go, get push notifications about interviews) that materially benefits from a native mobile app. Agencies and admins do bulk operations on desktop. Putting these roles on mobile in v1.0 doubles or triples the build and adds little user value — and it is not what HPSEDC explicitly contracted.

If during HPSEDC review they push back and want all three roles on mobile, we will scope a phased rollout (candidate v1.0, agency v1.5, admin v2.0) rather than block v1.0 on the entire stack.

---

## 4. Standards & compliance that carry through to mobile

The FRS calls these out and they must propagate to the mobile build:

- **GDPR / PDPA-equivalent + GIGW** (§2.9) — privacy policy, data-export, account deletion (Play Store + App Store both now require an in-app delete-account flow as of 2024–2025).
- **HTTPS / TLS** (§2.9) — pin certificates if feasible.
- **ISO 27001** (§3.2) — controlled deploys, signed artifacts, audit-logged backend.
- **Accessibility** (§3.2) — screen-reader labels, sufficient contrast, dynamic type / font scaling.

---

## 5. What the existing web product gives us "for free"

Most of the mobile app's *content* and *business logic* is already live on the backend. The work is almost entirely on the **presentation layer + auth/push glue**.

| Layer | Status |
|---|---|
| Auth (passport + sessions) | ✅ Live — needs JWT/bearer adapter for mobile (see [03_DEPENDENCIES.md](03_DEPENDENCIES.md)) |
| Job listing + filter | ✅ Live — `GET /api/v1/jobs` + query params |
| Job detail | ✅ Live — `GET /api/v1/jobs/:id` |
| Apply to job | ✅ Live — `POST /api/v1/applications` |
| Application status | ✅ Live — `GET /api/v1/applications/me` |
| Notification inbox | ✅ Live — `GET /api/v1/notifications` |
| Push delivery | ⛔ **Missing** — needs FCM/APNs integration |
| Profile CRUD | ✅ Live — `GET/PATCH /api/v1/me` |
| Document upload | ✅ Live — `POST /api/v1/candidates/documents` (multer, magic-byte verified) |
| Document storage namespace | ✅ Live — `uploads/hs/candidates/{docs,photos}/` (see v0.9.7) |
| Aadhaar verification | 🟡 Adapter shipped, no live credentials |
| HIM Access SSO | 🟡 Adapter shipped, no live credentials |
| DigiLocker | 🟡 Adapter shipped, no live credentials |

This is a key cost-saver: **the mobile app is almost entirely a UI re-skin of an already-tested API surface.** The 334 jest tests on hirestream + the 58 pipeline tests + the 200+ Verify items already exercise the backend. Mobile work is largely greenfield-frontend with a thin server contract.
