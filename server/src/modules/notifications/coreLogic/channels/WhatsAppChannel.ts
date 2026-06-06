import axios from 'axios';

/**
 * Sends a WhatsApp message via the WhatsApp Business Cloud API (Meta).
 * Silently skips if env vars are not set (graceful degradation in dev/test).
 *
 * Required env vars:
 *   WHATSAPP_API_TOKEN       — long-lived system user token from Meta
 *   WHATSAPP_PHONE_NUMBER_ID — Phone Number ID from WhatsApp > API Setup in Meta dashboard
 */
export const sendWhatsAppMessage = async (phone: string, message: string): Promise<void> => {
  const token = process.env.WHATSAPP_API_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    console.warn('[WhatsApp] WHATSAPP_API_TOKEN or WHATSAPP_PHONE_NUMBER_ID not set — skipping.');
    return;
  }

  try {
    await axios.post(
      `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: phone,
        type: 'text',
        text: { body: message },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (err) {
    console.error('[WhatsApp] Failed to send message to', phone, ':', err);
  }
};
