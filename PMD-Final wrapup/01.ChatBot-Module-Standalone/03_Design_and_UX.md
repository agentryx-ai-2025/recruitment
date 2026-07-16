# Agentryx Converse — Design & UX Specification

**Version:** v1.0 · **Date:** 2026-07-06 · **Owner:** Agentryx / Subhash · **Status:** Approved for Phase-0 build

> **What this document is.** The UX/UI specification for Agentryx Converse: the embeddable end-user widget, the agent console, the supervisor view, the admin/config console, theming/white-label tokens, state design (empty/offline/error), mobile behavior, accessibility, and the component inventory. Wireframes are ASCII (no image dependencies). Functional requirements (FR-n) trace to [01_Product_Spec.md §4](01_Product_Spec.md); technical surfaces to [02_Architecture.md](02_Architecture.md).

Design stance: **calm, institutional, trustworthy.** These widgets ship inside government-adjacent portals (HPSEDC). No gimmicks, no aggressive attention-grabbing, honest expectation-setting everywhere. The widget must feel native to each host brand (tokens, §7) while the staff consoles carry a consistent Converse identity across tenants.

---

## 1. End-User Widget

### 1.1 Surfaces & states

```
State machine:  hidden → launcher → open(window) ⇄ minimized(launcher+badge)
                 └── unavailable(service down) → launcher hidden or static fallback (FR-54)
```

**Launcher** — a floating button (default bottom-right, configurable corner + offsets), tenant icon or chat glyph, unread badge. On `prefers-reduced-motion`: no pulse/bounce, badge only. Never overlaps host-portal critical UI (z-index + safe-area config).

**Window** — 380×620 px desktop panel anchored to the launcher; full-screen sheet on mobile (§8).

### 1.2 Window anatomy (open, online, human/hybrid queue)

```
┌──────────────────────────────────────┐
│ ◉ HPSEDC Support              ─  ✕  │ ← header: tenant brand, minimize/close
│ ● Online — usually replies in mins   │ ← availability strip (live, FR-18/45)
├──────────────────────────────────────┤
│        Tue 06 Jul, 10:42             │ ← day/time separators
│ ┌──────────────────────────────┐     │
│ │ Hello! How can we help you   │     │ ← inbound bubble (left, agent/bot)
│ │ today?                        │     │    avatar + name + "AI assistant"
│ └─ Priya · HPSEDC ─────────────┘     │    label when bot (FR-29)
│     ┌───────────────────────────┐    │
│     │ When is the Shimla drive? │    │ ← outbound bubble (right, user)
│     └────────────────── ✓✓ Read ┘    │ ← receipt: ✓ sent ✓✓ delivered/read
│ ┌──────────────────────────────┐     │
│ │ The Shimla drive is on 14    │     │
│ │ July at HPSEDC Bhawan. [1]   │     │ ← citation chip (AI answers, FR-25)
│ │ ┌ Sources ────────────────┐  │     │    expandable source list
│ │ │ [1] Drive Schedule 2026 │  │     │
│ │ └─────────────────────────┘  │     │
│ └─ Aria · AI assistant ────────┘     │
│ ⋯ Priya is typing                    │ ← typing indicator (FR-8)
├──────────────────────────────────────┤
│ [Talk to a human]  [My documents]    │ ← quick replies (FR-5) / handoff (FR-27)
├──────────────────────────────────────┤
│ 📎 │ Type your message…       │ ➤ │ ← composer: attach, input, send
│    Powered by Agentryx Converse      │ ← removable per white-label tier
└──────────────────────────────────────┘
```

### 1.3 Message types (FR-5)

| Type | Rendering | Notes |
|---|---|---|
| Text | Bubble; URLs auto-linked (rel=noopener); line breaks kept; ≤4,000 chars with counter past 3,500 | Markdown subset for staff/bot messages (bold, lists, links) |
| Quick replies | Horizontally wrapping chip row under the last message; tap sends the chip text; chips disable after selection | Keyboard: arrow-navigable, Enter selects |
| Card | Bordered block: title, body, up to 3 action buttons (link-out or postback), optional thumbnail | Used for hand-out links, e.g. "File a formal grievance →" (FR-44) |
| Attachment | Upload: progress ring + cancel; image → thumbnail lightbox; file → icon + name + size + download | Scan-pending shows "checking file…"; blocked shows error state (FR-6) |
| System notice | Centered, muted, small: "Transferred to Payments team", "Aria handed this to a human" | Never a bubble; screen-reader announced |
| Typing | Three-dot pulse + name; static "… is typing" text under reduced motion | Auto-expires 6 s |

### 1.4 Offline / expectation-setting flow (FR-18/19 — the signature UX)

```
┌──────────────────────────────────────┐
│ ◉ HPSEDC Support              ─  ✕  │
│ ◌ Offline — we reply by 10:00 IST   │ ← honest availability strip
├──────────────────────────────────────┤
│     ┌───────────────────────────┐    │
│     │ My KYB upload keeps       │    │
│     │ failing, please help      │    │
│     └─────────────────── ✓ Sent ┘    │
│ ┌──────────────────────────────┐     │
│ │ Thanks — our team is offline │     │
│ │ right now. Your message is   │     │
│ │ saved and we usually reply   │     │
│ │ by 10:00 IST tomorrow.       │     │
│ │ Want us to email you when    │     │
│ │ we answer?                   │     │
│ │ [Yes, notify me] [No thanks] │     │ ← contact capture, opt-in (FR-56)
│ └─ Automatic message ──────────┘     │
└──────────────────────────────────────┘
```

Rules: the availability strip is always truthful (live presence + business hours); the ack is instant and states *when*, not just "soon"; authenticated users skip contact capture (portal already knows how to reach them — notify webhook); returning to the widget after a reply shows the thread with an unread divider line ("— New replies —").

### 1.5 Conversation list & history (FR-9/10)

A back-chevron in the header leads to "Your conversations": current open thread pinned top, then closed ones (subject/first-line + date + status pill). "Start new conversation" button appears only when the current one is resolved/closed (one open conversation per user per queue by default — reduces fragmentation).

---

## 2. Agent Console — Inbox & Thread

One SPA (`console.converse.agentryx.in`), role-gated: agents see §2, supervisors add §3, admins add §4. Layout: classic three-pane.

```
┌────────┬──────────────────────────────┬─────────────────────────────────────────┬──────────────────┐
│ NAV    │ INBOX                        │ THREAD                                  │ CONTEXT          │
│        │ ┌──────────────────────────┐ │ Anita Sharma · Candidate Support        │ ┌──────────────┐ │
│ ⌂ Inbox│ │Filters: [Queue▾][Status▾]│ │ open · assigned to you · via widget     │ │ Anita Sharma │ │
│ ◷ Mine │ │        [Unassigned][SLA] │ │─────────────────────────────────────────│ │ HireStream   │ │
│ ✓ Done │ ├──────────────────────────┤ │ ┌─────────────────────────────┐         │ │ candidate    │ │
│ ⚙ Prefs│ │● Anita Sharma      2m ⏱18h│ │ │ My KYB upload keeps failing │         │ │ Page: /kyb   │ │
│        │ │  KYB upload failing…  [3]│ │ └── via widget · 23:41 ───────┘         │ │ Locale: hi   │ │
│ ────── │ │  Rakesh V.        14m    │ │ ┌────────────────────────────────┐      │ ├──────────────┤ │
│ Status:│ │  Drive eligibility…      │ │ │ 🔒 Note (staff only): checked  │      │ │ Prior convs 2│ │
│ ●Online│ │○ Meena K.    ⚠SLA 4h12m │ │ │ logs — file exceeds 10MB (FR-17)│      │ │ CSAT avg 5.0 │ │
│ [Away▾]│ │  Payment not received…   │ │ └────────────────────────────────┘      │ ├──────────────┤ │
│        │ │  + 12 more…              │ │ ┌─────────────────────────────┐          │ │ KB SUGGEST   │ │
│        │ └──────────────────────────┘ │ │ Hi Anita — files must be    │          │ │ ▸ KYB size   │ │
│        │  sorted: longest wait first  │ │ │ under 10 MB. Try…          │◄─draft   │ │   limits     │ │
│        │  (FR-20)                     │ │ └─────────────────────────────┘         │ │ ▸ KYB formats│ │
│        │                              │ │──────────────────────────────────────── │ │ [Insert]     │ │
│        │                              │ │ [Reply ▾|Note] /canned…   [Send ⏎]     │ └──────────────┘ │
│        │                              │ │ [Transfer ▾] [Resolve ✓]               │                  │
└────────┴──────────────────────────────┴─────────────────────────────────────────┴──────────────────┘
```

Key behaviors:

- **Inbox rows** (FR-11/20): unread dot, name, wait-time, last-message preview, unread count, channel glyph, SLA badge (`⚠` amber at 80% of target, red past breach — FR-58). Live-updating via `inbox.changed` events; new items slide in without stealing focus.
- **Claiming** (FR-13/34): unassigned rows show `[Pick up]` on hover/focus; claim conflict → toast "Already picked up by Rohit" + row updates. Assigned-to-other rows show the assignee avatar; opening one is read-only for agents (supervisors can barge, §3).
- **Composer**: `Reply|Note` toggle — Note mode restyles the composer amber with a lock icon (FR-17, mis-send prevention); `/` opens the canned-response picker with fuzzy search and variable preview (FR-15); Enter sends, Shift+Enter newline; attachment button mirrors widget rules.
- **Transfer** (FR-14): popover — target queue or agent (with presence dots), optional handover note; renders as a system notice in-thread.
- **KB Suggest panel** (Phase 3+): top retrieval hits for the latest user message; `[Insert]` drops the text into the composer for editing — the human stays the author. Escalated-AI conversations pin the bot's draft + confidence at the top of the thread (US-8).
- **Presence control** (FR-16) lives permanently in the nav; going `Away` shows a confirm if conversations are assigned.
- **Keyboard** (§9): `j/k` inbox rows, `Enter` open, `r` focus composer, `/` canned, `n` note toggle, `e` resolve, `Esc` back.

---

## 3. Supervisor View (FR-36)

Adds a **Dashboard** nav item and elevated thread powers.

```
┌──────────────────────────────────────────────────────────────────────┐
│ DASHBOARD · hirestream-hp                       Tue 06 Jul, 11:02    │
├──────────────────┬──────────────────┬────────────────────────────────┤
│ WAITING NOW      │ AGENTS           │ TODAY                          │
│ Candidate Sup 14 │ ● Priya    3 cnv │ New conversations         112  │
│  ⚠ oldest 4h12m  │ ● Rohit    5 cnv │ First response p50      8 min  │
│ Employer Sup   2 │ ◐ Meena   away   │ AI resolved            41 (37%)│
│ Payments       6 │ ○ Arun  offline  │ SLA breaches              3 ⚠  │
│ [queue detail →] │ [manage →]       │ CSAT today               4.6★  │
├──────────────────┴──────────────────┴────────────────────────────────┤
│ LIVE CONVERSATIONS                    [All ▾] [Breached] [AI-handled] │
│ ⚠ Meena K. · Payments · waiting 4h12m · unassigned   [Assign ▾]      │
│   Anita S. · Candidate · Priya · active 6m           [Open]          │
│   Vikas T. · General · Aria(AI) · conf 0.81          [Review]        │
└──────────────────────────────────────────────────────────────────────┘
```

- **Any-thread access** with three graded actions: *Watch* (silent), *Whisper* (internal note the agent sees), *Barge* (join as participant, announced by system notice). Force-**Reassign** via the queue detail (drag or menu — US-9).
- **AI review**: transcripts of AI-handled conversations with confidence and citations, thumbs-up/down feedback per turn feeding KB-improvement backlog (FR-36); filter for `escalated` and `refused` outcomes.
- **Reports** (Phase 5, FR-49): volumes/FRT/resolution/deflection/CSAT by queue/agent/date, CSV export.

---

## 4. Admin / Config Console

Admin nav gains **Settings**. Section list mirrors the config model ([02 §5](02_Architecture.md)) — every screen edits data, never requires deployment (FR-22, US-12):

| Section | Contents |
|---|---|
| Branding & Widget | Color tokens, logo, launcher position/icon, welcome/offline copy per locale, allowed origins, contrast validation (§9) |
| Queues & Routing | Queue CRUD, members, strategy, caps, SLA targets; routing-rule list (ordered, drag-priority) with a **rule tester** ("given this context → lands in queue X") |
| Responders & Bots | Per-queue mode picker `Human / Rules / AI / Hybrid`, bot identity (name/avatar), model, confidence-threshold slider with plain-language explanation ("below this, Aria hands off to your team"), escalation queue, guardrail toggles, daily token budget |
| Knowledge Base | Collections → documents table (source, version, status `active/superseded/stale`, last-indexed), upload/FAQ editor/URL crawl, re-index action, per-doc retrieval-hit counts |
| Business Hours | Timezone, weekly grid editor, holiday list (FR-45) |
| Staff | Members, roles, skills tags, 2FA status |
| Canned Responses | Team library CRUD with shortcuts and variables |
| Notifications & Webhooks | Portal-notify endpoint + test button, email/SMS sender config, webhook subscriptions with delivery log and signature secret rotation |
| Privacy & Retention | Retention months, redact-vs-delete, consent copy, data export/erase tools with audit trail (FR-55/57) |
| Audit Log | Filterable viewer (actor, action, object, date) |

Integrator affordances: an **Embed** page showing the copy-paste snippet pre-filled with the tenant slug, the token-mint endpoint recipe, and a live "widget preview" pane rendering the current theme.

---

## 5. Empty, Offline & Error States

| Surface | State | Treatment |
|---|---|---|
| Widget | First open, no history | Welcome message (per-locale tenant copy) + starter quick-replies (configurable) — never a blank pane |
| Widget | Team offline | §1.4 flow; availability strip truthful; composer stays enabled (async-first) |
| Widget | Network lost | Amber strip "Reconnecting…"; sends queue locally with clock icon; retry on reconnect via idempotent `client_msg_id`; hard-fail → "Not sent · Retry" on the bubble |
| Widget | Converse service down | Loader hides launcher or shows tenant-configured static fallback (mailto/help link) — never a broken UI in the host portal (FR-54) |
| Widget | Attachment rejected | Inline bubble error: reason (too large / type / failed scan) + guidance |
| Console | Empty inbox | Illustration-free calm state: "No waiting conversations. New ones appear here instantly." |
| Console | WS drop | Toast + auto-reconnect; inbox re-syncs via cursor; banner if stale > 30 s |
| Console | Claim conflict | Toast "Picked up by X" (never a modal) |
| Admin | KB doc failed to index | Status `error` chip + expandable reason + retry |
| All | 429 rate-limited | Widget: gentle "You're sending messages very quickly — one moment." Console: toast with countdown |

Error copy rules: say what happened, what the system did (saved? queued?), and what the user can do. Never blame the user; never show raw error codes to end users (codes go to logs with correlation IDs).

---

## 6. Component Inventory

**Widget (Preact, self-contained, ~30 components):** `Launcher`, `Badge`, `Window`, `Header`, `AvailabilityStrip`, `MessageList` (virtualized), `DaySeparator`, `UnreadDivider`, `Bubble(Text|Card|Attachment)`, `QuickReplyRow`, `CitationChips`, `SourcesPanel`, `SystemNotice`, `TypingIndicator`, `ReceiptTicks`, `Composer`, `AttachButton`, `UploadProgress`, `ContactCapturePrompt`, `HandoffButton`, `CsatPrompt`, `ConversationList`, `ConversationRow`, `PrivacyNotice`, `ErrorBubble`, `ReconnectStrip`, `PoweredBy`.

**Console (React + Tailwind + TanStack Query, shared design system):** `AppShell`, `Nav`, `PresenceSwitcher`, `InboxList`, `InboxRow`, `SlaBadge`, `FilterBar`, `ThreadView`, `ThreadHeader`, `MessageGroup`, `NoteBubble`, `ComposerTabs`, `CannedPicker`, `TransferPopover`, `ResolveButton`, `ContextPanel`, `KbSuggestPanel`, `AiDraftCard`, `DashboardStatTiles`, `QueueDepthList`, `AgentLoadList`, `LiveConversationTable`, `AiReviewList`, `SettingsForm` family (per §4 section), `RuleTester`, `EmbedSnippet`, `ThemePreview`, `AuditTable`, `ReportChart`, `CsvExportButton`, `Toast`, `ConfirmDialog`.

Both are consumers of `@agentryx/converse-sdk` ([02 §14](02_Architecture.md)) — no direct fetch calls in components.

---

## 7. Theming & White-Label Tokens (FR-42)

Per-tenant `theme` JSONB → CSS custom properties injected into the widget iframe (host page styles never leak in; widget styles never leak out).

| Token | Default | Notes |
|---|---|---|
| `--cv-primary` / `--cv-on-primary` | `#1e4fa3` / `#ffffff` | Header, launcher, user bubbles, primary buttons |
| `--cv-surface` / `--cv-on-surface` | `#ffffff` / `#1a1d21` | Window + inbound bubbles |
| `--cv-surface-alt` | `#f4f6f8` | Inbound bubble fill, strips |
| `--cv-accent` | `#0f766e` | Links, citation chips, availability-online |
| `--cv-danger` / `--cv-warn` | `#b3261e` / `#9a6b00` | Errors / SLA & offline accents |
| `--cv-radius` | `12px` | Bubble/window rounding (0 for square-brand tenants) |
| `--cv-font` | system stack | Custom font URL allowed (self-hosted only, CSP); must include Devanagari coverage when `hi` enabled |
| `--cv-launcher-size` / `--cv-offset-x/y` | `56px` / `24px` | Placement |
| Copy slots | welcome, offline, ack, privacy notice | Per locale, editable in admin |
| Assets | logo, launcher icon, bot avatar | SVG/PNG, size-validated |
| White-label tier | `PoweredBy` visibility | Contract-controlled flag |

Guardrails: the admin theme editor computes contrast for every generated pair and blocks saves below WCAG AA (explicit override logs an audit entry — [01 §9](01_Product_Spec.md)). Dark-mode: widget follows `prefers-color-scheme` with auto-derived dark variants unless the tenant pins a scheme; console ships light+dark natively.

---

## 8. Mobile (FR-60)

- **Widget on mobile web:** below 640 px the window becomes a full-screen sheet (slide-up, safe-area padded); launcher shrinks to 48 px; composer sticks above the keyboard (visualViewport API); attachments open the native picker/camera; quick replies wrap to two lines max then scroll.
- **Host-portal coexistence:** opening the sheet locks host scroll; back gesture/button closes the sheet before navigating the portal (history-state integration in the loader).
- **Native apps:** the React Native path uses the headless SDK + a supplied RN component kit (Phase 4–5); push notifications deep-link `converse://conversation/<id>` mapped by the host app.
- **Console on mobile:** responsive down to tablet (two-pane); phone gets a read-and-reply-only layout (inbox → thread stack) — full workflows remain desktop-first.

---

## 9. Accessibility (WCAG 2.1 AA — FR-53)

| Area | Commitment |
|---|---|
| Structure | Widget window is `role="dialog" aria-label="Support chat"`; message list `role="log"` with `aria-live="polite"`; notices `role="status"` |
| Keyboard | Launcher tabbable; open traps focus in window; `Esc` closes and restores focus to launcher; every interactive element reachable and operable; visible focus rings (2 px, `--cv-primary` outline) |
| Announcements | New inbound message announced (sender + text); typing announced once, not per animation frame; unread count in launcher `aria-label` |
| Contrast | All token pairs ≥ 4.5:1 (3:1 large/UI); validated at theme-save (§7) |
| Motion | `prefers-reduced-motion`: no launcher pulse, static typing text, no slide animations |
| Forms & errors | Composer labeled; errors associated via `aria-describedby`; upload progress announced at 25% steps |
| Touch targets | ≥ 44×44 px everywhere on mobile |
| Console | Full keyboard workflow (§2), landmark regions, table semantics for inbox, no color-only status (SLA badges pair icon+text) |
| Testing | axe-core in component CI + manual NVDA/VoiceOver pass per release ([04 §6](04_Build_Phasing_and_Plan.md)); GIGW-aligned for HPSEDC signoff |

Localization interacts with a11y: `lang` attribute set per message when it differs from the UI locale (correct screen-reader pronunciation for mixed en/hi threads).

---

*End of Design & UX v1.0 · 2026-07-06. Next: [04_Build_Phasing_and_Plan.md](04_Build_Phasing_and_Plan.md).*
