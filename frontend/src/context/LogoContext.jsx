import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiRequest } from '../lib/apiClient';
import defaultLogo from '../assets/nigam-care.png';

const LogoContext = createContext(null);

export function resolveLogoUrl(rawUrl) {
  if (!rawUrl) return defaultLogo;
  if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://') || rawUrl.startsWith('data:')) {
    return rawUrl;
  }
  const apiBase = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api/v1').replace(/\/+$/, '');
  const rootUrl = apiBase.replace('/api/v1', '');
  return `${rootUrl}${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`;
}

export function LogoProvider({ children }) {
  const [logoUrl, setLogoUrlState] = useState(defaultLogo);
  const [rawLogoUrl, setRawLogoUrl] = useState(null);

  const fetchLogo = useCallback(async () => {
    try {
      const res = await apiRequest('/super-admin/settings/public');
      if (res && res.logoUrl) {
        setRawLogoUrl(res.logoUrl);
        setLogoUrlState(resolveLogoUrl(res.logoUrl));
      } else {
        const cmsRes = await apiRequest('/cms/app-settings/customer');
        if (cmsRes && cmsRes.appLogo) {
          setRawLogoUrl(cmsRes.appLogo);
          setLogoUrlState(resolveLogoUrl(cmsRes.appLogo));
        }
      }
    } catch {
      // Fallback cleanly to default logo if backend is unreachable
    }
  }, []);

  useEffect(() => {
    fetchLogo();
    const handleUpdate = (e) => {
      if (e.detail) {
        setRawLogoUrl(e.detail);
        setLogoUrlState(resolveLogoUrl(e.detail));
      } else {
        fetchLogo();
      }
    };
    window.addEventListener('app:logo-updated', handleUpdate);
    return () => window.removeEventListener('app:logo-updated', handleUpdate);
  }, [fetchLogo]);

  const updateLogo = useCallback((newUrl) => {
    setRawLogoUrl(newUrl);
    setLogoUrlState(resolveLogoUrl(newUrl));
    window.dispatchEvent(new CustomEvent('app:logo-updated', { detail: newUrl }));
  }, []);

  return (
    <LogoContext.Provider value={{ logoUrl, rawLogoUrl, updateLogo, refreshLogo: fetchLogo }}>
      {children}
    </LogoContext.Provider>
  );
}

export function useAppLogo() {
  const ctx = useContext(LogoContext);
  if (!ctx) {
    return {
      logoUrl: defaultLogo,
      rawLogoUrl: null,
      updateLogo: () => {},
      refreshLogo: () => {},
    };
  }
  return ctx;
}
