// Phase 13 — thin fetch wrapper around the real backend, matching its
// { data, error, meta } envelope (backend/src/utils/respond.js,
// backend/src/middleware/errorHandler.js). Deliberately no axios dependency —
// native fetch covers everything this needs.

function getBaseUrl() {
  let url = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api/v1').trim();
  url = url.replace(/\/+$/, '');
  if (!url.endsWith('/api/v1')) {
    url += '/api/v1';
  }
  return url;
}

const BASE_URL = getBaseUrl();

const ACCESS_TOKEN_KEY = 'ncc_access_token';
const REFRESH_TOKEN_KEY = 'ncc_refresh_token';

export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export function getStoredTokens() {
  return {
    accessToken: localStorage.getItem(ACCESS_TOKEN_KEY),
    refreshToken: localStorage.getItem(REFRESH_TOKEN_KEY),
  };
}

export function storeTokens({ accessToken, refreshToken }) {
  if (accessToken) localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

async function rawRequest(path, { method = 'GET', body, accessToken, envelope = false } = {}) {
  // A FormData body is sent as-is: the browser must set its own multipart
  // Content-Type (with the boundary), and JSON.stringify would turn the file
  // into "{}". This is what file uploads (invoices, ID proofs) go through.
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
  });

  let json;
  try {
    json = await res.json();
  } catch {
    throw new ApiError(res.status, 'Malformed response from server');
  }

  if (!res.ok) {
    throw new ApiError(res.status, json?.error?.message || 'Request failed', json?.error?.details);
  }
  // Callers that need pagination meta (an unread COUNT, not the rows) ask for
  // the whole envelope; everything else keeps getting just the payload.
  return envelope ? json : json.data;
}

// One-time refresh, not a queue — good enough for this phase's scoped Auth
// integration (Login + OTP verify). A concurrent-request queue is real extra
// complexity that belongs with the fuller cutover this phase deliberately
// isn't attempting yet (see frontend/docs/PHASE13_INTEGRATION.md).
let refreshInFlight = null;

async function refreshAccessToken() {
  const { refreshToken } = getStoredTokens();
  if (!refreshToken) throw new ApiError(401, 'No refresh token available');

  if (!refreshInFlight) {
    refreshInFlight = rawRequest('/auth/refresh', { method: 'POST', body: { refreshToken } })
      .then((data) => {
        storeTokens(data);
        return data;
      })
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

/**
 * apiRequest('/catalog/categories') — public GET.
 * apiRequest('/bookings', { method: 'POST', body: {...}, auth: true }) — attaches
 * the stored access token and retries once via /auth/refresh on a 401 before
 * giving up (a token that expired mid-session shouldn't force a full re-login).
 *
 * `accessToken` overrides the stored one. Logout needs this: it clears the
 * session synchronously so route guards update instantly, then still has to
 * make one authenticated call (de-registering the push token) with the
 * credentials it just discarded.
 */
export async function apiRequest(path, { method = 'GET', body, auth = false, accessToken: explicitToken, envelope = false } = {}) {
  if (!auth) return rawRequest(path, { method, body, envelope });

  const accessToken = explicitToken || getStoredTokens().accessToken;
  try {
    return await rawRequest(path, { method, body, accessToken, envelope });
  } catch (err) {
    if (err instanceof ApiError && err.status === 401 && accessToken) {
      try {
        const refreshed = await refreshAccessToken();
        return await rawRequest(path, { method, body, accessToken: refreshed.accessToken, envelope });
      } catch (refreshErr) {
        clearTokens();
        localStorage.removeItem('ncc_user');
        window.dispatchEvent(new Event('auth:unauthorized'));
        throw refreshErr;
      }
    }
    if (err instanceof ApiError && (err.status === 401 || err.status === 404)) {
      clearTokens();
      localStorage.removeItem('ncc_user');
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
    throw err;
  }
}
