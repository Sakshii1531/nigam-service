import React, { useState } from 'react';
import Sidebar from '../../components/super-admin/Sidebar';
import Topbar from '../../components/super-admin/Topbar';
import { 
  Building, 
  Search, 
  Filter, 
  MoreVertical, 
  CheckCircle, 
  XCircle,
  Eye,
  Plus,
  ShieldCheck,
  TrendingUp
} from 'lucide-react';

const Brands = () => {
  const [searchQuery, setSearchQuery] = useState('');
  
  const [brands, setBrands] = useState([
    { id: 'BRD-001', name: 'LG Electronics', category: 'Home Appliances', activeCases: 45, spareStock: 1200, status: 'Active', revenue: '₹4.5L' },
    { id: 'BRD-002', name: 'Samsung', category: 'Electronics & Appliances', activeCases: 32, spareStock: 850, status: 'Active', revenue: '₹3.2L' },
    { id: 'BRD-003', name: 'Whirlpool', category: 'White Goods', activeCases: 12, spareStock: 450, status: 'Active', revenue: '₹2.1L' },
    { id: 'BRD-004', name: 'Havells', category: 'Small Appliances', activeCases: 8, spareStock: 300, status: 'Active', revenue: '₹1.4L' },
    { id: 'BRD-005', name: 'Godrej', category: 'Home Appliances', activeCases: 0, spareStock: 0, status: 'Pending', revenue: '₹0' },
  ]);

  const handleStatusChange = (id, newStatus) => {
    setBrands(brands.map(b => b.id === id ? { ...b, status: newStatus } : b));
  };

  const filteredBrands = brands.filter(b => 
    b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
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
            <button className="bg-[#0D47A1] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2">
              <Plus size={16} /> Add Brand
            </button>
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
                  className="w-full pl-10 pr-4 py-2 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] focus:border-[#0D47A1] outline-none transition-all text-sm bg-[#F8FAFC]"
                  placeholder="Search Brand Name or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Filters */}
              <select className="text-sm text-[#1E293B] border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#0D47A1] bg-[#F8FAFC]">
                <option>All Categories</option>
                <option>Home Appliances</option>
                <option>Small Appliances</option>
              </select>

              <select className="text-sm text-[#1E293B] border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#0D47A1] bg-[#F8FAFC]">
                <option>All Status</option>
                <option>Active</option>
                <option>Pending</option>
              </select>
            </div>

            <button className="bg-white text-[#1E293B] border border-[#E2E8F0] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#F8FAFC] transition-colors flex items-center gap-2">
              <Filter size={16} /> More Filters
            </button>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
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
                    <th className="px-6 py-4">Actions</th>
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
                      <td className="px-6 py-4 font-medium text-green-600 flex items-center gap-1">
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
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button className="p-1.5 text-[#64748B] hover:text-[#0D47A1] hover:bg-[#EEF4FF] rounded" title="View Details">
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
                <Building size={48} className="text-[#64748B] mx-auto mb-4" />
                <h3 className="text-lg font-bold text-[#1E293B] mb-1">No Brands Found</h3>
                <p className="text-sm text-[#64748B]">Try adjusting your search or filters.</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default Brands;
