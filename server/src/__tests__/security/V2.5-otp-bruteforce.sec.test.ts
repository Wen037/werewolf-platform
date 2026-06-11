/**
 * OWASP ASVS V2.5 — Credential Recovery / OTP hardening.
 * Registration OTP must be: attempt-capped, expiring, and single-use.
 * Service-level tests; the OTP is read from the pending-registration document
 * (email sending is mocked).
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('../../shared/infra/email', () => ({
  sendOtpEmail: vi.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
  sendBookingInquiryEmail: vi.fn().mockResolvedValue(undefined),
}));

process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret-otp-suite';

import { setupMongoMemory } from '../helpers/setupMongoMemory';
import { PendingRegistrationModel } from '../../modules/users/DBSchemas/PendingRegistrationSchema';
import { UserModel } from '../../modules/users/DBSchemas/UserSchema';
import { UserService } from '../../modules/users/coreLogic/UserService';

setupMongoMemory();

const service = new UserService();

let seq = 0;
async function startRegistration() {
  seq += 1;
  const email = `otp_target_${seq}@test.com`;
  const result = await service.initiateRegister({
    email,
    username: `otp_user_${seq}`,
    password: 'StrongPass123!',
  });
  expect(result.isSuccess).toBe(true);
  const pending = await PendingRegistrationModel.findOne({ email });
  return { email, otp: pending!.otp };
}

describe('ASVS V2.5 — OTP brute-force resistance', () => {
  it('OTP-1: wrong code rejected; correct code within attempt budget succeeds', async () => {
    const { email, otp } = await startRegistration();

    const wrong = await service.verifyOtp({ email, otp: '000000' });
    expect(wrong.isFailure).toBe(true);

    const right = await service.verifyOtp({ email, otp });
    expect(right.isSuccess).toBe(true);
    expect(await UserModel.findOne({ email })).not.toBeNull();
  });

  it('OTP-2: after 5 wrong guesses even the CORRECT code is rejected (registration invalidated)', async () => {
    const { email, otp } = await startRegistration();

    for (let i = 0; i < 5; i++) {
      const r = await service.verifyOtp({ email, otp: '000000' });
      expect(r.isFailure).toBe(true);
    }

    const lockedOut = await service.verifyOtp({ email, otp });
    expect(lockedOut.isFailure).toBe(true);
    expect(await UserModel.findOne({ email })).toBeNull();
    // Pending registration removed — guesses cannot continue
    expect(await PendingRegistrationModel.findOne({ email })).toBeNull();
  });

  it('OTP-3: expired code is rejected even when correct', async () => {
    const { email, otp } = await startRegistration();
    await PendingRegistrationModel.updateOne(
      { email },
      { $set: { expiresAt: new Date(Date.now() - 60_000) } }
    );

    const result = await service.verifyOtp({ email, otp });
    expect(result.isFailure).toBe(true);
    expect(result.getError()).toMatch(/expired/i);
  });

  it('OTP-4: OTP is single-use — second verification with the same code fails', async () => {
    const { email, otp } = await startRegistration();
    expect((await service.verifyOtp({ email, otp })).isSuccess).toBe(true);

    const replay = await service.verifyOtp({ email, otp });
    expect(replay.isFailure).toBe(true);
  });

  it('OTP-5: requesting a fresh OTP resets the attempt counter', async () => {
    const { email } = await startRegistration();

    // burn 4 attempts on the first OTP
    for (let i = 0; i < 4; i++) await service.verifyOtp({ email, otp: '000000' });

    // user re-registers → new OTP, counter must restart
    seq += 0;
    const again = await service.initiateRegister({
      email,
      username: `otp_user_${seq}`,
      password: 'StrongPass123!',
    });
    expect(again.isSuccess).toBe(true);
    const pending = await PendingRegistrationModel.findOne({ email });
    expect(pending!.attempts).toBe(0);

    // 4 more wrong guesses then the correct one — still inside the fresh budget
    for (let i = 0; i < 4; i++) await service.verifyOtp({ email, otp: '000000' });
    const right = await service.verifyOtp({ email, otp: pending!.otp });
    expect(right.isSuccess).toBe(true);
  });

  it('OTP-6: codes are 6-digit numeric (crypto.randomInt range)', async () => {
    const { otp } = await startRegistration();
    expect(otp).toMatch(/^\d{6}$/);
    expect(Number(otp)).toBeGreaterThanOrEqual(100000);
    expect(Number(otp)).toBeLessThan(1000000);
  });
});
