import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/brand-admin/Sidebar';
import Topbar from '../../components/brand-admin/Topbar';
import { 
  Package, 
  AlertTriangle, 
  XCircle, 
  Truck, 
  Search, 
  Filter, 
  Plus, 
  Edit, 
  ArrowRight,
  MoreVertical,
  X,
  CheckCircle2
} from 'lucide-react';
import { apiRequest } from '../../lib/apiClient';

const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

// Rows are aggregated per SKU across the technicians serving this brand, so
// there is no single owning technician — `technicians` is how many carry it.
function shape(item) {
  return {
    id: item.sku,
    name: item.name,
    category: '—',
    compatible: `${item.technicians} technician${item.technicians === 1 ? '' : 's'}`,
    stock: item.totalQty,
    price: currency.format(item.price || 0),
    status: item.status,
  };
}

const Inventory = () => {
  const [parts, setParts] = useState([]);
  const STOCK_READ_ONLY =
    'Stock belongs to each technician\'s own van inventory — a brand console can view it but not change it.';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function loadInventory() {
      try {
        // Stock held by the technicians who work this brand's jobs — a brand
        // does not own parts, so this is the closest real answer.
        const data = await apiRequest('/brand/inventory', { auth: true });
        if (!cancelled) setParts((data?.data || []).map(shape));
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadInventory();
    return () => { cancelled = true; };
  }, []);

  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPart, setSelectedPart] = useState(null);
  const [newPart, setNewPart] = useState({ name: '', category: 'Refrigerator', compatible: '', stock: '', price: '' });
  const [editStockValue, setEditStockValue] = useState('');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [selectedAvailability, setSelectedAvailability] = useState('Availability');
  const [successMessage, setSuccessMessage] = useState('');

  const showToast = (message) => {
    setSuccessMessage(message);
    setTimeout(() => {
      setSuccessMessage('');
    }, 3000);
  };

  const handleDispatch = (id) => {
    const part = parts.find(p => p.id === id);
    if (!part) return;
    if (part.stock === 0) {
      showToast(`Cannot dispatch: SKU ${id} is out of stock!`);
      return;
    }

    setError(STOCK_READ_ONLY);
  };

  // Adding a part here only ever pushed a row into browser state — this view
  // is an aggregate of what the brand's technicians carry in their vans, not a
  // catalogue the brand owns, so there is nothing to add to.
  const handleAddPartSubmit = (e) => {
    e.preventDefault();
    setShowModal(false);
    setError(STOCK_READ_ONLY);
  };

  const handleEditStockClick = (part) => {
    setSelectedPart(part);
    setEditStockValue(String(part.stock));
    setShowEditModal(true);
  };

  const handleEditStockSubmit = (e) => {
    e.preventDefault();
    setShowEditModal(false);
    setError(STOCK_READ_ONLY);
  };

  const filteredParts = parts.filter(part => {
    const matchesSearch = part.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          part.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          part.compatible.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All Categories' || part.category === selectedCategory;
    const matchesAvailability = selectedAvailability === 'Availability' || part.status === selectedAvailability;
    return matchesSearch && matchesCategory && matchesAvailability;
  });

  const totalPartsCount = parts.reduce((acc, curr) => acc + curr.stock, 0);
  const lowStockCount = parts.filter(p => p.status === 'Low Stock').length;
  const outOfStockCount = parts.filter(p => p.status === 'Out of Stock').length;

  // "Dispatch Pending" belonged to part orders, not stock — it lives on the
  // Part Requests screen, which has the real figure.
  const stats = [
    { title: 'Total Inventory', value: String(totalPartsCount), icon: <Package size={20} />, color: 'bg-blue-600' },
    { title: 'Low Stock Items', value: String(lowStockCount), icon: <AlertTriangle size={20} />, color: 'bg-yellow-600' },
    { title: 'Out of Stock', value: String(outOfStockCount), icon: <XCircle size={20} />, color: 'bg-red-600' },
    { title: 'Distinct SKUs', value: String(parts.length), icon: <Truck size={20} />, color: 'bg-purple-600' },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex relative">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 ml-64 min-h-screen flex flex-col">
        {/* Topbar */}
        <Topbar title="Spare Parts Inventory" />

        {/* Body */}
        <div className="p-6 space-y-6 flex-1">
          
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <div key={index} className="bg-white p-6 rounded-2xl border border-[#E2E8F0] flex items-center gap-4">
                <div className={`w-12 h-12 ${stat.color} rounded-xl flex items-center justify-center text-white flex-shrink-0`}>
                  {stat.icon}
                </div>
                <div>
                  <p className="text-xs font-medium text-[#64748B]">{stat.title}</p>
                  <p className="text-2xl font-bold text-[#1E293B]">{stat.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Filters & Search */}
          <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] flex flex-wrap gap-4 items-center justify-between">
            <div className="flex flex-wrap gap-3 items-center flex-1">
              {/* Search */}
              <div className="relative w-64">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#64748B]">
                  <Search size={16} />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] focus:border-[#0D47A1] outline-none transition-all text-sm bg-[#F8FAFC]"
                  placeholder="Search Part Name or SKU..."
                />
              </div>

              {/* Filters */}
              <select 
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="text-sm text-[#1E293B] border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#0D47A1] bg-[#F8FAFC]"
              >
                <option>All Categories</option>
                <option>Refrigerator</option>
                <option>Washing Machine</option>
                <option>Microwave</option>
                <option>Smart TV</option>
              </select>

              <select 
                value={selectedAvailability}
                onChange={(e) => setSelectedAvailability(e.target.value)}
                className="text-sm text-[#1E293B] border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#0D47A1] bg-[#F8FAFC]"
              >
                <option>Availability</option>
                <option>In Stock</option>
                <option>Low Stock</option>
                <option>Out of Stock</option>
              </select>
            </div>

            <div className="flex gap-2">
              <button 
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('All Categories');
                  setSelectedAvailability('Availability');
                  showToast('Filters reset successfully');
                }}
                className="bg-white text-[#1E293B] border border-[#E2E8F0] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#F8FAFC] transition-colors"
              >
                Reset Filters
              </button>
              <button 
                onClick={() => setShowModal(true)}
                className="bg-[#0D47A1] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Plus size={16} /> Add Inventory
              </button>
            </div>
          </div>

          {/* Inventory Table */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-[#F8FAFC] text-[#64748B] text-xs uppercase">
                  <tr>
                    <th className="px-6 py-4">Part Details</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4">Compatible Appliance</th>
                    <th className="px-6 py-4">Stock</th>
                    <th className="px-6 py-4">Price</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {loading && (
                    <tr><td colSpan={8} className="px-6 py-10 text-center text-[#64748B] font-semibold">Loading inventory…</td></tr>
                  )}
                  {!loading && error && (
                    <tr><td colSpan={8} className="px-6 py-10 text-center text-red-600 font-semibold">{error}</td></tr>
                  )}
                  {!loading && !error && filteredParts.length === 0 && (
                    <tr><td colSpan={8} className="px-6 py-10 text-center text-[#64748B] font-semibold">No stock held by technicians serving this brand.</td></tr>
                  )}
                  {filteredParts.map((part) => (
                    <tr key={part.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-[#EEF4FF] rounded-lg flex items-center justify-center text-[#0D47A1]">
                            <Package size={20} />
                          </div>
                          <div>
                            <p className="text-[#1E293B] font-medium">{part.name}</p>
                            <p className="text-[#64748B] text-xs">{part.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-[#1E293B]">{part.category}</td>
                      <td className="px-6 py-4 text-[#64748B]">{part.compatible}</td>
                      <td className="px-6 py-4 font-medium text-[#1E293B]">{part.stock} pcs</td>
                      <td className="px-6 py-4 font-medium text-[#1E293B]">{part.price}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
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
                            onClick={() => handleEditStockClick(part)}
                            className="p-2 text-[#64748B] hover:text-[#0D47A1] hover:bg-[#EEF4FF] rounded-lg transition-colors" 
                            title="Edit Stock"
                          >
                            <Edit size={16} />
                          </button>
                          <button 
                            onClick={() => handleDispatch(part.id)}
                            className="p-2 text-[#64748B] hover:text-[#0D47A1] hover:bg-[#EEF4FF] rounded-lg transition-colors" 
                            title="Dispatch"
                          >
                            <ArrowRight size={16} />
                          </button>
                          <button 
                            onClick={() => handleEditStockClick(part)}
                            className="p-2 text-[#64748B] hover:text-[#1E293B] hover:bg-[#F8FAFC] rounded-lg transition-colors"
                          >
                            <MoreVertical size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredParts.length === 0 && (
                    <tr>
                      <td colSpan="7" className="px-6 py-10 text-center text-sm text-[#64748B]">
                        No inventory spare parts found matching search or filter criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>

      {/* Add Inventory Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-[#E2E8F0] flex justify-between items-center">
              <h2 className="text-lg font-bold text-[#1E293B]">Add New Spare Part</h2>
              <button 
                onClick={() => setShowModal(false)}
                className="text-[#64748B] hover:text-[#1E293B] p-2 hover:bg-[#F8FAFC] rounded-full"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddPartSubmit} className="p-6 space-y-4 text-sm text-left">
              <div>
                <label className="text-xs font-semibold text-[#64748B] mb-1 block">Part Name</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] outline-none text-slate-800 bg-[#F8FAFC]"
                  placeholder="e.g. Compressor Coil"
                  value={newPart.name}
                  onChange={(e) => setNewPart({ ...newPart, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-[#64748B] mb-1 block">Category</label>
                  <select
                    className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] outline-none text-slate-800 bg-[#F8FAFC]"
                    value={newPart.category}
                    onChange={(e) => setNewPart({ ...newPart, category: e.target.value })}
                  >
                    <option>Refrigerator</option>
                    <option>Washing Machine</option>
                    <option>Microwave</option>
                    <option>Smart TV</option>
                    <option>AC</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#64748B] mb-1 block">Compatible Model</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] outline-none text-slate-800 bg-[#F8FAFC]"
                    placeholder="e.g. LG-REF-450"
                    value={newPart.compatible}
                    onChange={(e) => setNewPart({ ...newPart, compatible: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-[#64748B] mb-1 block">Price (INR)</label>
                  <input
                    type="number"
                    required
                    className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] outline-none text-slate-800 bg-[#F8FAFC]"
                    placeholder="e.g. 4500"
                    value={newPart.price}
                    onChange={(e) => setNewPart({ ...newPart, price: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#64748B] mb-1 block">Initial Quantity</label>
                  <input
                    type="number"
                    required
                    className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] outline-none text-slate-800 bg-[#F8FAFC]"
                    placeholder="e.g. 10"
                    value={newPart.stock}
                    onChange={(e) => setNewPart({ ...newPart, stock: e.target.value })}
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-[#E2E8F0] flex gap-3 justify-end text-sm">
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="bg-white text-[#64748B] border border-[#E2E8F0] px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-[#F8FAFC] transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="bg-[#0D47A1] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
                >
                  Save Part
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Stock Modal */}
      {showEditModal && selectedPart && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-[#E2E8F0] flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-[#1E293B]">Adjust Spare Part Stock</h2>
                <p className="text-xs text-[#0D47A1] font-semibold">{selectedPart.name} ({selectedPart.id})</p>
              </div>
              <button 
                onClick={() => setShowEditModal(false)}
                className="text-[#64748B] hover:text-[#1E293B] p-2 hover:bg-[#F8FAFC] rounded-full"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditStockSubmit} className="p-6 space-y-4 text-sm text-left">
              <div>
                <label className="text-xs font-semibold text-[#64748B] mb-1 block">New Stock Count (pcs)</label>
                <input
                  type="number"
                  required
                  min="0"
                  className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] outline-none text-slate-800 bg-[#F8FAFC]"
                  value={editStockValue}
                  onChange={(e) => setEditStockValue(e.target.value)}
                />
              </div>

              <div className="pt-4 border-t border-[#E2E8F0] flex gap-3 justify-end text-sm">
                <button 
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="bg-white text-[#64748B] border border-[#E2E8F0] px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-[#F8FAFC] transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="bg-[#0D47A1] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
                >
                  Update Stock
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
