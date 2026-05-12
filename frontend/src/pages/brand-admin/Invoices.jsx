import React from 'react';
import Sidebar from '../../components/brand-admin/Sidebar';
import Topbar from '../../components/brand-admin/Topbar';
import { 
  Receipt, 
  Clock, 
  CheckCircle2, 
  IndianRupee, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Edit,
  MoreVertical
} from 'lucide-react';

const Invoices = () => {
  const stats = [
    { title: 'Monthly Revenue', value: '₹4.2L', icon: <IndianRupee size={20} />, color: 'bg-emerald-600' },
    { title: 'Paid Amount', value: '₹3.8L', icon: <CheckCircle2 size={20} />, color: 'bg-green-600' },
    { title: 'Pending Payments', value: '₹40K', icon: <Clock size={20} />, color: 'bg-yellow-600' },
  ];

  const invoices = [
    { id: 'INV-2026-001', customer: 'Amit Sharma', technician: 'Rahul Kumar', product: 'Smart TV', serviceCharge: '₹800', partCharge: '₹0', gst: '₹144', total: '₹944', status: 'Paid' },
    { id: 'INV-2026-002', customer: 'Priya Patel', technician: 'Amit Singh', product: 'Refrigerator', serviceCharge: '₹1,200', partCharge: '₹4,500', gst: '₹1,026', total: '₹6,726', status: 'Pending' },
    { id: 'INV-2026-003', customer: 'Rajesh K.', technician: 'Suresh Raina', product: 'Washing Machine', serviceCharge: '₹1,000', partCharge: '₹1,200', gst: '₹396', total: '₹2,596', status: 'Paid' },
    { id: 'INV-2026-004', customer: 'Neha Gupta', technician: 'Vikram Batra', product: 'Microwave', serviceCharge: '₹600', partCharge: '₹2,100', gst: '₹486', total: '₹3,186', status: 'Failed' },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 ml-64 min-h-screen flex flex-col">
        {/* Topbar */}
        <Topbar title="Billing & Invoices" />

        {/* Body */}
        <div className="p-6 space-y-6 flex-1">
          
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                  placeholder="Search Invoice ID or Customer..."
                />
              </div>

              {/* Filters */}
              <select className="text-sm text-[#1E293B] border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#0D47A1] bg-[#F8FAFC]">
                <option>All Status</option>
                <option>Paid</option>
                <option>Pending</option>
                <option>Failed</option>
              </select>
            </div>

            <button className="bg-white text-[#1E293B] border border-[#E2E8F0] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#F8FAFC] transition-colors flex items-center gap-2">
              <Download size={16} /> Export CSV
            </button>
          </div>

          {/* Invoices Table */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-[#F8FAFC] text-[#64748B] text-xs uppercase">
                  <tr>
                    <th className="px-6 py-4">Invoice ID</th>
                    <th className="px-6 py-4">Customer</th>
                    <th className="px-6 py-4">Product</th>
                    <th className="px-6 py-4">Service</th>
                    <th className="px-6 py-4">Parts</th>
                    <th className="px-6 py-4">Total</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="px-6 py-4 font-medium text-[#0D47A1]">{inv.id}</td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-[#1E293B] font-medium">{inv.customer}</p>
                          <p className="text-[#64748B] text-xs">{inv.technician}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-[#1E293B]">{inv.product}</td>
                      <td className="px-6 py-4 text-[#64748B]">{inv.serviceCharge}</td>
                      <td className="px-6 py-4 text-[#64748B]">{inv.partCharge}</td>
                      <td className="px-6 py-4 font-medium text-[#1E293B]">{inv.total}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          inv.status === 'Paid' ? 'bg-green-50 text-green-600' :
                          inv.status === 'Pending' ? 'bg-yellow-50 text-yellow-600' :
                          'bg-red-50 text-red-600'
                        }`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button className="p-1.5 text-[#64748B] hover:text-[#0D47A1] rounded" title="View">
                            <Eye size={16} />
                          </button>
                          <button className="p-1.5 text-[#64748B] hover:text-[#0D47A1] rounded" title="Download PDF">
                            <Download size={16} />
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

export default Invoices;
