/**
 * Space comments — permissions mirror event comments:
 * - any logged-in user can post (unless locked)
 * - author can delete own comment
 * - space owner and admin can delete any comment and lock/unlock
 * - guests can only read
 * Also covers the venue-approval fix: events created on an OWNED space
 * (incl. boardgame_store) by a non-owner start as 'pending'.
 */
import { describe, it, expect } from 'vitest';
import { setupMongoMemory } from '../../../__tests__/helpers/setupMongoMemory';
import { createTestUser } from '../../../__tests__/helpers/createTestUser';
import { createTestVenue } from '../../../__tests__/helpers/createTestVenue';
import { PlayerSpaceService } from '../coreLogic/PlayerSpaceService';
import { PlayerSpaceModel } from '../DBSchemas/PlayerSpaceSchema';
import { MatchService } from '../../matches/coreLogic/MatchService';

setupMongoMemory();

const svc = new PlayerSpaceService();
const matchSvc = new MatchService();

async function seed() {
  const owner = await createTestUser();
  const commenter = await createTestUser();
  const venue = await createTestVenue(owner._id.toString());
  return { owner, commenter, venue, venueId: venue._id.toString() };
}

describe('Space comments — post & read', () => {
  it('SC-1: logged-in user can post; getComments returns it with username', async () => {
    const { commenter, venueId } = await seed();
    const added = await svc.addComment(venueId, commenter._id.toString(), 'Nice place!');
    expect(added.isSuccess).toBe(true);
    expect(added.getValue().username).toBe(commenter.username);

    const list = await svc.getComments(venueId);
    expect(list).toHaveLength(1);
    expect(list[0]!.text).toBe('Nice place!');
  });

  it('SC-2: posting on a nonexistent venue fails', async () => {
    const user = await createTestUser();
    const res = await svc.addComment('64b000000000000000000000', user._id.toString(), 'hi');
    expect(res.isFailure).toBe(true);
  });
});

describe('Space comments — delete permissions (BOLA matrix)', () => {
  it('SC-3: author can delete own comment', async () => {
    const { commenter, venueId } = await seed();
    const added = await svc.addComment(venueId, commenter._id.toString(), 'mine');
    const del = await svc.deleteComment(venueId, added.getValue().id, commenter._id.toString());
    expect(del.isSuccess).toBe(true);
    expect(await svc.getComments(venueId)).toHaveLength(0);
  });

  it('SC-4: space owner can delete any comment', async () => {
    const { owner, commenter, venueId } = await seed();
    const added = await svc.addComment(venueId, commenter._id.toString(), 'spam');
    const del = await svc.deleteComment(venueId, added.getValue().id, owner._id.toString());
    expect(del.isSuccess).toBe(true);
  });

  it('SC-5: admin can delete any comment', async () => {
    const { commenter, venueId } = await seed();
    const admin = await createTestUser({ role: 'admin' });
    const added = await svc.addComment(venueId, commenter._id.toString(), 'spam');
    const del = await svc.deleteComment(venueId, added.getValue().id, admin._id.toString());
    expect(del.isSuccess).toBe(true);
  });

  it('SC-6: unrelated user cannot delete someone else\'s comment', async () => {
    const { commenter, venueId } = await seed();
    const stranger = await createTestUser();
    const added = await svc.addComment(venueId, commenter._id.toString(), 'keep');
    const del = await svc.deleteComment(venueId, added.getValue().id, stranger._id.toString());
    expect(del.isFailure).toBe(true);
    expect(await svc.getComments(venueId)).toHaveLength(1);
  });
});

describe('Space comments — locking (BFLA)', () => {
  it('SC-7: owner can lock; locked blocks others but not the owner; unlock restores', async () => {
    const { owner, commenter, venueId } = await seed();

    const lock = await svc.lockComments(venueId, owner._id.toString(), true);
    expect(lock.isSuccess).toBe(true);

    const blocked = await svc.addComment(venueId, commenter._id.toString(), 'nope');
    expect(blocked.isFailure).toBe(true);
    expect(blocked.getError()).toMatch(/locked/i);

    const ownerPost = await svc.addComment(venueId, owner._id.toString(), 'owner still can');
    expect(ownerPost.isSuccess).toBe(true);

    await svc.lockComments(venueId, owner._id.toString(), false);
    const after = await svc.addComment(venueId, commenter._id.toString(), 'open again');
    expect(after.isSuccess).toBe(true);
  });

  it('SC-8: non-owner cannot lock; admin can', async () => {
    const { commenter, venueId } = await seed();
    const admin = await createTestUser({ role: 'admin' });

    const denied = await svc.lockComments(venueId, commenter._id.toString(), true);
    expect(denied.isFailure).toBe(true);

    const adminLock = await svc.lockComments(venueId, admin._id.toString(), true);
    expect(adminLock.isSuccess).toBe(true);
    const doc = await PlayerSpaceModel.findById(venueId);
    expect(doc?.commentsLocked).toBe(true);
  });
});

describe('Venue approval — owned spaces require owner approval', () => {
  it('VA-FIX-1: non-owner hosting at a boardgame_store starts as pending', async () => {
    const { venueId } = await seed();
    await PlayerSpaceModel.findByIdAndUpdate(venueId, { $set: { type: 'boardgame_store' } });
    const host = await createTestUser();

    const created = await matchSvc.createMatch(host._id.toString(), {
      venue_id: venueId,
      title: 'Cafe Game Night',
      scheduledAt: new Date(Date.now() + 86_400_000).toISOString(),
      min_pax: 4,
      max_pax: 12,
    });
    expect(created.isSuccess).toBe(true);
    expect(created.getValue().venueApprovalStatus).toBe('pending');
  });

  it('VA-FIX-2: school venues still auto-confirm; owner hosting own space still auto-confirms', async () => {
    const { owner, venueId } = await seed();
    await PlayerSpaceModel.findByIdAndUpdate(venueId, { $set: { type: 'school' } });
    const host = await createTestUser();

    const onSchool = await matchSvc.createMatch(host._id.toString(), {
      venue_id: venueId,
      title: 'School Session',
      scheduledAt: new Date(Date.now() + 86_400_000).toISOString(),
      min_pax: 4,
      max_pax: 12,
    });
    expect(onSchool.getValue().venueApprovalStatus).toBe('confirmed');

    await PlayerSpaceModel.findByIdAndUpdate(venueId, { $set: { type: 'house' } });
    const ownSpace = await matchSvc.createMatch(owner._id.toString(), {
      venue_id: venueId,
      title: 'My Own Space',
      scheduledAt: new Date(Date.now() + 86_400_000).toISOString(),
      min_pax: 4,
      max_pax: 12,
    });
    expect(ownSpace.getValue().venueApprovalStatus).toBe('confirmed');
  });
});
