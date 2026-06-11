/**
 * Moderation permissions (BFLA/BOLA):
 * - admin can delete any event (any status; players notified) and any space
 *   (active matches force-cancelled, hosts notified)
 * - host can delete his own event (Open/Cancelled only) — regression
 * - venue owner can cancel and delete events held at his space
 * - unrelated users are denied everywhere
 */
import { describe, it, expect } from 'vitest';
import { setupMongoMemory } from '../../../__tests__/helpers/setupMongoMemory';
import { createTestUser } from '../../../__tests__/helpers/createTestUser';
import { createTestVenue } from '../../../__tests__/helpers/createTestVenue';
import { createTestMatch } from '../../../__tests__/helpers/createTestMatch';
import { MatchService } from '../coreLogic/MatchService';
import { PlayerSpaceService } from '../../player-spaces/coreLogic/PlayerSpaceService';
import { MatchModel } from '../DBSchemas/MatchSchema';
import { PlayerSpaceModel } from '../../player-spaces/DBSchemas/PlayerSpaceSchema';
import { NotificationModel } from '../../notifications/DBSchemas/NotificationSchema';

setupMongoMemory();

const matchSvc = new MatchService();
const spaceSvc = new PlayerSpaceService();

async function seed(matchStatus: 'Open' | 'Started' | 'Cancelled' = 'Open') {
  const venueOwner = await createTestUser();
  const host = await createTestUser();
  const venue = await createTestVenue(venueOwner._id.toString());
  const match = await createTestMatch({
    hostId: host._id.toString(),
    venueId: venue._id.toString(),
    status: matchStatus,
  });
  return {
    venueOwner, host, venue, match,
    matchId: match._id.toString(), venueId: venue._id.toString(),
  };
}

describe('Admin force-delete event', () => {
  it('MOD-1: admin deletes a Started event; players are notified', async () => {
    const { match, matchId } = await seed('Started');
    const player = await createTestUser();
    await MatchModel.findByIdAndUpdate(matchId, { $push: { players: player._id } });
    const admin = await createTestUser({ role: 'admin' });

    const res = await matchSvc.deleteMatch(matchId, admin._id.toString());
    expect(res.isSuccess).toBe(true);
    expect(await MatchModel.findById(matchId)).toBeNull();

    const note = await NotificationModel.findOne({ recipientId: player._id.toString() });
    expect(note?.message).toContain(match.title);
  });

  it('MOD-2: unrelated user cannot delete an event', async () => {
    const { matchId } = await seed('Open');
    const stranger = await createTestUser();
    const res = await matchSvc.deleteMatch(matchId, stranger._id.toString());
    expect(res.isFailure).toBe(true);
    expect(await MatchModel.findById(matchId)).not.toBeNull();
  });
});

describe('Host delete own event (regression)', () => {
  it('MOD-3: host deletes own Open event; host cannot delete Started event', async () => {
    const open = await seed('Open');
    expect((await matchSvc.deleteMatch(open.matchId, open.host._id.toString())).isSuccess).toBe(true);

    const started = await seed('Started');
    const res = await matchSvc.deleteMatch(started.matchId, started.host._id.toString());
    expect(res.isFailure).toBe(true);
    expect(res.getError()).toMatch(/Only Open or Cancelled/);
  });
});

describe('Venue owner cancel + delete events at his space', () => {
  it('MOD-4: venue owner cancels an event at his space; host notified, no penalty', async () => {
    const { venueOwner, host, matchId } = await seed('Open');
    const res = await matchSvc.cancelByVenueOwner(matchId, venueOwner._id.toString());
    expect(res.isSuccess).toBe(true);

    const doc = await MatchModel.findById(matchId);
    expect(doc?.status).toBe('Cancelled');
    const note = await NotificationModel.findOne({ recipientId: host._id.toString() });
    expect(note?.message).toMatch(/cancelled by the venue/i);
  });

  it('MOD-5: venue owner deletes a Cancelled event at his space; stranger cannot cancel', async () => {
    const { venueOwner, matchId } = await seed('Cancelled');
    expect((await matchSvc.deleteMatch(matchId, venueOwner._id.toString())).isSuccess).toBe(true);

    const second = await seed('Open');
    const stranger = await createTestUser();
    const denied = await matchSvc.cancelByVenueOwner(second.matchId, stranger._id.toString());
    expect(denied.isFailure).toBe(true);
  });
});

describe('Admin force-delete space', () => {
  it('MOD-6: admin deletes a venue with active matches — matches cancelled, hosts notified', async () => {
    const { host, match, matchId, venueId } = await seed('Open');
    const admin = await createTestUser({ role: 'admin' });

    const res = await spaceSvc.deleteVenue(venueId, admin._id.toString());
    expect(res.isSuccess).toBe(true);
    expect(await PlayerSpaceModel.findById(venueId)).toBeNull();

    const doc = await MatchModel.findById(matchId);
    expect(doc?.status).toBe('Cancelled');
    const note = await NotificationModel.findOne({ recipientId: host._id.toString() });
    expect(note?.message).toContain(match.title);
  });

  it('MOD-7: owner still blocked while active matches exist; stranger denied', async () => {
    const { venueOwner, venueId } = await seed('Open');
    const blocked = await spaceSvc.deleteVenue(venueId, venueOwner._id.toString());
    expect(blocked.isFailure).toBe(true);
    expect(blocked.getError()).toMatch(/active matches/i);

    const stranger = await createTestUser();
    const denied = await spaceSvc.deleteVenue(venueId, stranger._id.toString());
    expect(denied.isFailure).toBe(true);
    expect(denied.getError()).toMatch(/Forbidden/);
  });
});
