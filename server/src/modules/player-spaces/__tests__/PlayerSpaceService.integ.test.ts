import { describe, it, expect } from 'vitest';
import { setupMongoMemory } from '../../../__tests__/helpers/setupMongoMemory';
import { createTestUser } from '../../../__tests__/helpers/createTestUser';
import { createTestVenue } from '../../../__tests__/helpers/createTestVenue';
import { PlayerSpaceService } from '../coreLogic/PlayerSpaceService';
import { PlayerSpaceModel } from '../DBSchemas/PlayerSpaceSchema';
import { VenueInteractionModel } from '../DBSchemas/VenueInteractionSchema';

setupMongoMemory();

const svc = new PlayerSpaceService();

const baseDto = {
  name: 'Test Venue',
  address: '123 Test Street, Singapore',
  type: 'house' as const,
  privacy: 'public' as const,
  lat: 1.3521,
  lng: 103.8198,
  is_chargeable: false,
};

describe('PlayerSpaceService — createVenue', () => {
  it('PSS-CREATE-1: creates venue and returns GameVenueResponseDTO with correct shape', async () => {
    const owner = await createTestUser();

    const result = await svc.createVenue(owner._id.toString(), baseDto);

    expect(result.isSuccess).toBe(true);
    const dto = result.getValue();
    expect(dto.id).toBeTruthy();
    expect(dto.ownerId).toBe(owner._id.toString());
    expect(dto.isVerified).toBe(false);
  });

  it('PSS-CREATE-2: returns failure when owner already has 3 venues', async () => {
    const owner = await createTestUser();
    await createTestVenue(owner._id.toString());
    await createTestVenue(owner._id.toString());
    await createTestVenue(owner._id.toString());

    const result = await svc.createVenue(owner._id.toString(), { ...baseDto, name: 'Fourth Venue' });

    expect(result.isFailure).toBe(true);
    expect(result.getError()).toMatch(/3/);
  });
});

describe('PlayerSpaceService — updateVenue', () => {
  it('PSS-UPDATE-1: owner can update venue name and description', async () => {
    const owner = await createTestUser();
    const venue = await createTestVenue(owner._id.toString());

    const result = await svc.updateVenue(venue._id.toString(), owner._id.toString(), {
      name: 'Updated Name',
      description: 'Updated description',
    });

    expect(result.isSuccess).toBe(true);
    expect(result.getValue().name).toBe('Updated Name');
  });

  it('PSS-UPDATE-2: returns failure with "Forbidden" message when non-owner calls update', async () => {
    const owner = await createTestUser();
    const rando = await createTestUser();
    const venue = await createTestVenue(owner._id.toString());

    const result = await svc.updateVenue(venue._id.toString(), rando._id.toString(), { name: 'Hack' });

    expect(result.isFailure).toBe(true);
    expect(result.getError()).toMatch(/forbidden/i);
  });
});

describe('PlayerSpaceService — toggleLike', () => {
  it('PSS-LIKE-1: first like → isLiked=true, totalLikes increments by 1', async () => {
    const user = await createTestUser();
    const venue = await createTestVenue(user._id.toString());

    const result = await svc.toggleLike(venue._id.toString(), user._id.toString());

    expect(result.isSuccess).toBe(true);
    expect(result.getValue().isLiked).toBe(true);
    const updated = await PlayerSpaceModel.findById(venue._id);
    expect(updated?.totalLikes).toBe(1);
  });

  it('PSS-LIKE-2: second call toggles back → isLiked=false, totalLikes decrements', async () => {
    const user = await createTestUser();
    const venue = await createTestVenue(user._id.toString());

    await svc.toggleLike(venue._id.toString(), user._id.toString());
    const result = await svc.toggleLike(venue._id.toString(), user._id.toString());

    expect(result.getValue().isLiked).toBe(false);
    const updated = await PlayerSpaceModel.findById(venue._id);
    expect(updated?.totalLikes).toBe(0);
  });
});

describe('PlayerSpaceService — toggleSubscribe', () => {
  it('PSS-SUB-1: first subscribe → isSubscribed=true, totalSubscribers increments', async () => {
    const user = await createTestUser();
    const venue = await createTestVenue(user._id.toString());

    const result = await svc.toggleSubscribe(venue._id.toString(), user._id.toString());

    expect(result.getValue().isSubscribed).toBe(true);
    const updated = await PlayerSpaceModel.findById(venue._id);
    expect(updated?.totalSubscribers).toBe(1);
  });

  it('PSS-SUB-2: second subscribe call toggles off, totalSubscribers decrements', async () => {
    const user = await createTestUser();
    const venue = await createTestVenue(user._id.toString());

    await svc.toggleSubscribe(venue._id.toString(), user._id.toString());
    const result = await svc.toggleSubscribe(venue._id.toString(), user._id.toString());

    expect(result.getValue().isSubscribed).toBe(false);
    const updated = await PlayerSpaceModel.findById(venue._id);
    expect(updated?.totalSubscribers).toBe(0);
  });
});

describe('PlayerSpaceService — rateVenue', () => {
  it('PSS-RATE-1: first rating sets averageRating correctly', async () => {
    const user = await createTestUser();
    const venue = await createTestVenue(user._id.toString());

    await svc.rateVenue(venue._id.toString(), user._id.toString(), 4);

    const updated = await PlayerSpaceModel.findById(venue._id);
    expect(updated?.averageRating).toBeCloseTo(4.0);
  });

  it('PSS-RATE-2: two different raters produce correct arithmetic mean', async () => {
    const owner = await createTestUser();
    const rater1 = await createTestUser();
    const rater2 = await createTestUser();
    const venue = await createTestVenue(owner._id.toString());

    await svc.rateVenue(venue._id.toString(), rater1._id.toString(), 4);
    await svc.rateVenue(venue._id.toString(), rater2._id.toString(), 2);

    const updated = await PlayerSpaceModel.findById(venue._id);
    expect(updated?.averageRating).toBeCloseTo(3.0);
  });
});

describe('PlayerSpaceService — getAllVenues', () => {
  it('PSS-LIST-1: returns myInteraction block when requestingUserId is provided', async () => {
    const owner = await createTestUser();
    const user = await createTestUser();
    const venue = await createTestVenue(owner._id.toString());
    await VenueInteractionModel.create({ userId: user._id.toString(), venueId: venue._id, isLiked: true, isSubscribed: false });

    const venues = await svc.getAllVenues(user._id.toString());

    const found = venues.find(v => v.id === venue._id.toString());
    expect(found?.myInteraction).toBeDefined();
    expect(found?.myInteraction?.isLiked).toBe(true);
  });

  it('PSS-LIST-2: returns venues without myInteraction when no userId provided', async () => {
    const owner = await createTestUser();
    await createTestVenue(owner._id.toString());

    const venues = await svc.getAllVenues();

    venues.forEach(v => {
      expect(v.myInteraction).toBeUndefined();
    });
  });
});
