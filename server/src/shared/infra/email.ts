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

export interface BookingInquiryPayload {
  venueName: string;
  date: string;       // e.g. "2025-07-15"
  time: string;       // e.g. "19:00"
  duration: string;   // e.g. "2"
  pax: number;
  name: string;
  contact: string;
  notes?: string;
  isAutoConfirmed: boolean;
}

export const sendBookingInquiryEmail = async (
  ownerEmail: string,
  payload: BookingInquiryPayload
): Promise<void> => {
  if (process.env.NODE_ENV === 'test') {
    console.log(`[TEST] Booking inquiry to ${ownerEmail}:`, payload);
    return;
  }

  const dur = parseFloat(payload.duration);
  const durLabel = `${payload.duration} ${dur > 1 ? 'hrs' : 'hr'}`;
  const confirmLabel = payload.isAutoConfirmed
    ? '<span style="color:#16a34a;font-weight:bold;">Auto-confirmed (public space)</span>'
    : '<span style="color:#f59e0b;font-weight:bold;">Pending your confirmation</span>';

  const { error } = await getResend().emails.send({
    from: process.env.FROM_EMAIL ?? 'noreply@example.com',
    to: ownerEmail,
    subject: `New Booking Enquiry — ${payload.venueName}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1a1a1a;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;">
          <img src="https://werewolf.sg/werewolf_favicon.png" alt="Werewolf SG" width="28" height="28" style="border-radius:50%;vertical-align:middle;" />
          <strong style="font-size:16px;">Werewolf SG</strong>
        </div>
        <h2 style="margin-bottom:4px;">Booking Enquiry for ${payload.venueName}</h2>
        <p style="color:#666;margin-top:0;">Status: ${confirmLabel}</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          <tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#555;width:40%;">Date</td><td style="padding:8px 0;border-bottom:1px solid #eee;font-weight:600;">${payload.date}</td></tr>
          <tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#555;">Start time</td><td style="padding:8px 0;border-bottom:1px solid #eee;font-weight:600;">${payload.time}</td></tr>
          <tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#555;">Duration</td><td style="padding:8px 0;border-bottom:1px solid #eee;font-weight:600;">${durLabel}</td></tr>
          <tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#555;">No. of pax</td><td style="padding:8px 0;border-bottom:1px solid #eee;font-weight:600;">${payload.pax}</td></tr>
          <tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#555;">Requester</td><td style="padding:8px 0;border-bottom:1px solid #eee;font-weight:600;">${payload.name}</td></tr>
          <tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#555;">Contact</td><td style="padding:8px 0;border-bottom:1px solid #eee;font-weight:600;">${payload.contact}</td></tr>
          ${payload.notes ? `<tr><td style="padding:8px 0;color:#555;">Notes</td><td style="padding:8px 0;font-weight:600;">${payload.notes}</td></tr>` : ''}
        </table>
        ${payload.isAutoConfirmed
          ? '<p style="background:#f0fdf4;border:1px solid #bbf7d0;padding:12px;border-radius:8px;color:#166534;">This is a <strong>public / school space</strong> — the booking has been auto-confirmed. Please make sure the space is available at the requested time.</p>'
          : '<p style="background:#fffbeb;border:1px solid #fde68a;padding:12px;border-radius:8px;color:#92400e;">Please contact the requester to confirm or decline this booking.</p>'
        }
        <p style="color:#888;font-size:12px;margin-top:24px;">Sent via <a href="https://werewolf.sg" style="color:#7c3aed;">Werewolf SG</a></p>
      </div>
    `,
  });

  if (error) {
    console.error('[email] sendBookingInquiryEmail failed:', error);
    // Non-fatal — log but do not throw so the API call still succeeds
  }
};

export const sendContactEmail = async (
  fromEmail: string,
  message: string
): Promise<void> => {
  const adminEmail = process.env.ADMIN_EMAIL ?? 'becky.fuwen@gmail.com';
  if (process.env.NODE_ENV === 'test') {
    console.log(`[TEST] Contact form from ${fromEmail}: ${message}`);
    return;
  }
  const { error } = await getResend().emails.send({
    from: process.env.FROM_EMAIL ?? 'noreply@example.com',
    to: adminEmail,
    replyTo: fromEmail,
    subject: `[Werewolf SG] Feedback from ${fromEmail}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1a1a1a;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;">
          <img src="https://werewolf.sg/werewolf_favicon.png" alt="Werewolf SG" width="28" height="28" style="border-radius:50%;vertical-align:middle;" />
          <strong style="font-size:16px;">Werewolf SG — Contact Form</strong>
        </div>
        <p><strong>From:</strong> ${fromEmail}</p>
        <div style="background:#f5f5f5;border-left:4px solid #7c3aed;padding:12px 16px;border-radius:4px;margin:16px 0;white-space:pre-wrap;">${message}</div>
        <p style="color:#888;font-size:12px;">Reply directly to this email to respond to the sender.</p>
      </div>
    `,
  });
  if (error) {
    console.error('[email] sendContactEmail failed:', error);
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
