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

## 2026-06-12 — Public profile hero band removed entirely (was tried as gradient glow, user preferred plain)
- **`pages/PublicProfilePage.tsx`**: gradient-glow hero band (added same day to replace a flat grey bar) removed per user feedback — still didn't look good; layout simplified to a plain page with `pt-6` top padding instead of `-mt-16` overlap; removed unused `RANK_GLOW_RGB` map

## 2026-06-12 — Venue fixes: approval persisted, rating avg refreshed, amber tabs
- **`services/game.service.real.ts`**: added `approveVenueSession` → `PATCH /games/:id/venue-approve`; `rejectVenueSession` → `PATCH /games/:id/venue-reject`
- **`services/game.service.mock.ts`**: matching stubs
- **`pages/VenueDetailPage.tsx`**: `handleApprove`/`handleReject` now call the API before updating local state — pending item no longer reappears after page refresh; `handleRate` re-fetches venue after success so `averageRating` reflects multi-user average (was only updating `myRating` locally); About/Comments active tab colour changed from red → amber


## 2026-06-11 — Space comments tab in VenueDetailPage; venue-approval badge now correct for cafés
- **`types/index.ts`**: added `SpaceComment` interface; `GameVenueDTO` gets `commentsLocked?: boolean`
- **`services/game.service.real.ts`**: added `getVenueComments`, `addVenueComment`, `deleteVenueComment`, `lockVenueComments` → `/venues/:id/comments[...]`
- **`services/game.service.mock.ts`**: matching stubs for the 4 new calls
- **`pages/VenueDetailPage.tsx`**: tab bar at top of left column (About | Comments with count); Comments card mirrors EventDetailPage permissions — any logged-in user posts, author deletes own, owner/admin delete any + lock/unlock toggle, guests see "Log in to comment" auth gate, lock banner "Comments locked by owner"
- **`i18n/index.ts`**: added `About`, `Comments locked by owner` ZH keys (rest reused from event comments)
- **`tests/e2e/helpers/mock-api.ts`**: added `/venues/*/comments` + `/venues/*/comments/*` routes
- Backend fix (see serverupdates): events created by a non-owner on a `boardgame_store` space now start `venueApprovalStatus: 'pending'` — the existing amber "Pending Space Approval" badge now shows instead of "Venue Confirmed"
- Verified: client `tsc --noEmit` clean; Playwright 04-gamespace 9/9 passed

