// A persistent, per-browser identifier — not tied to any account, generated
// once and reused for the lifetime of this browser's local storage. Exists
// solely so the backend can rate-limit OTP resends per (role, device) rather
// than per IP, which is too coarse (many legitimate users share an IP behind
// NAT/a mobile carrier) and too loose (one person can trivially get a fresh
// IP). See backend/src/middleware/otpRateLimit.js.
const STORAGE_KEY = 'ncc_device_id';

function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  // Fallback for older browsers/webviews without crypto.randomUUID.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getDeviceId() {
  if (typeof window === 'undefined') return null;
  try {
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = generateId();
      localStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  } catch {
    // Private browsing / storage blocked — fall back to a per-tab id so the
    // request still carries something better than nothing for this one call.
    return generateId();
  }
}
