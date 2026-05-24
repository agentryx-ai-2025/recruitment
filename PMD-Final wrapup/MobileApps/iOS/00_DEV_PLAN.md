# 04 — iOS Development Plan (v1.0)

**Status:** Detailed plan · **Owner:** TBD (same engineer as Android) · **Date:** 2026-05-12

iOS reuses **~85% of the Android codebase**. This document describes only the **delta** — what is different, what is harder, and what is required by Apple specifically.

---

## 1. Strategic position

- **Sequencing:** iOS starts when Android v1.0 is on the Play Store internal track. Not before. This avoids splitting attention and lets the Android codebase stabilise as the canonical source.
- **Effort:** **+2–3 weeks** on top of Android v1.0.
- **Driver:** FRS §2.8 explicitly requires iOS. iOS install base in target candidate demographics (Himachal Pradesh youth seeking overseas placement) is much smaller than Android, but the contracted scope is unambiguous.

---

## 2. What ports directly from Android (no new work)

| Layer | Carries over |
|---|---|
| Screen layouts | Same React Native code, NativeWind classes adapt |
| Navigation | Expo Router config — same |
| API client | Same — bearer token + fetch wrapper |
| State management | Same — TanStack Query + Zustand |
| Forms + validation | Same — react-hook-form + zod |
| i18n | Same — i18next |
| Sentry config | Auto via Expo plugin |
| OTA updates | Same `expo-updates` config |
| Bundle of UI components | All 12 screens render unchanged |
| Backend API | Zero changes — same `/api/v1/*` and `/api/v1/mobile/*` endpoints |

---

## 3. What is iOS-specific and needs new work

| Area | Difference | Effort |
|---|---|---|
| **APNs (Apple Push Notification service)** | Distinct from FCM — needs APNs auth key (.p8) + bundle ID + team ID configured in EAS. `expo-notifications` handles the runtime, we handle the credential setup. | 0.5 day |
| **iOS Capabilities** | Push Notifications capability + Background Modes (remote-notification) must be toggled in EAS config | 0.25 day |
| **App icon + asset catalog** | iOS asset format differs from Android — needs the full set (`Icon-1024.png` + auto-resized variants via Expo) | 0.25 day |
| **Splash screen** | iOS launch screen storyboard vs Android theme — Expo handles via `app.json` but tuning needed | 0.5 day |
| **Permissions UX** | iOS shows permission prompts with custom strings — `NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription`, `NSUserNotificationsUsageDescription` must read well in plain English + Hindi (when shipped) | 0.5 day |
| **Status bar + safe area** | iPhone X+ notch, Dynamic Island, home indicator — needs `react-native-safe-area-context` testing on multiple device sizes | 1 day |
| **Keyboard avoidance** | iOS keyboard handling is finickier than Android — `KeyboardAvoidingView` tuning per screen | 1 day |
| **Build environment** | EAS Build provides hosted Mac runners — no on-prem Mac needed | 0 (already in pipeline) |
| **App Store Connect setup** | Apple Developer enrolment ($99/yr), App ID, provisioning profiles, App Store Connect listing | 2 days (much of it waiting on Apple) |
| **TestFlight setup** | Internal testing group (Apple ID-based, up to 100 internal testers) | 0.5 day |
| **App Store review process** | Apple is stricter than Google. Common rejections: missing privacy details, app tracking transparency prompt, sign-in-with-Apple requirement if any other social login is offered, minimum functionality (4.2) | Buffer: 1–2 weeks for back-and-forth |
| **Sign in with Apple** | If we ship "Sign in with HIM Access" or any third-party login, Apple **requires** Sign in with Apple as a peer option. v1.0 ships email + HIM Access → must add Sign in with Apple | 1.5 days |
| **App Tracking Transparency** | If we add analytics SDKs that track across apps — we don't in v1.0, so no ATT prompt | 0 |
| **Universal Links** | iOS deep links need an `apple-app-site-association` file on the HPSEDC domain | 0.5 day |
| **Accessibility — VoiceOver** | Equivalent to TalkBack on Android. Most accessibility labels port over, but rotor + custom actions need iOS-specific testing | 1 day |

**Total iOS-specific work:** ~9–11 person-days ≈ **2 weeks** for a focused engineer.

---

## 4. Apple-specific gotchas to plan for

1. **App Review timeline.** First submission averages 24–48 hours but can stretch to 7+ days on rejection-retry cycles. Plan for **at least one rejection cycle** in the schedule.
2. **Sign in with Apple requirement.** As soon as we offer "Sign in with HIM Access" (an SSO with a user account system), Apple's guideline 4.8 kicks in. **Must add Sign in with Apple as a peer.** This is non-negotiable and frequently catches teams off guard.
3. **In-app purchase rules.** Not relevant for us — no IAP. But: if HPSEDC later wants premium features, those must go through Apple IAP (30% cut). Worth flagging.
4. **Subscription / external links.** We don't sell anything — fine.
5. **Apple Developer Programme enrolment.** Government entity verification can take HPSEDC weeks. Mitigation: enrol under **Agentryx's Apple Developer account**, transfer ownership to HPSEDC after release (Apple supports app transfer).
6. **Push notification certificate** — uses APNs Auth Key (.p8) — single file, no annual rotation. Easier than the old APNs Cert.
7. **Privacy Manifest** (`PrivacyInfo.xcprivacy`). Required since iOS 17. Expo SDK 51+ generates this automatically.
8. **Minimum iOS version.** Recommend **iOS 15+** — covers ~95% of active devices and matches React Native 0.76+ baseline.

---

## 5. iOS-specific testing matrix

| Device class | Test on | Why |
|---|---|---|
| iPhone (small, no notch) | iPhone SE 3 (4.7") | Catch overflow and small-screen layout issues |
| iPhone (notch / Dynamic Island) | iPhone 14 / 15 | Safe area handling |
| iPhone Pro Max | iPhone 15 Pro Max | Largest screen layout |
| iPad (optional) | iPad 10th gen | If HPSEDC wants tablet support — defer to v1.1 if not required |

We can rent these from BrowserStack App Live or Sauce Labs — no need to buy hardware for v1.0. EAS Build also offers device farm runs.

---

## 6. App Store submission checklist (delta over Android)

- [ ] Apple Developer Programme enrolment ($99/yr)
- [ ] App ID created in Apple Developer portal
- [ ] APNs Auth Key (.p8) generated, uploaded to EAS
- [ ] Privacy Manifest (`PrivacyInfo.xcprivacy`) auto-generated by Expo
- [ ] Sign in with Apple capability + integration
- [ ] App Store Connect listing populated:
  - [ ] App icon (1024×1024 PNG)
  - [ ] 6.5" iPhone screenshots (3–10)
  - [ ] 5.5" iPhone screenshots (3–10, for older devices)
  - [ ] iPad screenshots (if iPad support)
  - [ ] Description, keywords, support URL, marketing URL, privacy policy URL
  - [ ] Age rating questionnaire
  - [ ] App Privacy questionnaire (Apple's version of Google's Data Safety)
  - [ ] Review notes — test credentials for Apple reviewer
  - [ ] Demo video (optional but reduces rejection rate)
- [ ] First TestFlight build approved
- [ ] At least 5 internal testers complete the smoke flow on TestFlight
- [ ] Production submission with build promoted from TestFlight

---

## 7. Risk register (iOS-specific)

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| App Store rejection on Sign in with Apple grounds | High | 1-week delay | Build Sign in with Apple in week 1 of iOS phase, not last |
| App Store rejection on Minimum Functionality (4.2) | Medium | 1-week delay | Make sure the app does more than a thin web wrapper — push, offline cache, camera capture all count |
| HPSEDC Apple Developer enrolment delays | High | 2-4 week delay | Use Agentryx account, transfer ownership later |
| APNs misconfiguration | Medium | Push fails silently | Use Expo's push-test tool before submission |
| Sign in with HIM Access incompatible with iOS WebView | Low | Login flow rebuild | Verify with HPSEDC during Android phase, before iOS starts |
| iPad layout regressions | Low | Cosmetic | Defer iPad support to v1.1 if it becomes scope creep |

---

## 8. What "iOS v1.0 done" looks like

- [ ] Live on the App Store
- [ ] All 12 screens functional on iPhone 14/15/SE3
- [ ] All 17 P0 features pass — same set as Android
- [ ] Push delivers via APNs within 30 seconds
- [ ] Sign in with Apple works (or no third-party SSO offered)
- [ ] Sentry shows <1% crash-free-session loss
- [ ] HPSEDC + STIS sign off in writing
- [ ] Release notes row: `v1.0.0 (mobile-ios)`
