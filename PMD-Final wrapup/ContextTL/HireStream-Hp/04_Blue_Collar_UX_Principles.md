# Blue-Collar UX Principles for HireStream-HP

**Purpose.** The pivot from a marketplace portal (multi-role, professional users, English-first) to a **single-agency, Hindi-first, low-literacy-friendly blue-collar portal** is a UX shift as significant as the architectural fork itself. This document captures the principles that should govern every screen decision in Sprints HP-2 through HP-8.

**The user we're now designing for.**
A Himachal Pradesh resident, 20-45 years old, likely male but not exclusively, primary or secondary school education, first-language Hindi (Pahari dialects common), works or has worked in a trade (mason, plumber, driver, cook, factory worker, security guard, agricultural labour, hospitality). Uses **WhatsApp daily** on a shared Android phone; may not have a Gmail account; comfortable with **voice notes** and **camera** but not with typing paragraphs; has heard about "gulf jobs" from a family member or agent; has been burned by unlicensed agents before and is cautious about giving money upfront.

**Non-goal.** We are **not** designing for the resume-toting, English-fluent, LinkedIn-savvy tech worker. That's the reference portal (`hirestream-stg`) and it stays.

---

## Ten guiding principles

### 1 · Hindi-first, English as toggle
The default locale on any page load should be **Hindi (`hi-IN`)**. English toggle top-right, remembered per user (localStorage + user profile field). Every screen, every label, every error message, every button — Hindi in the tree, English as translation source. No English-first pages, not even the admin dashboard (admins are HPSEDC staff, mostly Hindi-comfortable).

**Implementation:** i18next default locale switches from `en` to `hi`. Every new component uses `t()`; new keys land in `hi.json` first with an `en.json` mirror.

### 2 · One question per screen
Blue-collar users lose context on long multi-field forms. Rebuild the profile wizard so **each screen asks one question**, has a **large tap target** for the answer, and progresses forward with a single button. Aadhaar-eKYC and the WhatsApp UI are the mental models.

**Example — replacing the current "Full name / DOB / Gender" combined screen:**
- Screen 1: "आपका नाम क्या है?" (Your name?) — one text field, voice-input mic, "Next" button.
- Screen 2: "आपकी जन्म तिथि क्या है?" (Your date of birth?) — big calendar picker with year-wheel first.
- Screen 3: "आपका लिंग?" (Your gender?) — three big buttons (Male / Female / Prefer not to say) with icons.

**Trade-off:** more screens = more clicks. But blue-collar completion rate on 3-column forms is anecdotally 30-40% vs one-question-per-screen at 70-80%.

### 3 · Pictorial job categories, not text dropdowns
The current portal has a dropdown with 200+ job categories. For blue-collar users, **replace with a grid of icon cards** for the top 30-40 blue-collar trades — driver, mason, welder, electrician, plumber, cook, security guard, cleaner, agricultural worker, construction helper, hospitality steward, factory worker, care giver, tailor, carpenter, painter, delivery worker, salon worker.

**Design:**
- 3-4 columns on mobile, 6 on desktop.
- Each card: 64×64 icon (from a free set like Iconify, Flaticon-Freepik, or hand-drawn), Hindi label, English subtitle.
- "Other trade" card at the end goes to a free-text screen with voice input.

**Reference:** Meesho / Blue Star category grids; the Aadhaar UIDAI onboarding portal.

### 4 · Voice input on every free-text field
Where the browser supports it (Chrome / Edge on modern Android — the majority of the target user base), enable **SpeechRecognition** on every text field. Mic button inline with the input; press to record, release to submit. Fallback to typing where not supported.

**Fields where voice matters most:**
- Full name (yes — even a name; typing Hindi on Android soft-keyboards is friction)
- Correspondence address
- Occupation / trade description
- Grievance filing (item 17)
- Family / emergency contact name

**Implementation:** a shared `<VoiceInput>` wrapper component; degrades gracefully.

### 5 · Camera-first document upload
Blue-collar users' laptops have no scanned copies of documents. But everyone has a phone camera. Every document field should:
- **Default to camera capture**, not file picker (`<input type="file" accept="image/*" capture="environment">`).
- Auto-crop / de-skew via a library like Scanbot / DocumentCV / an open-source cropping helper.
- Show a **live thumbnail preview** with a "retake" button before submitting.
- Support **PDF via file picker** as secondary option.

**Documents in the flow:** Aadhaar, passport, PAN, 10th mark sheet, trade cert, medical fitness cert, police clearance cert, passport-size photo.

### 6 · Larger touch targets + higher contrast
- Minimum tap target 48×48 dp per Material 3 guidelines; buttons preferably 56 dp height.
- Body text 16px minimum (currently 14px in some flows).
- WCAG AA contrast ratio 4.5:1 minimum; go for AAA (7:1) on primary CTAs.
- Errors in Hindi, red, with a red icon — never rely on color alone.

**Impact:** desktop UI feels "roomier" than the reference portal. That's the correct trade-off for the target user.

### 7 · WhatsApp as first-class channel (subject to item 20 decision)
If MD approves the WhatsApp-primary reframe:
- **Registration via WhatsApp** — user sends "Start" to HPSEDC's WhatsApp number, gets onboarded through a bot flow that captures the same fields as the portal.
- **Job alerts** — pushed as WhatsApp messages with a "View" button that deep-links back to the portal for details.
- **Application status** — status changes trigger WhatsApp updates.
- **Grievances** — user files a grievance by messaging the WhatsApp number; portal captures the transcript.
- **Monthly check-in** (item 19) — WhatsApp bot asks "Are you well? Any issue?" once a month.

**Portal becomes the admin / candidate-detail surface**, not the primary intake.

**Tech:** WhatsApp Business API via a BSP (WATI / Gupshup / Interakt / Twilio). Meta Business Verification is the critical path (7-14 days).

### 8 · No "brief description" free text — structured tags instead
The current portal's "Brief Description" (about-me) is written for LinkedIn users. Blue-collar users won't write "results-driven electrician with 7 years experience". Instead:
- Predefined structured tags: **years of experience** (from item 10 change), **worked in countries** (list), **primary trade**, **secondary skills** (up to 5).
- **No free-text about-me.** If HPSEDC insists, make it voice-only (record 30-second audio, store as blob, transcribe with Whisper for search).

This reframes UAT item 11 ("improve brief description") as **remove brief description, replace with tags**.

### 9 · Currency and salary in local + INR
Salary expectations must show both **destination-country currency** (SAR, AED, KWD, QAR, USD, EUR) and **INR equivalent** at a periodically-refreshed rate. The user thinks in INR; the offer is in SAR.

**Implementation:** a `currency_rates` reference table refreshed weekly from a free API (Frankfurter, ExchangeRate-API); a `<Money>` component that dual-displays.

### 10 · Trust signals over marketing
Every candidate-facing screen should reinforce that the portal is **run by the government** (not a private agent):
- **HPSEDC + Government of Himachal Pradesh** wordmark visible above the fold on every screen.
- **Ashoka Emblem** (Indian govt) on the landing page — govt portals are known to display this and users recognize it as trust.
- **"Verified by HPSEDC"** badge on every job listing.
- No "Apply now!" hype language. Prefer factual — "Register here to be considered".
- Prominent **"Report a fraud agent"** link on every page — govt portals should be the reporting channel for private-agency fraud.

---

## Applied — what changes on each existing screen

| Existing screen (multi-role portal) | HireStream-HP treatment |
|---|---|
| Landing page (job-board hero) | **Government portal hero** — Ashoka emblem, HPSEDC + HP Govt wordmarks, "Register for overseas employment" primary CTA, Hindi headline |
| Auth page — Login / Register tabs | Kept, but Hindi labels default. **Remove employer / agency role from register dropdown** (only "Candidate" role available). |
| Profile wizard — 8-step multi-field | **Split into 20+ one-question screens.** Each ~5-10 seconds to complete. |
| Candidate dashboard | **Simplified** — no job-board browsing on the dashboard; instead: (1) "My profile" completeness bar, (2) "My applications" list, (3) "Grievance / Support" button. |
| Employer dashboard | **Removed entirely** — the employer role no longer exists in HP variant. |
| Agent (agency) dashboard | **Removed entirely** — HPSEDC is the sole agency; no external agencies. |
| Admin dashboard | **Kept** — HPSEDC staff use it for candidate management. Hindi-first labels; blue-collar-relevant filters (trade, destination country, current status). |
| Superadmin dashboard | **Kept** — same as reference. |
| Job listing page | **Icon-card grid** by trade category. Filter by destination country + trade. Salary in dual currency. Trust badge on each. |
| Application detail page | **Simplified**. Status timeline in Hindi with pictorial states (submitted / under-review / interview / selected / visa-applied / visa-approved / placed). |
| Grievance page | **Voice-first**. Or WhatsApp deep-link, if item 20 goes ahead. |
| Documents page | **Camera-first**. Live preview. |
| Country administration (admin) | **Kept unchanged** — HPSEDC staff will use it. |
| Operator Console | **Kept unchanged** — critical for HPSEDC ops. |
| Accessibility / GIGW compliance | **Kept unchanged** — mandatory for govt portal. |

---

## Sequence — when to apply which principle

Not all principles land at once. Sprint alignment:

- **HP-2** — Principles 1 (Hindi default) + labels swap (UAT-A items).
- **HP-3** — Principles 1, 10 (trust signals) + trim of employer / agency roles.
- **HP-4** — Principles 2 (one-question wizard), 3 (pictorial categories), 4 (voice input), 6 (larger targets).
- **HP-5** — Principles 5 (camera-first docs), 8 (structured tags), 9 (dual currency).
- **HP-6** — Principle 7 (WhatsApp) if MD approves item 20 reframe.

---

## Things that must NOT change (fork or not)

Some principles from the reference portal stay because they're mandatory:

- **WCAG 2.1 AA + GIGW compliance** — govt portal requirement, not optional.
- **Audit log on regulated-field changes** — same rules.
- **Country validator with India blocked** — overseas mandate.
- **Session security** (bcrypt cost 12, session cookie flags).
- **KYB for candidates** (Aadhaar / passport / PCC) — verification integrity is HPSEDC's differentiator vs private agencies. Do not weaken.
- **Embedded testing framework** (Jest + deep-smoke + confidence gate) — Agentryx standard.
- **Verify portal integration** — every feature change syncs a Verify entry.

---

**End of blue-collar UX principles. Apply liberally in Sprints HP-3 onward.**
