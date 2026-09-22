import { useState, useEffect, useCallback } from 'react';
import Sidebar from '../../components/super-admin/Sidebar';
import Topbar from '../../components/super-admin/Topbar';
import { Plus, Trash2, Edit2, Wrench, Layers, EyeOff } from 'lucide-react';
import { apiRequest } from '../../lib/apiClient';

// This is the real catalog (Category + ServiceCatalogItem) that the customer
// booking flow and the service-provider job screen both actually read from —
// unlike "Category Customization" (a separate CMS overlay) and "Appliance
// Repair & Service" (home-dashboard tiles), editing here changes what's really
// live everywhere, with no other admin surface to keep in sync.
const ServiceCatalog = () => {
  const [categories, setCategories] = useState([]);
  const [selectedKey, setSelectedKey] = useState('');
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadCategories = useCallback(async () => {
    try {
      const res = await apiRequest('/catalog/categories');
      const list = Array.isArray(res) ? res : [];
      setCategories(list);
      setSelectedKey((prev) => prev || list[0]?.key || '');
    } catch (err) {
      setError(err.message || 'Could not load categories.');
    }
  }, []);

  useEffect(() => { loadCategories(); }, [loadCategories]);

  const loadDetail = useCallback(async (key) => {
    if (!key) { setDetail(null); return; }
    setLoading(true);
    try {
      const res = await apiRequest(`/catalog/categories/${encodeURIComponent(key)}/admin`, { auth: true });
      setDetail(res);
      setError('');
    } catch (err) {
      setError(err.message || 'Could not load this category.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadDetail(selectedKey); }, [selectedKey, loadDetail]);

  // ── New category ──────────────────────────────────────────────────────────
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCatKey, setNewCatKey] = useState('');
  const [newCatName, setNewCatName] = useState('');
  const [newCatError, setNewCatError] = useState('');

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    setNewCatError('');
    try {
      const created = await apiRequest('/catalog/categories', {
        method: 'POST',
        auth: true,
        body: { key: newCatKey.trim(), name: newCatName.trim() || newCatKey.trim() },
      });
      setShowNewCategory(false);
      setNewCatKey('');
      setNewCatName('');
      await loadCategories();
      setSelectedKey(created.key);
    } catch (err) {
      setNewCatError(err.message || 'Could not create this category.');
    }
  };

  // ── Service item add/edit ─────────────────────────────────────────────────
  const [serviceModal, setServiceModal] = useState(null); // null | { mode: 'add' | 'edit', item }
  const [serviceForm, setServiceForm] = useState({ slug: '', name: '', price: '', unit: 'per unit', desc: '', icon: '', isActive: true });
  const [serviceSaving, setServiceSaving] = useState(false);
  const [serviceError, setServiceError] = useState('');

  const openAddService = () => {
    setServiceForm({ slug: '', name: '', price: '', unit: 'per unit', desc: '', icon: '', isActive: true });
    setServiceError('');
    setServiceModal({ mode: 'add' });
  };
  const openEditService = (item) => {
    setServiceForm({
      slug: item.slug, name: item.name, price: String(item.price ?? ''),
      unit: item.unit || 'per unit', desc: item.desc || '', icon: item.icon || '', isActive: item.isActive !== false,
    });
    setServiceError('');
    setServiceModal({ mode: 'edit', item });
  };

  const handleSaveService = async (e) => {
    e.preventDefault();
    setServiceSaving(true);
    setServiceError('');
    try {
      const payload = {
        name: serviceForm.name.trim(),
        price: Number(serviceForm.price) || 0,
        unit: serviceForm.unit.trim() || 'per unit',
        desc: serviceForm.desc.trim(),
        icon: serviceForm.icon.trim(),
      };
      if (serviceModal.mode === 'add') {
        await apiRequest(`/catalog/categories/${encodeURIComponent(selectedKey)}/services`, {
          method: 'POST', auth: true,
          body: { ...payload, slug: serviceForm.slug.trim() || serviceForm.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_') },
        });
      } else {
        await apiRequest(`/catalog/categories/${encodeURIComponent(selectedKey)}/services/${serviceModal.item.id}`, {
          method: 'PUT', auth: true,
          body: { ...payload, isActive: serviceForm.isActive },
        });
      }
      setServiceModal(null);
      await loadDetail(selectedKey);
    } catch (err) {
      setServiceError(err.message || 'Could not save this service.');
    } finally {
      setServiceSaving(false);
    }
  };

  const handleDeleteService = async (item) => {
    if (!window.confirm(`Remove "${item.name}" from ${selectedKey}? Customers will no longer be able to book it.`)) return;
    try {
      await apiRequest(`/catalog/categories/${encodeURIComponent(selectedKey)}/services/${item.id}`, { method: 'DELETE', auth: true });
      await loadDetail(selectedKey);
    } catch (err) {
      setError(err.message || 'Could not delete this service.');
    }
  };

  // ── Product type add/edit ─────────────────────────────────────────────────
  // Each type can carry a price addon — a flat surcharge on top of whichever
  // service is booked with it (e.g. Split AC costs more to install/repair
  // than Window AC because of the outdoor unit). Applies to every service in
  // the category, not just one — that's what makes it an addon per *type*
  // rather than a separate price list per service.
  const [ptModal, setPtModal] = useState(null); // null | { mode: 'add' | 'edit', item }
  const [ptForm, setPtForm] = useState({ slug: '', name: '', icon: '', desc: '', priceAddon: '0' });
  const [ptSaving, setPtSaving] = useState(false);
  const [ptError, setPtError] = useState('');

  const openAddProductType = () => {
    setPtForm({ slug: '', name: '', icon: '', desc: '', priceAddon: '0' });
    setPtError('');
    setPtModal({ mode: 'add' });
  };
  const openEditProductType = (pt) => {
    setPtForm({ slug: pt.slug, name: pt.name, icon: pt.icon || '', desc: pt.desc || '', priceAddon: String(pt.priceAddon || 0) });
    setPtError('');
    setPtModal({ mode: 'edit', item: pt });
  };

  const handleSaveProductType = async (e) => {
    e.preventDefault();
    setPtSaving(true);
    setPtError('');
    try {
      const payload = {
        name: ptForm.name.trim(),
        icon: ptForm.icon.trim(),
        desc: ptForm.desc.trim(),
        priceAddon: Number(ptForm.priceAddon) || 0,
      };
      if (ptModal.mode === 'add') {
        await apiRequest(`/catalog/categories/${encodeURIComponent(selectedKey)}/product-types`, {
          method: 'POST', auth: true,
          body: { ...payload, slug: ptForm.slug.trim() || ptForm.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_') },
        });
      } else {
        await apiRequest(`/catalog/categories/${encodeURIComponent(selectedKey)}/product-types/${ptModal.item.id}`, {
          method: 'PUT', auth: true, body: payload,
        });
      }
      setPtModal(null);
      await loadDetail(selectedKey);
    } catch (err) {
      setPtError(err.message || 'Could not save this product type.');
    } finally {
      setPtSaving(false);
    }
  };

  const handleDeleteProductType = async (pt) => {
    if (!window.confirm(`Remove "${pt.name}"?`)) return;
    try {
      await apiRequest(`/catalog/categories/${encodeURIComponent(selectedKey)}/product-types/${pt.id}`, { method: 'DELETE', auth: true });
      await loadDetail(selectedKey);
    } catch (err) {
      setError(err.message || 'Could not delete this product type.');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex text-slate-800 animate-in fade-in duration-150">
      <Sidebar />
      <div className="flex-1 ml-64 min-h-screen flex flex-col">
        <Topbar title="Service Catalog" subtitle="The real services & pricing customers book and providers see — no other admin screen edits this data" />

        {error && (
          <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs font-bold text-red-700">{error}</div>
        )}

        <div className="p-6 flex-1 flex gap-6">
          {/* Category rail */}
          <div className="w-64 shrink-0 space-y-3">
            <button
              onClick={() => setShowNewCategory(true)}
              className="w-full bg-[#0D47A1] text-white px-3 py-2 rounded-xl text-xs font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Plus size={14} /> New Category
            </button>
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
              {categories.length === 0 && (
                <p className="text-xs text-slate-400 p-4">No categories yet.</p>
              )}
              {categories.map((c) => (
                <button
                  key={c.key}
                  onClick={() => setSelectedKey(c.key)}
                  className={`w-full text-left px-4 py-3 text-sm font-semibold border-b border-slate-50 last:border-0 transition-colors cursor-pointer ${
                    selectedKey === c.key ? 'bg-[#E3ECF9] text-[#0D47A1]' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {c.name}
                  <span className="block text-[10px] font-normal text-slate-400 mt-0.5">{(c.services || []).length} service{(c.services || []).length === 1 ? '' : 's'}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Detail panel */}
          <div className="flex-1 space-y-6">
            {!selectedKey ? (
              <div className="bg-white rounded-2xl border border-[#E2E8F0] p-10 text-center text-slate-400 text-sm">
                Pick a category, or create one, to manage its services.
              </div>
            ) : loading || !detail ? (
              <div className="bg-white rounded-2xl border border-[#E2E8F0] p-10 text-center text-slate-400 text-sm">Loading…</div>
            ) : (
              <>
                <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
                  <div className="flex justify-between items-center p-4 border-b border-slate-100">
                    <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2"><Wrench size={16} className="text-[#0D47A1]" /> Bookable Services</h2>
                    <button
                      onClick={openAddService}
                      className="bg-[#0D47A1] text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus size={13} /> Add Service
                    </button>
                  </div>
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-slate-400 text-xs font-black uppercase tracking-wider">
                        <th className="p-3 pl-6">Service</th>
                        <th className="p-3">Price</th>
                        <th className="p-3">Unit</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 pr-6 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(detail.services || []).map((s) => (
                        <tr key={s.id} className="hover:bg-slate-50/60">
                          <td className="p-3 pl-6">
                            <p className="font-bold text-slate-800">{s.name}</p>
                            {s.desc && <p className="text-[11px] text-slate-400 mt-0.5">{s.desc}</p>}
                          </td>
                          <td className="p-3 font-semibold text-slate-700">₹{Number(s.price || 0).toLocaleString('en-IN')}</td>
                          <td className="p-3 text-slate-500 text-xs">{s.unit || 'per unit'}</td>
                          <td className="p-3">
                            {s.isActive === false ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-slate-400"><EyeOff size={11} /> Hidden</span>
                            ) : (
                              <span className="text-[10px] font-black uppercase text-green-600">Live</span>
                            )}
                          </td>
                          <td className="p-3 pr-6 text-right">
                            <div className="flex justify-end gap-1">
                              <button onClick={() => openEditService(s)} className="p-1.5 text-slate-500 hover:text-[#0D47A1] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"><Edit2 size={14} /></button>
                              <button onClick={() => handleDeleteService(s)} className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"><Trash2 size={14} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {(detail.services || []).length === 0 && (
                    <p className="text-center py-10 text-sm text-slate-400">No services yet — customers will see nothing bookable for this category until you add one.</p>
                  )}
                </div>

                <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
                  <div className="flex justify-between items-center p-4 border-b border-slate-100">
                    <div>
                      <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2"><Layers size={16} className="text-[#0D47A1]" /> Product Types</h2>
                      <p className="text-[11px] text-slate-400 mt-0.5">What the customer books a service for — each can add its own surcharge on top of any service's price.</p>
                    </div>
                    <button
                      onClick={openAddProductType}
                      className="bg-white border border-[#E2E8F0] text-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <Plus size={13} /> Add Product Type
                    </button>
                  </div>
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-slate-400 text-xs font-black uppercase tracking-wider">
                        <th className="p-3 pl-6">Type</th>
                        <th className="p-3">Price Add-on</th>
                        <th className="p-3 pr-6 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(detail.productTypes || []).map((pt) => (
                        <tr key={pt.id} className="hover:bg-slate-50/60">
                          <td className="p-3 pl-6">
                            <p className="font-bold text-slate-800">{pt.icon} {pt.name}</p>
                            {pt.desc && <p className="text-[11px] text-slate-400 mt-0.5">{pt.desc}</p>}
                          </td>
                          <td className="p-3 font-semibold text-slate-700">
                            {pt.priceAddon ? `+₹${Number(pt.priceAddon).toLocaleString('en-IN')}` : <span className="text-slate-400 font-normal">None</span>}
                          </td>
                          <td className="p-3 pr-6 text-right">
                            <div className="flex justify-end gap-1">
                              <button onClick={() => openEditProductType(pt)} className="p-1.5 text-slate-500 hover:text-[#0D47A1] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"><Edit2 size={14} /></button>
                              <button onClick={() => handleDeleteProductType(pt)} className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"><Trash2 size={14} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {(detail.productTypes || []).length === 0 && (
                    <p className="text-center py-8 text-sm text-slate-400">No product types configured — customers will book this category's services without picking a specific model.</p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* New Category Modal */}
      {showNewCategory && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xl max-w-sm w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-base text-slate-800">New Category</h3>
              <button onClick={() => setShowNewCategory(false)} className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer">×</button>
            </div>
            <form onSubmit={handleCreateCategory} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Key (unique, e.g. "AC")</label>
                <input required value={newCatKey} onChange={(e) => setNewCatKey(e.target.value)} className="w-full border border-slate-200 p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-[#0D47A1] text-sm" placeholder="AC" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Display Name</label>
                <input value={newCatName} onChange={(e) => setNewCatName(e.target.value)} className="w-full border border-slate-200 p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-[#0D47A1] text-sm" placeholder="Air Conditioner" />
              </div>
              {newCatError && <p className="text-xs font-bold text-red-600">{newCatError}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowNewCategory(false)} className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">Cancel</button>
                <button type="submit" className="px-4 py-2 text-xs font-bold bg-[#0D47A1] text-white rounded-xl hover:bg-blue-700 cursor-pointer">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add/Edit Service Modal */}
      {serviceModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xl max-w-sm w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-base text-slate-800">{serviceModal.mode === 'add' ? 'Add Service' : 'Edit Service'}</h3>
              <button onClick={() => setServiceModal(null)} className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer">×</button>
            </div>
            <form onSubmit={handleSaveService} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Service Name</label>
                <input required value={serviceForm.name} onChange={(e) => setServiceForm((f) => ({ ...f, name: e.target.value }))} className="w-full border border-slate-200 p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-[#0D47A1] text-sm" placeholder="e.g. Gas Refilling" />
              </div>
              {serviceModal.mode === 'add' && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Slug (optional, auto-generated)</label>
                  <input value={serviceForm.slug} onChange={(e) => setServiceForm((f) => ({ ...f, slug: e.target.value }))} className="w-full border border-slate-200 p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-[#0D47A1] text-sm font-mono" placeholder="gas_refilling" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Price (₹)</label>
                  <input required type="number" min="0" value={serviceForm.price} onChange={(e) => setServiceForm((f) => ({ ...f, price: e.target.value }))} className="w-full border border-slate-200 p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-[#0D47A1] text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Unit</label>
                  <input value={serviceForm.unit} onChange={(e) => setServiceForm((f) => ({ ...f, unit: e.target.value }))} className="w-full border border-slate-200 p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-[#0D47A1] text-sm" placeholder="per unit" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description</label>
                <input value={serviceForm.desc} onChange={(e) => setServiceForm((f) => ({ ...f, desc: e.target.value }))} className="w-full border border-slate-200 p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-[#0D47A1] text-sm" placeholder="Shown under the service name" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Icon (emoji)</label>
                <input value={serviceForm.icon} onChange={(e) => setServiceForm((f) => ({ ...f, icon: e.target.value }))} className="w-full border border-slate-200 p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-[#0D47A1] text-sm" placeholder="🔧" />
              </div>
              {serviceModal.mode === 'edit' && (
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                  <input type="checkbox" checked={serviceForm.isActive} onChange={(e) => setServiceForm((f) => ({ ...f, isActive: e.target.checked }))} />
                  Visible to customers
                </label>
              )}
              {serviceError && <p className="text-xs font-bold text-red-600">{serviceError}</p>}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setServiceModal(null)} className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">Cancel</button>
                <button type="submit" disabled={serviceSaving} className="px-4 py-2 text-xs font-bold bg-[#0D47A1] text-white rounded-xl hover:bg-blue-700 disabled:opacity-60 cursor-pointer">{serviceSaving ? 'Saving…' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add/Edit Product Type Modal */}
      {ptModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 animate-in fade-in duration-200 p-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-base text-slate-800">{ptModal.mode === 'add' ? 'Add Product Type' : 'Edit Product Type'}</h3>
              <button onClick={() => setPtModal(null)} className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer">×</button>
            </div>
            <form onSubmit={handleSaveProductType} className="space-y-3">
              <div className="grid grid-cols-[1fr_5rem] gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Name</label>
                  <input required value={ptForm.name} onChange={(e) => setPtForm((f) => ({ ...f, name: e.target.value }))} className="w-full border border-slate-200 p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-[#0D47A1] text-sm" placeholder="e.g. Split AC" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Icon</label>
                  <input value={ptForm.icon} onChange={(e) => setPtForm((f) => ({ ...f, icon: e.target.value }))} className="w-full border border-slate-200 p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-[#0D47A1] text-sm text-center" placeholder="❄️" />
                </div>
              </div>
              {ptModal.mode === 'add' && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Slug (optional, auto-generated)</label>
                  <input value={ptForm.slug} onChange={(e) => setPtForm((f) => ({ ...f, slug: e.target.value }))} className="w-full border border-slate-200 p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-[#0D47A1] text-sm font-mono" placeholder="split" />
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Price Add-on (₹)</label>
                <input type="number" min="0" value={ptForm.priceAddon} onChange={(e) => setPtForm((f) => ({ ...f, priceAddon: e.target.value }))} className="w-full border border-slate-200 p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-[#0D47A1] text-sm" placeholder="0" />
                <p className="text-[11px] text-slate-400 mt-1">
                  Added on top of whichever service the customer books (Repair, Installation, ...) whenever they pick this type. Leave 0 if it costs the same as the category's base price.
                </p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description</label>
                <input value={ptForm.desc} onChange={(e) => setPtForm((f) => ({ ...f, desc: e.target.value }))} className="w-full border border-slate-200 p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-[#0D47A1] text-sm" placeholder="e.g. 1 ton · 1.5 ton · 2 ton" />
              </div>
              {ptError && <p className="text-xs font-bold text-red-600">{ptError}</p>}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setPtModal(null)} className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">Cancel</button>
                <button type="submit" disabled={ptSaving} className="px-4 py-2 text-xs font-bold bg-[#0D47A1] text-white rounded-xl hover:bg-blue-700 disabled:opacity-60 cursor-pointer">{ptSaving ? 'Saving…' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceCatalog;
