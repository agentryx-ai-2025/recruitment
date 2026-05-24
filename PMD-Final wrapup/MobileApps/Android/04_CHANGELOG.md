# Android — Changelog

**Format:** Reverse-chronological. One entry per shipped build (internal track, closed beta, production). Mirror entries that ship to Play Store also go into the listing's "What's new" field — keep them user-readable.

**Versioning:** `MAJOR.MINOR.PATCH(+buildCode)` — semver-aligned with the HireStream backend. Build code increments on every Play upload (Google requires monotonic increase).

**Update protocol:** Add an entry the **same commit** as the version bump. If a build is rejected or pulled, mark it `withdrawn` rather than deleting it.

---

## Legend

- `internal` — Play Console internal testing track
- `closed-beta` — Play Console closed testing
- `production` — Play Store public release
- `withdrawn` — pulled before users saw it (e.g. crash discovered post-upload)

---

## Entries

_No builds shipped yet. Template for the first entry:_

```
## v0.1.0+1 — 2026-MM-DD · internal
- Initial scaffold build (F0.1–F0.6). No features, just the chrome.
- Wired Sentry, EAS Build, GitHub Actions CI.
- Tested on Pixel 6 + Redmi 9.
- Known issues: none.
```

---

## How to write a good changelog entry

| Do | Don't |
|---|---|
| Lead with user-visible change ("Add job filter by salary") | Lead with internal cause ("Refactor JobListQueryHelper") |
| Group by feature area when there are >5 items | Dump every commit verbatim |
| Mention known issues + workarounds | Hide rough edges |
| Reference roadmap row IDs (F2.2) for traceability | Skip the IDs ("various improvements") |
| Note breaking API contract changes | Be silent on breaking changes |

---

## Play Store "What's new" text rules

Play Store imposes:
- Max 500 characters per language
- No HTML
- No marketing language ("Best app ever!") — Play rejects this
- Should describe what changed in user terms, not engineering terms

If the full changelog entry exceeds 500 chars, summarise the top 3–5 user-visible changes into a separate "What's new" block at the bottom of the entry like this:

```
What's new (Play Store text):
We've made browsing jobs faster and added support for filtering by salary
range. Notifications now arrive instantly when an agent updates your
application. Tap a notification to jump straight to the relevant job.
```
