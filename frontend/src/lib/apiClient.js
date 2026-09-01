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

/**
 * Surfaces a failure to the global toast provider (context/ToastContext.jsx),
 * which listens for this event. Deliberately not every error:
 *
 *  - a network failure or a 5xx is always worth showing — something is broken
 *    and the screen has no better information than we do;
 *  - a 4xx on a mutating request is a user action that visibly didn't happen
 *    ("couldn't add to cart"), so it needs saying;
 *  - a 4xx on a GET is usually an optional resource the caller already handles
 *    with a fallback (LogoContext's catch, an empty list), and toasting it
 *    would fire noise on ordinary screens;
 *  - a 401 is the session-expiry path, already handled by refresh + the
 *    `auth:unauthorized` redirect — a toast on top of that is just confusing.
 *
 * Callers that want silence regardless can pass `silentError: true`.
 */
function reportError(err, { method, silentError }) {
  if (silentError || typeof window === 'undefined') return;
  if (!(err instanceof ApiError)) return;
  if (err.status === 401) return;

  const isNetwork = err.status === 0;
  const isServer = err.status >= 500;
  const isFailedMutation = err.status >= 400 && err.status < 500 && method !== 'GET';
  if (!isNetwork && !isServer && !isFailedMutation) return;

  window.dispatchEvent(new CustomEvent('api:error', { detail: { message: err.message, status: err.status } }));
}

async function rawRequest(path, { method = 'GET', body, accessToken, envelope = false } = {}) {
  // A FormData body is sent as-is: the browser must set its own multipart
  // Content-Type (with the boundary), and JSON.stringify would turn the file
  // into "{}". This is what file uploads (invoices, ID proofs) go through.
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
    });
  } catch {
    // fetch rejects (rather than resolving non-ok) when the request never
    // reached the server at all — offline, DNS failure, backend down, CORS.
    // Callers only ever branched on ApiError.status, so a bare TypeError here
    // read as an unexpected crash; status 0 keeps them on the known path and
    // gives the user a sentence that means something.
    throw new ApiError(0, 'Cannot reach the server. Check your connection and try again.');
  }

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
export async function apiRequest(path, { method = 'GET', body, auth = false, accessToken: explicitToken, envelope = false, silentError = false } = {}) {
  if (!auth) {
    try {
      return await rawRequest(path, { method, body, envelope });
    } catch (err) {
      reportError(err, { method, silentError });
      throw err;
    }
  }

  const accessToken = explicitToken || getStoredTokens().accessToken;
  try {
    return await rawRequest(path, { method, body, accessToken, envelope });
  } catch (err) {
    if (err instanceof ApiError && err.status === 401 && accessToken) {
      try {
        const refreshed = await refreshAccessToken();
        return await rawRequest(path, { method, body, accessToken: refreshed.accessToken, envelope });
      } catch (refreshErr) {
        // Only log out if the refresh itself was rejected as unauthorized (401).
        // Network errors, 500s, etc. should not silently kill the session.
        if (refreshErr instanceof ApiError && refreshErr.status === 401) {
          clearTokens();
          localStorage.removeItem('ncc_user');
          window.dispatchEvent(new Event('auth:unauthorized'));
        }
        reportError(refreshErr, { method, silentError });
        throw refreshErr;
      }
    }
    // NOTE: Do NOT trigger logout on 404. A missing resource is not an auth failure.
    // Only a 401 on the original request (that also fails to refresh) should end the session.
    reportError(err, { method, silentError });
    throw err;
  }
}
