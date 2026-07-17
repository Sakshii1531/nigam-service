import React, { createContext, useContext, useState, useCallback } from 'react';
import { apiRequest, getStoredTokens, storeTokens, clearTokens } from '../lib/apiClient';

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
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
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
    return data.user;
  }, []);

  const resendOtp = useCallback(async ({ role, identifier }) => {
    return apiRequest('/auth/otp/send', { method: 'POST', body: { role, identifier } });
  }, []);

  const logout = useCallback(async () => {
    const { refreshToken } = getStoredTokens();
    if (refreshToken) {
      try {
        await apiRequest('/auth/logout', { method: 'POST', body: { refreshToken } });
      } catch {
        // Best-effort — still clear local state even if the server call fails
        // (e.g. token already expired), so the user isn't stuck "logged in" locally.
      }
    }
    clearTokens();
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  const value = { user, isAuthenticated: !!user, login, verifyOtp, resendOtp, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
