import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { Result } from '../../../shared/core/Result';
import { ensureAdmin } from '../../../shared/core/adminGuard';
import { sendOtpEmail, sendPasswordResetEmail } from '../../../shared/infra/email';
import { eventBus } from '../../../shared/infra/EventBus';
import { UserModel, IUserDocument } from '../DBSchemas/UserSchema';
import { UserFollowModel } from '../DBSchemas/UserFollowSchema';
import { PendingRegistrationModel } from '../DBSchemas/PendingRegistrationSchema';
import { RefreshTokenModel } from '../DBSchemas/RefreshTokenSchema';
import { PasswordResetModel } from '../DBSchemas/PasswordResetSchema';
import { PROFICIENCY_TO_SKILL, SKILL_LEVEL_MAP, SkillLevel } from '../domain/User';
import { MatchModel } from '../../matches/DBSchemas/MatchSchema';
import { SessionInteractionModel } from '../../matches/DBSchemas/SessionInteractionSchema';
import { PlayerSpaceModel } from '../../player-spaces/DBSchemas/PlayerSpaceSchema';
import { VenueInteractionModel } from '../../player-spaces/DBSchemas/VenueInteractionSchema';
import { PROFICIENCY_TO_LABEL } from '../../matches/DTOs/MatchDTOs';
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

function signToken(userId: string, email: string, role: string): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not set');
  const expiresIn = process.env.JWT_EXPIRES_IN ?? '7d';
  return jwt.sign({ userId, email, role }, secret, { expiresIn } as jwt.SignOptions);
}

function generateOtp(): string {
  // crypto.randomInt — Math.random() is a predictable PRNG and must not be
  // used for security codes (OWASP ASVS 2.5.1 / 6.3.1)
  return crypto.randomInt(100000, 1000000).toString();
}

// Max wrong guesses before the pending registration is invalidated (ASVS 2.5)
const MAX_OTP_ATTEMPTS = 5;

const BCRYPT_ROUNDS = 10;
const OTP_TTL_MS = 10 * 60 * 1000;
const ADMIN_RESET_TTL_MS = 60 * 60 * 1000; // admin-sent reset links live longer

// ── Refresh token rotation ────────────────────────────────────────────────────
const REFRESH_TOKEN_DAYS = Number(process.env.REFRESH_TOKEN_DAYS ?? 30);

function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

async function issueRefreshToken(userId: string): Promise<string> {
  const raw = crypto.randomBytes(48).toString('hex');
  await RefreshTokenModel.create({
    userId,
    tokenHash: hashToken(raw),
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000),
  });
  return raw;
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

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);

    await PendingRegistrationModel.findOneAndUpdate(
      { email: dto.email },
      { email: dto.email, username: dto.username, passwordHash, otp, expiresAt, attempts: 0 },
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
    if (new Date() > pending.expiresAt) return Result.fail('Verification code has expired.');
    if ((pending.attempts ?? 0) >= MAX_OTP_ATTEMPTS) {
      await PendingRegistrationModel.deleteOne({ email: dto.email });
      return Result.fail('Too many incorrect attempts. Please register again.');
    }
    if (pending.otp !== dto.otp) {
      await PendingRegistrationModel.updateOne({ email: dto.email }, { $inc: { attempts: 1 } });
      return Result.fail('Invalid verification code.');
    }

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

    const token = signToken(user._id.toString(), user.email, user.role ?? 'player');
    const refreshToken = await issueRefreshToken(user._id.toString());
    return Result.ok({ token, refreshToken, user: toUserResponseDTO(user) });
  }

  async login(dto: LoginDTO): Promise<Result<AuthResponseDTO>> {
    const user = await UserModel.findOne({ email: dto.email });
    if (!user) return Result.fail('Invalid email or password.');

    if (user.passwordHash === 'google_oauth_no_password') {
      return Result.fail('GOOGLE_ACCOUNT: This account uses Google Sign-In. Please log in with Google, or use "Forgot Password" to set a password for this email.');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) return Result.fail('Invalid email or password.');

    const token = signToken(user._id.toString(), user.email, user.role ?? 'player');
    const refreshToken = await issueRefreshToken(user._id.toString());
    return Result.ok({ token, refreshToken, user: toUserResponseDTO(user) });
  }

  /**
   * Rotating refresh: validates the presented token, revokes it, and issues a
   * fresh access JWT + refresh token. Presenting an ALREADY-REVOKED token is
   * treated as theft/replay — the user's entire token family is revoked
   * (OWASP refresh-token-rotation reuse detection).
   */
  async refreshSession(rawToken: string): Promise<Result<AuthResponseDTO>> {
    const tokenHash = hashToken(rawToken);
    const stored = await RefreshTokenModel.findOne({ tokenHash });
    if (!stored) return Result.fail('Invalid refresh token.');

    if (stored.revokedAt) {
      // Reuse detected — revoke everything for this user and force re-login
      await RefreshTokenModel.updateMany(
        { userId: stored.userId, revokedAt: { $exists: false } },
        { $set: { revokedAt: new Date() } }
      );
      return Result.fail('Refresh token reuse detected. Please log in again.');
    }

    if (new Date() > stored.expiresAt) return Result.fail('Refresh token expired. Please log in again.');

    const user = await UserModel.findById(stored.userId);
    if (!user) return Result.fail('User not found.');

    const newRaw = await issueRefreshToken(user._id.toString());
    stored.revokedAt = new Date();
    stored.replacedByHash = hashToken(newRaw);
    await stored.save();

    const token = signToken(user._id.toString(), user.email, user.role ?? 'player');
    return Result.ok({ token, refreshToken: newRaw, user: toUserResponseDTO(user) });
  }

  /** Logout: revoke the presented refresh token. Idempotent — unknown tokens are ignored. */
  async revokeRefreshToken(rawToken: string): Promise<Result<void>> {
    await RefreshTokenModel.updateOne(
      { tokenHash: hashToken(rawToken), revokedAt: { $exists: false } },
      { $set: { revokedAt: new Date() } }
    );
    return Result.ok();
  }

  async getMyProfile(userId: string): Promise<Result<FullUserProfileResponseDTO>> {
    const user = await UserModel.findById(userId);
    if (!user) return Result.fail('User not found.');

    const follows = await UserFollowModel.find({ followerId: userId });
    const followedUserIds = follows.map(f => f.followingId);
    const followedUsers = await UserModel.find({ _id: { $in: followedUserIds } });

    const attendedInteractions = await SessionInteractionModel.find({ userId, status: 'attended' });
    const attendedMatchIds = attendedInteractions.map(i => i.sessionId);
    const pastMatchDocs = await MatchModel.find({ _id: { $in: attendedMatchIds } })
      .sort({ scheduledAt: -1 })
      .limit(20);

    const likedGamesCount = await SessionInteractionModel.countDocuments({ userId, isLiked: true });

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
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);

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

    const passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);
    const user = await UserModel.findOneAndUpdate({ email: dto.email }, { $set: { passwordHash } });
    await PasswordResetModel.deleteOne({ email: dto.email });

    // Account recovery invalidates every outstanding session — a stolen
    // refresh token must not survive a password reset (OWASP ASVS 3.3.1)
    if (user) {
      await RefreshTokenModel.updateMany(
        { userId: user._id, revokedAt: { $exists: false } },
        { $set: { revokedAt: new Date() } }
      );
    }

    return Result.ok({ message: 'Password reset successfully. You can now log in.' });
  }

  // ── Password reset (admin-triggered) ────────────────────────────────────

  async adminResetPassword(adminId: string, targetUserId: string): Promise<Result<{ message: string }>> {
    const adminCheck = await ensureAdmin(adminId, 'Forbidden.');
    if (adminCheck.isFailure) return Result.fail(adminCheck.getError());

    const target = await UserModel.findById(targetUserId);
    if (!target) return Result.fail('User not found.');

    const token = generateOtp();
    const expiresAt = new Date(Date.now() + ADMIN_RESET_TTL_MS);

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
  ): Promise<Result<UserResponseDTO & {
    isFollowedByMe: boolean;
    recentSessions: { id: string; title: string; date: string; maxPlayers: number; currentPlayers: number; proficiency: string; venueName?: string }[];
    ownedVenues: { id: string; name: string; type: string; imageUrl?: string; address: string }[];
  }>> {
    const user = await UserModel.findById(targetId);
    if (!user) return Result.fail('User not found.');

    const [isFollowedByMeResult, recentInteractions, ownedVenueDocs] = await Promise.all([
      requestingUserId
        ? UserFollowModel.findOne({ followerId: requestingUserId, followingId: targetId })
        : Promise.resolve(null),
      SessionInteractionModel.find({ userId: targetId, status: { $in: ['attended', 'registered'] } })
        .sort({ updatedAt: -1 }).limit(5).lean(),
      PlayerSpaceModel.find({ owner_id: targetId }, 'name type imageUrl address').limit(5).lean(),
    ]);

    const sessionIds = recentInteractions.map(i => i.sessionId);
    const matchDocs = sessionIds.length > 0
      ? await MatchModel.find({ _id: { $in: sessionIds } }, 'title scheduledAt config venue_id').lean()
      : [];

    // Collect venue names for the recent sessions
    const venueIds = [...new Set(matchDocs.map(m => m.venue_id?.toString()).filter(Boolean))];
    const venueDocs = venueIds.length > 0
      ? await PlayerSpaceModel.find({ _id: { $in: venueIds } }, 'name').lean()
      : [];
    const venueNameMap = new Map(venueDocs.map(v => [v._id.toString(), v.name]));

    const recentSessions = matchDocs.map(m => {
      const venueName = venueNameMap.get(m.venue_id?.toString() ?? '');
      return {
        id: m._id.toString(),
        title: m.title,
        date: (m.scheduledAt as Date).toISOString(),
        maxPlayers: (m.config as { max_pax: number }).max_pax,
        currentPlayers: (m.config as { min_pax: number }).min_pax,
        proficiency: PROFICIENCY_TO_LABEL[(m.config as { proficiency_required: number }).proficiency_required] ?? 'All Welcome',
        ...(venueName ? { venueName } : {}),
      };
    });

    const ownedVenues = ownedVenueDocs.map(v => {
      const imageUrl = (v as unknown as { imageUrl?: string }).imageUrl;
      return {
        id: v._id.toString(),
        name: v.name,
        type: (v.type as string) ?? 'other',
        address: v.address,
        ...(imageUrl ? { imageUrl } : {}),
      };
    });

    return Result.ok({
      ...toUserResponseDTO(user),
      isFollowedByMe: isFollowedByMeResult !== null,
      recentSessions,
      ownedVenues,
    });
  }
}
