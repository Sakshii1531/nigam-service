import React, { useState } from 'react';
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
  TrendingDown
} from 'lucide-react';

const Inventory = () => {
  const [searchQuery, setSearchQuery] = useState('');
  
  const [parts, setParts] = useState([
    { id: 'PRT-001', name: 'LG Compressor X', brand: 'LG', category: 'Refrigerator', stock: 45, threshold: 10, price: '₹3,500', status: 'In Stock' },
    { id: 'PRT-002', name: 'Samsung Display Panel', brand: 'Samsung', category: 'TV', stock: 8, threshold: 5, price: '₹8,200', status: 'Low Stock' },
    { id: 'PRT-003', name: 'Whirlpool Drain Pump', brand: 'Whirlpool', category: 'Washing Machine', stock: 2, threshold: 5, price: '₹1,200', status: 'Low Stock' },
    { id: 'PRT-004', name: 'Havells Motor', brand: 'Havells', category: 'Fan', stock: 0, threshold: 3, price: '₹900', status: 'Out of Stock' },
  ]);

  const filteredParts = parts.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.brand.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 ml-64 min-h-screen flex flex-col">
        {/* Topbar */}
        <Topbar title="Spare Parts & Inventory" />

        {/* Body */}
        <div className="p-6 space-y-6 flex-1">
          
          {/* Header Actions */}
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-[#1E293B]">Central Inventory</h2>
            <button className="bg-[#0D47A1] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2">
              <Plus size={16} /> Add New Part
            </button>
          </div>

          {/* Low Stock Alert Banner */}
          <div className="bg-orange-50 border border-orange-200 p-4 rounded-xl flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 flex-shrink-0">
              <AlertTriangle size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-orange-800">Low Stock Warning</p>
              <p className="text-xs text-orange-700">There are 3 items below the minimum threshold. Please restock soon.</p>
            </div>
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
                  placeholder="Search Part Name or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Filters */}
              <select className="text-sm text-[#1E293B] border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#0D47A1] bg-[#F8FAFC]">
                <option>All Brands</option>
                <option>LG</option>
                <option>Samsung</option>
                <option>Whirlpool</option>
              </select>

              <select className="text-sm text-[#1E293B] border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#0D47A1] bg-[#F8FAFC]">
                <option>All Categories</option>
                <option>Refrigerator</option>
                <option>TV</option>
                <option>Washing Machine</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-[#F8FAFC] text-[#64748B] text-xs uppercase">
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
                        <span className={`font-medium ${part.stock <= part.threshold ? 'text-orange-600' : 'text-[#1E293B]'}`}>
                          {part.stock} units
                        </span>
                        {part.stock <= part.threshold && part.stock > 0 && (
                          <span className="ml-2 text-xs text-orange-600 font-medium">(Low)</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-[#1E293B] font-medium">{part.price}</td>
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
                          <button className="p-1.5 text-[#64748B] hover:text-[#0D47A1] hover:bg-[#EEF4FF] rounded" title="View Details">
                            <Eye size={16} />
                          </button>
                          <button className="p-1.5 text-[#64748B] hover:text-[#0D47A1] hover:bg-[#EEF4FF] rounded" title="Edit">
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
                <Package size={48} className="text-[#64748B] mx-auto mb-4" />
                <h3 className="text-lg font-bold text-[#1E293B] mb-1">No Parts Found</h3>
                <p className="text-sm text-[#64748B]">Try adjusting your search or filters.</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default Inventory;
