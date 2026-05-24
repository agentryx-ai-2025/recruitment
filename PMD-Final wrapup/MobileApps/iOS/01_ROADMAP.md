# iOS — Feature Roadmap (v1.0)

> **Status:** ⏸ **Deferred until Android v1.0 is on the Play Store internal track.** This file exists so context picks up immediately when iOS work begins, but no items are active.

**Update protocol:** Same as Android. See [../Android/01_ROADMAP.md](../Android/01_ROADMAP.md) for the conventions; do not duplicate them here.

**Legend:** ⚪ Not started · 🟡 In progress · 🟢 Done · ⛔ Blocked · ⏸ Deferred

---

## Strategy

iOS reuses **~85% of the Android codebase**. The roadmap below tracks only the **delta** — the items that are iOS-specific or require new work. Anything not listed here is assumed to port unchanged from Android.

Detailed delta analysis: [00_DEV_PLAN.md](00_DEV_PLAN.md).

---

## Phase iOS-0 — iOS-specific foundation (Week 1 of iOS phase)

| # | Feature / Task | Status | Owner | Depends on | Est (d) | Actual (d) | Verify item | Last touched | Notes |
|---|---|---|---|---|---|---|---|---|---|
| I0.1 | Apple Developer Programme enrolment ($99/yr) | ⏸ | Subhash | Android internal track live | — | — | iM0.1 | — | Use Agentryx account, transfer later |
| I0.2 | App ID + bundle ID created in Apple Developer portal | ⏸ | Subhash | I0.1 | — | — | iM0.2 | — | Proposed: `gov.hpsedc.placement.ios` |
| I0.3 | APNs Auth Key (.p8) generated, uploaded to EAS | ⏸ | TBD | I0.2 | — | — | iM0.3 | — | |
| I0.4 | EAS Build profile for iOS configured | ⏸ | TBD | I0.3 | — | — | iM0.4 | — | |
| I0.5 | First iOS build runs on a physical iPhone (TestFlight) | ⏸ | TBD | I0.4 | — | — | iM0.5 | — | Definition-of-done for iOS-P0 |

## Phase iOS-1 — Apple-required capabilities

| # | Feature / Task | Status | Owner | Depends on | Est (d) | Actual (d) | Verify item | Last touched | Notes |
|---|---|---|---|---|---|---|---|---|---|
| I1.1 | Sign in with Apple integration | ⏸ | TBD | I0.5 | — | — | iM1.1 | — | **Required by Apple guideline 4.8** because we offer HIM Access SSO |
| I1.2 | Privacy Manifest (`PrivacyInfo.xcprivacy`) audited + accurate | ⏸ | TBD | I0.5 | — | — | iM1.2 | — | Expo SDK 52+ auto-generates baseline |
| I1.3 | iOS permission strings localised — `NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription`, `NSUserNotificationsUsageDescription` | ⏸ | TBD | I0.5 | — | — | iM1.3 | — | Must read well in English (and Hindi when v1.1) |
| I1.4 | Universal Links — `apple-app-site-association` file on HPSEDC domain | ⏸ | TBD | decision D7 (iOS) | — | — | iM1.4 | — | Pairs with Android deep links |

## Phase iOS-2 — UI polish for iOS conventions

| # | Feature / Task | Status | Owner | Depends on | Est (d) | Actual (d) | Verify item | Last touched | Notes |
|---|---|---|---|---|---|---|---|---|---|
| I2.1 | Safe-area handling — notch, Dynamic Island, home indicator on all 12 screens | ⏸ | TBD | I0.5 | — | — | iM2.1 | — | `react-native-safe-area-context` |
| I2.2 | Keyboard avoidance tuning on form screens | ⏸ | TBD | I0.5 | — | — | iM2.2 | — | iOS keyboard is finickier than Android |
| I2.3 | iOS asset catalog — app icon variants (auto via Expo) | ⏸ | TBD | brand decision D4 | — | — | iM2.3 | — | |
| I2.4 | Splash storyboard tuned for iOS | ⏸ | TBD | brand decision D4 | — | — | iM2.4 | — | |
| I2.5 | VoiceOver pass on all 12 screens | ⏸ | TBD | I0.5 | — | — | iM2.5 | — | Equivalent of TalkBack — most labels port over |

## Phase iOS-3 — App Store submission

| # | Feature / Task | Status | Owner | Depends on | Est (d) | Actual (d) | Verify item | Last touched | Notes |
|---|---|---|---|---|---|---|---|---|---|
| I3.1 | App Store Connect listing populated | ⏸ | TBD | I2.* | — | — | iM3.1 | — | Description, keywords, screenshots, support URL |
| I3.2 | App Privacy questionnaire complete | ⏸ | TBD | I3.1 | — | — | iM3.2 | — | Apple equivalent of Google's Data Safety |
| I3.3 | TestFlight internal testing — 5+ testers complete smoke | ⏸ | TBD | I0.5 | — | — | iM3.3 | — | |
| I3.4 | App Store production submission | ⏸ | Subhash | I3.3 | — | — | iM3.4 | — | Buffer for 1–2 rejection cycles |
| I3.5 | Public on App Store | ⏸ | Subhash | I3.4 | — | — | iM3.5 | — | Closure event |

---

## Open product decisions (iOS-specific)

| ID | Decision | Blocks | Owner | Resolved? |
|---|---|---|---|---|
| D7 | Universal Links domain — `placement.hpsedc.gov.in` or fallback | I1.4 | HPSEDC | ⚪ |

Cross-platform decisions D1–D6 from [../Android/01_ROADMAP.md](../Android/01_ROADMAP.md) all apply here too.

---

## Re-use checklist — what is expected to port from Android with zero work

Confirm each of these renders correctly on iOS before declaring v1.0 done. None of these are roadmap items; they are sanity checks.

- [ ] All 12 screens (Splash, Onboarding, Login, Register, Forgot, Home, Job detail, My Apps, App detail, Notifications, Profile, Settings)
- [ ] Navigation (Expo Router file-based)
- [ ] Bearer-token auth + refresh rotation
- [ ] FCM push delivery via APNs bridge
- [ ] Document upload (camera + gallery + file picker)
- [ ] i18next config (English in v1.0)
- [ ] Sentry crash reporting
- [ ] OTA updates via `expo-updates`
- [ ] Delete-account flow
- [ ] Force-update kill switch screen
