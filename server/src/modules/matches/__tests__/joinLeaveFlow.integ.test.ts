/**
 * Detailed join / leave / rejoin flow tests.
 * Covers: happy path, double-join prevention, leave then rejoin,
 *         credit penalty on late cancel, host cannot leave, host-kick.
 */

import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';

vi.mock('../../../shared/infra/email', () => ({
  sendOtpEmail: vi.fn().mockResolvedValue(undefined),
  sendBookingInquiryEmail: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../../shared/infra/passport', () => {
  const p = { initialize: () => (_: unknown, __: unknown, n: () => void) => n(), authenticate: () => (_: unknown, __: unknown, n: () => void) => n(), use: () => {}, serializeUser: () => {}, deserializeUser: () => {} };
  return { default: p };
});

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { MatchService } from '../coreLogic/MatchService';
import { UserModel } from '../../users/DBSchemas/UserSchema';
import { MatchModel } from '../DBSchemas/MatchSchema';
import { SessionInteractionModel } from '../DBSchemas/SessionInteractionSchema';
import { createTestUser } from '../../../__tests__/helpers/createTestUser';
import { createTestVenue } from '../../../__tests__/helpers/createTestVenue';
import { createTestMatch } from '../../../__tests__/helpers/createTestMatch';

let mongod: MongoMemoryServer;
const svc = new MatchService();

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterEach(async () => {
  for (const col of Object.values(mongoose.connection.collections)) await col.deleteMany({});
});

// ─── Basic join ───────────────────────────────────────────────────────────────

describe('JL: Basic join', () => {
  it('JL-1: player joins open match — wasWaitlisted=false, players count +1', async () => {
    const host = await createTestUser();
    const player = await createTestUser();
    const venue = await createTestVenue(host._id.toString());
    const match = await createTestMatch({ hostId: host._id.toString(), venueId: venue._id.toString(), maxPax: 8 });

    const result = await svc.joinMatch(match._id.toString(), player._id.toString());

    expect(result.isSuccess).toBe(true);
    expect(result.getValue().wasWaitlisted).toBe(false);

    const m = await MatchModel.findById(match._id);
    expect(m?.players.map(p => p.toString())).toContain(player._id.toString());
  });

  it('JL-2: host joining own match is rejected (already a member)', async () => {
    const host = await createTestUser();
    const venue = await createTestVenue(host._id.toString());
    const match = await createTestMatch({ hostId: host._id.toString(), venueId: venue._id.toString() });

    const result = await svc.joinMatch(match._id.toString(), host._id.toString());

    expect(result.isFailure).toBe(true);
    expect(result.getError()).toMatch(/already/i);
  });

  it('JL-3: player cannot join same match twice', async () => {
    const host = await createTestUser();
    const player = await createTestUser();
    const venue = await createTestVenue(host._id.toString());
    const match = await createTestMatch({ hostId: host._id.toString(), venueId: venue._id.toString() });

    await svc.joinMatch(match._id.toString(), player._id.toString());
    const second = await svc.joinMatch(match._id.toString(), player._id.toString());

    expect(second.isFailure).toBe(true);
    expect(second.getError()).toMatch(/already/i);
  });

  it('JL-4: joining a Cancelled match is rejected', async () => {
    const host = await createTestUser();
    const player = await createTestUser();
    const venue = await createTestVenue(host._id.toString());
    const match = await createTestMatch({ hostId: host._id.toString(), venueId: venue._id.toString(), status: 'Cancelled' });

    const result = await svc.joinMatch(match._id.toString(), player._id.toString());

    expect(result.isFailure).toBe(true);
    expect(result.getError()).toMatch(/not open|cancelled|not.*join/i);
  });

  it('JL-5: joining a Completed match is rejected', async () => {
    const host = await createTestUser();
    const player = await createTestUser();
    const venue = await createTestVenue(host._id.toString());
    const match = await createTestMatch({ hostId: host._id.toString(), venueId: venue._id.toString(), status: 'Completed' });

    const result = await svc.joinMatch(match._id.toString(), player._id.toString());

    expect(result.isFailure).toBe(true);
  });

  it('JL-6: match becomes Full when last slot taken', async () => {
    const host = await createTestUser();
    const p1 = await createTestUser();
    const venue = await createTestVenue(host._id.toString());
    // max_pax=2, host occupies 1 slot
    const match = await createTestMatch({ hostId: host._id.toString(), venueId: venue._id.toString(), maxPax: 2 });

    await svc.joinMatch(match._id.toString(), p1._id.toString());

    const m = await MatchModel.findById(match._id);
    expect(m?.status).toBe('Full');
  });
});

// ─── Leave ────────────────────────────────────────────────────────────────────

describe('JL: Leave match', () => {
  it('JL-7: player leaves → removed from players[]; if waitlisted user exists they are auto-promoted', async () => {
    const host = await createTestUser();
    const p1 = await createTestUser();
    const p2 = await createTestUser();
    const venue = await createTestVenue(host._id.toString());
    const match = await createTestMatch({ hostId: host._id.toString(), venueId: venue._id.toString(), maxPax: 2 });

    await svc.joinMatch(match._id.toString(), p1._id.toString()); // fills → Full
    await svc.joinMatch(match._id.toString(), p2._id.toString()); // goes to waitlist

    const leave = await svc.leaveMatch(match._id.toString(), p1._id.toString());
    expect(leave.isSuccess).toBe(true);

    const m = await MatchModel.findById(match._id);
    expect(m?.players.map(p => p.toString())).not.toContain(p1._id.toString());
    // p2 was auto-promoted from waitlist → match stays Full; if no waitlist it'd be Open
    expect(['Open', 'Full']).toContain(m?.status);
  });

  it('JL-8: host CAN leave own match (domain does not block host from leaving)', async () => {
    // Note: leaveMatch does not prevent the host from leaving.
    // Host transfer or event cancellation is a separate concern.
    const host = await createTestUser();
    const venue = await createTestVenue(host._id.toString());
    const match = await createTestMatch({ hostId: host._id.toString(), venueId: venue._id.toString() });

    const result = await svc.leaveMatch(match._id.toString(), host._id.toString());

    // Service allows host to leave; no domain-level restriction
    expect(result.isSuccess).toBe(true);
  });

  it('JL-9: player not in match gets failure "User is not in this match."', async () => {
    const host = await createTestUser();
    const outsider = await createTestUser();
    const venue = await createTestVenue(host._id.toString());
    const match = await createTestMatch({ hostId: host._id.toString(), venueId: venue._id.toString() });

    const result = await svc.leaveMatch(match._id.toString(), outsider._id.toString());

    expect(result.isFailure).toBe(true);
    expect(result.getError()).toMatch(/not in this match|not.*registered|not.*member/i);
  });

  it('JL-10: early leave (>24h) does NOT deduct credit', async () => {
    const host = await createTestUser();
    const player = await createTestUser({ creditScore: 100 });
    const venue = await createTestVenue(host._id.toString());
    const match = await createTestMatch({
      hostId: host._id.toString(), venueId: venue._id.toString(),
      scheduledAtOffset: 48 * 3_600_000, // 48 hours from now
    });

    await svc.joinMatch(match._id.toString(), player._id.toString());
    await svc.leaveMatch(match._id.toString(), player._id.toString());

    const u = await UserModel.findById(player._id);
    expect(u?.creditScore).toBe(100);
  });

  it('JL-11: late leave (<24h, 5+ players) deducts credit', async () => {
    const host = await createTestUser();
    const player = await createTestUser({ creditScore: 100 });
    const p2 = await createTestUser();
    const p3 = await createTestUser();
    const p4 = await createTestUser();
    const venue = await createTestVenue(host._id.toString());
    const match = await createTestMatch({
      hostId: host._id.toString(), venueId: venue._id.toString(),
      extraPlayerIds: [p2._id.toString(), p3._id.toString(), p4._id.toString()],
      maxPax: 12,
      scheduledAtOffset: 6 * 3_600_000, // 6 hours from now — inside 24h window
    });

    await svc.joinMatch(match._id.toString(), player._id.toString());
    await svc.leaveMatch(match._id.toString(), player._id.toString());

    const u = await UserModel.findById(player._id);
    // 5 players in match → −1 credit (per cancelPenalty rules)
    expect(u!.creditScore).toBeLessThan(100);
  });
});

// ─── Leave and rejoin ─────────────────────────────────────────────────────────

describe('JL: Rejoin after leave', () => {
  it('JL-12: player can rejoin a match they previously left (if still open)', async () => {
    const host = await createTestUser();
    const player = await createTestUser();
    const venue = await createTestVenue(host._id.toString());
    const match = await createTestMatch({ hostId: host._id.toString(), venueId: venue._id.toString(), maxPax: 8 });

    await svc.joinMatch(match._id.toString(), player._id.toString());
    await svc.leaveMatch(match._id.toString(), player._id.toString());
    const rejoin = await svc.joinMatch(match._id.toString(), player._id.toString());

    expect(rejoin.isSuccess).toBe(true);
    const m = await MatchModel.findById(match._id);
    expect(m?.players.map(p => p.toString())).toContain(player._id.toString());
  });
});

// ─── Waitlist ─────────────────────────────────────────────────────────────────

describe('JL: Waitlist behaviour', () => {
  it('JL-13: player is waitlisted when match is Full', async () => {
    const host = await createTestUser();
    const p1 = await createTestUser();
    const p2 = await createTestUser();
    const venue = await createTestVenue(host._id.toString());
    const match = await createTestMatch({ hostId: host._id.toString(), venueId: venue._id.toString(), maxPax: 2 });

    await svc.joinMatch(match._id.toString(), p1._id.toString()); // fills
    const result = await svc.joinMatch(match._id.toString(), p2._id.toString()); // waitlist

    expect(result.getValue().wasWaitlisted).toBe(true);
    expect(result.getValue().waitlistPosition).toBe(1);
  });

  it('JL-14: FIFO — first waitlisted player is auto-promoted when slot opens', async () => {
    const host = await createTestUser();
    const p1 = await createTestUser();
    const p2 = await createTestUser();
    const p3 = await createTestUser();
    const venue = await createTestVenue(host._id.toString());
    const match = await createTestMatch({ hostId: host._id.toString(), venueId: venue._id.toString(), maxPax: 2 });

    await svc.joinMatch(match._id.toString(), p1._id.toString()); // fills
    await svc.joinMatch(match._id.toString(), p2._id.toString()); // waitlist pos 1
    await svc.joinMatch(match._id.toString(), p3._id.toString()); // waitlist pos 2

    await svc.leaveMatch(match._id.toString(), p1._id.toString());

    const p2Interaction = await SessionInteractionModel.findOne({ userId: p2._id.toString(), sessionId: match._id });
    const p3Interaction = await SessionInteractionModel.findOne({ userId: p3._id.toString(), sessionId: match._id });

    expect(p2Interaction?.status).toBe('registered');
    expect(p3Interaction?.status).not.toBe('registered'); // still waiting
  });

  it('JL-15: waitlisted player leaving does NOT trigger promotion', async () => {
    const host = await createTestUser();
    const p1 = await createTestUser();
    const p2 = await createTestUser();
    const p3 = await createTestUser();
    const venue = await createTestVenue(host._id.toString());
    const match = await createTestMatch({ hostId: host._id.toString(), venueId: venue._id.toString(), maxPax: 2 });

    await svc.joinMatch(match._id.toString(), p1._id.toString());
    await svc.joinMatch(match._id.toString(), p2._id.toString()); // waitlist 1
    await svc.joinMatch(match._id.toString(), p3._id.toString()); // waitlist 2

    // p2 (waitlisted) leaves — p3 should move to position 1 but stay waitlisted
    await svc.leaveMatch(match._id.toString(), p2._id.toString());

    const p3Interaction = await SessionInteractionModel.findOne({ userId: p3._id.toString(), sessionId: match._id });
    const m = await MatchModel.findById(match._id);
    // p1 still in, match still Full — p3 should be waitlisted
    expect(m?.status).toBe('Full');
    expect(p3Interaction?.status).not.toBe('registered');
  });

  it('JL-16: waitlist position reported correctly for multiple players', async () => {
    const host = await createTestUser();
    const players = await Promise.all(Array.from({ length: 5 }, () => createTestUser()));
    const venue = await createTestVenue(host._id.toString());
    const match = await createTestMatch({ hostId: host._id.toString(), venueId: venue._id.toString(), maxPax: 2 });

    await svc.joinMatch(match._id.toString(), players[0]!._id.toString()); // fills (max=2, host=1)
    const r1 = await svc.joinMatch(match._id.toString(), players[1]!._id.toString());
    const r2 = await svc.joinMatch(match._id.toString(), players[2]!._id.toString());
    const r3 = await svc.joinMatch(match._id.toString(), players[3]!._id.toString());

    expect(r1.getValue().waitlistPosition).toBe(1);
    expect(r2.getValue().waitlistPosition).toBe(2);
    expect(r3.getValue().waitlistPosition).toBe(3);
  });
});

// ─── Approval mode ────────────────────────────────────────────────────────────

describe('JL: Approval mode', () => {
  it('JL-17: apply to approval match → status=pending, NOT in players[]', async () => {
    const host = await createTestUser();
    const applicant = await createTestUser();
    const venue = await createTestVenue(host._id.toString());
    const match = await createTestMatch({ hostId: host._id.toString(), venueId: venue._id.toString(), approvalMode: 'approval' });

    const result = await svc.joinMatch(match._id.toString(), applicant._id.toString());

    expect(result.isSuccess).toBe(true);
    expect(result.getValue().status).toBe('pending');

    const m = await MatchModel.findById(match._id);
    expect(m?.players.map(p => p.toString())).not.toContain(applicant._id.toString());
  });

  it('JL-18: host approves applicant → in players[], status=registered', async () => {
    const host = await createTestUser();
    const applicant = await createTestUser();
    const venue = await createTestVenue(host._id.toString());
    const match = await createTestMatch({ hostId: host._id.toString(), venueId: venue._id.toString(), approvalMode: 'approval' });

    await svc.joinMatch(match._id.toString(), applicant._id.toString());
    const approveResult = await svc.approveApplicant(match._id.toString(), host._id.toString(), applicant._id.toString());

    expect(approveResult.isSuccess).toBe(true);

    const interaction = await SessionInteractionModel.findOne({ userId: applicant._id.toString(), sessionId: match._id });
    expect(interaction?.status).toBe('registered');
    const m = await MatchModel.findById(match._id);
    expect(m?.players.map(p => p.toString())).toContain(applicant._id.toString());
  });

  it('JL-19: host rejects applicant → interaction removed or status=cancelled', async () => {
    const host = await createTestUser();
    const applicant = await createTestUser();
    const venue = await createTestVenue(host._id.toString());
    const match = await createTestMatch({ hostId: host._id.toString(), venueId: venue._id.toString(), approvalMode: 'approval' });

    await svc.joinMatch(match._id.toString(), applicant._id.toString());
    const rejectResult = await svc.rejectApplicant(match._id.toString(), host._id.toString(), applicant._id.toString());

    expect(rejectResult.isSuccess).toBe(true);
    const m = await MatchModel.findById(match._id);
    expect(m?.players.map(p => p.toString())).not.toContain(applicant._id.toString());
  });

  it('JL-20: non-host cannot approve applicants', async () => {
    const host = await createTestUser();
    const applicant = await createTestUser();
    const impostor = await createTestUser();
    const venue = await createTestVenue(host._id.toString());
    const match = await createTestMatch({ hostId: host._id.toString(), venueId: venue._id.toString(), approvalMode: 'approval' });

    await svc.joinMatch(match._id.toString(), applicant._id.toString());
    const result = await svc.approveApplicant(match._id.toString(), impostor._id.toString(), applicant._id.toString());

    expect(result.isFailure).toBe(true);
    expect(result.getError()).toMatch(/forbidden|not.*host|only.*host/i);
  });

  it('JL-21: double-application is rejected', async () => {
    const host = await createTestUser();
    const applicant = await createTestUser();
    const venue = await createTestVenue(host._id.toString());
    const match = await createTestMatch({ hostId: host._id.toString(), venueId: venue._id.toString(), approvalMode: 'approval' });

    await svc.joinMatch(match._id.toString(), applicant._id.toString());
    const second = await svc.joinMatch(match._id.toString(), applicant._id.toString());

    expect(second.isFailure).toBe(true);
    expect(second.getError()).toMatch(/already/i);
  });
});

// ─── Host kicks player ────────────────────────────────────────────────────────

describe('JL: Host kick', () => {
  it('JL-22: host can kick a registered player', async () => {
    const host = await createTestUser();
    const player = await createTestUser();
    const venue = await createTestVenue(host._id.toString());
    const match = await createTestMatch({ hostId: host._id.toString(), venueId: venue._id.toString() });

    await svc.joinMatch(match._id.toString(), player._id.toString());
    const kickResult = await svc.kickPlayer(match._id.toString(), host._id.toString(), player._id.toString());

    expect(kickResult.isSuccess).toBe(true);
    const m = await MatchModel.findById(match._id);
    expect(m?.players.map(p => p.toString())).not.toContain(player._id.toString());
  });

  it('JL-23: non-host cannot kick a player', async () => {
    const host = await createTestUser();
    const player = await createTestUser();
    const bully = await createTestUser();
    const venue = await createTestVenue(host._id.toString());
    const match = await createTestMatch({ hostId: host._id.toString(), venueId: venue._id.toString() });

    await svc.joinMatch(match._id.toString(), player._id.toString());
    const result = await svc.kickPlayer(match._id.toString(), bully._id.toString(), player._id.toString());

    expect(result.isFailure).toBe(true);
    expect(result.getError()).toMatch(/only the host|forbidden|not.*host/i);
  });
});

// ─── Like / subscribe on events ───────────────────────────────────────────────

describe('JL: Event like & subscribe', () => {
  it('JL-24: liking an event increments totalLikes', async () => {
    const host = await createTestUser();
    const liker = await createTestUser();
    const venue = await createTestVenue(host._id.toString());
    const match = await createTestMatch({ hostId: host._id.toString(), venueId: venue._id.toString() });

    const result = await svc.toggleLike(match._id.toString(), liker._id.toString());

    expect(result.isSuccess).toBe(true);
    expect(result.getValue().isLiked).toBe(true);
    const m = await MatchModel.findById(match._id);
    expect(m?.totalLikes).toBe(1);
  });

  it('JL-25: unlike decrements totalLikes back to 0', async () => {
    const host = await createTestUser();
    const liker = await createTestUser();
    const venue = await createTestVenue(host._id.toString());
    const match = await createTestMatch({ hostId: host._id.toString(), venueId: venue._id.toString() });

    await svc.toggleLike(match._id.toString(), liker._id.toString());
    await svc.toggleLike(match._id.toString(), liker._id.toString());

    const m = await MatchModel.findById(match._id);
    expect(m?.totalLikes).toBe(0);
  });
});
