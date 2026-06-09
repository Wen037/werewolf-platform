/**
 * Happy-path E2E tests using the service layer directly (no HTTP).
 * Covers 4 major flows from test-plan.md Section F.
 *
 * Flow 1: Register → OTP → Login → View Profile
 * Flow 2: Create venue → admin approve → host creates event → player joins → player leaves
 * Flow 3: Approval mode: host creates → player applies → host approves → player in players[]
 * Flow 4: Waitlist: max_pax=2 → 2 fill → 3rd waitlisted → 1st leaves → 3rd auto-promoted
 */

import { describe, it, expect, beforeAll, beforeEach, afterAll, afterEach, vi } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { UserService } from '../../modules/users/coreLogic/UserService';
import { MatchService } from '../../modules/matches/coreLogic/MatchService';
import { PlayerSpaceService } from '../../modules/player-spaces/coreLogic/PlayerSpaceService';
import { PendingRegistrationModel } from '../../modules/users/DBSchemas/PendingRegistrationSchema';
import { UserModel } from '../../modules/users/DBSchemas/UserSchema';
import { MatchModel } from '../../modules/matches/DBSchemas/MatchSchema';
import { SessionInteractionModel } from '../../modules/matches/DBSchemas/SessionInteractionSchema';
import { createTestUser } from '../helpers/createTestUser';
import { createTestVenue } from '../helpers/createTestVenue';

vi.mock('../../shared/infra/email', () => ({
  sendOtpEmail: vi.fn().mockResolvedValue(undefined),
}));

let mongod: MongoMemoryServer;

const userSvc = new UserService();
const matchSvc = new MatchService();
const spaceSvc = new PlayerSpaceService();

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

beforeEach(() => {
  process.env.JWT_SECRET = 'e2e-happy-path-secret';
  process.env.JWT_EXPIRES_IN = '7d';
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key]!.deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

// ─── Flow 1: Register → OTP → Login → View Profile ───────────────────────────

describe('E2E Flow 1: Register → OTP → Login → View Profile', () => {
  it('completes full registration flow and returns user profile', async () => {
    // Step 1: Initiate registration
    const registerResult = await userSvc.initiateRegister({
      username: 'flow1user',
      email: 'flow1@test.com',
      password: 'Password123!',
    });
    expect(registerResult.isSuccess).toBe(true);

    // Step 2: Retrieve OTP from DB (simulates email delivery)
    const pending = await PendingRegistrationModel.findOne({ email: 'flow1@test.com' });
    expect(pending).not.toBeNull();
    expect(pending!.otp).toMatch(/^\d{6}$/);

    // Step 3: Verify OTP → creates User + returns JWT
    const verifyResult = await userSvc.verifyOtp({ email: 'flow1@test.com', otp: pending!.otp });
    expect(verifyResult.isSuccess).toBe(true);
    const { token, user: registeredUser } = verifyResult.getValue();
    expect(token).toBeTruthy();
    expect(registeredUser.creditScore).toBe(100);
    expect(registeredUser.username).toBe('flow1user');

    // Step 4: Login with same credentials returns a fresh JWT
    const loginResult = await userSvc.login({ email: 'flow1@test.com', password: 'Password123!' });
    expect(loginResult.isSuccess).toBe(true);
    expect(loginResult.getValue().token).toBeTruthy();

    // Step 5: View profile
    const profileResult = await userSvc.getMyProfile(registeredUser.id);
    expect(profileResult.isSuccess).toBe(true);
    expect(profileResult.getValue().email).toBe('flow1@test.com');
  });
});

// ─── Flow 2: Create venue → admin approve → create event → join → leave ──────

describe('E2E Flow 2: Venue creation → admin approve → event → join → leave', () => {
  it('completes full venue and event lifecycle', async () => {
    // Create participants
    const owner = await createTestUser({ role: 'player' });
    const admin = await createTestUser({ role: 'admin' });
    const player = await createTestUser({ creditScore: 100 });

    // Step 1: Owner creates venue
    const createVenueResult = await spaceSvc.createVenue(owner._id.toString(), {
      name: 'Flow2 Venue',
      address: '2 Flow Street, Singapore',
      type: 'house',
      privacy: 'public',
      lat: 1.3521,
      lng: 103.8198,
      is_chargeable: false,
    });
    expect(createVenueResult.isSuccess).toBe(true);
    const venue = createVenueResult.getValue();
    expect(venue.isVerified).toBe(false);

    // Step 2: Admin approves venue
    // verifyVenue signature: (venueId, adminId, approved)
    const approveResult = await spaceSvc.verifyVenue(venue.id, admin._id.toString(), true);
    expect(approveResult.isSuccess).toBe(true);

    // Step 3: Host creates event at the venue
    const createMatchResult = await matchSvc.createMatch(owner._id.toString(), {
      venue_id: venue.id,
      title: 'Flow2 Event',
      scheduledAt: new Date(Date.now() + 48 * 3_600_000).toISOString(),
      min_pax: 2,
      max_pax: 6,
      approvalMode: 'open',
    });
    expect(createMatchResult.isSuccess).toBe(true);
    const match = createMatchResult.getValue();
    expect(match.currentPlayers).toBe(1);

    // Step 4: Player joins
    const joinResult = await matchSvc.joinMatch(match.id, player._id.toString());
    expect(joinResult.isSuccess).toBe(true);
    expect(joinResult.getValue().wasWaitlisted).toBe(false);

    // Step 5: Player leaves (>24h until event, so no credit penalty)
    const leaveResult = await matchSvc.leaveMatch(match.id, player._id.toString());
    expect(leaveResult.isSuccess).toBe(true);

    // Player's credit should be unchanged
    const updatedPlayer = await UserModel.findById(player._id);
    expect(updatedPlayer?.creditScore).toBe(100);

    // Match's currentPlayers should be back to 1
    const updatedMatch = await MatchModel.findById(match.id);
    expect(updatedMatch?.players.length).toBe(1);
  });
});

// ─── Flow 3: Approval mode — apply → approve → in players[] ──────────────────

describe('E2E Flow 3: Approval mode — apply, approve, confirm in players[]', () => {
  it('applicant moves from pending to players[] after host approval', async () => {
    const host = await createTestUser();
    const applicant = await createTestUser();
    const venue = await createTestVenue(host._id.toString());

    // Step 1: Host creates approval-mode event
    const createResult = await matchSvc.createMatch(host._id.toString(), {
      venue_id: venue._id.toString(),
      title: 'Approval Flow Event',
      scheduledAt: new Date(Date.now() + 86_400_000).toISOString(),
      min_pax: 2,
      max_pax: 10,
      approvalMode: 'approval',
    });
    expect(createResult.isSuccess).toBe(true);
    const match = createResult.getValue();

    // Step 2: Applicant applies — should be pending, NOT in players[]
    const applyResult = await matchSvc.joinMatch(match.id, applicant._id.toString());
    expect(applyResult.isSuccess).toBe(true);
    expect(applyResult.getValue().status).toBe('pending');

    const matchDoc = await MatchModel.findById(match.id);
    expect(matchDoc?.players.map(p => p.toString())).not.toContain(applicant._id.toString());

    // Step 3: Host approves applicant
    const approveResult = await matchSvc.approveApplicant(match.id, host._id.toString(), applicant._id.toString());
    expect(approveResult.isSuccess).toBe(true);

    // Step 4: Verify applicant is now in players[]
    const updatedMatch = await MatchModel.findById(match.id);
    expect(updatedMatch?.players.map(p => p.toString())).toContain(applicant._id.toString());

    const interaction = await SessionInteractionModel.findOne({ userId: applicant._id.toString(), sessionId: match.id });
    expect(interaction?.status).toBe('registered');
  });
});

// ─── Flow 4: Waitlist — auto-promotion when player leaves ────────────────────

describe('E2E Flow 4: Waitlist auto-promotion', () => {
  it('3rd player is waitlisted; when 1st player leaves, 3rd is auto-promoted', async () => {
    const host = await createTestUser();
    const player1 = await createTestUser({ creditScore: 100 });
    const player2 = await createTestUser();
    const player3 = await createTestUser();
    const venue = await createTestVenue(host._id.toString());

    // Step 1: Create event with max_pax=2 (host takes 1 slot, leaving 1 open)
    const createResult = await matchSvc.createMatch(host._id.toString(), {
      venue_id: venue._id.toString(),
      title: 'Waitlist Test Event',
      scheduledAt: new Date(Date.now() + 48 * 3_600_000).toISOString(),
      min_pax: 2,
      max_pax: 2,
      approvalMode: 'open',
    });
    expect(createResult.isSuccess).toBe(true);
    const match = createResult.getValue();

    // Step 2: Player1 joins — fills last slot → match becomes Full
    const join1 = await matchSvc.joinMatch(match.id, player1._id.toString());
    expect(join1.isSuccess).toBe(true);
    expect(join1.getValue().wasWaitlisted).toBe(false);
    const fullMatch = await MatchModel.findById(match.id);
    expect(fullMatch?.status).toBe('Full');

    // Step 3: Player2 joins — should be waitlisted at position 1
    const join2 = await matchSvc.joinMatch(match.id, player2._id.toString());
    expect(join2.isSuccess).toBe(true);
    expect(join2.getValue().wasWaitlisted).toBe(true);
    expect(join2.getValue().waitlistPosition).toBe(1);

    // Step 4: Player3 joins — waitlisted at position 2
    const join3 = await matchSvc.joinMatch(match.id, player3._id.toString());
    expect(join3.isSuccess).toBe(true);
    expect(join3.getValue().wasWaitlisted).toBe(true);
    expect(join3.getValue().waitlistPosition).toBe(2);

    // Step 5: Player1 leaves (>24h out — no credit penalty)
    const leaveResult = await matchSvc.leaveMatch(match.id, player1._id.toString());
    expect(leaveResult.isSuccess).toBe(true);

    // Step 6: Player2 should now be auto-promoted to registered (in players[])
    const promotedInteraction = await SessionInteractionModel.findOne({
      userId: player2._id.toString(),
      sessionId: match.id,
    });
    expect(promotedInteraction?.status).toBe('registered');

    const updatedMatch = await MatchModel.findById(match.id);
    expect(updatedMatch?.players.map(p => p.toString())).toContain(player2._id.toString());
    expect(updatedMatch?.players.map(p => p.toString())).not.toContain(player1._id.toString());

    // Player1 credit should be unchanged (>24h)
    const updatedPlayer1 = await UserModel.findById(player1._id);
    expect(updatedPlayer1?.creditScore).toBe(100);
  });
});
