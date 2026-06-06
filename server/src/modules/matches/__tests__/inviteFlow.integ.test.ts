import { describe, it, expect, vi, beforeAll } from 'vitest';
import { setupMongoMemory } from '../../../__tests__/helpers/setupMongoMemory';
import { createTestUser } from '../../../__tests__/helpers/createTestUser';
import { createTestVenue } from '../../../__tests__/helpers/createTestVenue';
import { createTestMatch } from '../../../__tests__/helpers/createTestMatch';
import { MatchService } from '../coreLogic/MatchService';
import { MatchInviteModel } from '../DBSchemas/MatchInviteSchema';
import { NotificationModel } from '../../notifications/DBSchemas/NotificationSchema';
import { eventBus } from '../../../shared/infra/EventBus';

setupMongoMemory();

// Register NotificationService handlers so EventBus dispatches create DB records
beforeAll(async () => {
  await import('../../notifications/coreLogic/NotificationService');
});

const svc = new MatchService();

async function waitForEventHandlers(): Promise<void> {
  await new Promise(r => setTimeout(r, 500));
}

describe('Invite-only flow', () => {
  it('INVITE-FLOW-1: host invites users → MatchInvite records created with status "pending"', async () => {
    const host = await createTestUser();
    const inv1 = await createTestUser();
    const inv2 = await createTestUser();
    const venue = await createTestVenue(host._id.toString());
    const match = await createTestMatch({ hostId: host._id.toString(), venueId: venue._id.toString(), approvalMode: 'invite_only' });

    const result = await svc.inviteUsers(match._id.toString(), host._id.toString(), {
      userIds: [inv1._id.toString(), inv2._id.toString()],
    });

    expect(result.isSuccess).toBe(true);
    const invites = await MatchInviteModel.find({ matchId: match._id });
    expect(invites).toHaveLength(2);
    expect(invites.every(i => i.status === 'pending')).toBe(true);
  });

  it('INVITE-FLOW-2: invited user can join invite_only match and becomes registered', async () => {
    const host = await createTestUser();
    const invitee = await createTestUser();
    const venue = await createTestVenue(host._id.toString());
    const match = await createTestMatch({ hostId: host._id.toString(), venueId: venue._id.toString(), approvalMode: 'invite_only' });

    await svc.inviteUsers(match._id.toString(), host._id.toString(), { userIds: [invitee._id.toString()] });
    const result = await svc.joinMatch(match._id.toString(), invitee._id.toString());

    expect(result.isSuccess).toBe(true);
    expect(result.getValue().wasWaitlisted).toBe(false);
  });

  it('INVITE-FLOW-3: non-invited user cannot join invite_only match', async () => {
    const host = await createTestUser();
    const invitee = await createTestUser();
    const noInvite = await createTestUser();
    const venue = await createTestVenue(host._id.toString());
    const match = await createTestMatch({ hostId: host._id.toString(), venueId: venue._id.toString(), approvalMode: 'invite_only' });

    await svc.inviteUsers(match._id.toString(), host._id.toString(), { userIds: [invitee._id.toString()] });
    const result = await svc.joinMatch(match._id.toString(), noInvite._id.toString());

    expect(result.isFailure).toBe(true);
    expect(result.getError()).toMatch(/invite-only/i);
  });

  it('INVITE-FLOW-4: MatchInvited event is published once per invited user', async () => {
    const host = await createTestUser();
    const inv1 = await createTestUser();
    const inv2 = await createTestUser();
    const venue = await createTestVenue(host._id.toString());
    const match = await createTestMatch({ hostId: host._id.toString(), venueId: venue._id.toString(), approvalMode: 'invite_only' });

    const publishSpy = vi.spyOn(eventBus, 'publish');
    await svc.inviteUsers(match._id.toString(), host._id.toString(), {
      userIds: [inv1._id.toString(), inv2._id.toString()],
    });

    const inviteEvents = publishSpy.mock.calls.filter(c => c[0].eventName === 'MatchInvited');
    expect(inviteEvents).toHaveLength(2);
    publishSpy.mockRestore();
  });

  it('INVITE-FLOW-5: notification DB record is created for each invited user', async () => {
    const host = await createTestUser();
    const invitee = await createTestUser();
    const venue = await createTestVenue(host._id.toString());
    const match = await createTestMatch({ hostId: host._id.toString(), venueId: venue._id.toString(), approvalMode: 'invite_only' });

    await svc.inviteUsers(match._id.toString(), host._id.toString(), { userIds: [invitee._id.toString()] });
    await waitForEventHandlers();

    const count = await NotificationModel.countDocuments({
      recipientId: invitee._id.toString(),
      type: 'MatchInvited',
    });
    expect(count).toBe(1);
  });

  it('INVITE-FLOW-6: duplicate invite call is idempotent — no duplicate MatchInvite records', async () => {
    const host = await createTestUser();
    const invitee = await createTestUser();
    const venue = await createTestVenue(host._id.toString());
    const match = await createTestMatch({ hostId: host._id.toString(), venueId: venue._id.toString(), approvalMode: 'invite_only' });

    await svc.inviteUsers(match._id.toString(), host._id.toString(), { userIds: [invitee._id.toString()] });
    await svc.inviteUsers(match._id.toString(), host._id.toString(), { userIds: [invitee._id.toString()] });

    const invites = await MatchInviteModel.find({ matchId: match._id, invitedUserId: invitee._id.toString() });
    expect(invites).toHaveLength(1);
  });
});
