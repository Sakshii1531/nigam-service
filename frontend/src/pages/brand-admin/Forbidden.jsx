import { Link } from 'react-router-dom';
import { ShieldOff } from 'lucide-react';
import Sidebar from '../../components/brand-admin/Sidebar';
import Topbar from '../../components/brand-admin/Topbar';
import { useBrandPermissions } from '../../hooks/useBrandPermissions';
import { firstAllowedPage } from '../../lib/brandAccess';

// Shown instead of a Brand Panel page the user's roles don't cover
// (docs/brand-crm Phase 2). The server refuses the data anyway; this just says so.
const Forbidden = () => {
  const { can, roles } = useBrandPermissions();
  const home = firstAllowedPage(can);
  const roleNames = roles.map((r) => r.name).join(', ');

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      <Sidebar />
      <div className="flex-1 ml-64 min-h-screen flex flex-col">
        <Topbar title="Access restricted" />
        <div className="flex-1 flex items-center justify-center p-6">
          <div role="alert" className="max-w-md w-full bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-8 text-center space-y-3">
            <div className="w-12 h-12 mx-auto bg-amber-50 text-amber-600 rounded-full flex items-center justify-center">
              <ShieldOff size={22} aria-hidden="true" />
            </div>
            <h1 className="text-base font-bold text-[#1E293B]">You don’t have access to this page</h1>
            <p className="text-xs text-[#64748B]">
              {roleNames ? `Your role${roles.length > 1 ? 's' : ''}: ${roleNames}. ` : 'You have no role yet. '}
              Ask your Brand Super Admin if you need it.
            </p>
            <Link to={home} className="inline-block bg-[#0D47A1] hover:bg-blue-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl">
              Go to my workspace
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Forbidden;
