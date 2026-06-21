# HireStream Demo — Cast Sheet (who's who)

> Your "I know this data" reference for the live demo. Every persona maps to a pipeline stage or
> feature so the whole platform lights up. All logins use `test123`. Draft for review.

## Design principle
10 candidates are spread across **every pipeline stage** + welfare + compliance flags, so you can open
any of them and a real feature shows. Agencies/employers split into **approved** (operate now) and
**pending** (so you can demo the approval flow live).

---

## CANDIDATES — 10 (6 male · 4 female)

| # | Name | Login | Sex | Trade · Destination | Via agency | Employer | Pipeline stage | What it lets you show |
|---|------|-------|-----|--------------------|------------|----------|----------------|----------------------|
| 1 | **Arjun Thakur** | `arjun_thakur` | M | Construction · Dubai | Gulf Jobs Direct | Al-Mansoori | **PLACED · active** | The success story — pre-departure tracker complete, visa approved, appointment letter, welfare 30✓/60✓/90 due |
| 2 | **Priya Verma** | `priya_verma` | F | Registered Nurse · Germany | Europe Careers | Sakura Care | **PLACED · active** | Healthcare placement; non-ECR; IELTS 7.0; welfare 30✓ |
| 3 | **Karan Rana** | `karan_rana` | M | Driver · UAE | Gulf Jobs Direct | Al-Mansoori | **SELECTED** (offer issued) | Offer stage — accept the offer live from the candidate side |
| 4 | **Meera Iyer** | `meera_iyer` | F | Caregiver · Japan | Europe Careers | Sakura Care | **INTERVIEW SCHEDULED** | Interview confirm / reschedule / decline; 88% profile (1 missing doc → verification states) |
| 5 | **Vikram Negi** | `vikram_negi` | M | Welder · Saudi Arabia | Gulf Jobs Direct | Al-Mansoori | **SHORTLISTED** | Appears in the employer Review Queue; match score |
| 6 | **Ananya Bhatt** | `ananya_bhatt` | F | IT Support · Germany | Europe Careers | Sakura Care | **REVIEWED** | The "Viewed" badge on the candidate's application |
| 7 | **Aman Kapoor** | `aman_kapoor` | M | Plumber · Kuwait | Gulf Jobs Direct | Al-Mansoori | **SUBMITTED** (+ 2nd application) | A fresh applicant; multi-application tracking |
| 8 | **Sahil Verma** | `sahil_verma` | M | Electrician · Oman | Gulf Jobs Direct | Al-Mansoori | **REJECTED** | Rejection privacy — employer name scrubbed; rejection reason shown |
| 9 | **Neha Chauhan** | `neha_chauhan` | F | Housekeeping · Bahrain | Europe Careers | Sakura Care | **PLACED · compliance-flagged** | Admin compliance risk flags: *placed without PBBY* + *visa not yet approved*; welfare SLA overdue |
| 10 | **Rohit Sharma** | `rohit_sharma` | M | Hotel Staff · Qatar | Gulf Jobs Direct | Al-Mansoori | **PLACED · visa rejected** | Compliance flag: *visa rejected* — shows how HPSEDC catches a problem placement |

**Coverage check:** submitted · reviewed · shortlisted · interview · selected · placed (×4) · rejected · compliance flags · welfare timeline · multi-application · profile-complete vs missing-doc · ECR vs non-ECR · IELTS range · 8 destination countries · 6M/4F. ✅ every pipeline + admin feature is reachable.

### Per-candidate data we fill
Personal (father/mother, current+permanent address, DOB), **passport no. + expiry**, **ECR/non-ECR**, **IELTS band**, photo, education (10th/12th/degree), experience, preferred country/category, skills. Documents below.

---

## AGENCIES — 4 (2 approved · 2 pending)

| Agency | Login | Status | Role in the story |
|--------|-------|--------|-------------------|
| **Europe Careers Pvt. Ltd.** | `europe_careers` | ✅ Approved | Sources for Europe + Japan (healthcare, IT). Operates now. |
| **Gulf Jobs Direct** | `gulf_jobs_direct` | ✅ Approved | Sources for the Gulf (construction, hospitality, trades). Operates now. |
| **Himalayan Overseas Consultants** | `himalayan_overseas` | ⏳ **Pending** | All 9 MEA docs uploaded, awaiting HPSEDC approval → **demo the approve flow** |
| **Pioneer Manpower Services** | `pioneer_manpower` | ⏳ **Pending** | Docs uploaded, awaiting approval → second approval demo / reject path |

**MEA 9-doc set per agency:** recruiting licence · incorporation certificate · PAN · GST · office address proof · authorised-signatory ID · labour/recruitment permission · past overseas-placement experience · HPSEDC recruitment undertaking.

---

## EMPLOYERS — recommended 4 (2 approved · 2 pending) — see note

| Employer | Login | Status | Sector · Base | Posts requisitions for |
|----------|-------|--------|---------------|------------------------|
| **Al-Mansoori Construction & Contracting LLC** | `almansoori_uae` | ✅ Approved | Construction/trades · Dubai | Construction (Dubai), Welder (Saudi), Driver (UAE), Plumber (Kuwait), Electrician (Oman), Hotel Staff (Qatar) |
| **Sakura Care & Staffing Group** | `sakura_care` | ✅ Approved | Healthcare/hospitality · Japan & Germany | Caregiver (Japan), Reg. Nurse (Germany), IT Support (Germany), Housekeeping (Bahrain) |
| **Gulf Premier Hospitality LLC** | `gulf_premier` | ⏳ **Pending** | Hospitality · Qatar | (awaiting approval → **demo approve**) |
| **Nippon Skilled Labour Co.** | `nippon_labour` | ⏳ **Pending** | Trades · Japan | (awaiting approval → reject/approve demo) |

> **Note — why 2 approved, not 1:** the candidates apply to jobs in *two* sectors (Gulf construction/trades **and** Europe/Japan healthcare). Only an *approved* employer can host jobs, so we need one approved employer per sector or the healthcare candidates have nowhere to have applied. If you'd rather keep exactly **1 approved + 2 pending**, I'll make a single diversified employer post across all sectors — just say so.

**Employer doc set (foreign principal):** demand letter · power of attorney (to the Indian agent) · business registration / trade licence · employment contract · authorised signatory's passport.

---

## Jobs / requisitions created
Al-Mansoori posts 6 requisitions (Gulf trades + Qatar hospitality); Sakura posts 4 (healthcare + IT + housekeeping). The two approved agencies pick them up (derivatives), and the 10 candidates apply into them at the stages above — producing a live, end-to-end pipeline with review-queue, interviews, placements, welfare, and audit history.

---

## What you will be able to demonstrate, by screen
- **Candidate:** complete profile + passport/ECR/IELTS, document slots with verification ticks, match scores, 6-stage tracker, interview control, offer acceptance, pre-departure tracker, welfare.
- **Agency:** MEA verification docs, pick-up, applicant scrutiny + match scores, shortlist, schedule interview, placement + visa + appointment letter + welfare check-ins.
- **Employer:** company verification docs, post requisition, review queue across agencies, approve-for-interview, selection.
- **Admin / HPSEDC:** approve a pending agency + a pending employer live, overview analytics, compliance risk flags (3 flagged placements), welfare SLA, audit log, system config, grievances.
