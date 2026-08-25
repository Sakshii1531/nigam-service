// Firebase Cloud Messaging background handler.
//
// Must live at the origin root (hence public/, not src/) — the browser only
// grants a service worker scope over the path it is served from, and FCM needs
// it to cover the whole app.
//
// A service worker is its own script, outside Vite's module graph: it cannot
// read import.meta.env, and hardcoding the project config here would mean the
// values live in two places and drift. So pushClient.js passes them on the
// registration URL and we read them back off our own location. None of this is
// secret — Firebase web config is public by design; the VAPID key and the
// origin allowlist are what actually gate sending.
const params = new URLSearchParams(self.location.search);
const firebaseConfig = {
  apiKey: params.get('apiKey'),
  authDomain: params.get('authDomain'),
  projectId: params.get('projectId'),
  storageBucket: params.get('storageBucket'),
  messagingSenderId: params.get('messagingSenderId'),
  appId: params.get('appId'),
};

// Pinned to the firebase version in package.json — a compat bundle newer than
// the app's SDK can disagree about the token format and silently stop
// delivering. Bump both together.
const FIREBASE_SDK_VERSION = '12.18.0';

if (firebaseConfig.projectId && firebaseConfig.messagingSenderId) {
  importScripts(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-app-compat.js`);
  importScripts(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-messaging-compat.js`);

  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    // Data-only messages land here and need rendering by hand. Messages that
    // carry a `notification` block are drawn by the browser itself; showing our
    // own on top of that is the classic duplicate-notification bug, so skip it.
    if (payload.notification) return;

    const { title, body, notificationId, broadcastRole } = payload.data || {};
    if (!title) return;

    self.registration.showNotification(title, {
      body: body || '',
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      // Collapses repeats of the same notification instead of stacking them.
      tag: notificationId || undefined,
      data: { notificationId, broadcastRole, url: '/notifications' },
    });
  });
}

// Focus an existing tab rather than opening a second copy of the app.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data?.url || '/notifications';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate?.(target);
          return client.focus();
        }
      }
      return self.clients.openWindow?.(target);
    }),
  );
});
