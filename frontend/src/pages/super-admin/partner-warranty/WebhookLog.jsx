import { Fragment, useState } from 'react';
import { RotateCw } from 'lucide-react';
import AdminShell, { Panel } from '../../../components/super-admin/partner-warranty/AdminShell';
import Pagination from '../../../components/common/Pagination';
import { useApiData } from '../../../hooks/useApiData';
import { adminWarrantyApi } from '../../../lib/adminWarrantyApi';
import { formatDateTime } from '../../../lib/partnerWarrantyFormat';

// Super Admin → Partner Warranty → Webhook Log (docs/partner-warranty Phase 14):
// every CRM delivery with each attempt's result, and a retry.

const STATUS_STYLE = { delivered: 'text-emerald-700', failed: 'text-red-600', pending: 'text-amber-700', skipped: 'text-slate-400' };

export default function WebhookLog() {
  const [filters, setFilters] = useState({ brand: '', status: '' });
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(null);
  const [busy, setBusy] = useState(null);
  const brands = useApiData(() => adminWarrantyApi.brands(), [], { initial: [] });
  const list = useApiData(() => adminWarrantyApi.deliveries({ ...filters, page, limit: 25 }), [JSON.stringify(filters), page], { initial: { data: [], meta: {} } });
  const rows = list.data?.data || [];

  const retry = async (id) => {
    setBusy(id);
    try {
      await adminWarrantyApi.retry(id);
      await list.reload();
    } finally {
      setBusy(null);
    }
  };

  return (
    <AdminShell title="Brand Webhook Log" subtitle="Claim events delivered to partner brands' CRMs">
      <Panel>
        <div className="flex gap-3 mb-4">
          <label className="text-[10px] font-semibold text-[#64748B] flex flex-col gap-1">
            Brand
            <select value={filters.brand} onChange={(e) => { setFilters({ ...filters, brand: e.target.value }); setPage(1); }} className="px-3 py-2 border border-[#E2E8F0] rounded-xl text-xs">
              <option value="">All</option>
              {brands.data.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-[10px] font-semibold text-[#64748B] flex flex-col gap-1">
            Status
            <select value={filters.status} onChange={(e) => { setFilters({ ...filters, status: e.target.value }); setPage(1); }} className="px-3 py-2 border border-[#E2E8F0] rounded-xl text-xs">
              <option value="">All</option>
              {['pending', 'delivered', 'failed', 'skipped'].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
        </div>
        <table className="w-full text-xs">
          <thead className="bg-[#F8FAFC] text-[10px] uppercase text-[#64748B]">
            <tr>
              {['When', 'Brand', 'Event', 'Claim', 'Status', 'Attempts', 'Last error', ''].map((h) => (
                <th key={h} className="px-3 py-2.5 text-left">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F1F5F9]">
            {rows.map((e) => (
              <Fragment key={e.id}>
                <tr className="cursor-pointer hover:bg-[#F8FAFC]" onClick={() => setOpen(open === e.id ? null : e.id)}>
                  <td className="px-3 py-2.5 whitespace-nowrap">{formatDateTime(e.createdAt)}</td>
                  <td className="px-3">{e.brand}</td>
                  <td className="px-3 font-mono">{e.type}</td>
                  <td className="px-3">{e.claimTicket || '—'}</td>
                  <td className={`px-3 font-bold ${STATUS_STYLE[e.status]}`}>{e.status}</td>
                  <td className="px-3">{e.attempts}</td>
                  <td className="px-3 text-[#64748B] max-w-60 truncate">{e.lastError || '—'}</td>
                  <td className="px-3">
                    {['failed', 'skipped'].includes(e.status) && (
                      <button
                        type="button"
                        onClick={(ev) => {
                          ev.stopPropagation();
                          retry(e.id);
                        }}
                        disabled={busy === e.id}
                        className="flex items-center gap-1 text-[#0D47A1] font-semibold disabled:opacity-50"
                      >
                        <RotateCw size={12} className={busy === e.id ? 'animate-spin' : ''} /> Retry
                      </button>
                    )}
                  </td>
                </tr>
                {open === e.id && (
                  <tr>
                    <td colSpan={8} className="px-6 py-2 bg-[#F8FAFC]">
                      {e.deliveries.length === 0 ? (
                        <p className="text-[11px] text-[#94A3B8]">No attempts.</p>
                      ) : (
                        <ul className="text-[11px] space-y-0.5">
                          {e.deliveries.map((a, i) => (
                            <li key={i}>
                              #{i + 1} · {formatDateTime(a.at)} · {a.httpStatus ? `HTTP ${a.httpStatus}` : a.error} · {a.durationMs} ms
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {!list.loading && rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-[#64748B]">
                  No deliveries.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {(list.data?.meta?.total || 0) > 25 && <Pagination currentPage={page} totalItems={list.data.meta.total} itemsPerPage={25} onPageChange={setPage} className="mt-4" />}
      </Panel>
    </AdminShell>
  );
}
