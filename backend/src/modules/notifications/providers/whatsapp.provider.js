// Twilio client — lazy-initialised so the server starts fine without credentials.
// Track credentials we initialised with to allow re-init when env changes (Jest isolation).
let twilioClient = null;
let initializedWith = null;

async function getTwilioClient() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const key = `${sid}:${token}`;

  if (!sid || !token) return null;

  if (twilioClient && initializedWith === key) return twilioClient;

  try {
    const { default: Twilio } = await import('twilio');
    twilioClient = Twilio(sid, token);
    initializedWith = key;
    return twilioClient;
  } catch (err) {
    console.error('[whatsapp] Failed to initialise Twilio client:', err.message);
    return null;
  }
}

/**
 * Send a WhatsApp message via the Twilio WhatsApp Business API.
 *
 * @param {object} opts
 * @param {string} opts.to   Recipient phone (E.164 or bare 10-digit Indian number)
 * @param {string} opts.body Message text (max 1600 chars per Twilio limits)
 * @returns {Promise<void>} — never throws; failures are console.error'd
 */
export async function sendWhatsApp({ to, body }) {
  if (!to || !body) return;
  if (process.env.NOTIFICATION_WHATSAPP_ENABLED === 'false') return;

  const client = await getTwilioClient();
  if (!client) return; // Not configured — silently skip

  // Normalise to E.164 with India country code if a bare 10-digit number is supplied
  const toNumber = to.startsWith('+') ? to : `+91${to}`;
  const from = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';

  try {
    await client.messages.create({
      from,
      to: `whatsapp:${toNumber}`,
      body,
    });
  } catch (err) {
    console.error(`[whatsapp] Twilio delivery failed for ${toNumber}: ${err.message}`);
  }
}
