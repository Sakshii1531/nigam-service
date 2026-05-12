import React, { useState } from 'react';
import Sidebar from '../../components/super-admin/Sidebar';
import Topbar from '../../components/super-admin/Topbar';
import { 
  Search, 
  Filter, 
  Truck, 
  Eye, 
  CheckCircle, 
  XCircle,
  Clock,
  Package
} from 'lucide-react';

const Orders = () => {
  const [searchQuery, setSearchQuery] = useState('');
  
  const [orders, setOrders] = useState([
    { id: 'ORD-5001', requester: 'Tech Rahul', part: 'LG Compressor X', quantity: 1, priority: 'High', status: 'Pending', date: '12 May, 2026' },
    { id: 'ORD-5002', requester: 'Brand Samsung', part: 'Display Panel', quantity: 5, priority: 'Medium', status: 'Dispatched', date: '12 May, 2026' },
    { id: 'ORD-5003', requester: 'Tech Amit', part: 'Drain Pump', quantity: 2, priority: 'Low', status: 'Delivered', date: '11 May, 2026' },
  ]);

  const handleStatusChange = (id, newStatus) => {
    setOrders(orders.map(o => o.id === id ? { ...o, status: newStatus } : o));
  };

  const filteredOrders = orders.filter(o => 
    o.requester.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.part.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 ml-64 min-h-screen flex flex-col">
        {/* Topbar */}
        <Topbar title="Orders & Dispatch" />

        {/* Body */}
        <div className="p-6 space-y-6 flex-1">
          
          {/* Header Actions */}
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-[#1E293B]">Spare Part Requests & Orders</h2>
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
                  placeholder="Search Order ID, Requester..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Filters */}
              <select className="text-sm text-[#1E293B] border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#0D47A1] bg-[#F8FAFC]">
                <option>All Status</option>
                <option>Pending</option>
                <option>Dispatched</option>
                <option>Delivered</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-[#F8FAFC] text-[#64748B] text-xs uppercase">
                  <tr>
                    <th className="px-6 py-4">Order ID</th>
                    <th className="px-6 py-4">Requester</th>
                    <th className="px-6 py-4">Part Details</th>
                    <th className="px-6 py-4">Qty</th>
                    <th className="px-6 py-4">Priority</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="px-6 py-4 font-medium text-[#0D47A1]">{order.id}</td>
                      <td className="px-6 py-4 text-[#1E293B] font-medium">{order.requester}</td>
                      <td className="px-6 py-4 text-[#1E293B]">{order.part}</td>
                      <td className="px-6 py-4 text-[#1E293B] font-medium">{order.quantity}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          order.priority === 'High' ? 'bg-red-50 text-red-600' :
                          order.priority === 'Medium' ? 'bg-yellow-50 text-yellow-600' :
                          'bg-green-50 text-green-600'
                        }`}>
                          {order.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          order.status === 'Delivered' ? 'bg-green-50 text-green-600' :
                          order.status === 'Dispatched' ? 'bg-blue-50 text-blue-600' :
                          'bg-yellow-50 text-yellow-600'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-[#64748B]">{order.date}</td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button className="p-1.5 text-[#64748B] hover:text-[#0D47A1] hover:bg-[#EEF4FF] rounded" title="View Details">
                            <Eye size={16} />
                          </button>
                          
                          {order.status === 'Pending' && (
                            <button 
                              onClick={() => handleStatusChange(order.id, 'Dispatched')}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" 
                              title="Dispatch Now"
                            >
                              <Truck size={16} />
                            </button>
                          )}

                          {order.status === 'Dispatched' && (
                            <button 
                              onClick={() => handleStatusChange(order.id, 'Delivered')}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded" 
                              title="Mark Delivered"
                            >
                              <CheckCircle size={16} />
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
            {filteredOrders.length === 0 && (
              <div className="text-center py-12 bg-white">
                <Package size={48} className="text-[#64748B] mx-auto mb-4" />
                <h3 className="text-lg font-bold text-[#1E293B] mb-1">No Orders Found</h3>
                <p className="text-sm text-[#64748B]">Try adjusting your search or filters.</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default Orders;
