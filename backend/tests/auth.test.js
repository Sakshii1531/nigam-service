import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { registerAllModels } from '../src/config/registerModels.js';
import { ensureIndexes } from '../src/config/db.js';
import { User } from '../src/modules/auth/user.model.js';
import { Otp } from '../src/modules/auth/otp.model.js';
import { RefreshToken } from '../src/modules/auth/refreshToken.model.js';
import { Role } from '../src/modules/auth/role.model.js';
import { Permission } from '../src/modules/auth/permission.model.js';
import { hashPassword } from '../src/modules/auth/password.js';
import { ROLES } from '../src/config/constants.js';
import { testDbUri } from './helpers/testDb.js';
import { readOtpCode } from './helpers/otp.js';

const TEST_DB_URI = testDbUri('auth');

let app;

// The 'stub' OTP provider just console.logs the code — capturing it here avoids
// needing ESM module-mocking gymnastics just to read a value the service already
// hands to console.log in plaintext before hashing it.

async function createUser({ role, phone, email, password, extra = {} }) {
  return User.create({ role, phone, email, name: 'Test User', passwordHash: await hashPassword(password), ...extra });
}

async function loginAndVerify(app_, { role, identifier, password }) {
  await request(app_).post('/api/v1/auth/login').send({ role, identifier, password }).expect(200);
  const code = readOtpCode(identifier);
  const res = await request(app_).post('/api/v1/auth/otp/verify').send({ role, identifier, code }).expect(200);
  return res.body.data;
}

beforeAll(async () => {
  await registerAllModels();
  await mongoose.connect(TEST_DB_URI);
  await ensureIndexes(); // uniqueness (e.g. User's compound phone+role index) must be enforced before these tests rely on it
  app = createApp().listen(0);
});

afterAll(async () => {
  await new Promise((resolve) => app.close(resolve));
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

beforeEach(async () => {
  await Promise.all([
    User.deleteMany({}),
    Otp.deleteMany({}),
    RefreshToken.deleteMany({}),
    Role.deleteMany({}),
    Permission.deleteMany({}),
  ]);
});

describe('login -> OTP verify -> protected route', () => {
  it('issues a working access token after the full flow', async () => {
    await createUser({ role: ROLES.CUSTOMER, phone: '9000000010', password: 'password123' });

    const session = await loginAndVerify(app, { role: ROLES.CUSTOMER, identifier: '9000000010', password: 'password123' });
    expect(session.accessToken).toBeTruthy();
    expect(session.refreshToken).toBeTruthy();
    expect(session.user.passwordHash).toBeUndefined();

    const whoami = await request(app)
      .get('/api/v1/_dev/whoami')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .expect(200);
    expect(whoami.body.data.role).toBe('customer');
  });

  it('rejects a wrong password with 401, without an OTP being sent', async () => {
    await createUser({ role: ROLES.CUSTOMER, phone: '9000000011', password: 'password123' });
    await request(app)
      .post('/api/v1/auth/login')
      .send({ role: ROLES.CUSTOMER, identifier: '9000000011', password: 'wrongpassword' })
      .expect(401);
    expect(await Otp.countDocuments({ identifier: '9000000011' })).toBe(0);
  });

  it('rejects an unknown identifier with 401 (same status as wrong password — no user enumeration)', async () => {
    await request(app)
      .post('/api/v1/auth/login')
      .send({ role: ROLES.CUSTOMER, identifier: '9999999999', password: 'password123' })
      .expect(401);
  });

  it('rejects a malformed body with a consistent 400 validation envelope', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ role: 'not-a-role' }).expect(400);
    expect(res.body.error.message).toBe('Validation failed');
  });
});

describe('OTP verification', () => {
  it('rejects an incorrect code without consuming the real one', async () => {
    await createUser({ role: ROLES.CUSTOMER, phone: '9000000012', password: 'password123' });
    await request(app).post('/api/v1/auth/login').send({ role: ROLES.CUSTOMER, identifier: '9000000012', password: 'password123' });

    await request(app)
      .post('/api/v1/auth/otp/verify')
      .send({ role: ROLES.CUSTOMER, identifier: '9000000012', code: '000000' })
      .expect(400);

    const otp = await Otp.findOne({ identifier: '9000000012' });
    expect(otp.attempts).toBe(1);
    expect(otp.verified).toBe(false);
  });

  it('locks out after too many incorrect attempts', async () => {
    await createUser({ role: ROLES.CUSTOMER, phone: '9000000013', password: 'password123' });
    await request(app).post('/api/v1/auth/login').send({ role: ROLES.CUSTOMER, identifier: '9000000013', password: 'password123' });

    for (let i = 0; i < 5; i += 1) {
      await request(app)
        .post('/api/v1/auth/otp/verify')
        .send({ role: ROLES.CUSTOMER, identifier: '9000000013', code: '000000' });
    }

    const res = await request(app)
      .post('/api/v1/auth/otp/verify')
      .send({ role: ROLES.CUSTOMER, identifier: '9000000013', code: '000000' })
      .expect(429);
    expect(res.body.error.message).toMatch(/Too many incorrect attempts/);
  });
});

describe('RBAC — requireRole', () => {
  it('grants a super_admin access to an admin-only route', async () => {
    await createUser({ role: ROLES.SUPER_ADMIN, email: 'super@test.dev', password: 'password123' });
    const session = await loginAndVerify(app, { role: ROLES.SUPER_ADMIN, identifier: 'super@test.dev', password: 'password123' });

    await request(app)
      .get('/api/v1/_dev/admin-only')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .expect(200);
  });

  it('rejects a customer from an admin-only route with 403', async () => {
    await createUser({ role: ROLES.CUSTOMER, phone: '9000000014', password: 'password123' });
    const session = await loginAndVerify(app, { role: ROLES.CUSTOMER, identifier: '9000000014', password: 'password123' });

    await request(app)
      .get('/api/v1/_dev/admin-only')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .expect(403);
  });

  it('rejects a request with no Authorization header with 401', async () => {
    await request(app).get('/api/v1/_dev/whoami').expect(401);
  });

  it('rejects a malformed/garbage token with 401', async () => {
    await request(app).get('/api/v1/_dev/whoami').set('Authorization', 'Bearer not-a-real-token').expect(401);
  });
});

describe('RBAC — permissions embedded in the access token', () => {
  it('carries the assigned role permissions through to req.user.permissions', async () => {
    const perm = await Permission.create({ key: 'requests:manage', domain: 'requests' });
    const role = await Role.create({ name: 'Support Agent', scope: 'platform', permissions: [perm._id] });
    await createUser({
      role: ROLES.SUPER_ADMIN,
      email: 'perms@test.dev',
      password: 'password123',
      extra: { assignedRoles: [role._id] },
    });

    const session = await loginAndVerify(app, { role: ROLES.SUPER_ADMIN, identifier: 'perms@test.dev', password: 'password123' });
    const whoami = await request(app).get('/api/v1/_dev/whoami').set('Authorization', `Bearer ${session.accessToken}`);
    expect(whoami.body.data.permissions).toContain('requests:manage');
  });
});

describe('refresh token rotation', () => {
  it('issues a new access+refresh token and invalidates the old refresh token', async () => {
    await createUser({ role: ROLES.CUSTOMER, phone: '9000000015', password: 'password123' });
    const session = await loginAndVerify(app, { role: ROLES.CUSTOMER, identifier: '9000000015', password: 'password123' });

    const refreshed = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: session.refreshToken }).expect(200);
    expect(refreshed.body.data.refreshToken).not.toBe(session.refreshToken);

    // Old refresh token was single-use — reusing it must fail even though it hasn't expired.
    await request(app).post('/api/v1/auth/refresh').send({ refreshToken: session.refreshToken }).expect(401);

    // The rotated token works.
    await request(app).post('/api/v1/auth/refresh').send({ refreshToken: refreshed.body.data.refreshToken }).expect(200);
  });

  it('rejects an unknown/garbage refresh token with 401', async () => {
    await request(app).post('/api/v1/auth/refresh').send({ refreshToken: 'not-a-real-token' }).expect(401);
  });
});

describe('logout', () => {
  it('revokes the refresh token so it can no longer be used', async () => {
    await createUser({ role: ROLES.CUSTOMER, phone: '9000000016', password: 'password123' });
    const session = await loginAndVerify(app, { role: ROLES.CUSTOMER, identifier: '9000000016', password: 'password123' });

    await request(app).post('/api/v1/auth/logout').send({ refreshToken: session.refreshToken }).expect(200);
    await request(app).post('/api/v1/auth/refresh').send({ refreshToken: session.refreshToken }).expect(401);
  });
});

describe('forgot / reset password', () => {
  it('lets a user reset their password via OTP and invalidates old sessions', async () => {
    await createUser({ role: ROLES.CUSTOMER, phone: '9000000017', password: 'oldpassword' });
    const oldSession = await loginAndVerify(app, { role: ROLES.CUSTOMER, identifier: '9000000017', password: 'oldpassword' });

    await request(app).post('/api/v1/auth/forgot-password').send({ role: ROLES.CUSTOMER, identifier: '9000000017' }).expect(200);
    const code = readOtpCode('9000000017');

    await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ role: ROLES.CUSTOMER, identifier: '9000000017', code, newPassword: 'newpassword' })
      .expect(200);

    // Resetting revokes existing refresh tokens.
    await request(app).post('/api/v1/auth/refresh').send({ refreshToken: oldSession.refreshToken }).expect(401);

    // Old password no longer works; new one does.
    await request(app)
      .post('/api/v1/auth/login')
      .send({ role: ROLES.CUSTOMER, identifier: '9000000017', password: 'oldpassword' })
      .expect(401);
    await request(app)
      .post('/api/v1/auth/login')
      .send({ role: ROLES.CUSTOMER, identifier: '9000000017', password: 'newpassword' })
      .expect(200);
  });

  it("doesn't reveal whether an account exists (same response shape either way)", async () => {
    const res = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ role: ROLES.CUSTOMER, identifier: '9999999998' })
      .expect(200);
    expect(res.body.data.destination).toBeTruthy();
    expect(await Otp.countDocuments({ identifier: '9999999998' })).toBe(0); // no account -> no OTP actually created
  });
});

describe('resend OTP', () => {
  it('supersedes the previous pending OTP for the same identifier+purpose', async () => {
    await createUser({ role: ROLES.CUSTOMER, phone: '9000000018', password: 'password123' });
    await request(app).post('/api/v1/auth/login').send({ role: ROLES.CUSTOMER, identifier: '9000000018', password: 'password123' });

    await request(app).post('/api/v1/auth/otp/send').send({ role: ROLES.CUSTOMER, identifier: '9000000018' }).expect(200);
    const freshCode = readOtpCode('9000000018');

    expect(await Otp.countDocuments({ identifier: '9000000018', verified: false })).toBe(1);

    await request(app)
      .post('/api/v1/auth/otp/verify')
      .send({ role: ROLES.CUSTOMER, identifier: '9000000018', code: freshCode })
      .expect(200);
  });
});

describe('customer signup flow', () => {
  const signupPayload = {
    name: 'New Customer',
    phone: '9999999900',
    email: 'newcustomer@example.com',
    password: 'password123',
    confirmPassword: 'password123',
    address: '123, Civil Lines, Delhi',
    referralCode: '',
  };

  it('fails check validation when name contains numbers', async () => {
    await request(app)
      .post('/api/v1/auth/signup/check')
      .send({ ...signupPayload, name: 'New Customer 123' })
      .expect(400);
  });

  it('fails check validation when phone is not 10 digits', async () => {
    await request(app)
      .post('/api/v1/auth/signup/check')
      .send({ ...signupPayload, phone: '999999990' })
      .expect(400);
  });

  it('fails check validation when passwords do not match', async () => {
    await request(app)
      .post('/api/v1/auth/signup/check')
      .send({ ...signupPayload, confirmPassword: 'differentpassword' })
      .expect(400);
  });

  it('detects duplicate phone number', async () => {
    await createUser({ role: ROLES.CUSTOMER, phone: '9999999901', email: 'otheremail@example.com', password: 'password123' });
    const res = await request(app)
      .post('/api/v1/auth/signup/check')
      .send({ ...signupPayload, phone: '9999999901', email: 'unique@example.com' })
      .expect(409);
    expect(res.body.error.details.errorType).toBe('phone');
  });

  it('detects duplicate email address', async () => {
    await createUser({ role: ROLES.CUSTOMER, phone: '9999999902', email: 'duplicate@example.com', password: 'password123' });
    const res = await request(app)
      .post('/api/v1/auth/signup/check')
      .send({ ...signupPayload, phone: '9999999903', email: 'duplicate@example.com' })
      .expect(409);
    expect(res.body.error.details.errorType).toBe('email');
  });

  it('detects duplicate both phone and email', async () => {
    await createUser({ role: ROLES.CUSTOMER, phone: '9999999904', email: 'both@example.com', password: 'password123' });
    const res = await request(app)
      .post('/api/v1/auth/signup/check')
      .send({ ...signupPayload, phone: '9999999904', email: 'both@example.com' })
      .expect(409);
    expect(res.body.error.details.errorType).toBe('both');
  });

  it('passes check and verifies signup with correct OTP, saving default address', async () => {
    await request(app)
      .post('/api/v1/auth/signup/check')
      .send(signupPayload)
      .expect(200);

    const code = readOtpCode(signupPayload.phone);

    // Verify with invalid OTP first
    await request(app)
      .post('/api/v1/auth/signup/verify')
      .send({ ...signupPayload, code: '000000' })
      .expect(400);

    // Verify with correct OTP
    const res = await request(app)
      .post('/api/v1/auth/signup/verify')
      .send({ ...signupPayload, code })
      .expect(200);

    // Verify user object and address schema
    const data = res.body.data;
    expect(data.accessToken).toBeTruthy();
    expect(data.user.name).toBe('New Customer');
    expect(data.user.phone).toBe('9999999900');
    expect(data.user.email).toBe('newcustomer@example.com');
    expect(data.user.addresses.length).toBe(1);
    expect(data.user.addresses[0].house).toBe('123, Civil Lines, Delhi');
    expect(data.user.addresses[0].isDefault).toBe(true);
  });
});

describe('PATCH /auth/password — authenticated self-service change', () => {
  it('changes the password, revokes existing sessions, and lets the new one sign in', async () => {
    const phone = '9500000901';
    await User.create({ role: ROLES.CUSTOMER, phone, name: 'PW User', passwordHash: await hashPassword('password123') });
    const { accessToken: token } = await loginAndVerify(app, { role: ROLES.CUSTOMER, identifier: phone, password: 'password123' });

    await request(app)
      .patch('/api/v1/auth/password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'password123', newPassword: 'newpassword456' })
      .expect(200);

    // Old refresh tokens are revoked — a change is useless if other sessions live on.
    const user = await User.findOne({ phone });
    expect(await RefreshToken.countDocuments({ user: user._id, revoked: false })).toBe(0);

    // The new password works.
    await request(app)
      .post('/api/v1/auth/login')
      .send({ role: ROLES.CUSTOMER, identifier: phone, password: 'newpassword456' })
      .expect(200);
    // The old one does not.
    await request(app)
      .post('/api/v1/auth/login')
      .send({ role: ROLES.CUSTOMER, identifier: phone, password: 'password123' })
      .expect(401);
  });

  it('rejects a wrong current password with 401 and leaves the password unchanged', async () => {
    const phone = '9500000902';
    await User.create({ role: ROLES.CUSTOMER, phone, name: 'PW User 2', passwordHash: await hashPassword('password123') });
    const { accessToken: token } = await loginAndVerify(app, { role: ROLES.CUSTOMER, identifier: phone, password: 'password123' });

    await request(app)
      .patch('/api/v1/auth/password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'notmypassword', newPassword: 'newpassword456' })
      .expect(401);

    await request(app)
      .post('/api/v1/auth/login')
      .send({ role: ROLES.CUSTOMER, identifier: phone, password: 'password123' })
      .expect(200);
  });

  it('rejects a too-short password, an unchanged password, and an unauthenticated call', async () => {
    const phone = '9500000903';
    await User.create({ role: ROLES.CUSTOMER, phone, name: 'PW User 3', passwordHash: await hashPassword('password123') });
    const { accessToken: token } = await loginAndVerify(app, { role: ROLES.CUSTOMER, identifier: phone, password: 'password123' });
    const auth = { Authorization: `Bearer ${token}` };

    await request(app).patch('/api/v1/auth/password').set(auth).send({ currentPassword: 'password123', newPassword: 'short' }).expect(400);
    await request(app).patch('/api/v1/auth/password').set(auth).send({ currentPassword: 'password123', newPassword: 'password123' }).expect(400);
    await request(app).patch('/api/v1/auth/password').send({ currentPassword: 'password123', newPassword: 'newpassword456' }).expect(401);
  });
});

describe('PATCH /auth/me — self-service profile update', () => {
  it('updates the caller\'s own name and email', async () => {
    const phone = '9500000911';
    await User.create({ role: ROLES.CUSTOMER, phone, name: 'Old Name', passwordHash: await hashPassword('password123') });
    const { accessToken: token } = await loginAndVerify(app, { role: ROLES.CUSTOMER, identifier: phone, password: 'password123' });

    const res = await request(app)
      .patch('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'New Name', email: 'new.name@test.com' })
      .expect(200);

    expect(res.body.data.name).toBe('New Name');
    const stored = await User.findOne({ phone });
    expect(stored.name).toBe('New Name');
    expect(stored.email).toBe('new.name@test.com');
  });

  it('refuses a phone already registered to another account in the same role', async () => {
    const mine = '9500000912';
    const theirs = '9500000913';
    await User.create({ role: ROLES.CUSTOMER, phone: mine, name: 'Mine', passwordHash: await hashPassword('password123') });
    await User.create({ role: ROLES.CUSTOMER, phone: theirs, name: 'Theirs', passwordHash: await hashPassword('password123') });
    const { accessToken: token } = await loginAndVerify(app, { role: ROLES.CUSTOMER, identifier: mine, password: 'password123' });

    const res = await request(app)
      .patch('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ phone: theirs })
      .expect(409);
    expect(res.body.error.message).toMatch(/already registered/);

    // The clash must not have partially applied.
    expect((await User.findOne({ name: 'Mine' })).phone).toBe(mine);
  });

  it('allows re-submitting your own unchanged identifier, and rejects a bad email or no auth', async () => {
    const phone = '9500000914';
    await User.create({ role: ROLES.CUSTOMER, phone, name: 'Same', passwordHash: await hashPassword('password123') });
    const { accessToken: token } = await loginAndVerify(app, { role: ROLES.CUSTOMER, identifier: phone, password: 'password123' });
    const auth = { Authorization: `Bearer ${token}` };

    // Sending back the value you already have is not a clash with yourself.
    await request(app).patch('/api/v1/auth/me').set(auth).send({ phone, name: 'Same Two' }).expect(200);
    await request(app).patch('/api/v1/auth/me').set(auth).send({ email: 'not-an-email' }).expect(400);
    await request(app).patch('/api/v1/auth/me').send({ name: 'Nope' }).expect(401);
  });
});
