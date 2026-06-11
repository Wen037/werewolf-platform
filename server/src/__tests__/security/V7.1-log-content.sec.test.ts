/**
 * OWASP ASVS V7.1 — Log Content.
 * Credentials, OTPs and JWTs must never be written to server logs.
 * Captures everything written to stdout/stderr (morgan + console.*) while
 * driving the auth flows over HTTP, then asserts no secret material appears.
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';

vi.mock('../../shared/infra/passport', () => {
  const passport = {
    initialize: () => (_req: unknown, _res: unknown, next: () => void) => next(),
    authenticate: () => (_req: unknown, _res: unknown, next: () => void) => next(),
    use: () => {},
    serializeUser: () => {},
    deserializeUser: () => {},
  };
  return { default: passport };
});

vi.mock('../../shared/infra/email', () => ({
  sendOtpEmail: vi.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
  sendBookingInquiryEmail: vi.fn().mockResolvedValue(undefined),
}));

process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret-log-suite';

import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../../app';
import { PendingRegistrationModel } from '../../modules/users/DBSchemas/PendingRegistrationSchema';

let mongod: MongoMemoryServer;
const captured: string[] = [];

const origStdout = process.stdout.write.bind(process.stdout);
const origStderr = process.stderr.write.bind(process.stderr);

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());

  // Capture morgan (writes to stdout) and console.* (stdout/stderr)
  process.stdout.write = ((chunk: string | Uint8Array, ...args: unknown[]) => {
    captured.push(String(chunk));
    return origStdout(chunk as never, ...(args as never[]));
  }) as typeof process.stdout.write;
  process.stderr.write = ((chunk: string | Uint8Array, ...args: unknown[]) => {
    captured.push(String(chunk));
    return origStderr(chunk as never, ...(args as never[]));
  }) as typeof process.stderr.write;
});

afterAll(async () => {
  process.stdout.write = origStdout;
  process.stderr.write = origStderr;
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(() => {
  captured.length = 0;
});

const PASSWORD = 'SuperSecretPwd!2026';

function logText(): string {
  return captured.join('');
}

describe('ASVS V7.1 — no secrets in server logs', () => {
  it('LOG-1: register flow never logs the password or the OTP', async () => {
    const email = 'logtest1@test.com';
    await request(app)
      .post('/api/auth/register')
      .send({ email, username: 'logtest_user1', password: PASSWORD });

    const pending = await PendingRegistrationModel.findOne({ email });
    expect(pending).not.toBeNull();

    const logs = logText();
    expect(logs).not.toContain(PASSWORD);
    expect(logs).not.toContain(pending!.otp);
    expect(logs).not.toContain(pending!.passwordHash);
  });

  it('LOG-2: login flow (success + failure) never logs credentials or the JWT', async () => {
    const email = 'logtest2@test.com';
    await request(app)
      .post('/api/auth/register')
      .send({ email, username: 'logtest_user2', password: PASSWORD });
    const pending = await PendingRegistrationModel.findOne({ email });
    const verify = await request(app)
      .post('/api/auth/verify-otp')
      .send({ email, otp: pending!.otp });
    const token: string = verify.body.token;
    expect(token).toBeTruthy();

    captured.length = 0; // only inspect logs from the login calls onward

    await request(app).post('/api/auth/login').send({ email, password: PASSWORD });
    await request(app).post('/api/auth/login').send({ email, password: 'WrongPass123!' });
    await request(app).get('/api/users/me').set('Authorization', `Bearer ${token}`);

    const logs = logText();
    expect(logs).not.toContain(PASSWORD);
    expect(logs).not.toContain('WrongPass123!');
    expect(logs).not.toContain(token);
  });

  it('LOG-3: request lines do not contain query-string credentials (no GET-with-password routes)', async () => {
    // Defense-in-depth: even if a client wrongly sends credentials in the URL,
    // morgan would log them — assert our auth routes reject GET outright
    const res = await request(app).get(`/api/auth/login?password=${PASSWORD}`);
    expect([404, 405]).toContain(res.status);
  });
});
