# HireStream — Live Demo Script
### HPSEDC Overseas Placement Portal · for the HP IT Department MD + panel

> **Presenter guide — final.** Walk the portal confidently **and** be ready to answer "what is this"
> and "why is it here" for every feature. Read the **Why** lines once before the demo — that's your Q&A armour.

**Format of each step:** 🖱 **Do** (what to click) · 🗣 **Say** (the line) · 💡 **Why** (the justification).

**Live URL:** https://hirestream-stg.agentryx.dev · **Mobile (Expo Go):** `exp://hirestream-mobile.agentryx.dev` · **Total live time:** ~20–25 min + Q&A.

---

## PART 0 — Pre-demo setup (do 15 minutes before)

- [ ] **Network check** — load the staging URL once; confirm it's up.
- [ ] **One-click logins are built in.** On the login page, click **"⚡ Demo Mode"** — it slides down a panel of cast members (Candidates / Agencies / Employers / Admin); tap any name to sign in instantly, **no passwords**. Show this once — it also makes the point that the *normal* login is clean and separate.
- [ ] **Recommended:** still keep **four browser windows pre-logged-in**, one per role, so you switch instantly with zero risk:
  | Window | Login | Role | Pre-open on |
  |---|---|---|---|
  | 1 | `demo_employer` | Overseas Employer | Employer dashboard |
  | 2 | `europe_careers` | Recruiting Agency (verified) | Agency dashboard |
  | 3 | `priya_verma` | Job Seeker (100% profile) | Candidate dashboard |
  | 4 | `demo_admin` | HPSEDC Authority | Admin Overview |
  - All passwords `test123`. (Superadmin `superadmin` / `hpsedc@super2026` — **do not** demo this; it has the data-wipe tool.)
- [ ] **Reset button:** the Demo Mode panel has **"Reset demo data"** — restores the clean seeded set (25 candidates / 10 agencies / 10 employers / 28 jobs). Hit it once before you start so the state is pristine. Safe to use even mid-demo.
- [ ] **Mobile ready (optional):** have a phone with **Expo Go** open at `exp://hirestream-mobile.agentryx.dev`; its login has the same one-tap demo cast.
- [ ] **Zoom to ~110%**, light mode, language **English**. Close unrelated tabs.
- [ ] **Fallback ready:** keep `HireStream_Workflows.mp4` open in a tab. **If anything fails live or the network drops, switch to the video** — never debug in front of the MD.
- [ ] Seeded demo data is already rich (placements, applicants, drives, welfare, grievances, audit history) — **you do not need to create anything live.** We tour existing state, which is the low-risk path.

---

## PART 1 — Opening (60–90 sec)

🖱 **Do:** Start on the public landing page (logged out, or window 3 logged out).
🗣 **Say:**
> "HireStream is the HPSEDC Overseas Placement Portal — a Government of Himachal Pradesh initiative for *safe, regulated* overseas employment. Today thousands of our youth go abroad through unregulated agents and get exploited. HireStream puts the whole journey — employer, recruiting agency, job seeker, and HPSEDC as the regulator — onto one supervised, auditable platform."

🖱 **Do:** Point to the **tricolor strip + masthead** at the top, then the **"Choose Your Portal — four stakeholder groups"** section.
💡 **Why:**
- The **tricolor + "An initiative of HPSEDC" masthead + "Screen Reader" link** = GIGW compliance (Guidelines for Indian Government Websites) — mandatory for govt portals.
- The **four-portal model** mirrors **FRS §2.2** (Candidate / Agency / Employer / HPSEDC Admin). One platform, four role-based experiences.

---

## PART 2 — The walkthrough (4 sections)

### SECTION A — Overseas Employer (~3 min) · *window 1*

| | |
|---|---|
| 🖱 **Do** | Show the employer dashboard, then open the **verification / company profile**. |
| 🗣 **Say** | "An overseas employer is the foreign principal who needs manpower. Before they can hire, HPSEDC verifies them." |
| 💡 **Why** | The employer is a **foreign company**, not Indian — so we capture foreign company details + country, and the documents a foreign principal must provide: **demand letter** (the manpower request), **power of attorney** (authorising the Indian agent), **business registration/trade licence**, **employment contract**, and **authorised signatory's passport**. This blocks fake/unvetted employers — the root of overseas recruitment fraud. *(UAT issue #1 — employer verification clarified; employer corrected to "overseas company.")* |

| | |
|---|---|
| 🖱 **Do** | Open **Post a Requisition** — walk the form: role basics, **destination country + city**, **overseas job category**, positions, **min experience**, **salary range**, **min qualification**, **languages on the CEFR scale**, skills. |
| 🗣 **Say** | "Each requisition is rich because it's what our matching engine scores candidates against." |
| 💡 **Why** | Qualification, experience, language (CEFR), skills, and category each become a **weighted factor in every candidate's match %**. Salary range is mandatory → **pay transparency** (FRS 1.15 server-side salary filter). Category = UAT issue #8. Requisitions are `agents_only` — candidates never see them directly; that's the regulated funnel. |

| | |
|---|---|
| 🖱 **Do** | Show the **6-stage applications pipeline** (submitted → reviewed → shortlisted → interview → selected → placed) and the **Review Queue**. |
| 🗣 **Say** | "The employer sees, at a glance, how many candidates sit at each stage across all their requisitions — and reviews shortlisted candidates here." |
| 💡 **Why** | The Review Queue **aggregates across every agency** that picked up the requisition (the multi-agent model — see Section B). FRS §2.7: the **employer reviews + decides** (approve for interview / request replacement / reject); the agency sources. The employer can also schedule an interview directly. |

> **If asked "can the employer see every applicant?"** → No. The employer only sees candidates **from shortlist onward** (the agency scrutinises first), and **never sees a candidate's rejected status with their name attached** — see the privacy rule in Section C.

---

### SECTION B — Recruiting Agency (~3 min) · *window 2*

| | |
|---|---|
| 🖱 **Do** | Show the agency dashboard; open the **verification documents** panel. |
| 🗣 **Say** | "A recruiting agency is a *licensed* Indian intermediary. HPSEDC verifies it before it can operate." |
| 💡 **Why** | The agency uploads the **nine documents the Ministry of External Affairs mandates**: the **MEA recruiting licence**, certificate of incorporation, PAN, GST, office address proof, authorised signatory ID, labour/recruitment permission, proof of past overseas placement experience, and the **recruitment undertaking with HPSEDC**. This is the legal core of the Emigration Act — only licensed agents may recruit for overseas. *(UAT issue #3.)* |

| | |
|---|---|
| 🖱 **Do** | Open **Open Requisitions** → show **Pick Up** (and the "already picked up" state). |
| 🗣 **Say** | "A verified agency picks up an employer's demand, which creates a public job it now owns and sources candidates for." |
| 💡 **Why** | Pickup creates a **derivative job** (`parentRequisitionId`). **Multiple agencies can pick up the same requisition** → each gets its own candidate pool, and the employer's queue unifies them. This is how one demand reaches many sourcing channels while HPSEDC keeps one audit trail. |

| | |
|---|---|
| 🖱 **Do** | Open the **applicants pipeline** — point to each candidate's **match score**; shortlist; show **Schedule interview**. |
| 🗣 **Say** | "The agency scrutinises applicants — each carries a match score — and shortlists the strongest for the employer." |
| 💡 **Why** | **FRS §2.2: scrutiny + scheduling is the agency's job.** The match score (7-factor weighted engine) lets a recruiter triage objectively rather than by gut feel. *(Match score = UAT issue #2.)* |

| | |
|---|---|
| 🖱 **Do** | Open a candidate record → show **visa/passport status**, **appointment letter**, **Pre-Departure tracker**, **30/60/90-day welfare check-ins**. |
| 🗣 **Say** | "After selection, the agency drives deployment — and stays responsible for the worker after they've gone abroad." |
| 💡 **Why** | The agency issues the **appointment letter**, tracks **visa/passport**, and records the **mandatory 30/60/90-day post-placement welfare check-ins** — a direct **Emigration Act** obligation. This is the single biggest anti-exploitation feature: the worker isn't forgotten once placed. |

| | |
|---|---|
| 🖱 **Do** | Open **Drives** → open the approved "Gulf Skilled Trades Drive" → show **Registered Candidates** → click **Invite** on one, then **Schedule Interview** (pick a role, date) for a registrant. |
| 🗣 **Say** | "Agencies also run recruitment drives — walk-in job fairs. Candidates register, the agency invites and interviews them on the spot, and it all flows into the same pipeline." |
| 💡 **Why** | Drives are **FRS-mandated** mass-recruitment events. The full lifecycle is live: HPSEDC **approves** the drive → candidates **register** → agency **invites** (candidate notified) → agency **schedules an on-the-spot interview**, which creates the application and feeds the normal selection → placement pipeline. Nothing happens off-book — every drive interview is auditable. |

---

### SECTION C — Job Seeker / Candidate (~4 min) · *window 3*

| | |
|---|---|
| 🖱 **Do** | Open the candidate profile → **Personal & passport** section. |
| 🗣 **Say** | "The profile captures everything the Ministry of External Affairs expects of an emigrant — entered once, carried into every application." |
| 💡 **Why** | **Sex (as per passport)**, father's/mother's name, current + permanent address, **passport number + expiry**, **ECR / non-ECR status**, and **English proficiency as an IELTS band**. These are exactly the fields MEA/emigration clearance needs — sex is captured here (not on the public signup) because visas, eMigrate and the gender-specific provisions of the Emigration Act all require it. *(UAT issue #4.)* |

| | |
|---|---|
| 🖱 **Do** | Show **Education** (multiple qualifications), **Experience**, **Documents** (CV and passport in *separate* slots, green ✓ when HPSEDC-verified). |
| 🗣 **Say** | "Candidates add their full education and work history, and upload documents into clearly separated, individually-verified slots." |
| 💡 **Why** | Multiple qualifications = issue #5; experience matched **fairly** with the old "3+ years only" note removed = issue #6; **CV and passport separated + per-document green verification tick** = issue #7. The verification tick tells the candidate exactly what HPSEDC has accepted. |

| | |
|---|---|
| 🖱 **Do** | Open **Find Jobs** → use filters (country / category / experience / salary) → open a job → show the **personal match score** and the skills breakdown. |
| 🗣 **Say** | "Against every vacancy, the candidate sees a single match percentage — how well they fit." |
| 💡 **Why** | **FRS §2.4: advanced search + detailed job view.** The match % weighs skills, experience, qualification, preferred country, language, and salary against the role — same engine, candidate's side. Demystifies "why am I / am I not a fit." |

| | |
|---|---|
| 🖱 **Do** | Show **My Applications** (6-stage tracker), the **"Viewed" badge**, and **interview confirm / reschedule / decline**. |
| 🗣 **Say** | "Applying is one click, and from then the candidate always knows exactly where they stand — and is in control of their interview." |
| 💡 **Why** | **FRS §2.4: track status + notifications.** Candidate-side interview control (confirm/reschedule/decline) respects the person's agency. **Privacy rule:** on rejection the **employer's name is scrubbed** (`notifications.hide_employer_in_negatives`) — FRS §5 — so a candidate is never told "Company X rejected you." |

| | |
|---|---|
| 🖱 **Do** | Show the **offer accept** + the **Pre-Departure Tracker** (passport · PCC · medical · visa · PDO · PBBY · appointment letter · travel) + welfare timeline. |
| 🗣 **Say** | "When the offer comes, the candidate accepts here — and follows their entire pre-departure journey from their own dashboard." |
| 💡 **Why** | The 9-step checklist encodes **emigration best practice**: police clearance (PCC), medical, **PDO** (pre-departure orientation), **PBBY** (Pravasi Bharatiya Bima Yojana — mandatory emigrant insurance). The candidate sees their own visa status and welfare check-ins — transparency end-to-end. |

| | |
|---|---|
| 🖱 **Do** | Open **Recruitment Drives** → show an approved drive → **Register**; on a drive they've been invited to, point to the **"🎉 You're invited — please attend"** badge. *(Vikram Negi is pre-seeded as invited.)* |
| 🗣 **Say** | "Candidates can find and register for recruitment drives themselves, and see when an agency invites them." |
| 💡 **Why** | Closes the loop with the agency's Drives view (Section B): the candidate self-serves registration and gets a clear, notified invite — no middle-man phone calls, fully tracked. |

| | |
|---|---|
| 🖱 **Do** | Open **Grievances** → file one, then (as admin in window 4) reply, and back as the candidate **Close** it. |
| 🗣 **Say** | "Any user can raise a grievance and have a two-way conversation with HPSEDC — and the person who raised it is the one who closes it." |
| 💡 **Why** | **FRS §2.6 grievance handling**, done properly: a threaded conversation between complainant and HPSEDC, HPSEDC owns and acts, but **only the complainant can mark it resolved** — staff can't silently close a citizen's complaint. Accountability by design. |

---

### SECTION D — HPSEDC Authority / Admin (~3 min) · *window 4*

| | |
|---|---|
| 🖱 **Do** | Start on **Overview** — vacancies, candidates, placements, reports. Then open **Funnel** → show the **Pipeline funnel** and the **Conversion pipeline** (the continuous pipe: Submitted 47 → Placed 9, with pass-through % at each stage). |
| 🗣 **Say** | "HPSEDC gets a live, bird's-eye view — including exactly where candidates drop off between applied and placed." |
| 💡 **Why** | **FRS §2.6: monitor activities + generate reports** (CSV exports per entity). The funnel is **cumulative** — each stage counts everyone who reached *at least* that point — and the conversion pipe shows the **pass-through rate at every gate**, so HPSEDC can see which stage leaks. This is the regulator's cockpit. |

| | |
|---|---|
| 🖱 **Do** | Open **Agencies** and **Employers** verification queues — show approve/reject. |
| 🗣 **Say** | "Nothing moves until HPSEDC approves it. Every agency and employer is verified here before they can operate." |
| 💡 **Why** | **FRS §2.6: review registrations → verify documents → approve/reject.** This is *the* gate that keeps unregulated players out — the platform's core control. |

| | |
|---|---|
| | |
|---|---|
| 🖱 **Do** | Open **Drives** → show the pending drive awaiting approval → **Approve** it. |
| 🗣 **Say** | "Recruitment drives don't go live until HPSEDC approves them — same gate as everything else." |
| 💡 **Why** | The drive a candidate registers for (Section C) and the agency runs (Section B) only becomes visible **after this approval**. One consistent control: HPSEDC signs off agencies, employers, jobs *and* drives. |

| | |
|---|---|
| 🖱 **Do** | Open **Compliance** (visa pipeline + **risk flags**) and **Welfare SLA**. |
| 🗣 **Say** | "These tools track the duties that protect the migrant worker." |
| 💡 **Why** | Risk flags surface "**placed without PDO / PBBY**", "**placed, visa not yet approved**", "**visa rejected**", "**passport expiring < 6 months**" — so HPSEDC catches non-compliant placements *before* a worker is harmed. Welfare SLA tracks overdue 30/60/90-day check-ins (even placements with a missing start date). |

| | |
|---|---|
| 🖱 **Do** | Open **Audit Log** — scroll the immutable record (actor · action · timestamp). |
| 🗣 **Say** | "Every action on the platform is recorded — who did what, and when — and it cannot be quietly changed." |
| 💡 **Why** | An **immutable audit log** is the backbone of government accountability. Every status transition writes one row (`from`, `to`, `actorRole`, `reason`). Disputes are traceable; nobody can rewrite history. |

| | |
|---|---|
| 🖱 **Do** | Open **System Config** (the knobs) and **Integrations**. |
| 🗣 **Say** | "HPSEDC can tune the platform's policy without any code change — and switch on government integrations from here when credentials are provided." |
| 💡 **Why** | 20+ live settings (pairing mode, verification-required, session timeout, rejection rules…) = the platform adapts to HPSEDC policy. Integrations (HIM SSO, Aadhaar, DigiLocker, Email/SMS) are **pluggable adapters, admin-configurable** — *ready, pending production credentials.* **(Say "ready to activate," not "done.")** |

| | |
|---|---|
| 🖱 **Do** | Open **System → Architecture** → switch the three sub-tabs: **Matching Engine**, **Tech Stack**, **Infrastructure**. |
| 🗣 **Say** | "And the platform documents itself. The matching logic, the full technology stack, and the exact infrastructure we need are all built into the admin console." |
| 💡 **Why** | **This is your strongest card with a technical panel.** *Matching Engine* = the explainable 0–100 score (7 weighted factors, missing-criteria policy, fully admin-tunable). *Tech Stack* = the 3-tier open-source architecture (React / Node / PostgreSQL, RBAC, audit log). *Infrastructure* = the precise STG/PROD provisioning ask. Nothing is a black box — the regulator can see *how* it works and *what it needs to run*. |

*(Grievances are covered in Section C; **Notifications** templates, **Fraud Watch**, **Duplicates** and **Countries** are also here if the panel wants depth.)*

---

### SECTION E — Mobile App (~2 min, optional) · *phone with Expo Go*

| | |
|---|---|
| 🖱 **Do** | On the phone, open the HireStream app (Expo Go → `exp://hirestream-mobile.agentryx.dev`). On the login screen tap a **Demo Mode** card (e.g. *Priya Verma*). Show the candidate home, job list, an application, notifications. |
| 🗣 **Say** | "The same platform runs natively on the phone — built on React Native, talking to the very same API. A candidate in a village can do everything from a handset." |
| 💡 **Why** | One backend, two front-ends (web + native) — the candidate-facing journey on Android & iOS. **Be precise:** this is running live on the device through **Expo** (the development runtime); the **signed Play Store / App Store builds are the next step** — the build pipeline (EAS profiles) is already configured. *Frame as "running on device today, store release next," not "published."* |

---

## PART 3 — Cross-cutting strengths (weave in where natural, or as a wrap-up)

- **Security:** Role-Based Access Control (4 roles), encryption in transit (TLS) + at rest, bcrypt password hashing, OTP, hardened sessions (rolling timeout), rate limiting, **encrypted integration credentials**, full audit trail.
- **Accessibility (GIGW / WCAG 2.1 AA):** tricolor masthead, **Screen Reader Access page** (lists NVDA/JAWS/VoiceOver/TalkBack…), skip-to-content, keyboard nav, A⁻/A/A⁺ font sizing, dark mode, ARIA landmarks — *accessibility for divyangjans.*
- **Bilingual:** English + Hindi (i18next), switchable.
- **Matching engine:** 7-factor weighted score, with **IELTS↔CEFR** conversion so language is comparable across scales.
- **Data integrity:** fraud watchlist, duplicate detection, namespaced file storage with magic-byte upload verification.
- **Architecture:** clean 3-tier, modern open-source stack (React / Node / PostgreSQL), versioned REST API, **stateless app → scales horizontally**.

---

## PART 4 — Anticipated Q&A (rehearse these)

### Hosting & infrastructure
- **"Where will this run?"** → On HP State Data Centre VMs. We've submitted a precise Infrastructure Provisioning Request: **STG (4 vCPU/8 GB/100 GB) + PROD (8 vCPU/16 GB/200 GB)**, sized for the FRS 5,000-concurrent-user target.
- **"How is it secured at the infra level?"** → **Air-gapped** — VMs isolated from the internet, SSH only via your jump host. We deliver a pre-built artifact; **no build ever runs on the server**. Ports 443/80/22 only; integration egress on request.
- **"What do you need from us?"** → Two VMs, base software pre-installed (Ubuntu 24.04 / Node 20 / PostgreSQL 16 / Nginx), **CA-issued TLS certs** (no Let's Encrypt in an air-gap), a service account + backup target. It's all itemised in the provisioning document.

### Security & data protection
- **"Is data encrypted?"** → TLS in transit; sensitive data + integration credentials encrypted at rest.
- **"Audit / tamper-evidence?"** → Immutable audit log on every action; admin-only terminal-state overrides, themselves audited.
- **"Standards?"** → **ISO 27001-aligned** practices; **GDPR/PDPA-equivalent** data protection; **GIGW + WCAG 2.1 AA** for accessibility.
- **"Session security?"** → PostgreSQL-backed sessions, rolling idle timeout, OTP, optional single-session-per-user (configurable).

### Integrations *(be precise — do not overclaim)*
- **"Are Aadhaar / DigiLocker / HIM SSO live?"** → **They're built as pluggable adapters and admin-configurable, but not yet active — they activate the moment HPSEDC provides production credentials, with no code change.** They're **HPSEDC-side deliverables** (government credentials), not gaps in our build.
- **"Email/SMS?"** → Same model — Nodemailer + pluggable SMS adapter, switched on with the government gateway credentials.

### Scale, performance, availability
- **"Will it handle load?"** → Stateless API scales horizontally; targets are **<3s page load, 5,000 concurrent users, 99.9% uptime**, with daily PostgreSQL backups + WAL archiving and health monitoring.
- **"Disaster recovery?"** → Daily DB dumps + VM snapshots to your backup target; a standby DB replica can be added if a penalty-backed SLA applies.

### Scope, status & maintainability
- **"Is it finished?"** → Web portal is **built across the full contracted scope and UAT-tested** (UAT Final Report on record); **40% design-approval milestone submitted**. Running live on staging today — everything shown is the real platform.
- **"Mobile app?"** → It's **running on the device today** (React Native + Expo, same REST API) — we can demo it live. What's left is the **signed store release** (Play Store / App Store); the build pipeline is already set up. *Frame as "running on device now, store publication next" — not "published."*
- **"Who maintains it / lock-in?"** → 100% open-source stack, **TypeScript end-to-end**, modular and documented for handover. No proprietary licences, no vendor lock-in.

### Process / FRS
- **"Why agency *and* employer — isn't that redundant?"** → FRS §2.2/§2.7 split: the **agency sources + scrutinises + handles paperwork**; the **employer reviews + decides**. HPSEDC supervises both. It mirrors the real regulated recruitment chain.
- **"What stops a candidate seeing who rejected them?"** → Policy-enforced employer-name scrubbing on all negative notifications (FRS §5).

---

## PART 5 — Close (30 sec)

🗣 **Say:**
> "HireStream is built, tested, and running. It makes overseas recruitment for Himachal's youth safe, regulated, and fully accountable — with HPSEDC in control at every step. The one thing we need to go to production is hosting on the State Data Centre, and we've made that ask precise and easy to action. Thank you — happy to take questions."

---

## APPENDIX — Landmines (what NOT to do/say)
- ❌ Don't claim **integrations are live** — always "ready, pending government credentials."
- ❌ Don't claim the **mobile app is published** — it runs live via **Expo (dev runtime)**; signed store builds are next. Demo it, but say so.
- ❌ Don't log in as **superadmin** in front of the panel (data-wipe tooling).
- ❌ Don't debug live. If anything breaks or the network drops → **switch to `HireStream_Workflows.mp4`.**
- ❌ Don't put the **government emblem** on HTIS materials; brand stays HTIS "Prepared for HPSEDC."
- ✅ Do **Reset demo data** once before you start (Demo Mode panel) so the state is pristine.
- ✅ Do keep the **Infrastructure Provisioning PDF** handy — it's the artifact the MD actually authorises.
- ✅ Do open **System → Architecture** if the panel gets technical — it answers "how does it work / what does it need" on screen.

---

*HireStream — HPSEDC Overseas Placement Portal · Prepared by M/s HTIS Telecom Pvt. Ltd. for HPSEDC · Demo guide v1.0*
