import { Result } from '../../../shared/core/Result';
import { ensureAdmin } from '../../../shared/core/adminGuard';
import { isAdminRole } from '../../../shared/middleware/auth';
import { PlayerSpaceModel, IPlayerSpaceDocument } from '../DBSchemas/PlayerSpaceSchema';
import { VenueInteractionModel } from '../DBSchemas/VenueInteractionSchema';
import { SpaceMessageModel } from '../DBSchemas/SpaceMessageSchema';
import { SpaceCommentModel } from '../DBSchemas/SpaceCommentSchema';
import { UserModel } from '../../users/DBSchemas/UserSchema';
import { MatchModel } from '../../matches/DBSchemas/MatchSchema';
import { SessionInteractionModel } from '../../matches/DBSchemas/SessionInteractionSchema';
import { NotificationModel } from '../../notifications/DBSchemas/NotificationSchema';
import { CreatePlayerSpaceDTO, UpdatePlayerSpaceDTO, GameVenueResponseDTO, VenueCommentResponseDTO } from '../DTOs/PlayerSpaceDTOs';
import { eventBus } from '../../../shared/infra/EventBus';

// Regular users are capped at this many spaces; admins have no limit
const MAX_SPACES_PER_USER = 3;

type VenueInteractionView = { isLiked: boolean; isSubscribed: boolean; myRating: number | undefined };

const DEFAULT_INTERACTION: VenueInteractionView = { isLiked: false, isSubscribed: false, myRating: undefined };

function toInteractionView(i: { isLiked: boolean; isSubscribed: boolean; myRating?: number | undefined }): VenueInteractionView {
  return { isLiked: i.isLiked, isSubscribed: i.isSubscribed, myRating: i.myRating };
}

function toVenueCommentDTO(
  comment: { _id: { toString(): string }; text: string; createdAt: Date },
  venueId: string,
  userId: string,
  user: { username?: string; avatarUrl?: string } | null | undefined
): VenueCommentResponseDTO {
  return {
    id: comment._id.toString(),
    venueId,
    userId,
    username: user?.username ?? 'Unknown',
    avatarUrl: user?.avatarUrl,
    text: comment.text,
    createdAt: comment.createdAt.toISOString(),
  };
}

function toVenueDTO(
  doc: IPlayerSpaceDocument,
  interaction?: { isLiked: boolean; isSubscribed: boolean; myRating: number | undefined }
): GameVenueResponseDTO {
  return {
    id: doc._id.toString(),
    ownerId: doc.owner_id.toString(),
    name: doc.name,
    address: doc.address,
    privacy: doc.privacy ?? 'public',
    ...(doc.area !== undefined ? { area: doc.area } : {}),
    description: doc.description ?? '',
    imageUrl: doc.imageUrl ?? 'https://placehold.co/600x400?text=Venue',
    type: doc.type,
    coordinates: { lat: doc.location.lat, lng: doc.location.long },
    isVerified: doc.status === 'Verified',
    pricePerHour: doc.financials.approx_fee,
    priceType: doc.financials.price_type ?? 'per_session',
    ...(doc.openingHours !== undefined ? { openingHours: doc.openingHours } : {}),
    ...(doc.maxPax !== undefined ? { maxPax: doc.maxPax } : {}),
    images: doc.images ?? [],
    wechatQrUrl: doc.wechatQrUrl,
    ...(doc.socialLinks && Object.values(doc.socialLinks).some(Boolean)
      ? { socialLinks: {
          ...(doc.socialLinks.wechatId       ? { wechatId:       doc.socialLinks.wechatId }       : {}),
          ...(doc.socialLinks.telegramHandle ? { telegramHandle: doc.socialLinks.telegramHandle } : {}),
          ...(doc.socialLinks.facebookUrl    ? { facebookUrl:    doc.socialLinks.facebookUrl }    : {}),
        }}
      : {}),
    isPinned: doc.isPinned ?? false,
    commentsLocked: doc.commentsLocked ?? false,
    amenities: doc.amenities,
    rules: doc.rules,
    averageRating: doc.averageRating,
    totalLikes: doc.totalLikes,
    totalSubscribers: doc.totalSubscribers,
    myInteraction: interaction,
  };
}

export class PlayerSpaceService {
  async getAllVenues(requestingUserId?: string): Promise<GameVenueResponseDTO[]> {
    const venues = await PlayerSpaceModel.find().sort({ isPinned: -1, createdAt: -1 });

    if (!requestingUserId) {
      return venues.map(v => toVenueDTO(v));
    }

    const venueIds = venues.map(v => v._id);
    const interactions = await VenueInteractionModel.find({
      userId: requestingUserId,
      venueId: { $in: venueIds },
    });

    const interactionMap = new Map(
      interactions.map(i => [i.venueId.toString(), toInteractionView(i)])
    );

    return venues.map(v => toVenueDTO(v, interactionMap.get(v._id.toString()) ?? DEFAULT_INTERACTION));
  }

  async getVenueById(venueId: string, requestingUserId?: string): Promise<Result<GameVenueResponseDTO>> {
    const venue = await PlayerSpaceModel.findById(venueId);
    if (!venue) return Result.fail('Venue not found.');

    let interaction: VenueInteractionView | undefined;
    if (requestingUserId) {
      const i = await VenueInteractionModel.findOne({ userId: requestingUserId, venueId });
      interaction = i ? toInteractionView(i) : DEFAULT_INTERACTION;
    }

    return Result.ok(toVenueDTO(venue, interaction));
  }

  async createVenue(userId: string, dto: CreatePlayerSpaceDTO): Promise<Result<GameVenueResponseDTO>> {
    const user = await UserModel.findById(userId, 'role');
    const isAdmin = user && isAdminRole(user.role);

    if (!isAdmin) {
      const count = await PlayerSpaceModel.countDocuments({ owner_id: userId });
      if (count >= MAX_SPACES_PER_USER) {
        return Result.fail(`You can only create up to ${MAX_SPACES_PER_USER} places.`);
      }
    }

    // Build document without undefined optional fields
    const docData: Parameters<typeof PlayerSpaceModel.create>[0] = {
      owner_id: userId,
      name: dto.name,
      address: dto.address,
      type: dto.type,
      location: { lat: dto.lat, long: dto.lng },
      geoLocation: { type: 'Point', coordinates: [dto.lng, dto.lat] },
      financials: { is_chargeable: dto.is_chargeable, approx_fee: dto.approx_fee ?? 0 },
      amenities: dto.amenities ?? [],
      // Admins get their spaces auto-verified; regular users start as unVerified
      status: isAdmin ? 'Verified' : 'unVerified',
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
      ...(dto.images !== undefined && { images: dto.images }),
      ...(dto.wechatQrUrl !== undefined && { wechatQrUrl: dto.wechatQrUrl }),
      ...(dto.rules !== undefined && { rules: dto.rules }),
      ...(dto.socialLinks !== undefined && {
        socialLinks: {
          ...(dto.socialLinks.wechatId       ? { wechatId:       dto.socialLinks.wechatId }       : {}),
          ...(dto.socialLinks.telegramHandle ? { telegramHandle: dto.socialLinks.telegramHandle } : {}),
          ...(dto.socialLinks.facebookUrl    ? { facebookUrl:    dto.socialLinks.facebookUrl }    : {}),
        }
      }),
    };

    const venue = await PlayerSpaceModel.create(docData);
    return Result.ok(toVenueDTO(venue));
  }

  // Only the venue owner may update space properties.
  // Admin-only actions (verify, transfer ownership) require a separate admin endpoint.
  async updateVenue(venueId: string, userId: string, dto: UpdatePlayerSpaceDTO): Promise<Result<GameVenueResponseDTO>> {
    const venue = await PlayerSpaceModel.findById(venueId);
    if (!venue) return Result.fail('Venue not found.');
    if (venue.owner_id.toString() !== userId) return Result.fail('Forbidden: only the space owner can edit this venue.');

    const update: Record<string, unknown> = {};
    if (dto.name        !== undefined) update['name']               = dto.name;
    if (dto.address     !== undefined) update['address']            = dto.address;
    if (dto.description !== undefined) update['description']        = dto.description;
    if (dto.imageUrl    !== undefined) update['imageUrl']           = dto.imageUrl;
    if (dto.images      !== undefined) update['images']             = dto.images;
    if (dto.type        !== undefined) update['type']               = dto.type;
    if (dto.privacy     !== undefined) update['privacy']            = dto.privacy;
    if (dto.area        !== undefined) update['area']               = dto.area;
    if (dto.openingHours!== undefined) update['openingHours']       = dto.openingHours;
    if (dto.maxPax      !== undefined) update['maxPax']             = dto.maxPax;
    if (dto.amenities   !== undefined) update['amenities']          = dto.amenities;
    if (dto.rules       !== undefined) update['rules']              = dto.rules;
    if (dto.is_chargeable !== undefined) update['financials.is_chargeable'] = dto.is_chargeable;
    if (dto.approx_fee  !== undefined) update['financials.approx_fee']      = dto.approx_fee;
    if (dto.price_type  !== undefined) update['financials.price_type']      = dto.price_type;

    // wechatQrUrl: empty string means "remove the QR", a URL means "set it"
    const unsetFields: Record<string, number> = {};
    if (dto.wechatQrUrl !== undefined) {
      if (dto.wechatQrUrl === '') { unsetFields['wechatQrUrl'] = 1; }
      else { update['wechatQrUrl'] = dto.wechatQrUrl; }
    }

    // socialLinks — merge individual fields; empty string removes that sub-field
    if (dto.socialLinks !== undefined) {
      const sl = dto.socialLinks;
      if (sl.wechatId       !== undefined) { sl.wechatId       ? (update['socialLinks.wechatId']       = sl.wechatId)       : (unsetFields['socialLinks.wechatId']       = 1); }
      if (sl.telegramHandle !== undefined) { sl.telegramHandle ? (update['socialLinks.telegramHandle'] = sl.telegramHandle) : (unsetFields['socialLinks.telegramHandle'] = 1); }
      if (sl.facebookUrl    !== undefined) { sl.facebookUrl    ? (update['socialLinks.facebookUrl']    = sl.facebookUrl)    : (unsetFields['socialLinks.facebookUrl']    = 1); }
    }

    const mongoOp: Record<string, unknown> = { $set: update };
    if (Object.keys(unsetFields).length > 0) mongoOp['$unset'] = unsetFields;

    const updated = await PlayerSpaceModel.findByIdAndUpdate(venueId, mongoOp, { new: true });
    return Result.ok(toVenueDTO(updated!));
  }

  /**
   * Shared flip logic for per-user venue flags: toggles the flag on the
   * interaction record and keeps the venue's aggregate counter in sync.
   */
  private async toggleInteractionFlag(
    venueId: string,
    userId: string,
    flagField: 'isLiked' | 'isSubscribed',
    counterField: 'totalLikes' | 'totalSubscribers'
  ): Promise<Result<{ enabled: boolean; venue: IPlayerSpaceDocument }>> {
    const venue = await PlayerSpaceModel.findById(venueId);
    if (!venue) return Result.fail('Venue not found.');

    const interaction = await VenueInteractionModel.findOne({ userId, venueId });
    const enabled = !(interaction?.[flagField] ?? false);

    await VenueInteractionModel.findOneAndUpdate(
      { userId, venueId },
      { $set: { [flagField]: enabled } },
      { upsert: true }
    );
    await PlayerSpaceModel.findByIdAndUpdate(venueId, { $inc: { [counterField]: enabled ? 1 : -1 } });

    return Result.ok({ enabled, venue });
  }

  async toggleLike(venueId: string, userId: string): Promise<Result<{ isLiked: boolean }>> {
    const toggled = await this.toggleInteractionFlag(venueId, userId, 'isLiked', 'totalLikes');
    if (toggled.isFailure) return Result.fail(toggled.getError());

    const { enabled, venue } = toggled.getValue();
    if (enabled) {
      await UserModel.findByIdAndUpdate(venue.owner_id, { $inc: { likesReceived: 1 } });
    }
    return Result.ok({ isLiked: enabled });
  }

  async toggleSubscribe(venueId: string, userId: string): Promise<Result<{ isSubscribed: boolean }>> {
    const toggled = await this.toggleInteractionFlag(venueId, userId, 'isSubscribed', 'totalSubscribers');
    if (toggled.isFailure) return Result.fail(toggled.getError());
    return Result.ok({ isSubscribed: toggled.getValue().enabled });
  }

  /**
   * Admin-only: verify (approve) or un-verify a venue.
   * Publishes VenueApproved / VenueRejected events so the owner is notified.
   */
  async verifyVenue(
    venueId: string,
    adminId: string,
    approved: boolean,
    reason?: string
  ): Promise<Result<void>> {
    const adminCheck = await ensureAdmin(adminId);
    if (adminCheck.isFailure) return Result.fail(adminCheck.getError());

    const venue = await PlayerSpaceModel.findById(venueId);
    if (!venue) return Result.fail('Venue not found.');

    const newStatus = approved ? 'Verified' : 'unVerified';
    await PlayerSpaceModel.findByIdAndUpdate(venueId, { $set: { status: newStatus } });

    if (approved) {
      eventBus.publish({
        eventName: 'VenueApproved',
        occurredOn: new Date(),
        payload: {
          venueId,
          ownerId: venue.owner_id.toString(),
          venueName: venue.name,
        },
      });
    } else {
      eventBus.publish({
        eventName: 'VenueRejected',
        occurredOn: new Date(),
        payload: {
          venueId,
          ownerId: venue.owner_id.toString(),
          venueName: venue.name,
          reason: reason ?? '',
        },
      });
    }

    return Result.ok();
  }

  /**
   * Admin-only: transfer ownership of a venue to another registered user
   * (e.g. an admin created the listing on behalf of a friend who has since
   * registered an account, and wants to hand the listing over to them).
   * Identifies the new owner by email to keep the admin UI simple.
   */
  async transferOwnership(venueId: string, adminId: string, newOwnerEmail: string): Promise<Result<GameVenueResponseDTO>> {
    const adminCheck = await ensureAdmin(adminId);
    if (adminCheck.isFailure) return Result.fail(adminCheck.getError());

    const venue = await PlayerSpaceModel.findById(venueId);
    if (!venue) return Result.fail('Venue not found.');

    const newOwner = await UserModel.findOne({ email: newOwnerEmail.trim().toLowerCase() });
    if (!newOwner) return Result.fail('No registered user found with that email.');

    if (venue.owner_id.toString() === newOwner._id.toString()) {
      return Result.fail('That user already owns this space.');
    }

    const updated = await PlayerSpaceModel.findByIdAndUpdate(
      venueId,
      { $set: { owner_id: newOwner._id } },
      { new: true }
    );
    return Result.ok(toVenueDTO(updated!));
  }

  async rateVenue(venueId: string, userId: string, rating: number): Promise<Result<void>> {
    const venue = await PlayerSpaceModel.findById(venueId);
    if (!venue) return Result.fail('Venue not found.');

    await VenueInteractionModel.findOneAndUpdate(
      { userId, venueId },
      { $set: { myRating: rating } },
      { upsert: true }
    );

    const allRatings = await VenueInteractionModel.find({
      venueId,
      myRating: { $exists: true },
    });
    const avg = allRatings.reduce((s, i) => s + (i.myRating ?? 0), 0) / (allRatings.length || 1);
    await PlayerSpaceModel.findByIdAndUpdate(venueId, {
      averageRating: Math.round(avg * 10) / 10,
    });

    return Result.ok();
  }

  /**
   * Admin-only: toggle the pin status of a venue.
   * Pinned venues always appear first in listings.
   */
  async pinVenue(venueId: string, adminId: string): Promise<Result<{ isPinned: boolean }>> {
    const adminCheck = await ensureAdmin(adminId);
    if (adminCheck.isFailure) return Result.fail(adminCheck.getError());

    const venue = await PlayerSpaceModel.findById(venueId);
    if (!venue) return Result.fail('Venue not found.');

    const newPinned = !venue.isPinned;
    await PlayerSpaceModel.findByIdAndUpdate(venueId, { $set: { isPinned: newPinned } });
    return Result.ok({ isPinned: newPinned });
  }

  async leaveOwnerMessage(venueId: string, senderId: string, message: string): Promise<Result<void>> {
    const venue = await PlayerSpaceModel.findById(venueId);
    if (!venue) return Result.fail('Venue not found.');
    if (venue.owner_id.toString() === senderId) return Result.fail('You cannot message your own space.');

    try {
      await SpaceMessageModel.create({ venue_id: venueId, sender_id: senderId, message });
      return Result.ok();
    } catch (err: unknown) {
      if ((err as { code?: number }).code === 11000) return Result.fail('ALREADY_SENT');
      throw err;
    }
  }

  // ── Comments (permissions mirror event comments) ──────────────────────────

  private async isOwnerOrAdmin(venue: { owner_id: { toString(): string } }, userId: string): Promise<boolean> {
    if (venue.owner_id.toString() === userId) return true;
    const user = await UserModel.findById(userId, 'role');
    return isAdminRole(user?.role);
  }

  async getComments(venueId: string): Promise<VenueCommentResponseDTO[]> {
    const comments = await SpaceCommentModel.find({ venueId }).sort({ createdAt: 1 }).lean();
    const userIds = [...new Set(comments.map(c => c.userId.toString()))];
    const users = await UserModel.find({ _id: { $in: userIds } }, 'username avatarUrl');
    const userMap = new Map(users.map(u => [u._id.toString(), u]));
    return comments.map(c =>
      toVenueCommentDTO(
        c as unknown as { _id: { toString(): string }; text: string; createdAt: Date },
        venueId,
        c.userId.toString(),
        userMap.get(c.userId.toString())
      )
    );
  }

  async addComment(venueId: string, userId: string, text: string): Promise<Result<VenueCommentResponseDTO>> {
    const venue = await PlayerSpaceModel.findById(venueId);
    if (!venue) return Result.fail('Venue not found.');
    const isOwner = venue.owner_id.toString() === userId;
    if (venue.commentsLocked && !isOwner) return Result.fail('Comments are locked by the owner.');
    const raw = await SpaceCommentModel.create({ venueId, userId, text });
    const comment = raw as unknown as { _id: { toString(): string }; text: string; createdAt: Date };
    const user = await UserModel.findById(userId, 'username avatarUrl');
    return Result.ok(toVenueCommentDTO(comment, venueId, userId, user));
  }

  async deleteComment(venueId: string, commentId: string, userId: string): Promise<Result<void>> {
    const comment = await SpaceCommentModel.findById(commentId);
    if (!comment || comment.venueId.toString() !== venueId) return Result.fail('Comment not found.');
    const venue = await PlayerSpaceModel.findById(venueId);
    const isAuthor = comment.userId.toString() === userId;
    const mayModerate = venue ? await this.isOwnerOrAdmin(venue, userId) : false;
    if (!isAuthor && !mayModerate) return Result.fail('Cannot delete another user\'s comment.');
    await SpaceCommentModel.findByIdAndDelete(commentId);
    return Result.ok();
  }

  async lockComments(venueId: string, userId: string, locked: boolean): Promise<Result<void>> {
    const venue = await PlayerSpaceModel.findById(venueId);
    if (!venue) return Result.fail('Venue not found.');
    if (!await this.isOwnerOrAdmin(venue, userId)) {
      return Result.fail('Only the owner or admin can lock comments.');
    }
    await PlayerSpaceModel.findByIdAndUpdate(venueId, { $set: { commentsLocked: locked } });
    return Result.ok();
  }

  /**
   * Delete a venue.
   * - Owner: blocked while the venue has active (non-cancelled) matches.
   * - Admin (force-remove): active matches are cancelled first and their
   *   hosts notified, then the venue is deleted.
   */
  async deleteVenue(venueId: string, userId: string): Promise<Result<void>> {
    const venue = await PlayerSpaceModel.findById(venueId);
    if (!venue) return Result.fail('Venue not found.');

    const isOwner = venue.owner_id.toString() === userId;
    const isAdmin = await this.isOwnerOrAdmin(venue, userId) && !isOwner;
    if (!isOwner && !isAdmin) {
      return Result.fail('Forbidden: only the space owner can delete this venue.');
    }

    const activeMatches = await MatchModel.find(
      { venue_id: venueId, status: { $nin: ['Cancelled', 'Completed'] } },
      'host_id title'
    );

    if (activeMatches.length > 0) {
      if (!isAdmin) {
        return Result.fail('Cannot delete a venue that has active matches. Cancel all matches first.');
      }
      // Admin force path: cancel every live match and tell its host
      const matchIds = activeMatches.map(m => m._id);
      await MatchModel.updateMany(
        { _id: { $in: matchIds } },
        { $set: { status: 'Cancelled', cancelledAt: new Date() } }
      );
      await SessionInteractionModel.updateMany(
        { sessionId: { $in: matchIds } },
        { $set: { status: 'cancelled' } }
      );
      await NotificationModel.insertMany(
        activeMatches.map(m => ({
          recipientId: m.host_id.toString(),
          type: 'General',
          message: `Your session "${m.title}" was cancelled because the venue was removed by an administrator.`,
          channel: 'in-app',
          payload: { matchId: m._id.toString() },
        }))
      );
    }

    await PlayerSpaceModel.findByIdAndDelete(venueId);
    await SpaceCommentModel.deleteMany({ venueId });
    return Result.ok();
  }
}
