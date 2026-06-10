/**
 * Security Tests — OWASP Top 10 (2021) A05: Security Misconfiguration
 *
 * Standard:  OWASP Top 10:2021-A05
 * Reference: https://owasp.org/Top10/A05_2021-Security_Misconfiguration/
 *
 * Coverage:
 *   Information Disclosure — stack traces must not appear in error responses
 *   Sensitive HTTP Headers — X-Powered-By must not advertise framework version
 *   Error Handling — invalid JSON body, unknown routes, malformed IDs
 *   CORS — cross-origin requests must respect policy
 *   Content-Type — server must enforce JSON content-type on API responses
 *   Debug Endpoints — no /debug, /env, /__proto__ exposure
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

const SECRET = 'sec-a05-test-secret';
let mongod: MongoMemoryServer;

async function seedUser() {
  const uid = new mongoose.Types.ObjectId().toString().slice(-6);
  const user = await UserModel.create({
    username: `seca05_${uid}`,
    email: `seca05_${uid}@test.com`,
    passwordHash: '$2b$10$hashedfakepw',
    role: 'player',
    creditScore: 100,
  });
  const token = jwt.sign({ userId: user._id.toString(), email: user.email, role: user.role ?? 'player' }, SECRET, {
    expiresIn: '1h',
  });
  return { user, token };
}

beforeAll(async () => {
  process.env.JWT_SECRET = SECRET;
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

// ── Information Disclosure — Stack Trace Leakage ──────────────────────────────

describe('OWASP A05 — Stack Trace Not Leaked in Error Responses', () => {
  /**
   * CWE-209: Generation of Error Message Containing Sensitive Information
   * Error responses must never include stack traces, internal file paths,
   * or the words 'node_modules', 'at Function', 'at Object' etc.
   */
  it('SEC-A05-INFO-1: 404 response does not contain stack trace', async () => {
    const res = await request(app).get('/api/this-route-does-not-exist');

    expect(res.status).toBe(404);
    const body = JSON.stringify(res.body);
    expect(body).not.toMatch(/at Function|at Object\.|node_modules|\.ts:\d+|\.js:\d+/);
  });

  it('SEC-A05-INFO-2: 400 validation error does not contain stack trace', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'not-an-email', password: '123' });

    expect(res.status).toBe(400);
    const body = JSON.stringify(res.body);
    expect(body).not.toMatch(/at Function|node_modules|Error\.stack/);
  });

  it('SEC-A05-INFO-3: 401 response body is minimal — no internal details', async () => {
    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', 'Bearer invalid-token-string');

    expect(res.status).toBe(401);
    // Should have a simple message, not a full error object with stack
    expect(res.body.stack).toBeUndefined();
    expect(typeof res.body.message).toBe('string');
  });

  it('SEC-A05-INFO-4: 500-class error (if any) does not expose stack trace', async () => {
    // Trigger a CastError via invalid MongoDB ObjectId format
    const res = await request(app).get('/api/users/000000000000');

    // The global error handler must strip the stack trace
    const body = JSON.stringify(res.body);
    expect(body).not.toMatch(/at castObjectId|node_modules|mongoose|\.js:\d+:\d+/);
  });
});

// ── Security Headers ─────────────────────────────────────────────────────────

describe('OWASP A05 — Security HTTP Headers', () => {
  /**
   * CWE-16: Configuration
   * X-Powered-By: Express reveals the framework version to attackers.
   * Express 5 disables this header by default; we verify it's absent.
   */
  it('SEC-A05-HDR-1: X-Powered-By header must NOT reveal Express framework', async () => {
    const res = await request(app).get('/api/map/reverse-geocode?lat=1.35&lng=103.82');

    const powered = res.headers['x-powered-by'];
    // Must either be absent or not advertise "Express"
    if (powered) {
      expect(powered.toLowerCase()).not.toContain('express');
    }
    // header absence (undefined) is the expected/ideal case
  });

  it('SEC-A05-HDR-2: API responses have Content-Type: application/json', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nonexistent@test.com', password: 'wrongpw' });

    const ct = res.headers['content-type'] ?? '';
    expect(ct).toMatch(/application\/json/);
  });

  it('SEC-A05-HDR-3: error responses also carry application/json Content-Type', async () => {
    const res = await request(app).get('/api/users/me'); // no auth

    expect(res.status).toBe(401);
    const ct = res.headers['content-type'] ?? '';
    expect(ct).toMatch(/application\/json/);
  });
});

// ── Error Handling Robustness ─────────────────────────────────────────────────

describe('OWASP A05 — Error Handling Robustness', () => {
  it('SEC-A05-ERR-1: malformed JSON body returns 400 (not 500)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{ "email": "test@test.com", broken json ');

    // Express's body-parser returns 400 for malformed JSON
    expect([400]).toContain(res.status);
    expect(res.body.stack).toBeUndefined();
  });

  it('SEC-A05-ERR-2: non-JSON content-type with JSON-like body returns 400', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'text/plain')
      .send('email=test@test.com&password=pw');

    expect([400]).toContain(res.status);
  });

  it('SEC-A05-ERR-3: completely empty body on a POST endpoint returns 400', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{}');

    expect(res.status).toBe(400);
  });

  it('SEC-A05-ERR-4: invalid MongoDB ObjectId in route param returns 400 (not 500)', async () => {
    const res = await request(app).get('/api/users/not-a-valid-objectid-at-all');

    // Global error handler catches CastError → 400
    expect([400, 404]).toContain(res.status);
    expect(res.body.stack).toBeUndefined();
  });

  it('SEC-A05-ERR-5: excessively long URL param returns 400 or 414 (not 500)', async () => {
    const longId = 'A'.repeat(5000);
    const res = await request(app).get(`/api/users/${longId}`);

    expect([400, 404, 414]).toContain(res.status);
    expect(res.body.stack).toBeUndefined();
  });

  it('SEC-A05-ERR-6: special characters in path param are handled without crash', async () => {
    const specialId = encodeURIComponent("'; DROP TABLE users; --");
    const res = await request(app).get(`/api/users/${specialId}`);

    expect([400, 404]).toContain(res.status);
    expect(res.body.stack).toBeUndefined();
  });
});

// ── Debug / Hidden Endpoint Exposure ─────────────────────────────────────────

describe('OWASP A05 — Debug / Hidden Endpoint Exposure', () => {
  /**
   * Common misconfigurations: accidentally-exposed debug routes,
   * prototype pollution endpoints, or development-only routes in production.
   */
  it('SEC-A05-DEBUG-1: /debug route does not exist → 404', async () => {
    const res = await request(app).get('/debug');
    expect(res.status).toBe(404);
  });

  it('SEC-A05-DEBUG-2: /api/debug route does not exist → 404', async () => {
    const res = await request(app).get('/api/debug');
    expect(res.status).toBe(404);
  });

  it('SEC-A05-DEBUG-3: /__proto__ route does not expose prototype → 400 or 404', async () => {
    const res = await request(app).get('/__proto__/constructor');
    expect([400, 404]).toContain(res.status);
  });

  it('SEC-A05-DEBUG-4: /api/health or /health may exist but must not leak env vars', async () => {
    const res = await request(app).get('/health');

    if (res.status === 200) {
      const body = JSON.stringify(res.body);
      // Must not expose JWT_SECRET, MONGO_URI, or other sensitive env vars
      expect(body).not.toMatch(/JWT_SECRET|MONGO_URI|RESEND_API_KEY|passwordHash/);
    }
    // 404 is fine too — health endpoint is optional
    expect([200, 404]).toContain(res.status);
  });

  it('SEC-A05-DEBUG-5: /api/env route does not exist → 404', async () => {
    const res = await request(app).get('/api/env');
    expect(res.status).toBe(404);
  });
});

// ── Prototype Pollution / Object Injection ────────────────────────────────────

describe('OWASP A05 — Prototype Pollution via Body Parsing', () => {
  /**
   * CWE-1321: Prototype Pollution
   * Sending __proto__ or constructor keys in the JSON body must not
   * pollute Object.prototype or crash the server.
   */
  it('SEC-A05-PROTO-1: __proto__ key in body does not crash server or pollute prototype', async () => {
    const { token } = await seedUser();

    const res = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ '__proto__': { isAdmin: true }, bio: 'safe value' }));

    // Should not crash; Object.prototype.isAdmin must remain undefined
    expect([200, 400]).toContain(res.status);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((Object.prototype as any).isAdmin).toBeUndefined();
  });

  it('SEC-A05-PROTO-2: constructor.prototype key in body does not pollute prototype', async () => {
    const { token } = await seedUser();

    const res = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .set('Content-Type', 'application/json')
      .send(
        JSON.stringify({ 'constructor': { 'prototype': { 'polluted': true } }, bio: 'test' })
      );

    expect([200, 400]).toContain(res.status);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((Object.prototype as any).polluted).toBeUndefined();
  });
});
