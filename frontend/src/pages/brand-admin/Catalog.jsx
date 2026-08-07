import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/brand-admin/Sidebar';
import Topbar from '../../components/brand-admin/Topbar';
import { apiRequest } from '../../lib/apiClient';
import { 
  Plus, 
  Trash2, 
  X,
  CheckCircle2,
  Wrench,
  ChevronDown,
  ChevronUp,
  Building2,
  Boxes,
  Settings2,
  ArrowRight,
  ListChecks
} from 'lucide-react';

const Catalog = () => {
  const [successMessage, setSuccessMessage] = useState('');
  const [activeTab, setActiveTab] = useState('services');
  const [selectedSubBrandId, setSelectedSubBrandId] = useState('');

  // Master Services List
  const [masterServices, setMasterServices] = useState([]);
  const [showAddServiceModal, setShowAddServiceModal] = useState(false);
  const [newMasterService, setNewMasterService] = useState({ name: '', type: 'Installation', charge: '' });

  // Sub-brands, each with its products folded in. The API keeps the two apart
  // (products hang off /sub-brands/:id/products), so they're joined here.
  const [subBrands, setSubBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadCatalog() {
    const [services, subs] = await Promise.all([
      apiRequest('/brand/catalog/master-services', { auth: true }),
      apiRequest('/brand/catalog/sub-brands', { auth: true }),
    ]);
    const subList = Array.isArray(subs) ? subs : [];
    const withProducts = await Promise.all(
      subList.map(async (sub) => ({
        ...sub,
        products: (await apiRequest(`/brand/catalog/sub-brands/${sub.id}/products`, { auth: true })) || [],
      })),
    );
    setMasterServices(Array.isArray(services) ? services : []);
    setSubBrands(withProducts);
    return withProducts;
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const subs = await loadCatalog();
        if (!cancelled && subs.length) setSelectedSubBrandId(prev => prev || subs[0].id);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const [expandedProductId, setExpandedProductId] = useState(null);

  // Add Sub-brand modal
  const [showAddSubBrandModal, setShowAddSubBrandModal] = useState(false);
  const [newSubBrand, setNewSubBrand] = useState({ name: '', category: '' });

  // Add Product modal
  const [showAddSubProductModal, setShowAddSubProductModal] = useState(false);
  const [newSubProduct, setNewSubProduct] = useState({ name: '', model: '', configureDefaultServices: true });

  // Map Service modal
  const [showMapServiceModal, setShowMapServiceModal] = useState(false);
  const [mappingProductId, setMappingProductId] = useState(null);
  // `id` is the MasterService being mapped; the other fields are vestigial.
  const [newService, setNewService] = useState({ id: '', name: '', type: 'Installation', charge: '' });

  const selectedSub = subBrands.find(s => s.id === selectedSubBrandId) || null;

  const toast = (msg, ms = 3000) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), ms);
  };

  // Sub-brand/product/service edits all change the same nested tree, so each
  // mutation refetches rather than trying to splice the response into place.
  const afterMutation = async (message) => {
    try {
      await loadCatalog();
      toast(message);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAddSubBrandSubmit = async (e) => {
    e.preventDefault();
    if (!newSubBrand.name) return;
    try {
      const created = await apiRequest('/brand/catalog/sub-brands', {
        method: 'POST',
        auth: true,
        body: { name: newSubBrand.name, category: newSubBrand.category || 'General' },
      });
      setNewSubBrand({ name: '', category: '' });
      setShowAddSubBrandModal(false);
      await loadCatalog();
      setSelectedSubBrandId(created.id);
      toast(`Sub-brand "${created.name}" created!`);
    } catch (err) {
      setError(`Could not create sub-brand: ${err.message}`);
    }
  };

  const handleAddSubProductSubmit = async (e) => {
    e.preventDefault();
    if (!newSubProduct.name || !newSubProduct.model || !selectedSubBrandId) return;
    try {
      await apiRequest(`/brand/catalog/sub-brands/${selectedSubBrandId}/products`, {
        method: 'POST',
        auth: true,
        // Services are mapped afterwards from the master list — a product cannot
        // invent its own, they must be existing MasterService documents.
        body: { name: newSubProduct.name, model: newSubProduct.model, services: [] },
      });
      setNewSubProduct({ name: '', model: '', configureDefaultServices: true });
      setShowAddSubProductModal(false);
      await afterMutation(`Product "${newSubProduct.name}" added!`);
    } catch (err) {
      setError(`Could not add product: ${err.message}`);
    }
  };

  // `newService.id` holds the chosen MasterService id — this maps an existing
  // service onto the product rather than creating a new one.
  const handleMapServiceSubmit = async (e) => {
    e.preventDefault();
    if (!newService.id || !mappingProductId) return;
    const product = (selectedSub?.products || []).find(p => p.id === mappingProductId);
    if (!product) return;

    const nextServiceIds = [...(product.services || []).map(s => s.id), newService.id];
    try {
      await apiRequest(`/brand/catalog/products/${mappingProductId}`, {
        method: 'PUT', auth: true, body: { services: nextServiceIds },
      });
      setNewService({ id: '', name: '', type: 'Installation', charge: '' });
      setShowMapServiceModal(false);
      await afterMutation('Service mapped to product successfully!');
    } catch (err) {
      setError(`Could not map service: ${err.message}`);
    }
  };

  const handleDeleteService = async (productId, serviceId) => {
    const product = (selectedSub?.products || []).find(p => p.id === productId);
    if (!product) return;
    const nextServiceIds = (product.services || []).map(s => s.id).filter(id => id !== serviceId);
    try {
      await apiRequest(`/brand/catalog/products/${productId}`, {
        method: 'PUT', auth: true, body: { services: nextServiceIds },
      });
      await afterMutation('Service removed.');
    } catch (err) {
      setError(`Could not unmap service: ${err.message}`);
    }
  };

  const handleAddServiceSubmit = async (e) => {
    e.preventDefault();
    if (!newMasterService.name || !newMasterService.charge) return;
    try {
      const added = await apiRequest('/brand/catalog/master-services', {
        method: 'POST',
        auth: true,
        body: {
          name: newMasterService.name,
          type: newMasterService.type,
          charge: Number(newMasterService.charge),
        },
      });
      setMasterServices(prev => [...prev, added]);
      setNewMasterService({ name: '', type: 'Installation', charge: '' });
      setShowAddServiceModal(false);
      toast(`Service "${added.name}" created!`);
    } catch (err) {
      setError(`Could not create service: ${err.message}`);
    }
  };

  const handleDeleteMasterService = async (id) => {
    const previous = masterServices;
    setMasterServices(prev => prev.filter(s => s.id !== id));
    try {
      await apiRequest(`/brand/catalog/master-services/${id}`, { method: 'DELETE', auth: true });
      toast('Service deleted.', 2000);
    } catch (err) {
      setMasterServices(previous);
      setError(`Could not delete service: ${err.message}`);
    }
  };

  const serviceTypeColors = {
    Installation: 'bg-blue-50 text-blue-700',
    Repair: 'bg-orange-50 text-orange-700',
    Maintenance: 'bg-purple-50 text-purple-700',
    Inspection: 'bg-teal-50 text-teal-700',
    Finishing: 'bg-pink-50 text-pink-700',
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      <Sidebar />

      <div className="flex-1 ml-64 min-h-screen flex flex-col">
        <Topbar title="Sub-Brands & Service Matrix" />

        <div className="p-6 flex-1 text-left space-y-5">

          {/* Page Header */}
          <div className="bg-gradient-to-r from-[#0D47A1] to-[#1565C0] rounded-2xl p-5 text-white flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/15 rounded-xl flex items-center justify-center">
                <Settings2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-base font-extrabold">Sub-Brands & Service Configuration</h2>
                <p className="text-blue-100 text-xs mt-0.5 font-medium">Manage services, sub-brands, products and service mappings from one place</p>
              </div>
            </div>
            <div className="flex gap-6 text-right">
              <div>
                <span className="text-[10px] font-bold text-blue-200 uppercase tracking-widest block">Services</span>
                <span className="text-2xl font-black">{masterServices.length}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-blue-200 uppercase tracking-widest block">Sub-Brands</span>
                <span className="text-2xl font-black">{subBrands.length}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-blue-200 uppercase tracking-widest block">Products</span>
                <span className="text-2xl font-black">{subBrands.reduce((a, s) => a + (s.products?.length || 0), 0)}</span>
              </div>
            </div>
          </div>

          {/* Tab Bar */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
            <div className="flex border-b border-[#E2E8F0]">
              <button
                onClick={() => setActiveTab('services')}
                className={`flex items-center gap-2 px-6 py-3.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'services'
                    ? 'border-[#0D47A1] text-[#0D47A1] bg-blue-50/30'
                    : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                }`}
              >
                <ListChecks size={14} />
                Services Master List
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${activeTab === 'services' ? 'bg-[#0D47A1] text-white' : 'bg-slate-100 text-slate-500'}`}>
                  {masterServices.length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('subbrands')}
                className={`flex items-center gap-2 px-6 py-3.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'subbrands'
                    ? 'border-[#0D47A1] text-[#0D47A1] bg-blue-50/30'
                    : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Building2 size={14} />
                Sub-Brands & Products
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${activeTab === 'subbrands' ? 'bg-[#0D47A1] text-white' : 'bg-slate-100 text-slate-500'}`}>
                  {subBrands.length}
                </span>
              </button>
            </div>

            {/* ── TAB: Services Master List ── */}
            {activeTab === 'services' && (
              <div className="p-5">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-800">All Services</h3>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">Define your service catalog here. These services can then be mapped to products.</p>
                  </div>
                  <button
                    onClick={() => setShowAddServiceModal(true)}
                    className="bg-[#0D47A1] hover:bg-blue-800 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm transition-colors"
                  >
                    <Plus size={14} /> Add Service
                  </button>
                </div>

                {masterServices.length === 0 ? (
                  <div className="text-center py-14 border border-dashed border-slate-200 rounded-xl">
                    <ListChecks size={32} className="text-slate-200 mx-auto mb-3" />
                    <p className="text-sm font-bold text-slate-400">No services created yet</p>
                    <p className="text-xs text-slate-300 mt-1">Click "Add Service" to define your first service.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {masterServices.map(svc => (
                      <div key={svc.id} className="border border-slate-150 rounded-xl p-4 flex items-center justify-between bg-white hover:shadow-sm hover:border-slate-200 transition-all">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${serviceTypeColors[svc.type]?.replace('text-', 'bg-').split(' ')[0] || 'bg-slate-100'}`}>
                            <Wrench size={14} className={serviceTypeColors[svc.type]?.split(' ')[1] || 'text-slate-500'} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 truncate">{svc.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${serviceTypeColors[svc.type] || 'bg-slate-100 text-slate-600'}`}>{svc.type}</span>
                              <span className="text-[10px] font-extrabold text-green-600">₹{svc.charge.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteMasterService(svc.id)}
                          className="p-1.5 text-slate-300 hover:text-red-500 rounded-lg transition-colors cursor-pointer shrink-0 ml-2"
                          title="Delete service"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── TAB: Sub-Brands & Products ── */}
            {activeTab === 'subbrands' && (
              <div className="p-5">
                <div className="grid grid-cols-12 gap-5 items-start">

                  {/* Left: Sub-Brands List */}
                  <div className="col-span-4 border border-[#E2E8F0] rounded-xl overflow-hidden">
                    <div className="p-3 border-b border-[#E2E8F0] bg-slate-50/50 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Building2 size={13} className="text-[#0D47A1]" />
                        <span className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">Sub-Brands</span>
                      </div>
                      <button
                        onClick={() => setShowAddSubBrandModal(true)}
                        className="bg-[#0D47A1] hover:bg-blue-800 text-white text-[9px] font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer shadow-sm transition-colors"
                      >
                        <Plus size={10} /> Add Sub-brand
                      </button>
                    </div>

                    <div className="p-2 space-y-1.5">
                      {subBrands.length === 0 ? (
                        <div className="text-center py-8 text-xs text-slate-400 italic">No sub-brands yet.</div>
                      ) : (
                        subBrands.map(sub => {
                          const isActive = selectedSubBrandId === sub.id;
                          return (
                            <button
                              key={sub.id}
                              onClick={() => { setSelectedSubBrandId(sub.id); setExpandedProductId(null); }}
                              className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                                isActive ? 'bg-[#EEF4FF] border-[#0D47A1]' : 'bg-white border-slate-150 hover:bg-slate-50'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[9px] font-black shrink-0 ${isActive ? 'bg-[#0D47A1] text-white' : 'bg-slate-100 text-slate-500'}`}>
                                    {sub.name.charAt(0)}
                                  </div>
                                  <div className="min-w-0">
                                    <p className={`text-xs font-bold truncate ${isActive ? 'text-[#0D47A1]' : 'text-slate-700'}`}>{sub.name}</p>
                                    <p className="text-[9px] text-slate-400 font-medium truncate">{sub.category}</p>
                                  </div>
                                </div>
                                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full shrink-0 ${isActive ? 'bg-[#0D47A1] text-white' : 'bg-slate-100 text-slate-500'}`}>
                                  {(sub.products || []).length}
                                </span>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Right: Products & Services */}
                  <div className="col-span-8">
                    {!selectedSub ? (
                      <div className="border border-dashed border-slate-200 rounded-xl p-12 text-center">
                        <Building2 size={30} className="text-slate-200 mx-auto mb-2" />
                        <p className="text-sm font-bold text-slate-400">Select a sub-brand to manage its products</p>
                      </div>
                    ) : (
                      <div className="border border-[#E2E8F0] rounded-xl overflow-hidden">
                        <div className="p-4 bg-slate-50/50 border-b border-[#E2E8F0] flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-[#0D47A1] rounded-xl flex items-center justify-center text-white font-black text-sm">
                              {selectedSub.name.charAt(0)}
                            </div>
                            <div>
                              <h3 className="text-sm font-extrabold text-slate-800">{selectedSub.name}</h3>
                              <span className="text-[9px] font-bold text-slate-400 uppercase bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{selectedSub.category}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => setShowAddSubProductModal(true)}
                            className="bg-[#0D47A1] hover:bg-blue-800 text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm transition-colors"
                          >
                            <Boxes size={13} /> Add Product
                          </button>
                        </div>

                        <div className="p-4 space-y-3">
                          <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">Products &amp; Their Available Services</span>

                          {(selectedSub.products || []).length === 0 ? (
                            <div className="text-center py-8 border border-dashed border-slate-200 rounded-xl">
                              <Boxes size={26} className="text-slate-200 mx-auto mb-2" />
                              <p className="text-xs text-slate-400 font-semibold">No products added yet.</p>
                              <p className="text-[10px] text-slate-300 mt-0.5">Click "Add Product" above.</p>
                            </div>
                          ) : (
                            <div className="space-y-2.5">
                              {(selectedSub.products || []).map(prod => {
                                const isOpen = expandedProductId === prod.id;
                                return (
                                  <div key={prod.id} className="border border-slate-200 rounded-xl overflow-hidden">
                                    <div className="p-3 bg-white flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
                                          <Wrench size={14} />
                                        </div>
                                        <div>
                                          <p className="text-xs font-bold text-slate-800">{prod.name}</p>
                                          <p className="text-[10px] font-mono text-slate-400">Model: {prod.model}</p>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full border border-slate-200">
                                          {(prod.services || []).length} Services
                                        </span>
                                        <button
                                          onClick={() => { setMappingProductId(prod.id); setShowMapServiceModal(true); }}
                                          className="bg-indigo-600 hover:bg-indigo-700 text-white text-[9px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                                        >
                                          <Plus size={10} /> Map Service
                                        </button>
                                        <button
                                          onClick={() => setExpandedProductId(isOpen ? null : prod.id)}
                                          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                        >
                                          {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                        </button>
                                      </div>
                                    </div>

                                    {isOpen && (
                                      <div className="border-t border-slate-100 bg-slate-50/40 p-3">
                                        {(prod.services || []).length === 0 ? (
                                          <p className="text-xs text-slate-400 italic text-center py-3">No services mapped yet — click "Map Service".</p>
                                        ) : (
                                          <div className="space-y-1.5">
                                            {(prod.services || []).map(svc => (
                                              <div key={svc.id} className="bg-white border border-slate-150 rounded-lg px-3 py-2 flex items-center justify-between">
                                                <div className="flex items-center gap-2.5">
                                                  <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full ${serviceTypeColors[svc.type] || 'bg-slate-100 text-slate-600'}`}>
                                                    {svc.type}
                                                  </span>
                                                  <span className="text-xs font-semibold text-slate-700">{svc.name}</span>
                                                </div>
                                                <div className="flex items-center gap-2.5">
                                                  <span className="text-xs font-extrabold text-green-600">₹{svc.charge.toLocaleString()}</span>
                                                  <button onClick={() => handleDeleteService(prod.id, svc.id)} className="p-1 text-slate-300 hover:text-red-500 rounded transition-colors cursor-pointer" title="Remove">
                                                    <Trash2 size={12} />
                                                  </button>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              </div>
            )}
          </div>

        </div>


        {/* ── Modal: Add Service ── */}
        {showAddServiceModal && (
          <div className="fixed inset-0 bg-black/25 backdrop-blur-sm z-40 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
              <div className="p-5 border-b border-[#E2E8F0] flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2">
                  <ListChecks size={18} className="text-[#0D47A1]" />
                  <h2 className="text-sm font-extrabold text-slate-800">Create New Service</h2>
                </div>
                <button onClick={() => setShowAddServiceModal(false)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer">
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleAddServiceSubmit} className="p-5 space-y-4 text-sm">
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1.5 block uppercase tracking-wider">Service Name *</label>
                  <input
                    type="text" required
                    className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-xl focus:ring-2 focus:ring-[#0D47A1] outline-none text-slate-800 bg-[#F8FAFC] text-sm"
                    placeholder="e.g. Tiles Laying & Installation"
                    value={newMasterService.name}
                    onChange={(e) => setNewMasterService({ ...newMasterService, name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-1.5 block uppercase tracking-wider">Service Type *</label>
                    <select
                      className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-xl focus:ring-2 focus:ring-[#0D47A1] outline-none text-slate-800 bg-[#F8FAFC] text-sm"
                      value={newMasterService.type}
                      onChange={(e) => setNewMasterService({ ...newMasterService, type: e.target.value })}
                    >
                      <option>Installation</option>
                      <option>Repair</option>
                      <option>Maintenance</option>
                      <option>Inspection</option>
                      <option>Finishing</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-1.5 block uppercase tracking-wider">Charge (INR) *</label>
                    <input
                      type="number" required
                      className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-xl focus:ring-2 focus:ring-[#0D47A1] outline-none text-slate-800 bg-[#F8FAFC] text-sm"
                      placeholder="e.g. 1200"
                      value={newMasterService.charge}
                      onChange={(e) => setNewMasterService({ ...newMasterService, charge: e.target.value })}
                    />
                  </div>
                </div>
                <div className="pt-3 border-t border-[#E2E8F0] flex gap-3 justify-end">
                  <button type="button" onClick={() => setShowAddServiceModal(false)} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50 cursor-pointer">Cancel</button>
                  <button type="submit" className="px-5 py-2 rounded-xl text-sm font-bold bg-[#0D47A1] text-white hover:bg-blue-700 shadow-sm cursor-pointer">Create Service</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── Modal: Add Sub-brand ── */}
        {showAddSubBrandModal && (
          <div className="fixed inset-0 bg-black/25 backdrop-blur-sm z-40 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
              <div className="p-5 border-b border-[#E2E8F0] flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2">
                  <Building2 size={18} className="text-[#0D47A1]" />
                  <h2 className="text-sm font-extrabold text-slate-800">Create New Sub-Brand</h2>
                </div>
                <button onClick={() => setShowAddSubBrandModal(false)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer">
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleAddSubBrandSubmit} className="p-5 space-y-4 text-sm">
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1.5 block uppercase tracking-wider">Sub-brand Name *</label>
                  <input
                    type="text" required
                    className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-xl focus:ring-2 focus:ring-[#0D47A1] outline-none text-slate-800 bg-[#F8FAFC] text-sm"
                    placeholder="e.g. Somany Ceramica"
                    value={newSubBrand.name}
                    onChange={(e) => setNewSubBrand({ ...newSubBrand, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1.5 block uppercase tracking-wider">Category / Niche</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-xl focus:ring-2 focus:ring-[#0D47A1] outline-none text-slate-800 bg-[#F8FAFC] text-sm"
                    placeholder="e.g. Tiles & Ceramic"
                    value={newSubBrand.category}
                    onChange={(e) => setNewSubBrand({ ...newSubBrand, category: e.target.value })}
                  />
                </div>
                <div className="pt-3 border-t border-[#E2E8F0] flex gap-3 justify-end">
                  <button type="button" onClick={() => setShowAddSubBrandModal(false)} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50 cursor-pointer">Cancel</button>
                  <button type="submit" className="px-5 py-2 rounded-xl text-sm font-bold bg-[#0D47A1] text-white hover:bg-blue-700 shadow-sm cursor-pointer">Create Sub-Brand</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── Modal: Add Product ── */}
        {showAddSubProductModal && (
          <div className="fixed inset-0 bg-black/25 backdrop-blur-sm z-40 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
              <div className="p-5 border-b border-[#E2E8F0] flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2">
                  <Boxes size={18} className="text-[#0D47A1]" />
                  <div>
                    <h2 className="text-sm font-extrabold text-slate-800">Add Product</h2>
                    <p className="text-[10px] text-slate-400 font-medium">Under: {selectedSub?.name}</p>
                  </div>
                </div>
                <button onClick={() => setShowAddSubProductModal(false)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer">
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleAddSubProductSubmit} className="p-5 space-y-4 text-sm">
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1.5 block uppercase tracking-wider">Product Name *</label>
                  <input
                    type="text" required
                    className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-xl focus:ring-2 focus:ring-[#0D47A1] outline-none text-slate-800 bg-[#F8FAFC] text-sm"
                    placeholder="e.g. Duragres Tiles"
                    value={newSubProduct.name}
                    onChange={(e) => setNewSubProduct({ ...newSubProduct, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1.5 block uppercase tracking-wider">Model Code *</label>
                  <input
                    type="text" required
                    className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-xl focus:ring-2 focus:ring-[#0D47A1] outline-none text-slate-800 bg-[#F8FAFC] text-sm"
                    placeholder="e.g. SMY-DG-102"
                    value={newSubProduct.model}
                    onChange={(e) => setNewSubProduct({ ...newSubProduct, model: e.target.value })}
                  />
                </div>
                <label className="flex items-center gap-2.5 cursor-pointer py-1">
                  <input
                    type="checkbox"
                    checked={newSubProduct.configureDefaultServices}
                    onChange={(e) => setNewSubProduct({ ...newSubProduct, configureDefaultServices: e.target.checked })}
                    className="h-4 w-4 text-[#0D47A1] rounded cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-slate-600">Auto-add default Installation &amp; Inspection services</span>
                </label>
                <div className="pt-3 border-t border-[#E2E8F0] flex gap-3 justify-end">
                  <button type="button" onClick={() => setShowAddSubProductModal(false)} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50 cursor-pointer">Cancel</button>
                  <button type="submit" className="px-5 py-2 rounded-xl text-sm font-bold bg-[#0D47A1] text-white hover:bg-blue-700 shadow-sm cursor-pointer">Add Product</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── Modal: Map Service ── */}
        {showMapServiceModal && (
          <div className="fixed inset-0 bg-black/25 backdrop-blur-sm z-40 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
              <div className="p-5 border-b border-[#E2E8F0] flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2">
                  <Wrench size={18} className="text-indigo-600" />
                  <div>
                    <h2 className="text-sm font-extrabold text-slate-800">Map Service to Product</h2>
                    <p className="text-[10px] text-slate-400 font-medium">
                      {(selectedSub?.products || []).find(p => p.id === mappingProductId)?.name}
                    </p>
                  </div>
                </div>
                <button onClick={() => setShowMapServiceModal(false)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer">
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleMapServiceSubmit} className="p-5 space-y-4 text-sm">
                {/* A product's services are references to master services, so
                    this picks from that list rather than defining a new one.
                    Services already mapped to this product are filtered out. */}
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1.5 block uppercase tracking-wider">Master Service *</label>
                  {(() => {
                    const product = (selectedSub?.products || []).find(p => p.id === mappingProductId);
                    const mapped = new Set((product?.services || []).map(s => s.id));
                    const available = masterServices.filter(s => !mapped.has(s.id));
                    return (
                      <>
                        <select
                          required
                          className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-xl focus:ring-2 focus:ring-[#0D47A1] outline-none text-slate-800 bg-[#F8FAFC] text-sm"
                          value={newService.id || ''}
                          onChange={(e) => setNewService({ ...newService, id: e.target.value })}
                        >
                          <option value="">Select a service…</option>
                          {available.map(s => (
                            <option key={s.id} value={s.id}>{s.name} — {s.type} (₹{s.charge})</option>
                          ))}
                        </select>
                        {available.length === 0 && (
                          <p className="text-[10px] text-slate-400 mt-1.5">
                            {masterServices.length === 0
                              ? 'No master services defined yet — create one on the Services tab first.'
                              : 'Every master service is already mapped to this product.'}
                          </p>
                        )}
                      </>
                    );
                  })()}
                </div>
                <div className="pt-3 border-t border-[#E2E8F0] flex gap-3 justify-end">
                  <button type="button" onClick={() => setShowMapServiceModal(false)} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50 cursor-pointer">Cancel</button>
                  <button type="submit" className="px-5 py-2 rounded-xl text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm cursor-pointer">Map Service</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Success Toast */}
        {successMessage && (
          <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-[#0D47A1] text-white text-xs font-semibold px-5 py-2.5 rounded-full shadow-lg flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-300" />
            {successMessage}
          </div>
        )}
      </div>
    </div>
  );
};

export default Catalog;
