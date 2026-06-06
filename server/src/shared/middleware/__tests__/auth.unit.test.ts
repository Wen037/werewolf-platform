import { describe, it, expect, vi, beforeAll } from 'vitest';
import jwt from 'jsonwebtoken';
import { requireAuth, optionalAuth } from '../auth';
import type { Request, Response, NextFunction } from 'express';

const SECRET = 'test-secret-key-for-unit-tests';

beforeAll(() => {
  process.env.JWT_SECRET = SECRET;
});

function makeReq(authorization?: string): Request {
  return { headers: { authorization } } as unknown as Request;
}

function makeRes() {
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  return { status, json, _json: json } as unknown as Response & { status: typeof status; _json: typeof json };
}

function makeNext(): NextFunction {
  return vi.fn() as unknown as NextFunction;
}

function validToken(userId = 'user123', email = 'test@test.com'): string {
  return jwt.sign({ userId, email }, SECRET, { expiresIn: '1h' });
}

// ─── requireAuth ────────────────────────────────────────────────────────────

describe('requireAuth middleware', () => {
  it('AUTH-MW-1: calls next() and populates req.user when valid Bearer token provided', () => {
    const req = makeReq(`Bearer ${validToken()}`);
    const res = makeRes();
    const next = makeNext();

    requireAuth(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect((req as unknown as { user: { userId: string } }).user.userId).toBe('user123');
  });

  it('AUTH-MW-2: returns 401 when Authorization header is missing', () => {
    const req = makeReq(undefined);
    const res = makeRes();
    const next = makeNext();

    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('AUTH-MW-3: returns 401 when header does not start with "Bearer "', () => {
    const req = makeReq('Basic sometoken');
    const res = makeRes();
    const next = makeNext();

    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('AUTH-MW-4: returns 401 when token is signed with wrong secret', () => {
    const badToken = jwt.sign({ userId: 'x', email: 'x@x.com' }, 'wrong-secret');
    const req = makeReq(`Bearer ${badToken}`);
    const res = makeRes();
    const next = makeNext();

    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('AUTH-MW-5: returns 401 when token is expired', () => {
    const expired = jwt.sign({ userId: 'x', email: 'x@x.com' }, SECRET, { expiresIn: '-1s' });
    const req = makeReq(`Bearer ${expired}`);
    const res = makeRes();
    const next = makeNext();

    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});

// ─── optionalAuth ────────────────────────────────────────────────────────────

describe('optionalAuth middleware', () => {
  it('AUTH-MW-6: calls next() and sets req.user when valid token provided', () => {
    const req = makeReq(`Bearer ${validToken('user456')}`);
    const res = makeRes();
    const next = makeNext();

    optionalAuth(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect((req as unknown as { user: { userId: string } }).user.userId).toBe('user456');
  });

  it('AUTH-MW-7: calls next() without setting req.user when no header present', () => {
    const req = makeReq(undefined);
    const res = makeRes();
    const next = makeNext();

    optionalAuth(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect((req as unknown as { user?: unknown }).user).toBeUndefined();
  });

  it('AUTH-MW-8: calls next() without 401 when token is invalid (optionalAuth swallows error)', () => {
    const req = makeReq('Bearer totally.invalid.token');
    const res = makeRes();
    const next = makeNext();

    optionalAuth(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
    expect((req as unknown as { user?: unknown }).user).toBeUndefined();
  });
});
