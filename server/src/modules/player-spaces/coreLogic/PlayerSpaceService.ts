import { Result } from '../../../shared/core/Result';
import { PlayerSpaceModel, IPlayerSpaceDocument } from '../DBSchemas/PlayerSpaceSchema';
import { VenueInteractionModel } from '../DBSchemas/VenueInteractionSchema';
import { UserModel } from '../../users/DBSchemas/UserSchema';
import { CreatePlayerSpaceDTO, UpdatePlayerSpaceDTO, GameVenueResponseDTO } from '../DTOs/PlayerSpaceDTOs';
import { eventBus } from '../../../shared/infra/EventBus';

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
    const venues = await PlayerSpaceModel.find().sort({ createdAt: -1 });

    if (!requestingUserId) {
      return venues.map(v => toVenueDTO(v));
    }

    const venueIds = venues.map(v => v._id);
    const interactions = await VenueInteractionModel.find({
      userId: requestingUserId,
      venueId: { $in: venueIds },
    });

    const interactionMap = new Map(
      interactions.map(i => [
        i.venueId.toString(),
        { isLiked: i.isLiked, isSubscribed: i.isSubscribed, myRating: i.myRating },
      ])
    );

    const defaultInteraction = { isLiked: false, isSubscribed: false, myRating: undefined };
    return venues.map(v => toVenueDTO(v, interactionMap.get(v._id.toString()) ?? defaultInteraction));
  }

  async getVenueById(venueId: string, requestingUserId?: string): Promise<Result<GameVenueResponseDTO>> {
    const venue = await PlayerSpaceModel.findById(venueId);
    if (!venue) return Result.fail('Venue not found.');

    let interaction: { isLiked: boolean; isSubscribed: boolean; myRating: number | undefined } | undefined;
    if (requestingUserId) {
      const i = await VenueInteractionModel.findOne({ userId: requestingUserId, venueId });
      interaction = i
        ? { isLiked: i.isLiked, isSubscribed: i.isSubscribed, myRating: i.myRating }
        : { isLiked: false, isSubscribed: false, myRating: undefined };
    }

    return Result.ok(toVenueDTO(venue, interaction));
  }

  async createVenue(userId: string, dto: CreatePlayerSpaceDTO): Promise<Result<GameVenueResponseDTO>> {
    const count = await PlayerSpaceModel.countDocuments({ owner_id: userId });
    if (count >= 3) return Result.fail('You can only create up to 3 places.');

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
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
      ...(dto.images !== undefined && { images: dto.images }),
      ...(dto.rules !== undefined && { rules: dto.rules }),
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

    const updated = await PlayerSpaceModel.findByIdAndUpdate(venueId, { $set: update }, { new: true });
    return Result.ok(toVenueDTO(updated!));
  }

  async toggleLike(venueId: string, userId: string): Promise<Result<{ isLiked: boolean }>> {
    const venue = await PlayerSpaceModel.findById(venueId);
    if (!venue) return Result.fail('Venue not found.');

    const interaction = await VenueInteractionModel.findOne({ userId, venueId });
    const currentlyLiked = interaction?.isLiked ?? false;
    const newLiked = !currentlyLiked;
    const delta = newLiked ? 1 : -1;

    await VenueInteractionModel.findOneAndUpdate(
      { userId, venueId },
      { $set: { isLiked: newLiked } },
      { upsert: true }
    );
    await PlayerSpaceModel.findByIdAndUpdate(venueId, { $inc: { totalLikes: delta } });

    if (delta > 0) {
      await UserModel.findByIdAndUpdate(venue.owner_id, { $inc: { likesReceived: 1 } });
    }

    return Result.ok({ isLiked: newLiked });
  }

  async toggleSubscribe(venueId: string, userId: string): Promise<Result<{ isSubscribed: boolean }>> {
    const venue = await PlayerSpaceModel.findById(venueId);
    if (!venue) return Result.fail('Venue not found.');

    const interaction = await VenueInteractionModel.findOne({ userId, venueId });
    const currentlySubscribed = interaction?.isSubscribed ?? false;
    const newSubscribed = !currentlySubscribed;
    const delta = newSubscribed ? 1 : -1;

    await VenueInteractionModel.findOneAndUpdate(
      { userId, venueId },
      { $set: { isSubscribed: newSubscribed } },
      { upsert: true }
    );
    await PlayerSpaceModel.findByIdAndUpdate(venueId, { $inc: { totalSubscribers: delta } });

    return Result.ok({ isSubscribed: newSubscribed });
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
    const requestingUser = await UserModel.findById(adminId, 'role');
    if (!requestingUser || !['admin', 'web_admin'].includes(requestingUser.role ?? '')) {
      return Result.fail('Forbidden: admin access required.');
    }

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
    const requestingUser = await UserModel.findById(adminId, 'role');
    if (!requestingUser || !['admin', 'web_admin'].includes(requestingUser.role ?? '')) {
      return Result.fail('Forbidden: admin access required.');
    }

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
}
