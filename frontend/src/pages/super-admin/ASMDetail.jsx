import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../../components/super-admin/Sidebar';
import Topbar from '../../components/super-admin/Topbar';
import { apiRequest } from '../../lib/apiClient';
import { goBack } from '../../lib/navigation';
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  ShieldCheck,
  Edit,
  Trash2,
  Users,
  History,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';

// Mirrors the labels/descriptions in ASM.jsx's PERMISSION_OPTIONS — kept as a
// separate copy since this page never needs the create/edit checkbox wiring,
// just the display label for whatever keys the ASM already holds.
const PERMISSION_LABELS = {
  'techs:view': 'View Service Providers',
  'techs:manage': 'Manage Service Providers',
};

const LOG_TYPE_STYLES = {
  System: 'bg-blue-50 text-blue-700',
  Support: 'bg-purple-50 text-purple-700',
  User: 'bg-slate-100 text-slate-600',
  Finance: 'bg-emerald-50 text-emerald-700',
  Inventory: 'bg-amber-50 text-amber-700',
};

const LOGS_PER_PAGE = 10;

const ASMDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [asm, setAsm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [logs, setLogs] = useState([]);
  const [logMeta, setLogMeta] = useState({ page: 1, limit: LOGS_PER_PAGE, total: 0, totalPages: 1 });
  const [logPage, setLogPage] = useState(1);
  const [logsLoading, setLogsLoading] = useState(true);
  const [jumpValue, setJumpValue] = useState('');

  const [successMessage] = useState('');

  const loadAsm = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiRequest(`/super-admin/asms/${id}`, { auth: true });
      setAsm(data);
      setError('');
    } catch (err) {
      setError(err.message || 'Could not load this ASM.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadAsm(); }, [loadAsm]);

  // Waits on asm.user (not just asm) since the log filter needs the linked
  // User account's id, not the ASM profile's own id.
  useEffect(() => {
    if (!asm?.user) return;
    let cancelled = false;
    (async () => {
      try {
        setLogsLoading(true);
        const res = await apiRequest(
          `/super-admin/audit-logs?user=${asm.user}&page=${logPage}&limit=${LOGS_PER_PAGE}`,
          { auth: true, envelope: true },
        );
        if (cancelled) return;
        setLogs(Array.isArray(res?.data) ? res.data : []);
        setLogMeta(res?.meta || { page: logPage, limit: LOGS_PER_PAGE, total: 0, totalPages: 1 });
      } catch (err) {
        if (!cancelled) setError(err.message || 'Could not load activity log.');
      } finally {
        if (!cancelled) setLogsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [asm?.user, logPage]);


  const handleDelete = async () => {
    if (!asm) return;
    if (!window.confirm(`Are you sure you want to remove ${asm.name}?`)) return;
    try {
      await apiRequest(`/super-admin/asms/${asm.id}`, { method: 'DELETE', auth: true });
      navigate('/super-admin/asm', { state: { deletedAsm: asm.name } });
    } catch (err) {
      setError(`Could not delete ASM: ${err.message}`);
    }
  };

  const goToPage = (page) => {
    if (page < 1 || page > logMeta.totalPages || page === logPage) return;
    setLogPage(page);
  };

  const handleJump = (e) => {
    e.preventDefault();
    const page = parseInt(jumpValue, 10);
    if (!Number.isNaN(page)) goToPage(page);
    setJumpValue('');
  };

  // Windowed page numbers (current ± 2) with the first/last page always
  // pinned and "…" gaps — a flat 1..N list would be unusable once an ASM
  // has built up dozens of pages of activity.
  const pageNumbers = () => {
    const { totalPages } = logMeta;
    const pages = [];
    const add = (p) => { if (!pages.includes(p)) pages.push(p); };
    add(1);
    for (let p = logPage - 2; p <= logPage + 2; p++) if (p > 1 && p < totalPages) add(p);
    if (totalPages > 1) add(totalPages);
    return pages.sort((a, b) => a - b);
  };

  const formatDate = (iso) => iso
    ? new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—';

  const getInitials = (name) => {
    if (!name) return 'AS';
    return name.split(' ').map((p) => p[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex text-slate-800">
      <Sidebar />
      <div className="flex-1 ml-64 min-h-screen flex flex-col">
        <Topbar title="ASM Details" subtitle="Area Service Manager profile, zone & activity" />

        <div className="p-6 space-y-6 flex-1">
          <button
            onClick={() => goBack(navigate, '/super-admin/asm')}
            className="flex items-center gap-2 text-sm font-semibold text-[#0D47A1] hover:text-blue-800 transition-colors"
          >
            <ArrowLeft size={16} /> Back to ASM Management
          </button>

          {loading ? (
            <div className="text-center py-20 text-slate-400 font-semibold text-sm flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-[#0D47A1] border-t-transparent rounded-full animate-spin" />
              Loading ASM profile...
            </div>
          ) : error && !asm ? (
            <div className="text-center py-20 text-red-600 font-semibold text-sm">{error}</div>
          ) : asm && (
            <>
              {/* Header card */}
              <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
                <div className="bg-linear-to-r from-[#0D47A1] via-[#1565C0] to-[#1E3A8A] p-6 text-white">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 flex items-center justify-center text-white font-extrabold text-2xl uppercase shrink-0">
                        {getInitials(asm.name)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h1 className="text-2xl font-bold text-white tracking-tight">{asm.name}</h1>
                          <span className="bg-yellow-400 text-[#0D47A1] text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider">
                            ASM
                          </span>
                        </div>
                        <p className="text-xs text-blue-100 font-medium mt-1">
                          ID: <span className="font-bold text-white">{asm.id}</span> • Area Service Manager
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => navigate(`/super-admin/asm?asm=${asm.id}`)}
                        className="bg-white/15 hover:bg-white/25 text-white px-4 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 border border-white/20"
                      >
                        <Edit size={14} /> Edit ASM
                      </button>
                      <button
                        onClick={handleDelete}
                        className="bg-red-500/90 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  </div>
                </div>
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center gap-6 text-xs text-slate-600 font-medium">
                  <span>📍 Zone: <strong className="text-slate-900">{asm.city?.name || 'Unassigned'}</strong></span>
                  <span>⭐ Rating: <strong className="text-slate-900">{asm.rating ?? 0} / 5.0</strong></span>
                  <span>🛠️ Service Providers: <strong className="text-slate-900">{asm.serviceProviderCount ?? 0}</strong></span>
                </div>
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="space-y-6 lg:col-span-1">
                  <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-sm">
                    <h3 className="text-sm font-bold text-[#1E293B] mb-4">Contact Information</h3>
                    <div className="space-y-3.5 text-sm">
                      <div className="flex items-center gap-3 text-slate-700">
                        <Mail size={16} className="text-[#64748B] shrink-0" />
                        <span className="truncate">{asm.email || '—'}</span>
                      </div>
                      <div className="flex items-center gap-3 text-slate-700">
                        <Phone size={16} className="text-[#64748B] shrink-0" />
                        <span>{asm.phone || '—'}</span>
                      </div>
                      <div className="flex items-center gap-3 text-slate-700">
                        <MapPin size={16} className="text-[#64748B] shrink-0" />
                        <span>{asm.city?.name || 'Unassigned'}, India</span>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-4 pt-3 border-t border-slate-100">
                      Only super-admin can change this ASM's email or phone — use Edit ASM above.
                    </p>
                  </div>

                  <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-sm">
                    <h3 className="text-sm font-bold text-[#1E293B] mb-4">Permissions</h3>
                    {asm.permissions?.length ? (
                      <div className="space-y-2">
                        {asm.permissions.map((key) => (
                          <div key={key} className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
                            <ShieldCheck size={14} /> {PERMISSION_LABELS[key] || key}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">No permissions granted yet — this ASM can't manage anything until edited.</p>
                    )}
                  </div>

                  <button
                    onClick={() => navigate(`/super-admin/service-providers?asm=${asm.id}`)}
                    className="w-full bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-sm text-left hover:border-[#0D47A1]/40 transition-colors flex items-center justify-between"
                  >
                    <div>
                      <h3 className="text-sm font-bold text-[#1E293B]">Service Providers</h3>
                      <p className="text-xs text-slate-400 mt-1">In {asm.city?.name || 'this zone'} — view filtered list</p>
                    </div>
                    <div className="text-right flex items-center gap-2">
                      <span className="text-2xl font-black text-[#0D47A1]">{asm.serviceProviderCount ?? 0}</span>
                      <Users size={20} className="text-[#0D47A1]" />
                    </div>
                  </button>
                </div>

                {/* Activity log */}
                <div className="lg:col-span-2">
                  <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-slate-100 flex items-center gap-2">
                      <History size={16} className="text-[#0D47A1]" />
                      <h3 className="text-sm font-bold text-[#1E293B]">Activity Log</h3>
                      <span className="text-xs text-slate-400 ml-auto">
                        {logMeta.total} change{logMeta.total === 1 ? '' : 's'} recorded
                      </span>
                    </div>

                    {logsLoading ? (
                      <div className="text-center py-12 text-slate-400 text-xs font-semibold flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-[#0D47A1] border-t-transparent rounded-full animate-spin" />
                        Loading activity...
                      </div>
                    ) : logs.length === 0 ? (
                      <div className="text-center py-12">
                        <History size={36} className="mx-auto mb-2 text-slate-300" />
                        <p className="text-sm font-bold text-slate-600">No activity yet</p>
                        <p className="text-xs text-slate-400 mt-1">Changes this ASM makes (approving/suspending providers, etc.) will show up here.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {logs.map((log) => (
                          <div key={log.id} className="px-5 py-3.5 flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <p className="text-sm text-slate-800 font-medium">{log.action}</p>
                              <p className="text-[11px] text-slate-400 mt-0.5">{formatDate(log.createdAt)}</p>
                            </div>
                            <span className={`shrink-0 text-[10px] font-bold px-2 py-1 rounded-full ${LOG_TYPE_STYLES[log.type] || 'bg-slate-100 text-slate-600'}`}>
                              {log.type}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Pagination — prev/next, windowed page numbers, and a
                        jump-to-page box for when the log spans many pages. */}
                    {logMeta.totalPages > 1 && (
                      <div className="p-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                        <span className="text-slate-400 font-medium">
                          Page {logMeta.page} of {logMeta.totalPages}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => goToPage(logPage - 1)}
                            disabled={logPage === 1}
                            className="p-1.5 border border-[#E2E8F0] rounded-lg hover:bg-[#F8FAFC] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          >
                            <ChevronLeft size={14} />
                          </button>
                          {pageNumbers().map((p, idx, arr) => (
                            <React.Fragment key={p}>
                              {idx > 0 && arr[idx - 1] !== p - 1 && <span className="text-slate-300 px-0.5">…</span>}
                              <button
                                onClick={() => goToPage(p)}
                                className={`min-w-7 px-2 py-1 rounded-lg font-semibold transition-colors ${
                                  logPage === p ? 'bg-[#0D47A1] text-white' : 'border border-[#E2E8F0] hover:bg-[#F8FAFC] text-slate-600'
                                }`}
                              >
                                {p}
                              </button>
                            </React.Fragment>
                          ))}
                          <button
                            onClick={() => goToPage(logPage + 1)}
                            disabled={logPage === logMeta.totalPages}
                            className="p-1.5 border border-[#E2E8F0] rounded-lg hover:bg-[#F8FAFC] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          >
                            <ChevronRight size={14} />
                          </button>
                        </div>
                        <form onSubmit={handleJump} className="flex items-center gap-1.5">
                          <span className="text-slate-400">Jump to</span>
                          <input
                            type="number"
                            min="1"
                            max={logMeta.totalPages}
                            value={jumpValue}
                            onChange={(e) => setJumpValue(e.target.value)}
                            placeholder="#"
                            className="w-14 border border-[#E2E8F0] rounded-lg px-2 py-1 text-center outline-none focus:ring-2 focus:ring-[#0D47A1]"
                          />
                          <button
                            type="submit"
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg font-semibold text-slate-600 transition-colors"
                          >
                            Go
                          </button>
                        </form>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {error && asm && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-rose-600 text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-lg">
          {error}
        </div>
      )}
      {successMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" /> {successMessage}
        </div>
      )}
    </div>
  );
};

export default ASMDetail;
