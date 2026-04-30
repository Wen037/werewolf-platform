# Werewolf SG — Feature Backlog
> Items not yet started. Prioritise by impact when ready.

## UX / Internationalisation
- [x] **Language selector** — EN/ZH toggle implemented; custom i18n context (`LanguageContext.tsx`) + flat translation dict (`i18n/index.ts`); toggle button in AppLayout header and HomePage; all pages (Profile, Events, Spaces, Map, VenueDetail) fully translated; persists to localStorage
- [ ] **Mobile view** — current layout is desktop-first; needs responsive breakpoints, bottom-nav bar on mobile, touch-friendly tap targets; consider Tailwind `sm:` / `md:` refactor pass

## Platform Features
- [ ] **Admin console** — lightweight `/admin` route (web_admin only) for adjusting user credit, editing any space/event, viewing flagged users; currently done via curl to `PATCH /admin/users/:id/credit`
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
