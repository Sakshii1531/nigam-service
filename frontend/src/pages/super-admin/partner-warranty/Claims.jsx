import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Download, AlertTriangle, Flame, UserX, Loader2 } from 'lucide-react';
import AdminShell, { Panel } from '../../../components/super-admin/partner-warranty/AdminShell';
import Pagination from '../../../components/common/Pagination';
import { useApiData } from '../../../hooks/useApiData';
import { useWarrantyClaimLive } from '../../../hooks/useWarrantyClaimLive';
import { adminWarrantyApi, CLAIM_STATUSES } from '../../../lib/adminWarrantyApi';
import { formatDateTime } from '../../../lib/partnerWarrantyFormat';
import { exportCsv } from '../../../lib/exportCsv';

// Super Admin → Partner Warranty → Claims (docs/partner-warranty Phase 14,
// client #3): every brand's claims with the client's columns and filters.
// `?view=attention` pre-filters to what needs NCC: allocation failed, SLA
// breached, escalated.

const PAGE_SIZE = 25;
const VIEWS = [
  { key: 'all', label: 'All claims' },
  { key: 'allocation', label: 'Allocation failed', icon: <UserX size={12} />, filter: { allocationFailed: 'true' } },
  { key: 'breached', label: 'SLA breached', icon: <Flame size={12} />, filter: { slaState: 'breached' } },
  { key: 'escalated', label: 'Escalated', icon: <AlertTriangle size={12} />, filter: { escalated: 'true' } },
];

const SLA_BADGE = { breached: 'bg-red-100 text-red-700', warning: 'bg-amber-100 text-amber-800' };

function useDebounced(value, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

const EMPTY = { brand: '', group: '', category: '', status: '', from: '', to: '', city: '', pincode: '' };

export default function AdminWarrantyClaims() {
  const navigate = useNavigate();
  const [search, setSearch] = useSearchParams();
  const view = search.get('view') || 'all';
  const [filters, setFilters] = useState(EMPTY);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const term = useDebounced(q);
  const city = useDebounced(filters.city);

  const brands = useApiData(() => adminWarrantyApi.brands(), [], { initial: [] });
  const categories = useApiData(() => adminWarrantyApi.categories(), [], { initial: [] });
  // Client #3 "Category": the warranty group the customer picked first.
  const groups = useApiData(() => adminWarrantyApi.groups(), [], { initial: [] });

  const params = {
    ...(VIEWS.find((v) => v.key === view)?.filter || {}),
    brand: filters.brand,
    group: filters.group,
    category: filters.category,
    status: filters.status,
    from: filters.from || undefined,
    to: filters.to ? `${filters.to}T23:59:59` : undefined,
    city: city.trim(),
    pincode: /^\d{6}$/.test(filters.pincode) ? filters.pincode : undefined,
    q: term.trim(),
    sort: '-createdAt',
  };
  const key = JSON.stringify(params);
  const list = useApiData(() => adminWarrantyApi.list({ ...params, page, limit: PAGE_SIZE }), [key, page], { initial: { data: [], meta: {} } });
  const attention = useApiData(
    () => Promise.all(VIEWS.slice(1).map((v) => adminWarrantyApi.list({ ...v.filter, limit: 1 }).then((r) => r.meta?.total || 0))),
    [],
    { initial: [0, 0, 0] },
  );
  useWarrantyClaimLive(() => {
    list.reload();
    attention.reload();
  }, null, 'super_admin');

  const set = (k) => (e) => {
    setFilters((f) => ({ ...f, [k]: e.target.value }));
    setPage(1);
  };
  const setView = (k) => {
    setSearch(k === 'all' ? {} : { view: k });
    setPage(1);
  };

  const rows = list.data?.data || [];
  const meta = list.data?.meta || {};

  const exportAll = async () => {
    setExporting(true);
    try {
      const all = [];
      for (let p = 1; p <= 20; p += 1) {
        const res = await adminWarrantyApi.list({ ...params, page: p, limit: 100 });
        all.push(...res.data);
        if (p >= (res.meta?.totalPages || 1)) break;
      }
      exportCsv(
        `warranty-claims-${new Date().toISOString().slice(0, 10)}.csv`,
        ['Ticket', 'Brand', 'Customer', 'Phone', 'Category', 'Product', 'Issue', 'City', 'Pincode', 'Submitted', 'Status', 'Service Job', 'Assigned Partner', 'SLA', 'Escalated', 'Allocation Failed'],
        all.map((c) => [
          c.humanId, c.brand?.name, c.customer?.name, c.customer?.phone, c.category?.name, c.productName, c.issueName, c.location?.city, c.location?.pincode,
          formatDateTime(c.createdAt), c.status, c.serviceJob?.humanId, c.assignedPartner?.name, c.slaState, c.flags.escalated ? 'Yes' : '', c.flags.allocationFailed ? 'Yes' : '',
        ]),
      );
    } finally {
      setExporting(false);
    }
  };

  return (
    <AdminShell title="Partner Warranty Claims" subtitle="Every brand's warranty claims — routing, decisions and service in one place">
      <div className="flex gap-3 flex-wrap" role="tablist" aria-label="Views">
        {VIEWS.map((v, i) => (
          <button
            key={v.key}
            type="button"
            role="tab"
            aria-selected={view === v.key}
            onClick={() => setView(v.key)}
            className={`px-4 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 ${
              view === v.key ? 'bg-[#0D47A1] text-white border-[#0D47A1]' : 'bg-white text-[#475569] border-[#E2E8F0] hover:bg-[#F8FAFC]'
            }`}
          >
            {v.icon}
            {v.label}
            {i > 0 && (
              <span className={`px-1.5 rounded-full text-[10px] ${attention.data[i - 1] ? 'bg-red-500 text-white' : 'bg-[#F1F5F9] text-[#64748B]'}`}>{attention.data[i - 1]}</span>
            )}
          </button>
        ))}
      </div>

      <Panel>
        <div className="grid grid-cols-2 md:grid-cols-5 2xl:grid-cols-11 gap-3 items-end mb-4 [&_input]:min-w-0 [&_select]:min-w-0">
          <div className="col-span-2 relative">
            <label htmlFor="aw-q" className="text-[10px] font-semibold text-[#64748B]">
              Search
            </label>
            <Search size={14} className="absolute left-3 bottom-2.5 text-[#94A3B8]" aria-hidden="true" />
            <input
              id="aw-q"
              type="search"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Ticket, NCCJ job, serial, customer…"
              className="w-full pl-9 pr-3 py-2 border border-[#E2E8F0] rounded-xl text-xs bg-[#F8FAFC] outline-none focus:ring-2 focus:ring-[#0D47A1]"
            />
          </div>
          {[
            ['brand', 'Brand', brands.data.map((b) => [b.id, b.name])],
            ['group', 'Category', (Array.isArray(groups.data) ? groups.data : []).map((g) => [g.id, g.name])],
            ['category', 'Product', categories.data.map((c) => [c.key, c.name])],
            ['status', 'Status', CLAIM_STATUSES.map((s) => [s, s])],
          ].map(([k, label, options]) => (
            <label key={k} className="text-[10px] font-semibold text-[#64748B] flex flex-col gap-1">
              {label}
              <select value={filters[k]} onChange={set(k)} className="px-2 py-2 border border-[#E2E8F0] rounded-xl text-xs bg-[#F8FAFC]">
                <option value="">All</option>
                {options.map(([value, text]) => (
                  <option key={value} value={value}>
                    {text}
                  </option>
                ))}
              </select>
            </label>
          ))}
          <label className="text-[10px] font-semibold text-[#64748B] flex flex-col gap-1">
            City
            <input value={filters.city} onChange={set('city')} className="px-2 py-2 border border-[#E2E8F0] rounded-xl text-xs bg-[#F8FAFC]" />
          </label>
          <label className="text-[10px] font-semibold text-[#64748B] flex flex-col gap-1">
            Pincode
            <input inputMode="numeric" maxLength={6} value={filters.pincode} onChange={set('pincode')} className="px-2 py-2 border border-[#E2E8F0] rounded-xl text-xs bg-[#F8FAFC]" />
          </label>
          <div className="flex gap-1">
            <label className="text-[10px] font-semibold text-[#64748B] flex flex-col gap-1 flex-1">
              From
              <input type="date" value={filters.from} onChange={set('from')} className="px-1 py-2 border border-[#E2E8F0] rounded-xl text-[11px] bg-[#F8FAFC] w-full" />
            </label>
            <label className="text-[10px] font-semibold text-[#64748B] flex flex-col gap-1 flex-1">
              To
              <input type="date" value={filters.to} onChange={set('to')} className="px-1 py-2 border border-[#E2E8F0] rounded-xl text-[11px] bg-[#F8FAFC] w-full" />
            </label>
          </div>
        </div>

        <div className="flex justify-between items-center mb-3">
          <p className="text-xs text-[#64748B]">
            {meta.total ?? 0} claim{meta.total === 1 ? '' : 's'}
            {JSON.stringify(filters) !== JSON.stringify(EMPTY) && (
              <button type="button" onClick={() => setFilters(EMPTY)} className="ml-2 text-[#0D47A1] font-semibold underline">
                Clear filters
              </button>
            )}
          </p>
          <button type="button" onClick={exportAll} disabled={exporting || !meta.total} className="flex items-center gap-1.5 border border-[#E2E8F0] px-3 py-1.5 rounded-xl text-xs font-semibold text-[#475569] hover:bg-[#F8FAFC] disabled:opacity-50">
            {exporting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />} Export CSV
          </button>
        </div>

        {list.error && (
          <p role="alert" className="text-xs font-semibold text-red-600 mb-3">
            {list.error.message}
          </p>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#F8FAFC] text-[#64748B] text-[10px] uppercase">
              <tr>
                {['Ticket', 'Brand', 'Customer', 'Product · Issue', 'Location', 'Date', 'Status', 'Assigned partner', 'Flags'].map((h) => (
                  <th key={h} className="px-3 py-3 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {list.loading
                ? [1, 2, 3, 4, 5].map((i) => (
                    <tr key={i}>
                      <td colSpan={9} className="px-3 py-3">
                        <div className="h-6 bg-slate-100 rounded-lg animate-pulse" />
                      </td>
                    </tr>
                  ))
                : rows.map((c) => (
                    <tr key={c.id} onClick={() => navigate(`/super-admin/partner-warranty/claims/${c.id}`)} className="hover:bg-[#F8FAFC] cursor-pointer">
                      <td className="px-3 py-3">
                        <a
                          href={`/super-admin/partner-warranty/claims/${c.id}`}
                          onClick={(e) => {
                            e.preventDefault();
                            navigate(`/super-admin/partner-warranty/claims/${c.id}`);
                          }}
                          className="font-bold text-[#0D47A1] hover:underline"
                        >
                          {c.humanId}
                        </a>
                        {c.serviceJob && <p className="text-[10px] text-[#94A3B8] font-mono">{c.serviceJob.humanId}</p>}
                      </td>
                      <td className="px-3 py-3 font-semibold">{c.brand?.name}</td>
                      <td className="px-3 py-3">
                        <p className="font-semibold text-[#1E293B]">{c.customer?.name}</p>
                        <p className="text-[10px] text-[#64748B]">{c.customer?.phone}</p>
                      </td>
                      <td className="px-3 py-3">
                        <p className="font-semibold">{c.productName}</p>
                        <p className="text-[10px] text-[#64748B]">{c.issueName}</p>
                        {c.category && <p className="text-[10px] text-[#94A3B8]">{c.category.name}</p>}
                      </td>
                      <td className="px-3 py-3 text-[#64748B] whitespace-nowrap">
                        {c.location?.city} · {c.location?.pincode}
                      </td>
                      <td className="px-3 py-3 text-[#64748B] whitespace-nowrap">{formatDateTime(c.createdAt)}</td>
                      <td className="px-3 py-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#EEF4FF] text-[#0D47A1] whitespace-nowrap">{c.status}</span>
                      </td>
                      <td className="px-3 py-3">{c.assignedPartner?.name || <span className="text-[#94A3B8]">—</span>}</td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1">
                          {SLA_BADGE[c.slaState] && <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${SLA_BADGE[c.slaState]}`}>SLA {c.slaState}</span>}
                          {c.flags.escalated && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-700">Escalated</span>}
                          {c.flags.allocationFailed && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">No partner</span>}
                          {c.flags.unauthorizedFallback && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">Non-authorized</span>}
                        </div>
                      </td>
                    </tr>
                  ))}
              {!list.loading && rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-[#64748B] font-semibold">
                    No claims match.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {(meta.total || 0) > PAGE_SIZE && <Pagination currentPage={page} totalItems={meta.total} itemsPerPage={PAGE_SIZE} onPageChange={setPage} className="mt-4" />}
      </Panel>
    </AdminShell>
  );
}
