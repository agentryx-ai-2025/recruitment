# iOS — Learnings & Issues Log

> **Status:** ⏸ **Empty — iOS work has not started.** Same format and rules as [../Android/03_LEARNINGS_AND_ISSUES.md](../Android/03_LEARNINGS_AND_ISSUES.md). First real entry will land the moment we hit the first iOS-specific surprise.

**Update protocol:** Add an entry the same day the lesson lands. Reverse-chronological — newest at top.

---

## Standing lessons (lifted from repeated entries)

_Empty._

---

## Anticipated learnings (pre-build hypotheses, will be replaced by real entries)

Specific predictions for the iOS build, based on industry experience + the risk register in [../04_EFFORT_TIMELINE_RISKS.md](../04_EFFORT_TIMELINE_RISKS.md). **Not** real entries — replace each with a dated entry when (if) the issue actually fires.

1. **Sign in with Apple rejection** — if we ship HIM Access SSO without Sign in with Apple, Apple guideline 4.8 will catch us. Build SIWA from day 1.
2. **App Store Minimum Functionality (4.2) rejection** — if iOS feels like a "thin web wrapper", reviewer will reject. Push notifications, camera capture, offline cache prove native value.
3. **Privacy Manifest accuracy** — Expo auto-generates a baseline, but if we add SDKs (Sentry, FCM, etc.) the manifest must list every reason-string. Audit before submission.
4. **Permission string nuance** — `NSCameraUsageDescription` etc. must explain *why* clearly. Generic "needs camera access" gets rejected.
5. **Universal Links propagation delay** — `apple-app-site-association` cache on iOS devices is sticky (up to 7 days). Test with fresh installs.
6. **APNs token vs FCM token confusion** — when iOS gets its FCM token, that's already an APNs-backed token. Don't try to register an APNs token separately.
7. **TestFlight build expiry** — internal TestFlight builds expire after 90 days. Don't rely on a stale build for HPSEDC demo.
8. **iPad layout regressions** — Even if we don't target iPad, the App Store reviewer may test on iPad. Either explicitly disable iPad, or test the iPad layout. (Recommendation: explicitly disable iPad in `app.json` `ios.supportsTablet: false`.)
9. **Dynamic Type scaling** — iOS users with large accessibility text sizes will break layouts that assume default font sizes. Test with Dynamic Type at max.
10. **App transfer ownership** — if the app is on Agentryx's account and we want to transfer to HPSEDC, the receiving account must have a Paid Apps Agreement signed. Verify before submission.

---

## Entries

_Future entries below — newest at top._
