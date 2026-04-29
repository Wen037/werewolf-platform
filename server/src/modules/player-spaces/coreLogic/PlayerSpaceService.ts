import { Result } from '../../../shared/core/Result';
import { PlayerSpaceModel, IPlayerSpaceDocument } from '../DBSchemas/PlayerSpaceSchema';
import { VenueInteractionModel } from '../DBSchemas/VenueInteractionSchema';
import { UserModel } from '../../users/DBSchemas/UserSchema';
import { CreatePlayerSpaceDTO, GameVenueResponseDTO } from '../DTOs/PlayerSpaceDTOs';

function toVenueDTO(
  doc: IPlayerSpaceDocument,
  interaction?: { isLiked: boolean; isSubscribed: boolean; myRating: number | undefined }
): GameVenueResponseDTO {
  return {
    id: doc._id.toString(),
    ownerId: doc.owner_id.toString(),
    name: doc.name,
    address: doc.address,
    description: doc.description ?? '',
    imageUrl: doc.imageUrl ?? 'https://placehold.co/600x400?text=Venue',
    type: doc.type,
    coordinates: { lat: doc.location.lat, lng: doc.location.long },
    isVerified: doc.status === 'Verified',
    pricePerHour: doc.financials.approx_fee,
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
      financials: { is_chargeable: dto.is_chargeable, approx_fee: dto.approx_fee ?? 0 },
      amenities: dto.amenities ?? [],
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
      ...(dto.rules !== undefined && { rules: dto.rules }),
    };

    const venue = await PlayerSpaceModel.create(docData);
    return Result.ok(toVenueDTO(venue));
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
