# Werewolf SG — Feature Backlog
> Items not yet started. Prioritise by impact when ready.

## UX / Internationalisation
- [x] **Language selector** — EN/ZH toggle (button label now CN/EN); full i18n context + dict; all pages translated; persists to localStorage; EditSpaceModal all hint strings wired
- [x] **Credit score privacy** — numeric score hidden from Following list; only colored rank label shown as visual range indicator
- [x] **Match history badges** — relabeled: Completed / Left Early (was On Time / Late); ZH: 完成 / 提前退出
- [ ] **Mobile view** — current layout is desktop-first; needs responsive breakpoints, bottom-nav bar on mobile, touch-friendly tap targets; consider Tailwind `sm:` / `md:` refactor pass

## Platform Features
- [ ] **Admin console** — lightweight `/admin` route (web_admin only) for adjusting user credit, editing any space/event, viewing flagged users; currently done via curl to `PATCH /admin/users/:id/credit`
- [ ] **Host Control Panel** — drawer on event card (host-only); tabs: Info (edit title/desc/social link), Roster (players list + kick + add guest + waitlist), Settings (min/max pax, approval mode, proficiency), Close Out (mark done → per-player attendance sheet), Danger (cancel event); backend endpoints all exist (`PATCH /status`, `/attendance`, `/external-pax`); missing: `approvalMode` field, social group link field, all frontend UI
- [ ] **Event invite / guest system** — host can add non-registered guests by name; backend schema (`guests[]`) already added to MatchSchema; frontend not built yet
- [ ] **Notification system** — email/Telegram alerts for event reminders, waitlist promotions; backend NotificationService scaffolded but channels not fully wired
- [ ] **Public user profile page** — view another user's profile (games, credit rank, follow button); currently only self-profile exists
- [ ] **Event search / discovery** — filter lobby by date, proficiency, venue, price; currently only venue search is implemented
- [ ] **Rating / review system for spaces** — star ratings persist per user per venue; currently mock only
- [ ] **Waitlist UX** — show waitlist position on My Events page; backend already tracks `waitlistPosition`

## Technical Debt
- [ ] **Batch backend update** — apply all frontend-defined schema changes (UserSchema + creditScore/role, MatchService credit logic, PlayerSpaceSchema new fields, PATCH /venues/:id, venueApprovalStatus on MatchSchema); see DEVLOG.md "Backend Change List"
- [ ] **Real authentication flow** — replace debug localStorage login with actual register/login/OTP flow in the UI
- [ ] **Space approval backend** — `PATCH /sessions/:id/approve` and `/reject` endpoints; `venueApprovalStatus` field on MatchSchema; notify host on decision
