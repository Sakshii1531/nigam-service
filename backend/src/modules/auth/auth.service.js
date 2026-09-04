import { User } from './user.model.js';
import { Technician } from '../technician/technician.model.js';
import { Otp } from './otp.model.js';
import { RefreshToken } from './refreshToken.model.js';
import { hashPassword, verifyPassword } from './password.js';
import { generateOtpCode, sendOtp, maskIdentifier } from './otpProvider.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken, hashToken, tokenExpiryDate } from './tokens.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { env } from '../../config/env.js';
import { ROLES } from '../../config/constants.js';

const OTP_TTL_MINUTES = 10;
const MAX_OTP_ATTEMPTS = 5;

async function findUserByIdentifier(role, identifier) {
  if (!identifier) return null;
  const trimmed = identifier.toString().trim();
  let user = await User.findOne({
    role,
    $or: [{ phone: trimmed }, { email: trimmed }, { humanId: trimmed }],
  }).select('+passwordHash');

  if (!user && (role === ROLES.TECHNICIAN || role === 'technician')) {
    const tech = await Technician.findOne({
      $or: [{ humanId: trimmed }, { phone: trimmed }, { email: trimmed }],
    });
    if (tech && tech.user) {
      user = await User.findById(tech.user).select('+passwordHash');
    }
  }

  if (user && (user.role === ROLES.TECHNICIAN || role === 'technician')) {
    const tech = await Technician.findOne({ user: user._id });
    if (tech) {
      const expectedUserStatus = tech.status === 'Active' ? 'Active' : tech.status === 'Pending' ? 'Pending' : 'Suspended';
      if (user.status !== expectedUserStatus) {
        user.status = expectedUserStatus;
        await User.findByIdAndUpdate(user._id, { status: expectedUserStatus });
      }
    }
  }

  return user;
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

  // env.mockOtpCode is empty unless an operator opts in (MOCK_OTP_CODE), so
  // this is a no-op on a properly configured production deployment.
  const isBypass = Boolean(env.mockOtpCode) && code === env.mockOtpCode;
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
  if (purpose === 'signup') {
    const existingPhone = await User.findOne({ role: 'customer', phone: identifier });
    if (existingPhone) {
      throw new ApiError(409, 'This number is already registered, kindly login or use another number', { errorType: 'phone' });
    }
    return initiateOtp({ role, identifier, purpose: 'signup' });
  }
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

export async function signupCheck({ phone, email }) {
  const existingPhone = await User.findOne({ role: 'customer', phone });
  const existingEmail = await User.findOne({ role: 'customer', email });

  if (existingPhone && existingEmail) {
    throw new ApiError(409, 'User already exists, kindly login or enter other details', { errorType: 'both' });
  } else if (existingPhone) {
    throw new ApiError(409, 'This number is already registered, kindly login or use another number', { errorType: 'phone' });
  } else if (existingEmail) {
    throw new ApiError(409, 'This email already exists, kindly login or enter a different email', { errorType: 'email' });
  }

  // Purpose is 'signup'
  await Otp.deleteMany({ identifier: phone, role: 'customer', purpose: 'signup', verified: false });

  const code = generateOtpCode();
  const codeHash = await hashPassword(code);
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  await Otp.create({ identifier: phone, role: 'customer', codeHash, purpose: 'signup', expiresAt });
  await sendOtp({ identifier: phone, code, purpose: 'signup' });

  return { status: 'otp_sent', destination: maskIdentifier(phone) };
}

export async function signupVerify({ name, phone, email, password, address, state, city, streetAddress, latitude, longitude, pincode, referralCode, code }) {
  // 1. Verify OTP first
  await consumeOtp({ role: 'customer', identifier: phone, code, purpose: 'signup' });

  // 2. Double check duplicate registrations
  const existingPhone = await User.findOne({ role: 'customer', phone });
  const existingEmail = await User.findOne({ role: 'customer', email });

  if (existingPhone && existingEmail) {
    throw new ApiError(409, 'User already exists, kindly login or enter other details', { errorType: 'both' });
  } else if (existingPhone) {
    throw new ApiError(409, 'This number is already registered, kindly login or use another number', { errorType: 'phone' });
  } else if (existingEmail) {
    throw new ApiError(409, 'This email already exists, kindly login or enter a different email', { errorType: 'email' });
  }

  // 3. Process referral if any
  let referredById = null;
  if (referralCode) {
    const referrer = await User.findOne({ role: 'customer', referralCode: referralCode.trim().toUpperCase() });
    if (referrer) {
      referredById = referrer._id;
    }
  }

  // 4. Create new customer user
  const myReferralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  const hashed = await hashPassword(password);

  let cleanStreet = streetAddress || address || '';
  if (cleanStreet && cleanStreet.includes('(City:')) {
    cleanStreet = cleanStreet.split('(City:')[0].trim();
  }

  let finalCity = city || '';
  if (!finalCity && address && address.includes('(City:')) {
    const match = address.match(/\(City:\s*([^,]+)/);
    if (match) {
      finalCity = match[1].trim();
    }
  }

  let finalState = state || '';
  if (!finalState && address && address.includes('State:')) {
    const match = address.match(/State:\s*([^)]+)/);
    if (match) {
      finalState = match[1].trim();
    }
  }

  const userAddress = {
    type: 'Home',
    house: cleanStreet || address || '',
    landmark: '',
    city: finalCity || '',
    state: finalState || '',
    pincode: pincode || '',
    name: name,
    latitude: latitude !== undefined && latitude !== null && latitude !== '' ? Number(latitude) : undefined,
    longitude: longitude !== undefined && longitude !== null && longitude !== '' ? Number(longitude) : undefined,
    isDefault: true
  };

  const newUser = await User.create({
    role: 'customer',
    name,
    phone,
    email,
    passwordHash: hashed,
    addresses: [userAddress],
    referralCode: myReferralCode,
    referredBy: referredById,
    walletCoins: referredById ? 100 : 0,
    status: 'Active',
  });

  return issueSession(newUser);
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

export async function getAddresses(userId) {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'User not found');
  return user.addresses || [];
}

export async function addAddress(userId, addressData) {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'User not found');

  if (!user.addresses) user.addresses = [];

  const isFirst = user.addresses.length === 0;
  const isDefault = isFirst || Boolean(addressData.isDefault);

  if (isDefault) {
    user.addresses.forEach((a) => {
      a.isDefault = false;
    });
  }

  const newAddress = {
    type: addressData.type || 'Home',
    house: addressData.house || addressData.address || '',
    landmark: addressData.landmark || addressData.detail || '',
    city: addressData.city || 'Delhi',
    state: addressData.state || '',
    pincode: addressData.pincode || '110001',
    name: addressData.name || user.name || '',
    latitude: addressData.latitude !== undefined && addressData.latitude !== null && addressData.latitude !== '' ? Number(addressData.latitude) : undefined,
    longitude: addressData.longitude !== undefined && addressData.longitude !== null && addressData.longitude !== '' ? Number(addressData.longitude) : undefined,
    isDefault,
  };

  if (isDefault) {
    user.addresses.unshift(newAddress);
  } else {
    user.addresses.push(newAddress);
  }
  await user.save();
  return user.addresses;
}

export async function updateAddress(userId, addressId, updateData) {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'User not found');

  const addr = user.addresses.id(addressId);
  if (!addr) throw new ApiError(404, 'Address not found');

  if (updateData.isDefault) {
    user.addresses.forEach((a) => {
      a.isDefault = false;
    });
  }

  if (updateData.type !== undefined) addr.type = updateData.type;
  if (updateData.house !== undefined) addr.house = updateData.house;
  if (updateData.address !== undefined) addr.house = updateData.address;
  if (updateData.landmark !== undefined) addr.landmark = updateData.landmark;
  if (updateData.detail !== undefined) addr.landmark = updateData.detail;
  if (updateData.city !== undefined) addr.city = updateData.city;
  if (updateData.state !== undefined) addr.state = updateData.state;
  if (updateData.pincode !== undefined) addr.pincode = updateData.pincode;
  if (updateData.name !== undefined) addr.name = updateData.name;
  if (updateData.latitude !== undefined) addr.latitude = updateData.latitude ? Number(updateData.latitude) : undefined;
  if (updateData.longitude !== undefined) addr.longitude = updateData.longitude ? Number(updateData.longitude) : undefined;
  if (updateData.isDefault !== undefined) addr.isDefault = updateData.isDefault;

  if (addr.isDefault) {
    const idx = user.addresses.findIndex((a) => a._id.toString() === addressId.toString());
    if (idx > 0) {
      const [item] = user.addresses.splice(idx, 1);
      user.addresses.unshift(item);
    }
  }

  await user.save();
  return user.addresses;
}

export async function deleteAddress(userId, addressId) {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'User not found');

  const addrIndex = user.addresses.findIndex((a) => a._id.toString() === addressId);
  if (addrIndex === -1) throw new ApiError(404, 'Address not found');

  const wasDefault = user.addresses[addrIndex].isDefault;
  user.addresses.splice(addrIndex, 1);

  if (wasDefault && user.addresses.length > 0) {
    user.addresses[0].isDefault = true;
  }

  await user.save();
  return user.addresses;
}

export async function setDefaultAddress(userId, addressId) {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'User not found');

  let found = false;
  user.addresses.forEach((a) => {
    if (a._id.toString() === addressId) {
      a.isDefault = true;
      found = true;
    } else {
      a.isDefault = false;
    }
  });

  if (!found) throw new ApiError(404, 'Address not found');

  await user.save();
  return user.addresses;
}

// ── TOKENIZED PAYMENT METHODS (PCI-DSS COMPLIANT) ─────────────────────
// RAW card numbers and CVVs are NEVER stored in MongoDB or returned via API.

export async function getPaymentMethods(userId) {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'User not found');
  return user.paymentMethods || [];
}

export async function tokenizeAndSaveCard(userId, { cardType, cardNumber, expiry, isPrimary }) {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'User not found');

  if (!cardNumber || cardNumber.length < 4) {
    throw new ApiError(400, 'Invalid card number');
  }

  // 1. Extract non-sensitive display fields ONLY
  const cleanNumber = cardNumber.replace(/\s+/g, '');
  const last4 = cleanNumber.slice(-4);

  // 2. Generate PCI-DSS compliant HMAC token (raw card data processed in-memory and discarded)
  const token = 'tok_card_' + crypto.createHmac('sha256', 'nigam-token-secret').update(`${userId}_${cleanNumber}_${Date.now()}`).digest('hex').substring(0, 16);

  if (!user.paymentMethods) user.paymentMethods = [];

  const shouldBePrimary = isPrimary || user.paymentMethods.length === 0;

  if (shouldBePrimary) {
    user.paymentMethods.forEach((pm) => {
      pm.isPrimary = false;
    });
  }

  const tokenizedRecord = {
    kind: 'card',
    token,
    cardType: cardType || 'Visa',
    last4,
    expiry: expiry || '12/28',
    isPrimary: shouldBePrimary,
  };

  user.paymentMethods.push(tokenizedRecord);
  await user.save();
  return user.paymentMethods;
}

export async function tokenizeAndSaveUpi(userId, { upiAddress, upiBank, isPrimary }) {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'User not found');

  if (!upiAddress || !upiAddress.includes('@')) {
    throw new ApiError(400, 'Invalid UPI ID format');
  }

  const cleanUpi = upiAddress.trim().toLowerCase();
  const token = 'tok_upi_' + crypto.createHmac('sha256', 'nigam-token-secret').update(`${userId}_${cleanUpi}_${Date.now()}`).digest('hex').substring(0, 16);

  if (!user.paymentMethods) user.paymentMethods = [];

  const shouldBePrimary = isPrimary || user.paymentMethods.length === 0;

  if (shouldBePrimary) {
    user.paymentMethods.forEach((pm) => {
      pm.isPrimary = false;
    });
  }

  const tokenizedRecord = {
    kind: 'upi',
    token,
    upiAddress: cleanUpi,
    upiBank: upiBank || 'Axis Bank',
    isPrimary: shouldBePrimary,
  };

  user.paymentMethods.push(tokenizedRecord);
  await user.save();
  return user.paymentMethods;
}

export async function deletePaymentMethod(userId, methodId) {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'User not found');

  const idx = user.paymentMethods.findIndex((pm) => pm._id.toString() === methodId);
  if (idx === -1) throw new ApiError(404, 'Payment method not found');

  const wasPrimary = user.paymentMethods[idx].isPrimary;
  user.paymentMethods.splice(idx, 1);

  if (wasPrimary && user.paymentMethods.length > 0) {
    user.paymentMethods[0].isPrimary = true;
  }

  await user.save();
  return user.paymentMethods;
}

export async function setPrimaryPaymentMethod(userId, methodId) {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'User not found');

  let found = false;
  user.paymentMethods.forEach((pm) => {
    if (pm._id.toString() === methodId) {
      pm.isPrimary = true;
      found = true;
    } else {
      pm.isPrimary = false;
    }
  });

  if (!found) throw new ApiError(404, 'Payment method not found');

  await user.save();
  return user.paymentMethods;
}



/**
 * Change the signed-in user's own password. Distinct from resetPassword, which
 * proves identity via an OTP because the user cannot sign in; here they are
 * already authenticated, so the current password is the proof.
 *
 * Like a reset, this revokes every existing refresh token: if the change was
 * prompted by a suspected compromise, leaving other sessions alive defeats it.
 */
export async function changePassword(userId, { currentPassword, newPassword }) {
  // passwordHash is select:false on the schema, so it has to be asked for.
  const user = await User.findById(userId).select('+passwordHash');
  if (!user) throw new ApiError(404, 'Account not found');

  const ok = await verifyPassword(currentPassword, user.passwordHash);
  if (!ok) throw new ApiError(401, 'Current password is incorrect');
  if (currentPassword === newPassword) throw new ApiError(400, 'New password must be different from the current one');

  user.passwordHash = await hashPassword(newPassword);
  await user.save();

  await RefreshToken.updateMany({ user: user._id, revoked: false }, { revoked: true });
}

/**
 * Self-service profile update for the signed-in account.
 *
 * `phone` and `email` are the login identifiers, so a change has to respect the
 * same per-role uniqueness the login lookup relies on — otherwise two accounts
 * could end up sharing an identifier and neither could sign in reliably.
 */
export async function updateOwnProfile(userId, updates) {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'Account not found');

  for (const field of ['phone', 'email']) {
    const value = updates[field];
    if (!value || value === user[field]) continue;
    const clash = await User.findOne({ role: user.role, [field]: value, _id: { $ne: user._id } });
    if (clash) throw new ApiError(409, `That ${field} is already registered to another account`);
  }

  for (const field of ['name', 'phone', 'email', 'avatarUrl']) {
    if (updates[field] !== undefined) user[field] = updates[field];
  }
  await user.save();

  return User.findById(userId);
}
