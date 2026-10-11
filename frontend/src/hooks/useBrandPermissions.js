import { useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/apiClient';
import { pageAccess } from '../lib/brandAccess';

const REFRESH_MS = 60 * 1000;

/**
 * The signed-in brand user's permissions (docs/brand-crm Phase 2), as
 * GET /auth/me reports them — the same set the server enforces. `can(...keys)`
 * is true when the user holds any of the keys. Pass `{ poll: true }` from one
 * always-mounted component (the Sidebar) to re-read them every minute and when
 * the tab regains focus, so a role change shows up without signing out.
 */
export function useBrandPermissions({ poll = false } = {}) {
  const { user, updateUser } = useAuth();

  useEffect(() => {
    if (!poll) return undefined;
    let cancelled = false;
    const refresh = () => {
      apiRequest('/auth/me', { auth: true, silentError: true })
        .then((fresh) => {
          if (!cancelled && fresh) updateUser({ permissions: fresh.permissions || [], brandRoles: fresh.brandRoles || [] });
        })
        .catch(() => {});
    };
    refresh();
    const timer = setInterval(refresh, REFRESH_MS);
    window.addEventListener('focus', refresh);
    return () => {
      cancelled = true;
      clearInterval(timer);
      window.removeEventListener('focus', refresh);
    };
  }, [poll, updateUser]);

  const permissions = useMemo(() => new Set(user?.permissions || []), [user?.permissions]);
  const can = useCallback((...keys) => keys.some((k) => permissions.has(k)), [permissions]);
  const canOpen = useCallback((path) => {
    const keys = pageAccess(path);
    return !keys || can(...keys);
  }, [can]);

  return { can, canOpen, permissions, roles: user?.brandRoles || [], loaded: Array.isArray(user?.permissions) };
}
