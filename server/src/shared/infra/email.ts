import { Resend } from 'resend';

// Lazily instantiated so dotenv.config() in server.ts runs first
let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

export const sendOtpEmail = async (to: string, otp: string): Promise<void> => {
  if (process.env.NODE_ENV === 'test') {
    console.log(`[TEST] OTP for ${to}: ${otp}`);
    return;
  }
  await getResend().emails.send({
    from: process.env.FROM_EMAIL ?? 'noreply@example.com',
    to,
    subject: 'Your Werewolf Meetup verification code',
    html: `
      <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto;">
        <h2>Verify your email</h2>
        <p>Your verification code is:</p>
        <h1 style="letter-spacing: 8px; color: #7c3aed;">${otp}</h1>
        <p>This code expires in <strong>10 minutes</strong>.</p>
        <p style="color: #888;">If you did not request this, please ignore this email.</p>
      </div>
    `,
  });
};

export const sendEventNotificationEmail = async (
  to: string,
  subject: string,
  html: string
): Promise<void> => {
  await getResend().emails.send({
    from: process.env.FROM_EMAIL ?? 'noreply@example.com',
    to,
    subject,
    html,
  });
};
