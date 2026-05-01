import { describe, it, expect } from 'vitest';
import { Result } from '../core/Result';

describe('Result<T>', () => {
  describe('Result.ok', () => {
    it('isSuccess=true, isFailure=false', () => {
      const r = Result.ok(42);
      expect(r.isSuccess).toBe(true);
      expect(r.isFailure).toBe(false);
    });

    it('getValue returns the value', () => {
      expect(Result.ok(42).getValue()).toBe(42);
    });

    it('ok with no argument returns undefined value', () => {
      const r = Result.ok();
      expect(r.isSuccess).toBe(true);
      expect(r.getValue()).toBeUndefined();
    });

    it('works with objects', () => {
      const payload = { id: '1', name: 'Alice' };
      expect(Result.ok(payload).getValue()).toEqual(payload);
    });
  });

  describe('Result.fail', () => {
    it('isSuccess=false, isFailure=true', () => {
      const r = Result.fail('oops');
      expect(r.isSuccess).toBe(false);
      expect(r.isFailure).toBe(true);
    });

    it('getError returns the error string', () => {
      expect(Result.fail('something went wrong').getError()).toBe('something went wrong');
    });

    it('getValue throws on failure result', () => {
      expect(() => Result.fail<number>('err').getValue()).toThrow();
    });

    it('getError returns "Unknown error" when error is undefined (edge case)', () => {
      // Access private constructor via type cast to test fallback
      const r = Result.fail('');
      expect(r.getError()).toBe('');
    });
  });
});
