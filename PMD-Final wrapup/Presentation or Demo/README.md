# HireStream — MD Showcase Video

Self-running narrated video for the **Monday presentation to the Managing Director, HP IT Department + panel**. Showcase-led: walks the live platform across all four roles, then closes with the infrastructure/hosting ask.

**Spec:** ~17–18 min · 1280×720 · Piper TTS narration (`en_US-lessac-medium`) · HTIS-branded · English audio.

## Folder structure

| Path | Contents |
|------|----------|
| `00_SESSION_HANDOFF_Presentation.md` | Original brief (task, assets, cautions). |
| `script/` | **`01_NARRATION_SCRIPT.md`** — full segment-by-segment script (review this first). `02_ADMIN_NARRATION.md` — admin-segment VO (added once flow is confirmed). |
| `cards/` | Branded HTML title/bookend cards + render scripts + their rendered MP4 segments. |
| `recordings/` | New Admin-oversight Playwright spec + raw recording. |
| `build/` | Intermediate artifacts (narration WAVs, durations, concat lists). |
| `HireStream_Showcase.mp4` | **Final master video** (produced at the end). |

## Reused assets (not rebuilt)
The three self-narrated role films in `../User Guides and Videos/` are spliced in whole:
`1-Employer-Workflow.mp4` (2:55) · `2-Agent-Workflow.mp4` (1:53) · `3-Candidate-Workflow.mp4` (3:28).

## Status — ✅ built
- **`HireStream_Workflows.mp4` — PRIMARY deliverable. Lean 4-section workflow video (9:30):**
  **Employer → Agency → Job Seeker → HPSEDC Authority.** No intro/marketing filler; a short
  branded label card precedes each section; the role films' baked-in "Issues Resolved" outros are trimmed.
- `HireStream_Showcase.mp4` — fuller 15-min cut (title/problem/architecture/status/ask + all demos). Kept as an alternative.
- `HireStream_Showcase_DRAFT.mp4` — early draft (cards + role films, no admin). Reference only.
- Admin segment: `recordings/admin-oversight.mp4` (87s, recorded on staging, narrated).

Build the lean video:  `node build/stitch-workflows.mjs`  (trim points + order are in that script).

## Rebuild commands
Tooling: `ffmpeg-static` + Playwright live in `../../hirestream/node_modules`; Piper at `/tmp/piper`
(re-download if `/tmp` was cleared — see `script/01_NARRATION_SCRIPT.md` production notes).

```bash
HS=~/Projects/Recruitment/hirestream
PRES="~/Projects/Recruitment/PMD-Final wrapup/Presentation or Demo"

# 1) Cards — edit cards/narration.json, then:
cd "$PRES" && node cards/build-cards.mjs            # all cards  (or: node cards/build-cards.mjs 08-built)

# 2) Admin segment — edit narration in hirestream/tests/video/narration.json ("admin"):
cd "$HS" && PIPER_DIR=/tmp/piper NODE_PATH="$(pwd)/node_modules" node tests/video/gen-narration.mjs admin
cd "$HS" && NODE_PATH="$(pwd)/node_modules" npx playwright test --config=playwright.video.config.ts admin.spec.ts
cd "$PRES" && node recordings/postprocess-admin.mjs

# 3) Stitch the master:
cd "$PRES" && node build/stitch.mjs                 # full (with admin)   |   node build/stitch.mjs draft
```

The admin recording **spec** lives at `hirestream/tests/video/admin.spec.ts` (the framework requires specs there);
its narration is in `hirestream/tests/video/narration.json` under the `admin` key. Both are mirrored here for reference
in `recordings/`. Editing card wording → re-run step 1 only. Editing admin wording → steps 2–3.
