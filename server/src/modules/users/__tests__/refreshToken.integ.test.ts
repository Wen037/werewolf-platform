/**
 * Refresh-token rotation (OWASP ASVS V3 session management).
 * - login issues access JWT + refresh token
 * - /auth/refresh rotates: new pair issued, old refresh token revoked
 * - reuse of a rotated token revokes the user's whole token family
 * - logout revokes; expired tokens rejected
 */
import { describe, it, expect, vi, beforeAll } from 'vitest';

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

process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret-refresh-suite';

import request from 'supertest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { setupMongoMemory } from '../../../__tests__/helpers/setupMongoMemory';
import { app } from '../../../app';
import { UserModel } from '../DBSchemas/UserSchema';
import { RefreshTokenModel } from '../DBSchemas/RefreshTokenSchema';

setupMongoMemory();

const PASSWORD = 'RefreshPass123!';
let seq = 0;

async function loginNewUser() {
  seq += 1;
  const email = `refresh_${seq}@test.com`;
  await UserModel.create({
    username: `refresh_user_${seq}`,
    email,
    passwordHash: await bcrypt.hash(PASSWORD, 10),
    creditScore: 100,
  });
  const res = await request(app).post('/api/auth/login').send({ email, password: PASSWORD });
  expect(res.status).toBe(200);
  return res.body as { token: string; refreshToken: string; user: { id: string } };
}

describe('Refresh token rotation', () => {
  it('RT-1: login returns an access token AND a refresh token', async () => {
    const body = await loginNewUser();
    expect(body.token).toBeTruthy();
    expect(body.refreshToken).toMatch(/^[0-9a-f]{96}$/); // 48 random bytes hex

    // only the hash is persisted
    const stored = await RefreshTokenModel.findOne({ userId: body.user.id });
    expect(stored).not.toBeNull();
    expect(stored!.tokenHash).not.toBe(body.refreshToken);
  });

  it('RT-2: /auth/refresh rotates — new pair issued, old refresh token stops working', async () => {
    const { refreshToken } = await loginNewUser();

    const r1 = await request(app).post('/api/auth/refresh').send({ refreshToken });
    expect(r1.status).toBe(200);
    expect(r1.body.token).toBeTruthy();
    expect(r1.body.refreshToken).toBeTruthy();
    // note: the access JWT may be byte-identical if signed within the same
    // second as login (same payload + iat) — rotation applies to the refresh token
    expect(r1.body.refreshToken).not.toBe(refreshToken);

    // the new access token is a valid JWT for the same user
    const payload = jwt.verify(r1.body.token, process.env.JWT_SECRET!) as { userId: string };
    expect(payload.userId).toBe(r1.body.user.id);

    // old refresh token is now revoked
    const replay = await request(app).post('/api/auth/refresh').send({ refreshToken });
    expect(replay.status).toBe(401);
  });

  it('RT-3: reuse detection — replaying a rotated token revokes the whole family', async () => {
    const { refreshToken } = await loginNewUser();

    const r1 = await request(app).post('/api/auth/refresh').send({ refreshToken });
    const newest = r1.body.refreshToken as string;

    // attacker replays the OLD token → 401 + family revoked
    const replay = await request(app).post('/api/auth/refresh').send({ refreshToken });
    expect(replay.status).toBe(401);

    // the legitimate newest token is now also dead — user must re-login
    const victim = await request(app).post('/api/auth/refresh').send({ refreshToken: newest });
    expect(victim.status).toBe(401);
  });

  it('RT-4: logout revokes the refresh token', async () => {
    const { refreshToken } = await loginNewUser();

    const out = await request(app).post('/api/auth/logout').send({ refreshToken });
    expect(out.status).toBe(200);

    const after = await request(app).post('/api/auth/refresh').send({ refreshToken });
    expect(after.status).toBe(401);
  });

  it('RT-5: expired refresh token is rejected', async () => {
    const { refreshToken, user } = await loginNewUser();
    await RefreshTokenModel.updateMany(
      { userId: user.id },
      { $set: { expiresAt: new Date(Date.now() - 60_000) } }
    );

    const res = await request(app).post('/api/auth/refresh').send({ refreshToken });
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/expired/i);
  });

  it('RT-7: password reset revokes all outstanding refresh tokens', async () => {
    const { refreshToken, user } = await loginNewUser();
    const stored = await UserModel.findById(user.id);

    // request + perform a reset through the real flow
    await request(app).post('/api/auth/forgot-password').send({ email: stored!.email });
    const { PasswordResetModel } = await import('../DBSchemas/PasswordResetSchema');
    const reset = await PasswordResetModel.findOne({ email: stored!.email });
    const res = await request(app).post('/api/auth/reset-password').send({
      email: stored!.email,
      token: reset!.token,
      newPassword: 'BrandNewPass456!',
    });
    expect(res.status).toBe(200);

    // the pre-reset refresh token must now be dead
    const after = await request(app).post('/api/auth/refresh').send({ refreshToken });
    expect(after.status).toBe(401);
  });

  it('RT-6: garbage refresh token is rejected without information leak', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: 'f'.repeat(96) });
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalid/i);
  });
});
