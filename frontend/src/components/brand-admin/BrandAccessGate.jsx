import { lazy } from 'react';
import { useLocation } from 'react-router-dom';
import { useBrandPermissions } from '../../hooks/useBrandPermissions';

const Forbidden = lazy(() => import('../../pages/brand-admin/Forbidden'));

/**
 * Wraps the app's routes. On a Brand Panel page the signed-in user's roles
 * don't cover, renders the Forbidden page instead (docs/brand-crm Phase 2).
 * Everything else — other portals, brand login, pages open to all — passes through.
 */
const BrandAccessGate = ({ children }) => {
  const { pathname } = useLocation();
  const { canOpen, loaded } = useBrandPermissions();
  if (!pathname.startsWith('/brand-admin') || !loaded || canOpen(pathname)) return children;
  return <Forbidden />;
};

export default BrandAccessGate;
