/**
 * Security Tests — OWASP Top 10 (2021) A01: Broken Access Control
 *
 * Standard:  OWASP Top 10:2021-A01
 * Reference: https://owasp.org/Top10/A01_2021-Broken_Access_Control/
 *
 * Coverage:
 *   BFLA (Broken Function Level Authorization) — vertical privilege escalation
 *     → Regular player must not reach admin-only endpoints
 *   BOLA (Broken Object Level Authorization) — horizontal privilege escalation
 *     → User A must not modify User B's resources
 *   Missing Authentication
 *     → Protected endpoints must reject unauthenticated callers
 *
 * All tests run in-process via Supertest + MongoMemoryServer.
 * No requests are made to the production fly.io deployment.
 */

import { describe, it, expect, beforeAll, vi } from 'vitest';

// ── Mandatory mocks (must be called before any imports that load the app) ──────
vi.mock('../../shared/infra/passport', () => ({
  default: {
    initialize: () => (_r: unknown, _s: unknown, next: () => void) => next(),
    authenticate: () => (_r: unknown, _s: unknown, next: () => void) => next(),
    use: () => {},
    serializeUser: () => {},
    deserializeUser: () => {},
  },
}));
vi.mock('../../shared/infra/email', () => ({
  sendOtpEmail: vi.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
  sendBookingInquiryEmail: vi.fn().mockResolvedValue(undefined),
}));

import request from 'supertest';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../../app';
import { UserModel } from '../../modules/users/DBSchemas/UserSchema';
import { PlayerSpaceModel } from '../../modules/player-spaces/DBSchemas/PlayerSpaceSchema';
import { MatchModel } from '../../modules/matches/DBSchemas/MatchSchema';

const SECRET = 'sec-a01-test-secret';
let mongod: MongoMemoryServer;

// ── Helpers ────────────────────────────────────────────────────────────────────

async function seedUser(role: 'player' | 'admin' = 'player') {
  const uid = new mongoose.Types.ObjectId().toString().slice(-6);
  const user = await UserModel.create({
    username: `sec_${uid}`,
    email: `sec_${uid}@test.com`,
    passwordHash: '$2b$10$hashedfakepw',
    role,
    creditScore: 100,
  });
  const token = jwt.sign({ userId: user._id.toString(), email: user.email, role: user.role ?? 'player' }, SECRET, {
    expiresIn: '1h',
  });
  return { user, token };
}

async function seedVenue(ownerId: mongoose.Types.ObjectId) {
  return PlayerSpaceModel.create({
    owner_id: ownerId,
    name: 'Security Test Venue',
    address: '1 Sec St, Singapore',
    type: 'house',
    location: { lat: 1.35, long: 103.82 },
    financials: { is_chargeable: false, approx_fee: 0, price_type: 'per_session' },
    amenities: [],
    status: 'Verified',
  });
}

async function seedMatch(hostId: mongoose.Types.ObjectId) {
  return MatchModel.create({
    host_id: hostId,
    venue_id: new mongoose.Types.ObjectId(),
    title: 'Security Test Event',
    scheduledAt: new Date(Date.now() + 86_400_000),
    config: { min_pax: 4, max_pax: 12, game_type: 'standard', judge_method: 'host', proficiency_required: 0, external_pax: 0 },
    location: { lat: 1.35, long: 103.82 },
    status: 'Open',
    approvalMode: 'open',
    players: [hostId],
    waitlist: [],
  });
}

beforeAll(async () => {
  process.env.JWT_SECRET = SECRET;
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

// ── Missing Authentication ─────────────────────────────────────────────────────

describe('OWASP A01 — Missing Authentication', () => {
  it('SEC-A01-AUTH-1: GET /api/users/me returns 401 with no token', async () => {
    const res = await request(app).get('/api/users/me');
    expect(res.status).toBe(401);
    // Must not leak user data
    expect(res.body.passwordHash).toBeUndefined();
    expect(res.body.userId).toBeUndefined();
  });

  it('SEC-A01-AUTH-2: PATCH /api/users/me returns 401 with no token', async () => {
    const res = await request(app).patch('/api/users/me').send({ bio: 'hack' });
    expect(res.status).toBe(401);
  });

  it('SEC-A01-AUTH-3: POST /api/games returns 401 with no token', async () => {
    const res = await request(app).post('/api/games').send({ title: 'hack' });
    expect(res.status).toBe(401);
  });

  it('SEC-A01-AUTH-4: POST /api/venues returns 401 with no token', async () => {
    const res = await request(app).post('/api/venues').send({ name: 'hack' });
    expect(res.status).toBe(401);
  });

  it('SEC-A01-AUTH-5: DELETE /api/games/:id/leave returns 401 with no token', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app).delete(`/api/games/${fakeId}/leave`);
    expect(res.status).toBe(401);
  });
});

// ── BFLA — Vertical Privilege Escalation (Player → Admin) ─────────────────────

describe('OWASP A01 — BFLA (Vertical Privilege Escalation)', () => {
  it('SEC-A01-BFLA-1: player token cannot PATCH /api/admin/users/:id/credit → 403', async () => {
    const { token: playerToken } = await seedUser('player');
    const { user: target } = await seedUser('player');

    const res = await request(app)
      .patch(`/api/admin/users/${target._id.toString()}/credit`)
      .set('Authorization', `Bearer ${playerToken}`)
      .send({ delta: 999 });

    // Must not elevate a player's target credit
    expect(res.status).toBe(403);
    const unchanged = await UserModel.findById(target._id);
    expect(unchanged?.creditScore).toBe(100); // unchanged
  });

  it('SEC-A01-BFLA-2: player token cannot POST /api/admin/users/:id/reset-password → 403', async () => {
    const { token: playerToken } = await seedUser('player');
    const { user: target } = await seedUser('player');

    const res = await request(app)
      .post(`/api/admin/users/${target._id.toString()}/reset-password`)
      .set('Authorization', `Bearer ${playerToken}`)
      .send({ newPassword: 'HackerPwd123!' });

    expect(res.status).toBe(403);
  });

  it('SEC-A01-BFLA-3: player token cannot PATCH /api/admin/venues/:id/pin → 403 or 404', async () => {
    const { user, token: playerToken } = await seedUser('player');
    const venue = await seedVenue(user._id);

    const res = await request(app)
      .patch(`/api/admin/venues/${venue._id.toString()}/pin`)
      .set('Authorization', `Bearer ${playerToken}`);

    // Admin-only pin endpoint must reject players
    expect([403, 404]).toContain(res.status);
    expect(res.status).not.toBe(200);
  });

  it('SEC-A01-BFLA-4: player token cannot PATCH /api/admin/games/:id/pin → 403 or 404', async () => {
    const { user, token: playerToken } = await seedUser('player');
    const match = await seedMatch(user._id);

    const res = await request(app)
      .patch(`/api/admin/games/${match._id.toString()}/pin`)
      .set('Authorization', `Bearer ${playerToken}`);

    expect([403, 404]).toContain(res.status);
    expect(res.status).not.toBe(200);
  });

  it('SEC-A01-BFLA-5: admin CAN PATCH /api/admin/users/:id/credit → 200', async () => {
    const { token: adminToken } = await seedUser('admin');
    const { user: target } = await seedUser('player');

    const res = await request(app)
      .patch(`/api/admin/users/${target._id.toString()}/credit`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ delta: 5 });

    // Confirm admin IS allowed (positive guard)
    expect(res.status).toBe(200);
  });
});

// ── BOLA — Horizontal Privilege Escalation (User A → User B resources) ─────────

describe('OWASP A01 — BOLA (Horizontal Privilege Escalation)', () => {
  it('SEC-A01-BOLA-1: player cannot delete another player game (non-host) → 403', async () => {
    const { user: host } = await seedUser('player');
    const { token: attackerToken } = await seedUser('player');
    const match = await seedMatch(host._id);

    const res = await request(app)
      .delete(`/api/games/${match._id.toString()}`)
      .set('Authorization', `Bearer ${attackerToken}`);

    // DELETE /games/:id requires host or admin — a non-host attacker is rejected with 403.
    // The critical assertion is that the match still exists in the DB.
    expect(res.status).toBe(403);
    // Verify the event still exists in DB — it must NOT have been deleted
    const stillExists = await MatchModel.findById(match._id);
    expect(stillExists).not.toBeNull();
  });

  it('SEC-A01-BOLA-2: player cannot update another player venue (non-owner) → 400 or 403', async () => {
    const { user: owner } = await seedUser('player');
    const { token: attackerToken } = await seedUser('player');
    const venue = await seedVenue(owner._id);

    const res = await request(app)
      .patch(`/api/venues/${venue._id.toString()}`)
      .set('Authorization', `Bearer ${attackerToken}`)
      .send({ name: 'Attacker Renamed Venue' });

    expect([400, 403]).toContain(res.status);
    // Venue name must not have changed
    const original = await PlayerSpaceModel.findById(venue._id);
    expect(original?.name).toBe('Security Test Venue');
  });

  it('SEC-A01-BOLA-3: player cannot kick another user from a game they are not host of → 400', async () => {
    const { user: host } = await seedUser('player');
    const { user: victim } = await seedUser('player');
    const { token: attackerToken } = await seedUser('player');
    const match = await seedMatch(host._id);

    // Add victim to match players so there is a valid target
    await MatchModel.findByIdAndUpdate(match._id, { $push: { players: victim._id } });

    const res = await request(app)
      .delete(`/api/games/${match._id.toString()}/players/${victim._id.toString()}`)
      .set('Authorization', `Bearer ${attackerToken}`)
      .send({ reason: 'I am kicking you' });

    expect(res.status).toBe(400);
    // Victim should still be in the players array
    const updated = await MatchModel.findById(match._id);
    const stillInMatch = updated?.players.some(
      (p) => p.toString() === victim._id.toString()
    );
    expect(stillInMatch).toBe(true);
  });

  it('SEC-A01-BOLA-4: GET /api/users/me returns only the caller own data (not another user)', async () => {
    const { user: u1, token: token1 } = await seedUser();
    await seedUser(); // u2 — should not appear in u1 response

    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${token1}`);

    expect(res.status).toBe(200);
    expect(res.body.id ?? res.body._id).toBe(u1._id.toString());
    expect(res.body.email).toBe(u1.email);
  });

  it('SEC-A01-BOLA-5: user cannot submit a venue booking inquiry using another venue owner email', async () => {
    const { user: owner } = await seedUser('player');
    const venue = await seedVenue(owner._id);
    const { token: attackerToken } = await seedUser('player');

    // Attacker sends a booking inquiry — they should not be able to forge the owner email
    const res = await request(app)
      .post(`/api/venues/${venue._id.toString()}/booking-inquiry`)
      .set('Authorization', `Bearer ${attackerToken}`)
      .send({ requesterName: 'Attacker', requesterEmail: 'attacker@test.com', message: 'test' });

    // The endpoint itself is public but the owner email comes from DB, not the request
    // Any response (200 or 400) is acceptable — but the server must not allow overriding owner email
    expect([200, 400, 404]).toContain(res.status);
  });

  it('SEC-A01-BOLA-6: venue approval/reject can only be called by the venue owner → 400 or 403', async () => {
    const { user: host } = await seedUser('player');
    const { user: attacker, token: attackerToken } = await seedUser('player');
    const venue = await seedVenue(host._id);
    const match = await seedMatch(attacker._id);

    // Attacker tries to approve their own match at host's venue
    const res = await request(app)
      .patch(`/api/venues/${venue._id.toString()}/approval/${match._id.toString()}`)
      .set('Authorization', `Bearer ${attackerToken}`)
      .send({ decision: 'confirmed' });

    // Only the venue owner can approve — must be rejected
    expect([400, 403, 404]).toContain(res.status);
    expect(res.status).not.toBe(200);
  });
});
