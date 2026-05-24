# 07 — Closure Checklist for HPSEDC + STIS Signoff

**Purpose:** A single, dense, line-by-line list that the project can be measured against to declare the mobile-app scope **closed** in the HPSEDC contract.

This is the doc you (Subhash) hold over the table when STIS asks "is the mobile app done?". Every box must be ticked, with evidence attached, before saying yes.

---

## A. Contractual scope evidence

- [ ] **FRS §2.8 mobile requirement** is mapped to delivered artifacts in the FRS evidence matrix (Verify project `hirestream-v1.4`)
- [ ] FRS evidence row for "iOS and Android applications" updated from ⛔ → 🟢 with:
  - [ ] Play Store URL
  - [ ] App Store URL
  - [ ] App version + build numbers
  - [ ] Date of public launch
- [ ] [01_SCOPE.md §2 table](01_SCOPE.md) is reviewed — every P0 row is ticked

---

## B. Android — production launch

- [ ] App live on Play Store **production track** (not just internal or closed)
- [ ] Listing details complete:
  - [ ] Icon (512×512)
  - [ ] Feature graphic (1024×500)
  - [ ] Screenshots (≥4) for phone + tablet
  - [ ] Short + full description in English (and Hindi if v1.1 shipped)
  - [ ] Privacy policy URL accessible
  - [ ] Data safety form complete + accurate
  - [ ] Content rating attached (IARC)
  - [ ] App access — test credentials shared with Play reviewer
- [ ] Signed with the upload key + Google Play app signing
- [ ] Targets API 35 (or current ceiling)
- [ ] Crashes <1% in last 7 days (Play Console vitals)
- [ ] ANRs <0.47% (Play Console vitals)
- [ ] In-app account deletion flow works end-to-end
- [ ] Push notifications deliver on 5 different Android skins (Pixel, Samsung One UI, Xiaomi MIUI, OPPO ColorOS, Vivo FuntouchOS)
- [ ] Tested on at least one mid-tier device (Redmi 9 / Moto G class)
- [ ] Tested with TalkBack screen reader on all 12 screens

## C. iOS — production launch

- [ ] App live on App Store
- [ ] Listing details complete:
  - [ ] App icon (1024×1024)
  - [ ] Screenshots for 6.5" + 5.5" iPhone (≥3 each)
  - [ ] Description, keywords, support + marketing URLs
  - [ ] Privacy details (App Privacy questionnaire) accurate
  - [ ] Age rating attached
  - [ ] Review notes with test credentials
- [ ] Sign in with Apple integrated (if any third-party SSO is offered)
- [ ] Privacy Manifest (`PrivacyInfo.xcprivacy`) present and accurate
- [ ] Push delivers via APNs reliably
- [ ] Tested on iPhone SE 3 (4.7"), iPhone 14, iPhone 15 Pro Max
- [ ] Tested with VoiceOver on all 12 screens
- [ ] In-app account deletion flow works end-to-end
- [ ] Minimum iOS version = 15

---

## D. Backend mobile surface

- [ ] All 11 `/api/v1/mobile/*` endpoints from [05](03_DEPENDENCIES.md) live on production HireStream
- [ ] `mobile_refresh_tokens` + `mobile_push_tokens` tables migrated on production DB
- [ ] `JWT_SECRET` + FCM credentials set on prod env
- [ ] Push delivery integrated into existing notification creation path
- [ ] Jest pipeline includes ≥12 mobile-auth tests, all green
- [ ] Rate limiting active on `/api/v1/mobile/auth/login`
- [ ] Single-session-enforcement coexists with bearer auth — proven by test
- [ ] Force-update kill switch tested (set `MOBILE_MIN_SUPPORTED_VERSION` higher than installed version → app shows update screen)

## E. Verify project — mobile signoffs

- [ ] Verify project `hirestream-mobile-v1.0` created and seeded
- [ ] At least 60 mobile-specific items covering:
  - [ ] Login + register + forgot password (8 items)
  - [ ] Job browse + filter + search (8 items)
  - [ ] Job detail + apply (4 items)
  - [ ] My Applications + status (6 items)
  - [ ] Notifications + push delivery (6 items)
  - [ ] Profile view + edit + document upload (8 items)
  - [ ] Settings + delete account (4 items)
  - [ ] Accessibility (12 items — 1 per screen × TalkBack/VoiceOver)
  - [ ] Auth security (token rotation, expiry, logout) (4 items)
- [ ] **100% Agentryx-Internal pass** on all items
- [ ] STIS reviewer pass on all items (using their reviewer role in Verify)

## F. Operational readiness

- [ ] Sentry projects exist for mobile-android + mobile-ios; alerts route to Slack/email
- [ ] On-call rotation defined for first 30 days post-launch
- [ ] Crash-free session SLO: >99% in first 30 days
- [ ] OTA update channel configured + tested (push a JS-only bug fix to internal track via EAS)
- [ ] Release notes written for v1.0
- [ ] Versioning convention documented: `MAJOR.MINOR.PATCH-build`, aligned with web
- [ ] HireStream release notes have rows for `v1.0.0 (mobile-android)` + `v1.0.0 (mobile-ios)` + `v1.0.0 (api-mobile-surface)`

## G. Compliance + handover

- [ ] Privacy policy lists the data the mobile apps collect (device tokens, OS version, etc.)
- [ ] Terms of service updated to include mobile clients
- [ ] GDPR / PDPA-equivalent + GIGW compliance reviewed for the new mobile data flows
- [ ] ISO 27001 audit trail extended — every mobile auth event logged
- [ ] Source code handover: HPSEDC has access to `hirestream-mobile` repo
- [ ] Build artifacts handover: signing keys + provisioning profiles transferred (or app transferred to HPSEDC stores)
- [ ] EAS account ownership transfer (or HPSEDC creates its own and we re-link)
- [ ] FCM project owned by HPSEDC's Google account
- [ ] Apple Developer Programme app transferred to HPSEDC's account
- [ ] PMD documentation updated:
  - [ ] [/PMD-Final wrapup/README.md](../README.md) lists mobile as shipped
  - [ ] [/PMD-Final wrapup/MobileApps/](./) contains all 8 docs reflecting the as-built state
  - [ ] HireStream `A.PMD/E2E_Workflow__Final_STG.md` references mobile flow where applicable
  - [ ] HireStream `A.PMD/Release Notes/` has the v1.0 mobile entries

## H. Written signoff

- [ ] HPSEDC representative signs off in writing
- [ ] STIS representative signs off in writing
- [ ] Signed PDF / scan archived in `PMD-Final wrapup/MobileApps/signoff/`
- [ ] Final invoice line item for the mobile scope marked closed

---

## How to use this checklist

1. **During planning** — review with HPSEDC + STIS so they know what "done" looks like. Get them to agree to the list itself.
2. **During build** — tick items as they land. Don't batch — tick within the same day.
3. **At signoff** — print the doc, walk through every box with both customers, attach evidence, get signatures.

Until every box is ticked, the mobile scope is **not closed**, regardless of what is live on the stores. The store presence is necessary but not sufficient — the Verify pass + the operational + the compliance items collectively define "done" for a government contract.
