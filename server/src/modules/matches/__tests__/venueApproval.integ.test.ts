import { describe, it, expect } from 'vitest';
import { setupMongoMemory } from '../../../__tests__/helpers/setupMongoMemory';
import { createTestUser } from '../../../__tests__/helpers/createTestUser';
import { createTestVenue } from '../../../__tests__/helpers/createTestVenue';
import { createTestMatch } from '../../../__tests__/helpers/createTestMatch';
import { MatchService } from '../coreLogic/MatchService';
import { MatchModel } from '../DBSchemas/MatchSchema';
import { NotificationModel } from '../../notifications/DBSchemas/NotificationSchema';

setupMongoMemory();

const svc = new MatchService();

describe('MatchService — approveVenueSession', () => {
  it('VA-1: sets venueApprovalStatus to "confirmed" when called by venue owner', async () => {
    const venueOwner = await createTestUser();
    const host = await createTestUser();
    const venue = await createTestVenue(venueOwner._id.toString());
    const match = await createTestMatch({ hostId: host._id.toString(), venueId: venue._id.toString() });

    const result = await svc.approveVenueSession(match._id.toString(), venueOwner._id.toString());

    expect(result.isSuccess).toBe(true);
    const doc = await MatchModel.findById(match._id);
    expect(doc?.venueApprovalStatus).toBe('confirmed');
  });

  it('VA-2: creates in-app notification for the match host after venue approval', async () => {
    const venueOwner = await createTestUser();
    const host = await createTestUser();
    const venue = await createTestVenue(venueOwner._id.toString());
    const match = await createTestMatch({ hostId: host._id.toString(), venueId: venue._id.toString() });

    await svc.approveVenueSession(match._id.toString(), venueOwner._id.toString());

    const notification = await NotificationModel.findOne({ recipientId: host._id.toString() });
    expect(notification).not.toBeNull();
    expect(notification?.channel).toBe('in-app');
  });

  it('VA-3: returns failure when caller is not the venue owner', async () => {
    const venueOwner = await createTestUser();
    const host = await createTestUser();
    const rando = await createTestUser();
    const venue = await createTestVenue(venueOwner._id.toString());
    const match = await createTestMatch({ hostId: host._id.toString(), venueId: venue._id.toString() });

    const result = await svc.approveVenueSession(match._id.toString(), rando._id.toString());

    expect(result.isFailure).toBe(true);
    expect(result.getError()).toMatch(/venue owner/i);
    const doc = await MatchModel.findById(match._id);
    expect(doc?.venueApprovalStatus).not.toBe('confirmed');
  });

  it('VA-4: returns failure when matchId does not exist', async () => {
    const venueOwner = await createTestUser();
    const badMatchId = '0'.repeat(24);

    const result = await svc.approveVenueSession(badMatchId, venueOwner._id.toString());
    expect(result.isFailure).toBe(true);
  });
});

describe('MatchService — rejectVenueSession', () => {
  it('VA-5: sets venueApprovalStatus to "rejected" when called by venue owner', async () => {
    const venueOwner = await createTestUser();
    const host = await createTestUser();
    const venue = await createTestVenue(venueOwner._id.toString());
    const match = await createTestMatch({ hostId: host._id.toString(), venueId: venue._id.toString() });

    const result = await svc.rejectVenueSession(match._id.toString(), venueOwner._id.toString());

    expect(result.isSuccess).toBe(true);
    const doc = await MatchModel.findById(match._id);
    expect(doc?.venueApprovalStatus).toBe('rejected');
  });

  it('VA-6: creates in-app notification for the host after rejection', async () => {
    const venueOwner = await createTestUser();
    const host = await createTestUser();
    const venue = await createTestVenue(venueOwner._id.toString());
    const match = await createTestMatch({ hostId: host._id.toString(), venueId: venue._id.toString() });

    await svc.rejectVenueSession(match._id.toString(), venueOwner._id.toString());

    const notification = await NotificationModel.findOne({ recipientId: host._id.toString() });
    expect(notification).not.toBeNull();
    expect(notification?.message).toMatch(/not approved/i);
  });
});
