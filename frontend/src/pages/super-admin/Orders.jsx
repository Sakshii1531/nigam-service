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
  Package,
  X,
  CheckCircle2,
  Calendar,
  User,
  Activity
} from 'lucide-react';

const Orders = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All Statuses');
  const [successMessage, setSuccessMessage] = useState('');
  
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDrawer, setShowDrawer] = useState(false);

  const [orders, setOrders] = useState([
    { id: 'ORD-5001', requester: 'Tech Rahul', part: 'LG Compressor X', quantity: 1, priority: 'High', status: 'Pending', date: '12 May, 2026', address: '12, Connaught Place, New Delhi - 110001', trackingNo: 'N/A', courier: 'N/A' },
    { id: 'ORD-5002', requester: 'Brand Samsung', part: 'Display Panel', quantity: 5, priority: 'Medium', status: 'Dispatched', date: '12 May, 2026', address: 'Samsung Warehouse Hub, Sec-62 Noida - 201301', trackingNo: 'TRK-SAM-89210', courier: 'Delhivery' },
    { id: 'ORD-5003', requester: 'Tech Amit', part: 'Drain Pump', quantity: 2, priority: 'Low', status: 'Delivered', date: '11 May, 2026', address: 'B-45, Andheri East, Mumbai - 400069', trackingNo: 'TRK-WHI-32019', courier: 'BlueDart' },
  ]);

  const showToast = (message) => {
    setSuccessMessage(message);
    setTimeout(() => {
      setSuccessMessage('');
    }, 3000);
  };

  const handleStatusChange = (id, newStatus) => {
    let updatedOrders = orders.map(o => {
      if (o.id === id) {
        const trk = newStatus === 'Dispatched' ? `TRK-EXP-${Math.floor(100000 + Math.random() * 900000)}` : o.trackingNo;
        const cour = newStatus === 'Dispatched' ? 'Express Logistics' : o.courier;
        const updated = { ...o, status: newStatus, trackingNo: trk, courier: cour };
        if (selectedOrder && selectedOrder.id === id) {
          setSelectedOrder(updated);
        }
        return updated;
      }
      return o;
    });

    setOrders(updatedOrders);
    showToast(`Order ${id} status updated to ${newStatus}`);
  };

  const filteredOrders = orders.filter(o => {
    const matchesSearch = o.requester.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          o.part.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === 'All Statuses' || o.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex relative text-slate-800">
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
                  placeholder="Search Order ID, Requester..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Filters */}
              <select 
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="text-sm text-[#1E293B] border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#0D47A1] bg-[#F8FAFC]"
              >
                <option>All Statuses</option>
                <option>Pending</option>
                <option>Dispatched</option>
                <option>Delivered</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-[#F8FAFC] text-[#64748B] text-xs uppercase border-b border-[#E2E8F0]">
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
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          order.priority === 'High' ? 'bg-red-50 text-red-600' :
                          order.priority === 'Medium' ? 'bg-yellow-50 text-yellow-600' :
                          'bg-green-50 text-green-600'
                        }`}>
                          {order.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
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
                          <button 
                            onClick={() => {
                              setSelectedOrder(order);
                              setShowDrawer(true);
                            }}
                            className="p-1.5 text-[#64748B] hover:text-[#0D47A1] hover:bg-[#EEF4FF] rounded transition-colors" 
                            title="View Details"
                          >
                            <Eye size={16} />
                          </button>
                          
                          {order.status === 'Pending' && (
                            <button 
                              onClick={() => handleStatusChange(order.id, 'Dispatched')}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors" 
                              title="Dispatch Now"
                            >
                              <Truck size={16} />
                            </button>
                          )}

                          {order.status === 'Dispatched' && (
                            <button 
                              onClick={() => handleStatusChange(order.id, 'Delivered')}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors" 
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
                <Package size={48} className="text-[#64748B] mx-auto mb-4 opacity-50 text-slate-400" />
                <h3 className="text-lg font-bold text-[#1E293B] mb-1">No Orders Found</h3>
                <p className="text-sm text-[#64748B]">Try adjusting your search or filters.</p>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Details Slide-out Drawer */}
      {showDrawer && selectedOrder && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/45">
          <div className="w-full max-w-md bg-white h-full shadow-2xl p-6 flex flex-col justify-between animate-slide-in">
            <div className="space-y-6 overflow-y-auto">
              <div className="flex justify-between items-center border-b border-[#E2E8F0] pb-4">
                <div>
                  <span className="text-xs font-bold text-[#0D47A1]">{selectedOrder.id}</span>
                  <h3 className="text-lg font-black text-[#1E293B]">Order Details</h3>
                </div>
                <button 
                  onClick={() => {
                    setShowDrawer(false);
                    setSelectedOrder(null);
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-xl space-y-2">
                  <p className="text-xs text-[#64748B] font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <User size={14} /> Requester Info
                  </p>
                  <p className="text-sm font-bold text-[#1E293B]">{selectedOrder.requester}</p>
                  <p className="text-xs text-slate-600">Shipment Destination: {selectedOrder.address}</p>
                </div>

                <div className="p-4 border border-[#E2E8F0] rounded-xl space-y-3">
                  <h4 className="text-xs font-bold text-[#64748B] uppercase tracking-wider flex items-center gap-1.5">
                    <Package size={14} /> Ordered Item
                  </h4>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#1E293B] font-bold">{selectedOrder.part}</span>
                    <span className="font-semibold text-slate-700">Qty: {selectedOrder.quantity}</span>
                  </div>
                  <div className="flex justify-between text-xs pt-1">
                    <span className="text-[#64748B]">Priority Level:</span>
                    <span className="font-bold text-red-600">{selectedOrder.priority}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[#64748B]">Request Date:</span>
                    <span className="font-bold text-slate-700">{selectedOrder.date}</span>
                  </div>
                </div>

                <div className="p-4 border border-[#E2E8F0] rounded-xl space-y-3">
                  <h4 className="text-xs font-bold text-[#64748B] uppercase tracking-wider flex items-center gap-1.5">
                    <Activity size={14} /> Shipping & Dispatch
                  </h4>
                  <div className="flex justify-between text-xs">
                    <span className="text-[#64748B]">Courier Partner:</span>
                    <span className="font-bold text-[#1E293B]">{selectedOrder.courier}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[#64748B]">Tracking ID:</span>
                    <span className="font-bold text-[#0D47A1]">{selectedOrder.trackingNo}</span>
                  </div>
                  <div className="flex justify-between text-xs border-t border-dashed border-[#E2E8F0] pt-2">
                    <span className="text-[#64748B] font-bold">Delivery Status:</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                      selectedOrder.status === 'Delivered' ? 'bg-green-50 text-green-600' :
                      selectedOrder.status === 'Dispatched' ? 'bg-blue-50 text-blue-600' :
                      'bg-yellow-50 text-yellow-600'
                    }`}>
                      {selectedOrder.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-[#E2E8F0] flex gap-3">
              {selectedOrder.status === 'Pending' && (
                <button
                  onClick={() => handleStatusChange(selectedOrder.id, 'Dispatched')}
                  className="w-full bg-[#0D47A1] text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm text-center flex items-center justify-center gap-2"
                >
                  <Truck size={16} /> Dispatch Order Now
                </button>
              )}

              {selectedOrder.status === 'Dispatched' && (
                <button
                  onClick={() => handleStatusChange(selectedOrder.id, 'Delivered')}
                  className="w-full bg-green-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors shadow-sm text-center flex items-center justify-center gap-2"
                >
                  <CheckCircle size={16} /> Mark Order Delivered
                </button>
              )}

              {selectedOrder.status === 'Delivered' && (
                <div className="w-full bg-green-50 border border-green-200 text-green-700 p-3 rounded-xl text-center text-xs font-bold">
                  Order Successfully Handed Over & Closed
                </div>
              )}
            </div>
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

export default Orders;
