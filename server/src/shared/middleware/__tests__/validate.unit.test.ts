import { describe, it, expect, vi } from 'vitest';
import { validate } from '../validate';
import { CreateMatchSchema } from '../../../modules/matches/DTOs/MatchDTOs';
import { RegisterSchema } from '../../../modules/users/DTOs/UserDTOs';
import type { Request, Response, NextFunction } from 'express';

function makeReq(body: unknown): Request {
  return { body } as unknown as Request;
}

function makeRes() {
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  return { status, json } as unknown as Response;
}

function makeNext(): NextFunction {
  return vi.fn() as unknown as NextFunction;
}

const validMatchBody = {
  venue_id: 'a'.repeat(24),
  title: 'Test Game',
  scheduledAt: new Date(Date.now() + 86_400_000).toISOString(),
  min_pax: 4,
  max_pax: 12,
};

describe('validate middleware', () => {
  it('VAL-MW-1: calls next() and replaces req.body with parsed data on valid input', () => {
    const req = makeReq({ ...validMatchBody });
    const res = makeRes();
    const next = makeNext();

    validate(CreateMatchSchema)(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.body.title).toBe('Test Game');
    expect(req.body.venue_id).toBe('a'.repeat(24));
  });

  it('VAL-MW-2: returns 400 with Zod error shape when required field is missing', () => {
    const req = makeReq({ ...validMatchBody, title: undefined });
    const res = makeRes();
    const next = makeNext();

    validate(CreateMatchSchema)(req, res, next);

    expect((res as unknown as { status: ReturnType<typeof vi.fn> }).status).toHaveBeenCalledWith(400);
    const call = (res as unknown as { status: ReturnType<typeof vi.fn> }).status.mock.results[0]!.value;
    expect(call.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Validation error', errors: expect.anything() })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('VAL-MW-3: returns 400 with field-level error path on invalid type', () => {
    const req = makeReq({ ...validMatchBody, min_pax: 'four' });
    const res = makeRes();
    const next = makeNext();

    validate(CreateMatchSchema)(req, res, next);

    expect((res as unknown as { status: ReturnType<typeof vi.fn> }).status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('VAL-MW-4: strips unknown extra fields from req.body (Zod strip mode)', () => {
    const req = makeReq({ ...validMatchBody, hackerField: 'x' });
    const res = makeRes();
    const next = makeNext();

    validate(CreateMatchSchema)(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect((req.body as Record<string, unknown>)['hackerField']).toBeUndefined();
  });

  it('VAL-MW-5: returns 400 when max_pax < min_pax (refine rule violation)', () => {
    const req = makeReq({ ...validMatchBody, min_pax: 10, max_pax: 4 });
    const res = makeRes();
    const next = makeNext();

    validate(CreateMatchSchema)(req, res, next);

    expect((res as unknown as { status: ReturnType<typeof vi.fn> }).status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('VAL-MW-6: returns 400 when email is malformed (RegisterSchema)', () => {
    const req = makeReq({ username: 'testuser', email: 'not-an-email', password: 'Password123!' });
    const res = makeRes();
    const next = makeNext();

    validate(RegisterSchema)(req, res, next);

    expect((res as unknown as { status: ReturnType<typeof vi.fn> }).status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });
});
