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
  otpProvider: process.env.OTP_PROVIDER || 'stub',
  s3: {
    endpoint: process.env.S3_ENDPOINT || '',
    bucket: process.env.S3_BUCKET || '',
    accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
  },
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
  },
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || '',
    keySecret: process.env.RAZORPAY_KEY_SECRET || '',
  },
};

export const isCloudinaryConfigured = Boolean(env.cloudinary.cloudName && env.cloudinary.apiKey && env.cloudinary.apiSecret);
export const isSmsIndiaHubConfigured = Boolean(env.smsIndiaHub.username && env.smsIndiaHub.password && env.smsIndiaHub.senderId);

export const isProd = env.nodeEnv === 'production';
export const isTest = env.nodeEnv === 'test';
