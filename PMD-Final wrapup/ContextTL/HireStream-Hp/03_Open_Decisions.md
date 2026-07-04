# Open Decisions — needed before Sprint HP-2 begins code work

**Status legend:** 🟢 answered · 🟡 partially answered / assumption in place · 🔴 blocked, needs answer.

---

## 🔴 A. MD-meeting outcome on scope

The MD meeting is pending. These items were flagged as "likely non-practical" in the strategy call and their disposition is required before HP-4 planning:

- **Item 16** (post-visa 3-mo support process) — **drop / reframe to embassy contact / keep as ticket queue?**
- **Item 18** (Fee section) — **drop / reframe to informational only / build as payment-gateway integration?**
- **Item 19** (monthly visa-holder tracking) — **drop / merge with item 20 / keep as portal module?**
- **Item 20** (WhatsApp) — **add as bolt-on notifications OR reframe as PRIMARY interaction channel?**

**Impact if unanswered:** we can start Sprint HP-3 (trim to single-agency) without these, but HP-4 planning halts because item 20's disposition changes whether we build the wizard for portal-primary or WhatsApp-primary users.

---

## 🔴 B. Blue-collar UX depth — three binary questions

- **Hindi-first (Hindi as default, English as toggle) vs bilingual toggle at parity?**
  - My recommendation: **Hindi-first**. Almost all HP overseas emigrants are Hindi speakers; English-default reads as unfriendly.
- **Voice input for text fields (name, address, occupation, brief description)?**
  - My recommendation: **yes for the low-friction fields** — name, address, occupation, brief description. Use browser SpeechRecognition where supported, fallback to typing.
- **WhatsApp: primary channel (register/apply/notify all via WhatsApp) OR notification-only?**
  - My recommendation: **primary channel** for candidate side, **portal-only for admin side**. But this is the biggest scope decision on the list — needs explicit MD alignment.

---

## 🔴 C. Fork identity — new brand / colour / mark?

The current fork is IDENTICAL to the reference visually. For end-user clarity ("am I on the HPSEDC portal or the private jobs board?"), we should give it a distinct brand identity:

- **New landing page** — a govt-branded hero saying "Register for HPSEDC-verified overseas employment" (not "search jobs").
- **Colour scheme** — retain the Indian tricolour + HPSEDC identity but shift the primary palette so the two portals feel distinct. Suggest a green-primary (HP forest / emigration ministry adjacent) instead of the current blue-primary.
- **Wordmark** — "HireStream-HP" or "HP Overseas Placement" or a new HPSEDC-specific mark? Needs Subhash / HPSEDC input.

**Impact if unanswered:** we can ship Sprint HP-2 (labels only) with the current brand and defer identity to HP-3. But every screen we build to spec will need re-skin later. Better to answer early.

---

## 🔴 D. Repository / commit strategy for the fork

The fork was made via `rsync` — it's a filesystem copy, not a git operation. The `hirestream-hp/` folder is currently:
- Not tracked by the existing `github.com/agentryx-ai-2025/recruitment.git` monorepo (would need `git add hirestream-hp/`).
- Not its own git repo.

**Three options:**

1. **Add to existing monorepo as a sibling folder** (`hirestream/`, `hirestream-hp/`, `hirestream-mobile/`, `agentryx-verify/`). Easy to reference `shared/`, easy to cherry-pick fixes between the two products. **My recommendation.**
2. **New git repo `hirestream-hp`** — cleaner boundaries but duplicated CI/tooling.
3. **Delay the decision** — work uncommitted for a few days, then add.

**Impact if unanswered:** work will accumulate un-tracked and un-backed-up. Should not be delayed beyond Sprint HP-2.

---

## 🔴 E. DB seed strategy for candidates

The `hirestream_hp` DB is currently seeded with:
- 15 destination countries (from the boot-time seed)
- 5 system_config feature rows
- 33 notification templates
- No candidates, no jobs, no applications

**Question:** for HPSEDC's pilot / testing, do we want to:
1. **Empty DB** — HPSEDC starts fresh, real candidates onboard from day one.
2. **Migrate from `hirestream` DB** — copy any real candidate records that exist in the reference portal today.
3. **Seed with demo data** — a handful of blue-collar personas (mason, cook, driver) for MD demo purposes.

**My recommendation:** option 3 for demos + testing, then reset to option 1 for HPSEDC go-live. Never option 2 (mixing real data with test artefacts).

---

## 🟡 F. Verify portal integration

**Assumed:** share existing `agentryx-verify.projects` with a new row for `hirestream-hp` (already done in this session). All new feedback for the fork routes to this row.

**Confirm:** is that acceptable, or should we fork Verify too? My strong recommendation: no fork — that's what the multi-project Verify is for.

---

## 🟡 G. Test suite for the fork

**Assumed:** the copied Jest suite (502 tests, 36 suites) runs against `hirestream_hp_test`. Suite currently ships in `hirestream-hp/tests/`.

**But:** as Sprint HP-3 trims the employer role and agency-registration flow, ~30-50 of those tests will start failing because they test flows we've deleted. Need a decision:
- Delete those tests as we delete the code (cleanest).
- Keep them, skipped, for reference (safer but noisier).

**My recommendation:** delete. The multi-role tests live in the reference codebase — we don't lose the coverage globally.

---

## 🟡 H. Reference-product deploy strategy going forward

The reference portal (`hirestream-stg`) is now "frozen" as a capability asset. But:
- Bug fixes should still be back-ported if they affect the reference portal's ability to be demoed / marketed.
- Version bumps should stop (v0.7.7.0 is "the release" — no more sprint work).
- Should we keep the synthetic monitor pointing at it? (Currently `DEEP_URL=https://hirestream-stg.agentryx.dev` in `ecosystem.config.cjs`.)

**My recommendation:** freeze at v0.7.7.0. Keep synthetic monitor pointing at reference AND add a second cron for `hirestream-hp`. Any P0 bug on the reference gets fixed; no feature work.

---

## Summary — the six questions Subhash needs to answer before Sprint HP-2

Copy-paste this into a message to Subhash:

> To unblock Sprint HP-2 planning I need the following:
>
> 1. **MD meeting outcome** on items 16, 18, 19, 20 (drop / reframe / build?)
> 2. **Hindi-first (default) or bilingual at parity?**
> 3. **Voice input — yes / no for name / address / occupation fields?**
> 4. **WhatsApp — bolt-on notifications or primary interaction channel?**
> 5. **Fork identity** — new colour scheme + wordmark or reuse the reference brand for now?
> 6. **Commit strategy** — add `hirestream-hp/` to the existing monorepo, or new repo?
>
> All other decisions have working assumptions in place.
