# Push notifications — setup

Everything in the push pipeline is built and tested, but **nothing sends until a
Firebase project is wired up**. Blank config disables push cleanly: the app falls
back to the Socket.IO feed and the REST inbox, so a missing key is not an outage
— which is also why it is easy to miss that push was never working at all.

Two halves, and **they must be the same Firebase project**. A client token minted
against project A and a server key from project B fail with
`messaging/mismatched-credential`, which is the single most common setup mistake
here.

Run `npm run push:doctor` in `backend/` at any point — it tells you which step is
wrong rather than leaving you to infer it from silence.

---

## 1. Create the Firebase project

[console.firebase.google.com](https://console.firebase.google.com) → **Add project**.
Google Analytics is not needed.

## 2. Server key → `backend/.env`

**Project settings → Service accounts → Generate new private key.** Downloads a
JSON file.

That whole file goes into one env var, on **one line**:

```
FCM_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n",...}
```

The `\n` sequences inside `private_key` must stay as the literal two characters
`\` and `n`. Editors that "helpfully" turn them into real newlines break the
value — `push:doctor` detects both that and the reverse mistake.

This file is a credential: it is not `.env.example` material, and it must never
be committed.

## 3. Client config → `frontend/.env`

**Project settings → General → Your apps → Web app** (create one if there is
none). Copy the `firebaseConfig` values:

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

These are public by design — they ship in the client bundle. What actually gates
sending is the VAPID key below plus the project's authorised domains.

## 4. VAPID key → `frontend/.env`

**Project settings → Cloud Messaging → Web Push certificates → Generate key
pair.**

```
VITE_FIREBASE_VAPID_KEY=
```

Without this, `getToken()` never issues a token, so `User.fcmTokens` stays empty
and every send has nowhere to land — with no error anywhere.

## 5. Authorised domains

**Authentication → Settings → Authorised domains** must include wherever the app
is served (`localhost` is there by default). Web push also requires **HTTPS**;
`localhost` is the only exempt origin, so a LAN IP like `192.168.x.x` will not
work for testing on a phone.

---

## Verify

```bash
cd backend
npm run push:doctor                     # config + how many devices are registered
npm run push:doctor -- --to 9876543210  # send a real push to one user
```

The checks run in dependency order and stop at the first real problem: is the key
set, is it JSON, is it a service account (not a web config), is the private key
intact, does Google accept it, who has registered a device.

A full end-to-end check:

1. Start backend and frontend, sign in as a customer.
2. Accept the notification prompt (or Settings → Notifications → Push).
3. `npm run push:doctor` — the customer should now show a device.
4. `npm run push:doctor -- --to <their phone>` — the handset should buzz.
5. Super-admin → Notifications → broadcast to Customers with **Push + In-App**.

Step 5 is the real test: the composer's reach line should show a non-zero count
before you send, and it counts the same way the fan-out does.

---

## When nothing arrives

| Symptom | Cause |
| --- | --- |
| `push:doctor` says no tokens, even after allowing | Client config or VAPID key missing/wrong — the browser granted permission but `getToken()` returned nothing |
| `messaging/mismatched-credential` | Client and server are different Firebase projects |
| `messaging/registration-token-not-registered` | Stale token (reinstall, cleared site data). Pruned automatically on the next send |
| Accepted by FCM, nothing on the handset | Delivered but not displayed: OS notification settings, battery optimisation, or a focused tab (a focused tab is handled in-app by `onForegroundMessage`, not by the OS) |
| Works on Android, silent on iPhone | Expected. iOS Safari only delivers web push to a PWA **added to the Home Screen** — an Apple restriction, not something the code can work around. A native shell is the only way around it |
| Everything looks right, still nothing | Check `NOTIFICATION_PUSH_ENABLED` is not `false`, and that the recipient has not disabled push in their own notification preferences — the fan-out honours both |

## What is deliberately not wired

- **Domain events do not push to a whole role.** `emit()`'s broadcast templates
  (escalation, brand warranty claim) stay in-app on purpose; role-wide device
  push is reserved for the super-admin composer, where a human chose the
  audience. See `src/modules/notifications/README.md`.
- **Bulk WhatsApp.** There is a provider for one-to-one sends but no role-wide
  fan-out, so the composer's WhatsApp option is disabled rather than pretending.
