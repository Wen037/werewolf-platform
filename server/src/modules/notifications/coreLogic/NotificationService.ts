import { eventBus, DomainEvent } from '../../../shared/infra/EventBus';
import { NotificationModel } from '../DBSchemas/NotificationSchema';
import { UserModel } from '../../users/DBSchemas/UserSchema';
import { MatchModel } from '../../matches/DBSchemas/MatchSchema';
import { sendTelegramMessage } from './channels/TelegramChannel';
import { sendEmailNotification } from './channels/EmailChannel';

type NotifType = 'WaitlistPromoted' | 'MatchJoined' | 'MatchStatusChanged' | 'MatchInvited' | 'General';

class NotificationService {
  constructor() {
    this.registerHandlers();
  }

  private async dispatch(
    userId: string,
    type: NotifType,
    message: string,
    payload: Record<string, unknown>
  ): Promise<void> {
    try {
      const user = await UserModel.findById(userId);
      if (!user) return;

      // Always create in-app notification
      await NotificationModel.create({
        recipientId: userId,
        type,
        message,
        payload,
        channel: 'in-app',
      });

      // Email if opted in
      if (user.notifPreferences?.email) {
        await sendEmailNotification(user.email, type, message);
      }

      // Telegram if subscribed
      if (user.notifPreferences?.telegram && user.telegramChatId) {
        await sendTelegramMessage(user.telegramChatId, `🎴 Werewolf Meetup\n${message}`);
      }
    } catch (err) {
      console.error(`[NotificationService] Error dispatching ${type} to ${userId}:`, err);
    }
  }

  private registerHandlers(): void {
    eventBus.subscribe('UserJoinedMatch', async (event: DomainEvent) => {
      const { userId, matchId } = event.payload as { userId: string; matchId: string };
      const match = await MatchModel.findById(matchId);
      if (!match) return;

      await this.dispatch(
        match.host_id.toString(),
        'MatchJoined',
        `A new player joined your match: "${match.title}"`,
        { matchId, userId }
      );
    });

    eventBus.subscribe('WaitlistPromoted', async (event: DomainEvent) => {
      const { promotedUserId, matchId } = event.payload as {
        promotedUserId: string;
        matchId: string;
      };
      const match = await MatchModel.findById(matchId);
      if (!match) return;

      await this.dispatch(
        promotedUserId,
        'WaitlistPromoted',
        `Great news! A spot opened up in "${match.title}". You're in! 🎉`,
        { matchId }
      );
    });

    eventBus.subscribe('MatchStatusChanged', async (event: DomainEvent) => {
      const { matchId, newStatus } = event.payload as { matchId: string; newStatus: string };
      const match = await MatchModel.findById(matchId);
      if (!match) return;

      const statusMessages: Record<string, string> = {
        Started: `Match "${match.title}" has started! Get ready to play. 🐺`,
        Completed: `Match "${match.title}" has completed. Thanks for playing!`,
        Cancelled: `Match "${match.title}" has been cancelled by the host.`,
      };

      const message = statusMessages[newStatus] ?? `Match "${match.title}" status changed to ${newStatus}.`;
      const allParticipants = [
        ...match.players.map(p => p.toString()),
        ...match.waitlist.map(w => w.toString()),
      ];

      for (const participantId of allParticipants) {
        await this.dispatch(participantId, 'MatchStatusChanged', message, {
          matchId,
          newStatus,
        });
      }
    });

    eventBus.subscribe('MatchInvited', async (event: DomainEvent) => {
      const { invitedUserId, matchId } = event.payload as {
        invitedUserId: string;
        matchId: string;
      };
      const match = await MatchModel.findById(matchId);
      if (!match) return;

      const host = await UserModel.findById(match.host_id, 'username');
      const hostName = host?.username ?? 'Someone';

      await this.dispatch(
        invitedUserId,
        'MatchInvited',
        `${hostName} invited you to join "${match.title}" on ${match.scheduledAt.toLocaleDateString()}.`,
        { matchId }
      );
    });
  }
}

// Instantiate once — the constructor side-effect registers all EventBus handlers
export const notificationService = new NotificationService();
