/**
 * Push diagnostics — `npm run push:doctor`
 *
 * Every layer of the push pipeline fails silently by design: sendPush() catches
 * everything so a Firebase outage can never break a booking, and the client
 * feature-detects itself into a no-op when config is missing. That is correct
 * for production and useless for setup, where "nothing happened" is exactly
 * what a missing key, a wrong project, and a working system all look like.
 *
 * This says which one it is.
 *
 *   npm run push:doctor                     — check configuration and token counts
 *   npm run push:doctor -- --to 9876543210  — also send a real test push to that user
 *
 * See backend/docs/PUSH_SETUP.md for where each value comes from.
 */
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { registerAllModels } from '../src/config/registerModels.js';
import { BROADCAST_ROLE_FILTER } from '../src/config/constants.js';

const PASS = '[32m✓[0m';
const FAIL = '[31m✗[0m';
const WARN = '[33m![0m';

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

/** Config checks that need no database. Returns the parsed service account. */
function checkCredentials() {
  const raw = process.env.FCM_SERVICE_ACCOUNT_JSON;

  if (!raw) {
    console.log(`${FAIL} FCM_SERVICE_ACCOUNT_JSON is not set`);
    console.log('    Without it the server sends nothing, silently. Firebase console ->');
    console.log('    Project settings -> Service accounts -> Generate new private key,');
    console.log('    then paste the whole JSON on one line into backend/.env.');
    return null;
  }

  let account;
  try {
    account = JSON.parse(raw);
  } catch {
    console.log(`${FAIL} FCM_SERVICE_ACCOUNT_JSON is set but is not valid JSON`);
    console.log('    Most often the newlines in private_key were not escaped. It must be');
    console.log('    the whole downloaded file on ONE line, with \\n inside private_key.');
    return null;
  }

  const missing = ['project_id', 'client_email', 'private_key'].filter((k) => !account[k]);
  if (missing.length) {
    console.log(`${FAIL} Service account JSON is missing: ${missing.join(', ')}`);
    console.log('    This looks like the wrong file — a web app config, not a service account key.');
    return null;
  }

  // Checked before handing it to firebase-admin, which does not fail cleanly on
  // a mangled key — it throws from deep inside its own parser with a message
  // that says nothing about what is actually wrong.
  const key = account.private_key;
  if (!key.includes('BEGIN PRIVATE KEY') || !key.includes('END PRIVATE KEY')) {
    console.log(`${FAIL} private_key is not a PEM block`);
    console.log('    It must start with -----BEGIN PRIVATE KEY----- and end with the matching END line.');
    return null;
  }
  if (!key.includes('\n')) {
    console.log(`${FAIL} private_key has no line breaks`);
    console.log('    The \\n escapes were probably stripped when pasting into .env. Keep them literal.');
    return null;
  }

  console.log(`${PASS} Service account parsed — project "${account.project_id}"`);

  if (process.env.NOTIFICATION_PUSH_ENABLED === 'false') {
    console.log(`${WARN} NOTIFICATION_PUSH_ENABLED=false — every send is skipped at the provider`);
  }
  return account;
}

/** Does Firebase actually accept these credentials? */
async function checkFirebaseAuth(account) {
  try {
    const { default: admin } = await import('firebase-admin');
    if (!admin.apps.length) {
      admin.initializeApp({ credential: admin.credential.cert(account) });
    }
    // getAccessToken() is the cheapest call that proves the key is live: it
    // round-trips to Google rather than just validating the JSON shape.
    await admin.credential.cert(account).getAccessToken();
    console.log(`${PASS} Firebase accepted the credentials`);
    return admin;
  } catch (err) {
    console.log(`${FAIL} Firebase would not authenticate: ${err.message}`);
    // Two very different causes reach here, so name both rather than guess.
    console.log('    Either the key is structurally invalid (truncated or re-wrapped on paste),');
    console.log('    or it was revoked/deleted in the console — a dead key still parses fine.');
    console.log('    Regenerate: Project settings -> Service accounts -> Generate new private key.');
    return null;
  }
}

/** Who could actually be reached right now. */
async function reportTokens() {
  const User = mongoose.model('User');
  const rows = await User.aggregate([
    { $match: { fcmTokens: { $exists: true, $ne: [] } } },
    { $group: { _id: '$role', users: { $sum: 1 }, devices: { $sum: { $size: '$fcmTokens' } } } },
    { $sort: { _id: 1 } },
  ]);

  const total = rows.reduce((n, r) => n + r.devices, 0);
  if (!total) {
    console.log(`${WARN} No device tokens are registered yet`);
    console.log('    Expected before anyone has accepted the notification prompt. Sign in,');
    console.log('    allow notifications, then re-run. If it stays empty after allowing,');
    console.log('    the client config (VITE_FIREBASE_* / VAPID key) is the thing to check.');
    return;
  }

  console.log(`${PASS} ${total} device token(s) registered:`);
  for (const r of rows) {
    const audience = Object.keys(BROADCAST_ROLE_FILTER).find((k) => BROADCAST_ROLE_FILTER[k] === r._id);
    console.log(`    ${r._id.padEnd(12)} ${String(r.users).padStart(4)} user(s), ${r.devices} device(s)${audience ? `  [broadcast: ${audience}]` : ''}`);
  }
}

/** Send a real push to one user, and report per-token what FCM said. */
async function sendTestPush(admin, identifier) {
  const User = mongoose.model('User');
  const user = await User.findOne({ $or: [{ phone: identifier }, { email: identifier }] })
    .select('name role phone email fcmTokens')
    .lean();

  if (!user) {
    console.log(`${FAIL} No user with phone or email "${identifier}"`);
    return;
  }
  if (!user.fcmTokens?.length) {
    console.log(`${FAIL} ${user.name || identifier} (${user.role}) has no registered device`);
    console.log('    They need to sign in and accept the notification prompt first.');
    return;
  }

  console.log(`\n→ Sending a test push to ${user.name || identifier} (${user.role}), ${user.fcmTokens.length} device(s)...`);

  const response = await admin.messaging().sendEachForMulticast({
    tokens: user.fcmTokens,
    notification: { title: 'Nigam Care test', body: 'Push is working. This message came from push:doctor.' },
    data: { source: 'push-doctor' },
    android: { priority: 'high' },
    apns: { payload: { aps: { sound: 'default' } } },
  });

  response.responses.forEach((r, i) => {
    const token = `${user.fcmTokens[i].slice(0, 18)}…`;
    if (r.success) {
      console.log(`  ${PASS} ${token} delivered to FCM`);
    } else {
      console.log(`  ${FAIL} ${token} ${r.error?.code || 'failed'}`);
      if (r.error?.code === 'messaging/registration-token-not-registered') {
        console.log('      Stale — the app was reinstalled or site data cleared. It is pruned on the next real send.');
      } else if (r.error?.code === 'messaging/mismatched-credential') {
        console.log('      This token belongs to a DIFFERENT Firebase project than the server key.');
        console.log('      The client VITE_FIREBASE_* values and the service account must be the same project.');
      }
    }
  });

  console.log(`\n${response.successCount} accepted, ${response.failureCount} rejected.`);
  if (response.successCount) {
    console.log('Accepted means FCM took it, not that a device displayed it — check the handset.');
  }
}

async function main() {
  console.log('\nPush configuration\n──────────────────');
  const account = checkCredentials();
  if (!account) {
    console.log('\nFix the above, then re-run. See backend/docs/PUSH_SETUP.md.\n');
    process.exitCode = 1;
    return;
  }

  const admin = await checkFirebaseAuth(account);
  if (!admin) {
    process.exitCode = 1;
    return;
  }

  console.log('\nRegistered devices\n──────────────────');
  await connectDB();
  await registerAllModels();
  await reportTokens();

  const to = arg('to');
  if (to) await sendTestPush(admin, to);
  else console.log('\nAdd --to <phone|email> to send a real test push to one user.');

  console.log('');
}

main()
  .catch((err) => {
    console.error(`\n${FAIL} push:doctor failed:`, err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDB().catch(() => {});
    // firebase-admin keeps handles open; nothing here is worth waiting on.
    process.exit(process.exitCode || 0);
  });
