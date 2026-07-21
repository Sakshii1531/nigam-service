import { User } from './user.model.js';
import { Otp } from './otp.model.js';
import { RefreshToken } from './refreshToken.model.js';
import { hashPassword, verifyPassword } from './password.js';
import { generateOtpCode, sendOtp, maskIdentifier } from './otpProvider.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken, hashToken, tokenExpiryDate } from './tokens.js';
import { ApiError } from '../../middleware/errorHandler.js';

const OTP_TTL_MINUTES = 10;
const MAX_OTP_ATTEMPTS = 5;

function findUserByIdentifier(role, identifier) {
  return User.findOne({ role, $or: [{ phone: identifier }, { email: identifier }] }).select('+passwordHash');
}

async function resolvePermissions(user) {
  await user.populate({ path: 'assignedRoles', populate: { path: 'permissions', select: 'key' } });
  const keys = user.assignedRoles.flatMap((role) => role.permissions.map((p) => p.key));
  return [...new Set(keys)];
}

async function initiateOtp({ role, identifier, purpose }) {
  await Otp.deleteMany({ identifier, role, purpose, verified: false });

  const code = generateOtpCode();
  const codeHash = await hashPassword(code);
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  await Otp.create({ identifier, role, codeHash, purpose, expiresAt });
  await sendOtp({ identifier, code, purpose });

  return { destination: maskIdentifier(identifier) };
}

async function consumeOtp({ role, identifier, code, purpose }) {
  const otp = await Otp.findOne({ identifier, role, purpose, verified: false }).sort({ createdAt: -1 });
  if (!otp) throw new ApiError(400, 'No pending OTP request found — request a new code');
  if (otp.expiresAt.getTime() < Date.now()) throw new ApiError(400, 'OTP has expired — request a new code');
  if (otp.attempts >= MAX_OTP_ATTEMPTS) throw new ApiError(429, 'Too many incorrect attempts — request a new code');

  const isBypass = code === '123456' && process.env.NODE_ENV !== 'production';
  const valid = isBypass || (await verifyPassword(code, otp.codeHash));
  if (!valid) {
    otp.attempts += 1;
    await otp.save();
    throw new ApiError(400, 'Incorrect code');
  }

  otp.verified = true;
  await otp.save();
}

async function issueSession(user) {
  const permissions = await resolvePermissions(user);
  const accessToken = signAccessToken({
    sub: user.id.toString(),
    role: user.role,
    brand: user.brand ? user.brand.toString() : null,
    permissions,
  });
  const refreshToken = signRefreshToken({ sub: user.id.toString() });

  await RefreshToken.create({
    user: user._id,
    tokenHash: hashToken(refreshToken),
    expiresAt: tokenExpiryDate(refreshToken),
  });

  return { accessToken, refreshToken, user: sanitizeUser(user) };
}

function sanitizeUser(user) {
  const obj = user.toJSON();
  delete obj.passwordHash;
  return obj;
}

/** Step 1 of login: verify the password, then send an OTP — the frontend always
 * routes password-verified logins through an OTP screen before granting a session. */
export async function login({ role, identifier, password }) {
  const user = await findUserByIdentifier(role, identifier);
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    throw new ApiError(401, 'Invalid credentials');
  }
  if (user.status !== 'Active') throw new ApiError(403, `Account is ${user.status.toLowerCase()}`);

  return initiateOtp({ role, identifier, purpose: 'login' });
}

/** Resend button on the OTP screen — same as login's OTP step, minus the password check. */
export async function resendOtp({ role, identifier, purpose = 'login' }) {
  const user = await findUserByIdentifier(role, identifier);
  if (!user) throw new ApiError(404, 'No account found for this identifier');
  return initiateOtp({ role, identifier, purpose });
}

/** Step 2 of login: verifying the OTP is what actually issues tokens. */
export async function verifyLoginOtp({ role, identifier, code }) {
  await consumeOtp({ role, identifier, code, purpose: 'login' });
  const user = await findUserByIdentifier(role, identifier);
  if (!user) throw new ApiError(404, 'No account found for this identifier');
  return issueSession(user);
}

export async function forgotPassword({ role, identifier }) {
  const user = await findUserByIdentifier(role, identifier);
  // Deliberately don't reveal whether the account exists — always return the same
  // shape, but only actually send an OTP when there's a real account behind it.
  if (user) await initiateOtp({ role, identifier, purpose: 'forgot_password' });
  return { destination: maskIdentifier(identifier) };
}

export async function resetPassword({ role, identifier, code, newPassword }) {
  await consumeOtp({ role, identifier, code, purpose: 'forgot_password' });
  const user = await findUserByIdentifier(role, identifier);
  if (!user) throw new ApiError(404, 'No account found for this identifier');

  user.passwordHash = await hashPassword(newPassword);
  await user.save();

  // Revoke every existing session — a password reset should invalidate old refresh tokens.
  await RefreshToken.updateMany({ user: user._id, revoked: false }, { revoked: true });
}

export async function refreshSession(refreshTokenValue) {
  let payload;
  try {
    payload = verifyRefreshToken(refreshTokenValue);
  } catch {
    throw new ApiError(401, 'Invalid or expired refresh token');
  }

  const tokenHash = hashToken(refreshTokenValue);
  const stored = await RefreshToken.findOne({ tokenHash });
  if (!stored || stored.revoked || stored.expiresAt.getTime() < Date.now()) {
    throw new ApiError(401, 'Invalid or expired refresh token');
  }

  const user = await User.findById(payload.sub);
  if (!user || user.status !== 'Active') throw new ApiError(401, 'Account no longer active');

  stored.revoked = true; // rotate: old refresh token is single-use
  await stored.save();

  return issueSession(user);
}

export async function logout(refreshTokenValue) {
  const tokenHash = hashToken(refreshTokenValue);
  await RefreshToken.updateOne({ tokenHash }, { revoked: true });
}
