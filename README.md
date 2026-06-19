# Werewolf SG

Find & host in-person Werewolf game nights in Singapore. Browse open game events, discover venues (board game cafés, homes, schools, offices), and meet local players — offline gathering only.

🔗 [werewolf.sg](https://werewolf.sg)

## Features

- **Discover & join games** — browse open sessions on a map or list, filter by proficiency level, date, and availability
- **Host control panel** — manage roster, approve/decline join requests, invite players, kick with reason, message attendees, mark attendance, cancel with tiered credit penalty
- **Game spaces (venues)** — list a venue, owner approval flow for bookings, ratings, comments, photo carousel, social contact links
- **Credit / reputation system** — 7-tier rank (Flagged → Grandmaster) based on attendance and punctuality
- **Recurring events** — weekly / biweekly / monthly auto-created occurrences
- **Comments, recap, sharing** — event Q&A, post-event recap, calendar export, share links
- **Notifications** — in-app + email (24h reminder, approvals, invites)
- **EN / 中文** — full i18n with persisted language preference
- **Google OAuth + OTP email login**

## Tech stack

| | |
|---|---|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS v4, React Router, Framer Motion, Leaflet / Google Maps |
| **Backend** | Node.js, Express 5, TypeScript, MongoDB + Mongoose, JWT auth, Passport (Google OAuth) |
| **Testing** | Vitest (unit/integration, 580+ tests), Playwright (E2E) |
| **Infra** | Fly.io (API), Cloudflare Pages (frontend), Resend (email), Cloudinary (image uploads) |

## Project structure

```
client/   React frontend (Vite)
server/   Express + MongoDB backend (modular: users, matches, player-spaces, notifications, map)
docs/     Test standards & planning docs
```

## Getting started

### Prerequisites
- Node.js ≥ 20
- MongoDB (local via `docker-compose up`, or a connection string)

### Setup

```bash
git clone https://github.com/Wen037/werewolf-platform.git
cd werewolf-platform
npm install                 # root: installs concurrently
cd server && npm install && cd ..
cd client && npm install && cd ..
```

Create `server/.env` (see `server/src/server.ts` for required keys — at minimum `MONGO_URI`, `JWT_SECRET`).

### Run locally

```bash
npm run dev          # runs server (nodemon) + client (vite) concurrently
```

Or individually:

```bash
npm run server       # backend on its configured port
npm run client       # frontend on http://localhost:5173
```

### Testing

```bash
cd server && npm test          # Vitest unit + integration suite
cd client && npm run test:e2e  # Playwright E2E
```

## License

Apache License 2.0 — see [LICENSE](LICENSE).
