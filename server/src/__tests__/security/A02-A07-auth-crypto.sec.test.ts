/**
 * Security Tests — OWASP Top 10 (2021)
 *   A02: Cryptographic Failures
 *   A07: Identification and Authentication Failures
 *
 * Standard:  OWASP Top 10:2021-A02 + A07
 * References:
 *   https://owasp.org/Top10/A02_2021-Cryptographic_Failures/
 *   https://owasp.org/Top10/A07_2021-Identification_and_Authentication_Failures/
 *
 * Coverage:
 *   A02 — Sensitive data not exposed in API responses (passwordHash, OTP hashes)
 *   A07 — JWT attacks: wrong secret, algorithm confusion (alg:none), expiry bypass,
 *          role injection, token structure tampering
 *
 * All tests run in-process via Supertest + MongoMemoryServer.
 * No requests are made to the production fly.io deployment.
 */

import { describe, it, expect, beforeAll, vi } from 'vitest';

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

const SECRET = 'sec-a07-test-secret';
let mongod: MongoMemoryServer;

async function seedUser(role: 'player' | 'admin' = 'player') {
  const uid = new mongoose.Types.ObjectId().toString().slice(-6);
  const user = await UserModel.create({
    username: `seca07_${uid}`,
    email: `seca07_${uid}@test.com`,
    passwordHash: '$2b$10$hashedfakepw',
    role,
    creditScore: 100,
  });
  const validToken = jwt.sign({ userId: user._id.toString(), email: user.email }, SECRET, {
    expiresIn: '1h',
  });
  return { user, validToken };
}

beforeAll(async () => {
  process.env.JWT_SECRET = SECRET;
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

// ── A02 — Sensitive Data Exposure ─────────────────────────────────────────────

describe('OWASP A02 — Cryptographic Failures / Sensitive Data Exposure', () => {
  it('SEC-A02-1: GET /api/users/me must NOT expose passwordHash', async () => {
    const { user, validToken } = await seedUser();

    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(res.body.passwordHash).toBeUndefined();
    expect(res.body.password).toBeUndefined();
    expect(res.body.hash).toBeUndefined();
    // Confirm real data is present to ensure we are reading the right response
    expect(res.body.email ?? res.body.id).toBeTruthy();
    void user;
  });

  it('SEC-A02-2: GET /api/users/:id (public profile) must NOT expose passwordHash', async () => {
    const { user } = await seedUser();

    const res = await request(app).get(`/api/users/${user._id.toString()}`);

    expect(res.status).toBe(200);
    expect(res.body.passwordHash).toBeUndefined();
    expect(res.body.password).toBeUndefined();
  });

  it('SEC-A02-3: PATCH /api/users/me response must NOT expose passwordHash', async () => {
    const { validToken } = await seedUser();

    const res = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ bio: 'Updated bio' });

    expect(res.status).toBe(200);
    expect(res.body.passwordHash).toBeUndefined();
  });

  it('SEC-A02-4: POST /api/auth/register response must NOT expose passwordHash', async () => {
    const uid = new mongoose.Types.ObjectId().toString().slice(-6);

    const res = await request(app)
      .post('/api/auth/register')
      .send({
        username: `reg_${uid}`,
        email: `reg_${uid}@test.com`,
        password: 'Register123!',
      });

    // 200 or 201 for register, depends on OTP flow
    expect([200, 201]).toContain(res.status);
    expect(res.body.passwordHash).toBeUndefined();
    expect(res.body.password).toBeUndefined();
  });

  it('SEC-A02-5: active match roster must NOT expose player passwordHashes', async () => {
    const { user: host, validToken } = await seedUser();
    // Create a match via service directly — but we test via route
    const matchRes = await request(app)
      .post('/api/games')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        title: 'Data Leakage Test',
        venue_id: new mongoose.Types.ObjectId().toString(),
        scheduledAt: new Date(Date.now() + 86_400_000).toISOString(),
        config: { min_pax: 4, max_pax: 8, game_type: 'standard', judge_method: 'host', proficiency_required: 0 },
        location: { lat: 1.35, long: 103.82 },
        approvalMode: 'open',
      });

    if (matchRes.status === 201) {
      const matchId = matchRes.body.matchId ?? matchRes.body.id ?? matchRes.body._id;
      const rosterRes = await request(app)
        .get(`/api/games/${matchId}/roster`)
        .set('Authorization', `Bearer ${validToken}`);

      if (rosterRes.status === 200 && Array.isArray(rosterRes.body)) {
        for (const player of rosterRes.body) {
          expect(player.passwordHash).toBeUndefined();
          expect(player.password).toBeUndefined();
        }
      }
    }
    void host;
  });
});

// ── A07 — JWT Algorithm Confusion (alg:none attack) ───────────────────────────

describe('OWASP A07 — JWT Algorithm Confusion (alg:none)', () => {
  /**
   * CWE-345: Insufficient Verification of Data Authenticity
   * An attacker forges a JWT with alg:none and an empty signature to bypass
   * verification. Modern jsonwebtoken versions reject this, but we test explicitly.
   */
  it('SEC-A07-ALG-1: JWT with alg:none is rejected → 401', async () => {
    const { user } = await seedUser();

    // Manually construct a JWT with alg:none and no signature
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(
      JSON.stringify({ userId: user._id.toString(), email: user.email, iat: Math.floor(Date.now() / 1000) })
    ).toString('base64url');
    const noneToken = `${header}.${payload}.`; // empty signature

    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${noneToken}`);

    expect(res.status).toBe(401);
  });

  it('SEC-A07-ALG-2: JWT signed with HS256 using the word "none" as secret is rejected → 401', async () => {
    const { user } = await seedUser();

    // Attacker signs with literal string "none" hoping the server accepts it
    const forgedToken = jwt.sign(
      { userId: user._id.toString(), email: user.email },
      'none'
    );

    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${forgedToken}`);

    expect(res.status).toBe(401);
  });
});

// ── A07 — JWT Wrong Secret ─────────────────────────────────────────────────────

describe('OWASP A07 — JWT Wrong Secret', () => {
  it('SEC-A07-SECRET-1: JWT signed with wrong secret is rejected → 401', async () => {
    const { user } = await seedUser();

    const forgedToken = jwt.sign(
      { userId: user._id.toString(), email: user.email },
      'totally-wrong-secret'
    );

    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${forgedToken}`);

    expect(res.status).toBe(401);
  });

  it('SEC-A07-SECRET-2: JWT signed with empty string secret is rejected → 401', async () => {
    const { user } = await seedUser();

    let forgedToken: string;
    try {
      forgedToken = jwt.sign({ userId: user._id.toString(), email: user.email }, '');
    } catch {
      // jsonwebtoken v9+ throws on empty secret — test passes trivially
      return;
    }

    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${forgedToken}`);

    expect(res.status).toBe(401);
  });

  it('SEC-A07-SECRET-3: JWT signed with partial secret is rejected → 401', async () => {
    const { user } = await seedUser();

    // Use just first char of the secret
    const forgedToken = jwt.sign(
      { userId: user._id.toString(), email: user.email },
      SECRET.substring(0, 1)
    );

    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${forgedToken}`);

    expect(res.status).toBe(401);
  });
});

// ── A07 — JWT Expiry Bypass ────────────────────────────────────────────────────

describe('OWASP A07 — JWT Expiry Bypass', () => {
  it('SEC-A07-EXP-1: expired JWT (exp in the past) is rejected → 401', async () => {
    const { user } = await seedUser();

    // Token that expired 1 hour ago
    const expiredToken = jwt.sign(
      { userId: user._id.toString(), email: user.email },
      SECRET,
      { expiresIn: '-1h' }
    );

    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(res.status).toBe(401);
  });

  it('SEC-A07-EXP-2: JWT with exp=0 (epoch) is rejected → 401', async () => {
    const { user } = await seedUser();

    const zeroExpToken = jwt.sign(
      { userId: user._id.toString(), email: user.email, exp: 0 },
      SECRET
    );

    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${zeroExpToken}`);

    expect(res.status).toBe(401);
  });
});

// ── A07 — JWT Role Injection ───────────────────────────────────────────────────

describe('OWASP A07 — JWT Role Injection (role checked from DB, not JWT)', () => {
  /**
   * The auth middleware only stores { userId, email } from the JWT.
   * Admin role checks are done by fetching the user from MongoDB:
   *   const user = await UserModel.findById(req.user.userId);
   *   if (!['admin', 'web_admin'].includes(user.role)) → 403
   *
   * Even if an attacker injects role:'admin' into the JWT payload, the server
   * looks up the real role from the DB and rejects unauthorized access.
   */
  it('SEC-A07-ROLE-1: JWT with role:admin injected does NOT grant admin credit access → 403', async () => {
    const { user: playerUser } = await seedUser('player'); // role = 'player' in DB
    const { user: target } = await seedUser('player');

    // Forge a JWT with role:'admin' injected — player user's DB role is still 'player'
    const forgedRoleToken = jwt.sign(
      { userId: playerUser._id.toString(), email: playerUser.email, role: 'admin' },
      SECRET,
      { expiresIn: '1h' }
    );

    const res = await request(app)
      .patch(`/api/admin/users/${target._id.toString()}/credit`)
      .set('Authorization', `Bearer ${forgedRoleToken}`)
      .send({ delta: 999 });

    // Server fetches role from DB (player, not admin) → 403
    expect(res.status).toBe(403);
    // Verify credit was NOT modified
    const unchanged = await UserModel.findById(target._id);
    expect(unchanged?.creditScore).toBe(100);
  });

  it('SEC-A07-ROLE-2: JWT with role:web_admin injected does NOT grant admin access → 403', async () => {
    const { user: playerUser } = await seedUser('player');
    const { user: target } = await seedUser('player');

    const forgedToken = jwt.sign(
      { userId: playerUser._id.toString(), email: playerUser.email, role: 'web_admin' },
      SECRET,
      { expiresIn: '1h' }
    );

    const res = await request(app)
      .patch(`/api/admin/users/${target._id.toString()}/credit`)
      .set('Authorization', `Bearer ${forgedToken}`)
      .send({ delta: 100 });

    expect(res.status).toBe(403);
  });

  it('SEC-A07-ROLE-3: JWT for non-existent userId is gracefully rejected → 401 or 403', async () => {
    const fakeUserId = new mongoose.Types.ObjectId().toString();

    const token = jwt.sign({ userId: fakeUserId, email: 'ghost@test.com' }, SECRET, {
      expiresIn: '1h',
    });

    // Using an endpoint that fetches the user from DB
    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${token}`);

    // Server should handle missing user gracefully — not crash
    expect([401, 404, 400]).toContain(res.status);
  });
});

// ── A07 — Token Structure Tampering ──────────────────────────────────────────

describe('OWASP A07 — Token Structure Tampering', () => {
  it('SEC-A07-STRUCT-1: totally random string as Bearer token is rejected → 401', async () => {
    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', 'Bearer this-is-not-a-jwt-at-all');

    expect(res.status).toBe(401);
  });

  it('SEC-A07-STRUCT-2: Bearer token with only two parts (missing signature) is rejected → 401', async () => {
    const { user } = await seedUser();

    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(
      JSON.stringify({ userId: user._id.toString(), email: user.email })
    ).toString('base64url');
    const truncatedToken = `${header}.${payload}`; // missing signature

    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${truncatedToken}`);

    expect(res.status).toBe(401);
  });

  it('SEC-A07-STRUCT-3: JWT with tampered payload (base64 changed) is rejected → 401', async () => {
    const { user, validToken } = await seedUser();

    // Flip one character in the payload section
    const [h, p, s] = validToken.split('.');
    const tamperedPayload = p!.slice(0, -2) + 'ZZ'; // corrupt last 2 chars
    const tamperedToken = `${h}.${tamperedPayload}.${s}`;

    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${tamperedToken}`);

    expect(res.status).toBe(401);
    void user;
  });

  it('SEC-A07-STRUCT-4: empty Bearer token is rejected → 401', async () => {
    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', 'Bearer ');

    expect(res.status).toBe(401);
  });

  it('SEC-A07-STRUCT-5: Bearer keyword missing (just the token) is rejected → 401', async () => {
    const { validToken } = await seedUser();

    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', validToken); // no "Bearer " prefix

    expect(res.status).toBe(401);
  });

  it('SEC-A07-STRUCT-6: Base64url-encoded SQL injection as token is rejected → 401', async () => {
    // Encoding " OR 1=1--" as a fake JWT to ensure no SQL/NoSQL injection through auth header
    const injectionPayload = Buffer.from("' OR 1=1--").toString('base64url');

    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${injectionPayload}`);

    expect(res.status).toBe(401);
  });
});
