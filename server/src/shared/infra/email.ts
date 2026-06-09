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
  // Resend SDK v2 returns { data, error } instead of throwing — must check error explicitly.
  const { error } = await getResend().emails.send({
    from: process.env.FROM_EMAIL ?? 'noreply@example.com',
    to,
    subject: 'Your Werewolf SG verification code',
    html: `
      <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px;">
          <img src="https://werewolf.sg/werewolf_favicon.png" alt="Werewolf SG" width="28" height="28" style="border-radius: 50%; vertical-align: middle;" />
          <strong style="font-size: 16px;">Werewolf SG</strong>
        </div>
        <h2>Verify your email</h2>
        <p>Your verification code is:</p>
        <h1 style="letter-spacing: 8px; color: #7c3aed;">${otp}</h1>
        <p>This code expires in <strong>10 minutes</strong>.</p>
        <p style="color: #888;">If you did not request this, please ignore this email.</p>
      </div>
    `,
  });
  if (error) {
    console.error('[email] sendOtpEmail failed:', error);
    throw new Error(`Email delivery failed: ${error.message}`);
  }
};

export const sendPasswordResetEmail = async (to: string, token: string): Promise<void> => {
  if (process.env.NODE_ENV === 'test') {
    console.log(`[TEST] Password reset token for ${to}: ${token}`);
    return;
  }
  const { error } = await getResend().emails.send({
    from: process.env.FROM_EMAIL ?? 'noreply@example.com',
    to,
    subject: 'Reset your Werewolf SG password',
    html: `
      <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px;">
          <img src="https://werewolf.sg/werewolf_favicon.png" alt="Werewolf SG" width="28" height="28" style="border-radius: 50%; vertical-align: middle;" />
          <strong style="font-size: 16px;">Werewolf SG</strong>
        </div>
        <h2>Reset your password</h2>
        <p>Your password reset code is:</p>
        <h1 style="letter-spacing: 8px; color: #7c3aed;">${token}</h1>
        <p>This code expires in <strong>10 minutes</strong>.</p>
        <p style="color: #888;">If you did not request this, please ignore this email — your password will not change.</p>
      </div>
    `,
  });
  if (error) {
    console.error('[email] sendPasswordResetEmail failed:', error);
    throw new Error(`Email delivery failed: ${error.message}`);
  }
};

export const sendEventNotificationEmail = async (
  to: string,
  subject: string,
  html: string
): Promise<void> => {
  const { error } = await getResend().emails.send({
    from: process.env.FROM_EMAIL ?? 'noreply@example.com',
    to,
    subject,
    html,
  });
  if (error) {
    console.error('[email] sendEventNotificationEmail failed:', error);
    throw new Error(`Email delivery failed: ${error.message}`);
  }
};
