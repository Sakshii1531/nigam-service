import mongoose from 'mongoose';

// Short-lived — TTL index cleans these up automatically. `provider` stays 'stub'
// until a real SMS/email vendor is wired in (see OTP_PROVIDER in .env.example).
const otpSchema = new mongoose.Schema(
  {
    identifier: { type: String, required: true, index: true }, // phone or email
    role: { type: String, required: true },
    codeHash: { type: String, required: true },
    purpose: { type: String, enum: ['login', 'forgot_password', 'signup'], default: 'login' },
    attempts: { type: Number, default: 0 },
    verified: { type: Boolean, default: false },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
  },
  { timestamps: true },
);

export const Otp = mongoose.models.Otp || mongoose.model('Otp', otpSchema);
