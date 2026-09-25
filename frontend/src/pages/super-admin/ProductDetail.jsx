import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, Banknote, BadgeCheck, CheckCircle2, Edit2, Eye, EyeOff, Loader2, Package, RotateCcw, ShieldCheck, Truck, Wrench } from 'lucide-react';
import Sidebar from '../../components/super-admin/Sidebar';
import Topbar from '../../components/super-admin/Topbar';
import { apiRequest } from '../../lib/apiClient';
import { StockBadge } from '../../components/super-admin/store/formParts';
import { rupees } from '../../components/super-admin/store/storeFormat';

// Super Admin → NCC Products → one product (docs/master-catalogue Phase 20):
// the listing as the customer sees it — gallery, price, highlights,
// services, description, specifications, box contents, manufacturer — plus
// the admin's side: stock, units sold, revenue and recent orders.

const dateText = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

function Gallery({ images, name }) {
  const [active, setActive] = useState(0);
  if (!images.length) {
    return (
      <div className="aspect-square rounded-2xl border border-slate-200 bg-slate-50 flex flex-col items-center justify-center text-slate-300">
        <Package size={48} />
        <span className="text-xs font-bold mt-2">No pictures yet</span>
      </div>
    );
  }
  return (
    <div className="flex gap-3">
      <div className="flex flex-col gap-2 w-16 shrink-0">
        {images.map((url, i) => (
          <button
            key={url}
            type="button"
            onMouseEnter={() => setActive(i)}
            onClick={() => setActive(i)}
            aria-label={`Show picture ${i + 1}`}
            className={`aspect-square rounded-lg border bg-white overflow-hidden cursor-pointer ${i === active ? 'border-[#0D47A1] ring-2 ring-[#0D47A1]/20' : 'border-slate-200'}`}
          >
            <img src={url} alt="" className="w-full h-full object-contain p-1" />
          </button>
        ))}
      </div>
      <div className="flex-1 aspect-square rounded-2xl border border-slate-200 bg-white flex items-center justify-center p-4">
        <img src={images[active]} alt={name} className="max-w-full max-h-full object-contain" />
      </div>
    </div>
  );
}

export default function ProductDetail() {
  const { id } = useParams();
  const location = useLocation();
  const [product, setProduct] = useState(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(location.state?.toast || '');
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    () =>
      apiRequest(`/products/manage/${id}`, { auth: true })
        .then(setProduct)
        .catch((err) => setError(err.message || 'Could not load this product.')),
    [id],
  );
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(''), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const toggleLive = async () => {
    setBusy(true);
    try {
      await apiRequest(`/products/${id}`, { method: 'PUT', auth: true, body: { isActive: !product.isActive } });
      setToast(product.isActive ? 'Hidden from the store.' : 'Live in the store.');
      await load();
    } catch (err) {
      setError(err.message || 'Could not change the status.');
    } finally {
      setBusy(false);
    }
  };

  const images = product ? (product.images?.length ? product.images : product.imageUrl ? [product.imageUrl] : []) : [];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex text-slate-800">
      <Sidebar />
      <div className="flex-1 ml-64 min-h-screen flex flex-col min-w-0">
        <Topbar title="Product details" subtitle="How this product appears in the Buy New store, with its sales" />
        {toast && (
          <div className="fixed top-20 right-6 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold">
            <CheckCircle2 size={16} /> {toast}
          </div>
        )}
        <main className="p-6 space-y-5">
          <div className="flex items-center justify-between gap-3">
            <Link to="/super-admin/products" className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-[#0D47A1]">
              <ArrowLeft size={14} /> All products
            </Link>
            {product && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={toggleLive}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer disabled:opacity-60"
                >
                  {product.isActive ? <EyeOff size={14} /> : <Eye size={14} />} {product.isActive ? 'Hide from store' : 'Put live'}
                </button>
                <Link to={`/super-admin/products/${id}/edit`} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0D47A1] text-white text-xs font-bold hover:bg-blue-800">
                  <Edit2 size={14} /> Edit product
                </Link>
              </div>
            )}
          </div>

          {error && <p className="text-xs font-bold text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}
          {!product && !error && <Loader2 className="animate-spin mx-auto text-slate-400" />}

          {product && (
            <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5 items-start">
              <div className="space-y-5 min-w-0">
                {/* Listing head */}
                <section className="bg-white rounded-2xl border border-slate-200/80 p-5 grid grid-cols-1 lg:grid-cols-[minmax(0,420px)_1fr] gap-6">
                  <Gallery images={images} name={product.name} />
                  <div className="space-y-4 min-w-0">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 text-[#0D47A1]">{product.category}</span>
                        <span className={`px-2 py-0.5 rounded-md ${product.condition === 'Refurbished' ? 'bg-violet-50 text-violet-700' : 'bg-slate-100 text-slate-600'}`}>
                          {product.condition}
                          {product.conditionGrade ? ` · ${product.conditionGrade}` : ''}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md ${product.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                          {product.isActive ? 'Live' : 'Hidden'}
                        </span>
                      </div>
                      {product.brand && <p className="text-sm font-bold text-slate-400 mt-3">{product.brand}</p>}
                      <h1 className="text-xl font-extrabold text-slate-900 leading-snug">{product.name}</h1>
                      <p className="text-xs text-slate-500 mt-1">
                        {[product.modelNumber && `Model ${product.modelNumber}`, product.colour, product.sku && `SKU ${product.sku}`].filter(Boolean).join(' · ')}
                      </p>
                    </div>

                    <div className="flex items-baseline gap-3 flex-wrap">
                      <span className="text-3xl font-black text-slate-900">{rupees(product.price)}</span>
                      {product.discountPercent > 0 && (
                        <>
                          <s className="text-base text-slate-400">{rupees(product.originalPrice)}</s>
                          <span className="text-base font-black text-emerald-600">{product.discountPercent}% off</span>
                        </>
                      )}
                    </div>
                    <StockBadge status={product.stockStatus} stock={product.stock} unit="units" />

                    {product.specs?.length > 0 && (
                      <div>
                        <h3 className="text-xs font-black text-slate-500 uppercase tracking-wide mb-2">Highlights</h3>
                        <ul className="space-y-1.5 text-sm text-slate-700 list-disc pl-5">
                          {product.specs.map((s) => (
                            <li key={s}>{s}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2.5">
                      {[
                        { Icon: ShieldCheck, title: product.warrantyMonths ? `${product.warrantyMonths}-month warranty` : 'No warranty', desc: product.warrantySummary || 'Brand warranty' },
                        { Icon: RotateCcw, title: product.returnDays ? `${product.returnDays}-day returns` : 'Not returnable', desc: product.returnDays ? 'Replacement / refund' : 'All sales final' },
                        { Icon: Banknote, title: product.codAvailable ? 'Pay on Delivery' : 'Prepaid only', desc: product.codAvailable ? 'Cash / UPI at doorstep' : 'Pay online at checkout' },
                        { Icon: Wrench, title: product.installationIncluded ? 'Free installation' : 'Installation extra', desc: product.installationIncluded ? 'By an NCC technician' : 'Book it as a service' },
                      ].map(({ Icon, title, desc }) => (
                        <div key={title} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
                          <Icon size={18} className="text-[#0D47A1] shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-black text-slate-800 truncate">{title}</p>
                            <p className="text-[10.5px] text-slate-400 truncate">{desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                {product.description && (
                  <section className="bg-white rounded-2xl border border-slate-200/80 p-5">
                    <h2 className="text-sm font-extrabold text-slate-800 mb-2">Description</h2>
                    <p className="text-sm text-slate-600 whitespace-pre-line leading-relaxed">{product.description}</p>
                  </section>
                )}

                <section className="bg-white rounded-2xl border border-slate-200/80 p-5">
                  <h2 className="text-sm font-extrabold text-slate-800 mb-3">Specifications</h2>
                  {product.specifications?.length ? (
                    <div className="space-y-5">
                      {product.specifications.map((group) => (
                        <div key={group.group}>
                          <h3 className="text-xs font-black text-slate-500 uppercase tracking-wide mb-1.5">{group.group}</h3>
                          <table className="w-full text-sm">
                            <tbody>
                              {group.items.map((item) => (
                                <tr key={item.label} className="border-b border-slate-100 last:border-0">
                                  <th scope="row" className="text-left font-semibold text-slate-400 py-2 pr-4 w-1/3 align-top">{item.label}</th>
                                  <td className="py-2 text-slate-800">{item.value}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">No specifications yet — add them from Edit product.</p>
                  )}
                </section>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <section className="bg-white rounded-2xl border border-slate-200/80 p-5">
                    <h2 className="text-sm font-extrabold text-slate-800 mb-2">In the box</h2>
                    {product.inTheBox?.length ? (
                      <ul className="text-sm text-slate-600 space-y-1 list-disc pl-5">
                        {product.inTheBox.map((i) => (
                          <li key={i}>{i}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-slate-400">Not listed.</p>
                    )}
                  </section>
                  <section className="bg-white rounded-2xl border border-slate-200/80 p-5">
                    <h2 className="text-sm font-extrabold text-slate-800 mb-2">Manufacturer</h2>
                    <p className="text-sm text-slate-600">{product.manufacturer || 'Not listed.'}</p>
                    <p className="text-xs text-slate-400 mt-1.5">Country of origin: {product.countryOfOrigin || '—'}</p>
                  </section>
                </div>
              </div>

              {/* Admin side */}
              <aside className="space-y-5 xl:sticky xl:top-4">
                <section className="bg-white rounded-2xl border border-slate-200/80 p-5">
                  <h2 className="text-sm font-extrabold text-slate-800 mb-3">Sales</h2>
                  <dl className="grid grid-cols-3 gap-2 text-center">
                    {[
                      ['Units sold', product.sales.unitsSold],
                      ['Orders', product.sales.orders],
                      ['Revenue', rupees(product.sales.revenue)],
                    ].map(([label, v]) => (
                      <div key={label} className="rounded-xl bg-slate-50 border border-slate-200/70 py-2.5 px-1">
                        <dt className="text-[10px] font-bold text-slate-400 uppercase">{label}</dt>
                        <dd className="text-sm font-black text-slate-900 mt-0.5 truncate">{v}</dd>
                      </div>
                    ))}
                  </dl>
                  <p className="text-[10.5px] text-slate-400 mt-2">Confirmed, shipped and delivered orders.</p>
                </section>

                <section className="bg-white rounded-2xl border border-slate-200/80 p-5">
                  <h2 className="text-sm font-extrabold text-slate-800 mb-3">Stock</h2>
                  <dl className="text-xs space-y-2">
                    <div className="flex justify-between"><dt className="text-slate-400 font-semibold">In stock</dt><dd className="font-black">{product.stock} units</dd></div>
                    <div className="flex justify-between"><dt className="text-slate-400 font-semibold">Low-stock alert at</dt><dd className="font-bold">{product.lowStockThreshold ?? 5}</dd></div>
                    <div className="flex justify-between"><dt className="text-slate-400 font-semibold">Added</dt><dd className="font-bold">{dateText(product.createdAt)}</dd></div>
                    <div className="flex justify-between"><dt className="text-slate-400 font-semibold">Last edited</dt><dd className="font-bold">{dateText(product.updatedAt)}</dd></div>
                  </dl>
                </section>

                <section className="bg-white rounded-2xl border border-slate-200/80 p-5">
                  <h2 className="text-sm font-extrabold text-slate-800 mb-3 flex items-center gap-1.5"><Truck size={15} /> Recent orders</h2>
                  {product.recentOrders.length ? (
                    <ul className="divide-y divide-slate-100">
                      {product.recentOrders.map((o) => (
                        <li key={o.id} className="py-2 flex items-center justify-between gap-2 text-xs">
                          <div className="min-w-0">
                            <p className="font-bold text-slate-800 truncate">{o.customer}</p>
                            <p className="text-slate-400">{dateText(o.createdAt)} · {o.quantity} × {rupees(o.price)}</p>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${o.status === 'Cancelled' ? 'bg-rose-50 text-rose-600' : o.status === 'Delivered' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-[#0D47A1]'}`}>
                            {o.status}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-slate-400 flex items-center gap-1.5"><BadgeCheck size={14} /> No orders yet.</p>
                  )}
                </section>
              </aside>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
