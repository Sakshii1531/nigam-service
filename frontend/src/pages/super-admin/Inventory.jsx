import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, Boxes, ChevronLeft, ChevronRight, IndianRupee, Loader2, Package, PackageX, Plus, Search } from 'lucide-react';
import Sidebar from '../../components/super-admin/Sidebar';
import Topbar from '../../components/super-admin/Topbar';
import { apiRequest } from '../../lib/apiClient';
import { toolbarControlClass } from '../../components/super-admin/catalogue/ui';
import { StockBadge } from '../../components/super-admin/store/formParts';
import { rupees } from '../../components/super-admin/store/storeFormat';

// Super Admin → Inventory Management (docs/master-catalogue Phase 21): the
// central spare-part catalogue partners bill from. Summary cards for the
// whole catalogue, server-side search and filters, and a row opens the
// part's page (pictures, fits, pricing, stock history).

const PAGE_SIZE = 25;

export default function Inventory() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1, summary: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [appliances, setAppliances] = useState([]);
  const [filters, setFilters] = useState({ search: '', category: '', stock: '', status: '' });
  const [page, setPage] = useState(1);

  useEffect(() => {
    apiRequest('/catalog/categories', { silentError: true })
      .then((list) => setAppliances((list || []).map((c) => ({ key: c.key, name: c.name }))))
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
    Object.entries(filters).forEach(([k, v]) => v && qs.set(k, v.trim()));
    try {
      const res = await apiRequest(`/super-admin/spare-parts?${qs}`, { auth: true, envelope: true });
      setRows(res.data || []);
      setMeta(res.meta || { total: 0, totalPages: 1 });
      setError('');
    } catch (err) {
      setError(err.message || 'Could not load inventory.');
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    const t = setTimeout(load, filters.search ? 250 : 0);
    return () => clearTimeout(t);
  }, [load, filters.search]);

  const setFilter = (key) => (e) => {
    setPage(1);
    setFilters((f) => ({ ...f, [key]: e.target.value }));
  };
  const applianceName = (key) => appliances.find((a) => a.key === key)?.name || key;
  const summary = meta.summary;

  const cards = [
    { label: 'Parts', value: summary?.parts ?? '—', Icon: Package, tone: 'text-[#0D47A1] bg-blue-50' },
    { label: 'Units in stock', value: summary ? summary.units.toLocaleString('en-IN') : '—', Icon: Boxes, tone: 'text-violet-700 bg-violet-50' },
    { label: 'Stock value (cost)', value: summary ? rupees(summary.stockValue) : '—', Icon: IndianRupee, tone: 'text-emerald-700 bg-emerald-50' },
    { label: 'Low stock', value: summary?.lowStock ?? '—', Icon: AlertTriangle, tone: 'text-amber-700 bg-amber-50', filter: 'low' },
    { label: 'Out of stock', value: summary?.outOfStock ?? '—', Icon: PackageX, tone: 'text-rose-700 bg-rose-50', filter: 'out' },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex text-slate-800">
      <Sidebar />
      <div className="flex-1 ml-64 min-h-screen flex flex-col min-w-0">
        <Topbar title="Spare Parts & Inventory" subtitle="Central inventory — the parts partners can bill on a job" />
        <main className="p-6 space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {cards.map(({ label, value, Icon, tone, filter }) => (
              <button
                key={label}
                type="button"
                disabled={!filter}
                onClick={() => filter && setFilter('stock')({ target: { value: filters.stock === filter ? '' : filter } })}
                className={`text-left bg-white rounded-2xl border p-4 flex items-center gap-3 ${filter ? 'cursor-pointer hover:border-[#0D47A1]' : 'cursor-default'} ${filter && filters.stock === filter ? 'border-[#0D47A1] ring-2 ring-[#0D47A1]/15' : 'border-slate-200/80'}`}
              >
                <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tone}`}>
                  <Icon size={18} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[10.5px] font-bold text-slate-400 uppercase">{label}</span>
                  <span className="block text-lg font-black text-slate-900 truncate">{value}</span>
                </span>
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 bg-white p-3 rounded-2xl border border-slate-200/80">
            <div className="relative flex-1 min-w-56">
              <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                aria-label="Search parts"
                value={filters.search}
                onChange={setFilter('search')}
                placeholder="Search name, part number, brand, model or ID…"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold outline-none focus:bg-white focus:border-[#0D47A1]"
              />
            </div>
            <select aria-label="Appliance" className={toolbarControlClass} value={filters.category} onChange={setFilter('category')}>
              <option value="">All appliances</option>
              {appliances.map((a) => (
                <option key={a.key} value={a.key}>{a.name}</option>
              ))}
            </select>
            <select aria-label="Stock" className={toolbarControlClass} value={filters.stock} onChange={setFilter('stock')}>
              <option value="">Any stock</option>
              <option value="in">In stock</option>
              <option value="low">Low stock</option>
              <option value="out">Out of stock</option>
            </select>
            <select aria-label="Status" className={toolbarControlClass} value={filters.status} onChange={setFilter('status')}>
              <option value="">Available & hidden</option>
              <option value="active">Available</option>
              <option value="inactive">Hidden</option>
            </select>
            <Link to="/super-admin/inventory/new" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0D47A1] text-white text-xs font-bold hover:bg-blue-800">
              <Plus size={15} /> Add part
            </Link>
          </div>

          {error && <p className="text-xs font-bold text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}

          <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                    <th className="p-4">Part</th>
                    <th className="p-4">Fits</th>
                    <th className="p-4 text-right">Cost → price</th>
                    <th className="p-4">Stock</th>
                    <th className="p-4">Supplier / bin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading && rows.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-10 text-center text-slate-400"><Loader2 className="animate-spin mx-auto" /></td>
                    </tr>
                  )}
                  {!loading && rows.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-10 text-center text-slate-400 font-semibold">No parts match these filters.</td>
                    </tr>
                  )}
                  {rows.map((p) => {
                    const fits = [p.category, ...(p.compatibleCategories || [])].filter(Boolean);
                    return (
                      <tr key={p.id} onClick={() => navigate(`/super-admin/inventory/${p.id}`)} className={`hover:bg-slate-50/70 cursor-pointer ${p.isActive === false ? 'opacity-60' : ''}`}>
                        <td className="p-4">
                          <div className="flex items-center gap-3 min-w-64">
                            <span className="w-12 h-12 rounded-xl border border-slate-200 bg-white flex items-center justify-center shrink-0 overflow-hidden">
                              {p.imageUrl ? <img src={p.imageUrl} alt="" className="w-full h-full object-contain p-1" /> : <Package size={18} className="text-slate-300" />}
                            </span>
                            <div className="min-w-0">
                              <Link to={`/super-admin/inventory/${p.id}`} onClick={(e) => e.stopPropagation()} className="font-extrabold text-slate-900 text-sm hover:text-[#0D47A1] line-clamp-1">
                                {p.name}
                              </Link>
                              <p className="text-[11px] text-slate-400 font-mono truncate">{[p.brand, p.code, p.humanId].filter(Boolean).join(' · ')}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-wrap gap-1 max-w-56">
                            {fits.slice(0, 2).map((k) => (
                              <span key={k} className="px-1.5 py-0.5 rounded-md bg-slate-100 text-[10.5px] font-semibold text-slate-600">{applianceName(k)}</span>
                            ))}
                            {fits.length > 2 && <span className="text-[10.5px] font-bold text-slate-400">+{fits.length - 2}</span>}
                            {(p.compatibleModels?.length || 0) > 0 && <span className="text-[10.5px] text-slate-400">{p.compatibleModels.length} models</span>}
                          </div>
                        </td>
                        <td className="p-4 text-right whitespace-nowrap">
                          <p className="text-slate-400">{rupees(p.costPrice)} + {p.markupPercent ?? 0}%</p>
                          <p className="font-black text-slate-900 text-sm">{rupees(p.retailPrice)}</p>
                        </td>
                        <td className="p-4">
                          <StockBadge status={p.status} stock={p.stock} />
                          <p className="text-[10.5px] text-slate-400 mt-1">re-order at {p.reorderThreshold ?? 5}</p>
                        </td>
                        <td className="p-4 text-[11px] text-slate-500">
                          <p className="font-semibold text-slate-700">{p.supplier || '—'}</p>
                          <p>{[p.storageLocation, p.leadTimeDays != null && `${p.leadTimeDays}d lead`].filter(Boolean).join(' · ') || '—'}</p>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {meta.totalPages > 1 && (
              <div className="flex items-center justify-end gap-2 p-3 border-t border-slate-100 text-xs font-bold text-slate-500">
                <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} aria-label="Previous page" className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 cursor-pointer">
                  <ChevronLeft size={14} />
                </button>
                Page {page} of {meta.totalPages}
                <button type="button" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)} aria-label="Next page" className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 cursor-pointer">
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
