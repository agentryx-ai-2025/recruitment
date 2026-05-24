# iOS — Changelog

**Format:** Reverse-chronological. One entry per shipped build (TestFlight internal, TestFlight external, App Store).

**Versioning:** Marketing version `MAJOR.MINOR.PATCH` + build number (monotonic integer, App Store Connect requires increase per upload).

**Update protocol:** Add an entry the **same commit** as the version bump. Same rules as the Android sibling — see [../Android/04_CHANGELOG.md](../Android/04_CHANGELOG.md) for the writing guide.

---

## Legend

- `testflight-internal` — Apple's internal-only testing (up to 100 Apple IDs)
- `testflight-external` — External testing (up to 10,000 testers, requires beta app review)
- `production` — App Store public release
- `withdrawn` — pulled before users saw it

---

## Entries

_No builds shipped yet. iOS work is deferred until Android v1.0 internal track ships._

Template for the first entry:

```
## v0.1.0 (1) — 2026-MM-DD · testflight-internal
- Initial scaffold build (I0.1–I0.5).
- APNs auth key configured.
- Tested on iPhone SE3 + iPhone 14.
- Known issues: none.
```

---

## App Store "What's new in this version" rules

- Max 4,000 characters
- HTML-free, plaintext
- No marketing puffery (Apple is stricter than Google here)
- Mention significant fixes / additions only — micro-changes don't need to be listed
- Privacy-affecting changes MUST be called out explicitly (Apple checks)

When writing for the App Store text, lead with what users will notice in the first 5 minutes. Engineering details and refactors do not belong here.
