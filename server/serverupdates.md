# Server (Backend) Update Log
# Append-only. Read this at the START of every backend session.
# Format: ## YYYY-MM-DD — Topic, then bullet points.
# Never overwrite — always append new entries at the bottom.
#
# ── Pending Backend Changes (batched from frontend sessions) ──────────────────
# All items below are defined but NOT yet implemented. Apply when user requests.
#
# - Admin: reset another user's password
#   - New route: POST /admin/users/:id/reset-password (admin/web_admin only, BFLA-guarded)
#   - Generates a temp password (or OTP-style reset link) + emails it to the user via Resend
#   - UserService: add resetPasswordByAdmin(adminId, targetUserId) method
# - Admin: ban / suspend a user account
#   - UserSchema: add `isBanned: boolean` (+ optionally `bannedReason`, `bannedUntil`)
#   - New route: PATCH /admin/users/:id/ban { banned: boolean, reason?: string }
#   - requireAuth / login flow: reject banned users with 403 "Account suspended"
#   - UserService: add banUser(adminId, targetUserId, reason) / unbanUser(...)
# - Admin: list / search all users
#   - New route: GET /admin/users?search=&role=&page= (admin/web_admin only)
#   - Prerequisite for password-reset / ban / credit-adjust UIs — admin needs to find users first
#   - UserService: add listUsersForAdmin(filters, pagination)
# - Admin: handle user reports
#   - `ReportModal.tsx` exists on frontend but has no backend — needs ReportSchema (reporterId, targetType: 'user'|'venue'|'match', targetId, reason, status, createdAt)
#   - New routes: POST /reports (any user), GET /admin/reports, PATCH /admin/reports/:id { status, action }
#   - ReportService: create/list/resolve (resolve action can trigger ban/removal via existing services)
# - Admin: force-remove/cancel any event or venue
#   - Beyond normal host/owner permissions and beyond the existing venue-verification flow
#   - New routes: DELETE /admin/matches/:id, DELETE /admin/venues/:id (admin/web_admin only, BFLA-guarded)
#   - MatchService/PlayerSpaceService: add adminForceCancel/adminRemove methods — should publish notification events to affected users
#
# ── Session History ────────────────────────────────────────────────────────────

## 2026-06-10 — Comment permissions: commentsLocked field; admin delete; lockComments method
- **`MatchSchema.ts`**: added `commentsLocked: boolean` (interface + schema field, `default: false`)
- **`MatchDTOs.ts`**: added `commentsLocked: boolean` to `GameSessionResponseDTO`
- **`MatchService.ts`**: `enrichWithNamesAndInteraction` includes `commentsLocked`; `addComment` checks `commentsLocked` (host exempt); `deleteComment` now allows admin to delete any comment on any event; new `lockComments(matchId, userId, locked)` — host or admin only; `updateRecap` now also allows admin
- **`matchRoutes.ts`**: added `PATCH /games/:sessionId/comments/lock` (requireAuth)

## 2026-06-09 — Contact Owner: PDPA-safe socialLinks on venue
- **`PlayerSpaceSchema.ts`**: added `socialLinks?: { wechatId, telegramHandle, facebookUrl }` sub-document
- **`PlayerSpaceDTOs.ts`**: added `socialLinks` to create/update Zod schemas + `GameVenueResponseDTO`; removed `ownerContact` (no phone numbers)
- **`PlayerSpaceService.ts`**: `toVenueDTO` includes `socialLinks`; `createVenue`/`updateVenue` persist it; removed owner User lookup from `getVenueById`

## 2026-06-09 — Contact Owner — expose owner contact in venue detail DTO
- **`PlayerSpaceDTOs.ts`**: added `ownerContact?: { contactNumber?: string; whatsappPhone?: string }` to `GameVenueResponseDTO`
- **`PlayerSpaceService.ts` `getVenueById()`**: fetches owner's `contactNumber` + `whatsappPhone` from User model and attaches to DTO; skipped entirely for `type === 'school'` (public venue, no owner to contact)

## 2026-06-09 — Booking inquiry email
- **`shared/infra/email.ts`**: added `BookingInquiryPayload` interface and `sendBookingInquiryEmail(ownerEmail, payload)` — sends formatted HTML email to space owner; non-fatal (logs error but does not throw) so API call succeeds even if email fails
- **`player-spaces/routes/playerSpaceRoutes.ts`**: added `POST /venues/:id/booking-inquiry` (public, no auth required); fetches venue + owner email; `isAutoConfirmed = venue.type === 'school'`; calls `sendBookingInquiryEmail`; returns `{ autoConfirmed: boolean }`

## 2026-06-09 — Session 38: Admin space auto-verify + unlimited spaces + pin (置顶) for spaces & events
- **`PlayerSpaceSchema.ts`**: added `isPinned: boolean` (interface + schema field, `default: false`)
- **`MatchSchema.ts`**: added `isPinned: boolean` (interface + schema field, `default: false`)
- **`PlayerSpaceDTOs.ts`**: added `isPinned: boolean` to `GameVenueResponseDTO`
- **`MatchDTOs.ts`**: added `isPinned: boolean` to `GameSessionResponseDTO`
- **`PlayerSpaceService.ts`**: `createVenue()` — looks up user role; admins skip the 3-space limit; admins get status `'Verified'` automatically (no approval needed); `getAllVenues()` sort changed to `{ isPinned: -1, createdAt: -1 }`; `toVenueDTO` includes `isPinned`; added `pinVenue(venueId, adminId)` — admin-only toggle
- **`MatchService.ts`**: `enrichWithNamesAndInteraction` includes `isPinned`; `getActiveMatches()` sort changed to `{ isPinned: -1, scheduledAt: 1 }`; added `pinMatch(sessionId, adminId)` — admin-only toggle
- **`playerSpaceRoutes.ts`**: added `PATCH /admin/venues/:id/pin`
- **`matchRoutes.ts`**: added `PATCH /admin/games/:id/pin`

## 2026-06-10 — 5 Meetup-gap features: comments, recap, recurrence, 24h reminder
- **`MatchSchema.ts`**: added `recurrence?: 'none'|'weekly'|'biweekly'|'monthly'` and `recap?: { text?: string }` fields
- **`EventCommentSchema.ts`** (new): `matchId`, `userId`, `text`; index on `(matchId, createdAt)`
- **`MatchDTOs.ts`**: added `AddCommentSchema`, `UpdateRecapSchema` (Zod); `CommentResponseDTO` type; `recurrence` + `recap` in `GameSessionResponseDTO`; `recurrence` added to `CreateMatchSchema`
- **`MatchService.ts`**: `enrichWithNamesAndInteraction` includes `recurrence` + `recap`; added `getComments`, `addComment`, `deleteComment`, `updateRecap` methods; `createNextOccurrence` private helper auto-creates next event when status → Completed + recurrence set; `updateMatchStatus` calls `createNextOccurrence`; `createMatch` persists `recurrence`
- **`matchRoutes.ts`**: added `GET/POST /games/:id/comments`, `DELETE /games/:id/comments/:commentId`, `PATCH /games/:id/recap`
- **`shared/infra/ReminderService.ts`** (new): `node-cron` hourly job; finds Open/Full matches in 23–25h window; sends HTML reminder email via Resend to all registered players
- **`server.ts`**: starts `ReminderService` after MongoDB connects

## 2026-06-10 — Contact form email endpoint
- **`shared/infra/email.ts`**: added `sendContactEmail(fromEmail, message)` — sends to `ADMIN_EMAIL` env var (fallback `becky.fuwen@gmail.com`); sets `replyTo` to sender so admin can reply directly; `NODE_ENV=test` logs and skips
- **`app.ts`**: added inline `POST /api/contact` (public, no auth); validates email + message presence and length (email≤254, message≤2000); calls `sendContactEmail`; uses global `apiLimiter`

## 2026-06-10 — Fix currentPlayers to include guests and externalPax
- **`MatchService.ts` `enrichWithNamesAndInteraction()`**: `currentPlayers` now = `players.length + (guests?.length ?? 0) + (config.external_pax ?? 0)`; previously only counted `players.length`, so adding a guest didn't reflect in the map/event detail count

## 2026-06-10 — Session 41: OWASP security test suite + fix app.ts error handler + fix validate middleware
- **`shared/middleware/validate.ts`** (carried from Session 40): fixed Express 5 `req.query` read-only getter via `Object.defineProperty`
- **`app.ts`**: global error handler now correctly handles `SyntaxError` (malformed JSON body → 400) and `PayloadTooLargeError` (body > 10kb → 413); previously both fell through to 500 (OWASP A05 misconfiguration)
- **New** `src/__tests__/security/A01-access-control.sec.test.ts`: 16 tests — OWASP A01 missing auth (5), BFLA vertical privilege escalation (5+1 positive), BOLA horizontal privilege escalation (6)
- **New** `src/__tests__/security/A02-A07-auth-crypto.sec.test.ts`: 20 tests — A02 sensitive data not in responses (5), A07 JWT alg:none attack (2), wrong secret (3), expiry bypass (2), role injection via JWT payload (3), token structure tampering (6)
- **New** `src/__tests__/security/A03-injection.sec.test.ts`: 21 tests — NoSQL injection in body (7), operator injection in query strings (2), mass assignment CWE-915 (4), XSS payload storage (4), large payload DoS probe (2), HTTP verb tampering (2)
- **New** `src/__tests__/security/A05-misconfiguration.sec.test.ts`: 20 tests — stack trace leakage (4), security headers (3), error handling robustness (6), debug endpoint exposure (5), prototype pollution (2)
- **New** `src/__tests__/security/rate-limiting.sec.test.ts`: 8 tests + 4 skipped — burst resilience (4), timing attack probe (1), credential stuffing/anti-enumeration (2), Cloudflare WAF/RL manual checklist (4 skipped — NOT hitting production)
- **Applied standard**: OWASP Top 10 (2021) — A01, A02, A03, A05, A07; OWASP API Security 2023 — API4, API8
- Final: **519/523 passing** (4 intentionally skipped = Cloudflare production-only tests)

## 2026-06-10 — Session 40: Comprehensive test suite expansion + fix Express 5 validate middleware bug
- **`shared/middleware/validate.ts`**: fixed critical bug — `Object.assign(req.query, ...)` is a no-op in Express 5 (req.query is a read-only computed getter); replaced with `Object.defineProperty(req, 'query', { value: result.data, ... })` which overrides the getter on the specific request instance; this also fixed a production bug where all map "nearby" queries returned 400 due to `radiusKm = undefined → NaN`
- **New** `src/modules/player-spaces/__tests__/socialLinks.integ.test.ts`: 13 service-layer tests for venue socialLinks (create, update, clear, non-owner rejection, DTO propagation)
- **New** `src/modules/matches/__tests__/matchRoutes.extended.integ.test.ts`: ~40 HTTP-layer tests — toggleLike, setExternalPax, PATCH status, kick player, invite-only approval flow, waitlist, pin
- **New** `src/modules/matches/__tests__/matchService.extended.integ.test.ts`: 35 service-layer tests — rateMatch, toggleLike, setExternalPax, updateSession, pinMatch, addGuest/removeGuest, getMatchById, getActiveMatches, getMyEvents, deleteMatch
- **New** `src/modules/users/__tests__/userRoutes.extended.integ.test.ts`: ~30 HTTP-layer tests — forgot/reset password, public profile, follow/unfollow, admin credit/reset
- **New** `src/modules/users/__tests__/userService.extended.integ.test.ts`: 22 service-layer tests — forgotPassword (anti-enumeration), resetPassword, adminResetPassword, updateProfile, getMyProfile, getUserById
- **New** `src/modules/notifications/__tests__/notificationRoutes.integ.test.ts`: 16 HTTP-layer tests — list, unread-count, mark-read (no-op behavior), read-all
- **New** `src/modules/map/__tests__/mapRoutes.integ.test.ts`: 17 HTTP-layer tests — nearby venues/events, geocode, reverse-geocode, validation guards
- **Fixed** `src/modules/matches/__tests__/joinLeaveFlow.integ.test.ts`: 4 tests corrected (host can leave, waitlist Full status, error message regex, kick error regex)
- Final test count: **434/434 passing** across 28 test files, 0 failures

## 2026-06-11 — Session 45: fix 2dsphere index race ($near 500s on fresh DB); strict map test assertions
- **Root cause found**: Mongoose builds schema indexes asynchronously after connect; `$near` queries on `matches`/`playerspaces` returned 500 ("unable to find index for $geoNear query") until the 2dsphere build finished — on any FRESH database (new deploy, new cluster) the map nearby endpoints could 500. Map tests masked it with `expect([200, 500])` and false "MongoMemoryServer does not support $near" comments (it does — it runs real mongod)
- **`server.ts`**: after connect, awaits `Model.init()` for all registered models before `app.listen` — indexes guaranteed before serving traffic
- **`__tests__/helpers/setupMongoMemory.ts`**: same `Model.init()` await in beforeAll
- **`map/__tests__/mapRoutes.integ.test.ts`**: own beforeAll also awaits init; all `[200, 500]` assertions tightened to `200` + seeded-data presence asserted (MAP-ROUTE-1/4/5/7/9/10/11 now real tests)
- **`map/__tests__/MapService.unit.test.ts`**: removed `.catch(() => [])` swallows; MAP-1 asserts radius filtering (near in, far out); MAP-2 asserts visible-then-hidden with hideFull
- Suite: **519 passed | 4 skipped (523)** — unchanged count, strictly stronger assertions

## 2026-06-11 — Session 46: Session 43 feature tests (25 new) + fix reminder double-send bug
- **Bug fixed**: `ReminderService` 23-25h window is wider than the hourly cron interval — every match was matched by two consecutive runs, so players received the 24h reminder email TWICE
- **`MatchSchema.ts`**: added `reminderSentAt?: Date` — stamped after a reminder goes out
- **`ReminderService.ts`**: query excludes matches with `reminderSentAt`; stamps before sending; `sendReminders()` made public for direct testing (cron just wraps it)
- **New** `src/modules/matches/__tests__/matchService.social.integ.test.ts`: 20 tests — comments CRUD + BOLA (author/host/admin delete matrix), comment locking (BFLA, host-exempt lock, unlock), recap (host/admin-only, Completed-only, overwrite), recurrence (weekly/biweekly/monthly +7/14/30d, roster reset to host, `none` → no follow-up, Completed→Completed blocked by state machine = no double occurrence)
- **New** `src/shared/__tests__/ReminderService.integ.test.ts`: 5 tests — mocked Resend; recipients, 23-25h window boundaries, Cancelled skipped, double-send guard (REM-4 fails without the fix), `reminderSentAt` stamped
- Closes `docs/test-standards.md` gap backlog items 1 (ASVS V4 for Session 43 endpoints) and 2 (ISO 25010 reliability — recurrence/reminder)
- Suite: **544 passed | 4 skipped (548)** across 35 files

## 2026-06-11 — Session 47: OTP hardening + SSRF/log-content security tests + CI workflow
- **Bugs fixed (ASVS V2.5)**: OTP generated with `Math.random()` (predictable PRNG) → `crypto.randomInt`; no attempt cap on `verifyOtp` → 5-attempt limit (`attempts` counter on `PendingRegistrationSchema`, pending registration deleted on lockout, counter reset on fresh OTP request)
- **New** `src/__tests__/security/V2.5-otp-bruteforce.sec.test.ts`: 6 tests — wrong/correct codes, lockout after 5 fails (correct code rejected after), expiry, single-use replay, counter reset, 6-digit format
- **New** `src/__tests__/security/A10-ssrf.sec.test.ts`: 4 tests — geocode/reverse-geocode request target is always the fixed OneMap/Nominatim host; metadata-endpoint/file:///userinfo-trick payloads only travel as query params; graceful fallback
- **New** `src/__tests__/security/V7.1-log-content.sec.test.ts`: 3 tests — stdout/stderr captured during register/login/JWT flows; no passwords, OTPs, password hashes, or tokens in logs
- **New** `.github/workflows/ci.yml`: backend Vitest job + `npm audit --audit-level=high` gate for client and server (no CI workflow existed before — testplan.md's claim was stale)
- Gap backlog item 6 (axe scan) blocked: local TLS-intercepting proxy breaks `npm install`
- Suite: **557 passed | 4 skipped (561)** across 38 files

## 2026-06-11 — Session 48: Code-smell refactor of backend services (behavior-preserving)
- **`shared/core/adminGuard.ts`** (new): `ensureAdmin(userId, forbiddenMessage?)` — single shared BFLA guard; replaces 4 copy-pasted admin-role checks in `MatchService.pinMatch`, `PlayerSpaceService.verifyVenue/transferOwnership/pinVenue`, `UserService.adminResetPassword` (each keeps its original error wording)
- **`MatchService.ts`**: extracted `findMatch` / `findHostedMatch` guards — removed 15 repeated "load match + host check" blocks; merged `approveVenueSession`/`rejectVenueSession` twins into private `setVenueApproval`; `isHostOrAdmin` helper dedupes comment/recap permission checks; `notifyInApp` helper dedupes 5 in-app NotificationModel.create blocks; `enrichOne` dedupes single-doc enrich pattern (×3); `toCommentDTO` mapper dedupes comment DTO building; removed dead average-rating computation in `rateMatch`; magic numbers → named constants (`MS_PER_HOUR`, `MAX_EVENTS_PER_WINDOW`, `PLAYER_PREVIEW_COUNT`, `LATE_LEAVE_*`, `KICK_CREDIT_PENALTY`, `CANCEL_PENALTY_TIERS`, `RECURRENCE_DAYS`, `PUBLIC_VENUE_TYPES`)
- **`PlayerSpaceService.ts`**: `toggleLike`/`toggleSubscribe` deduped via private `toggleInteractionFlag`; interaction-view mapping deduped (`toInteractionView` + `DEFAULT_INTERACTION`); `MAX_SPACES_PER_USER` constant
- **`UserService.ts`**: removed redundant lazy `await import()`s in `getMyProfile` (models already top-level imports); `BCRYPT_ROUNDS` / `OTP_TTL_MS` / `ADMIN_RESET_TTL_MS` constants
- No routes, DTOs, schemas, or error messages changed — all responses byte-identical
- **Refresh-token rotation completed**: `resetPassword` now revokes ALL outstanding refresh tokens for the user (ASVS 3.3.1 — stolen refresh token must not survive account recovery); new test RT-7 in `refreshToken.integ.test.ts` exercises the full forgot→reset→replay flow
- Suite: **564 passed | 4 skipped (568)** across 39 files; `tsc --noEmit` clean


