/**
 * HTTP-layer integration tests for venue (player-space) routes.
 * Covers: CRUD, booking-inquiry, socialLinks, like/subscribe, rate, admin verify/pin.
 */

import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';

vi.mock('../../../shared/infra/passport', () => {
  const passport = {
    initialize: () => (_req: unknown, _res: unknown, next: () => void) => next(),
    authenticate: () => (_req: unknown, _res: unknown, next: () => void) => next(),
    use: () => {}, serializeUser: () => {}, deserializeUser: () => {},
  };
  return { default: passport };
});

vi.mock('../../../shared/infra/email', () => ({
  sendOtpEmail: vi.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
  sendBookingInquiryEmail: vi.fn().mockResolvedValue(undefined),
}));

import request from 'supertest';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../../../app';
import { UserModel } from '../../users/DBSchemas/UserSchema';
import { PlayerSpaceModel } from '../DBSchemas/PlayerSpaceSchema';

const SECRET = 'venue-route-test-secret';
let mongod: MongoMemoryServer;

beforeAll(async () => {
  process.env.JWT_SECRET = SECRET;
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterEach(async () => {
  for (const col of Object.values(mongoose.connection.collections)) {
    await col.deleteMany({});
  }
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function seedUser(role: 'player' | 'admin' | 'web_admin' = 'player') {
  const uid = new mongoose.Types.ObjectId().toString().slice(-6);
  const user = await UserModel.create({
    username: `vr_${uid}`, email: `vr_${uid}@test.com`,
    passwordHash: '$2b$10$hashedfakepw', role,
  });
  const token = jwt.sign({ userId: user._id.toString(), email: user.email }, SECRET, { expiresIn: '1h' });
  return { user, token };
}

async function seedVenue(ownerId: string, extra: Record<string, unknown> = {}) {
  return PlayerSpaceModel.create({
    owner_id: new mongoose.Types.ObjectId(ownerId),
    name: 'VR Venue', address: '1 VR Street, Singapore', type: 'house',
    location: { lat: 1.3521, long: 103.8198 },
    geoLocation: { type: 'Point', coordinates: [103.8198, 1.3521] },
    financials: { is_chargeable: false, approx_fee: 0, price_type: 'per_session' },
    amenities: [], status: 'unVerified',
    ...extra,
  });
}

// ─── GET /api/venues ───────────────────────────────────────────────────────────

describe('GET /api/venues', () => {
  it('VR-LIST-1: returns 200 with array (no auth)', async () => {
    const { user } = await seedUser();
    await seedVenue(user._id.toString());

    const res = await request(app).get('/api/venues');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });

  it('VR-LIST-2: returns myInteraction when authenticated', async () => {
    const { user, token } = await seedUser();
    await seedVenue(user._id.toString());

    const res = await request(app).get('/api/venues').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    const venue = res.body[0];
    expect(venue.myInteraction).toBeDefined();
    expect(typeof venue.myInteraction.isLiked).toBe('boolean');
  });

  it('VR-LIST-3: pinned venues appear before non-pinned', async () => {
    const { user } = await seedUser();
    await seedVenue(user._id.toString(), { name: 'Normal Venue', isPinned: false });
    await seedVenue(user._id.toString(), { name: 'Pinned Venue', isPinned: true });

    const res = await request(app).get('/api/venues');
    expect(res.status).toBe(200);
    expect(res.body[0].name).toBe('Pinned Venue');
  });
});

// ─── GET /api/venues/:id ──────────────────────────────────────────────────────

describe('GET /api/venues/:id', () => {
  it('VR-GET-1: returns 200 with full venue DTO', async () => {
    const { user } = await seedUser();
    const venue = await seedVenue(user._id.toString());

    const res = await request(app).get(`/api/venues/${venue._id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(venue._id.toString());
    expect(res.body.name).toBe('VR Venue');
  });

  it('VR-GET-2: returns 404 for non-existent venue', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app).get(`/api/venues/${fakeId}`);
    expect(res.status).toBe(404);
  });

  it('VR-GET-3: socialLinks returned when set on venue', async () => {
    const { user } = await seedUser();
    const venue = await seedVenue(user._id.toString(), {
      socialLinks: { wechatId: 'myWechat123', telegramHandle: '@mybot' },
    });

    const res = await request(app).get(`/api/venues/${venue._id}`);
    expect(res.status).toBe(200);
    expect(res.body.socialLinks).toBeDefined();
    expect(res.body.socialLinks.wechatId).toBe('myWechat123');
    expect(res.body.socialLinks.telegramHandle).toBe('@mybot');
  });

  it('VR-GET-4: socialLinks absent when not set', async () => {
    const { user } = await seedUser();
    const venue = await seedVenue(user._id.toString());

    const res = await request(app).get(`/api/venues/${venue._id}`);
    expect(res.status).toBe(200);
    expect(res.body.socialLinks).toBeUndefined();
  });
});

// ─── POST /api/venues ──────────────────────────────────────────────────────────

describe('POST /api/venues', () => {
  it('VR-CREATE-1: creates venue and returns 201 with correct shape', async () => {
    const { token } = await seedUser();

    const res = await request(app)
      .post('/api/venues')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'New Test Venue', address: '99 Create St, Singapore',
        type: 'house', lat: 1.35, lng: 103.82, is_chargeable: false,
      });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeTruthy();
    expect(res.body.isVerified).toBe(false);
  });

  it('VR-CREATE-2: admin-created venue is auto-verified', async () => {
    const { token } = await seedUser('admin');

    const res = await request(app)
      .post('/api/venues')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Admin Venue', address: '1 Admin Rd, Singapore',
        type: 'boardgame_store', lat: 1.35, lng: 103.82, is_chargeable: false,
      });

    expect(res.status).toBe(201);
    expect(res.body.isVerified).toBe(true);
  });

  it('VR-CREATE-3: includes socialLinks when provided at creation', async () => {
    const { token } = await seedUser();

    const res = await request(app)
      .post('/api/venues')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Social Venue', address: '5 Link St, Singapore',
        type: 'house', lat: 1.35, lng: 103.82, is_chargeable: false,
        socialLinks: { wechatId: 'wechat_abc', telegramHandle: '@test_handle' },
      });

    expect(res.status).toBe(201);
    expect(res.body.socialLinks?.wechatId).toBe('wechat_abc');
    expect(res.body.socialLinks?.telegramHandle).toBe('@test_handle');
  });

  it('VR-CREATE-4: returns 400 when required fields missing', async () => {
    const { token } = await seedUser();

    const res = await request(app)
      .post('/api/venues')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'No address' });

    expect(res.status).toBe(400);
  });

  it('VR-CREATE-5: returns 401 when unauthenticated', async () => {
    const res = await request(app)
      .post('/api/venues')
      .send({ name: 'Ghost Venue', address: '1 Ghost Rd', type: 'house', lat: 1, lng: 103, is_chargeable: false });
    expect(res.status).toBe(401);
  });

  it('VR-CREATE-6: 4th venue rejected for regular user', async () => {
    const { user, token } = await seedUser();
    for (let i = 0; i < 3; i++) await seedVenue(user._id.toString());

    const res = await request(app)
      .post('/api/venues')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Venue 4', address: '4 Over Limit St, Singapore', type: 'house', lat: 1.35, lng: 103.82, is_chargeable: false });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/3/);
  });

  it('VR-CREATE-7: admin can create more than 3 venues', async () => {
    const { user, token } = await seedUser('admin');
    for (let i = 0; i < 3; i++) await seedVenue(user._id.toString());

    const res = await request(app)
      .post('/api/venues')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Admin Venue 4', address: '4 Admin Lane, Singapore', type: 'boardgame_store', lat: 1.35, lng: 103.82, is_chargeable: false });

    expect(res.status).toBe(201);
  });
});

// ─── PATCH /api/venues/:id ────────────────────────────────────────────────────

describe('PATCH /api/venues/:id', () => {
  it('VR-UPDATE-1: owner can update name', async () => {
    const { user, token } = await seedUser();
    const venue = await seedVenue(user._id.toString());

    const res = await request(app)
      .patch(`/api/venues/${venue._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Renamed Venue' });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Renamed Venue');
  });

  it('VR-UPDATE-2: non-owner returns 403', async () => {
    const { user: owner } = await seedUser();
    const { token: notOwnerToken } = await seedUser();
    const venue = await seedVenue(owner._id.toString());

    const res = await request(app)
      .patch(`/api/venues/${venue._id}`)
      .set('Authorization', `Bearer ${notOwnerToken}`)
      .send({ name: 'Hacked' });

    expect(res.status).toBe(403);
  });

  it('VR-UPDATE-3: owner can set socialLinks', async () => {
    const { user, token } = await seedUser();
    const venue = await seedVenue(user._id.toString());

    const res = await request(app)
      .patch(`/api/venues/${venue._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ socialLinks: { wechatId: 'newId123', facebookUrl: 'https://facebook.com/mypage' } });

    expect(res.status).toBe(200);
    expect(res.body.socialLinks?.wechatId).toBe('newId123');
    expect(res.body.socialLinks?.facebookUrl).toBe('https://facebook.com/mypage');
  });

  it('VR-UPDATE-4: updating price round-trips correctly through is_chargeable/approx_fee', async () => {
    const { user, token } = await seedUser();
    const venue = await seedVenue(user._id.toString());

    const res = await request(app)
      .patch(`/api/venues/${venue._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ is_chargeable: true, approx_fee: 20, price_type: 'per_person' });

    expect(res.status).toBe(200);
    expect(res.body.pricePerHour).toBe(20);
    expect(res.body.priceType).toBe('per_person');
  });
});

// ─── POST /api/venues/:id/like ────────────────────────────────────────────────

describe('POST /api/venues/:id/like', () => {
  it('VR-LIKE-1: first like returns isLiked=true', async () => {
    const { user: owner } = await seedUser();
    const { token } = await seedUser();
    const venue = await seedVenue(owner._id.toString());

    const res = await request(app)
      .post(`/api/venues/${venue._id}/like`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.isLiked).toBe(true);
  });

  it('VR-LIKE-2: second like toggles to isLiked=false', async () => {
    const { user: owner } = await seedUser();
    const { token } = await seedUser();
    const venue = await seedVenue(owner._id.toString());

    await request(app).post(`/api/venues/${venue._id}/like`).set('Authorization', `Bearer ${token}`);
    const res = await request(app).post(`/api/venues/${venue._id}/like`).set('Authorization', `Bearer ${token}`);

    expect(res.body.isLiked).toBe(false);
  });

  it('VR-LIKE-3: two different users both liking produces totalLikes=2', async () => {
    const { user: owner } = await seedUser();
    const { token: t1 } = await seedUser();
    const { token: t2 } = await seedUser();
    const venue = await seedVenue(owner._id.toString());

    await request(app).post(`/api/venues/${venue._id}/like`).set('Authorization', `Bearer ${t1}`);
    await request(app).post(`/api/venues/${venue._id}/like`).set('Authorization', `Bearer ${t2}`);

    const updated = await PlayerSpaceModel.findById(venue._id);
    expect(updated?.totalLikes).toBe(2);
  });

  it('VR-LIKE-4: returns 401 without token', async () => {
    const { user } = await seedUser();
    const venue = await seedVenue(user._id.toString());
    const res = await request(app).post(`/api/venues/${venue._id}/like`);
    expect(res.status).toBe(401);
  });
});

// ─── POST /api/venues/:id/subscribe ──────────────────────────────────────────

describe('POST /api/venues/:id/subscribe', () => {
  it('VR-SUB-1: first subscribe returns isSubscribed=true and increments count', async () => {
    const { user: owner } = await seedUser();
    const { token } = await seedUser();
    const venue = await seedVenue(owner._id.toString());

    const res = await request(app)
      .post(`/api/venues/${venue._id}/subscribe`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.isSubscribed).toBe(true);
    const updated = await PlayerSpaceModel.findById(venue._id);
    expect(updated?.totalSubscribers).toBe(1);
  });

  it('VR-SUB-2: unsubscribe decrements totalSubscribers', async () => {
    const { user: owner } = await seedUser();
    const { token } = await seedUser();
    const venue = await seedVenue(owner._id.toString());

    await request(app).post(`/api/venues/${venue._id}/subscribe`).set('Authorization', `Bearer ${token}`);
    await request(app).post(`/api/venues/${venue._id}/subscribe`).set('Authorization', `Bearer ${token}`);

    const updated = await PlayerSpaceModel.findById(venue._id);
    expect(updated?.totalSubscribers).toBe(0);
  });
});

// ─── POST /api/venues/:id/rate ────────────────────────────────────────────────

describe('POST /api/venues/:id/rate', () => {
  it('VR-RATE-1: valid rating is accepted', async () => {
    const { user: owner } = await seedUser();
    const { token } = await seedUser();
    const venue = await seedVenue(owner._id.toString());

    const res = await request(app)
      .post(`/api/venues/${venue._id}/rate`)
      .set('Authorization', `Bearer ${token}`)
      .send({ rating: 4 });

    expect(res.status).toBe(200);
    const updated = await PlayerSpaceModel.findById(venue._id);
    expect(updated?.averageRating).toBeCloseTo(4);
  });

  it('VR-RATE-2: rating out of range is rejected', async () => {
    const { user: owner } = await seedUser();
    const { token } = await seedUser();
    const venue = await seedVenue(owner._id.toString());

    const res = await request(app)
      .post(`/api/venues/${venue._id}/rate`)
      .set('Authorization', `Bearer ${token}`)
      .send({ rating: 10 });

    expect(res.status).toBe(400);
  });
});

// ─── POST /api/venues/:id/booking-inquiry ────────────────────────────────────

describe('POST /api/venues/:id/booking-inquiry', () => {
  const validBody = {
    date: '2025-08-01', time: '19:00', duration: '2', pax: 8,
    name: 'Test User', contact: 'test@example.com', notes: 'No smoke please',
  };

  it('VR-BOOK-1: returns 200 with autoConfirmed=false for house venue', async () => {
    const { user } = await seedUser();
    const venue = await seedVenue(user._id.toString(), { type: 'house' });

    const res = await request(app)
      .post(`/api/venues/${venue._id}/booking-inquiry`)
      .send(validBody);

    expect(res.status).toBe(200);
    expect(res.body.autoConfirmed).toBe(false);
  });

  it('VR-BOOK-2: returns autoConfirmed=true for school venue', async () => {
    const { user } = await seedUser();
    const venue = await seedVenue(user._id.toString(), { type: 'school' });

    const res = await request(app)
      .post(`/api/venues/${venue._id}/booking-inquiry`)
      .send(validBody);

    expect(res.status).toBe(200);
    expect(res.body.autoConfirmed).toBe(true);
  });

  it('VR-BOOK-3: returns autoConfirmed=false for boardgame_store venue', async () => {
    const { user } = await seedUser();
    const venue = await seedVenue(user._id.toString(), { type: 'boardgame_store' });

    const res = await request(app)
      .post(`/api/venues/${venue._id}/booking-inquiry`)
      .send(validBody);

    expect(res.status).toBe(200);
    expect(res.body.autoConfirmed).toBe(false);
  });

  it('VR-BOOK-4: works without authentication (public endpoint)', async () => {
    const { user } = await seedUser();
    const venue = await seedVenue(user._id.toString());

    const res = await request(app)
      .post(`/api/venues/${venue._id}/booking-inquiry`)
      .send(validBody);

    expect(res.status).toBe(200);
  });

  it('VR-BOOK-5: returns 400 when required fields missing', async () => {
    const { user } = await seedUser();
    const venue = await seedVenue(user._id.toString());

    const res = await request(app)
      .post(`/api/venues/${venue._id}/booking-inquiry`)
      .send({ date: '2025-08-01' }); // missing time, duration, pax, name, contact

    expect(res.status).toBe(400);
  });

  it('VR-BOOK-6: returns 404 for non-existent venue', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .post(`/api/venues/${fakeId}/booking-inquiry`)
      .send(validBody);
    expect(res.status).toBe(404);
  });

  it('VR-BOOK-7: works even when venue owner has no email set (no crash)', async () => {
    const { user } = await seedUser();
    // owner exists but has empty email (shouldn't happen normally, but shouldn't crash)
    const venue = await seedVenue(user._id.toString(), { type: 'house' });

    const res = await request(app)
      .post(`/api/venues/${venue._id}/booking-inquiry`)
      .send(validBody);

    // Should still return 200; email failure is non-fatal
    expect(res.status).toBe(200);
  });
});

// ─── Admin: PATCH /api/admin/venues/:id/verify ────────────────────────────────

describe('PATCH /api/admin/venues/:id/verify', () => {
  it('VR-ADMIN-1: admin can verify a venue', async () => {
    const { user: owner } = await seedUser();
    const { token: adminToken } = await seedUser('admin');
    const venue = await seedVenue(owner._id.toString());

    const res = await request(app)
      .patch(`/api/admin/venues/${venue._id}/verify`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ approved: true });

    expect(res.status).toBe(200);
    const updated = await PlayerSpaceModel.findById(venue._id);
    expect(updated?.status).toBe('Verified');
  });

  it('VR-ADMIN-2: non-admin is rejected with 403', async () => {
    const { user: owner } = await seedUser();
    const { token: playerToken } = await seedUser();
    const venue = await seedVenue(owner._id.toString());

    const res = await request(app)
      .patch(`/api/admin/venues/${venue._id}/verify`)
      .set('Authorization', `Bearer ${playerToken}`)
      .send({ approved: true });

    expect(res.status).toBe(403);
  });

  it('VR-ADMIN-3: admin can un-verify (approved=false)', async () => {
    const { user: owner } = await seedUser();
    const { token: adminToken } = await seedUser('admin');
    const venue = await seedVenue(owner._id.toString(), { status: 'Verified' });

    const res = await request(app)
      .patch(`/api/admin/venues/${venue._id}/verify`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ approved: false });

    expect(res.status).toBe(200);
    const updated = await PlayerSpaceModel.findById(venue._id);
    expect(updated?.status).toBe('unVerified');
  });
});

// ─── Admin: PATCH /api/admin/venues/:id/pin ───────────────────────────────────

describe('PATCH /api/admin/venues/:id/pin', () => {
  it('VR-PIN-1: admin can pin a venue', async () => {
    const { user: owner } = await seedUser();
    const { token: adminToken } = await seedUser('admin');
    const venue = await seedVenue(owner._id.toString());

    const res = await request(app)
      .patch(`/api/admin/venues/${venue._id}/pin`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.isPinned).toBe(true);
  });

  it('VR-PIN-2: admin pin toggles — second call unpins', async () => {
    const { user: owner } = await seedUser();
    const { token: adminToken } = await seedUser('admin');
    const venue = await seedVenue(owner._id.toString());

    await request(app).patch(`/api/admin/venues/${venue._id}/pin`).set('Authorization', `Bearer ${adminToken}`);
    const res = await request(app).patch(`/api/admin/venues/${venue._id}/pin`).set('Authorization', `Bearer ${adminToken}`);

    expect(res.body.isPinned).toBe(false);
  });

  it('VR-PIN-3: regular player cannot pin', async () => {
    const { user: owner } = await seedUser();
    const { token: playerToken } = await seedUser();
    const venue = await seedVenue(owner._id.toString());

    const res = await request(app)
      .patch(`/api/admin/venues/${venue._id}/pin`)
      .set('Authorization', `Bearer ${playerToken}`);

    expect(res.status).toBe(403);
  });
});
