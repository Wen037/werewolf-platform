import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupMongoMemory } from '../../../__tests__/helpers/setupMongoMemory';
import { createTestUser } from '../../../__tests__/helpers/createTestUser';
import { UserService } from '../coreLogic/UserService';
import { UserModel } from '../DBSchemas/UserSchema';
import { PendingRegistrationModel } from '../DBSchemas/PendingRegistrationSchema';
import { UserFollowModel } from '../DBSchemas/UserFollowSchema';

// Mock email so OTP tests don't call external service
vi.mock('../../../shared/infra/email', () => ({
  sendOtpEmail: vi.fn().mockResolvedValue(undefined),
}));

setupMongoMemory();

const svc = new UserService();

beforeEach(async () => {
  process.env.JWT_SECRET = 'test-secret';
  process.env.JWT_EXPIRES_IN = '7d';
});

// ─── initiateRegister ─────────────────────────────────────────────────────────

describe('UserService — initiateRegister', () => {
  it('US-REG-1: creates PendingRegistration with hashed password and 6-digit OTP', async () => {
    const result = await svc.initiateRegister({
      username: 'newuser',
      email: 'new@test.com',
      password: 'Password123!',
    });

    expect(result.isSuccess).toBe(true);
    const pending = await PendingRegistrationModel.findOne({ email: 'new@test.com' });
    expect(pending).not.toBeNull();
    expect(pending!.passwordHash).not.toBe('Password123!');
    expect(pending!.otp).toMatch(/^\d{6}$/);
  });

  it('US-REG-2: returns failure when email already exists in UserModel', async () => {
    await createTestUser({ email: 'taken@test.com' });

    const result = await svc.initiateRegister({
      username: 'uniqueuser',
      email: 'taken@test.com',
      password: 'Password123!',
    });

    expect(result.isFailure).toBe(true);
    expect(result.getError()).toMatch(/email already registered/i);
  });

  it('US-REG-3: returns failure when username is already taken', async () => {
    await createTestUser({ username: 'taken_name' });

    const result = await svc.initiateRegister({
      username: 'taken_name',
      email: 'unique@test.com',
      password: 'Password123!',
    });

    expect(result.isFailure).toBe(true);
    expect(result.getError()).toMatch(/username already taken/i);
  });

  it('US-REG-4: returns failure when sendOtpEmail throws (email service down)', async () => {
    const { sendOtpEmail } = await import('../../../shared/infra/email');
    vi.mocked(sendOtpEmail).mockRejectedValueOnce(new Error('SMTP down'));

    const result = await svc.initiateRegister({
      username: 'emailfail',
      email: 'emailfail@test.com',
      password: 'Password123!',
    });

    expect(result.isFailure).toBe(true);
    expect(result.getError()).toMatch(/failed to send/i);
  });
});

// ─── verifyOtp ────────────────────────────────────────────────────────────────

describe('UserService — verifyOtp', () => {
  async function seedPending(email = 'otp@test.com', otp = '123456', expired = false) {
    const expiresAt = expired
      ? new Date(Date.now() - 60_000)
      : new Date(Date.now() + 10 * 60_000);
    await PendingRegistrationModel.create({
      email,
      username: 'otpuser',
      passwordHash: '$2b$10$fakehash',
      otp,
      expiresAt,
    });
  }

  it('US-OTP-1: creates User, deletes PendingRegistration, and returns JWT + user DTO', async () => {
    await seedPending('verify@test.com', '654321');

    const result = await svc.verifyOtp({ email: 'verify@test.com', otp: '654321' });

    expect(result.isSuccess).toBe(true);
    const dto = result.getValue();
    expect(dto.token).toBeTruthy();
    expect(dto.user.email).toBe('verify@test.com');
    expect(dto.user.creditScore).toBe(100);
    const pending = await PendingRegistrationModel.findOne({ email: 'verify@test.com' });
    expect(pending).toBeNull();
  });

  it('US-OTP-2: returns failure on wrong OTP code', async () => {
    await seedPending('wrong@test.com', '111111');

    const result = await svc.verifyOtp({ email: 'wrong@test.com', otp: '999999' });
    expect(result.isFailure).toBe(true);
    expect(result.getError()).toMatch(/invalid/i);
  });

  it('US-OTP-3: returns failure when OTP is expired', async () => {
    await seedPending('expired@test.com', '222222', true);

    const result = await svc.verifyOtp({ email: 'expired@test.com', otp: '222222' });
    expect(result.isFailure).toBe(true);
    expect(result.getError()).toMatch(/expired/i);
  });

  it('US-OTP-4: returns failure when no pending registration found', async () => {
    const result = await svc.verifyOtp({ email: 'nobody@test.com', otp: '000000' });
    expect(result.isFailure).toBe(true);
  });
});

// ─── login ────────────────────────────────────────────────────────────────────

describe('UserService — login', () => {
  it('US-LOGIN-1: returns JWT and user DTO on valid credentials', async () => {
    // Create user with known bcrypt hash for "Password123!"
    const bcrypt = await import('bcryptjs');
    const hash = await bcrypt.hash('Password123!', 10);
    await UserModel.create({
      username: 'loginuser',
      email: 'login@test.com',
      passwordHash: hash,
    });

    const result = await svc.login({ email: 'login@test.com', password: 'Password123!' });

    expect(result.isSuccess).toBe(true);
    expect(result.getValue().token).toBeTruthy();
    expect(result.getValue().user.email).toBe('login@test.com');
  });

  it('US-LOGIN-2: returns failure on wrong password', async () => {
    const bcrypt = await import('bcryptjs');
    const hash = await bcrypt.hash('CorrectPass!', 10);
    await UserModel.create({ username: 'wrongpass', email: 'wrongpass@test.com', passwordHash: hash });

    const result = await svc.login({ email: 'wrongpass@test.com', password: 'WrongPass!' });
    expect(result.isFailure).toBe(true);
  });

  it('US-LOGIN-3: returns failure on unknown email', async () => {
    const result = await svc.login({ email: 'ghost@test.com', password: 'anything' });
    expect(result.isFailure).toBe(true);
  });
});

// ─── followUser / unfollowUser ────────────────────────────────────────────────

describe('UserService — followUser / unfollowUser', () => {
  it('US-FOLLOW-1: increments followingCount and followersCount on both users', async () => {
    const follower = await createTestUser();
    const target = await createTestUser();

    await svc.followUser(follower._id.toString(), target._id.toString());

    const updatedFollower = await UserModel.findById(follower._id);
    const updatedTarget = await UserModel.findById(target._id);
    expect(updatedFollower?.followingCount).toBe(1);
    expect(updatedTarget?.followersCount).toBe(1);
  });

  it('US-FOLLOW-2: returns failure when trying to follow yourself', async () => {
    const user = await createTestUser();
    const result = await svc.followUser(user._id.toString(), user._id.toString());
    expect(result.isFailure).toBe(true);
    expect(result.getError()).toMatch(/cannot follow yourself/i);
  });

  it('US-FOLLOW-3: returns failure on duplicate follow', async () => {
    const follower = await createTestUser();
    const target = await createTestUser();

    await svc.followUser(follower._id.toString(), target._id.toString());
    const result = await svc.followUser(follower._id.toString(), target._id.toString());

    expect(result.isFailure).toBe(true);
    expect(result.getError()).toMatch(/already following/i);
  });

  it('US-UNFOLLOW-1: decrements both counts on successful unfollow', async () => {
    const follower = await createTestUser();
    const target = await createTestUser();

    await svc.followUser(follower._id.toString(), target._id.toString());
    await svc.unfollowUser(follower._id.toString(), target._id.toString());

    const updatedFollower = await UserModel.findById(follower._id);
    const updatedTarget = await UserModel.findById(target._id);
    expect(updatedFollower?.followingCount).toBe(0);
    expect(updatedTarget?.followersCount).toBe(0);
    const follow = await UserFollowModel.findOne({ followerId: follower._id, followingId: target._id });
    expect(follow).toBeNull();
  });
});
