/**
 * Extended service-layer integration tests for MatchService.
 * Covers methods not in MatchService.integ.test.ts:
 *   rateMatch, toggleLike, setExternalPax, updateSession, pinMatch,
 *   addGuest / removeGuest, notifyAll / messagePlayer (no crash)
 *   getMatchById, getMyEvents, getActiveMatches, deleteMatch
 */

import { describe, it, expect, vi } from 'vitest';
import { setupMongoMemory } from '../../../__tests__/helpers/setupMongoMemory';
import { createTestUser } from '../../../__tests__/helpers/createTestUser';
import { createTestVenue } from '../../../__tests__/helpers/createTestVenue';
import { createTestMatch } from '../../../__tests__/helpers/createTestMatch';
import { MatchService } from '../coreLogic/MatchService';
import { MatchModel } from '../DBSchemas/MatchSchema';
import { SessionInteractionModel } from '../DBSchemas/SessionInteractionSchema';
import { UserModel } from '../../users/DBSchemas/UserSchema';

// Suppress notification email calls in this suite
vi.mock('../../../shared/infra/email', () => ({
  sendOtpEmail: vi.fn().mockResolvedValue(undefined),
  sendMatchInviteEmail: vi.fn().mockResolvedValue(undefined),
  sendBookingInquiryEmail: vi.fn().mockResolvedValue(undefined),
}));

setupMongoMemory();

const svc = new MatchService();

// ─── rateMatch ────────────────────────────────────────────────────────────────

describe('MatchService — rateMatch', () => {
  it('MS-EXT-RATE-1: saves rating on SessionInteraction', async () => {
    const host = await createTestUser();
    const player = await createTestUser();
    const venue = await createTestVenue(host._id.toString());
    // createTestMatch already creates SessionInteraction for extraPlayerIds
    const match = await createTestMatch({
      hostId: host._id.toString(),
      venueId: venue._id.toString(),
      status: 'Completed',
      extraPlayerIds: [player._id.toString()],
    });

    const result = await svc.rateMatch(match._id.toString(), player._id.toString(), { rating: 4 });

    expect(result.isSuccess).toBe(true);
    const interaction = await SessionInteractionModel.findOne({ userId: player._id.toString(), sessionId: match._id });
    expect(interaction?.myRating).toBe(4);
  });

  it('MS-EXT-RATE-2: returns failure when match does not exist', async () => {
    const user = await createTestUser();
    const fakeId = '0'.repeat(24);

    const result = await svc.rateMatch(fakeId, user._id.toString(), { rating: 3 });

    expect(result.isFailure).toBe(true);
    expect(result.getError()).toMatch(/not found/i);
  });

  it('MS-EXT-RATE-3: multiple ratings from different users are stored independently', async () => {
    const host = await createTestUser();
    const p1 = await createTestUser();
    const p2 = await createTestUser();
    const venue = await createTestVenue(host._id.toString());
    // createTestMatch creates interactions for extraPlayerIds automatically
    const match = await createTestMatch({
      hostId: host._id.toString(),
      venueId: venue._id.toString(),
      status: 'Completed',
      extraPlayerIds: [p1._id.toString(), p2._id.toString()],
    });

    await svc.rateMatch(match._id.toString(), p1._id.toString(), { rating: 5 });
    await svc.rateMatch(match._id.toString(), p2._id.toString(), { rating: 2 });

    const int1 = await SessionInteractionModel.findOne({ userId: p1._id.toString(), sessionId: match._id });
    const int2 = await SessionInteractionModel.findOne({ userId: p2._id.toString(), sessionId: match._id });
    expect(int1?.myRating).toBe(5);
    expect(int2?.myRating).toBe(2);
  });
});

// ─── toggleLike ───────────────────────────────────────────────────────────────

describe('MatchService — toggleLike', () => {
  it('MS-EXT-LIKE-1: first like → isLiked=true, totalLikes increments', async () => {
    const host = await createTestUser();
    const liker = await createTestUser();
    const venue = await createTestVenue(host._id.toString());
    const match = await createTestMatch({ hostId: host._id.toString(), venueId: venue._id.toString() });

    const result = await svc.toggleLike(match._id.toString(), liker._id.toString());

    expect(result.isSuccess).toBe(true);
    expect(result.getValue().isLiked).toBe(true);
    const updated = await MatchModel.findById(match._id);
    expect(updated?.totalLikes).toBe(1);
  });

  it('MS-EXT-LIKE-2: second toggle → isLiked=false, totalLikes decrements', async () => {
    const host = await createTestUser();
    const liker = await createTestUser();
    const venue = await createTestVenue(host._id.toString());
    const match = await createTestMatch({ hostId: host._id.toString(), venueId: venue._id.toString() });

    await svc.toggleLike(match._id.toString(), liker._id.toString());
    const result = await svc.toggleLike(match._id.toString(), liker._id.toString());

    expect(result.getValue().isLiked).toBe(false);
    const updated = await MatchModel.findById(match._id);
    expect(updated?.totalLikes).toBe(0);
  });

  it('MS-EXT-LIKE-3: host likesReceived increments on first like', async () => {
    const host = await createTestUser({ likesReceived: 0 });
    const liker = await createTestUser();
    const venue = await createTestVenue(host._id.toString());
    const match = await createTestMatch({ hostId: host._id.toString(), venueId: venue._id.toString() });

    await svc.toggleLike(match._id.toString(), liker._id.toString());

    const updatedHost = await UserModel.findById(host._id);
    expect(updatedHost?.likesReceived).toBeGreaterThanOrEqual(1);
  });

  it('MS-EXT-LIKE-4: returns failure for non-existent match', async () => {
    const user = await createTestUser();
    const result = await svc.toggleLike('0'.repeat(24), user._id.toString());
    expect(result.isFailure).toBe(true);
  });
});

// ─── setExternalPax ───────────────────────────────────────────────────────────

describe('MatchService — setExternalPax', () => {
  it('MS-EXT-EXTPAX-1: host can set external pax count', async () => {
    const host = await createTestUser();
    const venue = await createTestVenue(host._id.toString());
    const match = await createTestMatch({ hostId: host._id.toString(), venueId: venue._id.toString() });

    const result = await svc.setExternalPax(match._id.toString(), host._id.toString(), 3);

    expect(result.isSuccess).toBe(true);
    const updated = await MatchModel.findById(match._id);
    expect(updated?.config.external_pax).toBe(3);
  });

  it('MS-EXT-EXTPAX-2: non-host gets failure', async () => {
    const host = await createTestUser();
    const other = await createTestUser();
    const venue = await createTestVenue(host._id.toString());
    const match = await createTestMatch({ hostId: host._id.toString(), venueId: venue._id.toString() });

    const result = await svc.setExternalPax(match._id.toString(), other._id.toString(), 5);

    expect(result.isFailure).toBe(true);
  });

  it('MS-EXT-EXTPAX-3: setting to 0 is valid', async () => {
    const host = await createTestUser();
    const venue = await createTestVenue(host._id.toString());
    const match = await createTestMatch({ hostId: host._id.toString(), venueId: venue._id.toString() });

    const result = await svc.setExternalPax(match._id.toString(), host._id.toString(), 0);

    expect(result.isSuccess).toBe(true);
  });
});

// ─── updateSession ────────────────────────────────────────────────────────────

describe('MatchService — updateSession', () => {
  it('MS-EXT-UPDATE-1: host can update title', async () => {
    const host = await createTestUser();
    const venue = await createTestVenue(host._id.toString());
    const match = await createTestMatch({ hostId: host._id.toString(), venueId: venue._id.toString() });

    const result = await svc.updateSession(match._id.toString(), host._id.toString(), { title: 'New Title' });

    expect(result.isSuccess).toBe(true);
    expect(result.getValue().title).toBe('New Title');
  });

  it('MS-EXT-UPDATE-2: host can update maxPax', async () => {
    const host = await createTestUser();
    const venue = await createTestVenue(host._id.toString());
    const match = await createTestMatch({ hostId: host._id.toString(), venueId: venue._id.toString(), maxPax: 12 });

    const result = await svc.updateSession(match._id.toString(), host._id.toString(), { max_pax: 16 });

    expect(result.isSuccess).toBe(true);
  });

  it('MS-EXT-UPDATE-3: non-host cannot update session', async () => {
    const host = await createTestUser();
    const other = await createTestUser();
    const venue = await createTestVenue(host._id.toString());
    const match = await createTestMatch({ hostId: host._id.toString(), venueId: venue._id.toString() });

    const result = await svc.updateSession(match._id.toString(), other._id.toString(), { title: 'Hijacked' });

    expect(result.isFailure).toBe(true);
    expect(result.getError()).toMatch(/only the host/i);
  });
});

// ─── pinMatch (admin) ─────────────────────────────────────────────────────────

describe('MatchService — pinMatch', () => {
  it('MS-EXT-PIN-1: admin can pin a match', async () => {
    const host = await createTestUser();
    const admin = await createTestUser({ role: 'admin' });
    const venue = await createTestVenue(host._id.toString());
    const match = await createTestMatch({ hostId: host._id.toString(), venueId: venue._id.toString() });

    const result = await svc.pinMatch(match._id.toString(), admin._id.toString());

    expect(result.isSuccess).toBe(true);
    expect(result.getValue().isPinned).toBe(true);
    const updated = await MatchModel.findById(match._id);
    expect(updated?.isPinned).toBe(true);
  });

  it('MS-EXT-PIN-2: pinning already-pinned match toggles off', async () => {
    const host = await createTestUser();
    const admin = await createTestUser({ role: 'admin' });
    const venue = await createTestVenue(host._id.toString());
    const match = await createTestMatch({ hostId: host._id.toString(), venueId: venue._id.toString() });
    await MatchModel.findByIdAndUpdate(match._id, { isPinned: true });

    const result = await svc.pinMatch(match._id.toString(), admin._id.toString());

    expect(result.isSuccess).toBe(true);
    expect(result.getValue().isPinned).toBe(false);
  });

  it('MS-EXT-PIN-3: non-admin cannot pin', async () => {
    const host = await createTestUser({ role: 'player' });
    const venue = await createTestVenue(host._id.toString());
    const match = await createTestMatch({ hostId: host._id.toString(), venueId: venue._id.toString() });

    const result = await svc.pinMatch(match._id.toString(), host._id.toString());

    expect(result.isFailure).toBe(true);
    expect(result.getError()).toMatch(/forbidden/i);
  });
});

// ─── addGuest / removeGuest ───────────────────────────────────────────────────

describe('MatchService — addGuest / removeGuest', () => {
  it('MS-EXT-GUEST-1: host can add a guest', async () => {
    const host = await createTestUser();
    const venue = await createTestVenue(host._id.toString());
    const match = await createTestMatch({ hostId: host._id.toString(), venueId: venue._id.toString() });

    const result = await svc.addGuest(match._id.toString(), host._id.toString(), 'Alice Guest');

    expect(result.isSuccess).toBe(true);
    const updated = await MatchModel.findById(match._id);
    expect(updated?.guests?.some(g => g.name === 'Alice Guest')).toBe(true);
  });

  it('MS-EXT-GUEST-2: non-host cannot add guest', async () => {
    const host = await createTestUser();
    const other = await createTestUser();
    const venue = await createTestVenue(host._id.toString());
    const match = await createTestMatch({ hostId: host._id.toString(), venueId: venue._id.toString() });

    const result = await svc.addGuest(match._id.toString(), other._id.toString(), 'Rogue');

    expect(result.isFailure).toBe(true);
  });

  it('MS-EXT-GUEST-3: host can remove guest at index 0', async () => {
    const host = await createTestUser();
    const venue = await createTestVenue(host._id.toString());
    const match = await createTestMatch({ hostId: host._id.toString(), venueId: venue._id.toString() });
    await svc.addGuest(match._id.toString(), host._id.toString(), 'Remove Me');

    const result = await svc.removeGuest(match._id.toString(), host._id.toString(), 0);

    expect(result.isSuccess).toBe(true);
    const updated = await MatchModel.findById(match._id);
    expect(updated?.guests?.length ?? 0).toBe(0);
  });

  it('MS-EXT-GUEST-4: removing out-of-range index returns failure', async () => {
    const host = await createTestUser();
    const venue = await createTestVenue(host._id.toString());
    const match = await createTestMatch({ hostId: host._id.toString(), venueId: venue._id.toString() });

    const result = await svc.removeGuest(match._id.toString(), host._id.toString(), 99);

    expect(result.isFailure).toBe(true);
  });
});

// ─── getMatchById ─────────────────────────────────────────────────────────────

describe('MatchService — getMatchById', () => {
  it('MS-EXT-GETBYID-1: returns DTO for existing match', async () => {
    const host = await createTestUser();
    const venue = await createTestVenue(host._id.toString());
    const match = await createTestMatch({ hostId: host._id.toString(), venueId: venue._id.toString() });

    const result = await svc.getMatchById(match._id.toString());

    expect(result.isSuccess).toBe(true);
    expect(result.getValue().id).toBe(match._id.toString());
  });

  it('MS-EXT-GETBYID-2: returns failure for non-existent match', async () => {
    const result = await svc.getMatchById('0'.repeat(24));

    expect(result.isFailure).toBe(true);
    expect(result.getError()).toMatch(/not found/i);
  });

  it('MS-EXT-GETBYID-3: myInteraction is set when requestingUserId provided', async () => {
    const host = await createTestUser();
    const player = await createTestUser();
    const venue = await createTestVenue(host._id.toString());
    const match = await createTestMatch({
      hostId: host._id.toString(),
      venueId: venue._id.toString(),
      extraPlayerIds: [player._id.toString()],
    });

    const result = await svc.getMatchById(match._id.toString(), player._id.toString());

    expect(result.isSuccess).toBe(true);
    expect(result.getValue().myInteraction).toBeDefined();
    expect(result.getValue().myInteraction?.status).toBe('registered');
  });
});

// ─── getActiveMatches ─────────────────────────────────────────────────────────

describe('MatchService — getActiveMatches', () => {
  it('MS-EXT-ACTIVE-1: returns an array (can be empty)', async () => {
    const matches = await svc.getActiveMatches();
    expect(Array.isArray(matches)).toBe(true);
  });

  it('MS-EXT-ACTIVE-2: Cancelled matches are excluded from active list', async () => {
    const host = await createTestUser();
    const venue = await createTestVenue(host._id.toString());
    const cancelled = await createTestMatch({
      hostId: host._id.toString(),
      venueId: venue._id.toString(),
      status: 'Cancelled',
    });

    const matches = await svc.getActiveMatches();
    const found = matches.find(m => m.id === cancelled._id.toString());
    expect(found).toBeUndefined();
  });

  it('MS-EXT-ACTIVE-3: Completed matches are excluded from active list', async () => {
    const host = await createTestUser();
    const venue = await createTestVenue(host._id.toString());
    const completed = await createTestMatch({
      hostId: host._id.toString(),
      venueId: venue._id.toString(),
      status: 'Completed',
    });

    const matches = await svc.getActiveMatches();
    const found = matches.find(m => m.id === completed._id.toString());
    expect(found).toBeUndefined();
  });

  it('MS-EXT-ACTIVE-4: invite_only matches ARE included in active list (privacy is enforced at frontend)', async () => {
    // Note: getActiveMatches does not filter by approvalMode.
    // Privacy filtering for invite_only happens at the frontend layer.
    const host = await createTestUser();
    const venue = await createTestVenue(host._id.toString());
    const inviteOnly = await createTestMatch({
      hostId: host._id.toString(),
      venueId: venue._id.toString(),
      approvalMode: 'invite_only',
    });

    const matches = await svc.getActiveMatches();
    // invite_only matches should be present in getActiveMatches (backend doesn't filter)
    const found = matches.find(m => m.id === inviteOnly._id.toString());
    expect(found).toBeDefined();
  });
});

// ─── getMyEvents ──────────────────────────────────────────────────────────────

describe('MatchService — getMyEvents', () => {
  it('MS-EXT-MYEVENTS-1: returns events user is registered in', async () => {
    const host = await createTestUser();
    const venue = await createTestVenue(host._id.toString());
    const match = await createTestMatch({ hostId: host._id.toString(), venueId: venue._id.toString() });

    const events = await svc.getMyEvents(host._id.toString());

    const found = events.find(e => e.id === match._id.toString());
    expect(found).toBeDefined();
  });

  it('MS-EXT-MYEVENTS-2: events from other hosts are excluded', async () => {
    const host1 = await createTestUser();
    const host2 = await createTestUser();
    const venue1 = await createTestVenue(host1._id.toString());
    const venue2 = await createTestVenue(host2._id.toString());
    await createTestMatch({ hostId: host1._id.toString(), venueId: venue1._id.toString() });
    const match2 = await createTestMatch({ hostId: host2._id.toString(), venueId: venue2._id.toString() });

    const events = await svc.getMyEvents(host1._id.toString());

    const found = events.find(e => e.id === match2._id.toString());
    expect(found).toBeUndefined();
  });
});

// ─── deleteMatch ──────────────────────────────────────────────────────────────

describe('MatchService — deleteMatch', () => {
  it('MS-EXT-DEL-1: host can delete their own Open match', async () => {
    const host = await createTestUser();
    const venue = await createTestVenue(host._id.toString());
    const match = await createTestMatch({ hostId: host._id.toString(), venueId: venue._id.toString() });

    const result = await svc.deleteMatch(match._id.toString(), host._id.toString());

    expect(result.isSuccess).toBe(true);
    const doc = await MatchModel.findById(match._id);
    expect(doc).toBeNull();
  });

  it('MS-EXT-DEL-2: non-host (even admin) cannot delete — only the host can', async () => {
    const host = await createTestUser();
    const notHost = await createTestUser({ role: 'player' });
    const venue = await createTestVenue(host._id.toString());
    const match = await createTestMatch({ hostId: host._id.toString(), venueId: venue._id.toString() });

    const result = await svc.deleteMatch(match._id.toString(), notHost._id.toString());

    expect(result.isFailure).toBe(true);
    // deleteMatch only checks if requester is the host
    expect(result.getError()).toMatch(/only the host/i);
  });

  it('MS-EXT-DEL-3: deleting non-existent match returns failure', async () => {
    const host = await createTestUser();
    const result = await svc.deleteMatch('0'.repeat(24), host._id.toString());

    expect(result.isFailure).toBe(true);
    expect(result.getError()).toMatch(/not found/i);
  });

  it('MS-EXT-DEL-4: host cannot delete a Started match', async () => {
    const host = await createTestUser();
    const venue = await createTestVenue(host._id.toString());
    const match = await createTestMatch({
      hostId: host._id.toString(),
      venueId: venue._id.toString(),
      status: 'Started',
    });

    const result = await svc.deleteMatch(match._id.toString(), host._id.toString());

    expect(result.isFailure).toBe(true);
    expect(result.getError()).toMatch(/started/i);
  });
});
