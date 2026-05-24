# 06 — Effort, Timeline & Risks

**Date:** 2026-05-12

---

## 1. Effort matrix (single mobile engineer + part-time backend engineer)

| Phase | Backend work | Mobile work | Total weeks elapsed | Total person-days |
|---|---|---|---|---|
| Backend API surface (parallel with P0–P1) | 5 days | — | (parallel) | 5 |
| P0 Foundation | — | 5 days | 1 | 5 |
| P1 Auth + API client | — | 5 days | 2 | 5 |
| P2 Job browse + detail + search | — | 5 days | 3 | 5 |
| P3 Apply + status tracking | — | 5 days | 4 | 5 |
| P4 Notifications + Push | — | 5 days | 5 | 5 |
| P5 Profile + Documents | — | 5 days | 6 | 5 |
| P6 Polish + store readiness | — | 5 days | 7 | 5 |
| P7 Play Store internal track + STIS UAT | — | 5 days | 8 | 5 |
| **Android v1.0 subtotal** | **5** | **40** | **8 weeks** | **45 person-days** |
| iOS port | — | 10–14 days | 10–11 | 10–14 |
| App Store review buffer | — | (calendar only) | +1–2 | 0 |
| **Total to "both stores live"** | **5** | **50–54** | **~11–13 weeks** | **55–59 person-days** |

### Sensitivity

- **+50% time** if HIM Access mobile SDK does not exist and we need to negotiate WebView OAuth specifics with HPSEDC's IT team.
- **+1–2 weeks** if Apple rejects on Sign in with Apple or Minimum Functionality grounds (highly likely to happen at least once).
- **−1 week** if HPSEDC accepts a v1.0 without HIM Access SSO (email + password only), and HIM Access ships in v1.1.

---

## 2. Critical path

```
Backend mobile auth (5 days) ──┐
                              ▼
                          P1 Auth (5d) → P2 Browse (5d) → P3 Apply (5d) → P4 Push (5d) → P5 Profile (5d) → P6 Polish (5d) → P7 Store (5d)
                                                                              ▲
                                          Backend push delivery (parallel) ──┘
                                                                                  
                                                                                  After P7 ends → iOS port (2–3w) → App Store review (1–2w)
```

Critical path = **8 weeks Android → 3–5 weeks iOS = 11–13 weeks total.**

The single hardest dependency is the **backend mobile auth surface**. It must ship by end of week 1 to unblock P1. If backend slips by even 3 days, the whole project compresses against the store review buffer at the end.

---

## 3. Risk register

| # | Risk | Likelihood | Impact | Mitigation | Owner |
|---|---|---|---|---|---|
| R1 | HIM Access has no mobile SDK or OAuth flow | High | 1-2 week delay on auth | Build email+password first; SSO becomes opt-in via WebView; clarify with HPSEDC IT in week 1 | Subhash |
| R2 | HPSEDC Apple Developer enrolment delays | High | 2-4 week delay on iOS | Enrol under Agentryx; transfer app ownership at signoff | Subhash |
| R3 | Apple App Store rejection (first submission) | High | 1-2 week delay | Build Sign in with Apple from day 1 of iOS phase; buffer 2 weeks in timeline | Mobile engineer |
| R4 | FCM project not configured under HPSEDC's Google Cloud | Medium | Push fails on prod | Use Agentryx Firebase project for dev/staging; HPSEDC creates prod project before P7 | Subhash |
| R5 | Aadhaar/UIDAI integration on mobile blocked | Low (deferred to web) | 0 | Defer; mobile uses email/OTP path; document in release notes | — |
| R6 | DigiLocker app deep link not stable | Medium | Document upload UX awkward | Fall back to in-app document picker + camera | Mobile engineer |
| R7 | Push notifications inconsistent on Indian Android skins (Xiaomi, OPPO, Vivo aggressive battery management) | High on those devices | Reduced delivery rate | Document workarounds (whitelist app in battery settings) in onboarding; rely on FCM high-priority for time-sensitive notifications | Mobile engineer |
| R8 | Multilingual scope expands during HPSEDC review (Hindi + Tamil + Marathi + …) | Medium | +1 week per language | Lock v1.0 to English-only; add Hindi in v1.1; resist scope creep in v1.0 review | Subhash |
| R9 | Backend session-vs-bearer auth interferes with existing single-session-enforcement | Medium | Web users get silently logged out | Bearer tokens explicitly **do not touch session table**; jest test the matrix | Backend engineer |
| R10 | Mobile clients on old versions exhibit broken behaviour after backend changes | Medium (post-launch) | Bad reviews, support burden | `GET /mobile/version` kill switch; force-update screen for clients below `MOBILE_MIN_SUPPORTED_VERSION` | Backend engineer |
| R11 | Play Store policy changes (target API level bump) during v1.0 build | Low | 1–3 days rebuild | Target API 35 (current ceiling for 2026); follow Play deadlines | Mobile engineer |
| R12 | Crash or data leak post-launch | Low if Sentry green | Reputational | Sentry alerts to Slack/email; on-call rotation defined at launch | Subhash |
| R13 | Mobile and web UI diverge over time (feature added on web doesn't show up on mobile) | High over months | Quality erosion | Mobile parity matrix maintained in Verify project; quarterly review | Subhash |
| R14 | Agency or Admin role asks "where is my agency app?" | Medium | Scope creep | FRS does not mandate agency/admin on mobile (see [01](01_SCOPE.md) §3); push back politely | Subhash |
| R15 | Cost of EAS Build subscription | Low | $99/month (Production plan) | Free tier covers a few builds/month; upgrade when daily builds needed | Subhash |

---

## 4. Cost estimate (cash outlays — not engineering time)

| Item | One-time | Recurring |
|---|---|---|
| Google Play Developer account | $25 | — |
| Apple Developer Programme | — | $99 / year |
| EAS Build (Expo) | — | $0 (free tier) → $99 / month (Production) once daily builds needed |
| Firebase / FCM | — | $0 (Spark plan covers our volume) |
| Sentry RN | — | $0 (developer plan ≤5k events/month) |
| BrowserStack App Live (optional, for cross-device testing) | — | $39 / month |
| Privacy policy hosting | — | $0 (host on existing domain) |
| Domain for universal links / app site association (if HPSEDC doesn't have one ready) | — | $0 (reuse existing) |
| **Approx total** | **$25** | **~$140 / month while actively building, ~$10 / month maintenance** |

These are negligible against engineering cost but should be in the HPSEDC line-item budget so there are no surprises.

---

## 5. Mobile engineer profile

For the buyer's reference — what we need from the person doing the work:

- 2+ years React Native (production app shipped)
- Strong TypeScript
- Familiar with Expo (managed → bare workflow path)
- Has shipped at least once to Play Store and App Store
- Comfortable reading existing TS/React codebase (HireStream web) to map APIs
- Bonus: Detox E2E experience, FCM/APNs setup experience

Backend engineer can be Subhash or whoever is currently on HireStream backend — JWT + middleware + 1 DB migration is a known-shape task.

---

## 6. Definition of done — programme level

- [ ] Android v1.0 live on Play Store production
- [ ] iOS v1.0 live on App Store production
- [ ] Push notifications reliably delivered on both platforms
- [ ] Verify project `hirestream-mobile-v1.0` 100% Agentryx-Internal signed off
- [ ] STIS + HPSEDC written acceptance of mobile scope
- [ ] OTA update channel configured for hotfixes
- [ ] Sentry dashboards configured + on-call defined
- [ ] Release notes + version history in HireStream changelog include both store launches
- [ ] FRS §2.8 row in the FRS evidence matrix updated from ⛔ to 🟢 with store links
- [ ] Closure handover doc written ([05_CLOSURE_CHECKLIST.md](05_CLOSURE_CHECKLIST.md) updated to all-green)
