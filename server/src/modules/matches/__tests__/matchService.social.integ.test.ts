/**
 * Service-layer integration tests for the Session 43 social features:
 *   - Event comments (add / list / delete + permissions)
 *   - Comment locking (host/admin only; lock blocks non-host posting)
 *   - Post-event recap (host/admin only; Completed events only)
 *   - Recurring events (createNextOccurrence fires once on Completed)
 *
 * Covers OWASP ASVS V4 (access control) cases for the new endpoints —
 * see docs/test-standards.md gap backlog items 1 and 2.
 */
import { describe, it, expect } from 'vitest';
import { setupMongoMemory } from '../../../__tests__/helpers/setupMongoMemory';
import { createTestUser } from '../../../__tests__/helpers/createTestUser';
import { createTestVenue } from '../../../__tests__/helpers/createTestVenue';
import { createTestMatch } from '../../../__tests__/helpers/createTestMatch';
import { MatchModel } from '../DBSchemas/MatchSchema';
import { SessionInteractionModel } from '../DBSchemas/SessionInteractionSchema';
import { MatchService } from '../coreLogic/MatchService';

setupMongoMemory();

const service = new MatchService();

async function seedMatch(opts: { status?: 'Open' | 'Started' | 'Completed'; recurrence?: string } = {}) {
  const host = await createTestUser();
  const venue = await createTestVenue(host._id.toString());
  const match = await createTestMatch({
    hostId: host._id.toString(),
    venueId: venue._id.toString(),
    status: opts.status ?? 'Open',
  });
  if (opts.recurrence) {
    await MatchModel.findByIdAndUpdate(match._id, { $set: { recurrence: opts.recurrence } });
  }
  return { host, venue, match };
}

// ─── Comments ─────────────────────────────────────────────────────────────────

describe('MatchService — comments', () => {
  it('COM-1: addComment + getComments returns the comment with author username', async () => {
    const { match } = await seedMatch();
    const commenter = await createTestUser({ username: 'commenter_1' });

    const result = await service.addComment(match._id.toString(), commenter._id.toString(), 'See you there!');
    expect(result.isSuccess).toBe(true);

    const comments = await service.getComments(match._id.toString());
    expect(comments).toHaveLength(1);
    expect(comments[0]!.text).toBe('See you there!');
    expect(comments[0]!.username).toBe('commenter_1');
  });

  it('COM-2: comments are returned oldest-first', async () => {
    const { match } = await seedMatch();
    const u = await createTestUser();
    await service.addComment(match._id.toString(), u._id.toString(), 'first');
    await service.addComment(match._id.toString(), u._id.toString(), 'second');

    const comments = await service.getComments(match._id.toString());
    expect(comments.map(c => c.text)).toEqual(['first', 'second']);
  });

  it('COM-3: addComment on a nonexistent match fails', async () => {
    const u = await createTestUser();
    const result = await service.addComment('64b000000000000000000000', u._id.toString(), 'hello');
    expect(result.isFailure).toBe(true);
  });

  it('COM-4: author can delete own comment', async () => {
    const { match } = await seedMatch();
    const u = await createTestUser();
    const added = await service.addComment(match._id.toString(), u._id.toString(), 'oops');
    const result = await service.deleteComment(match._id.toString(), added.getValue().id, u._id.toString());
    expect(result.isSuccess).toBe(true);
    expect(await service.getComments(match._id.toString())).toHaveLength(0);
  });

  it('COM-5: BOLA — another player cannot delete someone else\'s comment', async () => {
    const { match } = await seedMatch();
    const author = await createTestUser();
    const attacker = await createTestUser();
    const added = await service.addComment(match._id.toString(), author._id.toString(), 'mine');

    const result = await service.deleteComment(match._id.toString(), added.getValue().id, attacker._id.toString());
    expect(result.isFailure).toBe(true);
    expect(await service.getComments(match._id.toString())).toHaveLength(1);
  });

  it('COM-6: host can delete any comment on their event', async () => {
    const { host, match } = await seedMatch();
    const u = await createTestUser();
    const added = await service.addComment(match._id.toString(), u._id.toString(), 'spam');

    const result = await service.deleteComment(match._id.toString(), added.getValue().id, host._id.toString());
    expect(result.isSuccess).toBe(true);
  });

  it('COM-7: admin can delete any comment', async () => {
    const { match } = await seedMatch();
    const u = await createTestUser();
    const admin = await createTestUser({ role: 'admin' });
    const added = await service.addComment(match._id.toString(), u._id.toString(), 'reported');

    const result = await service.deleteComment(match._id.toString(), added.getValue().id, admin._id.toString());
    expect(result.isSuccess).toBe(true);
  });
});

// ─── Comment locking ──────────────────────────────────────────────────────────

describe('MatchService — comment locking', () => {
  it('LOCK-1: BFLA — a non-host player cannot lock comments', async () => {
    const { match } = await seedMatch();
    const stranger = await createTestUser();
    const result = await service.lockComments(match._id.toString(), stranger._id.toString(), true);
    expect(result.isFailure).toBe(true);
  });

  it('LOCK-2: host locks → non-host posting blocked, host can still post', async () => {
    const { host, match } = await seedMatch();
    const player = await createTestUser();

    expect((await service.lockComments(match._id.toString(), host._id.toString(), true)).isSuccess).toBe(true);

    const blocked = await service.addComment(match._id.toString(), player._id.toString(), 'locked out');
    expect(blocked.isFailure).toBe(true);

    const hostPost = await service.addComment(match._id.toString(), host._id.toString(), 'host update');
    expect(hostPost.isSuccess).toBe(true);
  });

  it('LOCK-3: unlock restores posting for everyone', async () => {
    const { host, match } = await seedMatch();
    const player = await createTestUser();
    await service.lockComments(match._id.toString(), host._id.toString(), true);
    await service.lockComments(match._id.toString(), host._id.toString(), false);

    const result = await service.addComment(match._id.toString(), player._id.toString(), 'back again');
    expect(result.isSuccess).toBe(true);
  });

  it('LOCK-4: admin can lock comments on any event', async () => {
    const { match } = await seedMatch();
    const admin = await createTestUser({ role: 'admin' });
    const result = await service.lockComments(match._id.toString(), admin._id.toString(), true);
    expect(result.isSuccess).toBe(true);
  });
});

// ─── Recap ────────────────────────────────────────────────────────────────────

describe('MatchService — recap', () => {
  it('RECAP-1: host cannot add a recap before the event is Completed', async () => {
    const { host, match } = await seedMatch({ status: 'Open' });
    const result = await service.updateRecap(match._id.toString(), host._id.toString(), 'too early');
    expect(result.isFailure).toBe(true);
  });

  it('RECAP-2: host adds a recap to a Completed event; text persists', async () => {
    const { host, match } = await seedMatch({ status: 'Completed' });
    const result = await service.updateRecap(match._id.toString(), host._id.toString(), 'Great night, wolves won.');
    expect(result.isSuccess).toBe(true);

    const doc = await MatchModel.findById(match._id);
    expect(doc?.recap?.text).toBe('Great night, wolves won.');
  });

  it('RECAP-3: BFLA — a non-host player cannot write the recap', async () => {
    const { match } = await seedMatch({ status: 'Completed' });
    const stranger = await createTestUser();
    const result = await service.updateRecap(match._id.toString(), stranger._id.toString(), 'hijacked');
    expect(result.isFailure).toBe(true);
  });

  it('RECAP-4: updating overwrites the previous recap', async () => {
    const { host, match } = await seedMatch({ status: 'Completed' });
    await service.updateRecap(match._id.toString(), host._id.toString(), 'v1');
    await service.updateRecap(match._id.toString(), host._id.toString(), 'v2');

    const doc = await MatchModel.findById(match._id);
    expect(doc?.recap?.text).toBe('v2');
  });
});

// ─── Recurrence ───────────────────────────────────────────────────────────────

describe('MatchService — recurring events', () => {
  async function completeMatch(recurrence: string) {
    const { host, match } = await seedMatch({ status: 'Started', recurrence });
    const result = await service.updateMatchStatus(match._id.toString(), host._id.toString(), 'Completed');
    expect(result.isSuccess).toBe(true);
    return { host, match };
  }

  it('REC-1: weekly recurrence creates the next occurrence +7 days on Completed', async () => {
    const { host, match } = await completeMatch('weekly');

    const next = await MatchModel.findOne({ _id: { $ne: match._id }, host_id: host._id });
    expect(next).not.toBeNull();
    expect(next!.title).toBe(match.title);
    expect(next!.recurrence).toBe('weekly');
    expect(next!.players.map(String)).toEqual([host._id.toString()]); // roster reset to host only

    const expected = new Date(match.scheduledAt);
    expected.setDate(expected.getDate() + 7);
    expect(next!.scheduledAt.toDateString()).toBe(expected.toDateString());
  });

  it('REC-2: biweekly = +14 days, monthly = +30 days', async () => {
    for (const [recurrence, days] of [['biweekly', 14], ['monthly', 30]] as const) {
      const { host, match } = await completeMatch(recurrence);
      const next = await MatchModel.findOne({ _id: { $ne: match._id }, host_id: host._id });
      const expected = new Date(match.scheduledAt);
      expected.setDate(expected.getDate() + days);
      expect(next!.scheduledAt.toDateString()).toBe(expected.toDateString());
    }
  });

  it('REC-3: recurrence "none" creates no follow-up event', async () => {
    const { host, match } = await seedMatch({ status: 'Started' }); // recurrence defaults to 'none'
    await service.updateMatchStatus(match._id.toString(), host._id.toString(), 'Completed');

    const count = await MatchModel.countDocuments({ host_id: host._id });
    expect(count).toBe(1);
    void match;
  });

  it('REC-4: cannot complete twice — state machine blocks Completed → Completed (no double occurrence)', async () => {
    const { host, match } = await completeMatch('weekly');

    const again = await service.updateMatchStatus(match._id.toString(), host._id.toString(), 'Completed');
    expect(again.isFailure).toBe(true);

    const count = await MatchModel.countDocuments({ host_id: host._id });
    expect(count).toBe(2); // original + exactly one occurrence
  });

  it('REC-5: host gets a SessionInteraction on the new occurrence', async () => {
    const { host, match } = await completeMatch('weekly');
    const next = await MatchModel.findOne({ _id: { $ne: match._id }, host_id: host._id });

    const interaction = await SessionInteractionModel.findOne({
      sessionId: next!._id,
      userId: host._id.toString(),
    });
    expect(interaction).not.toBeNull();
  });
});
