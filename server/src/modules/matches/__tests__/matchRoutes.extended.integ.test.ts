/**
 * Extended HTTP-layer integration tests for match routes.
 * Covers endpoints not addressed in matchRoutes.integ.test.ts:
 *   PATCH /api/games/:id (update session)
 *   POST  /api/games/:id/rate
 *   POST  /api/games/:id/like
 *   PATCH /api/games/:id/status
 *   PATCH /api/games/:id/applicants/:uid/approve
 *   PATCH /api/games/:id/applicants/:uid/reject
 *   PATCH /api/games/:id/cancel
 *   PATCH /api/admin/games/:id/pin
 *   PATCH /api/games/:id/external-pax
 *   GET   /api/users/me/events
 *   POST  /api/games/:id/guests + DELETE
 */

import { describe, it, expect, beforeAll, vi } from 'vitest';

vi.mock('../../../shared/infra/passport', () => {
  const passport = {
    initialize: () => (_req: unknown, _res: unknown, next: () => void) => next(),
    authenticate: () => (_req: unknown, _res: unknown, next: () => void) => next(),
    use: () => {},
    serializeUser: () => {},
    deserializeUser: () => {},
  };
  return { default: passport };
});

vi.mock('../../../shared/infra/email', () => ({
  sendOtpEmail: vi.fn().mockResolvedValue(undefined),
  sendBookingInquiryEmail: vi.fn().mockResolvedValue(undefined),
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

const SECRET = 'match-ext-test-secret';

let mongod: MongoMemoryServer;

beforeAll(async () => {
  process.env.JWT_SECRET = SECRET;
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

// ─── Seed helpers ─────────────────────────────────────────────────────────────

async function seedUser(role: 'player' | 'admin' = 'player', creditScore = 100) {
  const uid = new mongoose.Types.ObjectId().toString().slice(-6);
  const user = await UserModel.create({
    username: `ext_${uid}`,
    email: `ext_${uid}@test.com`,
    passwordHash: '$2b$10$hashedfakepw',
    role,
    creditScore,
  });
  const token = jwt.sign({ userId: user._id.toString(), email: user.email, role: user.role ?? 'player' }, SECRET, { expiresIn: '1h' });
  return { user, token };
}

async function seedVenue(ownerId: string) {
  return PlayerSpaceModel.create({
    owner_id: new mongoose.Types.ObjectId(ownerId),
    name: 'Ext Route Venue',
    address: '1 Ext Street, Singapore',
    type: 'house',
    location: { lat: 1.3521, long: 103.8198 },
    geoLocation: { type: 'Point', coordinates: [103.8198, 1.3521] },
    financials: { is_chargeable: false, approx_fee: 0, price_type: 'per_session' },
    amenities: [],
    status: 'unVerified',
  });
}

async function seedMatch(hostId: string, venueId: string, overrides: Partial<{
  status: string;
  approvalMode: string;
  maxPax: number;
  minPax: number;
  scheduledOffsetMs: number;
  isPinned: boolean;
}> = {}) {
  const {
    status = 'Open',
    approvalMode = 'open',
    maxPax = 12,
    minPax = 4,
    scheduledOffsetMs = 86_400_000,
    isPinned = false,
  } = overrides;
  const match = await MatchModel.create({
    host_id: new mongoose.Types.ObjectId(hostId),
    venue_id: new mongoose.Types.ObjectId(venueId),
    title: 'Ext Route Match',
    scheduledAt: new Date(Date.now() + scheduledOffsetMs),
    config: { min_pax: minPax, max_pax: maxPax, game_type: 'standard', judge_method: 'host', proficiency_required: 0, external_pax: 0 },
    location: { lat: 1.3521, long: 103.8198 },
    geoLocation: { type: 'Point', coordinates: [103.8198, 1.3521] },
    status,
    approvalMode,
    players: [new mongoose.Types.ObjectId(hostId)],
    waitlist: [],
    isPinned,
  });
  await SessionInteractionModel.create({ userId: hostId, sessionId: match._id, status: 'registered' });
  return match;
}

async function addPlayerToMatch(matchId: string, playerId: string) {
  await MatchModel.findByIdAndUpdate(matchId, { $push: { players: new mongoose.Types.ObjectId(playerId) } });
  await SessionInteractionModel.findOneAndUpdate(
    { userId: playerId, sessionId: matchId },
    { $set: { status: 'registered' } },
    { upsert: true }
  );
}

// ─── PATCH /api/games/:id (update session) ────────────────────────────────────

describe('PATCH /api/games/:id (update session)', () => {
  it('MR-EXT-UPDATE-1: host can update title', async () => {
    const { user: host, token: hostToken } = await seedUser();
    const venue = await seedVenue(host._id.toString());
    const match = await seedMatch(host._id.toString(), venue._id.toString());

    const res = await request(app)
      .patch(`/api/games/${match._id.toString()}`)
      .set('Authorization', `Bearer ${hostToken}`)
      .send({ title: 'Updated Title' });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Updated Title');
  });

  it('MR-EXT-UPDATE-2: non-host gets 400 (service returns failure)', async () => {
    const { user: host } = await seedUser();
    const { token: otherToken } = await seedUser();
    const venue = await seedVenue(host._id.toString());
    const match = await seedMatch(host._id.toString(), venue._id.toString());

    const res = await request(app)
      .patch(`/api/games/${match._id.toString()}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ title: 'Hijacked' });

    expect(res.status).toBe(400);
  });

  it('MR-EXT-UPDATE-3: unauthenticated request gets 401', async () => {
    const { user: host } = await seedUser();
    const venue = await seedVenue(host._id.toString());
    const match = await seedMatch(host._id.toString(), venue._id.toString());

    const res = await request(app)
      .patch(`/api/games/${match._id.toString()}`)
      .send({ title: 'No Auth' });

    expect(res.status).toBe(401);
  });
});

// ─── POST /api/games/:id/like ─────────────────────────────────────────────────

describe('POST /api/games/:id/like', () => {
  it('MR-EXT-LIKE-1: first like returns isLiked=true', async () => {
    const { user: host } = await seedUser();
    const { user: liker, token: likerToken } = await seedUser();
    const venue = await seedVenue(host._id.toString());
    const match = await seedMatch(host._id.toString(), venue._id.toString());

    const res = await request(app)
      .post(`/api/games/${match._id.toString()}/like`)
      .set('Authorization', `Bearer ${likerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.isLiked).toBe(true);
    void liker;
  });

  it('MR-EXT-LIKE-2: second like (toggle) returns isLiked=false', async () => {
    const { user: host } = await seedUser();
    const { token: likerToken } = await seedUser();
    const venue = await seedVenue(host._id.toString());
    const match = await seedMatch(host._id.toString(), venue._id.toString());

    await request(app)
      .post(`/api/games/${match._id.toString()}/like`)
      .set('Authorization', `Bearer ${likerToken}`);
    const res = await request(app)
      .post(`/api/games/${match._id.toString()}/like`)
      .set('Authorization', `Bearer ${likerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.isLiked).toBe(false);
  });

  it('MR-EXT-LIKE-3: returns 401 without auth', async () => {
    const { user: host } = await seedUser();
    const venue = await seedVenue(host._id.toString());
    const match = await seedMatch(host._id.toString(), venue._id.toString());

    const res = await request(app).post(`/api/games/${match._id.toString()}/like`);
    expect(res.status).toBe(401);
  });
});

// ─── POST /api/games/:id/rate ─────────────────────────────────────────────────

describe('POST /api/games/:id/rate', () => {
  it('MR-EXT-RATE-1: registered player can rate a Completed match', async () => {
    const { user: host } = await seedUser();
    const { user: player, token: playerToken } = await seedUser();
    const venue = await seedVenue(host._id.toString());
    const match = await seedMatch(host._id.toString(), venue._id.toString(), { status: 'Completed' });
    await addPlayerToMatch(match._id.toString(), player._id.toString());

    const res = await request(app)
      .post(`/api/games/${match._id.toString()}/rate`)
      .set('Authorization', `Bearer ${playerToken}`)
      .send({ rating: 4 });

    expect(res.status).toBe(200);
  });

  it('MR-EXT-RATE-2: rating below 1 returns 400', async () => {
    const { user: host } = await seedUser();
    const { token: playerToken } = await seedUser();
    const venue = await seedVenue(host._id.toString());
    const match = await seedMatch(host._id.toString(), venue._id.toString(), { status: 'Completed' });

    const res = await request(app)
      .post(`/api/games/${match._id.toString()}/rate`)
      .set('Authorization', `Bearer ${playerToken}`)
      .send({ rating: 0 });

    expect(res.status).toBe(400);
  });

  it('MR-EXT-RATE-3: rating above 5 returns 400', async () => {
    const { user: host } = await seedUser();
    const { token: playerToken } = await seedUser();
    const venue = await seedVenue(host._id.toString());
    const match = await seedMatch(host._id.toString(), venue._id.toString(), { status: 'Completed' });

    const res = await request(app)
      .post(`/api/games/${match._id.toString()}/rate`)
      .set('Authorization', `Bearer ${playerToken}`)
      .send({ rating: 6 });

    expect(res.status).toBe(400);
  });

  it('MR-EXT-RATE-4: returns 401 without auth', async () => {
    const { user: host } = await seedUser();
    const venue = await seedVenue(host._id.toString());
    const match = await seedMatch(host._id.toString(), venue._id.toString(), { status: 'Completed' });

    const res = await request(app)
      .post(`/api/games/${match._id.toString()}/rate`)
      .send({ rating: 3 });

    expect(res.status).toBe(401);
  });
});

// ─── PATCH /api/games/:id/status ─────────────────────────────────────────────

describe('PATCH /api/games/:id/status', () => {
  it('MR-EXT-STATUS-1: host can transition Open → Started with enough players', async () => {
    const { user: host, token: hostToken } = await seedUser();
    const p1 = await seedUser();
    const p2 = await seedUser();
    const p3 = await seedUser();
    const venue = await seedVenue(host._id.toString());
    const match = await seedMatch(host._id.toString(), venue._id.toString(), { minPax: 4 });
    await addPlayerToMatch(match._id.toString(), p1.user._id.toString());
    await addPlayerToMatch(match._id.toString(), p2.user._id.toString());
    await addPlayerToMatch(match._id.toString(), p3.user._id.toString());

    const res = await request(app)
      .patch(`/api/games/${match._id.toString()}/status`)
      .set('Authorization', `Bearer ${hostToken}`)
      .send({ status: 'Started' });

    expect(res.status).toBe(200);
    // Route returns { message: 'Status updated.' }
    expect(res.body.message).toBeTruthy();
    const updated = await MatchModel.findById(match._id);
    expect(updated?.status).toBe('Started');
  });

  it('MR-EXT-STATUS-2: non-host gets 400 (service returns failure)', async () => {
    const { user: host } = await seedUser();
    const { token: otherToken } = await seedUser();
    const venue = await seedVenue(host._id.toString());
    const match = await seedMatch(host._id.toString(), venue._id.toString());

    const res = await request(app)
      .patch(`/api/games/${match._id.toString()}/status`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ status: 'Cancelled' });

    expect(res.status).toBe(400);
  });

  it('MR-EXT-STATUS-3: invalid status value returns 400', async () => {
    const { user: host, token: hostToken } = await seedUser();
    const venue = await seedVenue(host._id.toString());
    const match = await seedMatch(host._id.toString(), venue._id.toString());

    const res = await request(app)
      .patch(`/api/games/${match._id.toString()}/status`)
      .set('Authorization', `Bearer ${hostToken}`)
      .send({ status: 'InvalidStatus' });

    expect(res.status).toBe(400);
  });
});

// ─── PATCH /api/games/:id/applicants/:uid/approve ─────────────────────────────

describe('PATCH /api/games/:id/applicants/:uid/approve', () => {
  it('MR-EXT-APP-1: host approves pending applicant → 200', async () => {
    const { user: host, token: hostToken } = await seedUser();
    const { user: applicant } = await seedUser();
    const venue = await seedVenue(host._id.toString());
    const match = await seedMatch(host._id.toString(), venue._id.toString(), { approvalMode: 'approval' });
    await SessionInteractionModel.create({ userId: applicant._id.toString(), sessionId: match._id, status: 'pending' });

    const res = await request(app)
      .patch(`/api/games/${match._id.toString()}/applicants/${applicant._id.toString()}/approve`)
      .set('Authorization', `Bearer ${hostToken}`);

    expect(res.status).toBe(200);
    const interaction = await SessionInteractionModel.findOne({ userId: applicant._id.toString(), sessionId: match._id });
    expect(interaction?.status).toBe('registered');
  });

  it('MR-EXT-APP-2: non-host approve returns 400 (service returns failure)', async () => {
    const { user: host } = await seedUser();
    const { user: applicant } = await seedUser();
    const { token: notHostToken } = await seedUser();
    const venue = await seedVenue(host._id.toString());
    const match = await seedMatch(host._id.toString(), venue._id.toString(), { approvalMode: 'approval' });
    await SessionInteractionModel.create({ userId: applicant._id.toString(), sessionId: match._id, status: 'pending' });

    const res = await request(app)
      .patch(`/api/games/${match._id.toString()}/applicants/${applicant._id.toString()}/approve`)
      .set('Authorization', `Bearer ${notHostToken}`);

    expect(res.status).toBe(400);
  });

  it('MR-EXT-APP-3: approving non-existent applicant returns 400 or 404', async () => {
    const { user: host, token: hostToken } = await seedUser();
    const venue = await seedVenue(host._id.toString());
    const match = await seedMatch(host._id.toString(), venue._id.toString(), { approvalMode: 'approval' });
    const fakeId = new mongoose.Types.ObjectId().toString();

    const res = await request(app)
      .patch(`/api/games/${match._id.toString()}/applicants/${fakeId}/approve`)
      .set('Authorization', `Bearer ${hostToken}`);

    expect([400, 404]).toContain(res.status);
  });
});

// ─── PATCH /api/games/:id/applicants/:uid/reject ──────────────────────────────

describe('PATCH /api/games/:id/applicants/:uid/reject', () => {
  it('MR-EXT-REJ-1: host rejects pending applicant → status=cancelled', async () => {
    const { user: host, token: hostToken } = await seedUser();
    const { user: applicant } = await seedUser();
    const venue = await seedVenue(host._id.toString());
    const match = await seedMatch(host._id.toString(), venue._id.toString(), { approvalMode: 'approval' });
    await SessionInteractionModel.create({ userId: applicant._id.toString(), sessionId: match._id, status: 'pending' });

    const res = await request(app)
      .patch(`/api/games/${match._id.toString()}/applicants/${applicant._id.toString()}/reject`)
      .set('Authorization', `Bearer ${hostToken}`);

    expect(res.status).toBe(200);
    const interaction = await SessionInteractionModel.findOne({ userId: applicant._id.toString(), sessionId: match._id });
    expect(interaction?.status).toBe('cancelled');
  });

  it('MR-EXT-REJ-2: non-host reject returns 400 (service returns failure)', async () => {
    const { user: host } = await seedUser();
    const { user: applicant } = await seedUser();
    const { token: notHostToken } = await seedUser();
    const venue = await seedVenue(host._id.toString());
    const match = await seedMatch(host._id.toString(), venue._id.toString(), { approvalMode: 'approval' });
    await SessionInteractionModel.create({ userId: applicant._id.toString(), sessionId: match._id, status: 'pending' });

    const res = await request(app)
      .patch(`/api/games/${match._id.toString()}/applicants/${applicant._id.toString()}/reject`)
      .set('Authorization', `Bearer ${notHostToken}`);

    expect(res.status).toBe(400);
  });
});

// ─── PATCH /api/games/:id/cancel ─────────────────────────────────────────────

describe('PATCH /api/games/:id/cancel', () => {
  it('MR-EXT-CANCEL-1: host can cancel an Open match → returns 200', async () => {
    const { user: host, token: hostToken } = await seedUser();
    const venue = await seedVenue(host._id.toString());
    const match = await seedMatch(host._id.toString(), venue._id.toString());

    const res = await request(app)
      .patch(`/api/games/${match._id.toString()}/cancel`)
      .set('Authorization', `Bearer ${hostToken}`);

    expect(res.status).toBe(200);
    const updated = await MatchModel.findById(match._id);
    expect(updated?.status).toBe('Cancelled');
  });

  it('MR-EXT-CANCEL-2: non-host cancel returns 400 (service returns failure)', async () => {
    const { user: host } = await seedUser();
    const { token: otherToken } = await seedUser();
    const venue = await seedVenue(host._id.toString());
    const match = await seedMatch(host._id.toString(), venue._id.toString());

    const res = await request(app)
      .patch(`/api/games/${match._id.toString()}/cancel`)
      .set('Authorization', `Bearer ${otherToken}`);

    expect(res.status).toBe(400);
  });

  it('MR-EXT-CANCEL-3: cancelling Cancelled match returns 400', async () => {
    const { user: host, token: hostToken } = await seedUser();
    const venue = await seedVenue(host._id.toString());
    const match = await seedMatch(host._id.toString(), venue._id.toString(), { status: 'Cancelled' });

    const res = await request(app)
      .patch(`/api/games/${match._id.toString()}/cancel`)
      .set('Authorization', `Bearer ${hostToken}`);

    expect(res.status).toBe(400);
  });

  it('MR-EXT-CANCEL-4: cancelling Completed match returns 400', async () => {
    const { user: host, token: hostToken } = await seedUser();
    const venue = await seedVenue(host._id.toString());
    const match = await seedMatch(host._id.toString(), venue._id.toString(), { status: 'Completed' });

    const res = await request(app)
      .patch(`/api/games/${match._id.toString()}/cancel`)
      .set('Authorization', `Bearer ${hostToken}`);

    expect(res.status).toBe(400);
  });
});

// ─── PATCH /api/admin/games/:id/pin ──────────────────────────────────────────

describe('PATCH /api/admin/games/:id/pin', () => {
  it('MR-EXT-PIN-1: admin can pin a match → isPinned=true', async () => {
    const { user: host } = await seedUser();
    const { token: adminToken } = await seedUser('admin');
    const venue = await seedVenue(host._id.toString());
    const match = await seedMatch(host._id.toString(), venue._id.toString());

    const res = await request(app)
      .patch(`/api/admin/games/${match._id.toString()}/pin`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const updated = await MatchModel.findById(match._id);
    expect(updated?.isPinned).toBe(true);
  });

  it('MR-EXT-PIN-2: admin pin again toggles isPinned back to false', async () => {
    const { user: host } = await seedUser();
    const { token: adminToken } = await seedUser('admin');
    const venue = await seedVenue(host._id.toString());
    const match = await seedMatch(host._id.toString(), venue._id.toString(), { isPinned: true });

    const res = await request(app)
      .patch(`/api/admin/games/${match._id.toString()}/pin`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const updated = await MatchModel.findById(match._id);
    expect(updated?.isPinned).toBe(false);
  });

  it('MR-EXT-PIN-3: player-role user cannot pin — returns 403', async () => {
    const { user: host, token: playerToken } = await seedUser('player');
    const venue = await seedVenue(host._id.toString());
    const match = await seedMatch(host._id.toString(), venue._id.toString());

    const res = await request(app)
      .patch(`/api/admin/games/${match._id.toString()}/pin`)
      .set('Authorization', `Bearer ${playerToken}`);

    expect(res.status).toBe(403);
  });

  it('MR-EXT-PIN-4: pin without auth returns 401', async () => {
    const { user: host } = await seedUser();
    const venue = await seedVenue(host._id.toString());
    const match = await seedMatch(host._id.toString(), venue._id.toString());

    const res = await request(app).patch(`/api/admin/games/${match._id.toString()}/pin`);
    expect(res.status).toBe(401);
  });
});

// ─── PATCH /api/games/:id/external-pax ───────────────────────────────────────

describe('PATCH /api/games/:id/external-pax', () => {
  it('MR-EXT-EXTPAX-1: host can update external pax count', async () => {
    const { user: host, token: hostToken } = await seedUser();
    const venue = await seedVenue(host._id.toString());
    const match = await seedMatch(host._id.toString(), venue._id.toString());

    const res = await request(app)
      .patch(`/api/games/${match._id.toString()}/external-pax`)
      .set('Authorization', `Bearer ${hostToken}`)
      .send({ count: 3 });  // ExternalPaxSchema uses 'count'

    expect(res.status).toBe(200);
  });

  it('MR-EXT-EXTPAX-2: negative external pax returns 400', async () => {
    const { user: host, token: hostToken } = await seedUser();
    const venue = await seedVenue(host._id.toString());
    const match = await seedMatch(host._id.toString(), venue._id.toString());

    const res = await request(app)
      .patch(`/api/games/${match._id.toString()}/external-pax`)
      .set('Authorization', `Bearer ${hostToken}`)
      .send({ count: -1 });  // ExternalPaxSchema uses 'count'

    expect(res.status).toBe(400);
  });
});

// ─── GET /api/users/me/events ─────────────────────────────────────────────────

describe('GET /api/users/me/events', () => {
  it('MR-EXT-EVENTS-1: returns array of events user is registered in', async () => {
    const { user: host, token: hostToken } = await seedUser();
    const venue = await seedVenue(host._id.toString());
    await seedMatch(host._id.toString(), venue._id.toString());

    const res = await request(app)
      .get('/api/users/me/events')
      .set('Authorization', `Bearer ${hostToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });

  it('MR-EXT-EVENTS-2: returns 401 without auth', async () => {
    const res = await request(app).get('/api/users/me/events');
    expect(res.status).toBe(401);
  });
});

// ─── POST /api/games/:id/guests ───────────────────────────────────────────────

describe('POST /api/games/:id/guests + DELETE /api/games/:id/guests/:index', () => {
  it('MR-EXT-GUEST-1: host can add a guest', async () => {
    const { user: host, token: hostToken } = await seedUser();
    const venue = await seedVenue(host._id.toString());
    const match = await seedMatch(host._id.toString(), venue._id.toString());

    const res = await request(app)
      .post(`/api/games/${match._id.toString()}/guests`)
      .set('Authorization', `Bearer ${hostToken}`)
      .send({ name: 'Guest Player' });

    expect(res.status).toBe(200);
    const updated = await MatchModel.findById(match._id);
    expect(updated?.guests?.some(g => g.name === 'Guest Player')).toBe(true);
  });

  it('MR-EXT-GUEST-2: non-host adding guest returns 400 (service returns failure)', async () => {
    const { user: host } = await seedUser();
    const { token: notHostToken } = await seedUser();
    const venue = await seedVenue(host._id.toString());
    const match = await seedMatch(host._id.toString(), venue._id.toString());

    const res = await request(app)
      .post(`/api/games/${match._id.toString()}/guests`)
      .set('Authorization', `Bearer ${notHostToken}`)
      .send({ name: 'Rogue Guest' });

    expect(res.status).toBe(400);
  });

  it('MR-EXT-GUEST-3: host can remove guest at index 0', async () => {
    const { user: host, token: hostToken } = await seedUser();
    const venue = await seedVenue(host._id.toString());
    const match = await seedMatch(host._id.toString(), venue._id.toString());
    // Add guest first
    await request(app)
      .post(`/api/games/${match._id.toString()}/guests`)
      .set('Authorization', `Bearer ${hostToken}`)
      .send({ name: 'Removable Guest' });

    const res = await request(app)
      .delete(`/api/games/${match._id.toString()}/guests/0`)
      .set('Authorization', `Bearer ${hostToken}`);

    expect(res.status).toBe(200);
  });

  it('MR-EXT-GUEST-4: missing name returns 400', async () => {
    const { user: host, token: hostToken } = await seedUser();
    const venue = await seedVenue(host._id.toString());
    const match = await seedMatch(host._id.toString(), venue._id.toString());

    const res = await request(app)
      .post(`/api/games/${match._id.toString()}/guests`)
      .set('Authorization', `Bearer ${hostToken}`)
      .send({});

    expect(res.status).toBe(400);
  });
});

// ─── PATCH /api/games/:id/attendance ─────────────────────────────────────────

describe('PATCH /api/games/:id/attendance', () => {
  it('MR-EXT-ATT-1: host logs attendance on Started match → 200', async () => {
    const { user: host, token: hostToken } = await seedUser();
    const { user: player } = await seedUser();
    const venue = await seedVenue(host._id.toString());
    const match = await seedMatch(host._id.toString(), venue._id.toString(), { status: 'Started' });
    await addPlayerToMatch(match._id.toString(), player._id.toString());

    const res = await request(app)
      .patch(`/api/games/${match._id.toString()}/attendance`)
      .set('Authorization', `Bearer ${hostToken}`)
      .send({
        attendees: [{ userId: player._id.toString(), status: 'attended', punctuality: 'punctual' }],
      });

    expect(res.status).toBe(200);
    const updated = await UserModel.findById(player._id);
    expect(updated?.creditScore).toBeGreaterThan(100);
  });

  it('MR-EXT-ATT-2: non-host attendance returns 400 (service returns failure)', async () => {
    const { user: host } = await seedUser();
    const { user: player } = await seedUser();
    const { token: notHostToken } = await seedUser();
    const venue = await seedVenue(host._id.toString());
    const match = await seedMatch(host._id.toString(), venue._id.toString(), { status: 'Started' });
    await addPlayerToMatch(match._id.toString(), player._id.toString());

    const res = await request(app)
      .patch(`/api/games/${match._id.toString()}/attendance`)
      .set('Authorization', `Bearer ${notHostToken}`)
      .send({
        attendees: [{ userId: player._id.toString(), status: 'attended' }],
      });

    expect(res.status).toBe(400);
  });

  it('MR-EXT-ATT-3: attendance on Open (not Started) match returns 400', async () => {
    const { user: host, token: hostToken } = await seedUser();
    const { user: player } = await seedUser();
    const venue = await seedVenue(host._id.toString());
    const match = await seedMatch(host._id.toString(), venue._id.toString(), { status: 'Open' });
    await addPlayerToMatch(match._id.toString(), player._id.toString());

    const res = await request(app)
      .patch(`/api/games/${match._id.toString()}/attendance`)
      .set('Authorization', `Bearer ${hostToken}`)
      .send({
        attendees: [{ userId: player._id.toString(), status: 'attended' }],
      });

    expect(res.status).toBe(400);
  });
});

// ─── 404 for non-existent match ───────────────────────────────────────────────

describe('Non-existent match', () => {
  it('MR-EXT-404-1: PATCH /games/:id status with unknown id returns 400 (match not found)', async () => {
    const { token } = await seedUser('admin');
    const fakeId = new mongoose.Types.ObjectId().toString();

    const res = await request(app)
      .patch(`/api/games/${fakeId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'Cancelled' });

    // Route returns 400 on service failure (match not found or not host)
    expect([400, 404]).toContain(res.status);
  });
});
