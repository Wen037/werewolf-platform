import { sendEventNotificationEmail } from '../../../../shared/infra/email';

export const sendEmailNotification = async (
  to: string,
  type: string,
  message: string
): Promise<void> => {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[Email] RESEND_API_KEY not set — skipping.');
    return;
  }

  try {
    await sendEventNotificationEmail(
      to,
      `Werewolf SG: ${type}`,
      `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
          <h2 style="display: flex; align-items: center; gap: 8px;">
            <img src="https://werewolf.sg/werewolf_favicon.png" alt="Werewolf SG" width="28" height="28" style="border-radius: 50%; vertical-align: middle;" />
            Werewolf SG
          </h2>
          <p>${message}</p>
          <p style="color: #888; font-size: 12px;">
            You received this because you have email notifications enabled.
            Update your preferences in your profile settings.
          </p>
        </div>
      `
    );
  } catch (err) {
    console.error('[Email] Failed to send notification:', err);
  }
};
