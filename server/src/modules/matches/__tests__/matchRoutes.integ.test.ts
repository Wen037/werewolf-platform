/**
 * HTTP-layer integration tests for match routes.
 * Uses supertest against the Express app with an in-memory MongoDB instance.
 * JWTs are generated using the same JWT_SECRET as the app.
 */

import { describe, it, expect, beforeAll, vi } from 'vitest';

// Mock passport's Google OAuth strategy before app.ts loads it.
// passport.ts reads GOOGLE_CLIENT_ID at module-load time; without this mock,
// the OAuth2Strategy constructor throws if the env var is not set.
vi.mock('../../../shared/infra/passport', () => {
  // Return a minimal passport-like object so app.ts can call app.use(passport.initialize())
  const passport = {
    initialize: () => (_req: unknown, _res: unknown, next: () => void) => next(),
    authenticate: () => (_req: unknown, _res: unknown, next: () => void) => next(),
    use: () => {},
    serializeUser: () => {},
    deserializeUser: () => {},
  };
  return { default: passport };
});

// Suppress external email calls
vi.mock('../../../shared/infra/email', () => ({
  sendOtpEmail: vi.fn().mockResolvedValue(undefined),
}));

import request from 'supertest';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../../../app';
import { UserModel } from '../../users/DBSchemas/UserSchema';
import { PlayerSpaceModel } from '../../player-spaces/DBSchemas/PlayerSpaceSchema';
import { MatchModel } from '../DBSchemas/MatchSchema';
import { SessionInteractionModel } from '../DBSchemas/SessionInteractionSchema';

const SECRET = 'route-test-secret';

let mongod: MongoMemoryServer;

beforeAll(async () => {
  process.env.JWT_SECRET = SECRET;

  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

// Helper: create a user in DB and return a signed JWT for them
async function seedUser(role: 'player' | 'admin' = 'player', creditScore = 100) {
  const uid = new mongoose.Types.ObjectId().toString().slice(-6);
  const user = await UserModel.create({
    username: `route_user_${uid}`,
    email: `route_user_${uid}@test.com`,
    passwordHash: '$2b$10$hashedfakepw',
    role,
    creditScore,
  });
  const token = jwt.sign({ userId: user._id.toString(), email: user.email, role: user.role ?? 'player' }, SECRET, { expiresIn: '1h' });
  return { user, token };
}

// Helper: create a venue owned by user
async function seedVenue(ownerId: string) {
  return PlayerSpaceModel.create({
    owner_id: new mongoose.Types.ObjectId(ownerId),
    name: 'Route Test Venue',
    address: '1 Route Street, Singapore',
    type: 'house',
    location: { lat: 1.3521, long: 103.8198 },
    geoLocation: { type: 'Point', coordinates: [103.8198, 1.3521] },
    financials: { is_chargeable: false, approx_fee: 0, price_type: 'per_session' },
    amenities: [],
    status: 'unVerified',
  });
}

// Helper: create a match directly in DB
async function seedMatch(hostId: string, venueId: string, status = 'Open', approvalMode = 'open') {
  const playerIds = [new mongoose.Types.ObjectId(hostId)];
  const match = await MatchModel.create({
    host_id: new mongoose.Types.ObjectId(hostId),
    venue_id: new mongoose.Types.ObjectId(venueId),
    title: 'Route Test Match',
    scheduledAt: new Date(Date.now() + 86_400_000),
    config: { min_pax: 4, max_pax: 12, game_type: 'standard', judge_method: 'host', proficiency_required: 0, external_pax: 0 },
    location: { lat: 1.3521, long: 103.8198 },
    geoLocation: { type: 'Point', coordinates: [103.8198, 1.3521] },
    status,
    approvalMode,
    players: playerIds,
    waitlist: [],
  });
  await SessionInteractionModel.create({ userId: hostId, sessionId: match._id, status: 'registered' });
  return match;
}

// ─── POST /api/games ──────────────────────────────────────────────────────────

describe('POST /api/games', () => {
  it('returns 201 with correct shape when valid data provided', async () => {
    const { user, token } = await seedUser();
    const venue = await seedVenue(user._id.toString());

    const res = await request(app)
      .post('/api/games')
      .set('Authorization', `Bearer ${token}`)
      .send({
        venue_id: venue._id.toString(),
        title: 'HTTP Route Game',
        scheduledAt: new Date(Date.now() + 86_400_000).toISOString(),
        min_pax: 4,
        max_pax: 12,
      });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeTruthy();
    expect(res.body.currentPlayers).toBe(1);
    expect(res.body.title).toBe('HTTP Route Game');
  });

  it('returns 400 with errors.title when title is missing', async () => {
    const { user, token } = await seedUser();
    const venue = await seedVenue(user._id.toString());

    const res = await request(app)
      .post('/api/games')
      .set('Authorization', `Bearer ${token}`)
      .send({
        venue_id: venue._id.toString(),
        scheduledAt: new Date(Date.now() + 86_400_000).toISOString(),
        min_pax: 4,
        max_pax: 12,
      });

    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
  });

  it('returns 401 when no token provided', async () => {
    const res = await request(app).post('/api/games').send({
      venue_id: 'a'.repeat(24),
      title: 'No Auth',
      scheduledAt: new Date(Date.now() + 86_400_000).toISOString(),
      min_pax: 4,
      max_pax: 12,
    });

    expect(res.status).toBe(401);
  });
});

// ─── GET /api/games/active ─────────────────────────────────────────────────────

describe('GET /api/games/active', () => {
  it('returns 200 with an array (no auth required)', async () => {
    const res = await request(app).get('/api/games/active');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

// ─── GET /api/games/:id ───────────────────────────────────────────────────────

describe('GET /api/games/:id', () => {
  it('returns 200 with match detail for existing match', async () => {
    const { user } = await seedUser();
    const venue = await seedVenue(user._id.toString());
    const match = await seedMatch(user._id.toString(), venue._id.toString());

    const res = await request(app).get(`/api/games/${match._id.toString()}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(match._id.toString());
  });

  it('returns 404 for non-existent match', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app).get(`/api/games/${fakeId}`);
    expect(res.status).toBe(404);
  });
});

// ─── POST /api/games/:id/join ─────────────────────────────────────────────────

describe('POST /api/games/:id/join', () => {
  it('returns 200 when player joins an open match', async () => {
    const { user: host } = await seedUser();
    const { user: player, token: playerToken } = await seedUser();
    const venue = await seedVenue(host._id.toString());
    const match = await seedMatch(host._id.toString(), venue._id.toString(), 'Open', 'open');

    const res = await request(app)
      .post(`/api/games/${match._id.toString()}/join`)
      .set('Authorization', `Bearer ${playerToken}`);

    expect(res.status).toBe(200);
    expect(typeof res.body.wasWaitlisted).toBe('boolean');
    // suppress unused variable warning
    void player;
  });

  it('returns 400 when joining a Cancelled match', async () => {
    const { user: host } = await seedUser();
    const { token: playerToken } = await seedUser();
    const venue = await seedVenue(host._id.toString());
    const match = await seedMatch(host._id.toString(), venue._id.toString(), 'Cancelled', 'open');

    const res = await request(app)
      .post(`/api/games/${match._id.toString()}/join`)
      .set('Authorization', `Bearer ${playerToken}`);

    expect(res.status).toBe(400);
  });
});

// ─── DELETE /api/games/:id/leave ─────────────────────────────────────────────

describe('DELETE /api/games/:id/leave', () => {
  it('returns 200 when registered player leaves a match', async () => {
    const { user: host } = await seedUser();
    const { user: player, token: playerToken } = await seedUser();
    const venue = await seedVenue(host._id.toString());
    // Seed match with player already in it
    const match = await seedMatch(host._id.toString(), venue._id.toString(), 'Open', 'open');
    await MatchModel.findByIdAndUpdate(match._id, { $push: { players: new mongoose.Types.ObjectId(player._id.toString()) } });
    await SessionInteractionModel.create({ userId: player._id.toString(), sessionId: match._id, status: 'registered' });

    const res = await request(app)
      .delete(`/api/games/${match._id.toString()}/leave`)
      .set('Authorization', `Bearer ${playerToken}`);

    expect(res.status).toBe(200);
  });
});

// ─── GET /api/games/:id/roster — RBAC ────────────────────────────────────────

describe('GET /api/games/:id/roster (RBAC)', () => {
  it('returns 403 when non-host requests the roster', async () => {
    const { user: host } = await seedUser();
    const { token: notHostToken } = await seedUser();
    const venue = await seedVenue(host._id.toString());
    const match = await seedMatch(host._id.toString(), venue._id.toString());

    const res = await request(app)
      .get(`/api/games/${match._id.toString()}/roster`)
      .set('Authorization', `Bearer ${notHostToken}`);

    expect(res.status).toBe(403);
  });

  it('returns 200 when the host requests the roster', async () => {
    const { user: host, token: hostToken } = await seedUser();
    const venue = await seedVenue(host._id.toString());
    const match = await seedMatch(host._id.toString(), venue._id.toString());

    const res = await request(app)
      .get(`/api/games/${match._id.toString()}/roster`)
      .set('Authorization', `Bearer ${hostToken}`);

    expect(res.status).toBe(200);
  });
});

// ─── DELETE /api/games/:id/players/:uid — RBAC ───────────────────────────────

describe('DELETE /api/games/:id/players/:uid (RBAC)', () => {
  it('returns 400 or 403 when non-host tries to kick a player', async () => {
    const { user: host } = await seedUser();
    const { user: victim } = await seedUser();
    const { token: notHostToken } = await seedUser();
    const venue = await seedVenue(host._id.toString());
    const match = await seedMatch(host._id.toString(), venue._id.toString());

    const res = await request(app)
      .delete(`/api/games/${match._id.toString()}/players/${victim._id.toString()}`)
      .set('Authorization', `Bearer ${notHostToken}`);

    expect([400, 403]).toContain(res.status);
  });
});
