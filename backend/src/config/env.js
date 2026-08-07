import 'dotenv/config';

const required = ['MONGODB_URI', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];
const isProdEnv = process.env.NODE_ENV === 'production';

/** In production, a missing JWT secret must never silently fall back to the
 * hardcoded dev default below — that default is public (it's in this file,
 * in git history), so anyone could forge a valid token for any user/role,
 * including super_admin. A console.warn alone is easy to miss in prod logs
 * and doesn't stop the server from booting insecurely; refuse to start instead. */
for (const key of required) {
  if (!process.env[key]) {
    if (isProdEnv) {
      throw new Error(`[env] FATAL: ${key} is not set. Refusing to start in production with an insecure default.`);
    }
    console.warn(`[env] Missing ${key} — falling back to .env.example default. Set this before deploying.`);
  }
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 4000,
  mongodbUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/nigam_care',
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'dev-only-access-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-only-refresh-secret',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173').split(',').map((o) => o.trim()),
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
  },
  otpProvider: process.env.OTP_PROVIDER || 'stub',

  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
    uploadFolder: process.env.CLOUDINARY_UPLOAD_FOLDER || 'nigam-care',
  },
  smsIndiaHub: {
    baseUrl: process.env.SMSINDIAHUB_BASE_URL || 'https://cloud.smsindiahub.in/api/mt/SendSMS',
    username: process.env.SMSINDIAHUB_USERNAME || '',
    password: process.env.SMSINDIAHUB_PASSWORD || '',
    senderId: process.env.SMSINDIAHUB_SENDER_ID || '',
    entityId: process.env.SMSINDIAHUB_ENTITY_ID || '',
    dltTemplateId: process.env.SMSINDIAHUB_DLT_TEMPLATE_ID || '',
    // Must match the DLT-registered template text VERBATIM (only the {code}
    // placeholder varies) — carriers silently drop anything that doesn't
    // byte-match the approved template, per TRAI's DLT compliance rules.
    otpTemplate: process.env.SMSINDIAHUB_OTP_TEMPLATE || 'Your Nigam Care OTP is {code}. Valid for 10 minutes. Do not share this code with anyone.',
    channel: process.env.SMSINDIAHUB_CHANNEL || '2', // '2' = transactional route on SMSIndiaHub
    // DLT-registered transactional notification template (non-OTP).
    // Register this in the DLT portal with {message} as the variable slot.
    notificationTemplate: process.env.SMSINDIAHUB_NOTIFICATION_TEMPLATE || 'Dear Customer, {message} - Nigam Care',
    notificationDltTemplateId: process.env.SMSINDIAHUB_NOTIFICATION_DLT_TEMPLATE_ID || '',
  },
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || '',
    keySecret: process.env.RAZORPAY_KEY_SECRET || '',
  },
  // Firebase Cloud Messaging — paste the entire service-account JSON as a single
  // line (or a file path) in FCM_SERVICE_ACCOUNT_JSON. The server lazy-initialises
  // the firebase-admin app on first use so a missing key is non-fatal in dev.
  fcm: {
    serviceAccountJson: process.env.FCM_SERVICE_ACCOUNT_JSON || '',
  },
  // Twilio — WhatsApp Business API delivery + Voice click-to-call relay
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    whatsappFrom: process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886', // Twilio sandbox default
    // Twilio Voice: a purchased Twilio phone number with Voice capability enabled.
    // Neither customer nor technician will see the other's real number — both legs
    // go through this virtual proxy. Leave blank to gracefully degrade (returns 503).
    voiceFrom: process.env.TWILIO_VOICE_NUMBER || '',
    callMaskingEnabled: process.env.CALL_MASKING_ENABLED !== 'false',
  },
  // Per-channel feature flags — set to 'false' to disable a channel without
  // removing credentials (useful for staging / DLT-pending environments).
  notifications: {
    pushEnabled: process.env.NOTIFICATION_PUSH_ENABLED !== 'false',
    smsEnabled: process.env.NOTIFICATION_SMS_ENABLED !== 'false',
    whatsappEnabled: process.env.NOTIFICATION_WHATSAPP_ENABLED !== 'false',
  },
};

// The technician assistant refuses rather than fabricating when unconfigured —
// same posture as Cloudinary/Twilio/FCM below.
export const isAnthropicConfigured = Boolean(env.anthropic.apiKey);

export const isCloudinaryConfigured = Boolean(env.cloudinary.cloudName && env.cloudinary.apiKey && env.cloudinary.apiSecret);
export const isSmsIndiaHubConfigured = Boolean(env.smsIndiaHub.username && env.smsIndiaHub.password && env.smsIndiaHub.senderId);
export const isFcmConfigured = Boolean(env.fcm.serviceAccountJson);
export const isTwilioConfigured = Boolean(env.twilio.accountSid && env.twilio.authToken);
export const isTwilioVoiceConfigured = Boolean(env.twilio.accountSid && env.twilio.authToken && env.twilio.voiceFrom);

export const isProd = env.nodeEnv === 'production';
export const isTest = env.nodeEnv === 'test';

