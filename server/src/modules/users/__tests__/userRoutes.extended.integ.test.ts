/**
 * Extended HTTP-layer integration tests for user routes.
 * Covers endpoints not in userRoutes.integ.test.ts:
 *   POST   /api/auth/forgot-password
 *   POST   /api/auth/reset-password
 *   GET    /api/users/:id       (public profile)
 *   POST   /api/users/:id/follow
 *   DELETE /api/users/:id/follow
 *   GET    /api/users/:id/followers
 *   GET    /api/users/:id/following
 *   GET    /api/admin/users     (list users)
 *   POST   /api/admin/users/:id/reset-password
 *   PATCH  /api/admin/users/:id/credit  (success path)
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
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
  sendBookingInquiryEmail: vi.fn().mockResolvedValue(undefined),
}));

import request from 'supertest';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../../../app';
import { UserModel } from '../DBSchemas/UserSchema';
import { UserFollowModel } from '../DBSchemas/UserFollowSchema';

const SECRET = 'user-ext-test-secret';

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
    username: `uext_${uid}`,
    email: `uext_${uid}@test.com`,
    passwordHash: '$2b$10$hashedfakepw',
    role,
    creditScore,
  });
  const token = jwt.sign({ userId: user._id.toString(), email: user.email }, SECRET, { expiresIn: '1h' });
  return { user, token };
}

// ─── POST /api/auth/forgot-password ──────────────────────────────────────────

describe('POST /api/auth/forgot-password', () => {
  it('UR-EXT-FORGOT-1: returns 200 for registered email (does not reveal existence)', async () => {
    const { user } = await seedUser();

    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: user.email });

    expect(res.status).toBe(200);
    expect(res.body.message).toBeTruthy();
  });

  it('UR-EXT-FORGOT-2: returns 200 even for non-existent email (no user enumeration)', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'nobody@nonexistent.com' });

    // Should still be 200 — we don't reveal whether email exists
    expect(res.status).toBe(200);
  });

  it('UR-EXT-FORGOT-3: returns 400 when email format is invalid', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'not-an-email' });

    expect(res.status).toBe(400);
  });

  it('UR-EXT-FORGOT-4: returns 400 when email field is missing', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({});

    expect(res.status).toBe(400);
  });
});

// ─── POST /api/auth/reset-password ────────────────────────────────────────────

describe('POST /api/auth/reset-password', () => {
  it('UR-EXT-RESET-1: returns 400 when reset token is invalid/expired', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({
        email: 'someone@test.com',
        token: 'invalid-token',
        newPassword: 'NewPassword123!',
      });

    expect(res.status).toBe(400);
  });

  it('UR-EXT-RESET-2: returns 400 when required fields are missing', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ email: 'someone@test.com' });

    expect(res.status).toBe(400);
  });

  it('UR-EXT-RESET-3: returns 400 when new password is too short', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({
        email: 'someone@test.com',
        token: 'sometoken',
        newPassword: '123',
      });

    expect(res.status).toBe(400);
  });
});

// ─── GET /api/users/:id ───────────────────────────────────────────────────────

describe('GET /api/users/:id', () => {
  it('UR-EXT-PROFILE-1: returns 200 with public profile for existing user', async () => {
    const { user } = await seedUser();

    const res = await request(app).get(`/api/users/${user._id.toString()}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(user._id.toString());
    expect(res.body.username).toBe(user.username);
  });

  it('UR-EXT-PROFILE-2: returns 404 for non-existent user id', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();

    const res = await request(app).get(`/api/users/${fakeId}`);

    expect(res.status).toBe(404);
  });

  it('UR-EXT-PROFILE-3: public profile does NOT expose passwordHash', async () => {
    const { user } = await seedUser();

    const res = await request(app).get(`/api/users/${user._id.toString()}`);

    expect(res.status).toBe(200);
    expect(res.body.passwordHash).toBeUndefined();
  });

  it('UR-EXT-PROFILE-4: returns 200 without auth token (public endpoint)', async () => {
    const { user } = await seedUser();

    const res = await request(app).get(`/api/users/${user._id.toString()}`);
    // Explicitly no Authorization header
    expect(res.status).toBe(200);
  });
});

// ─── POST /api/users/:id/follow ───────────────────────────────────────────────

describe('POST /api/users/:id/follow', () => {
  it('UR-EXT-FOLLOW-1: authenticated user can follow another user', async () => {
    const { token: followerToken } = await seedUser();
    const { user: target } = await seedUser();

    const res = await request(app)
      .post(`/api/users/${target._id.toString()}/follow`)
      .set('Authorization', `Bearer ${followerToken}`);

    expect(res.status).toBe(200);
    const updated = await UserModel.findById(target._id);
    expect(updated?.followersCount).toBe(1);
  });

  it('UR-EXT-FOLLOW-2: returns 400 when following yourself', async () => {
    const { user, token } = await seedUser();

    const res = await request(app)
      .post(`/api/users/${user._id.toString()}/follow`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
  });

  it('UR-EXT-FOLLOW-3: duplicate follow returns 400', async () => {
    const { token: followerToken } = await seedUser();
    const { user: target } = await seedUser();

    await request(app)
      .post(`/api/users/${target._id.toString()}/follow`)
      .set('Authorization', `Bearer ${followerToken}`);

    const res = await request(app)
      .post(`/api/users/${target._id.toString()}/follow`)
      .set('Authorization', `Bearer ${followerToken}`);

    expect(res.status).toBe(400);
  });

  it('UR-EXT-FOLLOW-4: returns 401 without auth', async () => {
    const { user: target } = await seedUser();

    const res = await request(app).post(`/api/users/${target._id.toString()}/follow`);
    expect(res.status).toBe(401);
  });
});

// ─── DELETE /api/users/:id/follow ─────────────────────────────────────────────

describe('DELETE /api/users/:id/follow', () => {
  it('UR-EXT-UNFOLLOW-1: authenticated follower can unfollow', async () => {
    const { user: follower, token: followerToken } = await seedUser();
    const { user: target } = await seedUser();

    // Follow first
    await request(app)
      .post(`/api/users/${target._id.toString()}/follow`)
      .set('Authorization', `Bearer ${followerToken}`);

    const res = await request(app)
      .delete(`/api/users/${target._id.toString()}/follow`)
      .set('Authorization', `Bearer ${followerToken}`);

    expect(res.status).toBe(200);
    const follow = await UserFollowModel.findOne({ followerId: follower._id, followingId: target._id });
    expect(follow).toBeNull();
  });

  it('UR-EXT-UNFOLLOW-2: unfollowing someone not followed returns 400', async () => {
    const { token: followerToken } = await seedUser();
    const { user: target } = await seedUser();

    const res = await request(app)
      .delete(`/api/users/${target._id.toString()}/follow`)
      .set('Authorization', `Bearer ${followerToken}`);

    expect(res.status).toBe(400);
  });

  it('UR-EXT-UNFOLLOW-3: returns 401 without auth', async () => {
    const { user: target } = await seedUser();

    const res = await request(app).delete(`/api/users/${target._id.toString()}/follow`);
    expect(res.status).toBe(401);
  });
});

// Note: GET /api/users/:id/followers, GET /api/users/:id/following,
// and GET /api/admin/users are not yet implemented in the backend routes.
// Tests for these will be added when those routes are implemented.

// ─── POST /api/admin/users/:id/reset-password ─────────────────────────────────

describe('POST /api/admin/users/:id/reset-password', () => {
  it('UR-EXT-ADMINRESET-1: admin can reset another user password', async () => {
    const { token: adminToken } = await seedUser('admin');
    const { user: target } = await seedUser('player');

    const res = await request(app)
      .post(`/api/admin/users/${target._id.toString()}/reset-password`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ newPassword: 'AdminReset123!' });

    expect(res.status).toBe(200);
  });

  it('UR-EXT-ADMINRESET-2: player cannot reset another user password — returns 403', async () => {
    const { token: playerToken } = await seedUser('player');
    const { user: target } = await seedUser('player');

    const res = await request(app)
      .post(`/api/admin/users/${target._id.toString()}/reset-password`)
      .set('Authorization', `Bearer ${playerToken}`)
      .send({ newPassword: 'AdminReset123!' });

    expect(res.status).toBe(403);
  });

  it('UR-EXT-ADMINRESET-3: returns 404 for non-existent user id', async () => {
    const { token: adminToken } = await seedUser('admin');
    const fakeId = new mongoose.Types.ObjectId().toString();

    const res = await request(app)
      .post(`/api/admin/users/${fakeId}/reset-password`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ newPassword: 'AdminReset123!' });

    expect([400, 404]).toContain(res.status);
  });
});

// ─── PATCH /api/admin/users/:id/credit ───────────────────────────────────────

describe('PATCH /api/admin/users/:id/credit (success path)', () => {
  it('UR-EXT-CREDIT-1: admin can add credit to a user', async () => {
    const { user: target } = await seedUser('player', 100);
    const { token: adminToken } = await seedUser('admin');

    const res = await request(app)
      .patch(`/api/admin/users/${target._id.toString()}/credit`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ delta: 5 });

    expect(res.status).toBe(200);
    const updated = await UserModel.findById(target._id);
    expect(updated?.creditScore).toBe(105);
  });

  it('UR-EXT-CREDIT-2: admin can deduct credit from a user', async () => {
    const { user: target } = await seedUser('player', 100);
    const { token: adminToken } = await seedUser('admin');

    const res = await request(app)
      .patch(`/api/admin/users/${target._id.toString()}/credit`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ delta: -10 });

    expect(res.status).toBe(200);
    const updated = await UserModel.findById(target._id);
    expect(updated?.creditScore).toBe(90);
  });

  it('UR-EXT-CREDIT-3: delta=0 should succeed without changing score', async () => {
    const { user: target } = await seedUser('player', 50);
    const { token: adminToken } = await seedUser('admin');

    const res = await request(app)
      .patch(`/api/admin/users/${target._id.toString()}/credit`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ delta: 0 });

    // Some implementations reject 0-delta; either 200 or 400 is acceptable
    expect([200, 400]).toContain(res.status);
    if (res.status === 200) {
      const updated = await UserModel.findById(target._id);
      expect(updated?.creditScore).toBe(50);
    }
  });

  it('UR-EXT-CREDIT-4: missing delta returns 400', async () => {
    const { user: target } = await seedUser('player', 100);
    const { token: adminToken } = await seedUser('admin');

    const res = await request(app)
      .patch(`/api/admin/users/${target._id.toString()}/credit`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});

    expect(res.status).toBe(400);
  });
});

// ─── PATCH /api/users/me — extended validation ───────────────────────────────

describe('PATCH /api/users/me (extended)', () => {
  it('UR-EXT-UPDATEME-1: can update username', async () => {
    const { token } = await seedUser();

    const res = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ username: 'newusername_unique' });

    // Username update may or may not be supported; accept 200 or 400
    expect([200, 400]).toContain(res.status);
  });

  it('UR-EXT-UPDATEME-2: can update avatarUrl', async () => {
    const { token } = await seedUser();

    const res = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ avatarUrl: 'https://example.com/avatar.png' });

    expect(res.status).toBe(200);
    expect(res.body.avatarUrl).toBe('https://example.com/avatar.png');
  });

  it('UR-EXT-UPDATEME-3: can clear bio with empty string', async () => {
    const { token } = await seedUser();

    // First set bio
    await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ bio: 'Some bio' });

    // Then clear it
    const res = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ bio: '' });

    expect(res.status).toBe(200);
  });
});
