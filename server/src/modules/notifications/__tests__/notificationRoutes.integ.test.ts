/**
 * HTTP-layer integration tests for notification routes.
 * Covers:
 *   GET    /api/notifications           (list)
 *   GET    /api/notifications/unread-count
 *   PATCH  /api/notifications/:id/read  (mark one read)
 *   PATCH  /api/notifications/read-all  (mark all read)
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
import { UserModel } from '../../users/DBSchemas/UserSchema';
import { NotificationModel } from '../DBSchemas/NotificationSchema';

const SECRET = 'notif-route-test-secret';

let mongod: MongoMemoryServer;

beforeAll(async () => {
  process.env.JWT_SECRET = SECRET;
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

// ─── Seed helpers ─────────────────────────────────────────────────────────────

async function seedUser() {
  const uid = new mongoose.Types.ObjectId().toString().slice(-6);
  const user = await UserModel.create({
    username: `notif_${uid}`,
    email: `notif_${uid}@test.com`,
    passwordHash: '$2b$10$hashedfakepw',
    role: 'player',
    creditScore: 100,
  });
  const token = jwt.sign({ userId: user._id.toString(), email: user.email }, SECRET, { expiresIn: '1h' });
  return { user, token };
}

async function seedNotification(userId: string, overrides: { isRead?: boolean; type?: string } = {}) {
  return NotificationModel.create({
    recipientId: userId,
    type: overrides.type ?? 'MatchJoined',
    message: 'Test notification message',
    channel: 'in-app',
    isRead: overrides.isRead ?? false,
  });
}

// ─── GET /api/notifications ───────────────────────────────────────────────────

describe('GET /api/notifications', () => {
  it('NR-LIST-1: returns 200 with array of own notifications', async () => {
    const { user, token } = await seedUser();
    await seedNotification(user._id.toString());
    await seedNotification(user._id.toString());

    const res = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
  });

  it('NR-LIST-2: returns 200 with empty array when user has no notifications', async () => {
    const { token } = await seedUser();

    const res = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(0);
  });

  it('NR-LIST-3: does NOT return notifications belonging to other users', async () => {
    const { user: owner, token: ownerToken } = await seedUser();
    const { user: other } = await seedUser();
    await seedNotification(other._id.toString());

    const res = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    const ownerNotifs = res.body.filter(
      (n: { recipientId?: string }) => n.recipientId === owner._id.toString()
    );
    const otherNotifs = res.body.filter(
      (n: { recipientId?: string }) => n.recipientId === other._id.toString()
    );
    expect(otherNotifs.length).toBe(0);
    void ownerNotifs;
  });

  it('NR-LIST-4: returns 401 without auth', async () => {
    const res = await request(app).get('/api/notifications');
    expect(res.status).toBe(401);
  });
});

// ─── GET /api/notifications/unread-count ────────────────────────────────────

describe('GET /api/notifications/unread-count', () => {
  it('NR-UNREAD-1: returns correct count of unread notifications', async () => {
    const { user, token } = await seedUser();
    await seedNotification(user._id.toString(), { isRead: false });
    await seedNotification(user._id.toString(), { isRead: false });
    await seedNotification(user._id.toString(), { isRead: true });

    const res = await request(app)
      .get('/api/notifications/unread-count')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(typeof res.body.count).toBe('number');
    expect(res.body.count).toBeGreaterThanOrEqual(2);
  });

  it('NR-UNREAD-2: returns 0 when all notifications are read', async () => {
    const { user, token } = await seedUser();
    await seedNotification(user._id.toString(), { isRead: true });
    await seedNotification(user._id.toString(), { isRead: true });

    const res = await request(app)
      .get('/api/notifications/unread-count')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(0);
  });

  it('NR-UNREAD-3: returns 401 without auth', async () => {
    const res = await request(app).get('/api/notifications/unread-count');
    expect(res.status).toBe(401);
  });
});

// ─── PATCH /api/notifications/:id/read ───────────────────────────────────────

describe('PATCH /api/notifications/:id/read', () => {
  it('NR-READ-1: marks a single notification as read', async () => {
    const { user, token } = await seedUser();
    const notif = await seedNotification(user._id.toString(), { isRead: false });

    const res = await request(app)
      .patch(`/api/notifications/${notif._id.toString()}/read`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const updated = await NotificationModel.findById(notif._id);
    expect(updated?.isRead).toBe(true);
  });

  it('NR-READ-2: already-read notification can be marked read again without error', async () => {
    const { user, token } = await seedUser();
    const notif = await seedNotification(user._id.toString(), { isRead: true });

    const res = await request(app)
      .patch(`/api/notifications/${notif._id.toString()}/read`)
      .set('Authorization', `Bearer ${token}`);

    expect([200, 404]).toContain(res.status);
  });

  it('NR-READ-3: marking another user notification is a no-op (route returns 200 but notification stays unread)', async () => {
    const { user: owner } = await seedUser();
    const { token: otherToken } = await seedUser();
    const notif = await seedNotification(owner._id.toString(), { isRead: false });

    const res = await request(app)
      .patch(`/api/notifications/${notif._id.toString()}/read`)
      .set('Authorization', `Bearer ${otherToken}`);

    // Route silently ignores when recipientId doesn't match — always 200
    expect(res.status).toBe(200);
    // The original notification should remain unread (query filtered by recipientId)
    const unchanged = await NotificationModel.findById(notif._id);
    expect(unchanged?.isRead).toBe(false);
  });

  it('NR-READ-4: non-existent notification id is a no-op — returns 200 (not 404)', async () => {
    const { token } = await seedUser();
    const fakeId = new mongoose.Types.ObjectId().toString();

    const res = await request(app)
      .patch(`/api/notifications/${fakeId}/read`)
      .set('Authorization', `Bearer ${token}`);

    // Route uses findOneAndUpdate without checking result — always returns 200
    expect(res.status).toBe(200);
  });

  it('NR-READ-5: returns 401 without auth', async () => {
    const { user } = await seedUser();
    const notif = await seedNotification(user._id.toString());

    const res = await request(app).patch(`/api/notifications/${notif._id.toString()}/read`);
    expect(res.status).toBe(401);
  });
});

// ─── PATCH /api/notifications/read-all ───────────────────────────────────────

describe('PATCH /api/notifications/read-all', () => {
  it('NR-READALL-1: marks all user notifications as read', async () => {
    const { user, token } = await seedUser();
    await seedNotification(user._id.toString(), { isRead: false });
    await seedNotification(user._id.toString(), { isRead: false });
    await seedNotification(user._id.toString(), { isRead: false });

    const res = await request(app)
      .patch('/api/notifications/read-all')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const unread = await NotificationModel.countDocuments({
      recipientId: user._id.toString(),
      isRead: false,
    });
    expect(unread).toBe(0);
  });

  it('NR-READALL-2: does NOT mark other users notifications as read', async () => {
    const { token: userAToken } = await seedUser();
    const { user: userB } = await seedUser();
    await seedNotification(userB._id.toString(), { isRead: false });

    await request(app)
      .patch('/api/notifications/read-all')
      .set('Authorization', `Bearer ${userAToken}`);

    const userBUnread = await NotificationModel.countDocuments({
      recipientId: userB._id.toString(),
      isRead: false,
    });
    expect(userBUnread).toBe(1);
  });

  it('NR-READALL-3: succeeds even when user has zero notifications', async () => {
    const { token } = await seedUser();

    const res = await request(app)
      .patch('/api/notifications/read-all')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
  });

  it('NR-READALL-4: returns 401 without auth', async () => {
    const res = await request(app).patch('/api/notifications/read-all');
    expect(res.status).toBe(401);
  });
});
