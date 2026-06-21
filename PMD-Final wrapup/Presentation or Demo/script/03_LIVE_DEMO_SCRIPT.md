# HireStream — Live Demo Script (HP IT Department MD + panel)

> **Working draft for review.** Once we agree on content, this becomes a clean, easy-to-follow
> presenter document. Goal: walk the portal confidently **and** be ready to answer "what is this"
> and "why is it here" for every feature.

**Format of each step:** 🖱 **Do** (what to click) · 🗣 **Say** (the line) · 💡 **Why** (the justification — your Q&A armor).

**Live URL:** https://hirestream-stg.agentryx.dev · **Total live time:** ~18–20 min + Q&A.

---

## PART 0 — Pre-demo setup (do 15 minutes before)

- [ ] **Network check** — load the staging URL once; confirm it's up.
- [ ] **Four browser windows pre-logged-in**, one per role, so you switch instantly (no live typing of passwords):
  | Window | Login | Role | Pre-open on |
  |---|---|---|---|
  | 1 | `demo_employer` | Overseas Employer | Employer dashboard |
  | 2 | `europe_careers` | Recruiting Agency (verified) | Agency dashboard |
  | 3 | `priya_verma` | Job Seeker (100% profile) | Candidate dashboard |
  | 4 | `demo_admin` | HPSEDC Authority | Admin Overview |
  - All passwords `test123`. (Superadmin `superadmin` / `hpsedc@super2026` — **do not** demo this; it has the data-wipe tool.)
- [ ] **Zoom to ~110%**, light mode, language **English**. Close unrelated tabs.
- [ ] **Fallback ready:** keep `HireStream_Workflows.mp4` open in a tab. **If anything fails live or the network drops, switch to the video** — never debug in front of the MD.
- [ ] Seeded demo data is already rich (placements, applicants, welfare, audit history) — **you do not need to create anything live.** We tour existing state, which is the low-risk path.

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

---

### SECTION C — Job Seeker / Candidate (~4 min) · *window 3*

| | |
|---|---|
| 🖱 **Do** | Open the candidate profile → **Personal & passport** section. |
| 🗣 **Say** | "The profile captures everything the Ministry of External Affairs expects of an emigrant — entered once, carried into every application." |
| 💡 **Why** | Father's/mother's name, current + permanent address, **passport number + expiry**, **ECR / non-ECR status**, and **English proficiency as an IELTS band**. These are exactly the fields MEA/emigration clearance needs. *(UAT issue #4.)* |

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

---

### SECTION D — HPSEDC Authority / Admin (~3 min) · *window 4*

| | |
|---|---|
| 🖱 **Do** | Start on **Overview** — open vacancies, candidates, placements, **application funnel**, reports. |
| 🗣 **Say** | "HPSEDC gets a live, bird's-eye view of overseas recruitment for the whole state." |
| 💡 **Why** | **FRS §2.6: monitor system activities + generate reports.** CSV exports per entity. This is the regulator's cockpit. |

| | |
|---|---|
| 🖱 **Do** | Open **Agencies** and **Employers** verification queues — show approve/reject. |
| 🗣 **Say** | "Nothing moves until HPSEDC approves it. Every agency and employer is verified here before they can operate." |
| 💡 **Why** | **FRS §2.6: review registrations → verify documents → approve/reject.** This is *the* gate that keeps unregulated players out — the platform's core control. |

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

*(Optional: show **Grievances** — FRS §2.6 grievance handling.)*

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
- **"Mobile app?"** → The architecture is **API-ready** (React Native + Expo, same REST API). The mobile build is a **planned next phase** — *frame it as roadmap, not delivered.*
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
- ❌ Don't claim the **mobile app is delivered** — it's architected/planned.
- ❌ Don't log in as **superadmin** in front of the panel (data-wipe tooling).
- ❌ Don't debug live. If anything breaks or the network drops → **switch to `HireStream_Workflows.mp4`.**
- ❌ Don't put the **government emblem** on HTIS materials; brand stays HTIS "Prepared for HPSEDC."
- ✅ Do keep the **Infrastructure Provisioning PDF** handy — it's the artifact the MD actually authorises.
