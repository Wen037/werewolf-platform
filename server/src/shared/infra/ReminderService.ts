import cron from 'node-cron';
import { Resend } from 'resend';
import { MatchModel } from '../../modules/matches/DBSchemas/MatchSchema';
import { UserModel } from '../../modules/users/DBSchemas/UserSchema';

let _resend: Resend | null = null;
function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

export class ReminderService {
  start(): void {
    // Run at the top of every hour
    cron.schedule('0 * * * *', async () => {
      try {
        await this.sendReminders();
      } catch (err) {
        console.error('[ReminderService] Error:', err);
      }
    });
    console.log('⏰ ReminderService started (hourly)');
  }

  async sendReminders(): Promise<void> {
    const resend = getResend();
    if (!resend) return; // Resend not configured — skip silently

    const now = new Date();
    const from = new Date(now.getTime() + 23 * 60 * 60 * 1000);
    const to   = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    // reminderSentAt guard: the 2h window is wider than the hourly cron interval,
    // so without it every match would be picked up by two consecutive runs and
    // players would receive the reminder twice.
    const matches = await MatchModel.find({
      status: { $in: ['Open', 'Full'] },
      scheduledAt: { $gte: from, $lte: to },
      reminderSentAt: { $exists: false },
    }).lean();

    if (matches.length === 0) return;

    for (const match of matches) {
      await MatchModel.findByIdAndUpdate(match._id, { $set: { reminderSentAt: now } });

      const playerIds = (match.players as { toString(): string }[]).map(p => p.toString());
      if (playerIds.length === 0) continue;

      const users = await UserModel.find({ _id: { $in: playerIds } }, 'email username').lean();

      for (const user of users) {
        if (!user.email) continue;
        try {
          await this.sendEmail(resend, user.email, user.username, match);
        } catch (err) {
          console.error(`[ReminderService] Failed for ${user.email}:`, err);
        }
      }
    }

    console.log(`[ReminderService] Reminder run: ${matches.length} match(es) covered`);
  }

  private async sendEmail(
    resend: Resend,
    email: string,
    username: string,
    match: { title: string; scheduledAt: Date }
  ): Promise<void> {
    const date = new Date(match.scheduledAt).toLocaleString('en-SG', {
      weekday: 'long', day: 'numeric', month: 'long',
      hour: '2-digit', minute: '2-digit',
    });
    await resend.emails.send({
      from: process.env.FROM_EMAIL ?? 'noreply@example.com',
      to:   email,
      subject: `[Werewolf SG] Reminder: "${match.title}" is tomorrow`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto;background:#111;color:#eee;padding:32px;border-radius:12px;">
          <h2 style="color:#ef4444;margin:0 0 8px">🐺 Game Tomorrow!</h2>
          <p>Hi <strong>${username}</strong>,</p>
          <p>Just a reminder — you have a Werewolf game tomorrow:</p>
          <div style="background:#222;border-radius:8px;padding:16px;margin:16px 0;border-left:4px solid #ef4444;">
            <p style="margin:0;font-size:16px"><strong>${match.title}</strong></p>
            <p style="margin:6px 0 0;color:#aaa;font-size:14px">${date}</p>
          </div>
          <p style="font-size:13px;color:#888;margin-top:24px">
            Make sure you're on time. See you at the table!<br>
            <a href="${process.env.FRONTEND_URL ?? 'https://werewolf.sg'}" style="color:#ef4444">Werewolf SG</a>
          </p>
        </div>
      `,
    });
  }
}
