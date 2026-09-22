import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/super-admin/Sidebar';
import Topbar from '../../components/super-admin/Topbar';
import { apiRequest } from '../../lib/apiClient';
import { useAuth } from '../../context/AuthContext';
import {
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  ClipboardList,
  MapPin as MapPinIcon,
  UserPlus,
  ArrowRight,
  AlertTriangle,
} from 'lucide-react';

// An ASM's landing page — a quick read of their zone (mirrors the stat cards
// Service Providers already carries) plus jump-off points into the other
// zone-scoped sections, so this doesn't duplicate any of them in full.
const ZoneDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [zoneName, setZoneName] = useState('');
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [me, list] = await Promise.all([
        apiRequest('/super-admin/asms/me', { auth: true }),
        apiRequest('/super-admin/service-providers?limit=200', { auth: true }),
      ]);
      setZoneName(me?.city?.name || 'Unassigned');
      setProviders(Array.isArray(list) ? list : []);
      setError('');
    } catch (err) {
      setError(err.message || 'Could not load your zone.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const counts = {
    total: providers.length,
    pending: providers.filter((p) => p.status === 'Pending').length,
    active: providers.filter((p) => p.status === 'Active').length,
    inactive: providers.filter((p) => p.status === 'Inactive').length,
  };

  const quickLinks = [
    { label: 'Pending Approvals', desc: 'Service providers waiting on verification', icon: Clock, path: '/super-admin/service-providers?status=Pending', color: 'text-amber-600 bg-amber-50' },
    { label: 'Bookings', desc: 'Service requests in your zone', icon: ClipboardList, path: '/super-admin/requests', color: 'text-[#0D47A1] bg-blue-50' },
    { label: 'Live Tracking', desc: 'Jobs currently in progress', icon: MapPinIcon, path: '/super-admin/tracking', color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Job Assignment', desc: 'Assign unassigned requests', icon: UserPlus, path: '/super-admin/assignment', color: 'text-purple-600 bg-purple-50' },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex text-slate-800">
      <Sidebar />
      <div className="flex-1 ml-64 min-h-screen flex flex-col">
        <Topbar title={`${zoneName || 'My'} Zone`} subtitle={`Welcome back, ${user?.name || 'ASM'}`} />

        <div className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-sm p-3 rounded-xl">{error}</div>
          )}

          {/* Attention banner — the landing page a ASM sees first, so a
              pending application shouldn't wait to be discovered by clicking
              into Service Providers. */}
          {!loading && counts.pending > 0 && (
            <button
              onClick={() => navigate('/super-admin/service-providers?status=Pending')}
              className="w-full flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-left hover:bg-amber-100/70 transition-colors"
            >
              <span className="w-9 h-9 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                <AlertTriangle size={18} />
              </span>
              <span className="flex-1">
                <span className="text-sm font-bold text-amber-800">
                  {counts.pending} service provider{counts.pending === 1 ? '' : 's'} need{counts.pending === 1 ? 's' : ''} your review
                </span>
                <span className="block text-xs text-amber-700/80 mt-0.5">
                  New applications in your zone wait here until approved or rejected.
                </span>
              </span>
              <ArrowRight size={16} className="text-amber-600 shrink-0" />
            </button>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total in Zone', value: counts.total, icon: Users, color: 'text-[#0D47A1] bg-blue-50' },
              { label: 'Pending Verification', value: counts.pending, icon: Clock, color: 'text-amber-600 bg-amber-50' },
              { label: 'Active', value: counts.active, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
              { label: 'Inactive', value: counts.inactive, icon: XCircle, color: 'text-slate-500 bg-slate-100' },
            ].map(({ label, value, icon: Icon, color }) => (
              <button
                key={label}
                onClick={() => navigate(`/super-admin/service-providers${label === 'Pending Verification' ? '?status=Pending' : ''}`)}
                className={`bg-white p-4 rounded-2xl border shadow-sm flex items-center justify-between text-left hover:border-[#0D47A1]/40 transition-colors ${
                  label === 'Pending Verification' && value > 0 ? 'border-amber-300 ring-1 ring-amber-200' : 'border-[#E2E8F0]'
                }`}
              >
                <div>
                  <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider">{loading ? '···' : label}</p>
                  <h3 className="text-xl font-black text-[#1E293B] mt-1">{loading ? '—' : value}</h3>
                </div>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
                  <Icon size={18} />
                </div>
              </button>
            ))}
          </div>

          <div>
            <h3 className="text-sm font-bold text-[#1E293B] mb-3">Quick Links</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {quickLinks.map(({ label, desc, icon: Icon, path, color }) => (
                <button
                  key={label}
                  onClick={() => navigate(path)}
                  className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm flex items-center justify-between text-left hover:border-[#0D47A1]/40 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
                      <Icon size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#1E293B]">{label}</p>
                      <p className="text-xs text-[#64748B] mt-0.5">{desc}</p>
                    </div>
                  </div>
                  <ArrowRight size={16} className="text-[#94A3B8] group-hover:translate-x-1 group-hover:text-[#0D47A1] transition-all shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ZoneDashboard;
