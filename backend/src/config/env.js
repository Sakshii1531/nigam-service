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
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || '',
    keySecret: process.env.RAZORPAY_KEY_SECRET || '',
  },
};

export const isProd = env.nodeEnv === 'production';
export const isTest = env.nodeEnv === 'test';
