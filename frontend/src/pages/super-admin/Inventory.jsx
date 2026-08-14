import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/super-admin/Sidebar';
import Topbar from '../../components/super-admin/Topbar';
import { 
  Search, 
  Filter, 
  Package, 
  Plus, 
  AlertTriangle, 
  Eye, 
  Edit,
  TrendingDown,
  X,
  CheckCircle2,
  SlidersHorizontal,
  ChevronRight,
  ArrowLeft
} from 'lucide-react';
import { apiRequest } from '../../lib/apiClient';

const Inventory = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('All Brands');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [successMessage, setSuccessMessage] = useState('');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsDrawer, setShowDetailsDrawer] = useState(false);

  // Forms state
  const [newPart, setNewPart] = useState({ name: '', brand: 'LG', category: 'Refrigerator', stock: '', threshold: '', price: '', supplier: '', leadTimeDays: '', status: 'In Stock' });
  const [editingPart, setEditingPart] = useState(null);
  const [selectedPart, setSelectedPart] = useState(null);
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Presentation shape for a SparePartCatalog document. `status` and
  // `retailPrice` are schema virtuals — the server owns both.
  const toPartRow = (p) => ({
    id: p.id,
    humanId: p.humanId || p.id,
    name: p.name,
    brand: p.brand || 'N/A',
    category: p.category || 'General',
    code: p.code || '',
    stock: p.stock ?? 0,
    threshold: p.reorderThreshold ?? 5,
    costPrice: p.costPrice ?? 0,
    markupPercent: p.markupPercent ?? 0,
    supplier: p.supplier || '',
    leadTimeDays: p.leadTimeDays ?? null,
    price: p.retailPrice != null ? `₹${Number(p.retailPrice).toLocaleString('en-IN')}` : 'N/A',
    status: p.status || 'In Stock',
  });

  useEffect(() => {
    const fetchParts = async () => {
      try {
        const data = await apiRequest('/super-admin/spare-parts', { auth: true });
        const list = Array.isArray(data?.data) ? data.data : [];
        setParts(list.map(toPartRow));
      } catch (err) {
        setLoadError(err.message || 'Could not load inventory.');
      } finally {
        setLoading(false);
      }
    };
    fetchParts();
  }, []);

  const showToast = (message) => {
    setSuccessMessage(message);
    setTimeout(() => {
      setSuccessMessage('');
    }, 3000);
  };

  const getStatus = (stock, threshold) => {
    if (stock === 0) return 'Out of Stock';
    if (stock <= threshold) return 'Low Stock';
    return 'In Stock';
  };

  // Persists to the catalogue. Both handlers used to mutate local state only, so
  // a part "added" here disappeared on reload and no technician ever saw it.
  const handleAddPartSubmit = async (e) => {
    e.preventDefault();
    if (!newPart.name || newPart.stock === '' || !newPart.price) {
      showToast('Please fill in all required fields.');
      return;
    }

    try {
      const res = await apiRequest('/super-admin/spare-parts', {
        method: 'POST',
        auth: true,
        body: {
          name: newPart.name,
          brand: newPart.brand,
          category: newPart.category,
          costPrice: Number(String(newPart.price).replace(/[₹,]/g, '')) || 0,
          stock: Number(newPart.stock) || 0,
          reorderThreshold: Number(newPart.threshold) || 5,
          supplier: newPart.supplier || undefined,
          leadTimeDays: newPart.leadTimeDays ? Number(newPart.leadTimeDays) : undefined,
        },
      });
      setParts((prev) => [...prev, toPartRow(res.data)]);
      setNewPart({ name: '', brand: 'LG', category: 'Refrigerator', stock: '', threshold: '', price: '', supplier: '', leadTimeDays: '', status: 'In Stock' });
      setShowAddModal(false);
      showToast(`Spare part "${res.data.name}" added.`);
    } catch (err) {
      setLoadError(err.message || 'Could not add the spare part.');
    }
  };

  const handleEditPartSubmit = async (e) => {
    e.preventDefault();
    if (!editingPart.name || editingPart.stock === '' || editingPart.price === '') {
      showToast('Please fill in all required fields.');
      return;
    }

    try {
      const res = await apiRequest(`/super-admin/spare-parts/${editingPart.id}`, {
        method: 'PUT',
        auth: true,
        body: {
          name: editingPart.name,
          brand: editingPart.brand,
          category: editingPart.category,
          costPrice: Number(String(editingPart.price).replace(/[₹,]/g, '')) || 0,
          stock: Number(editingPart.stock) || 0,
          reorderThreshold: Number(editingPart.threshold) || 5,
          supplier: editingPart.supplier || undefined,
          leadTimeDays: editingPart.leadTimeDays ? Number(editingPart.leadTimeDays) : undefined,
        },
      });
      const updated = toPartRow(res.data);
      setParts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      if (selectedPart?.id === updated.id) setSelectedPart(updated);
      setShowEditModal(false);
      setEditingPart(null);
      showToast(`Inventory details for "${updated.name}" updated.`);
    } catch (err) {
      setLoadError(err.message || 'Could not update the spare part.');
    }
  };

  const filteredParts = parts.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.brand.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesBrand = selectedBrand === 'All Brands' || p.brand === selectedBrand;
    const matchesCategory = selectedCategory === 'All Categories' || p.category === selectedCategory;
    return matchesSearch && matchesBrand && matchesCategory;
  });

  const lowStockCount = parts.filter(p => p.stock <= p.threshold).length;

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex relative">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 ml-64 min-h-screen flex flex-col">
        {/* Topbar */}
        <Topbar title="Spare Parts & Inventory" />

        {loadError && (
          <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs font-bold text-red-700">
            {loadError}
          </div>
        )}

        {/* Body */}
        {showDetailsDrawer && selectedPart ? (
          <div className="p-6 space-y-6 flex-1 bg-[#F8FAFC] text-left">
            <div className="flex items-center justify-between">
              <button 
                onClick={() => {
                  setShowDetailsDrawer(false);
                  setSelectedPart(null);
                }}
                className="flex items-center gap-2 text-sm font-semibold text-[#0D47A1] hover:text-blue-800 transition-colors"
              >
                <ArrowLeft size={16} /> Back to Inventory
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden flex flex-col">
              <div className="p-6 border-b border-[#E2E8F0] bg-[#F8FAFC] flex justify-between items-center">
                <div>
                  <span className="text-xs font-bold text-[#0D47A1]">{selectedPart.id}</span>
                  <h3 className="text-lg font-black text-[#1E293B]">{selectedPart.name}</h3>
                </div>
              </div>

              <div className="p-6 space-y-6 flex-1 overflow-y-auto">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <p className="text-xs text-[#64748B] font-semibold">Brand Partner</p>
                      <p className="font-bold text-[#1E293B] mt-1">{selectedPart.brand}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <p className="text-xs text-[#64748B] font-semibold">Appliance Type</p>
                      <p className="font-bold text-[#1E293B] mt-1">{selectedPart.category}</p>
                    </div>
                  </div>

                  <div className="p-4 border border-[#E2E8F0] rounded-xl space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-[#64748B]">Unit Price:</span>
                      <span className="font-bold text-[#1E293B]">{selectedPart.price}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#64748B]">Threshold Alert:</span>
                      <span className="font-semibold text-slate-700">{selectedPart.threshold} units</span>
                    </div>
                    <div className="flex justify-between text-sm border-t border-dashed border-[#E2E8F0] pt-3">
                      <span className="text-[#64748B] font-bold">Current Stock:</span>
                      <span className={`font-black ${selectedPart.stock <= selectedPart.threshold ? 'text-red-600' : 'text-green-600'}`}>
                        {selectedPart.stock} units
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Supply</h4>
                    <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl">
                      <p className="text-xs text-[#0D47A1] font-bold">
                        {selectedPart.supplier ? `Supplier: ${selectedPart.supplier}` : 'No supplier recorded for this part'}
                      </p>
                      <p className="text-xs text-slate-600 mt-1">
                        {selectedPart.leadTimeDays != null ? `Lead time: ${selectedPart.leadTimeDays} day(s). ` : 'Lead time not recorded. '}
                        Re-order threshold: {selectedPart.threshold} unit(s).
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-[#E2E8F0] bg-[#F8FAFC] flex gap-3">
                <button
                  onClick={() => {
                    setEditingPart({ ...selectedPart, price: String(selectedPart.costPrice) });
                    setShowDetailsDrawer(false);
                    setShowEditModal(true);
                  }}
                  className="bg-[#0D47A1] text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors shadow-sm text-center"
                >
                  Adjust Stock / Edit Details
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-6 flex-1">
          
          {/* Header Actions */}
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-[#1E293B]">Central Inventory</h2>
            <button 
              onClick={() => setShowAddModal(true)}
              className="bg-[#0D47A1] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"
            >
              <Plus size={16} /> Add New Part
            </button>
          </div>

          {/* Low Stock Alert Banner */}
          {lowStockCount > 0 && (
            <div className="bg-orange-50 border border-orange-200 p-4 rounded-xl flex items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 flex-shrink-0">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold text-orange-800">Low Stock Warning</p>
                  <p className="text-xs text-orange-700">There are {lowStockCount} items below the minimum threshold. Please restock soon.</p>
                </div>
              </div>
            </div>
          )}

          {/* Filters & Search */}
          <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] flex flex-wrap gap-4 items-center justify-between shadow-sm">
            <div className="flex flex-wrap gap-3 items-center flex-1">
              {/* Search */}
              <div className="relative w-64">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#64748B]">
                  <Search size={16} />
                </div>
                <input
                  type="text"
                  className="w-full pl-10 pr-4 py-2 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] focus:border-[#0D47A1] outline-none transition-all text-sm bg-[#F8FAFC] text-slate-800"
                  placeholder="Search Part Name or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Filters */}
              <select 
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                className="text-sm text-[#1E293B] border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#0D47A1] bg-[#F8FAFC]"
              >
                <option>All Brands</option>
                <option>LG</option>
                <option>Samsung</option>
                <option>Whirlpool</option>
                <option>Havells</option>
              </select>

              <select 
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="text-sm text-[#1E293B] border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#0D47A1] bg-[#F8FAFC]"
              >
                <option>All Categories</option>
                <option>Refrigerator</option>
                <option>TV</option>
                <option>Washing Machine</option>
                <option>Fan</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-[#F8FAFC] text-[#64748B] text-xs uppercase border-b border-[#E2E8F0]">
                  <tr>
                    <th className="px-6 py-4">Part ID</th>
                    <th className="px-6 py-4">Part Name</th>
                    <th className="px-6 py-4">Brand</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4">Current Stock</th>
                    <th className="px-6 py-4">Unit Price</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {filteredParts.map((part) => (
                    <tr key={part.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="px-6 py-4 font-medium text-[#0D47A1]">{part.id}</td>
                      <td className="px-6 py-4 text-[#1E293B] font-medium">{part.name}</td>
                      <td className="px-6 py-4 text-[#1E293B]">{part.brand}</td>
                      <td className="px-6 py-4 text-[#64748B]">{part.category}</td>
                      <td className="px-6 py-4">
                        <span className={`font-semibold ${part.stock <= part.threshold ? 'text-orange-600' : 'text-[#1E293B]'}`}>
                          {part.stock} units
                        </span>
                        {part.stock <= part.threshold && part.stock > 0 && (
                          <span className="ml-2 text-xs text-orange-600 font-semibold bg-orange-50 px-1.5 py-0.5 rounded">(Low)</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-[#1E293B] font-medium">{part.price}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          part.status === 'In Stock' ? 'bg-green-50 text-green-600' :
                          part.status === 'Low Stock' ? 'bg-yellow-50 text-yellow-600' :
                          'bg-red-50 text-red-600'
                        }`}>
                          {part.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button 
                            onClick={() => {
                              setSelectedPart(part);
                              setShowDetailsDrawer(true);
                            }}
                            className="p-1.5 text-[#64748B] hover:text-[#0D47A1] hover:bg-[#EEF4FF] rounded transition-colors" 
                            title="View Details"
                          >
                            <Eye size={16} />
                          </button>
                          <button 
                            onClick={() => {
                              setEditingPart({ ...part, price: String(part.costPrice) });
                              setShowEditModal(true);
                            }}
                            className="p-1.5 text-[#64748B] hover:text-[#0D47A1] hover:bg-[#EEF4FF] rounded transition-colors" 
                            title="Edit"
                          >
                            <Edit size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Empty State */}
            {filteredParts.length === 0 && (
              <div className="text-center py-12 bg-white">
                <Package size={48} className="text-[#64748B] mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-bold text-[#1E293B] mb-1">No Parts Found</h3>
                <p className="text-sm text-[#64748B]">Try adjusting your search or filters.</p>
              </div>
            )}
          </div>

        </div>
        )}
      </div>

      {/* Add New Part Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-[#E2E8F0] pb-3">
              <h3 className="font-bold text-[#1E293B] text-lg">Add New Spare Part</h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-[#64748B] hover:text-[#1E293B] p-1 rounded-full hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddPartSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-[#64748B] mb-1 block">Part Name *</label>
                <input
                  type="text"
                  className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] outline-none text-slate-800 bg-[#F8FAFC]"
                  placeholder="e.g. Compressor Type Y"
                  value={newPart.name}
                  onChange={(e) => setNewPart({ ...newPart, name: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-[#64748B] mb-1 block">Brand *</label>
                  <select
                    className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] outline-none text-slate-800 bg-[#F8FAFC]"
                    value={newPart.brand}
                    onChange={(e) => setNewPart({ ...newPart, brand: e.target.value })}
                  >
                    <option>LG</option>
                    <option>Samsung</option>
                    <option>Whirlpool</option>
                    <option>Havells</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#64748B] mb-1 block">Category *</label>
                  <select
                    className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] outline-none text-slate-800 bg-[#F8FAFC]"
                    value={newPart.category}
                    onChange={(e) => setNewPart({ ...newPart, category: e.target.value })}
                  >
                    <option>Refrigerator</option>
                    <option>TV</option>
                    <option>Washing Machine</option>
                    <option>Fan</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-[#64748B] mb-1 block">Stock Quantity *</label>
                  <input
                    type="number"
                    className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] outline-none text-slate-800 bg-[#F8FAFC]"
                    placeholder="e.g. 50"
                    value={newPart.stock}
                    onChange={(e) => setNewPart({ ...newPart, stock: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#64748B] mb-1 block">Low Stock Alert Level</label>
                  <input
                    type="number"
                    className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] outline-none text-slate-800 bg-[#F8FAFC]"
                    placeholder="e.g. 5"
                    value={newPart.threshold}
                    onChange={(e) => setNewPart({ ...newPart, threshold: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#64748B] mb-1 block">Unit Price (₹) *</label>
                <input
                  type="text"
                  className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] outline-none text-slate-800 bg-[#F8FAFC]"
                  placeholder="e.g. 1500"
                  value={newPart.price}
                  onChange={(e) => setNewPart({ ...newPart, price: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-[#64748B] mb-1 block">Supplier</label>
                  <input
                    type="text"
                    placeholder="e.g. Nigam Spares Ltd"
                    className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] outline-none text-slate-800 bg-[#F8FAFC]"
                    value={newPart.supplier}
                    onChange={(e) => setNewPart({ ...newPart, supplier: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#64748B] mb-1 block">Lead Time (days)</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] outline-none text-slate-800 bg-[#F8FAFC]"
                    value={newPart.leadTimeDays}
                    onChange={(e) => setNewPart({ ...newPart, leadTimeDays: e.target.value })}
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-[#E2E8F0] flex gap-3 justify-end text-sm">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="bg-white text-[#64748B] border border-[#E2E8F0] px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-[#F8FAFC] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#0D47A1] text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
                >
                  Onboard Part
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Part Modal */}
      {showEditModal && editingPart && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-[#E2E8F0] pb-3">
              <h3 className="font-bold text-[#1E293B] text-lg">Edit / Adjust Stock</h3>
              <button 
                onClick={() => {
                  setShowEditModal(false);
                  setEditingPart(null);
                }}
                className="text-[#64748B] hover:text-[#1E293B] p-1 rounded-full hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditPartSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-[#64748B] mb-1 block">Part Name *</label>
                <input
                  type="text"
                  className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] outline-none text-slate-800 bg-[#F8FAFC]"
                  value={editingPart.name}
                  onChange={(e) => setEditingPart({ ...editingPart, name: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-[#64748B] mb-1 block">Stock Count *</label>
                  <input
                    type="number"
                    className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] outline-none text-slate-800 bg-[#F8FAFC]"
                    value={editingPart.stock}
                    onChange={(e) => setEditingPart({ ...editingPart, stock: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#64748B] mb-1 block">Low Stock level</label>
                  <input
                    type="number"
                    className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] outline-none text-slate-800 bg-[#F8FAFC]"
                    value={editingPart.threshold}
                    onChange={(e) => setEditingPart({ ...editingPart, threshold: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#64748B] mb-1 block">Cost Price (₹) *</label>
                <input
                  type="number"
                  min="0"
                  className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] outline-none text-slate-800 bg-[#F8FAFC]"
                  value={editingPart.price}
                  onChange={(e) => setEditingPart({ ...editingPart, price: e.target.value })}
                  required
                />
                <p className="text-[10px] text-slate-500 mt-1">Retail price is derived from cost + {editingPart.markupPercent || 0}% markup.</p>
              </div>

              <div className="pt-4 border-t border-[#E2E8F0] flex gap-3 justify-end text-sm">
                <button 
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingPart(null);
                  }}
                  className="bg-white text-[#64748B] border border-[#E2E8F0] px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-[#F8FAFC] transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="bg-[#0D47A1] text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}



      {/* Success Toast */}
      {successMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="h-4 w-4" />
          {successMessage}
        </div>
      )}
    </div>
  );
};

export default Inventory;
