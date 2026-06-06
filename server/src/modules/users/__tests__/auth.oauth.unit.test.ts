import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupMongoMemory } from '../../../__tests__/helpers/setupMongoMemory';
import { UserModel } from '../DBSchemas/UserSchema';

setupMongoMemory();

/**
 * Tests for the Google OAuth strategy callback logic.
 * We extract the core logic into a testable function rather than invoking
 * Passport directly (which requires full HTTP context).
 */

// Replicate the strategy callback logic inline so we can unit-test it
async function handleGoogleOAuth(profile: {
  id: string;
  emails?: Array<{ value: string }>;
  displayName?: string;
  photos?: Array<{ value: string }>;
}): Promise<{ user: ReturnType<typeof UserModel.prototype.toObject> | null; error?: string }> {
  const email = profile.emails?.[0]?.value;
  if (!email) return { user: null, error: 'No email from Google' };

  let user = await UserModel.findOne({ googleId: profile.id });
  if (user) return { user: user.toObject() };

  user = await UserModel.findOneAndUpdate(
    { email },
    { $set: { googleId: profile.id } },
    { new: true }
  );
  if (user) return { user: user.toObject() };

  const baseUsername = (profile.displayName ?? (email.split('@')[0] ?? ''))
    .replace(/\s+/g, '_')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '');
  let username = baseUsername || `user_${Date.now()}`;
  const conflict = await UserModel.findOne({ username });
  if (conflict) username = `${username}_${Date.now()}`;

  const avatarUrl = profile.photos?.[0]?.value;
  user = await UserModel.create({
    googleId: profile.id,
    email,
    username,
    passwordHash: 'google_oauth_no_password',
    ...(avatarUrl ? { avatarUrl } : {}),
  });
  return { user: user.toObject() };
}

describe('Google OAuth strategy callback logic', () => {
  it('OAUTH-1: new Google user with no existing account → creates user and returns it', async () => {
    const { user, error } = await handleGoogleOAuth({
      id: 'google_abc123',
      emails: [{ value: 'alice@gmail.com' }],
      displayName: 'Alice Tan',
    });

    expect(error).toBeUndefined();
    expect(user).not.toBeNull();
    expect(user?.email).toBe('alice@gmail.com');
    expect(user?.googleId).toBe('google_abc123');
    expect(user?.username).toBe('alice_tan');
  });

  it('OAUTH-2: same email as existing password account → links googleId, returns existing user', async () => {
    // Pre-create user with email/password
    await UserModel.create({
      email: 'bob@gmail.com',
      username: 'bob_sg',
      passwordHash: 'hashed_password_123',
    });

    const { user, error } = await handleGoogleOAuth({
      id: 'google_bob_456',
      emails: [{ value: 'bob@gmail.com' }],
      displayName: 'Bob Lim',
    });

    expect(error).toBeUndefined();
    expect(user?.email).toBe('bob@gmail.com');
    expect(user?.googleId).toBe('google_bob_456');
    expect(user?.username).toBe('bob_sg');  // original username preserved
  });

  it('OAUTH-3: existing googleId → returns existing user without creating a duplicate', async () => {
    await UserModel.create({
      email: 'carol@gmail.com',
      username: 'carol_ww',
      passwordHash: 'google_oauth_no_password',
      googleId: 'google_carol_789',
    });

    const before = await UserModel.countDocuments({ email: 'carol@gmail.com' });

    const { user, error } = await handleGoogleOAuth({
      id: 'google_carol_789',
      emails: [{ value: 'carol@gmail.com' }],
      displayName: 'Carol Ng',
    });

    const after = await UserModel.countDocuments({ email: 'carol@gmail.com' });
    expect(error).toBeUndefined();
    expect(user?.googleId).toBe('google_carol_789');
    expect(after).toBe(before);  // no duplicate created
  });

  it('OAUTH-4: profile with no email → returns error', async () => {
    const { user, error } = await handleGoogleOAuth({ id: 'google_noemail' });
    expect(user).toBeNull();
    expect(error).toBeTruthy();
  });
});
