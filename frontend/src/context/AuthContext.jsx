import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { apiRequest, getStoredTokens, storeTokens, clearTokens } from '../lib/apiClient';
import { syncPushToken, disablePush, enablePush } from '../lib/pushClient';

// Phase 13 — real session state backed by the backend's two-step
// login (password -> OTP -> tokens), scoped to the customer role for this
// pass (see frontend/docs/PHASE13_INTEGRATION.md). `user` is rehydrated from
// localStorage on load so a refresh doesn't bounce a logged-in customer back
// to /login; the access token itself is validated lazily by whatever
// authenticated request happens to run first (401 -> refresh -> retry, see
// apiClient.js), not eagerly on mount.

const AuthContext = createContext(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  return ctx || {
    user: null,
    isAuthenticated: false,
    login: async () => {},
    verifyOtp: async () => {},
    resendOtp: async () => {},
    signupCheck: async () => {},
    signupVerify: async () => {},
    logout: async () => {},
    updateUser: () => {},
  };
};

const USER_KEY = 'ncc_user';

function loadStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(loadStoredUser);

  /** Step 1: password check -> server sends an OTP. Returns the masked destination to display. */
  const login = useCallback(async ({ role, identifier, password }) => {
    const data = await apiRequest('/auth/login', { method: 'POST', body: { role, identifier, password } });
    return data; // { destination }
  }, []);

  /** Step 2: OTP verify -> real tokens + user, session now active. */
  const verifyOtp = useCallback(async ({ role, identifier, code }) => {
    const data = await apiRequest('/auth/otp/verify', { method: 'POST', body: { role, identifier, code } });
    storeTokens(data);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    setUser(data.user);
    
    // Trigger push token registration during the user's verify click
    try {
      if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
        enablePush().catch(() => {});
      } else {
        syncPushToken();
      }
    } catch {
      syncPushToken();
    }
    return data.user;
  }, []);

  const resendOtp = useCallback(async ({ role, identifier, purpose }) => {
    return apiRequest('/auth/otp/send', { method: 'POST', body: { role, identifier, purpose } });
  }, []);

  const signupCheck = useCallback(async ({ name, phone, email, password, confirmPassword, address, referralCode }) => {
    return apiRequest('/auth/signup/check', {
      method: 'POST',
      body: { name, phone, email, password, confirmPassword, address, referralCode }
    });
  }, []);

  const signupVerify = useCallback(async ({ name, phone, email, password, address, referralCode, code }) => {
    const data = await apiRequest('/auth/signup/verify', {
      method: 'POST',
      body: { name, phone, email, password, address, referralCode, code }
    });
    storeTokens(data);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    setUser(data.user);

    // Trigger push token registration during the user's verify click
    try {
      if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
        enablePush().catch(() => {});
      } else {
        syncPushToken();
      }
    } catch {
      syncPushToken();
    }
    return data.user;
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => {
      clearTokens();
      localStorage.removeItem(USER_KEY);
      setUser(null);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  useEffect(() => {
    // Validate stored user session against backend on mount
    const { accessToken } = getStoredTokens();
    if (accessToken) {
      apiRequest('/auth/me', { auth: true })
        .then((freshUser) => {
          if (freshUser) {
            localStorage.setItem(USER_KEY, JSON.stringify(freshUser));
            setUser(freshUser);
            // FCM rotates tokens (reinstall, cleared data, long silence) and the
            // backend prunes stale ones, so a session that registered once would
            // eventually go quiet. Re-check on every start.
            syncPushToken();
          }
        })
        .catch((err) => {
          // Only clear the session when the server explicitly says the token is
          // invalid/expired (401). Network errors, 500s, or backend restarts
          // should NOT log the admin/user out silently.
          if (err?.status === 401) {
            clearTokens();
            localStorage.removeItem(USER_KEY);
            setUser(null);
          }
          // 404 and other errors: keep the session, let subsequent requests handle it
        });
    }
  }, []);

  const logout = useCallback(async () => {
    const { refreshToken, accessToken } = getStoredTokens();

    // Clear local tokens & state synchronously FIRST so UI & route guards update instantly
    clearTokens();
    localStorage.removeItem(USER_KEY);
    setUser(null);

    // Detach this device from the account, using the token captured above since
    // the stored session is already gone. Left attached, the next person to use
    // this device would keep receiving the previous user's notifications — on a
    // shared technician handset that is a disclosure, not untidiness.
    await disablePush({ accessToken });

    if (refreshToken) {
      try {
        await apiRequest('/auth/logout', { method: 'POST', body: { refreshToken } });
      } catch {
        // Best-effort server notification
      }
    }
  }, []);

  const updateUser = useCallback((updates) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...updates };
      localStorage.setItem(USER_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const value = { user, isAuthenticated: !!user, login, verifyOtp, resendOtp, signupCheck, signupVerify, logout, updateUser };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
