# 06 — Decisions (ADR Log)

**Format:** Architecture Decision Records (ADR), one per significant choice. Append-only. **Never edit a past decision** — supersede it with a new one that references the old.

**When to record an ADR:** Any time a choice has more than one defensible answer, costs material effort to reverse, or touches the contract / architecture. Trivial choices (linter rules, file naming) don't need ADRs.

**Severity gate:** ADR is mandatory for anything in this list — stack choice, auth model, data model, deployment strategy, third-party SDK adoption, security/compliance choices, scope cuts, vendor lock-in commitments.

---

## ADR template (copy this for new entries)

```
### ADR-NNNN · YYYY-MM-DD · <short title>

**Status:** Proposed / Accepted / Superseded by ADR-MMMM / Deprecated
**Owner:** <person who signed off>
**Context:** What problem are we solving? Why is this on the table now?
**Options considered:** Bullet list, ≥2 options. Bullet (a) is what we picked.
**Decision:** What we picked, in one sentence.
**Consequences:** Positive + negative + neutral side effects. Be honest about the costs.
**Reversibility:** Easy (days) / Medium (weeks) / Hard (months) / Irreversible.
**Related:** Roadmap rows, other ADRs, external docs.
```

---

## Decisions to date

### ADR-0001 · 2026-05-12 · React Native + Expo over Flutter / Native / Capacitor

**Status:** Accepted
**Owner:** Subhash
**Context:** FRS §2.8 requires native iOS + Android. Existing team is TypeScript/React/Node. Need a stack that single-team-can-ship in 8–12 weeks.
**Options considered:**
- (a) **React Native + Expo** — TypeScript, single codebase, leverages team's React skill
- (b) Flutter — single codebase, but Dart is new language for the team
- (c) Native Kotlin (Android) + Swift (iOS) — best performance, double codebase + skill stack
- (d) Capacitor wrap of existing web app — cheapest, but risks Apple 4.2 rejection
- (e) PWA only — fails FRS (no app-store presence)
**Decision:** React Native + Expo, managed workflow initially, eject to bare when custom native modules needed.
**Consequences:**
- (+) Team's TypeScript + React skill carries over; shared types from `hirestream/shared/`; ~85% code reuse between Android and iOS; EAS Build removes Mac-in-CI requirement.
- (–) Slightly worse cold-start than native; JS bridge overhead on complex animations.
- (~) Locked into Expo SDK release cadence — must keep up annually.
**Reversibility:** Hard (3+ months to rewrite in Flutter or Native).
**Related:** [02_STRATEGY_AND_STACK.md §2](02_STRATEGY_AND_STACK.md), F0.1 roadmap row.

---

### ADR-0002 · 2026-05-12 · JWT bearer tokens for mobile auth alongside web sessions

**Status:** Accepted
**Owner:** Subhash
**Context:** Web app uses `passport-local` + `express-session` (cookie-based). Mobile clients handle cookies poorly; we need a clean mobile auth surface without disrupting the proven web flow.
**Options considered:**
- (a) **Parallel JWT/bearer surface at `/api/v1/mobile/auth/*`** — coexists with web sessions, same `req.user` downstream
- (b) Migrate web app to JWT too — clean but high blast radius on 25+ existing route handlers
- (c) Force mobile to use cookies via `@react-native-cookies/cookies` — works but non-standard, brittle
- (d) Issue web-session-id-like opaque tokens — reinventing JWT
**Decision:** Build a `mobileBearer` middleware that runs before `passport.session()` and populates `req.user` from a Bearer token if present. Web flow untouched. Mobile clients use `/api/v1/mobile/auth/login` to obtain `{accessToken, refreshToken}`.
**Consequences:**
- (+) Zero changes to existing route handlers — they read `req.user` agnostic to auth source. Industry-standard mobile pattern. CSRF-immune.
- (–) Two auth code paths to maintain — must jest-test the matrix (session vs bearer) for shared endpoints.
- (~) Adds two new tables: `mobile_refresh_tokens`, `mobile_push_tokens`.
**Reversibility:** Medium (consolidating later means rewriting mobile auth client).
**Related:** [03_DEPENDENCIES.md §1–3](03_DEPENDENCIES.md), B1.1–B1.3 roadmap rows.

---

### ADR-0003 · 2026-05-12 · Candidate-role-only on mobile in v1.0

**Status:** Accepted
**Owner:** Subhash
**Context:** FRS §2.2 names three roles (Candidate, Recruiting Agency, Govt/Authority). Native mobile builds for all three would 2.5× the effort. FRS §2.8 doesn't specify which roles must be on mobile.
**Options considered:**
- (a) **Candidate-only on mobile v1.0; agency + admin stay web** — minimum FRS-compliant, lowest risk
- (b) All three roles in v1.0 — doubles the build, agency dashboards don't gain from mobile
- (c) Phased: v1.0 candidate, v1.5 agency, v2.0 admin — adds 4–6 months program length
**Decision:** Option (a). Agency and admin remain web-only; if HPSEDC wants them later, that's a v1.5 conversation.
**Consequences:**
- (+) 8-week Android build is achievable. Candidate is the volume user — biggest UX gain. Agency/admin work bulk-on-desktop anyway.
- (–) If HPSEDC pushes back during plan review, we lose ~2 weeks negotiating scope.
- (~) Verify project will need an explicit "mobile parity gap" line for agency/admin so it doesn't read as undelivered.
**Reversibility:** Easy (add more roles in v1.1 if pushed).
**Related:** [01_SCOPE.md §3](01_SCOPE.md), [05_CLOSURE_CHECKLIST.md](05_CLOSURE_CHECKLIST.md).

---

### ADR-0004 · 2026-05-12 · Android-first sequencing, iOS afterward

**Status:** Accepted
**Owner:** Subhash
**Context:** Single mobile engineer (planned), parallel iOS + Android would split focus and double the live-test surface.
**Options considered:**
- (a) **Android first → iOS port** — sequential, single point of focus
- (b) Parallel iOS + Android — needs 2 engineers; one stack delays the other when blockers appear
- (c) iOS first → Android port — backwards (4× larger Indian Android install base for HPSEDC candidates)
**Decision:** Android first; iOS port starts only when Android v1.0 is on Play Store internal track.
**Consequences:**
- (+) Codebase stabilises on Android before iOS port. Apple submission delays don't gate the Android launch. Engineer learns RN on the friendlier of the two platforms.
- (–) iOS launch is ~3 weeks after Android — HPSEDC sees the "full" delivery split.
- (~) iOS-specific issues (Sign in with Apple, App Review) handled after Android pressure is off.
**Reversibility:** Easy (just sequence change).
**Related:** [04_EFFORT_TIMELINE_RISKS.md §2](04_EFFORT_TIMELINE_RISKS.md), [iOS/02_STATUS.md](iOS/02_STATUS.md).

---

### ADR-0005 · 2026-05-12 · Defer multilingual UI to v1.1; ship English-only in v1.0

**Status:** Accepted
**Owner:** Subhash
**Context:** FRS §1.2 mandates bilingual (English + Hindi). Existing HireStream web has i18next scaffolded but only ~6% UI coverage. Doing bilingual mobile in v1.0 adds ~1 week; the bulk of the work is the web bilingual gap (~3 weeks).
**Options considered:**
- (a) **English-only in mobile v1.0; bilingual mobile in v1.1 alongside the web bilingual completion** — sequential, clean
- (b) Hindi in mobile v1.0 — adds 1 week mobile + 3 weeks web (web parity required to avoid contradiction); blows out the timeline
- (c) Hindi only on mobile, not web — incoherent
**Decision:** Option (a). Mobile v1.0 ships English. Mobile v1.1 picks up Hindi for free once the shared translation files exist.
**Consequences:**
- (+) v1.0 ships ~3 weeks sooner. FRS evidence row for bilingual stays 🟡 (partial) until v1.1, transparent to HPSEDC.
- (–) HPSEDC may push back; mitigation is the standing language toggle in settings (stubbed in v1.0).
- (~) Need to flag this transparently in the planning review.
**Reversibility:** Easy (i18next config exists; translating strings is the only cost).
**Related:** F6.7 roadmap row.

---

## Pending decisions (not yet ADRs — proposed only)

These are issues that will become ADRs once resolved. Tracked here so they don't fall through the cracks.

| Pending | Triggering question | Owner |
|---|---|---|
| HIM Access SSO mobile flow | Is there an SDK, or do we WebView the OAuth? | HPSEDC IT |
| Apple Developer account ownership | HPSEDC vs Agentryx; transfer at signoff vs day 1 | Subhash + HPSEDC |
| FCM project ownership for production push | HPSEDC GCP vs Agentryx Firebase | Subhash + HPSEDC |
| Brand assets — icon, splash, palette | Reuse HireStream web brand vs new mobile brand | HPSEDC |
| Distribution strategy | Production from day 1 vs internal → closed → production | HPSEDC |
| Aadhaar verification on mobile | Native SDK vs deep-link to web | HPSEDC IT |
| Universal Links domain for iOS | `placement.hpsedc.gov.in` or other | HPSEDC |

---

## Anti-patterns — what NOT to do with this log

- **Don't edit past ADRs to "correct" them.** Supersede with a new one. The history is the point.
- **Don't record trivial decisions** (file naming, prettier config). Reserve ADRs for things that survive code review and matter in 6 months.
- **Don't write ADRs after the fact for things that "just happened".** If you can't reconstruct the alternatives considered, don't fake it — flag it as "implicit / not re-litigated".
- **Don't number out of order.** ADRs are append-only and chronological. Renumbering breaks all backlinks.
