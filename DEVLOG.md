# Werewolf SG — Dev Log
> Append a concise entry after each session. Frontend-first; backend batch-updated separately.
> Format: `## YYYY-MM-DD — Topic` then bullet points.

---

## 2026-05-01 — Session 8: Host Control Panel, Edit Event, Social Group, Entry Mode

**Frontend changes (complete):**

- **Dynamic mock user** (`game.service.mock.ts`): replaced hardcoded `CURRENT_USER_ID = "u1"` with `getCurrentUserId()` that reads from `localStorage` — debug panel user switches now take effect immediately across all mock service calls
- **Mock data** (`mockDB.ts`): added g13 (AlphaWolf's Logic Duel, hosted by u1, `invite_only`); expanded `MOCK_SESSION_INTERACTIONS` with roster entries for g1 (7 players including flagged JesterJack), g6 (5 players), g13 (4 players); added `groupLink`/`groupType` to g1; added `approvalMode` field
- **New types** (`types/index.ts`): `SocialGroupType`, `GameSession.groupLink`, `GameSession.groupType`, `GameSession.approvalMode: 'open' | 'approval' | 'invite_only'`
- **`getMyEvents` fix** (`game.service.mock.ts`): now also includes events where `hostId === currentUserId` even without an interaction record — hosts always see their own events
- **New mock service methods**: `getSessionRoster`, `kickPlayer`, `addGuest`, `removeGuest`, `updateSessionStatus`, `markAttendance`, `cancelSession`, `updateSession`, `updateApprovalMode`, `sendMessageToPlayer`, `notifyPlayers`
- **`HostControlPanel.tsx`** (new, ~500 lines): right-side sliding drawer triggered by shield icon on HOST event cards; 4 tabs:
  - **Roster**: player list with credit rank + skill badges; flagged users shown in red; search by name (appears at 4+ players); per-player inline action panels — **Message** (blue, compose + send) or **Kick** (red, reason required, −0.5 credit deducted on confirm); guest add/remove; waitlist count
  - **Manage**: entry mode selector (Open / Approval / Invite Only) with one-click save; session status toggle (Open → Playing → Finished); event info summary
  - **Attendance**: per-player Attended / No-show toggle; saves to mock state
  - **Danger**: two-step cancel with player count warning
- **`EditEventModal.tsx`** (new, ~280 lines): pre-filled edit modal for host's event; fields: title, date, time, max players (blocked below current count), proficiency pill buttons, description, social group link (platform picker + link input + live QR preview via `api.qrserver.com`); on save: calls `updateSession` + `notifyPlayers`, shows "Saved & Notified!" green state then auto-closes
- **Edit button on event cards** (`MyEventsPage.tsx`): HOST cards now show `HOST` badge + pencil (edit) + shield (manage) icon trio; pencil opens `EditEventModal`
- **Social group on joined player cards** (`MyEventsPage.tsx`): non-host joined players see a "Host's Group" footer section (platform-colored link button + Show QR toggle) instead of generic Invite Friends when event has a `groupLink`
- **`game.service.real.ts`**: stubs added for all new host-control and social endpoints

**No backend schema changes this session — all new fields batched for later.**

---

## 2026-05-01 — Session 7: i18n Completions, Privacy Hardening, Badge Relabels

**Frontend changes (complete):**
- **EditSpaceModal i18n** (`VenueDetailPage.tsx`, `i18n/index.ts`): wired all remaining hardcoded English strings through `t()` — venue type button labels (`Board Game Café` → `桌游咖啡馆` etc.), space-type hint paragraphs, privacy hint line, "This exact address is hidden..." hint, "Shown on listing as Yishun area..." hint, "JPG / PNG / WebP · max 5 MB each" photo subtitle; also fixed loop variable shadow (`SPACE_TYPES.map(t =>` → `spaceType`) and `handleTypeChange` parameter rename
- **Language toggle label** (`AppLayout.tsx`, `HomePage.tsx`): changed `中文` → `CN` for visual consistency with `EN`
- **Credit score privacy** (`MyProfilePage.tsx`): removed numeric `{score} cr` display from Following list; only the colored rank label (e.g. "Tactician") remains as a visual range indicator — protects user privacy (score not public)
- **Match history badge relabels** (`MyProfilePage.tsx`, `i18n/index.ts`): `● ON TIME` → `● COMPLETED`, `● LATE` → `● LEFT EARLY`; old i18n keys replaced with `'● Completed': '● 完成'` and `'● Left Early': '● 提前退出'`; applies to both history list and MatchDetailModal

**Host Control Panel (planned, not built this session):**
- Surveyed full backend capability: `PATCH /games/:sessionId/status`, `/attendance`, `/external-pax`, `canKickPlayer` permission, `guests[]` field all already exist on server
- Missing pieces identified: no `approvalMode` field, no social group link field, no host-control UI anywhere
- Proposed scope: Host Control drawer with Info / Roster / Settings / Close Out / Danger tabs

**No backend changes this session.**

---

## 2026-04-30 — Session 6: i18n Toggle, Profile Refinements, Tier Colors

**Frontend changes (complete):**
- **Credit tier colors** (`types/index.ts`): Elite (140–149) changed orange → pink; Grandmaster (150+) changed amber → orange gradient (`bg-gradient-to-r from-orange-400 to-amber-300`)
- **UserDetailModal header bar** (`MyProfilePage.tsx`): thin `h-9` strip colored with user's credit tier, `opacity-60`, contains close button (X) — replaces plain grey bar
- **Profile layout swap** (`MyProfilePage.tsx`): Row 1 = Following (1-col) + Saved Places (2-col, prominent); Row 2 = Match History (full-width); scroll limits: Following after 5 users (`max-h-[320px]`), Saved Places after 4 entries (`max-h-[352px]`)
- **i18n language toggle**: new `client/src/i18n/index.ts` (80+ EN→ZH entries, custom werewolf terminology confirmed by user); new `client/src/context/LanguageContext.tsx` (React context, `useLang()` hook, localStorage persistence); toggle button (中文/EN) in AppLayout header and HomePage
- **i18n applied** across all pages: AppLayout, HomePage, MyProfilePage (incl. SkillBadge, credit rank label, Report button), MyEventsPage, GameSpacePage, GameMapPage, VenueDetailPage (incl. EventsDrawer, BookingModal)
- **Bug fix**: `QuitConfirmModal` in MyEventsPage had `useLang()` called after `if (!event) return null` — violated React Rules of Hooks, caused white screen on load; moved hook call before early return
- **Bug fix**: `LanguageContext.tsx` used `import { Lang }` but `Lang` is a type-only export — caused Vite ESM runtime error; fixed with `import type { Lang }`

**Backend changes (complete):**
- **`PlayerSpaceService.ts`**: fixed `exactOptionalPropertyTypes` TS2375 compile error; `area`, `openingHours`, `maxPax` now use conditional spread (`...(x !== undefined ? { field: x } : {})`) instead of direct assignment to optional DTO properties

**No new backend schema changes this session.**

---

## 2026-04-30 — Session 5: Credit Tiers, Approval Flow, Chinese→English

**Frontend changes (complete):**
- **Chinese → English**: Replaced all Chinese text/comments in `game.service.ts`, `MyProfilePage.tsx`, `MyEventsPage.tsx`, `mockDB.ts`; removed `高手` label in types, fixed inline comments
- **Credit tier system** (`types/index.ts`): Expanded from 4 tiers to 7 — Flagged / Recruit / Trusted / Reliable / Tactician / Elite / Grandmaster; each tier now has distinct premium color, widget border color (`borderClass`), and progress bar color (`barColor`); `getUsernameColor()` now returns the tier's color for all users (not just admin/flagged)
- **Credit widget redesign** (`MyProfilePage.tsx`): Changed from full-width row to compact `inline-flex` pill with tier-colored border (`border-{color}/40`), score number + vertical divider + rank label + progress bar; much narrower; flagged warning moved below box
- **Event booking state** (`types/index.ts`, `mockDB.ts`, `MyEventsPage.tsx`): Added `venueApprovalStatus: 'confirmed' | 'pending'` to `GameSession`; all open MOCK_GAMES populated (g1 = confirmed since host=owner; g2/g6/g7/g8/g9 = pending); upcoming event cards show a green "Venue Confirmed" or amber "Pending Space Approval" chip
- **Space pending approvals** (`types/index.ts`, `game.service.mock.ts`, `GameSpacePage.tsx`, `VenueDetailPage.tsx`):
  - Added `pendingApplicationsCount?: number` to `GameVenueDTO`; mock service computes it from MOCK_GAMES
  - `GameSpacePage.tsx`: "My Space" cards show animated red "N Pending" badge when there are unapproved applications
  - `VenueDetailPage.tsx`: Owners see a "Pending Approvals" section (amber border) listing events awaiting approval with Approve (green) / Reject (red) buttons; approve sets `venueApprovalStatus = 'confirmed'`; reject removes from list

**No backend changes this session.**

---

## 2026-04-30 — Session 3: Profile Page Modals, Workflow Setup

**Frontend changes (complete):**
- `MyProfilePage.tsx`: all three content sections are now clickable
  - **Match History row** → `MatchDetailModal`: shows date/time, venue+address, host, player count, proficiency badge, your attendance status + punctuality badge, your star rating, total likes
  - **Following user** → `UserDetailModal`: avatar, username (gold if web_admin), credit badge+score, bio, followers/following/skill stats
  - **Saved Place card** → `PlaceDetailModal`: hero image, name+verified badge, address, rating, opening hours, price pill, maxPax, description, amenities; footer: Directions + "Host Event Here" (opens CreateEventModal pre-filled with that venue)
- All three list items have `ChevronRight` hint to indicate clickability
- `CreateEventModal.tsx`: accepts `defaultVenueId?: string` prop — pre-selects venue when opened from PlaceDetailModal
- Created `BACKLOG.md` at project root (language selector, mobile view, admin console, etc.)
- Memory: "Always output in English" rule saved; dev log workflow confirmed

**No backend changes this session.**

---

## 2026-04-30 — Session 1: UI, Venue Rename, Ownership, Search, Subscribe

**Frontend changes (complete):**
- Renamed "Game Venue" → "Game Spaces" throughout
- Verified badge (BadgeCheck, green) after venue name in cards + hero
- Price badge moved to card footer (aligned with likes)
- VenueSpaceType: `boardgame_store | house | work | school | other` + labels + default privacy per type
- VenuePrivacy: `public | approximate | private` — `getDisplayAddress()` helper
- `getVenuePermissions()`, `getSessionPermissions()` exported from types (never stored in state)
- GameSpacePage: search wired (name/address/area/type/amenities), My Spaces section (owner filtered), AddSlotCard dashed placeholder up to MAX=3, Add Space counter button
- VenueDetailPage: EditSpaceModal (full rewrite — type selector, privacy toggle, area field, hours, pricing model), `handleSaveEdit` optimistic + revert, `handleSubscribe` + bell toggle in right-column
- Subscribe button (Bell/BellOff) added: GameSpacePage card footer, VenueDetailPage action card, GameMapPage venue popup (wired) + event popup (UI state)
- Debug panel: WolfDenOwner (u16), debug users updated

**Backend changes needed (batch later):**
- PlayerSpaceSchema: add `privacy`, `area`, `openingHours`, `maxPax`, `price_type`
- PlayerSpaceDTOs: CreateSchema + UpdateSchema with new fields
- PlayerSpaceService: `toVenueDTO()` maps new fields; `updateVenue()` with owner check
- Routes: `PATCH /venues/:id` requireAuth + validate

---

## 2026-04-30 — Session 2: Credit System, Quit Event, Admin Gold Name

**Frontend changes (complete):**
- `types/index.ts`: `CreditRank` type, `getCreditInfo(score)`, `getUsernameColor(user)`, `web_admin` role added to `User.role`, `creditScore?: number` on User
- `mockDB.ts`: creditScore added to all 17 users (u14 JesterJack = 96, flagged); u17 Wen037 added as `web_admin`
- `AppLayout.tsx`: debug panel updated with 7 users incl. Wen037; `loginAs` stores `creditScore`; header username uses `getUsernameColor()`
- `MyEventsPage.tsx`: `QuitConfirmModal` — shows hours until event, credit before→after, rank drop warning, late penalty label; quit icon (LogOut, grey) in top-right icon row alongside Report/Like; full-width quit button removed from footer
- `MyProfilePage.tsx`: credit score widget (score, rank badge, progress bar, next-rank distance, flagged warning); username uses `getUsernameColor()`; Following list shows rank + score per user + ⚠ Caution chip for flagged users
- `game.service.mock.ts`: `adjustCredit()` mock
- `game.service.real.ts`: `adjustCredit()` → `PATCH /admin/users/:id/credit`

**Backend changes needed (batch later):**
- `UserSchema.ts`: add `role: 'player'|'admin'|'web_admin'` (default 'player'), `creditScore: Number` (default 100)
- `UserDTOs.ts`: `UserResponseDTO.role` → union incl. `web_admin`; add `creditScore: number`
- `UserService.ts`: `toUserResponseDTO()` maps `role` and `creditScore`
- `MatchService.ts` `leaveMatch()`: deduct `creditScore -= 1` if `hoursUntilMatch < 24`
- `MatchService.ts` `logAttendance()`: `creditScore += 1` when `status === 'attended'`
- `userRoutes.ts`: `PATCH /admin/users/:id/credit` — admin/web_admin only, body `{ delta: N }`

---

## Backend Change List (to batch-apply when ready)

### UserSchema
```
role: { type: String, enum: ['player','admin','web_admin'], default: 'player' }
creditScore: { type: Number, default: 100 }
```

### UserDTOs — UserResponseDTO
```
role: 'player' | 'admin' | 'web_admin'
creditScore: number
```

### UserService — toUserResponseDTO()
```
role: doc.role ?? 'player'
creditScore: doc.creditScore ?? 100
```

### MatchService — leaveMatch()
```typescript
const hoursUntil = (doc.scheduledAt.getTime() - Date.now()) / 3_600_000;
if (hoursUntil > 0 && hoursUntil < 24) {
  await UserModel.findByIdAndUpdate(userId, { $inc: { creditScore: -1 } });
}
```

### MatchService — logAttendance()
```typescript
// in the 'attended' branch:
const inc = { eventsAttended: 1, creditScore: 1 };
```

### userRoutes.ts — new endpoint
```
PATCH /admin/users/:id/credit   requireAuth, admin/web_admin only
body: { delta: number }
response: { userId, creditScore }
```

### PlayerSpaceSchema
```
privacy: { type: String, enum: ['public','approximate','private'], default: 'public' }
area: { type: String }
openingHours: { type: String }
maxPax: { type: Number }
financials.price_type: { type: String, enum: ['per_person','per_session'] }
```

### PlayerSpaceService — updateVenue()
```typescript
// owner check: venue.owner_id.toString() !== userId → 403
// field-level $set patch with all new fields
```

### Routes
```
PATCH /venues/:id   requireAuth, validate(UpdatePlayerSpaceSchema)
```
