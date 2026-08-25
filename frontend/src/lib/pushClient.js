// Web push (FCM) client.
//
// The backend has held a full push pipeline for a while — User.fcmTokens[],
// POST /notifications/device-token, and a role-wide fan-out — but nothing ever
// produced a token, so every user's token list was empty and every push had
// nowhere to go. This is the half that was missing.
//
// Everything here is best-effort by design: push is an enhancement on top of
// the socket feed and the REST inbox, both of which work without it. A browser
// that cannot do web push, a user who declines the prompt, or a project with no
// Firebase config must all degrade quietly rather than break the app.

import { apiRequest } from './apiClient';

const LAST_TOKEN_KEY = 'ncc_fcm_token';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;

/** Is push even possible here? Config present, and the browser has the APIs. */
export function isPushSupported() {
  return Boolean(
    firebaseConfig.projectId &&
      firebaseConfig.messagingSenderId &&
      vapidKey &&
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'Notification' in window &&
      'PushManager' in window,
  );
}

/** 'granted' | 'denied' | 'default' | 'unsupported' */
export function getPermissionState() {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission;
}

let messagingPromise = null;

/**
 * Lazily load the Firebase SDK and register the service worker.
 *
 * Deliberately a dynamic import: the SDK is a large dependency and most sessions
 * never need it (permission denied, unsupported browser, logged-out visitor).
 * Loading it eagerly would put that weight in the initial bundle for everyone.
 */
async function getMessaging() {
  if (!isPushSupported()) return null;
  if (messagingPromise) return messagingPromise;

  messagingPromise = (async () => {
    try {
      const [{ initializeApp, getApps }, { getMessaging: init, isSupported }] = await Promise.all([
        import('firebase/app'),
        import('firebase/messaging'),
      ]);

      // Covers the cases the feature-detect above cannot: notably iOS Safari,
      // which exposes the APIs but only actually delivers push to a PWA that
      // has been added to the home screen.
      if (!(await isSupported())) return null;

      const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
      return { messaging: init(app), registration: await registerServiceWorker() };
    } catch (err) {
      console.warn('[push] Firebase messaging unavailable:', err?.message);
      return null;
    }
  })();

  return messagingPromise;
}

/** The SW reads its config off this URL — see public/firebase-messaging-sw.js. */
async function registerServiceWorker() {
  const query = new URLSearchParams(
    Object.entries(firebaseConfig).filter(([, v]) => Boolean(v)),
  ).toString();
  return navigator.serviceWorker.register(`/firebase-messaging-sw.js?${query}`, { scope: '/' });
}

/**
 * Ask for notification permission and register the resulting device token.
 *
 * Call this from a user gesture (a "turn on notifications" control), not on
 * page load: an unprompted permission dialog is the fastest way to get
 * permanently denied, and a denial cannot be re-requested from the page.
 *
 * @returns {Promise<{ok: boolean, reason?: string, token?: string}>}
 */
export async function enablePush() {
  if (!isPushSupported()) return { ok: false, reason: 'unsupported' };

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return { ok: false, reason: permission };

    const ctx = await getMessaging();
    if (!ctx) return { ok: false, reason: 'unsupported' };

    const { getToken } = await import('firebase/messaging');
    const token = await getToken(ctx.messaging, {
      vapidKey,
      serviceWorkerRegistration: ctx.registration,
    });
    if (!token) return { ok: false, reason: 'no-token' };

    await apiRequest('/notifications/device-token', { method: 'POST', auth: true, body: { token } });
    localStorage.setItem(LAST_TOKEN_KEY, token);
    return { ok: true, token };
  } catch (err) {
    console.warn('[push] enablePush failed:', err?.message);
    return { ok: false, reason: err?.message || 'error' };
  }
}

/**
 * Re-register the current token if permission was already granted.
 *
 * Runs on login and on app start. FCM rotates tokens (reinstall, cleared site
 * data, long silence), and the backend prunes any it finds stale — so a session
 * that only ever registered once would eventually stop receiving anything.
 * Never prompts: with permission already granted there is no dialog to show.
 */
export async function syncPushToken() {
  if (!isPushSupported() || Notification.permission !== 'granted') return { ok: false, reason: 'not-granted' };

  try {
    const ctx = await getMessaging();
    if (!ctx) return { ok: false, reason: 'unsupported' };

    const { getToken } = await import('firebase/messaging');
    const token = await getToken(ctx.messaging, {
      vapidKey,
      serviceWorkerRegistration: ctx.registration,
    });
    if (!token) return { ok: false, reason: 'no-token' };

    // POST is idempotent server-side (it de-dupes), but skipping the call when
    // nothing changed avoids a request on every single app start.
    if (localStorage.getItem(LAST_TOKEN_KEY) !== token) {
      await apiRequest('/notifications/device-token', { method: 'POST', auth: true, body: { token } });
      localStorage.setItem(LAST_TOKEN_KEY, token);
    }
    return { ok: true, token };
  } catch (err) {
    console.warn('[push] syncPushToken failed:', err?.message);
    return { ok: false, reason: err?.message || 'error' };
  }
}

/**
 * Detach this device on logout.
 *
 * Without this the token stays on the account and the next person to use the
 * device keeps receiving the previous user's notifications — on a shared
 * technician handset that is a real disclosure, not a tidiness issue.
 *
 * Deletes the FCM token itself as well as the server record, so a stale
 * registration cannot linger in the browser.
 */
export async function disablePush({ accessToken } = {}) {
  const token = localStorage.getItem(LAST_TOKEN_KEY);
  localStorage.removeItem(LAST_TOKEN_KEY);
  if (!token) return;

  // Best-effort: logout must never fail because of this. The caller passes its
  // access token explicitly, because logout clears the stored session first
  // (so route guards update instantly) and this call still needs to authenticate.
  try {
    await apiRequest('/notifications/device-token', {
      method: 'DELETE',
      auth: true,
      accessToken,
      body: { token },
    });
  } catch (err) {
    console.warn('[push] token de-registration failed:', err?.message);
  }

  try {
    const ctx = await getMessaging();
    if (ctx) {
      const { deleteToken } = await import('firebase/messaging');
      await deleteToken(ctx.messaging);
    }
  } catch {
    // The local token may already be gone; nothing to recover.
  }
}

/**
 * Foreground messages. FCM does NOT show a system notification while the tab is
 * focused — that is the app's job — so without this a push received in-app is
 * silently dropped.
 *
 * @param {(payload: object) => void} handler
 * @returns {() => void} unsubscribe
 */
export function onForegroundMessage(handler) {
  let unsubscribe = () => {};
  let cancelled = false;

  (async () => {
    const ctx = await getMessaging();
    if (!ctx || cancelled) return;
    const { onMessage } = await import('firebase/messaging');
    unsubscribe = onMessage(ctx.messaging, handler);
  })();

  return () => {
    cancelled = true;
    unsubscribe();
  };
}
