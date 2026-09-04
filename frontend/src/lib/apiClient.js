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

/**
 * Determine the active portal context based on route pathname.
 * Enables simultaneous multi-role sessions across separate browser tabs.
 */
export function getCurrentPortal(pathname = typeof window !== 'undefined' ? window.location.pathname : '') {
  if (pathname.startsWith('/super-admin')) return 'super_admin';
  if (pathname.startsWith('/brand-admin')) return 'brand_admin';
  if (pathname.startsWith('/technician')) return 'technician';
  return 'customer';
}

export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export function getStoredTokens(portal = getCurrentPortal()) {
  if (typeof window === 'undefined') return { accessToken: null, refreshToken: null };
  const specificAccess = localStorage.getItem(`ncc_access_token_${portal}`);
  const specificRefresh = localStorage.getItem(`ncc_refresh_token_${portal}`);

  if (specificAccess || specificRefresh) {
    return {
      accessToken: specificAccess,
      refreshToken: specificRefresh,
    };
  }

  // Fallback to legacy single key for backwards compatibility
  if (portal === 'customer') {
    return {
      accessToken: localStorage.getItem('ncc_access_token'),
      refreshToken: localStorage.getItem('ncc_refresh_token'),
    };
  }

  return { accessToken: null, refreshToken: null };
}

export function storeTokens({ accessToken, refreshToken }, portal = getCurrentPortal()) {
  if (typeof window === 'undefined') return;
  if (accessToken) localStorage.setItem(`ncc_access_token_${portal}`, accessToken);
  if (refreshToken) localStorage.setItem(`ncc_refresh_token_${portal}`, refreshToken);

  // Maintain legacy keys when working in customer portal
  if (portal === 'customer') {
    if (accessToken) localStorage.setItem('ncc_access_token', accessToken);
    if (refreshToken) localStorage.setItem('ncc_refresh_token', refreshToken);
  }
}

export function clearTokens(portal = getCurrentPortal()) {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(`ncc_access_token_${portal}`);
  localStorage.removeItem(`ncc_refresh_token_${portal}`);

  if (portal === 'customer') {
    localStorage.removeItem('ncc_access_token');
    localStorage.removeItem('ncc_refresh_token');
  }
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
  return envelope ? json : json.data;
}

const refreshInFlightByPortal = {};

async function refreshAccessToken(portal = getCurrentPortal()) {
  const { refreshToken } = getStoredTokens(portal);
  if (!refreshToken) throw new ApiError(401, 'No refresh token available');

  if (!refreshInFlightByPortal[portal]) {
    refreshInFlightByPortal[portal] = rawRequest('/auth/refresh', { method: 'POST', body: { refreshToken } })
      .then((data) => {
        storeTokens(data, portal);
        return data;
      })
      .finally(() => {
        delete refreshInFlightByPortal[portal];
      });
  }
  return refreshInFlightByPortal[portal];
}

/**
 * apiRequest('/catalog/categories') — public GET.
 * apiRequest('/bookings', { method: 'POST', body: {...}, auth: true }) — attaches
 * the stored access token for the active portal and retries once via /auth/refresh on a 401.
 */
export async function apiRequest(
  path, 
  { 
    method = 'GET', 
    body, 
    auth = false, 
    accessToken: explicitToken, 
    portal: explicitPortal, 
    envelope = false, 
    silentError = false 
  } = {}
) {
  if (!auth) {
    try {
      return await rawRequest(path, { method, body, envelope });
    } catch (err) {
      reportError(err, { method, silentError });
      throw err;
    }
  }

  const portal = explicitPortal || getCurrentPortal();
  const accessToken = explicitToken || getStoredTokens(portal).accessToken;

  try {
    return await rawRequest(path, { method, body, accessToken, envelope });
  } catch (err) {
    if (err instanceof ApiError && err.status === 401 && accessToken) {
      try {
        const refreshed = await refreshAccessToken(portal);
        return await rawRequest(path, { method, body, accessToken: refreshed.accessToken, envelope });
      } catch (refreshErr) {
        if (refreshErr instanceof ApiError && refreshErr.status === 401) {
          clearTokens(portal);
          localStorage.removeItem(`ncc_user_${portal}`);
          if (portal === 'customer') {
            localStorage.removeItem('ncc_user');
          }
          window.dispatchEvent(new CustomEvent('auth:unauthorized', { detail: { portal } }));
        }
        reportError(refreshErr, { method, silentError });
        throw refreshErr;
      }
    }
    reportError(err, { method, silentError });
    throw err;
  }
}
