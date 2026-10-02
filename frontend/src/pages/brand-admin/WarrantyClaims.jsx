import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Inbox, AlertCircle, Wrench, CheckCircle2, Clock, ShieldCheck } from 'lucide-react';
import Sidebar from '../../components/brand-admin/Sidebar';
import Topbar from '../../components/brand-admin/Topbar';
import Pagination from '../../components/common/Pagination';
import { useApiData } from '../../hooks/useApiData';
import { useWarrantyClaimLive } from '../../hooks/useWarrantyClaimLive';
import { brandWarrantyApi, BRAND_TABS, DECIDABLE } from '../../lib/brandWarrantyApi';
import { formatDateTime, dueLabel } from '../../lib/partnerWarrantyFormat';

// The brand's own customer warranty claims (docs/partner-warranty Phase 13).
// Routed here automatically by brand_id; the server never returns another
// brand's claim. Live: a pushed update refreshes the queue.

const PAGE_SIZE = 20;

const STATUS_STYLE = {
  Submitted: 'bg-blue-100 text-blue-700',
  'Brand Review': 'bg-indigo-100 text-indigo-700',
  'Info Requested': 'bg-amber-100 text-amber-800',
  Rejected: 'bg-red-100 text-red-700',
  Closed: 'bg-slate-100 text-slate-600',
  Cancelled: 'bg-slate-100 text-slate-600',
};
const statusClass = (s) => STATUS_STYLE[s] || 'bg-emerald-100 text-emerald-700';

const WARRANTY_STYLE = {
  'In Warranty': 'text-emerald-700',
  'Out of Warranty': 'text-red-600',
  Unknown: 'text-slate-400',
};

function useDebounced(value, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

const BrandWarrantyClaims = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState('new');
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [pincode, setPincode] = useState('');
  const [category, setCategory] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const search = useDebounced(q);
  const pin = useDebounced(pincode);

  const statuses = BRAND_TABS.find((t) => t.key === tab).statuses.join(',');
  const params = {
    status: statuses,
    q: search.trim(),
    pincode: /^\d{6}$/.test(pin) ? pin : undefined,
    category,
    from: from || undefined,
    to: to ? `${to}T23:59:59` : undefined,
    page,
    limit: PAGE_SIZE,
    sort: tab === 'new' || tab === 'review' || tab === 'info' ? 'createdAt' : '-updatedAt',
  };
  const list = useApiData(() => brandWarrantyApi.list(params), [JSON.stringify(params)], { initial: { data: [], meta: {} } });
  const coverage = useApiData(() => brandWarrantyApi.coverage(), [], { initial: null });
  useWarrantyClaimLive(() => list.reload(), null, 'brand_admin');

  const claims = list.data?.data || [];
  const meta = list.data?.meta || {};
  const counts = meta.counts || {};
  const tabCount = (t) => t.statuses.reduce((sum, s) => sum + (counts[s] || 0), 0);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  const kpis = [
    { label: 'New — awaiting you', value: counts.Submitted || 0, icon: <Inbox size={18} />, bg: 'bg-[#0D47A1]' },
    { label: 'In review', value: counts['Brand Review'] || 0, icon: <Clock size={18} />, bg: 'bg-indigo-600' },
    { label: 'Waiting on customer', value: counts['Info Requested'] || 0, icon: <AlertCircle size={18} />, bg: 'bg-amber-500' },
    { label: 'Approved / in service', value: tabCount(BRAND_TABS[3]), icon: <Wrench size={18} />, bg: 'bg-emerald-600' },
    { label: 'Closed', value: (counts.Closed || 0) + (counts.Cancelled || 0), icon: <CheckCircle2 size={18} />, bg: 'bg-slate-600' },
  ];

  const changeTab = (key) => {
    setTab(key);
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-[#F1F5F9] flex relative">
      <Sidebar />
      <div className="flex-1 ml-64 flex flex-col min-w-0">
        <Topbar title="Warranty Claims" subtitle="Customer warranty claims for your products — approve, reject or ask for more information" />

        <div className="p-5 space-y-5">
          <div className="grid grid-cols-5 gap-4">
            {kpis.map((k) => (
              <div key={k.label} className="bg-white rounded-2xl border border-[#E2E8F0] p-4 flex items-center gap-3">
                <div className={`w-10 h-10 ${k.bg} rounded-xl flex items-center justify-center text-white`}>{k.icon}</div>
                <div>
                  <p className="text-xl font-black text-[#1E293B]">{list.loading ? '–' : k.value}</p>
                  <p className="text-[10px] font-semibold text-[#64748B]">{k.label}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4">
            <div role="tablist" aria-label="Claim status" className="flex gap-1 border-b border-[#E2E8F0] mb-4 overflow-x-auto">
              {BRAND_TABS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.key}
                  onClick={() => changeTab(t.key)}
                  className={`px-3 py-2 text-xs font-bold whitespace-nowrap border-b-2 -mb-px ${
                    tab === t.key ? 'border-[#0D47A1] text-[#0D47A1]' : 'border-transparent text-[#64748B] hover:text-[#1E293B]'
                  }`}
                >
                  {t.label}
                  <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${tab === t.key ? 'bg-[#0D47A1] text-white' : 'bg-[#F1F5F9] text-[#64748B]'}`}>
                    {tabCount(t)}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex gap-3 mb-4 flex-wrap items-end">
              <div className="relative flex-1 min-w-60">
                <label htmlFor="bw-search" className="sr-only">
                  Search claims
                </label>
                <Search size={14} className="absolute left-3 top-2.5 text-[#94A3B8]" aria-hidden="true" />
                <input
                  id="bw-search"
                  type="search"
                  placeholder="Ticket, serial, model, product or issue…"
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setPage(1);
                  }}
                  className="w-full pl-9 pr-4 py-2 border border-[#E2E8F0] rounded-xl text-xs outline-none bg-[#F8FAFC] focus:ring-2 focus:ring-[#0D47A1]"
                />
              </div>
              <label className="text-[10px] font-semibold text-[#64748B] flex flex-col gap-1">
                Product
                <select
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    setPage(1);
                  }}
                  className="px-3 py-2 border border-[#E2E8F0] rounded-xl text-xs bg-[#F8FAFC]"
                >
                  <option value="">All products</option>
                  {(coverage.data?.coverage || []).map((c) => (
                    <option key={c.id} value={c.key}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-[10px] font-semibold text-[#64748B] flex flex-col gap-1">
                Pincode
                <input
                  inputMode="numeric"
                  maxLength={6}
                  value={pincode}
                  onChange={(e) => {
                    setPincode(e.target.value.replace(/\D/g, ''));
                    setPage(1);
                  }}
                  placeholder="6 digits"
                  className="w-24 px-3 py-2 border border-[#E2E8F0] rounded-xl text-xs bg-[#F8FAFC]"
                />
              </label>
              <label className="text-[10px] font-semibold text-[#64748B] flex flex-col gap-1">
                From
                <input type="date" value={from} max={to || undefined} onChange={(e) => { setFrom(e.target.value); setPage(1); }} className="px-3 py-2 border border-[#E2E8F0] rounded-xl text-xs bg-[#F8FAFC]" />
              </label>
              <label className="text-[10px] font-semibold text-[#64748B] flex flex-col gap-1">
                To
                <input type="date" value={to} min={from || undefined} onChange={(e) => { setTo(e.target.value); setPage(1); }} className="px-3 py-2 border border-[#E2E8F0] rounded-xl text-xs bg-[#F8FAFC]" />
              </label>
            </div>

            {list.error && (
              <p role="alert" className="text-xs font-semibold text-red-600 mb-3">
                {list.error.message || 'Could not load claims.'}{' '}
                <button type="button" onClick={list.reload} className="underline">
                  Retry
                </button>
              </p>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#F8FAFC] text-[#64748B] text-[10px] uppercase">
                  <tr>
                    <th className="px-3 py-3">Ticket</th>
                    <th className="px-3 py-3">Customer</th>
                    <th className="px-3 py-3">Product · Issue</th>
                    <th className="px-3 py-3">Location</th>
                    <th className="px-3 py-3">Warranty check</th>
                    <th className="px-3 py-3">Submitted</th>
                    <th className="px-3 py-3">Your decision</th>
                    <th className="px-3 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {list.loading
                    ? [1, 2, 3, 4].map((i) => (
                        <tr key={i}>
                          <td colSpan={8} className="px-3 py-3">
                            <div className="h-6 bg-slate-100 rounded-lg animate-pulse" />
                          </td>
                        </tr>
                      ))
                    : claims.map((c) => {
                        const due = DECIDABLE.includes(c.status) ? dueLabel(c.approvalDueAt, now) : null;
                        return (
                          <tr
                            key={c.id}
                            onClick={() => navigate(`/brand-admin/warranty-claims/${c.id}`)}
                            className="hover:bg-[#F8FAFC] transition-colors cursor-pointer"
                          >
                            <td className="px-3 py-3">
                              <a
                                href={`/brand-admin/warranty-claims/${c.id}`}
                                onClick={(e) => {
                                  e.preventDefault();
                                  navigate(`/brand-admin/warranty-claims/${c.id}`);
                                }}
                                className="text-[#0D47A1] font-bold text-[11px] hover:underline"
                              >
                                {c.humanId}
                              </a>
                            </td>
                            <td className="px-3 py-3">
                              <p className="font-semibold text-[#1E293B]">{c.customer?.name || '—'}</p>
                              <p className="text-[10px] text-[#64748B]">{c.customer?.phone}</p>
                            </td>
                            <td className="px-3 py-3">
                              <p className="font-semibold text-[#1E293B]">{c.productName}</p>
                              <p className="text-[10px] text-[#64748B]">{c.issueName}</p>
                            </td>
                            <td className="px-3 py-3 text-[#64748B]">
                              {c.location?.city || '—'} {c.location?.pincode ? `· ${c.location.pincode}` : ''}
                            </td>
                            <td className={`px-3 py-3 font-semibold ${WARRANTY_STYLE[c.warrantyCheck] || WARRANTY_STYLE.Unknown}`}>
                              <span className="inline-flex items-center gap-1">
                                <ShieldCheck size={12} aria-hidden="true" /> {c.warrantyCheck}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-[#64748B]">{formatDateTime(c.createdAt)}</td>
                            <td className="px-3 py-3">
                              {due ? (
                                <span className={`font-bold ${due.late ? 'text-red-600' : due.soon ? 'text-amber-600' : 'text-[#64748B]'}`}>{due.text}</span>
                              ) : (
                                <span className="text-[#94A3B8]">—</span>
                              )}
                            </td>
                            <td className="px-3 py-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusClass(c.status)}`}>{c.status}</span>
                            </td>
                          </tr>
                        );
                      })}
                  {!list.loading && claims.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-[#64748B] font-semibold">
                        No claims here.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {(meta.total || 0) > PAGE_SIZE && (
              <Pagination currentPage={page} totalItems={meta.total} itemsPerPage={PAGE_SIZE} onPageChange={setPage} className="mt-4" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrandWarrantyClaims;
