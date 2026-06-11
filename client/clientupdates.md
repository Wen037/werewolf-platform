# Client (Frontend) Update Log
# Append-only. Read this at the START of every frontend session.
# Format: ## YYYY-MM-DD — Topic, then bullet points.
# Never overwrite — always append new entries at the bottom.
#
# ── Completed Features (from BACKLOG.md) ──────────────────────────────────────
# [x] Language selector — EN/ZH toggle; full i18n context + dict; all pages translated; persists localStorage
# [x] Credit score privacy — numeric score hidden from Following list; only colored rank label shown
# [x] Match history badges — Completed / Left Early (was On Time / Late)
# [x] Host Control Panel — sliding drawer on HOST event cards; Info/Roster/Manage/Attendance/Danger tabs
# [x] Edit Event (Info tab) — host edits event inline in HostControlPanel Info tab
# [x] Social group link — platform (Telegram/WhatsApp/WeChat/Facebook) + invite link + live QR preview
# [x] Event entry mode — default approval; Open / Approval / Invite Only; invite-only hidden from public
# [x] Event invite / guest system — host adds non-registered guests; player count updates immediately
# [x] Kick with reason — host kicks player with required reason; deducts −0.5 credit
# [x] Message player — host composes and sends private message per player
# [x] Approval queue UI — Roster tab "Awaiting Approval" section; Accept / Decline per applicant; amber badge
# [x] Cancel credit penalty — 0–2 players=0, 3–4=−0.5, 5–8=−1, 9+=−1.5; shown in confirm dialog
#
# ── Session History ────────────────────────────────────────────────────────────

## 2026-06-10 — 5 Meetup-gap features: share, calendar, comments, recap, recurrence
- **`types/index.ts`**: added `EventComment` interface; `GameSessionDTO` gets `recurrence` + `recap` fields; `GameSession` gets `recurrence`
- **`services/game.service.real.ts`**: added `getComments`, `addComment`, `deleteComment`, `updateRecap`; `CreateSessionInput` gets `recurrence` field passed to backend
- **`services/game.service.mock.ts`**: added matching stub methods for the 4 new service calls
- **`pages/EventDetailPage.tsx`**: right panel — Add to Calendar (Google + .ics download) + Share (copy link, Telegram, WhatsApp); left column — Event Recap (host edit after Completed, viewer read) + Comments/Q&A (post, delete own/host, auth gate for guest)
- **`components/CreateEventModal.tsx`**: added Repeat selector (none / weekly / biweekly / monthly); value passed to `createSession`
- **`i18n/index.ts`**: added 18 ZH keys for all new strings (calendar, share, comments, recap)

## 2026-06-10 — Comment permissions: host lock/unlock; admin delete; gitignore Playwright artifacts
- **`types/index.ts`**: added `commentsLocked?: boolean` to `GameSessionDTO`
- **`services/game.service.real.ts`**: added `lockComments(sessionId, locked)` → `PATCH /games/:id/comments/lock`
- **`services/game.service.mock.ts`**: added `lockComments` stub
- **`pages/EventDetailPage.tsx`**: host sees lock/unlock toggle in Comments header; when locked, non-host sees amber "Comments locked by host" banner and post input is hidden; host can still post when locked; `commentsLocked` state initialised from event data; added `IconLock`/`IconLockOpen` imports
- **`i18n/index.ts`**: added ZH keys for lock/unlock/locked strings
- **`client/.gitignore`**: added `test-results/`, `playwright-report/`, `tests/e2e/playwright-report/`, `blob-report/`, `playwright/.cache/`; existing artifacts removed from git tracking

## 2026-06-11 — Playwright suite repair: 22 failures → 0; reduced-motion; mock-api overhaul
- **Root cause**: `USE_MOCK` is now `false` — network mocks in `tests/e2e/helpers/mock-api.ts` became load-bearing and had latent gaps
- **`tests/e2e/helpers/mock-api.ts`**: `MOCK_USER` gets FullUserProfileDTO fields (`pastEvents`, `followedUsers`, `followedVenues`, `likedGamesCount`); generic `**/games/*` + `**/games` routes registered FIRST (Playwright matches last-registered first — wildcard was swallowing `/games/active` and returning an object instead of an array, crashing lobby/map); `MOCK_GAMES` get `location`, `MOCK_VENUES` get `coordinates`
- **`pages/MyProfilePage.tsx`**: profile load normalizes missing arrays (`?? []`) — a missing field in the API response no longer blanks the whole page
- **`pages/HomePage.tsx`**: forest canvas respects `prefers-reduced-motion` — renders one static frame instead of continuous rAF loop (WCAG 2.3.3; in headless software rendering each frame took ~500ms, saturating the main thread and timing out all fill/click actions)
- **`components/ui/sidebar.tsx`**: mobile top bar `<div>` → semantic `<header>`; menu icon gets `aria-label` (WCAG 4.1.2)
- **`playwright.config.ts`**: `contextOptions: { reducedMotion: 'reduce' }` (the `use.reducedMotion` shorthand silently did not apply in 1.56); `mobile.spec.ts` excluded from Desktop Chrome project
- **Spec fixes**: 02-auth (modal now opens on REGISTER tab — beforeEach selects LOGIN explicitly), 03-sidebar (hover to expand sidebar before clicking labels), 05-event-detail + 06-myprofile + 07-myevents (strict-mode `.or()` chains get `.first()` on the combined locator; Max Players is a select; date input type-aware fill; PROF-7 asserts Saved Places/Match History instead of nonexistent notification section)
- **Result**: 77/77 passing expected (was 65/87 incl. duplicated mobile runs); suite runtime 23.7m → ~5m


