/**
 * E2E Lifecycle Integration Tests
 *
 * Covers the full lifecycle:
 *   create user → create space → create event → users join event
 *   → edit space/event → delete space/event
 *
 * Uses in-memory MongoDB (MongoMemoryServer) via the shared setupMongoMemory helper.
 * All services are exercised directly (no HTTP layer).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupMongoMemory } from '../../__tests__/helpers/setupMongoMemory';
import { createTestUser } from '../../__tests__/helpers/createTestUser';
import { createTestVenue } from '../../__tests__/helpers/createTestVenue';
import { createTestMatch } from '../../__tests__/helpers/createTestMatch';
import { PlayerSpaceService } from '../player-spaces/coreLogic/PlayerSpaceService';
import { MatchService } from '../matches/coreLogic/MatchService';
import { UserService } from '../users/coreLogic/UserService';
import { PlayerSpaceModel } from '../player-spaces/DBSchemas/PlayerSpaceSchema';
import { MatchModel } from '../matches/DBSchemas/MatchSchema';
import { SessionInteractionModel } from '../matches/DBSchemas/SessionInteractionSchema';
import { PendingRegistrationModel } from '../users/DBSchemas/PendingRegistrationSchema';
import { UserModel } from '../users/DBSchemas/UserSchema';

// Suppress external email calls
vi.mock('../../shared/infra/email', () => ({
  sendOtpEmail: vi.fn().mockResolvedValue(undefined),
}));

setupMongoMemory();

const spaceSvc = new PlayerSpaceService();
const matchSvc = new MatchService();
const userSvc = new UserService();

beforeEach(() => {
  process.env.JWT_SECRET = 'test-secret';
  process.env.JWT_EXPIRES_IN = '7d';
});

// ─────────────────────────────────────────────────────────────────────────────
// USER MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

describe('E2E — User Management', () => {
  // ── E2E-1: register + OTP verify creates user ─────────────────────────────
  it('E2E-1: initiateRegister → verifyOtp creates user and returns token', async () => {
    // Seed PendingRegistration directly (OTP email is mocked)
    await userSvc.initiateRegister({
      username: 'lifecycle_user',
      email: 'lifecycle@test.com',
      password: 'Password123!',
    });

    const pending = await PendingRegistrationModel.findOne({ email: 'lifecycle@test.com' });
    expect(pending).not.toBeNull();

    // Use the real OTP stored in the pending doc
    const result = await userSvc.verifyOtp({ email: 'lifecycle@test.com', otp: pending!.otp });

    expect(result.isSuccess).toBe(true);
    expect(result.getValue().token).toBeTruthy();
    expect(result.getValue().user.username).toBe('lifecycle_user');
    expect(result.getValue().user.creditScore).toBe(100);

    // PendingRegistration should be cleaned up
    const stillPending = await PendingRegistrationModel.findOne({ email: 'lifecycle@test.com' });
    expect(stillPending).toBeNull();

    // User record should exist in DB
    const userInDb = await UserModel.findOne({ email: 'lifecycle@test.com' });
    expect(userInDb).not.toBeNull();
  });

  // ── E2E-2: duplicate username (case-insensitive) rejected ─────────────────
  it('E2E-2: initiateRegister rejects duplicate username (case-insensitive)', async () => {
    await createTestUser({ username: 'DuplicateName' });

    // Exact same case
    const result1 = await userSvc.initiateRegister({
      username: 'DuplicateName',
      email: 'other1@test.com',
      password: 'Password123!',
    });
    expect(result1.isFailure).toBe(true);
    expect(result1.getError()).toMatch(/username already taken/i);

    // Different case
    const result2 = await userSvc.initiateRegister({
      username: 'duplicatename',
      email: 'other2@test.com',
      password: 'Password123!',
    });
    expect(result2.isFailure).toBe(true);
    expect(result2.getError()).toMatch(/username already taken/i);
  });

  // ── E2E-3: reserved username is rejected ──────────────────────────────────
  it('E2E-3: initiateRegister rejects reserved username "Admin"', async () => {
    const result = await userSvc.initiateRegister({
      username: 'Admin',
      email: 'admin123@test.com',
      password: 'Password123!',
    });

    expect(result.isFailure).toBe(true);
    expect(result.getError()).toMatch(/reserved/i);
  });

  it('E2E-3b: initiateRegister rejects leetspeak reserved username "4dm1n"', async () => {
    const result = await userSvc.initiateRegister({
      username: '4dm1n',
      email: 'leet@test.com',
      password: 'Password123!',
    });

    expect(result.isFailure).toBe(true);
    expect(result.getError()).toMatch(/reserved/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SPACE (VENUE) MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

const baseVenueDto = {
  name: 'My Test Venue',
  address: '10 Lifecycle Road, Singapore',
  type: 'house' as const,
  privacy: 'public' as const,
  lat: 1.3521,
  lng: 103.8198,
  is_chargeable: false,
};

describe('E2E — Space (Venue) Management', () => {
  // ── E2E-4: create space → status is 'unVerified' ──────────────────────────
  it('E2E-4: createVenue returns DTO with isVerified=false (status unVerified)', async () => {
    const owner = await createTestUser();

    const result = await spaceSvc.createVenue(owner._id.toString(), baseVenueDto);

    expect(result.isSuccess).toBe(true);
    const dto = result.getValue();
    expect(dto.id).toBeTruthy();
    expect(dto.ownerId).toBe(owner._id.toString());
    expect(dto.isVerified).toBe(false);

    // Confirm DB record
    const doc = await PlayerSpaceModel.findById(dto.id);
    expect(doc?.status).toBe('unVerified');
  });

  // ── E2E-5: admin approves space → status 'Verified', EventBus published ───
  it('E2E-5: admin verifyVenue(approved=true) sets status Verified and publishes VenueApproved', async () => {
    const owner = await createTestUser();
    const admin = await createTestUser({ role: 'admin' });
    const venue = await createTestVenue(owner._id.toString());

    // Spy on eventBus
    const { eventBus } = await import('../../shared/infra/EventBus');
    const publishSpy = vi.spyOn(eventBus, 'publish');

    const result = await spaceSvc.verifyVenue(venue._id.toString(), admin._id.toString(), true);

    expect(result.isSuccess).toBe(true);
    const updated = await PlayerSpaceModel.findById(venue._id);
    expect(updated?.status).toBe('Verified');

    const approvalEvent = publishSpy.mock.calls.find(
      ([evt]) => evt.eventName === 'VenueApproved'
    );
    expect(approvalEvent).toBeDefined();
    expect(approvalEvent![0].payload).toMatchObject({
      venueId: venue._id.toString(),
      ownerId: owner._id.toString(),
    });

    publishSpy.mockRestore();
  });

  // ── E2E-6: admin rejects space → status 'unVerified', VenueRejected event ─
  it('E2E-6: admin verifyVenue(approved=false) sets status unVerified and publishes VenueRejected', async () => {
    const owner = await createTestUser();
    const admin = await createTestUser({ role: 'admin' });
    const venue = await createTestVenue(owner._id.toString());

    const { eventBus } = await import('../../shared/infra/EventBus');
    const publishSpy = vi.spyOn(eventBus, 'publish');

    const result = await spaceSvc.verifyVenue(
      venue._id.toString(),
      admin._id.toString(),
      false,
      'Does not meet requirements'
    );

    expect(result.isSuccess).toBe(true);
    const updated = await PlayerSpaceModel.findById(venue._id);
    expect(updated?.status).toBe('unVerified');

    const rejectEvent = publishSpy.mock.calls.find(
      ([evt]) => evt.eventName === 'VenueRejected'
    );
    expect(rejectEvent).toBeDefined();
    expect(rejectEvent![0].payload).toMatchObject({ reason: 'Does not meet requirements' });

    publishSpy.mockRestore();
  });

  // ── E2E-7: owner edits space ───────────────────────────────────────────────
  it('E2E-7: owner can update venue name and description', async () => {
    const owner = await createTestUser();
    const venue = await createTestVenue(owner._id.toString());

    const result = await spaceSvc.updateVenue(venue._id.toString(), owner._id.toString(), {
      name: 'New Name E2E7',
      description: 'Updated via lifecycle test',
    });

    expect(result.isSuccess).toBe(true);
    expect(result.getValue().name).toBe('New Name E2E7');

    const doc = await PlayerSpaceModel.findById(venue._id);
    expect(doc?.description).toBe('Updated via lifecycle test');
  });

  // ── E2E-8: non-owner cannot edit space ────────────────────────────────────
  it('E2E-8: non-owner gets Forbidden failure when editing venue', async () => {
    const owner = await createTestUser();
    const intruder = await createTestUser();
    const venue = await createTestVenue(owner._id.toString());

    const result = await spaceSvc.updateVenue(venue._id.toString(), intruder._id.toString(), {
      name: 'Hack Attempt',
    });

    expect(result.isFailure).toBe(true);
    expect(result.getError()).toMatch(/forbidden/i);
  });

  // ── E2E-9: owner can delete their own pending (unVerified) space ──────────
  it('E2E-9: owner can delete their own unVerified venue', async () => {
    const owner = await createTestUser();
    const venue = await createTestVenue(owner._id.toString());

    const result = await spaceSvc.deleteVenue(venue._id.toString(), owner._id.toString());

    expect(result.isSuccess).toBe(true);
    const doc = await PlayerSpaceModel.findById(venue._id);
    expect(doc).toBeNull();
  });

  // ── E2E-10: cannot delete a space that has active matches ─────────────────
  it('E2E-10: deleteVenue fails when venue has active (non-cancelled) matches', async () => {
    const owner = await createTestUser();
    const venue = await createTestVenue(owner._id.toString());

    // Create an active (Open) match at this venue
    await createTestMatch({
      hostId: owner._id.toString(),
      venueId: venue._id.toString(),
      status: 'Open',
    });

    const result = await spaceSvc.deleteVenue(venue._id.toString(), owner._id.toString());

    expect(result.isFailure).toBe(true);
    expect(result.getError()).toMatch(/active matches/i);

    // Venue should still exist
    const doc = await PlayerSpaceModel.findById(venue._id);
    expect(doc).not.toBeNull();
  });

  it('E2E-10b: deleteVenue succeeds once all matches are cancelled', async () => {
    const owner = await createTestUser();
    const venue = await createTestVenue(owner._id.toString());

    const match = await createTestMatch({
      hostId: owner._id.toString(),
      venueId: venue._id.toString(),
      status: 'Open',
    });

    // Cancel the match first
    await MatchModel.findByIdAndUpdate(match._id, { $set: { status: 'Cancelled' } });

    const result = await spaceSvc.deleteVenue(venue._id.toString(), owner._id.toString());

    expect(result.isSuccess).toBe(true);
    const doc = await PlayerSpaceModel.findById(venue._id);
    expect(doc).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// EVENT (MATCH) MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

describe('E2E — Event (Match) Management', () => {
  // ── E2E-11: host creates event ────────────────────────────────────────────
  it('E2E-11: host creates event → status Open, host in players[], currentPlayers=1', async () => {
    const host = await createTestUser();
    const venue = await createTestVenue(host._id.toString());

    const result = await matchSvc.createMatch(host._id.toString(), {
      venue_id: venue._id.toString(),
      title: 'E2E Event',
      scheduledAt: new Date(Date.now() + 86_400_000).toISOString(),
      min_pax: 4,
      max_pax: 12,
    });

    expect(result.isSuccess).toBe(true);
    const dto = result.getValue();
    // dto.status uses toFrontendStatus() which maps 'Open' → 'open'
    expect(dto.status).toBe('open');
    expect(dto.currentPlayers).toBe(1);
    expect(dto.hostId).toBe(host._id.toString());

    const doc = await MatchModel.findById(dto.id);
    expect(doc?.status).toBe('Open'); // DB-level status
    expect(doc?.players.map(p => p.toString())).toContain(host._id.toString());
  });

  // ── E2E-12: player joins event ────────────────────────────────────────────
  it('E2E-12: player joins open event → appears in players[], wasWaitlisted=false', async () => {
    const host = await createTestUser();
    const player = await createTestUser();
    const venue = await createTestVenue(host._id.toString());
    const match = await createTestMatch({
      hostId: host._id.toString(),
      venueId: venue._id.toString(),
      approvalMode: 'open',
      maxPax: 12,
    });

    const result = await matchSvc.joinMatch(match._id.toString(), player._id.toString());

    expect(result.isSuccess).toBe(true);
    expect(result.getValue().wasWaitlisted).toBe(false);

    const doc = await MatchModel.findById(match._id);
    expect(doc?.players.map(p => p.toString())).toContain(player._id.toString());

    const interaction = await SessionInteractionModel.findOne({
      userId: player._id.toString(),
      sessionId: match._id,
    });
    expect(interaction?.status).toBe('registered');
  });

  // ── E2E-13: join already-full event → waitlisted ──────────────────────────
  it('E2E-13: joining a Full event puts player on waitlist', async () => {
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

    const latecomer = await createTestUser();
    const result = await matchSvc.joinMatch(match._id.toString(), latecomer._id.toString());

    expect(result.isSuccess).toBe(true);
    expect(result.getValue().wasWaitlisted).toBe(true);
    expect(result.getValue().waitlistPosition).toBeGreaterThan(0);

    const interaction = await SessionInteractionModel.findOne({
      userId: latecomer._id.toString(),
      sessionId: match._id,
    });
    expect(interaction?.status).toBe('waitlisted');
  });

  // ── E2E-14: player leaves → waitlisted player auto-promoted ───────────────
  it('E2E-14: player leaves → removed from players[], first waitlisted player auto-promoted', async () => {
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

    // Seed the waitlisted interaction record
    await SessionInteractionModel.findOneAndUpdate(
      { userId: waitlisted._id.toString(), sessionId: match._id },
      { $set: { status: 'waitlisted', waitlistPosition: 1 } },
      { upsert: true }
    );

    const result = await matchSvc.leaveMatch(match._id.toString(), player._id.toString());

    expect(result.isSuccess).toBe(true);

    const updatedMatch = await MatchModel.findById(match._id);
    const playerIds = updatedMatch!.players.map(p => p.toString());
    expect(playerIds).not.toContain(player._id.toString());
    expect(playerIds).toContain(waitlisted._id.toString());

    const promotedInteraction = await SessionInteractionModel.findOne({
      userId: waitlisted._id.toString(),
      sessionId: match._id,
    });
    expect(promotedInteraction?.status).toBe('registered');
  });

  // ── E2E-15: host edits event title/config ─────────────────────────────────
  it('E2E-15: host can update event title and config', async () => {
    const host = await createTestUser();
    const venue = await createTestVenue(host._id.toString());
    const match = await createTestMatch({
      hostId: host._id.toString(),
      venueId: venue._id.toString(),
    });

    const result = await matchSvc.updateSession(match._id.toString(), host._id.toString(), {
      title: 'Updated Title E2E15',
      max_pax: 10,
    });

    expect(result.isSuccess).toBe(true);
    expect(result.getValue().title).toBe('Updated Title E2E15');

    const doc = await MatchModel.findById(match._id);
    expect(doc?.config.max_pax).toBe(10);
  });

  // ── E2E-16: non-host cannot edit event ────────────────────────────────────
  it('E2E-16: non-host gets failure when editing event', async () => {
    const host = await createTestUser();
    const rando = await createTestUser();
    const venue = await createTestVenue(host._id.toString());
    const match = await createTestMatch({
      hostId: host._id.toString(),
      venueId: venue._id.toString(),
    });

    const result = await matchSvc.updateSession(match._id.toString(), rando._id.toString(), {
      title: 'Hack Attempt',
    });

    expect(result.isFailure).toBe(true);
    expect(result.getError()).toMatch(/only the host/i);
  });

  // ── E2E-17: host cancels event ────────────────────────────────────────────
  it('E2E-17: host cancels event → status Cancelled, penalty applied if far in advance', async () => {
    const host = await createTestUser({ creditScore: 100 });
    const venue = await createTestVenue(host._id.toString());
    const match = await createTestMatch({
      hostId: host._id.toString(),
      venueId: venue._id.toString(),
      // Scheduled 24h from now → hoursUntil ~24h → penalty tier "-1.5" (>=9h)
      scheduledAtOffset: 24 * 3_600_000,
    });

    const result = await matchSvc.cancelWithPenalty(match._id.toString(), host._id.toString());

    expect(result.isSuccess).toBe(true);
    const doc = await MatchModel.findById(match._id);
    expect(doc?.status).toBe('Cancelled');
    expect(doc?.cancelledAt).toBeDefined();

    // Credit penalty should have been deducted (>=9h threshold → -1.5)
    const updatedHost = await UserModel.findById(host._id);
    expect(updatedHost!.creditScore).toBeLessThan(100);
  });

  it('E2E-17b: host cancels event within 2h → no credit penalty', async () => {
    const host = await createTestUser({ creditScore: 100 });
    const venue = await createTestVenue(host._id.toString());
    const match = await createTestMatch({
      hostId: host._id.toString(),
      venueId: venue._id.toString(),
      scheduledAtOffset: 1 * 3_600_000, // 1 hour away — no penalty tier
    });

    await matchSvc.cancelWithPenalty(match._id.toString(), host._id.toString());

    const updatedHost = await UserModel.findById(host._id);
    expect(updatedHost!.creditScore).toBe(100);
  });

  // ── E2E-18: host deletes Open or Cancelled event ──────────────────────────
  it('E2E-18: host can delete an Open event', async () => {
    const host = await createTestUser();
    const venue = await createTestVenue(host._id.toString());
    const match = await createTestMatch({
      hostId: host._id.toString(),
      venueId: venue._id.toString(),
      status: 'Open',
    });

    const result = await matchSvc.deleteMatch(match._id.toString(), host._id.toString());

    expect(result.isSuccess).toBe(true);
    const doc = await MatchModel.findById(match._id);
    expect(doc).toBeNull();
  });

  it('E2E-18b: host can delete a Cancelled event', async () => {
    const host = await createTestUser();
    const venue = await createTestVenue(host._id.toString());
    const match = await createTestMatch({
      hostId: host._id.toString(),
      venueId: venue._id.toString(),
      status: 'Cancelled',
    });

    const result = await matchSvc.deleteMatch(match._id.toString(), host._id.toString());

    expect(result.isSuccess).toBe(true);
    expect(await MatchModel.findById(match._id)).toBeNull();
  });

  it('E2E-18c: cannot delete a Started event', async () => {
    const host = await createTestUser();
    const venue = await createTestVenue(host._id.toString());
    const match = await createTestMatch({
      hostId: host._id.toString(),
      venueId: venue._id.toString(),
      status: 'Started',
    });

    const result = await matchSvc.deleteMatch(match._id.toString(), host._id.toString());

    expect(result.isFailure).toBe(true);
    expect(result.getError()).toMatch(/Started/);
  });

  // ── E2E-19: player cannot delete event ────────────────────────────────────
  it('E2E-19: non-host player gets failure when trying to delete event', async () => {
    const host = await createTestUser();
    const player = await createTestUser();
    const venue = await createTestVenue(host._id.toString());
    const match = await createTestMatch({
      hostId: host._id.toString(),
      venueId: venue._id.toString(),
      extraPlayerIds: [player._id.toString()],
    });

    const result = await matchSvc.deleteMatch(match._id.toString(), player._id.toString());

    expect(result.isFailure).toBe(true);
    expect(result.getError()).toMatch(/only the host/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// FULL LIFECYCLE
// ─────────────────────────────────────────────────────────────────────────────

describe('E2E — Full Lifecycle (E2E-20)', () => {
  it('E2E-20: create user → create space → approve space → host creates event → 3 users join → 1 leaves → waitlist promoted → host cancels', async () => {
    // ── Step 1: Create host and 4 players ─────────────────────────────────
    const admin = await createTestUser({ role: 'admin' });
    const host = await createTestUser({ creditScore: 100 });
    const p1 = await createTestUser();
    const p2 = await createTestUser();
    const p3 = await createTestUser();

    // ── Step 2: Host creates a space ──────────────────────────────────────
    const createVenueResult = await spaceSvc.createVenue(host._id.toString(), {
      ...baseVenueDto,
      name: 'Lifecycle Venue',
    });
    expect(createVenueResult.isSuccess).toBe(true);
    const venueId = createVenueResult.getValue().id;
    const venueDoc = await PlayerSpaceModel.findById(venueId);
    expect(venueDoc?.status).toBe('unVerified');

    // ── Step 3: Admin approves space ──────────────────────────────────────
    const approveResult = await spaceSvc.verifyVenue(venueId, admin._id.toString(), true);
    expect(approveResult.isSuccess).toBe(true);
    const approvedVenue = await PlayerSpaceModel.findById(venueId);
    expect(approvedVenue?.status).toBe('Verified');

    // ── Step 4: Host creates event at that space (max 3 players, open join) ──
    const createMatchResult = await matchSvc.createMatch(host._id.toString(), {
      venue_id: venueId,
      title: 'Lifecycle Event',
      scheduledAt: new Date(Date.now() + 24 * 3_600_000).toISOString(),
      min_pax: 2,
      max_pax: 3,
      approvalMode: 'open',
    });
    expect(createMatchResult.isSuccess).toBe(true);
    const matchId = createMatchResult.getValue().id;
    const matchDoc = await MatchModel.findById(matchId);
    expect(matchDoc?.status).toBe('Open'); // DB-level status
    expect(matchDoc?.approvalMode).toBe('open');
    // Host is auto-enrolled
    expect(matchDoc?.players.map(p => p.toString())).toContain(host._id.toString());

    // ── Step 5: 2 more players join (fills all 3 slots) ───────────────────
    const joinP1 = await matchSvc.joinMatch(matchId, p1._id.toString());
    expect(joinP1.isSuccess).toBe(true);
    expect(joinP1.getValue().wasWaitlisted).toBe(false);

    const joinP2 = await matchSvc.joinMatch(matchId, p2._id.toString());
    expect(joinP2.isSuccess).toBe(true);
    expect(joinP2.getValue().wasWaitlisted).toBe(false);

    const fullMatch = await MatchModel.findById(matchId);
    expect(fullMatch?.status).toBe('Full');
    expect(fullMatch?.players.length).toBe(3);

    // ── Step 6: 3rd player tries to join → goes on waitlist ───────────────
    const joinP3 = await matchSvc.joinMatch(matchId, p3._id.toString());
    expect(joinP3.isSuccess).toBe(true);
    expect(joinP3.getValue().wasWaitlisted).toBe(true);
    expect(joinP3.getValue().waitlistPosition).toBe(1);

    const matchWithWaitlist = await MatchModel.findById(matchId);
    expect(matchWithWaitlist?.waitlist.map(w => w.toString())).toContain(p3._id.toString());

    // ── Step 7: p1 leaves → p3 should be auto-promoted ───────────────────
    // Seed p3 interaction with waitlisted status (joinMatch already does this via
    // SessionInteractionModel.findOneAndUpdate, but let's confirm)
    const p3Interaction = await SessionInteractionModel.findOne({
      userId: p3._id.toString(),
      sessionId: matchId,
    });
    expect(p3Interaction?.status).toBe('waitlisted');

    const leaveResult = await matchSvc.leaveMatch(matchId, p1._id.toString());
    expect(leaveResult.isSuccess).toBe(true);

    const afterLeave = await MatchModel.findById(matchId);
    const afterPlayerIds = afterLeave!.players.map(p => p.toString());
    expect(afterPlayerIds).not.toContain(p1._id.toString());
    expect(afterPlayerIds).toContain(p3._id.toString());
    expect(afterLeave?.waitlist.length).toBe(0);

    const promotedInteraction = await SessionInteractionModel.findOne({
      userId: p3._id.toString(),
      sessionId: matchId,
    });
    expect(promotedInteraction?.status).toBe('registered');

    // ── Step 8: Host cancels the event ────────────────────────────────────
    const cancelResult = await matchSvc.cancelWithPenalty(matchId, host._id.toString());
    expect(cancelResult.isSuccess).toBe(true);

    const cancelledMatch = await MatchModel.findById(matchId);
    expect(cancelledMatch?.status).toBe('Cancelled');
    expect(cancelledMatch?.cancelledAt).toBeDefined();

    // All interactions should be cancelled
    const interactions = await SessionInteractionModel.find({ sessionId: matchId });
    for (const interaction of interactions) {
      expect(interaction.status).toBe('cancelled');
    }

    // ── Step 9: Venue still exists and is Verified ────────────────────────
    const finalVenue = await PlayerSpaceModel.findById(venueId);
    expect(finalVenue?.status).toBe('Verified');
  });
});
