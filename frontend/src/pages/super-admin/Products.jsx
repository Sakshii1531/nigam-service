import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Loader2, Package, Plus, Search } from 'lucide-react';
import Sidebar from '../../components/super-admin/Sidebar';
import Topbar from '../../components/super-admin/Topbar';
import { apiRequest } from '../../lib/apiClient';
import { toolbarControlClass } from '../../components/super-admin/catalogue/ui';
import { StockBadge } from '../../components/super-admin/store/formParts';
import { rupees } from '../../components/super-admin/store/storeFormat';

// Super Admin → NCC Products (docs/master-catalogue Phase 20): every product
// in the Buy New store — hidden ones too — with picture, price, discount,
// stock state and units sold. A row opens the product's detail page.

const PAGE_SIZE = 25;

export default function Products() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState([]);
  const [filters, setFilters] = useState({ search: '', category: '', status: '', stock: '', condition: '' });
  const [page, setPage] = useState(1);

  useEffect(() => {
    apiRequest('/product-categories', { silentError: true })
      .then((list) => setCategories((list || []).map((c) => c.name)))
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
    Object.entries(filters).forEach(([k, v]) => v && qs.set(k, v.trim ? v.trim() : v));
    try {
      const res = await apiRequest(`/products/manage?${qs}`, { auth: true, envelope: true });
      setRows(res.data || []);
      setMeta(res.meta || { total: 0, totalPages: 1 });
      setError('');
    } catch (err) {
      setError(err.message || 'Could not load products.');
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

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex text-slate-800">
      <Sidebar />
      <div className="flex-1 ml-64 min-h-screen flex flex-col min-w-0">
        <Topbar title="NCC Products" subtitle="Everything sold in the Buy New store" />
        <main className="p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-500">
              <b className="text-slate-900">{meta.total}</b> product{meta.total === 1 ? '' : 's'}
            </p>
            <Link to="/super-admin/products/new" className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#0D47A1] text-white text-xs font-bold hover:bg-blue-800">
              <Plus size={15} /> Add product
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-2 bg-white p-3 rounded-2xl border border-slate-200/80">
            <div className="relative flex-1 min-w-56">
              <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                aria-label="Search products"
                value={filters.search}
                onChange={setFilter('search')}
                placeholder="Search name, brand, model or SKU…"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold outline-none focus:bg-white focus:border-[#0D47A1]"
              />
            </div>
            <select aria-label="Category" className={toolbarControlClass} value={filters.category} onChange={setFilter('category')}>
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <select aria-label="Condition" className={toolbarControlClass} value={filters.condition} onChange={setFilter('condition')}>
              <option value="">New & refurbished</option>
              <option value="New">New</option>
              <option value="Refurbished">Refurbished</option>
            </select>
            <select aria-label="Stock" className={toolbarControlClass} value={filters.stock} onChange={setFilter('stock')}>
              <option value="">Any stock</option>
              <option value="in">In stock</option>
              <option value="low">Low stock</option>
              <option value="out">Out of stock</option>
            </select>
            <select aria-label="Status" className={toolbarControlClass} value={filters.status} onChange={setFilter('status')}>
              <option value="">Live & hidden</option>
              <option value="active">Live</option>
              <option value="inactive">Hidden</option>
            </select>
          </div>

          {error && <p className="text-xs font-bold text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}

          <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                    <th className="p-4">Product</th>
                    <th className="p-4">Category</th>
                    <th className="p-4 text-right">Price</th>
                    <th className="p-4">Stock</th>
                    <th className="p-4 text-right">Sold</th>
                    <th className="p-4">Services</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading && rows.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-10 text-center text-slate-400">
                        <Loader2 className="animate-spin mx-auto" />
                      </td>
                    </tr>
                  )}
                  {!loading && rows.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-10 text-center text-slate-400 font-semibold">
                        No products match these filters.
                      </td>
                    </tr>
                  )}
                  {rows.map((p) => (
                    <tr
                      key={p.id}
                      onClick={() => navigate(`/super-admin/products/${p.id}`)}
                      className={`hover:bg-slate-50/70 cursor-pointer ${p.isActive ? '' : 'opacity-60'}`}
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3 min-w-64">
                          <span className="w-14 h-14 rounded-xl border border-slate-200 bg-white flex items-center justify-center shrink-0 overflow-hidden">
                            {p.imageUrl ? <img src={p.imageUrl} alt="" className="w-full h-full object-contain p-1" /> : <Package size={20} className="text-slate-300" />}
                          </span>
                          <div className="min-w-0">
                            <Link to={`/super-admin/products/${p.id}`} onClick={(e) => e.stopPropagation()} className="font-extrabold text-slate-900 text-sm leading-snug hover:text-[#0D47A1] line-clamp-2">
                              {p.name}
                            </Link>
                            <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                              {[p.brand, p.modelNumber, p.sku].filter(Boolean).join(' · ') || '—'}
                            </p>
                            {p.condition === 'Refurbished' && <span className="text-[10px] font-black text-violet-600">Refurbished</span>}
                          </div>
                        </div>
                      </td>
                      <td className="p-4 font-semibold text-slate-600">{p.category}</td>
                      <td className="p-4 text-right whitespace-nowrap">
                        <p className="font-black text-slate-900 text-sm">{rupees(p.price)}</p>
                        {p.discountPercent > 0 && (
                          <p className="text-[11px]">
                            <s className="text-slate-400">{rupees(p.originalPrice)}</s> <b className="text-emerald-600">{p.discountPercent}% off</b>
                          </p>
                        )}
                      </td>
                      <td className="p-4">
                        <StockBadge status={p.stockStatus} stock={p.stock} />
                      </td>
                      <td className="p-4 text-right font-bold">{p.sales?.unitsSold ?? 0}</td>
                      <td className="p-4 text-[11px] text-slate-500 whitespace-nowrap">
                        {p.warrantyMonths ? `${p.warrantyMonths}m warranty` : 'No warranty'}
                        <br />
                        {p.returnDays ? `${p.returnDays}-day returns` : 'No returns'}
                        {p.codAvailable === false ? ' · prepaid' : ''}
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${p.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                          {p.isActive ? 'Live' : 'Hidden'}
                        </span>
                      </td>
                    </tr>
                  ))}
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
