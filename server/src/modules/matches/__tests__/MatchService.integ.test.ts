import { describe, it, expect, beforeAll } from 'vitest';
import { setupMongoMemory } from '../../../__tests__/helpers/setupMongoMemory';
import { createTestUser } from '../../../__tests__/helpers/createTestUser';
import { createTestVenue } from '../../../__tests__/helpers/createTestVenue';
import { createTestMatch } from '../../../__tests__/helpers/createTestMatch';
import { MatchService } from '../coreLogic/MatchService';
import { MatchModel } from '../DBSchemas/MatchSchema';
import { SessionInteractionModel } from '../DBSchemas/SessionInteractionSchema';
import { UserModel } from '../../users/DBSchemas/UserSchema';

setupMongoMemory();

const svc = new MatchService();

// ─── createMatch ─────────────────────────────────────────────────────────────

describe('MatchService — createMatch', () => {
  it('MS-CREATE-1: creates match and returns GameSessionResponseDTO with correct shape', async () => {
    const host = await createTestUser();
    const venue = await createTestVenue(host._id.toString());

    const result = await svc.createMatch(host._id.toString(), {
      venue_id: venue._id.toString(),
      title: 'Test Game',
      scheduledAt: new Date(Date.now() + 86_400_000).toISOString(),
      min_pax: 4,
      max_pax: 12,
    });

    expect(result.isSuccess).toBe(true);
    const dto = result.getValue();
    expect(dto.id).toBeTruthy();
    expect(dto.currentPlayers).toBe(1);
    expect(dto.approvalMode).toBe('approval');
    // host owns the venue → auto-confirmed per Session 30 business rule
    expect(dto.venueApprovalStatus).toBe('confirmed');
  });

  it('MS-CREATE-2: host is auto-enrolled with registered SessionInteraction', async () => {
    const host = await createTestUser();
    const venue = await createTestVenue(host._id.toString());

    const result = await svc.createMatch(host._id.toString(), {
      venue_id: venue._id.toString(),
      title: 'Auto Enroll Test',
      scheduledAt: new Date(Date.now() + 86_400_000).toISOString(),
      min_pax: 4,
      max_pax: 12,
    });

    expect(result.isSuccess).toBe(true);
    const interaction = await SessionInteractionModel.findOne({
      userId: host._id.toString(),
      sessionId: result.getValue().id,
    });
    expect(interaction?.status).toBe('registered');
  });

  it('MS-CREATE-3: returns failure when venue_id does not exist', async () => {
    const host = await createTestUser();
    const badVenueId = '0'.repeat(24);

    const result = await svc.createMatch(host._id.toString(), {
      venue_id: badVenueId,
      title: 'Bad Venue',
      scheduledAt: new Date(Date.now() + 86_400_000).toISOString(),
      min_pax: 4,
      max_pax: 12,
    });

    expect(result.isFailure).toBe(true);
    expect(result.getError()).toMatch(/venue not found/i);
  });
});

// ─── joinMatch — open mode ────────────────────────────────────────────────────

describe('MatchService — joinMatch (open mode)', () => {
  it('MS-JOIN-1: registers user when slot is available', async () => {
    const host = await createTestUser();
    const player = await createTestUser();
    const venue = await createTestVenue(host._id.toString());
    const match = await createTestMatch({ hostId: host._id.toString(), venueId: venue._id.toString(), approvalMode: 'open', maxPax: 12 });

    const result = await svc.joinMatch(match._id.toString(), player._id.toString());

    expect(result.isSuccess).toBe(true);
    expect(result.getValue().wasWaitlisted).toBe(false);
    const interaction = await SessionInteractionModel.findOne({ userId: player._id.toString(), sessionId: match._id });
    expect(interaction?.status).toBe('registered');
  });

  it('MS-JOIN-2: sets match status to Full when last slot is claimed', async () => {
    const host = await createTestUser();
    const venue = await createTestVenue(host._id.toString());
    const match = await createTestMatch({ hostId: host._id.toString(), venueId: venue._id.toString(), approvalMode: 'open', maxPax: 2 });

    const player = await createTestUser();
    await svc.joinMatch(match._id.toString(), player._id.toString());

    const updated = await MatchModel.findById(match._id);
    expect(updated?.status).toBe('Full');
  });

  it('MS-JOIN-3: waitlists user when match is Full, returns wasWaitlisted=true with position', async () => {
    const host = await createTestUser();
    const p1 = await createTestUser();
    const venue = await createTestVenue(host._id.toString());
    const match = await createTestMatch({
      hostId: host._id.toString(),
      venueId: venue._id.toString(),
      approvalMode: 'open',
      maxPax: 2,
      extraPlayerIds: [p1._id.toString()],
      status: 'Full',
    });

    const p2 = await createTestUser();
    const result = await svc.joinMatch(match._id.toString(), p2._id.toString());

    expect(result.isSuccess).toBe(true);
    expect(result.getValue().wasWaitlisted).toBe(true);
    expect(result.getValue().waitlistPosition).toBe(1);
    const interaction = await SessionInteractionModel.findOne({ userId: p2._id.toString(), sessionId: match._id });
    expect(interaction?.status).toBe('waitlisted');
  });

  it('MS-JOIN-4: returns failure when user is already in players[]', async () => {
    const host = await createTestUser();
    const venue = await createTestVenue(host._id.toString());
    const match = await createTestMatch({ hostId: host._id.toString(), venueId: venue._id.toString(), approvalMode: 'open' });

    const result = await svc.joinMatch(match._id.toString(), host._id.toString());
    expect(result.isFailure).toBe(true);
  });

  it('MS-JOIN-5: returns failure when match is Cancelled', async () => {
    const host = await createTestUser();
    const venue = await createTestVenue(host._id.toString());
    const match = await createTestMatch({ hostId: host._id.toString(), venueId: venue._id.toString(), approvalMode: 'open', status: 'Cancelled' });
    const player = await createTestUser();

    const result = await svc.joinMatch(match._id.toString(), player._id.toString());
    expect(result.isFailure).toBe(true);
    expect(result.getError()).toMatch(/cannot join/i);
  });

  it('MS-JOIN-6: returns failure when match is Started', async () => {
    const host = await createTestUser();
    const venue = await createTestVenue(host._id.toString());
    const match = await createTestMatch({ hostId: host._id.toString(), venueId: venue._id.toString(), approvalMode: 'open', status: 'Started' });
    const player = await createTestUser();

    const result = await svc.joinMatch(match._id.toString(), player._id.toString());
    expect(result.isFailure).toBe(true);
  });
});

// ─── joinMatch — approval mode ────────────────────────────────────────────────

describe('MatchService — joinMatch (approval mode)', () => {
  it('MS-JOIN-7: queues user as pending; does NOT add to players[]', async () => {
    const host = await createTestUser();
    const venue = await createTestVenue(host._id.toString());
    const match = await createTestMatch({ hostId: host._id.toString(), venueId: venue._id.toString(), approvalMode: 'approval' });
    const applicant = await createTestUser();

    const result = await svc.joinMatch(match._id.toString(), applicant._id.toString());

    expect(result.isSuccess).toBe(true);
    expect(result.getValue().status).toBe('pending');
    const doc = await MatchModel.findById(match._id);
    expect(doc?.players.map(p => p.toString())).not.toContain(applicant._id.toString());
    const interaction = await SessionInteractionModel.findOne({ userId: applicant._id.toString(), sessionId: match._id });
    expect(interaction?.status).toBe('pending');
  });

  it('MS-JOIN-8: returns failure when user already has a non-cancelled interaction', async () => {
    const host = await createTestUser();
    const venue = await createTestVenue(host._id.toString());
    const match = await createTestMatch({ hostId: host._id.toString(), venueId: venue._id.toString(), approvalMode: 'approval' });
    const applicant = await createTestUser();

    await svc.joinMatch(match._id.toString(), applicant._id.toString());
    const result = await svc.joinMatch(match._id.toString(), applicant._id.toString());

    expect(result.isFailure).toBe(true);
  });
});

// ─── leaveMatch ───────────────────────────────────────────────────────────────

describe('MatchService — leaveMatch', () => {
  it('MS-LEAVE-1: removes player and promotes first waitlisted user to registered', async () => {
    const host = await createTestUser();
    const player = await createTestUser();
    const waitlisted = await createTestUser();
    const venue = await createTestVenue(host._id.toString());
    const match = await createTestMatch({
      hostId: host._id.toString(),
      venueId: venue._id.toString(),
      approvalMode: 'open',
      maxPax: 2,
      extraPlayerIds: [player._id.toString()],
      waitlistIds: [waitlisted._id.toString()],
      status: 'Full',
    });
    await SessionInteractionModel.findOneAndUpdate(
      { userId: waitlisted._id.toString(), sessionId: match._id },
      { $set: { status: 'waitlisted', waitlistPosition: 1 } },
      { upsert: true }
    );

    const result = await svc.leaveMatch(match._id.toString(), player._id.toString());

    expect(result.isSuccess).toBe(true);
    const updatedMatch = await MatchModel.findById(match._id);
    expect(updatedMatch?.players.map(p => p.toString())).toContain(waitlisted._id.toString());
    expect(updatedMatch?.players.map(p => p.toString())).not.toContain(player._id.toString());
    const promotedInteraction = await SessionInteractionModel.findOne({ userId: waitlisted._id.toString(), sessionId: match._id });
    expect(promotedInteraction?.status).toBe('registered');
  });

  it('MS-LEAVE-3: deducts 1 credit when leaving within 24h of scheduledAt', async () => {
    const host = await createTestUser({ creditScore: 100 });
    const player = await createTestUser({ creditScore: 100 });
    const venue = await createTestVenue(host._id.toString());
    const match = await createTestMatch({
      hostId: host._id.toString(),
      venueId: venue._id.toString(),
      approvalMode: 'open',
      extraPlayerIds: [player._id.toString()],
      scheduledAtOffset: 3_600_000, // 1 hour from now
    });

    await svc.leaveMatch(match._id.toString(), player._id.toString());

    const updated = await UserModel.findById(player._id);
    expect(updated?.creditScore).toBe(99);
  });

  it('MS-LEAVE-4: does NOT deduct credit when leaving >24h before scheduledAt', async () => {
    const host = await createTestUser();
    const player = await createTestUser({ creditScore: 100 });
    const venue = await createTestVenue(host._id.toString());
    const match = await createTestMatch({
      hostId: host._id.toString(),
      venueId: venue._id.toString(),
      approvalMode: 'open',
      extraPlayerIds: [player._id.toString()],
      scheduledAtOffset: 48 * 3_600_000, // 48h from now
    });

    await svc.leaveMatch(match._id.toString(), player._id.toString());

    const updated = await UserModel.findById(player._id);
    expect(updated?.creditScore).toBe(100);
  });

  it('MS-LEAVE-5: returns failure when match has already started', async () => {
    const host = await createTestUser();
    const player = await createTestUser();
    const venue = await createTestVenue(host._id.toString());
    const match = await createTestMatch({
      hostId: host._id.toString(),
      venueId: venue._id.toString(),
      extraPlayerIds: [player._id.toString()],
      status: 'Started',
    });

    const result = await svc.leaveMatch(match._id.toString(), player._id.toString());
    expect(result.isFailure).toBe(true);
  });
});

// ─── approveApplicant / rejectApplicant ──────────────────────────────────────

describe('MatchService — approveApplicant / rejectApplicant', () => {
  it('MS-APPROVE-1: moves applicant from pending to players[], creates MatchJoined notification', async () => {
    const host = await createTestUser();
    const applicant = await createTestUser();
    const venue = await createTestVenue(host._id.toString());
    const match = await createTestMatch({ hostId: host._id.toString(), venueId: venue._id.toString(), approvalMode: 'approval' });
    await SessionInteractionModel.create({ userId: applicant._id.toString(), sessionId: match._id, status: 'pending' });

    const result = await svc.approveApplicant(match._id.toString(), host._id.toString(), applicant._id.toString());

    expect(result.isSuccess).toBe(true);
    const doc = await MatchModel.findById(match._id);
    expect(doc?.players.map(p => p.toString())).toContain(applicant._id.toString());
    const interaction = await SessionInteractionModel.findOne({ userId: applicant._id.toString(), sessionId: match._id });
    expect(interaction?.status).toBe('registered');
  });

  it('MS-APPROVE-2: adds to waitlist when match is at capacity', async () => {
    const host = await createTestUser();
    const p1 = await createTestUser();
    const applicant = await createTestUser();
    const venue = await createTestVenue(host._id.toString());
    const match = await createTestMatch({
      hostId: host._id.toString(),
      venueId: venue._id.toString(),
      approvalMode: 'approval',
      maxPax: 2,
      extraPlayerIds: [p1._id.toString()],
    });
    await SessionInteractionModel.create({ userId: applicant._id.toString(), sessionId: match._id, status: 'pending' });

    const result = await svc.approveApplicant(match._id.toString(), host._id.toString(), applicant._id.toString());

    expect(result.isSuccess).toBe(true);
    const doc = await MatchModel.findById(match._id);
    expect(doc?.waitlist.map(w => w.toString())).toContain(applicant._id.toString());
    const interaction = await SessionInteractionModel.findOne({ userId: applicant._id.toString(), sessionId: match._id });
    expect(interaction?.status).toBe('waitlisted');
  });

  it('MS-APPROVE-3: returns failure when no pending interaction found', async () => {
    const host = await createTestUser();
    const rando = await createTestUser();
    const venue = await createTestVenue(host._id.toString());
    const match = await createTestMatch({ hostId: host._id.toString(), venueId: venue._id.toString() });

    const result = await svc.approveApplicant(match._id.toString(), host._id.toString(), rando._id.toString());
    expect(result.isFailure).toBe(true);
  });

  it('MS-REJECT-1: sets interaction to cancelled and creates notification', async () => {
    const host = await createTestUser();
    const applicant = await createTestUser();
    const venue = await createTestVenue(host._id.toString());
    const match = await createTestMatch({ hostId: host._id.toString(), venueId: venue._id.toString(), approvalMode: 'approval' });
    await SessionInteractionModel.create({ userId: applicant._id.toString(), sessionId: match._id, status: 'pending' });

    const result = await svc.rejectApplicant(match._id.toString(), host._id.toString(), applicant._id.toString());

    expect(result.isSuccess).toBe(true);
    const interaction = await SessionInteractionModel.findOne({ userId: applicant._id.toString(), sessionId: match._id });
    expect(interaction?.status).toBe('cancelled');
  });
});

// ─── kickPlayer ───────────────────────────────────────────────────────────────

describe('MatchService — kickPlayer', () => {
  it('MS-KICK-1: removes player, sets interaction to cancelled, deducts 0.5 credit from victim', async () => {
    const host = await createTestUser();
    const victim = await createTestUser({ creditScore: 100 });
    const venue = await createTestVenue(host._id.toString());
    const match = await createTestMatch({
      hostId: host._id.toString(),
      venueId: venue._id.toString(),
      extraPlayerIds: [victim._id.toString()],
    });

    const result = await svc.kickPlayer(match._id.toString(), host._id.toString(), victim._id.toString());

    expect(result.isSuccess).toBe(true);
    const doc = await MatchModel.findById(match._id);
    expect(doc?.players.map(p => p.toString())).not.toContain(victim._id.toString());
    const interaction = await SessionInteractionModel.findOne({ userId: victim._id.toString(), sessionId: match._id });
    expect(interaction?.status).toBe('cancelled');
    const updatedVictim = await UserModel.findById(victim._id);
    expect(updatedVictim?.creditScore).toBeCloseTo(99.5);
  });

  it('MS-KICK-2: returns failure when requester is not the host', async () => {
    const host = await createTestUser();
    const notHost = await createTestUser();
    const victim = await createTestUser();
    const venue = await createTestVenue(host._id.toString());
    const match = await createTestMatch({
      hostId: host._id.toString(),
      venueId: venue._id.toString(),
      extraPlayerIds: [victim._id.toString()],
    });

    const result = await svc.kickPlayer(match._id.toString(), notHost._id.toString(), victim._id.toString());
    expect(result.isFailure).toBe(true);
  });

  it('MS-KICK-3: returns failure when host tries to kick themselves', async () => {
    const host = await createTestUser();
    const venue = await createTestVenue(host._id.toString());
    const match = await createTestMatch({ hostId: host._id.toString(), venueId: venue._id.toString() });

    const result = await svc.kickPlayer(match._id.toString(), host._id.toString(), host._id.toString());
    expect(result.isFailure).toBe(true);
  });
});

// ─── updateMatchStatus ────────────────────────────────────────────────────────

describe('MatchService — updateMatchStatus', () => {
  it('MS-STATUS-1: Open → Started succeeds when players >= min_pax', async () => {
    const host = await createTestUser();
    const p1 = await createTestUser();
    const p2 = await createTestUser();
    const p3 = await createTestUser();
    const venue = await createTestVenue(host._id.toString());
    const match = await createTestMatch({
      hostId: host._id.toString(),
      venueId: venue._id.toString(),
      minPax: 4,
      maxPax: 12,
      extraPlayerIds: [p1._id.toString(), p2._id.toString(), p3._id.toString()],
    });

    const result = await svc.updateMatchStatus(match._id.toString(), host._id.toString(), 'Started');
    expect(result.isSuccess).toBe(true);
    const doc = await MatchModel.findById(match._id);
    expect(doc?.status).toBe('Started');
  });

  it('MS-STATUS-2: returns failure when requester is not the host', async () => {
    const host = await createTestUser();
    const rando = await createTestUser();
    const venue = await createTestVenue(host._id.toString());
    const match = await createTestMatch({ hostId: host._id.toString(), venueId: venue._id.toString() });

    const result = await svc.updateMatchStatus(match._id.toString(), rando._id.toString(), 'Started');
    expect(result.isFailure).toBe(true);
  });

  it('MS-STATUS-3: Completed increments host eventsHosted', async () => {
    const host = await createTestUser();
    const p1 = await createTestUser();
    const p2 = await createTestUser();
    const p3 = await createTestUser();
    const venue = await createTestVenue(host._id.toString());
    const match = await createTestMatch({
      hostId: host._id.toString(),
      venueId: venue._id.toString(),
      status: 'Started',
      extraPlayerIds: [p1._id.toString(), p2._id.toString(), p3._id.toString()],
    });

    await svc.updateMatchStatus(match._id.toString(), host._id.toString(), 'Completed');

    const updatedHost = await UserModel.findById(host._id);
    expect(updatedHost?.eventsHosted).toBeGreaterThanOrEqual(1);
  });

  it('MS-STATUS-4: invalid transition Completed → Cancelled returns failure', async () => {
    const host = await createTestUser();
    const venue = await createTestVenue(host._id.toString());
    const match = await createTestMatch({ hostId: host._id.toString(), venueId: venue._id.toString(), status: 'Completed' });

    const result = await svc.updateMatchStatus(match._id.toString(), host._id.toString(), 'Cancelled');
    expect(result.isFailure).toBe(true);
  });
});

// ─── logAttendance ────────────────────────────────────────────────────────────

describe('MatchService — logAttendance', () => {
  it('MS-ATT-1: attended → creditScore+1 and eventsAttended+1', async () => {
    const host = await createTestUser();
    const player = await createTestUser({ creditScore: 100 });
    const venue = await createTestVenue(host._id.toString());
    const match = await createTestMatch({
      hostId: host._id.toString(),
      venueId: venue._id.toString(),
      status: 'Started',
      extraPlayerIds: [player._id.toString()],
    });

    await svc.logAttendance(match._id.toString(), host._id.toString(), {
      attendees: [{ userId: player._id.toString(), status: 'attended', punctuality: 'punctual' }],
    });

    const updated = await UserModel.findById(player._id);
    expect(updated?.creditScore).toBe(101);
    expect(updated?.eventsAttended).toBe(1);
  });

  it('MS-ATT-2: no-show → noshows+1, credit unchanged', async () => {
    const host = await createTestUser();
    const player = await createTestUser({ creditScore: 100 });
    const venue = await createTestVenue(host._id.toString());
    const match = await createTestMatch({
      hostId: host._id.toString(),
      venueId: venue._id.toString(),
      status: 'Started',
      extraPlayerIds: [player._id.toString()],
    });

    await svc.logAttendance(match._id.toString(), host._id.toString(), {
      attendees: [{ userId: player._id.toString(), status: 'no-show' }],
    });

    const updated = await UserModel.findById(player._id);
    expect(updated?.creditScore).toBe(100);
    expect(updated?.noshows).toBe(1);
  });

  it('MS-ATT-3: attended + late → lateCount+1', async () => {
    const host = await createTestUser();
    const player = await createTestUser();
    const venue = await createTestVenue(host._id.toString());
    const match = await createTestMatch({
      hostId: host._id.toString(),
      venueId: venue._id.toString(),
      status: 'Started',
      extraPlayerIds: [player._id.toString()],
    });

    await svc.logAttendance(match._id.toString(), host._id.toString(), {
      attendees: [{ userId: player._id.toString(), status: 'attended', punctuality: 'late' }],
    });

    const updated = await UserModel.findById(player._id);
    expect(updated?.lateCount).toBe(1);
  });

  it('MS-ATT-4: returns failure when match status is not Started or Completed', async () => {
    const host = await createTestUser();
    const player = await createTestUser();
    const venue = await createTestVenue(host._id.toString());
    const match = await createTestMatch({
      hostId: host._id.toString(),
      venueId: venue._id.toString(),
      status: 'Open',
      extraPlayerIds: [player._id.toString()],
    });

    const result = await svc.logAttendance(match._id.toString(), host._id.toString(), {
      attendees: [{ userId: player._id.toString(), status: 'attended' }],
    });
    expect(result.isFailure).toBe(true);
  });

  it('MS-ATT-5: returns failure when requester is not the host', async () => {
    const host = await createTestUser();
    const rando = await createTestUser();
    const player = await createTestUser();
    const venue = await createTestVenue(host._id.toString());
    const match = await createTestMatch({
      hostId: host._id.toString(),
      venueId: venue._id.toString(),
      status: 'Started',
      extraPlayerIds: [player._id.toString()],
    });

    const result = await svc.logAttendance(match._id.toString(), rando._id.toString(), {
      attendees: [{ userId: player._id.toString(), status: 'attended' }],
    });
    expect(result.isFailure).toBe(true);
  });
});
