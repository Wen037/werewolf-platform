/**
 * HTTP-layer integration tests for user routes.
 * Uses supertest against the Express app with an in-memory MongoDB instance.
 */

import { describe, it, expect, beforeAll, vi } from 'vitest';

// Mock passport's Google OAuth strategy before app.ts loads it.
// passport.ts reads GOOGLE_CLIENT_ID at module-load time; without this mock,
// the OAuth2Strategy constructor throws if the env var is not set.
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

// Suppress external email calls
vi.mock('../../../shared/infra/email', () => ({
  sendOtpEmail: vi.fn().mockResolvedValue(undefined),
}));

import request from 'supertest';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../../../app';
import { UserModel } from '../DBSchemas/UserSchema';
import { PendingRegistrationModel } from '../DBSchemas/PendingRegistrationSchema';

const SECRET = 'user-route-test-secret';

let mongod: MongoMemoryServer;

beforeAll(async () => {
  process.env.JWT_SECRET = SECRET;

  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

// Helper: create user directly in DB and sign a token
async function seedUserWithToken(role: 'player' | 'admin' = 'player') {
  const uid = new mongoose.Types.ObjectId().toString().slice(-6);
  const user = await UserModel.create({
    username: `uroute_${uid}`,
    email: `uroute_${uid}@test.com`,
    passwordHash: '$2b$10$hashedfakepw',
    role,
    creditScore: 100,
  });
  const token = jwt.sign({ userId: user._id.toString(), email: user.email }, SECRET, { expiresIn: '1h' });
  return { user, token };
}

// ─── POST /api/auth/register ──────────────────────────────────────────────────

describe('POST /api/auth/register', () => {
  it('returns 200 and confirms OTP initiated when valid data provided', async () => {
    const uid = new mongoose.Types.ObjectId().toString().slice(-6);
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        username: `newusr_${uid}`,
        email: `newusr_${uid}@test.com`,
        password: 'Password123!',
      });

    expect(res.status).toBe(200);
    // Should indicate OTP was sent
    expect(res.body).toBeDefined();
  });

  it('returns 400 with validation error when email is malformed', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'gooduser',
        email: 'not-an-email',
        password: 'Password123!',
      });

    expect(res.status).toBe(400);
  });

  it('returns 400 when email already registered', async () => {
    const uid = new mongoose.Types.ObjectId().toString().slice(-6);
    // Seed user first
    await UserModel.create({
      username: `existing_${uid}`,
      email: `existing_${uid}@test.com`,
      passwordHash: '$2b$10$hashedfakepw',
      role: 'player',
      creditScore: 100,
    });

    const res = await request(app)
      .post('/api/auth/register')
      .send({
        username: `newname_${uid}`,
        email: `existing_${uid}@test.com`,
        password: 'Password123!',
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/email already registered/i);
  });
});

// ─── POST /api/auth/verify-otp ───────────────────────────────────────────────

describe('POST /api/auth/verify-otp', () => {
  it('returns 201 with a JWT token when OTP is correct', async () => {
    const uid = new mongoose.Types.ObjectId().toString().slice(-6);
    const email = `otp_${uid}@test.com`;
    // Seed PendingRegistration directly
    await PendingRegistrationModel.create({
      username: `otpuser_${uid}`,
      email,
      passwordHash: '$2b$10$hashedfakepw',
      otp: '123456',
      expiresAt: new Date(Date.now() + 600_000),
    });

    const res = await request(app)
      .post('/api/auth/verify-otp')
      .send({ email, otp: '123456' });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user).toBeDefined();
    expect(res.body.user.creditScore).toBe(100);
  });

  it('returns 400 when OTP is wrong', async () => {
    const uid = new mongoose.Types.ObjectId().toString().slice(-6);
    const email = `badotp_${uid}@test.com`;
    await PendingRegistrationModel.create({
      username: `badotpuser_${uid}`,
      email,
      passwordHash: '$2b$10$hashedfakepw',
      otp: '999999',
      expiresAt: new Date(Date.now() + 600_000),
    });

    const res = await request(app)
      .post('/api/auth/verify-otp')
      .send({ email, otp: '000000' });

    expect(res.status).toBe(400);
  });
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
  it('returns 200 with JWT when valid credentials provided', async () => {
    const bcrypt = await import('bcryptjs');
    const uid = new mongoose.Types.ObjectId().toString().slice(-6);
    const hash = await bcrypt.hash('Password123!', 10);
    await UserModel.create({
      username: `loginuser_${uid}`,
      email: `loginuser_${uid}@test.com`,
      passwordHash: hash,
      role: 'player',
      creditScore: 100,
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: `loginuser_${uid}@test.com`, password: 'Password123!' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
  });

  it('returns 401 when password is wrong', async () => {
    const bcrypt = await import('bcryptjs');
    const uid = new mongoose.Types.ObjectId().toString().slice(-6);
    const hash = await bcrypt.hash('RightPassword!', 10);
    await UserModel.create({
      username: `wrongpw_${uid}`,
      email: `wrongpw_${uid}@test.com`,
      passwordHash: hash,
      role: 'player',
      creditScore: 100,
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: `wrongpw_${uid}@test.com`, password: 'WrongPassword!' });

    expect(res.status).toBe(401);
  });
});

// ─── GET /api/users/me ────────────────────────────────────────────────────────

describe('GET /api/users/me', () => {
  it('returns 200 with profile when valid auth token provided', async () => {
    const { user, token } = await seedUserWithToken();

    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(user._id.toString());
    expect(res.body.username).toBe(user.username);
  });

  it('returns 401 when no token provided', async () => {
    const res = await request(app).get('/api/users/me');
    expect(res.status).toBe(401);
  });
});

// ─── PATCH /api/users/me ──────────────────────────────────────────────────────

describe('PATCH /api/users/me', () => {
  it('returns 200 and updates profile bio', async () => {
    const { token } = await seedUserWithToken();

    const res = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ bio: 'Updated bio text' });

    expect(res.status).toBe(200);
    expect(res.body.bio).toBe('Updated bio text');
  });

  it('does NOT update role when role field is sent (mass assignment guard)', async () => {
    const { user, token } = await seedUserWithToken('player');

    await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ role: 'admin' });

    // Verify role is unchanged in DB
    const dbUser = await UserModel.findById(user._id);
    expect(dbUser?.role).toBe('player');
  });
});

// ─── PATCH /admin/users/:id/credit — RBAC ────────────────────────────────────

describe('PATCH /api/admin/users/:id/credit (RBAC)', () => {
  it('returns 403 when a player-role user tries to adjust credit', async () => {
    const { user: target } = await seedUserWithToken('player');
    const { token: playerToken } = await seedUserWithToken('player');

    const res = await request(app)
      .patch(`/api/admin/users/${target._id.toString()}/credit`)
      .set('Authorization', `Bearer ${playerToken}`)
      .send({ delta: 10 });

    expect(res.status).toBe(403);
  });
});
