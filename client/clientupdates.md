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

## 2026-06-10 — i18n for PublicProfilePage (user details)
- **`i18n/index.ts`**: added 11 new ZH keys — `Back`, `Edit Profile`, `Follow`, `Games Played`, `Hosted`, `Completion`, `Skill`, `Recent Games`, `No game history yet`, `Spaces`, `User not found`, `Go back`
- **`pages/PublicProfilePage.tsx`**: wrapped all hardcoded EN strings with `t()`; destructured `lang` from `useLang`; skill level badge uses `t(profile.skillLevel)` for ZH; proficiency tags on recent games use `t(prof)`; event dates switch locale to `zh-SG` when in ZH; all stat labels, social counts, buttons, and error states now translate

## 2026-06-10 — venue tag fixes; venueApprovalStatus tag on map & event detail
- **`i18n/index.ts`**: fixed `'Board Game Café'` ZH → `'桌游店'` (was '桌游咖啡馆'); added `'Contact space owner to confirm': '通知场地确认'`
- **`pages/EventDetailPage.tsx`**: added amber `● Contact space owner to confirm` tag in hero when `venueApprovalStatus === 'pending'`
- **`pages/GameMapPage.tsx`**: added same amber pending tag in event popup when `venueApprovalStatus === 'pending'`

## 2026-06-10 — i18n for AuthModal, ReportModal, ContactModal; venue type tags; host profile click
- **`i18n/index.ts`**: added ~60 new zh translations — auth modal (login/register/forgot/reset flows), report modal (reasons, labels), contact modal, "View Profile" key
- **`components/AuthModal.tsx`**: added `useLang` hook; all labels, placeholders, button text, error messages, and tab headers translated via `t()`; dynamic cooldown string handles ZH (`${n}秒后重发`) vs EN branching via `lang`
- **`components/ReportModal.tsx`**: added `useLang`; title uses `t(\`Report ${targetType}\`)`; all labels, select options, and button text translated
- **`components/ContactModal.tsx`**: added `useLang`; heading, description, field labels, placeholder, button translated
- **`pages/GameSpacePage.tsx`**: wrapped `VENUE_TYPE_LABELS[venue.type]` in `t()` on venue card tag (line ~228)
- **`pages/VenueDetailPage.tsx`**: wrapped `VENUE_TYPE_LABELS[venue.type]` in `t()` in venue detail sidebar (line ~1539)
- **`pages/EventDetailPage.tsx`**: host row changed from `<div>` to `<button>`; clicking navigates to `/user/:hostId` (public profile page); shows "View Profile" hint text below host name

## [removed — oldest entry trimmed]
- **`components/ContactModal.tsx`**: replaced mock setTimeout with `api.post('/contact', { email, message })`; success/failure alerts now use `t()` for i18n
- **`i18n/index.ts`**: added ZH keys for success/failure contact form alerts
- **`components/layout/AppLayout.tsx`**: imported `IconBrandGithub`; added GitHub sidebar link that opens `https://github.com/Wen037/werewolf-platform` in new tab

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


