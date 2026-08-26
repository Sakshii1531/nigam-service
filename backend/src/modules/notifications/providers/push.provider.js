// Firebase Admin SDK — lazy-initialised on first use so the server starts
// cleanly in dev/test without FCM_SERVICE_ACCOUNT_JSON being set.
// We track the JSON string we initialised with; if it changes (e.g. between
// Jest tests that mutate process.env) we re-initialise.
let messagingInstance = null;
let initializedWith = null;

async function getMessaging() {
  const serviceAccountJson = process.env.FCM_SERVICE_ACCOUNT_JSON;
  if (!serviceAccountJson) return null;

  // Re-initialise if the credential changed (handles Jest test isolation)
  if (messagingInstance && initializedWith === serviceAccountJson) {
    return messagingInstance;
  }

  try {
    const adminModule = await import('firebase-admin');
    const admin = adminModule.default || adminModule;
    const apps = admin.apps || admin.getApps?.() || [];
    const certFn = admin.credential?.cert || adminModule.cert;
    const initAppFn = admin.initializeApp || adminModule.initializeApp;
    const getMessagingFn = admin.messaging || adminModule.getMessaging;

    let serviceAccount;
    try {
      serviceAccount = JSON.parse(serviceAccountJson);
    } catch {
      serviceAccount = serviceAccountJson;
    }

    // Reset the app if the credential changed
    if (apps.length && initializedWith !== serviceAccountJson) {
      await Promise.all(apps.map((a) => (a.delete ? a.delete().catch(() => {}) : Promise.resolve())));
    }

    const currentApps = admin.apps || admin.getApps?.() || [];
    if (!currentApps.length) {
      initAppFn({ credential: certFn(serviceAccount) });
    }

    messagingInstance = getMessagingFn();
    initializedWith = serviceAccountJson;
    return messagingInstance;
  } catch (err) {
    console.error('[push] Failed to initialise Firebase Admin:', err.message);
    return null;
  }
}

/**
 * Send a multicast FCM push notification to one or more device tokens.
 *
 * @param {object}   opts
 * @param {string[]} opts.tokens   FCM registration tokens
 * @param {string}   opts.title
 * @param {string}   opts.body
 * @param {object}   [opts.data]   Extra key-value pairs forwarded to the app
 * @param {function} [opts.onStaleTokens] Called with stale token strings for pruning
 * @returns {Promise<void>} — never throws; failures are console.error'd
 */
export async function sendPush({ tokens, title, body, data = {}, onStaleTokens }) {
  if (!tokens?.length) return;
  if (process.env.NOTIFICATION_PUSH_ENABLED === 'false') return;

  const messaging = await getMessaging();
  if (!messaging) return;

  try {
    const response = await messaging.sendEachForMulticast({
      tokens,
      notification: { title, body },
      data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
      android: { priority: 'high' },
      apns: { payload: { aps: { sound: 'default', badge: 1 } } },
    });

    const stale = [];
    response.responses.forEach((r, i) => {
      if (
        !r.success &&
        (r.error?.code === 'messaging/registration-token-not-registered' ||
          r.error?.code === 'messaging/invalid-registration-token')
      ) {
        stale.push(tokens[i]);
      } else if (!r.success) {
        console.warn(`[push] Token ${tokens[i]} failed: ${r.error?.message}`);
      }
    });

    if (stale.length && onStaleTokens) {
      onStaleTokens(stale);
    }
  } catch (err) {
    console.error('[push] FCM sendEachForMulticast error:', err.message);
  }
}
