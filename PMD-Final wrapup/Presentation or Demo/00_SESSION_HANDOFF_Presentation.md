# Session Handoff — HireStream Presentation for the IT Department MD

> **For the agent picking this up:** This document is your starting brief. Read it fully before doing anything. It tells you what the project is, what already exists to reuse, what the user wants you to produce, and how to do it with the tooling on this machine. The user's persistent memory (`MEMORY.md` and the `project_*` / `feedback_*` files) also auto-loads core project context — but this doc is scoped specifically to the **presentation task**.

---

## 1. The task

The user (Subhash, HTIS Telecom) has a **presentation on Monday to the Managing Director (MD) of the HP IT Department** — the top authority over government platforms/infrastructure in Himachal Pradesh. You need to help produce that presentation.

**Format is not yet decided** — the user is weighing:
- **(A) A spoken script + slide outline** that he presents live, or
- **(B) A narrated video/demo** (potentially reusing the existing role-workflow clips).

Your job: help him decide, then build it. Lay out both options with a recommendation, then produce the chosen artifact. Default working assumption until he says otherwise: prepare **a slide outline + a tight spoken script** first (it's reusable either way and can be narrated into a video later).

**Confirm with the user before building (open questions):**
1. **Goal of the meeting** — most likely a mix of: (a) showcase the built platform, (b) demonstrate it's technically sound / secure / standards-compliant, and (c) **secure approval to host on government infrastructure** (the MD is the authority who green-lights the SDC VMs + the air-gapped provisioning ask). Confirm which of these is primary.
2. **Format + duration** — slide deck he presents, or a self-running video? Roughly how long (e.g., 10–15 min)?
3. **Audience size / setting** — just the MD, or a panel? In-person projector, or shared screen?
4. **Tone** — executive/non-technical overview, or technical deep-dive (the MD is technical, so likely a blend).

---

## 2. What HireStream is (the project)

- **Product:** HireStream — the **HPSEDC Overseas Placement Portal & Mobile Application**. A secure, bilingual (English/Hindi) web + mobile platform that helps Himachal youth find **regulated overseas employment**, reducing exploitation by unregulated agents.
- **Vendor:** M/s **HTIS Telecom Pvt. Ltd.**, Mohali — `htistelecom.in`.
- **Client:** **HPSEDC** (HP State Electronics Development Corporation), Shimla.
- **Contract:** Work Order **HPSEDC-SOFT/08/2025** (dated 13.01.2026), RFE **SEDC/Software-EMP/2K24-22560**, value **₹4,42,500** incl. GST. Payment milestones **40/40/20** (design-approval / dev+hosting / completion).
- **Roles in the system:** Candidate (job seeker), Recruiting Agency, (overseas) Employer, HPSEDC Admin/Authority — plus a Superadmin.
- **Companion app:** **Agentryx Verify** — an internal QA / requirement sign-off tracker for HireStream.

## 3. Current status (as of this handoff)

- **Live on staging:** `https://hirestream-stg.agentryx.dev` (currently **v0.7.2.0**) and `https://verify-stg.agentryx.dev`. Both run via PM2 on the same VM (this machine is the staging VM).
- **Built and UAT-tested by the HPSEDC team** — the platform is functionally complete for the contracted scope; UAT Final Report exists.
- **Milestone-1 (40% design approval) document package is ready** (SRS + forwarding letter + sign-off + checklist) — see paths below.
- **External integrations** (HIM Access SSO, Aadhaar/UIDAI, DigiLocker, Email/SMS gateway) are **designed as pluggable, admin-configurable adapters** — they are **HPSEDC-side deliverables**, to be activated when HPSEDC provides production credentials. Frame them as "ready, pending government credentials," NOT as gaps.

## 4. Assets that already exist — REUSE THESE (do not rebuild from scratch)

All under `~/Projects/Recruitment/PMD-Final wrapup/` unless noted.

| Asset | Path | Use in the presentation |
|---|---|---|
| **Tech Stack** (2-page branded PDF) | `Infra-Texh Stack & HW Spec/HireStream_Tech_Stack.pdf` | "How it's built" slide(s) — architecture diagram + stack |
| **Infrastructure Provisioning Request** (branded PDF) | `Infra-Texh Stack & HW Spec/HireStream_Infra_Provisioning_Request.pdf` | THE infra ask — HW/SW for STG+PROD, air-gapped, what we need from IT |
| **Milestone-1 (40%) design-approval package** | `Approval & Delivery Documents/Milestone-1 (40%) Design Approval/` | SRS, FRS traceability, status — proof of completeness |
| **Role workflow videos** | `User Guides and Videos/` → `1-Employer-Workflow.mp4`, `2-Agent-Workflow.mp4`, `3-Candidate-Workflow.mp4` + `clips/` | Demo footage — splice into a video, or play live |
| **FRS + Work Order** (contract) | `FRS-SOW-SRS - Job order/` | Source of truth for scope / requirements |
| **UAT Final Report** | `Corrections & Bug Fixes/HireStream_UAT_Final_Report.pdf` | Evidence the system is tested |
| **HTIS logo** (for branding any new artifact) | `htis_logo.png` | Brand all new PDFs/slides |

## 5. Suggested presentation flow (a starting structure — refine with the user)

A ~12–15 min flow that works for a technical MD whose decision is largely about **hosting/infra approval**:

1. **Context (1 min)** — the problem (unregulated overseas recruitment, migrant risk) → the mandate (FRS, Work Order) → HireStream as the solution.
2. **What it does (2–3 min)** — the four roles + the end-to-end workflow (candidate → agency → employer → placement), bilingual, mobile. *Use a short clip or live click-through.*
3. **Live demo / video (3–4 min)** — the actual portal: candidate apply → agency shortlist → employer approve → placement, + the admin oversight dashboard. Reuse the workflow videos or drive staging live.
4. **How it's built (2 min)** — architecture (3-tier), modern open-source stack, **security** (RBAC, encryption, audit), **standards** (GIGW, ISO 27001-aligned, data protection). Pull from the Tech Stack PDF.
5. **The ask — hosting on government infrastructure (2–3 min)** — the Infrastructure Provisioning Request: STG + PROD VM sizing, software to pre-install, **air-gapped** model, SSH via jump host, integration egress, TLS certs, access needed. **This is what the MD authorizes.** Be crisp and concrete.
6. **Status & next steps (1 min)** — built + UAT-tested, 40% design-approval submitted, what's needed from IT to go to production.

> The single most important slide for THIS audience is #5 (the infra ask) — the MD is the person who provisions the SDC VMs and approves the air-gapped access model. Make it easy to say yes.

## 6. Tooling on this machine (how to actually build things)

- **Branded PDFs / slides as PDF:** there's a proven Markdown → styled-HTML → PDF pipeline using Playwright (Chromium). Reusable build scripts live in `Infra-Texh Stack & HW Spec/` (`build-techstack.cjs`, `build-infra.cjs`) and `Approval & Delivery Documents/Milestone-1 (40%) Design Approval/build-pdfs.cjs`. Pattern: write a `.md`, copy a build script, point it at the file, run:
  `cd ~/Projects/Recruitment/hirestream && NODE_PATH="$(pwd)/node_modules" node "<path-to>/build-*.cjs"`
  The styling is HTIS-branded (navy + gold, logo at `PMD-Final wrapup/htis_logo.png`). Inspect a built PDF with the Read tool to visually verify.
- **Slides:** if the user wants actual slides (not a PDF), options are reveal.js / Marp (Markdown-to-slides) or a Google Slides outline. Confirm preference. A landscape PDF "deck" via the same Playwright pipeline is also viable and stays on-brand.
- **Video:** a video pipeline exists at `~/Projects/Recruitment/hirestream/tests/video/` (memory: Piper TTS narration, Playwright staging recording, stage cards, frame-verify). The role-workflow MP4s in `User Guides and Videos/` were produced this way. For a narrated presentation video, reuse/extend this. (See memory `feedback_walkthrough_videos`.)
- **Driving the live app for screenshots/recording:** Playwright via `hirestream/node_modules` (use `NODE_PATH`). Log in through `/api/auth/login` to set the session cookie, then navigate. Chromium is in the Playwright cache.

## 7. Credentials & runbook (staging — test only)

- HireStream admin: `demo_admin` · superadmin: `superadmin` / `hpsedc@super2026` · most test accounts use `test123`.
- Verify (agentryx-verify): admin `admin` / `admin`.
- Full role map + credentials are in memory `project_session_handoff`. DB: `PGPASSWORD=hirestream psql -h localhost -U hirestream -d hirestream` (and `-d agentryx_verify` for Verify).
- This VM **is** the staging server; both apps run under PM2 (`pm2 list`). **Do not restart shared services without the user's OK** (it's gated).

## 8. Cautions / landmines

- **Don't overclaim integrations.** HIM SSO / Aadhaar / DigiLocker / Email-SMS are designed + pluggable but not live (await HPSEDC credentials). Present as "ready to activate," not "done."
- **Branding:** use **HTIS** (vendor) branding on materials, with "Prepared for HPSEDC." Do **not** put the HPSEDC/government logo on HTIS-authored deliverables (government emblem usage is restricted).
- **Hindi text in PDFs:** the Playwright PDF renderer lacks a Devanagari font — Hindi shows as tofu boxes. Use Latin script ("Hindi") in generated PDFs, or embed a font if Hindi is required.
- **Keep this work in this new session** — the prior session is deep in build/bugfix context; this session is for the presentation only.

## 9. First moves for the new agent

1. Read this doc + skim the Tech Stack and Infra Provisioning PDFs (paths in §4).
2. Ask the user the open questions in §1 (goal, format, duration, tone).
3. Propose the format (recommend script + slide outline first) and a refined version of the §5 flow.
4. On agreement, build it — branded, in this folder (`PMD-Final wrapup/Presentation or Demo/`).

---

*Handoff prepared at the end of a session that produced the Milestone-1 approval package, the Tech Stack and Infrastructure Provisioning PDFs, and several HireStream/Verify fixes. Everything referenced above exists on disk now.*
