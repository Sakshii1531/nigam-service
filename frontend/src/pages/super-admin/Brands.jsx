import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Sidebar from '../../components/super-admin/Sidebar';
import Topbar from '../../components/super-admin/Topbar';
import { 
  Building, 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle,
  Eye,
  Plus,
  ShieldCheck,
  TrendingUp,
  X
} from 'lucide-react';

const Brands = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [selectedStatus, setSelectedStatus] = useState('All Status');
  const [successMessage, setSuccessMessage] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [newBrand, setNewBrand] = useState({ name: '', category: 'Home Appliances', activeCases: '0', spareStock: '0', status: 'Active', revenue: '₹0' });

  const [brands, setBrands] = useState([
    { id: 'BRD-001', name: 'LG Electronics', category: 'Home Appliances', activeCases: 45, spareStock: 1200, status: 'Active', revenue: '₹4.5L' },
    { id: 'BRD-002', name: 'Samsung', category: 'Electronics & Appliances', activeCases: 32, spareStock: 850, status: 'Active', revenue: '₹3.2L' },
    { id: 'BRD-003', name: 'Whirlpool', category: 'White Goods', activeCases: 12, spareStock: 450, status: 'Active', revenue: '₹2.1L' },
    { id: 'BRD-004', name: 'Havells', category: 'Small Appliances', activeCases: 8, spareStock: 300, status: 'Active', revenue: '₹1.4L' },
    { id: 'BRD-005', name: 'Godrej', category: 'Home Appliances', activeCases: 0, spareStock: 0, status: 'Pending', revenue: '₹0' },
  ]);

  useEffect(() => {
    if (location.search.includes('add=true')) {
      setShowModal(true);
      // Clean up URL query state
      navigate(location.pathname, { replace: true });
    }
  }, [location, navigate]);

  const showToast = (message) => {
    setSuccessMessage(message);
    setTimeout(() => {
      setSuccessMessage('');
    }, 3000);
  };

  const handleStatusChange = (id, newStatus) => {
    setBrands(brands.map(b => b.id === id ? { ...b, status: newStatus } : b));
    showToast(`Brand status updated to ${newStatus}`);
  };

  const handleAddBrandSubmit = (e) => {
    e.preventDefault();
    if (!newBrand.name) {
      showToast('Please enter a brand name.');
      return;
    }

    const addedBrand = {
      id: `BRD-0${brands.length + 1}`,
      name: newBrand.name,
      category: newBrand.category,
      activeCases: Number(newBrand.activeCases) || 0,
      spareStock: Number(newBrand.spareStock) || 0,
      status: newBrand.status,
      revenue: newBrand.revenue.startsWith('₹') ? newBrand.revenue : `₹${newBrand.revenue}`
    };

    setBrands([addedBrand, ...brands]);
    setNewBrand({ name: '', category: 'Home Appliances', activeCases: '0', spareStock: '0', status: 'Active', revenue: '₹0' });
    setShowModal(false);
    showToast(`Brand "${addedBrand.name}" registered successfully!`);
  };

  const filteredBrands = brands.filter(b => {
    const matchesSearch = b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          b.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All Categories' || b.category === selectedCategory;
    const matchesStatus = selectedStatus === 'All Status' || b.status === selectedStatus;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex relative">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 ml-64 min-h-screen flex flex-col">
        {/* Topbar */}
        <Topbar title="Brand Management" />

        {/* Body */}
        <div className="p-6 space-y-6 flex-1">
          
          {/* Header Actions */}
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-[#1E293B]">Partner Brands</h2>
            <button 
              onClick={() => setShowModal(true)}
              className="bg-[#0D47A1] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"
            >
              <Plus size={16} /> Add Brand
            </button>
          </div>

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
                  placeholder="Search Brand Name or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Filters */}
              <select 
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="text-sm text-[#1E293B] border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#0D47A1] bg-[#F8FAFC]"
              >
                <option>All Categories</option>
                <option>Home Appliances</option>
                <option>Electronics & Appliances</option>
                <option>White Goods</option>
                <option>Small Appliances</option>
              </select>

              <select 
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="text-sm text-[#1E293B] border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#0D47A1] bg-[#F8FAFC]"
              >
                <option>All Status</option>
                <option>Active</option>
                <option>Pending</option>
              </select>
            </div>

            <button 
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('All Categories');
                setSelectedStatus('All Status');
                showToast('Filters reset successfully');
              }}
              className="bg-white text-[#1E293B] border border-[#E2E8F0] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#F8FAFC] transition-colors"
            >
              Reset Filters
            </button>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-[#F8FAFC] text-[#64748B] text-xs uppercase">
                  <tr>
                    <th className="px-6 py-4">Brand</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4">Active Cases</th>
                    <th className="px-6 py-4">Spare Stock</th>
                    <th className="px-6 py-4">Revenue Share</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {filteredBrands.map((brand) => (
                    <tr key={brand.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-[#EEF4FF] rounded-lg flex items-center justify-center text-[#0D47A1] font-bold">
                            {brand.name[0]}
                          </div>
                          <div>
                            <p className="text-[#1E293B] font-medium">{brand.name}</p>
                            <p className="text-[#64748B] text-xs">{brand.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-[#1E293B]">{brand.category}</td>
                      <td className="px-6 py-4 font-medium text-[#1E293B]">{brand.activeCases}</td>
                      <td className="px-6 py-4 text-[#64748B]">{brand.spareStock} units</td>
                      <td className="px-6 py-4 font-semibold text-green-600 flex items-center gap-1">
                        <TrendingUp size={14} /> {brand.revenue}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          brand.status === 'Active' ? 'bg-green-50 text-green-600' :
                          'bg-yellow-50 text-yellow-600'
                        }`}>
                          {brand.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex gap-2 justify-center">
                          <button 
                            onClick={() => showToast(`Opening profile details for brand ${brand.name}...`)}
                            className="p-1.5 text-[#64748B] hover:text-[#0D47A1] hover:bg-[#EEF4FF] rounded" 
                            title="View Details"
                          >
                            <Eye size={16} />
                          </button>
                          
                          {brand.status === 'Pending' ? (
                            <button 
                              onClick={() => handleStatusChange(brand.id, 'Active')}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded" 
                              title="Approve Brand"
                            >
                              <ShieldCheck size={16} />
                            </button>
                          ) : (
                            <button 
                              onClick={() => handleStatusChange(brand.id, 'Pending')}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded" 
                              title="Deactivate"
                            >
                              <XCircle size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Empty State */}
            {filteredBrands.length === 0 && (
              <div className="text-center py-12 bg-white">
                <Building size={48} className="text-[#64748B] mx-auto mb-4 text-slate-400" />
                <h3 className="text-lg font-bold text-[#1E293B] mb-1">No Brands Found</h3>
                <p className="text-sm text-[#64748B]">Try adjusting your search or filters.</p>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Add Brand Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-[#E2E8F0] flex justify-between items-center">
              <h2 className="text-lg font-bold text-[#1E293B]">Onboard Partner Brand</h2>
              <button 
                onClick={() => setShowModal(false)}
                className="text-[#64748B] hover:text-[#1E293B] p-2 hover:bg-[#F8FAFC] rounded-full"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddBrandSubmit} className="p-6 space-y-4 text-sm text-left">
              <div>
                <label className="text-xs font-semibold text-[#64748B] mb-1 block">Brand / Company Name</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] outline-none text-slate-800 bg-[#F8FAFC]"
                  placeholder="e.g. Sony India"
                  value={newBrand.name}
                  onChange={(e) => setNewBrand({ ...newBrand, name: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#64748B] mb-1 block">Product Category</label>
                <select
                  className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] outline-none text-slate-800 bg-[#F8FAFC]"
                  value={newBrand.category}
                  onChange={(e) => setNewBrand({ ...newBrand, category: e.target.value })}
                >
                  <option>Home Appliances</option>
                  <option>Electronics & Appliances</option>
                  <option>White Goods</option>
                  <option>Small Appliances</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-[#64748B] mb-1 block">Initial Spare Stock</label>
                  <input
                    type="number"
                    className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] outline-none text-slate-800 bg-[#F8FAFC]"
                    placeholder="e.g. 500"
                    value={newBrand.spareStock}
                    onChange={(e) => setNewBrand({ ...newBrand, spareStock: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#64748B] mb-1 block">Contract Revenue Share</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] outline-none text-slate-800 bg-[#F8FAFC]"
                    placeholder="e.g. ₹1.2L"
                    value={newBrand.revenue}
                    onChange={(e) => setNewBrand({ ...newBrand, revenue: e.target.value })}
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
                  className="bg-[#0D47A1] text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
                >
                  Onboard Brand
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

export default Brands;
