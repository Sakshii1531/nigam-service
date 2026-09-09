import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin, Search, LogOut, Users, Clock, CheckCircle2, Star,
  Phone, Mail, X, ShieldCheck, Ban, CheckCircle, XCircle, RotateCcw,
  Wifi, WifiOff, AlertTriangle,
} from 'lucide-react';
import { apiRequest } from '../../lib/apiClient';
import { useAuth } from '../../context/AuthContext';

function shape(item) {
  return {
    id: item.id,
    name: item.name || 'Service Provider',
    phone: item.phone || '—',
    email: item.email || '—',
    city: item.city?.name || '—',
    status: item.status || 'Pending',
    availability: item.availability || 'Offline',
    rating: item.rating ?? 0,
    specs: item.specs || [],
    createdAt: item.createdAt || null,
    aadharFrontUrl: item.verification?.aadharFrontUrl || '',
    aadharBackUrl: item.verification?.aadharBackUrl || '',
  };
}

// createdAt is the one timestamp this app reliably sets on every service
// provider (joinedAt is never actually written anywhere) — good enough for
// "applied/joined X ago" without inventing a field the backend doesn't fill in.
function timeAgo(iso) {
  if (!iso) return '';
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

const STATUS_FILTERS = ['All', 'Pending', 'Active', 'Inactive'];

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [providers, setProviders] = useState([]);
  const [zoneName, setZoneName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selected, setSelected] = useState(null);
  const [confirmSuspend, setConfirmSuspend] = useState(false);
  const [acting, setActing] = useState(false);
  const [toast, setToast] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [me, list] = await Promise.all([
        apiRequest('/super-admin/asms/me', { auth: true }),
        // The backend pins this to the caller's own zone for an ASM — no
        // city filter needed here, unlike the equivalent super-admin page.
        apiRequest('/super-admin/service-providers?limit=200', { auth: true }),
      ]);
      setZoneName(me?.city?.name || 'Unassigned');
      const items = Array.isArray(list) ? list : [];
      // Whoever needs a decision soonest goes first: pending applicants
      // (nothing works until an ASM acts), then newest-first within a status.
      const sorted = items.map(shape).sort((a, b) => {
        if (a.status === 'Pending' && b.status !== 'Pending') return -1;
        if (b.status === 'Pending' && a.status !== 'Pending') return 1;
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      });
      setProviders(sorted);
    } catch (err) {
      setError(err.message || 'Could not load your zone.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleStatusChange = async (id, status) => {
    setActing(true);
    try {
      await apiRequest(`/super-admin/service-providers/${id}/status`, {
        method: 'PATCH', auth: true, body: { status },
      });
      setProviders((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)));
      setSelected((prev) => (prev && prev.id === id ? { ...prev, status } : prev));
      setConfirmSuspend(false);
      showToast(`Status updated to ${status}`);
    } catch (err) {
      showToast(err.message || 'Could not update status');
    } finally {
      setActing(false);
    }
  };

  const counts = useMemo(() => ({
    total: providers.length,
    pending: providers.filter((p) => p.status === 'Pending').length,
    active: providers.filter((p) => p.status === 'Active').length,
    inactive: providers.filter((p) => p.status === 'Inactive').length,
  }), [providers]);

  const filtered = providers.filter((p) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || p.name.toLowerCase().includes(q) || p.phone.includes(q);
    const matchesStatus = statusFilter === 'All' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleLogout = async () => {
    await logout('asm');
    navigate('/asm/login');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800">
      <div className="bg-white border-b border-slate-200/80 px-6 py-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#0D47A1] flex items-center justify-center flex-shrink-0">
            <MapPin size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 leading-tight">{zoneName} Zone</h1>
            <p className="text-xs text-slate-500">Signed in as {user?.name || 'ASM'}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-red-600 transition-colors"
        >
          <LogOut size={15} /> Sign Out
        </button>
      </div>

      <div className="p-6 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 text-sm p-3 rounded-xl">{error}</div>
        )}
        {toast && (
          <div className="fixed top-20 right-6 bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg z-50">
            {toast}
          </div>
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
              onClick={() => setStatusFilter(label === 'Total in Zone' ? 'All' : label === 'Pending Verification' ? 'Pending' : label)}
              className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between text-left hover:border-[#0D47A1]/40 transition-colors"
            >
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
                <h3 className="text-xl font-black text-slate-900 mt-1">{value}</h3>
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
                <Icon size={18} />
              </div>
            </button>
          ))}
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap gap-3 items-center">
          <div className="relative w-72">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name or phone…"
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0D47A1]"
            />
          </div>
          <div className="flex gap-1.5">
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  statusFilter === s ? 'bg-[#0D47A1] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-slate-200/80 text-slate-400 text-[11px] font-black tracking-wider uppercase">
                  <th className="py-3.5 px-6">Provider</th>
                  <th className="py-3.5 px-4">Contact</th>
                  <th className="py-3.5 px-4">Skills</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Rating</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium">
                {loading ? (
                  <tr><td colSpan={6} className="py-10 text-center text-slate-400">Loading…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} className="py-10 text-center text-slate-400">
                    {providers.length === 0 ? 'No service providers in this zone yet.' : 'No providers match this filter.'}
                  </td></tr>
                ) : filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-6">
                      <p className="font-bold text-slate-900">{p.name}</p>
                      <p className="flex items-center gap-1 mt-0.5 text-[10px] text-slate-400">
                        {p.availability === 'Available' ? <Wifi size={11} className="text-emerald-500" /> : <WifiOff size={11} />}
                        {p.availability} · Joined {timeAgo(p.createdAt) || '—'}
                      </p>
                    </td>
                    <td className="py-4 px-4 text-slate-600">
                      <p className="flex items-center gap-1.5"><Phone size={12} /> {p.phone}</p>
                      <p className="flex items-center gap-1.5 mt-0.5"><Mail size={12} /> {p.email}</p>
                    </td>
                    <td className="py-4 px-4 text-slate-600">
                      {p.specs.length > 0 ? p.specs.slice(0, 2).join(', ') + (p.specs.length > 2 ? ` +${p.specs.length - 2}` : '') : '—'}
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${
                        p.status === 'Active' ? 'bg-emerald-50 text-emerald-600'
                          : p.status === 'Pending' ? 'bg-amber-50 text-amber-600'
                          : 'bg-slate-100 text-slate-500'
                      }`}>{p.status}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center gap-1 text-amber-600 font-bold">
                        <Star size={13} className="fill-amber-500 text-amber-500" /> {p.rating}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => setSelected(p)}
                        className="px-3 py-1.5 bg-blue-50 text-[#0D47A1] font-bold rounded-lg text-xs hover:bg-blue-100 transition-colors"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => { setSelected(null); setConfirmSuspend(false); }}>
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">{selected.name}</h2>
              <button onClick={() => { setSelected(null); setConfirmSuspend(false); }} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-2 text-sm text-slate-600 mb-5">
              <p className="flex items-center gap-2"><Phone size={14} /> {selected.phone}</p>
              <p className="flex items-center gap-2"><Mail size={14} /> {selected.email}</p>
              <p className="flex items-center gap-2"><MapPin size={14} /> {selected.city}</p>
              {selected.specs.length > 0 && (
                <p className="flex items-center gap-2"><ShieldCheck size={14} /> {selected.specs.join(', ')}</p>
              )}
              <p className="flex items-center gap-2 text-slate-400 text-xs">
                <Clock size={13} /> Applied {timeAgo(selected.createdAt) || 'recently'}
              </p>
            </div>

            {(selected.aadharFrontUrl || selected.aadharBackUrl) ? (
              <div className="mb-5">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Submitted Documents</p>
                <div className="grid grid-cols-2 gap-2">
                  {selected.aadharFrontUrl && (
                    <a href={selected.aadharFrontUrl} target="_blank" rel="noopener noreferrer">
                      <img src={selected.aadharFrontUrl} alt="Aadhar Front" className="w-full h-24 object-cover rounded-lg border border-slate-300 hover:opacity-90" />
                    </a>
                  )}
                  {selected.aadharBackUrl && (
                    <a href={selected.aadharBackUrl} target="_blank" rel="noopener noreferrer">
                      <img src={selected.aadharBackUrl} alt="Aadhar Back" className="w-full h-24 object-cover rounded-lg border border-slate-300 hover:opacity-90" />
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <div className="mb-5 flex items-center gap-2 text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-xl p-3">
                <AlertTriangle size={14} /> No documents submitted yet.
              </div>
            )}

            {confirmSuspend ? (
              <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                <p className="text-sm font-semibold text-red-700 mb-3">
                  Suspend {selected.name}? They'll be taken offline and can no longer receive jobs until reactivated.
                </p>
                <div className="flex gap-2">
                  <button
                    disabled={acting}
                    onClick={() => handleStatusChange(selected.id, 'Inactive')}
                    className="flex-1 bg-red-600 text-white font-bold py-2 rounded-xl text-sm hover:bg-red-700 disabled:opacity-60"
                  >
                    Yes, Suspend
                  </button>
                  <button
                    onClick={() => setConfirmSuspend(false)}
                    className="flex-1 bg-white border border-slate-200 text-slate-600 font-bold py-2 rounded-xl text-sm hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                {selected.status !== 'Active' && (
                  <button
                    disabled={acting}
                    onClick={() => handleStatusChange(selected.id, 'Active')}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 text-white font-bold py-2.5 rounded-xl text-sm hover:bg-emerald-700 disabled:opacity-60"
                  >
                    <CheckCircle size={16} /> {selected.status === 'Pending' ? 'Approve' : 'Reactivate'}
                  </button>
                )}
                {selected.status !== 'Inactive' && (
                  <button
                    disabled={acting}
                    onClick={() => setConfirmSuspend(true)}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-red-50 text-red-600 font-bold py-2.5 rounded-xl text-sm hover:bg-red-100 disabled:opacity-60"
                  >
                    <Ban size={16} /> {selected.status === 'Pending' ? 'Reject' : 'Suspend'}
                  </button>
                )}
                {selected.status === 'Inactive' && (
                  <button
                    disabled={acting}
                    onClick={() => handleStatusChange(selected.id, 'Pending')}
                    className="flex items-center justify-center gap-1.5 bg-slate-100 text-slate-600 font-bold py-2.5 px-4 rounded-xl text-sm hover:bg-slate-200 disabled:opacity-60"
                    title="Send back to Pending for re-review"
                  >
                    <RotateCcw size={16} />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
