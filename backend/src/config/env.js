import 'dotenv/config';

const required = ['MONGODB_URI', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];

for (const key of required) {
  if (!process.env[key]) {
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
