import React from 'react';
import Sidebar from '../../components/brand-admin/Sidebar';
import Topbar from '../../components/brand-admin/Topbar';
import { 
  UserSquare2, 
  Search, 
  Filter, 
  MoreVertical,
  Eye,
  Mail,
  Phone,
  MapPin
} from 'lucide-react';

const Customers = () => {
  const customers = [
    { id: 'CUST-001', name: 'Amit Sharma', email: 'amit@example.com', phone: '+91 98765 43210', city: 'Delhi', productCount: 2, complaints: 1, warrantyStatus: 'Under Warranty', lastService: '12 May, 2026' },
    { id: 'CUST-002', name: 'Priya Patel', email: 'priya@example.com', phone: '+91 98765 43211', city: 'Mumbai', productCount: 1, complaints: 1, warrantyStatus: 'Out of Warranty', lastService: '12 May, 2026' },
    { id: 'CUST-003', name: 'Rajesh K.', email: 'rajesh@example.com', phone: '+91 98765 43212', city: 'Bangalore', productCount: 3, complaints: 0, warrantyStatus: 'Under Warranty', lastService: '11 May, 2026' },
    { id: 'CUST-004', name: 'Neha Gupta', email: 'neha@example.com', phone: '+91 98765 43213', city: 'Pune', productCount: 1, complaints: 2, warrantyStatus: 'Out of Warranty', lastService: '11 May, 2026' },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 ml-64 min-h-screen flex flex-col">
        {/* Topbar */}
        <Topbar title="Customer Management" />

        {/* Body */}
        <div className="p-6 space-y-6 flex-1">
          
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
                  placeholder="Search Customer Name or ID..."
                />
              </div>

              {/* Filters */}
              <select className="text-sm text-[#1E293B] border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#0D47A1] bg-[#F8FAFC]">
                <option>All Cities</option>
                <option>Delhi</option>
                <option>Mumbai</option>
                <option>Bangalore</option>
              </select>

              <select className="text-sm text-[#1E293B] border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#0D47A1] bg-[#F8FAFC]">
                <option>Warranty Status</option>
                <option>Under Warranty</option>
                <option>Out of Warranty</option>
              </select>
            </div>

            <button className="bg-white text-[#1E293B] border border-[#E2E8F0] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#F8FAFC] transition-colors flex items-center gap-2">
              <Filter size={16} /> More Filters
            </button>
          </div>

          {/* Customers Table */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-[#F8FAFC] text-[#64748B] text-xs uppercase">
                  <tr>
                    <th className="px-6 py-4">Customer</th>
                    <th className="px-6 py-4">Contact</th>
                    <th className="px-6 py-4">Products</th>
                    <th className="px-6 py-4">Complaints</th>
                    <th className="px-6 py-4">Warranty</th>
                    <th className="px-6 py-4">Last Service</th>
                    <th className="px-6 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {customers.map((cust) => (
                    <tr key={cust.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-[#EEF4FF] rounded-full flex items-center justify-center text-[#0D47A1] font-bold">
                            {cust.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <p className="text-[#1E293B] font-medium">{cust.name}</p>
                            <p className="text-[#64748B] text-xs">{cust.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs text-[#64748B] space-y-1">
                          <p className="flex items-center gap-1"><Mail size={12} /> {cust.email}</p>
                          <p className="flex items-center gap-1"><Phone size={12} /> {cust.phone}</p>
                          <p className="flex items-center gap-1"><MapPin size={12} /> {cust.city}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium text-[#1E293B]">{cust.productCount}</td>
                      <td className="px-6 py-4 font-medium text-[#1E293B]">{cust.complaints}</td>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-medium ${cust.warrantyStatus === 'Under Warranty' ? 'text-green-600' : 'text-orange-600'}`}>
                          {cust.warrantyStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-[#64748B]">{cust.lastService}</td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button className="p-1.5 text-[#64748B] hover:text-[#0D47A1] rounded" title="View Profile">
                            <Eye size={16} />
                          </button>
                          <button className="p-1.5 text-[#64748B] hover:text-[#1E293B] rounded">
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

export default Customers;
