import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Result } from '../../../shared/core/Result';
import { sendOtpEmail } from '../../../shared/infra/email';
import { UserModel, IUserDocument } from '../DBSchemas/UserSchema';
import { UserFollowModel } from '../DBSchemas/UserFollowSchema';
import { PendingRegistrationModel } from '../DBSchemas/PendingRegistrationSchema';
import { PROFICIENCY_TO_SKILL, SKILL_LEVEL_MAP, SkillLevel } from '../domain/User';
import {
  AuthResponseDTO,
  FullUserProfileResponseDTO,
  LoginDTO,
  RegisterDTO,
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
    role: 'player',
    isVerified: doc.is_verified_creator,
    skillLevel,
    bio: doc.bio,
    contactNumber: doc.contactNumber,
    followersCount: doc.followersCount,
    followingCount: doc.followingCount,
    rank: doc.rank,
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

export class UserService {
  async initiateRegister(dto: RegisterDTO): Promise<Result<{ message: string }>> {
    const existing = await UserModel.findOne({ email: dto.email });
    if (existing) return Result.fail('Email already registered.');

    const existingUsername = await UserModel.findOne({ username: dto.username });
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

    const user = await UserModel.create({
      username: pending.username,
      email: pending.email,
      passwordHash: pending.passwordHash,
    });

    await PendingRegistrationModel.deleteOne({ email: dto.email });

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
