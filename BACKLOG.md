# Werewolf SG — Feature Backlog
> Items not yet started. Prioritise by impact when ready.

## UX / Internationalisation
- [x] **Language selector** — EN/ZH toggle (button label now CN/EN); full i18n context + dict; all pages translated; persists to localStorage; EditSpaceModal all hint strings wired
- [x] **Credit score privacy** — numeric score hidden from Following list; only colored rank label shown as visual range indicator
- [x] **Match history badges** — relabeled: Completed / Left Early (was On Time / Late); ZH: 完成 / 提前退出
- [ ] **Mobile view** — current layout is desktop-first; needs responsive breakpoints, bottom-nav bar on mobile, touch-friendly tap targets; consider Tailwind `sm:` / `md:` refactor pass

## Platform Features
- [ ] **Admin console** — lightweight `/admin` route (web_admin only) for adjusting user credit, editing any space/event, viewing flagged users; currently done via curl to `PATCH /admin/users/:id/credit`
- [x] **Host Control Panel** — sliding drawer on HOST event cards (shield icon); Roster tab (player list, search, message, kick with reason −0.5 credit, guests, waitlist); Manage tab (entry mode: Open/Approval/Invite-Only; session status: Open/Playing/Finished); Attendance tab (per-player attended/no-show); Danger tab (cancel with confirm)
- [x] **Edit Event (Info tab)** — moved from standalone modal into HostControlPanel Info tab (first tab, default); host edits title, date/time, max players, proficiency, description, social group link + QR; saves + notifies registered players; single Shield icon replaces old Pencil + Shield pair
- [x] **Social group link** — host sets platform (Telegram/WhatsApp/WeChat/Facebook) + invite link in Info tab; live QR preview; joined players see colored "Host's Group" button + QR on their event card
- [x] **Event entry mode** — default is now `approval`; host can switch to Open / Invite Only in Manage tab; invite-only events hidden from public map/venue listings (non-hosts), still visible to host in MyEvents
- [x] **Event invite / guest system** — host adds non-registered guests by name in Roster tab; player count in parent card updates immediately on add/remove
- [x] **Kick with reason** — host searches player, opens kick panel, types reason (required), confirms; deducts −0.5 credit; player count updates in parent card
- [x] **Message player** — host opens message panel per player; composes and sends private message (mock: console logged)
- [x] **Approval queue UI** — Roster tab shows "Awaiting Approval" section for `approvalMode: 'approval'`; Accept / Decline per applicant; amber badge on tab shows pending count; `SessionInteraction.status: 'pending'` added; `approveApplicant` / `rejectApplicant` mock + real stubs added
- [x] **Cancel credit penalty** — host credit deducted on event cancel: 0–2 registered players → 0, 3–4 → −0.5, 5–8 → −1, 9+ → −1.5; penalty shown in confirmation dialog
- [ ] **Notification system** — email/Telegram alerts for event reminders, waitlist promotions; backend NotificationService scaffolded but channels not fully wired
- [ ] **Public user profile page** — view another user's profile (games, credit rank, follow button); currently only self-profile exists
- [ ] **Event search / discovery** — filter lobby by date, proficiency, venue, price; currently only venue search is implemented
- [ ] **Rating / review system for spaces** — star ratings persist per user per venue; currently mock only
- [ ] **Waitlist UX** — show waitlist position on My Events page; backend already tracks `waitlistPosition`

## Technical Debt
- [ ] **Batch backend update** — apply all frontend-defined schema changes (UserSchema + creditScore/role, MatchService credit logic, PlayerSpaceSchema new fields, PATCH /venues/:id, venueApprovalStatus on MatchSchema, approvalMode + groupLink/groupType + guests on MatchSchema); see DEVLOG.md "Backend Change List"
- [ ] **New backend endpoints** — `GET /games/:id/roster` (include pending status), `DELETE /games/:id/players/:userId` (kick −0.5 credit), `POST /games/:id/guests`, `DELETE /games/:id/guests/:index`, `POST /games/:id/message`, `POST /games/:id/notify`, `PATCH /games/:id` (full session update + approvalMode), `PATCH /games/:id/applicants/:userId/approve`, `PATCH /games/:id/applicants/:userId/reject`; cancel endpoint should apply tiered credit penalty to host
- [ ] **Real authentication flow** — replace debug localStorage login with actual register/login/OTP flow in the UI
- [ ] **Space approval backend** — `PATCH /sessions/:id/approve` and `/reject` endpoints; `venueApprovalStatus` field on MatchSchema; notify host on decision
