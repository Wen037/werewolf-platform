import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Result } from '../../../shared/core/Result';
import { sendOtpEmail, sendPasswordResetEmail } from '../../../shared/infra/email';
import { eventBus } from '../../../shared/infra/EventBus';
import { UserModel, IUserDocument } from '../DBSchemas/UserSchema';
import { UserFollowModel } from '../DBSchemas/UserFollowSchema';
import { PendingRegistrationModel } from '../DBSchemas/PendingRegistrationSchema';
import { PasswordResetModel } from '../DBSchemas/PasswordResetSchema';
import { PROFICIENCY_TO_SKILL, SKILL_LEVEL_MAP, SkillLevel } from '../domain/User';
import {
  AuthResponseDTO,
  ForgotPasswordDTO,
  FullUserProfileResponseDTO,
  LoginDTO,
  RegisterDTO,
  ResetPasswordDTO,
  UpdateProfileDTO,
  UserResponseDTO,
  VerifyOtpDTO,
} from '../DTOs/UserDTOs';

function toUserResponseDTO(doc: IUserDocument): UserResponseDTO {
  const skillLevel = PROFICIENCY_TO_SKILL[doc.proficiency] ?? 'Beginner';
  return {
    id: doc._id.toString(),
    username: doc.username,
    email: doc.email,
    avatarUrl: doc.avatarUrl,
    role: (doc.role ?? 'player') as 'player' | 'admin' | 'web_admin',
    isVerified: doc.is_verified_creator,
    skillLevel,
    bio: doc.bio,
    contactNumber: doc.contactNumber,
    followersCount: doc.followersCount,
    followingCount: doc.followingCount,
    rank: doc.rank,
    creditScore: doc.creditScore ?? 100,
    eventsAttended: doc.eventsAttended,
    eventsHosted: doc.eventsHosted,
    noshows: doc.noshows,
    lateCount: doc.lateCount,
    notifPreferences: {
      email: doc.notifPreferences.email,
      telegram: doc.notifPreferences.telegram,
      whatsapp: doc.notifPreferences.whatsapp,
    },
    telegramChatId: doc.telegramChatId,
  };
}

function signToken(userId: string, email: string): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not set');
  const expiresIn = process.env.JWT_EXPIRES_IN ?? '7d';
  return jwt.sign({ userId, email }, secret, { expiresIn } as jwt.SignOptions);
}

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Escapes regex metacharacters so a username can be safely used in a $regex match.
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ── Reserved / impersonation-prone usernames ─────────────────────────────────
// Blocks not just the exact word "admin" but common look-alike spellings people
// use to impersonate staff: leetspeak swaps (4dm1n, adm!n), repeated/decorative
// characters (a.d.m.i.n, a__d__m__i__n), etc. We normalize the candidate name by
// folding common substitutions back to their letter, stripping anything that
// isn't a-z/0-9, then check whether it CONTAINS a reserved word.
const RESERVED_USERNAME_WORDS = [
  'admin', 'administrator', 'webadmin', 'web_admin', 'moderator', 'mod',
  'support', 'official', 'staff', 'system', 'root', 'owner', 'werewolfsg',
];

const LEET_MAP: Record<string, string> = {
  '0': 'o', '1': 'i', '!': 'i', '|': 'i', 'l': 'i' /* visually close to i */,
  '3': 'e', '4': 'a', '@': 'a', '5': 's', '$': 's', '7': 't', '+': 't',
};

function normalizeForReservedCheck(username: string): string {
  const lowered = username.trim().toLowerCase();
  let folded = '';
  for (const ch of lowered) {
    folded += LEET_MAP[ch] ?? ch;
  }
  // Strip everything except a-z (drops digits AND decorative separators like
  // dots/underscores/dashes/spaces), so "a.d.m.i.n", "admin123", "4dm1n_99"
  // all collapse to "admin". We compare by EQUALITY (not substring) afterwards
  // so genuine words that merely contain "admin" — e.g. "badminton" — aren't
  // false-flagged.
  return folded.replace(/[^a-z]/g, '');
}

function isReservedOrImpersonatingUsername(username: string): boolean {
  const normalized = normalizeForReservedCheck(username);
  if (!normalized) return false;
  return RESERVED_USERNAME_WORDS.some(word => normalized === word);
}

// Case-insensitive exact-match lookup — "admin", "Admin" and "ADMIN" are treated
// as the same name so a second account can't register a visually-identical handle.
function findByUsernameCI(username: string) {
  return UserModel.findOne({ username: { $regex: `^${escapeRegex(username.trim())}$`, $options: 'i' } });
}

export class UserService {
  async initiateRegister(dto: RegisterDTO): Promise<Result<{ message: string }>> {
    const existing = await UserModel.findOne({ email: dto.email });
    if (existing) return Result.fail('Email already registered.');

    if (isReservedOrImpersonatingUsername(dto.username)) {
      return Result.fail('That username is reserved and cannot be used. Please choose a different one.');
    }

    const existingUsername = await findByUsernameCI(dto.username);
    if (existingUsername) return Result.fail('Username already taken.');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await PendingRegistrationModel.findOneAndUpdate(
      { email: dto.email },
      { email: dto.email, username: dto.username, passwordHash, otp, expiresAt },
      { upsert: true, new: true }
    );

    try {
      await sendOtpEmail(dto.email, otp);
    } catch (err) {
      console.error('[UserService] Failed to send OTP email:', err);
      return Result.fail('Failed to send verification email. Please try again.');
    }

    return Result.ok({ message: 'Verification code sent to your email.' });
  }

  async verifyOtp(dto: VerifyOtpDTO): Promise<Result<AuthResponseDTO>> {
    const pending = await PendingRegistrationModel.findOne({ email: dto.email });
    if (!pending) return Result.fail('No pending registration found. Please register again.');
    if (pending.otp !== dto.otp) return Result.fail('Invalid verification code.');
    if (new Date() > pending.expiresAt) return Result.fail('Verification code has expired.');

    // Re-check right before creation — closes the race window where two people
    // start registering the same name within the same OTP window (initiateRegister
    // only checked at request time, not at confirmation time). Also re-runs the
    // reserved-name guard as defense-in-depth in case the reserved list changes
    // between request and confirmation.
    if (isReservedOrImpersonatingUsername(pending.username)) {
      return Result.fail('That username is reserved and cannot be used. Please register again with a different username.');
    }
    const usernameTaken = await findByUsernameCI(pending.username);
    if (usernameTaken) return Result.fail('Username already taken. Please register again with a different username.');

    let user: IUserDocument;
    try {
      user = await UserModel.create({
        username: pending.username,
        email: pending.email,
        passwordHash: pending.passwordHash,
      });
    } catch (err) {
      // Backstop: schema-level unique index throws E11000 if a duplicate slipped through
      if (err instanceof Error && /E11000/.test(err.message) && /username/.test(err.message)) {
        return Result.fail('Username already taken. Please register again with a different username.');
      }
      throw err;
    }

    await PendingRegistrationModel.deleteOne({ email: dto.email });

    eventBus.publish({
      eventName: 'UserRegistered',
      occurredOn: new Date(),
      payload: { userId: user._id.toString(), email: user.email, username: user.username },
    });

    const token = signToken(user._id.toString(), user.email);
    return Result.ok({ token, user: toUserResponseDTO(user) });
  }

  async login(dto: LoginDTO): Promise<Result<AuthResponseDTO>> {
    const user = await UserModel.findOne({ email: dto.email });
    if (!user) return Result.fail('Invalid email or password.');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) return Result.fail('Invalid email or password.');

    const token = signToken(user._id.toString(), user.email);
    return Result.ok({ token, user: toUserResponseDTO(user) });
  }

  async getMyProfile(userId: string): Promise<Result<FullUserProfileResponseDTO>> {
    const user = await UserModel.findById(userId);
    if (!user) return Result.fail('User not found.');

    const follows = await UserFollowModel.find({ followerId: userId });
    const followedUserIds = follows.map(f => f.followingId);
    const followedUsers = await UserModel.find({ _id: { $in: followedUserIds } });

    // Lazy import to avoid circular deps at module load time
    const { SessionInteractionModel } = await import('../../matches/DBSchemas/SessionInteractionSchema');
    const { MatchModel } = await import('../../matches/DBSchemas/MatchSchema');

    const attendedInteractions = await SessionInteractionModel.find({ userId, status: 'attended' });
    const attendedMatchIds = attendedInteractions.map(i => i.sessionId);
    const pastMatchDocs = await MatchModel.find({ _id: { $in: attendedMatchIds } })
      .sort({ scheduledAt: -1 })
      .limit(20);

    const likedGamesCount = await SessionInteractionModel.countDocuments({ userId, isLiked: true });

    const { VenueInteractionModel } = await import('../../player-spaces/DBSchemas/VenueInteractionSchema');
    const { PlayerSpaceModel } = await import('../../player-spaces/DBSchemas/PlayerSpaceSchema');

    const venueInteractions = await VenueInteractionModel.find({ userId, isSubscribed: true });
    const subscribedVenueIds = venueInteractions.map(v => v.venueId);
    const followedVenueDocs = await PlayerSpaceModel.find({ _id: { $in: subscribedVenueIds } });

    const followedVenues = followedVenueDocs.map(v => ({
      id: v._id.toString(),
      name: v.name,
      address: v.address,
      description: v.description ?? '',
      imageUrl: v.imageUrl ?? '',
      coordinates: { lat: v.location.lat, lng: v.location.long },
      isVerified: v.status === 'Verified',
      pricePerHour: v.financials.approx_fee,
      amenities: v.amenities,
      averageRating: v.averageRating,
      totalLikes: v.totalLikes,
      totalSubscribers: v.totalSubscribers,
    }));

    const pastEvents = pastMatchDocs.map(m => ({
      id: m._id.toString(),
      hostId: m.host_id.toString(),
      venueId: m.venue_id.toString(),
      title: m.title,
      date: m.scheduledAt.toISOString(),
      maxPlayers: m.config.max_pax,
      currentPlayers: m.players.length,
      status: 'finished' as const,
      totalLikes: m.totalLikes,
    }));

    return Result.ok({
      ...toUserResponseDTO(user),
      pastEvents,
      followedUsers: followedUsers.map(toUserResponseDTO),
      followedVenues,
      likedGamesCount,
    });
  }

  async updateProfile(userId: string, dto: UpdateProfileDTO): Promise<Result<UserResponseDTO>> {
    const update: Record<string, unknown> = {};

    if (dto.username !== undefined) {
      if (isReservedOrImpersonatingUsername(dto.username)) {
        return Result.fail('That username is reserved and cannot be used. Please choose a different one.');
      }
      const existingUsername = await findByUsernameCI(dto.username);
      if (existingUsername && existingUsername._id.toString() !== userId) {
        return Result.fail('Username already taken.');
      }
      update['username'] = dto.username;
    }
    if (dto.skillLevel !== undefined) {
      update['proficiency'] = SKILL_LEVEL_MAP[dto.skillLevel as SkillLevel];
    }
    if (dto.bio !== undefined) update['bio'] = dto.bio;
    if (dto.contactNumber !== undefined) update['contactNumber'] = dto.contactNumber;
    if (dto.avatarUrl !== undefined) update['avatarUrl'] = dto.avatarUrl;
    if (dto.telegramChatId !== undefined) update['telegramChatId'] = dto.telegramChatId;
    if (dto.notifPreferences !== undefined) {
      const prefs = dto.notifPreferences;
      if (prefs.email !== undefined) update['notifPreferences.email'] = prefs.email;
      if (prefs.telegram !== undefined) update['notifPreferences.telegram'] = prefs.telegram;
      if (prefs.whatsapp !== undefined) update['notifPreferences.whatsapp'] = prefs.whatsapp;
    }

    const user = await UserModel.findByIdAndUpdate(userId, { $set: update }, { new: true });
    if (!user) return Result.fail('User not found.');

    return Result.ok(toUserResponseDTO(user));
  }

  async followUser(followerId: string, targetId: string): Promise<Result<void>> {
    if (followerId === targetId) return Result.fail('Cannot follow yourself.');

    const target = await UserModel.findById(targetId);
    if (!target) return Result.fail('User not found.');

    try {
      await UserFollowModel.create({ followerId, followingId: targetId });
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: number }).code === 11000) {
        return Result.fail('Already following this user.');
      }
      throw err;
    }

    await Promise.all([
      UserModel.findByIdAndUpdate(followerId, { $inc: { followingCount: 1 } }),
      UserModel.findByIdAndUpdate(targetId, { $inc: { followersCount: 1 } }),
    ]);

    return Result.ok();
  }

  async unfollowUser(followerId: string, targetId: string): Promise<Result<void>> {
    const deleted = await UserFollowModel.findOneAndDelete({
      followerId,
      followingId: targetId,
    });

    if (!deleted) return Result.fail('Not following this user.');

    await Promise.all([
      UserModel.findByIdAndUpdate(followerId, { $inc: { followingCount: -1 } }),
      UserModel.findByIdAndUpdate(targetId, { $inc: { followersCount: -1 } }),
    ]);

    return Result.ok();
  }

  // ── Password reset (user self-service) ───────────────────────────────────

  async forgotPassword(dto: ForgotPasswordDTO): Promise<Result<{ message: string }>> {
    // Always return the same message to prevent email enumeration
    const MSG = 'If that email is registered, a reset code has been sent.';
    const user = await UserModel.findOne({ email: dto.email });
    if (!user) return Result.ok({ message: MSG });

    const token = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await PasswordResetModel.findOneAndUpdate(
      { email: dto.email },
      { email: dto.email, token, expiresAt },
      { upsert: true, new: true }
    );

    try {
      await sendPasswordResetEmail(dto.email, token);
    } catch (err) {
      console.error('[UserService] Failed to send password reset email:', err);
    }

    return Result.ok({ message: MSG });
  }

  async resetPassword(dto: ResetPasswordDTO): Promise<Result<{ message: string }>> {
    const reset = await PasswordResetModel.findOne({ email: dto.email });
    if (!reset || reset.token !== dto.token) return Result.fail('Invalid or expired reset code.');
    if (new Date() > reset.expiresAt) return Result.fail('Reset code has expired. Please request a new one.');

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await UserModel.findOneAndUpdate({ email: dto.email }, { $set: { passwordHash } });
    await PasswordResetModel.deleteOne({ email: dto.email });

    return Result.ok({ message: 'Password reset successfully. You can now log in.' });
  }

  // ── Password reset (admin-triggered) ────────────────────────────────────

  async adminResetPassword(adminId: string, targetUserId: string): Promise<Result<{ message: string }>> {
    const admin = await UserModel.findById(adminId);
    if (!admin || !['admin', 'web_admin'].includes(admin.role)) {
      return Result.fail('Forbidden.');
    }

    const target = await UserModel.findById(targetUserId);
    if (!target) return Result.fail('User not found.');

    const token = generateOtp();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour for admin-sent reset

    await PasswordResetModel.findOneAndUpdate(
      { email: target.email },
      { email: target.email, token, expiresAt },
      { upsert: true, new: true }
    );

    try {
      await sendPasswordResetEmail(target.email, token);
    } catch (err) {
      console.error('[UserService] Failed to send admin-triggered password reset email:', err);
      return Result.fail('Failed to send reset email. Check RESEND_API_KEY and FROM_EMAIL env vars.');
    }

    return Result.ok({ message: `Password reset email sent to ${target.email}.` });
  }

  async getUserById(
    targetId: string,
    requestingUserId?: string
  ): Promise<Result<UserResponseDTO & { isFollowedByMe: boolean }>> {
    const user = await UserModel.findById(targetId);
    if (!user) return Result.fail('User not found.');

    let isFollowedByMe = false;
    if (requestingUserId) {
      const follow = await UserFollowModel.findOne({
        followerId: requestingUserId,
        followingId: targetId,
      });
      isFollowedByMe = follow !== null;
    }

    return Result.ok({ ...toUserResponseDTO(user), isFollowedByMe });
  }
}
