import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  apiRequest, 
  getStoredTokens, 
  storeTokens, 
  clearTokens, 
  getCurrentPortal 
} from '../lib/apiClient';
import { syncPushToken, disablePush, enablePush } from '../lib/pushClient';
import { syncOnLogin as syncCartOnLogin, clearLocalOnLogout as clearLocalCart } from '../lib/cartStore';

// Multi-Portal AuthContext:
// Manages distinct session states for customer, super_admin, brand_admin,
// and technician portals. Allows simultaneous logins across 4 browser tabs
// without session collision or cross-portal routing lockouts.

const AuthContext = createContext(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  return ctx || {
    user: null,
    isAuthenticated: false,
    currentPortal: 'customer',
    usersByPortal: {},
    login: async () => {},
    verifyOtp: async () => {},
    resendOtp: async () => {},
    signupCheck: async () => {},
    signupVerify: async () => {},
    logout: async () => {},
    updateUser: () => {},
  };
};

function loadStoredUser(portal) {
  if (typeof window === 'undefined') return null;
  try {
    const specific = localStorage.getItem(`ncc_user_${portal}`);
    if (specific) return JSON.parse(specific);
    // Legacy single key fallback for customer
    if (portal === 'customer') {
      const legacy = localStorage.getItem('ncc_user');
      return legacy ? JSON.parse(legacy) : null;
    }
    return null;
  } catch {
    return null;
  }
}

export const AuthProvider = ({ children }) => {
  const location = useLocation();
  const currentPortal = getCurrentPortal(location.pathname);

  const [usersByPortal, setUsersByPortal] = useState(() => ({
    customer: loadStoredUser('customer'),
    super_admin: loadStoredUser('super_admin'),
    brand_admin: loadStoredUser('brand_admin'),
    technician: loadStoredUser('technician')
  }));

  // Active user matches the portal of the current tab/route
  const activeUser = usersByPortal[currentPortal] || null;

  /** Step 1: password check -> server sends an OTP. Returns the masked destination to display. */
  const login = useCallback(async ({ role, identifier, password }) => {
    const portal = role || getCurrentPortal(location.pathname);
    const data = await apiRequest('/auth/login', { 
      method: 'POST', 
      body: { role, identifier, password },
      portal
    });
    return data;
  }, [location.pathname]);

  /** Step 2: OTP verify -> real tokens + user, session now active for this role. */
  const verifyOtp = useCallback(async ({ role, identifier, code }) => {
    const portal = role || getCurrentPortal(location.pathname);
    const data = await apiRequest('/auth/otp/verify', { 
      method: 'POST', 
      body: { role, identifier, code },
      portal 
    });

    storeTokens(data, portal);
    localStorage.setItem(`ncc_user_${portal}`, JSON.stringify(data.user));
    if (portal === 'customer') {
      localStorage.setItem('ncc_user', JSON.stringify(data.user));
    }

    setUsersByPortal(prev => ({
      ...prev,
      [portal]: data.user
    }));

    if (portal === 'customer') {
      syncCartOnLogin();
    }

    // Trigger push token registration
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
  }, [location.pathname]);

  const resendOtp = useCallback(async ({ role, identifier, purpose }) => {
    const portal = role || getCurrentPortal(location.pathname);
    return apiRequest('/auth/otp/send', { 
      method: 'POST', 
      body: { role, identifier, purpose },
      portal 
    });
  }, [location.pathname]);

  const signupCheck = useCallback(async (payload) => {
    return apiRequest('/auth/signup/check', {
      method: 'POST',
      body: payload,
      portal: 'customer'
    });
  }, []);

  const signupVerify = useCallback(async (payload) => {
    const portal = 'customer';
    const data = await apiRequest('/auth/signup/verify', {
      method: 'POST',
      body: payload,
      portal
    });

    storeTokens(data, portal);
    localStorage.setItem(`ncc_user_${portal}`, JSON.stringify(data.user));
    localStorage.setItem('ncc_user', JSON.stringify(data.user));

    setUsersByPortal(prev => ({
      ...prev,
      [portal]: data.user
    }));

    syncCartOnLogin();

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

  // Handle unauthorized session expiry event for a specific portal
  useEffect(() => {
    const handleUnauthorized = (e) => {
      const unauthorizedPortal = e?.detail?.portal || currentPortal;
      clearTokens(unauthorizedPortal);
      localStorage.removeItem(`ncc_user_${unauthorizedPortal}`);
      if (unauthorizedPortal === 'customer') {
        localStorage.removeItem('ncc_user');
      }
      setUsersByPortal(prev => ({
        ...prev,
        [unauthorizedPortal]: null
      }));
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, [currentPortal]);

  // Validate current portal session against backend on mount/route change
  useEffect(() => {
    const { accessToken } = getStoredTokens(currentPortal);
    if (accessToken) {
      apiRequest('/auth/me', { auth: true, portal: currentPortal, silentError: true })
        .then((freshUser) => {
          if (freshUser) {
            localStorage.setItem(`ncc_user_${currentPortal}`, JSON.stringify(freshUser));
            if (currentPortal === 'customer') {
              localStorage.setItem('ncc_user', JSON.stringify(freshUser));
            }
            setUsersByPortal(prev => ({
              ...prev,
              [currentPortal]: freshUser
            }));
            syncPushToken();
          }
        })
        .catch((err) => {
          if (err?.status === 401) {
            clearTokens(currentPortal);
            localStorage.removeItem(`ncc_user_${currentPortal}`);
            if (currentPortal === 'customer') {
              localStorage.removeItem('ncc_user');
            }
            setUsersByPortal(prev => ({
              ...prev,
              [currentPortal]: null
            }));
          }
        });
    }
  }, [currentPortal]);

  const logout = useCallback(async (explicitPortal) => {
    const portal = explicitPortal || getCurrentPortal(location.pathname);
    const { refreshToken, accessToken } = getStoredTokens(portal);

    clearTokens(portal);
    localStorage.removeItem(`ncc_user_${portal}`);
    if (portal === 'customer') {
      localStorage.removeItem('ncc_user');
      clearLocalCart();
    }

    setUsersByPortal(prev => ({
      ...prev,
      [portal]: null
    }));

    if (portal === 'customer') {
      await disablePush({ accessToken });
    }

    if (refreshToken) {
      try {
        await apiRequest('/auth/logout', { method: 'POST', body: { refreshToken }, portal });
      } catch {
        // Best-effort server notification
      }
    }
  }, [location.pathname]);

  const updateUser = useCallback((updates, explicitPortal) => {
    const portal = explicitPortal || getCurrentPortal(location.pathname);
    setUsersByPortal(prev => {
      const current = prev[portal];
      if (!current) return prev;
      const updated = { ...current, ...updates };
      localStorage.setItem(`ncc_user_${portal}`, JSON.stringify(updated));
      if (portal === 'customer') {
        localStorage.setItem('ncc_user', JSON.stringify(updated));
      }
      return { ...prev, [portal]: updated };
    });
  }, [location.pathname]);

  const value = { 
    user: activeUser, 
    isAuthenticated: !!activeUser, 
    currentPortal,
    usersByPortal,
    login, 
    verifyOtp, 
    resendOtp, 
    signupCheck, 
    signupVerify, 
    logout, 
    updateUser 
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
