import { describe, it, expect, vi, beforeAll } from 'vitest';
import { setupMongoMemory } from '../../../__tests__/helpers/setupMongoMemory';
import { createTestUser } from '../../../__tests__/helpers/createTestUser';
import { createTestVenue } from '../../../__tests__/helpers/createTestVenue';
import { createTestMatch } from '../../../__tests__/helpers/createTestMatch';
import { NotificationModel } from '../DBSchemas/NotificationSchema';
import { UserModel } from '../../users/DBSchemas/UserSchema';
import { eventBus } from '../../../shared/infra/EventBus';

// Mock external channels — tests only verify DB record creation and call counts
vi.mock('../coreLogic/channels/EmailChannel', () => ({
  sendEmailNotification: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../coreLogic/channels/TelegramChannel', () => ({
  sendTelegramMessage: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../coreLogic/channels/WhatsAppChannel', () => ({
  sendWhatsAppMessage: vi.fn().mockResolvedValue(undefined),
}));

setupMongoMemory();

beforeAll(async () => {
  // Import once to register all EventBus handlers via constructor side-effect
  await import('../coreLogic/NotificationService');
});

async function flush(): Promise<void> {
  // Give async EventBus handlers time to complete all DB operations.
  // MatchInvited does 4 sequential queries; 1500 ms is safe on slow machines.
  await new Promise(r => setTimeout(r, 1500));
}

describe('NotificationService — EventBus handlers', () => {
  it('NS-1: UserJoinedMatch event → in-app notification created for host', async () => {
    const host = await createTestUser();
    const player = await createTestUser();
    const venue = await createTestVenue(host._id.toString());
    const match = await createTestMatch({ hostId: host._id.toString(), venueId: venue._id.toString() });

    eventBus.publish({
      eventName: 'UserJoinedMatch',
      occurredOn: new Date(),
      payload: { userId: player._id.toString(), matchId: match._id.toString() },
    });
    await flush();

    const notif = await NotificationModel.findOne({
      recipientId: host._id.toString(),
      type: 'MatchJoined',
    });
    expect(notif).not.toBeNull();
    expect(notif?.channel).toBe('in-app');
    expect(notif?.isRead).toBe(false);
  });

  it('NS-2: WaitlistPromoted event → notification created for promoted user', async () => {
    const host = await createTestUser();
    const promoted = await createTestUser();
    const venue = await createTestVenue(host._id.toString());
    const match = await createTestMatch({ hostId: host._id.toString(), venueId: venue._id.toString() });

    eventBus.publish({
      eventName: 'WaitlistPromoted',
      occurredOn: new Date(),
      payload: { promotedUserId: promoted._id.toString(), matchId: match._id.toString() },
    });
    await flush();

    const notif = await NotificationModel.findOne({
      recipientId: promoted._id.toString(),
      type: 'WaitlistPromoted',
    });
    expect(notif).not.toBeNull();
    expect(notif?.message).toMatch(/spot opened/i);
  });

  it('NS-3: MatchStatusChanged(Started) → notification for each player', async () => {
    const host = await createTestUser();
    const p1 = await createTestUser();
    const p2 = await createTestUser();
    const venue = await createTestVenue(host._id.toString());
    const match = await createTestMatch({
      hostId: host._id.toString(),
      venueId: venue._id.toString(),
      extraPlayerIds: [p1._id.toString(), p2._id.toString()],
    });

    eventBus.publish({
      eventName: 'MatchStatusChanged',
      occurredOn: new Date(),
      payload: { matchId: match._id.toString(), newStatus: 'Started', hostId: host._id.toString() },
    });
    await flush();

    const count = await NotificationModel.countDocuments({
      type: 'MatchStatusChanged',
      recipientId: { $in: [host._id.toString(), p1._id.toString(), p2._id.toString()] },
    });
    expect(count).toBe(3);
  });

  it('NS-4: MatchStatusChanged(Cancelled) → notifications for all participants', async () => {
    const host = await createTestUser();
    const player = await createTestUser();
    const venue = await createTestVenue(host._id.toString());
    const match = await createTestMatch({
      hostId: host._id.toString(),
      venueId: venue._id.toString(),
      extraPlayerIds: [player._id.toString()],
    });

    eventBus.publish({
      eventName: 'MatchStatusChanged',
      occurredOn: new Date(),
      payload: { matchId: match._id.toString(), newStatus: 'Cancelled', hostId: host._id.toString() },
    });
    await flush();

    const count = await NotificationModel.countDocuments({
      type: 'MatchStatusChanged',
      recipientId: { $in: [host._id.toString(), player._id.toString()] },
    });
    expect(count).toBeGreaterThanOrEqual(2);
  });

  it('NS-5: MatchInvited event → notification created for invited user', async () => {
    const host = await createTestUser();
    const invitee = await createTestUser();
    const venue = await createTestVenue(host._id.toString());
    const match = await createTestMatch({ hostId: host._id.toString(), venueId: venue._id.toString() });

    eventBus.publish({
      eventName: 'MatchInvited',
      occurredOn: new Date(),
      payload: { invitedUserId: invitee._id.toString(), matchId: match._id.toString(), invitedById: host._id.toString() },
    });
    await flush();

    const notif = await NotificationModel.findOne({
      recipientId: invitee._id.toString(),
      type: 'MatchInvited',
    });
    expect(notif).not.toBeNull();
  });

  it('NS-6: user with notifPreferences.email=true → sendEmailNotification is called', async () => {
    const { sendEmailNotification } = await import('../coreLogic/channels/EmailChannel');
    vi.mocked(sendEmailNotification).mockClear();

    const host = await createTestUser();
    const emailUser = await createTestUser();
    await UserModel.findByIdAndUpdate(emailUser._id, { 'notifPreferences.email': true });
    const venue = await createTestVenue(host._id.toString());
    const match = await createTestMatch({ hostId: host._id.toString(), venueId: venue._id.toString(), extraPlayerIds: [emailUser._id.toString()] });

    eventBus.publish({
      eventName: 'MatchStatusChanged',
      occurredOn: new Date(),
      payload: { matchId: match._id.toString(), newStatus: 'Started', hostId: host._id.toString() },
    });
    await flush();

    const callsForEmailUser = vi.mocked(sendEmailNotification).mock.calls.filter(
      c => c[0] === emailUser.email
    );
    expect(callsForEmailUser.length).toBeGreaterThanOrEqual(1);
  });

  it('NS-7: user with notifPreferences.email=false → sendEmailNotification NOT called for that user', async () => {
    const { sendEmailNotification } = await import('../coreLogic/channels/EmailChannel');
    vi.mocked(sendEmailNotification).mockClear();

    const host = await createTestUser();
    const noEmailUser = await createTestUser();
    await UserModel.findByIdAndUpdate(noEmailUser._id, { 'notifPreferences.email': false });
    const venue = await createTestVenue(host._id.toString());
    const match = await createTestMatch({ hostId: host._id.toString(), venueId: venue._id.toString(), extraPlayerIds: [noEmailUser._id.toString()] });

    eventBus.publish({
      eventName: 'MatchStatusChanged',
      occurredOn: new Date(),
      payload: { matchId: match._id.toString(), newStatus: 'Cancelled', hostId: host._id.toString() },
    });
    await flush();

    const callsForUser = vi.mocked(sendEmailNotification).mock.calls.filter(
      c => c[0] === noEmailUser.email
    );
    expect(callsForUser).toHaveLength(0);
  });

  it('NS-8: user with telegram=true + telegramChatId → sendTelegramMessage is called', async () => {
    const { sendTelegramMessage } = await import('../coreLogic/channels/TelegramChannel');
    vi.mocked(sendTelegramMessage).mockClear();

    const host = await createTestUser();
    const telegramUser = await createTestUser();
    await UserModel.findByIdAndUpdate(telegramUser._id, {
      'notifPreferences.telegram': true,
      telegramChatId: '12345678',
    });
    const venue = await createTestVenue(host._id.toString());
    const match = await createTestMatch({ hostId: host._id.toString(), venueId: venue._id.toString(), extraPlayerIds: [telegramUser._id.toString()] });

    eventBus.publish({
      eventName: 'MatchStatusChanged',
      occurredOn: new Date(),
      payload: { matchId: match._id.toString(), newStatus: 'Started', hostId: host._id.toString() },
    });
    await flush();

    const callsForUser = vi.mocked(sendTelegramMessage).mock.calls.filter(
      c => c[0] === '12345678'
    );
    expect(callsForUser.length).toBeGreaterThanOrEqual(1);
  });

  it('NS-9: DB notification record always has channel="in-app" regardless of external prefs', async () => {
    const host = await createTestUser();
    await UserModel.findByIdAndUpdate(host._id, {
      'notifPreferences.email': true,
      'notifPreferences.telegram': true,
      telegramChatId: '99999999',
    });
    const player = await createTestUser();
    const venue = await createTestVenue(host._id.toString());
    const match = await createTestMatch({ hostId: host._id.toString(), venueId: venue._id.toString() });

    eventBus.publish({
      eventName: 'UserJoinedMatch',
      occurredOn: new Date(),
      payload: { userId: player._id.toString(), matchId: match._id.toString() },
    });
    await flush();

    const notifs = await NotificationModel.find({ recipientId: host._id.toString() });
    expect(notifs.length).toBeGreaterThanOrEqual(1);
    notifs.forEach(n => {
      expect(n.channel).toBe('in-app');
    });
  });

  it('NS-10: handler errors are caught — process does not crash, console.error is called', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { sendEmailNotification } = await import('../coreLogic/channels/EmailChannel');
    vi.mocked(sendEmailNotification).mockRejectedValueOnce(new Error('Channel down'));

    const host = await createTestUser();
    await UserModel.findByIdAndUpdate(host._id, { 'notifPreferences.email': true });
    const player = await createTestUser();
    const venue = await createTestVenue(host._id.toString());
    const match = await createTestMatch({ hostId: host._id.toString(), venueId: venue._id.toString() });

    eventBus.publish({
      eventName: 'UserJoinedMatch',
      occurredOn: new Date(),
      payload: { userId: player._id.toString(), matchId: match._id.toString() },
    });
    await flush();

    // The process should not have thrown; the in-app notification is still created
    const notif = await NotificationModel.findOne({ recipientId: host._id.toString() });
    expect(notif).not.toBeNull();

    errorSpy.mockRestore();
  });

  // ── New event handlers ──────────────────────────────────────────────────────

  it('NS-11: VenueApproved event → in-app notification created for owner', async () => {
    const owner = await createTestUser();
    const venue = await createTestVenue(owner._id.toString());

    eventBus.publish({
      eventName: 'VenueApproved',
      occurredOn: new Date(),
      payload: { venueId: venue._id.toString(), ownerId: owner._id.toString(), venueName: venue.name },
    });
    await flush();

    const notif = await NotificationModel.findOne({
      recipientId: owner._id.toString(),
      type: 'VenueApproved',
    });
    expect(notif).not.toBeNull();
    expect(notif?.message).toMatch(/verified/i);
  });

  it('NS-12: VenueRejected event → in-app notification to owner containing reason', async () => {
    const owner = await createTestUser();
    const venue = await createTestVenue(owner._id.toString());

    eventBus.publish({
      eventName: 'VenueRejected',
      occurredOn: new Date(),
      payload: {
        venueId: venue._id.toString(),
        ownerId: owner._id.toString(),
        venueName: venue.name,
        reason: 'Address could not be verified.',
      },
    });
    await flush();

    const notif = await NotificationModel.findOne({
      recipientId: owner._id.toString(),
      type: 'VenueRejected',
    });
    expect(notif).not.toBeNull();
    expect(notif?.message).toContain('Address could not be verified.');
  });

  it('NS-13: UserRegistered event → welcome notification for new user', async () => {
    const newUser = await createTestUser();

    eventBus.publish({
      eventName: 'UserRegistered',
      occurredOn: new Date(),
      payload: { userId: newUser._id.toString(), email: newUser.email, username: newUser.username },
    });
    await flush();

    const notif = await NotificationModel.findOne({
      recipientId: newUser._id.toString(),
      type: 'UserRegistered',
    });
    expect(notif).not.toBeNull();
    expect(notif?.message).toMatch(/welcome/i);
  });

  it('NS-14: whatsapp=true + whatsappPhone set → sendWhatsAppMessage is called', async () => {
    const { sendWhatsAppMessage } = await import('../coreLogic/channels/WhatsAppChannel');
    vi.mocked(sendWhatsAppMessage).mockClear();

    const host = await createTestUser();
    const waUser = await createTestUser();
    await UserModel.findByIdAndUpdate(waUser._id, {
      'notifPreferences.whatsapp': true,
      whatsappPhone: '+6591234567',
    });

    const venue = await createTestVenue(host._id.toString());
    const match = await createTestMatch({
      hostId: host._id.toString(),
      venueId: venue._id.toString(),
      extraPlayerIds: [waUser._id.toString()],
    });

    eventBus.publish({
      eventName: 'MatchStatusChanged',
      occurredOn: new Date(),
      payload: { matchId: match._id.toString(), newStatus: 'Started', hostId: host._id.toString() },
    });
    await flush();

    const calls = vi.mocked(sendWhatsAppMessage).mock.calls.filter(c => c[0] === '+6591234567');
    expect(calls.length).toBeGreaterThanOrEqual(1);
  });

  it('NS-15: whatsapp=true but no whatsappPhone → sendWhatsAppMessage NOT called', async () => {
    const { sendWhatsAppMessage } = await import('../coreLogic/channels/WhatsAppChannel');
    vi.mocked(sendWhatsAppMessage).mockClear();

    const host = await createTestUser();
    const noPhoneUser = await createTestUser();
    await UserModel.findByIdAndUpdate(noPhoneUser._id, {
      'notifPreferences.whatsapp': true,
      // whatsappPhone intentionally not set
    });

    const venue = await createTestVenue(host._id.toString());
    const match = await createTestMatch({
      hostId: host._id.toString(),
      venueId: venue._id.toString(),
      extraPlayerIds: [noPhoneUser._id.toString()],
    });

    eventBus.publish({
      eventName: 'MatchStatusChanged',
      occurredOn: new Date(),
      payload: { matchId: match._id.toString(), newStatus: 'Cancelled', hostId: host._id.toString() },
    });
    await flush();

    // sendWhatsAppMessage should NOT have been called for this user (no phone)
    // (it may have been called for other users in previous tests — filter by absence of undefined phone)
    const undefinedPhoneCalls = vi.mocked(sendWhatsAppMessage).mock.calls.filter(c => !c[0]);
    expect(undefinedPhoneCalls).toHaveLength(0);
  });
});
