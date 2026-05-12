import React from 'react';
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
  MoreVertical
} from 'lucide-react';

const Inventory = () => {
  const stats = [
    { title: 'Total Inventory', value: '1,420', icon: <Package size={20} />, color: 'bg-blue-600' },
    { title: 'Low Stock Items', value: '12', icon: <AlertTriangle size={20} />, color: 'bg-yellow-600' },
    { title: 'Out of Stock', value: '5', icon: <XCircle size={20} />, color: 'bg-red-600' },
    { title: 'Dispatch Pending', value: '24', icon: <Truck size={20} />, color: 'bg-purple-600' },
  ];

  const [parts, setParts] = React.useState([
    { id: 'SKU-9001', name: 'Compressor', category: 'Refrigerator', compatible: 'LG-REF-450', stock: 15, price: '₹4,500', status: 'In Stock' },
    { id: 'SKU-9002', name: 'Drain Pump', category: 'Washing Machine', compatible: 'LG-WM-70', stock: 3, price: '₹1,200', status: 'Low Stock' },
    { id: 'SKU-9003', name: 'Magnetron', category: 'Microwave', compatible: 'LG-MW-20', stock: 0, price: '₹2,100', status: 'Out of Stock' },
    { id: 'SKU-9004', name: 'Display Panel', category: 'Smart TV', compatible: 'LG-55OLEDEV', stock: 8, price: '₹12,000', status: 'In Stock' },
  ]);

  const handleDispatch = (id) => {
    setParts(parts.map(p => {
      if (p.id === id && p.stock > 0) {
        const newStock = p.stock - 1;
        return { 
          ...p, 
          stock: newStock,
          status: newStock === 0 ? 'Out of Stock' : newStock < 5 ? 'Low Stock' : 'In Stock'
        };
      }
      return p;
    }));
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
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
                  className="w-full pl-10 pr-4 py-2 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] focus:border-[#0D47A1] outline-none transition-all text-sm bg-[#F8FAFC]"
                  placeholder="Search Part Name or SKU..."
                />
              </div>

              {/* Filters */}
              <select className="text-sm text-[#1E293B] border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#0D47A1] bg-[#F8FAFC]">
                <option>All Categories</option>
                <option>Refrigerator</option>
                <option>Washing Machine</option>
                <option>Microwave</option>
                <option>Smart TV</option>
              </select>

              <select className="text-sm text-[#1E293B] border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#0D47A1] bg-[#F8FAFC]">
                <option>Availability</option>
                <option>In Stock</option>
                <option>Low Stock</option>
                <option>Out of Stock</option>
              </select>
            </div>

            <button className="bg-[#0D47A1] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2">
              <Plus size={16} /> Add Inventory
            </button>
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
                  {parts.map((part) => (
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
                          <button className="p-2 text-[#64748B] hover:text-[#0D47A1] hover:bg-[#EEF4FF] rounded-lg transition-colors" title="Edit Stock">
                            <Edit size={16} />
                          </button>
                          <button 
                            onClick={() => handleDispatch(part.id)}
                            className="p-2 text-[#64748B] hover:text-[#0D47A1] hover:bg-[#EEF4FF] rounded-lg transition-colors" 
                            title="Dispatch"
                          >
                            <ArrowRight size={16} />
                          </button>
                          <button className="p-2 text-[#64748B] hover:text-[#1E293B] hover:bg-[#F8FAFC] rounded-lg transition-colors">
                            <MoreVertical size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Inventory;
