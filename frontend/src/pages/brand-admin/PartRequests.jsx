import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/brand-admin/Sidebar';
import Topbar from '../../components/brand-admin/Topbar';
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Truck, 
  Search, 
  Filter, 
  MoreVertical,
  X,
  Check
} from 'lucide-react';
import { apiRequest } from '../../lib/apiClient';

const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const dateFormatter = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

function shape(o) {
  return {
    id: o.id,
    ref: o.humanId || o.id,
    technician: o.technician?.name || 'Technician',
    // The appliance comes from the service request the job was raised for.
    product: o.job?.serviceRequest?.category || '—',
    ticket: o.job?.serviceRequest?.humanId || '—',
    part: o.partName,
    sku: o.sku || '—',
    qty: o.qty ?? 1,
    price: currency.format(o.price || 0),
    // A part order records no free-text reason; the source is what it does carry.
    reason: o.orderSource,
    status: o.status || 'Pending',
    date: o.createdAt ? dateFormatter.format(new Date(o.createdAt)) : '—',
  };
}

const PartRequests = () => {
  const [showModal, setShowModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All Status');
  const [selectedWarranty, setSelectedWarranty] = useState('Warranty');
  const [successMessage, setSuccessMessage] = useState('');

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function loadRequests() {
      try {
        // Resolved server-side through PartOrder -> Job -> ServiceRequest.brand.
        const data = await apiRequest('/brand/part-orders', { auth: true });
        if (!cancelled) setRequests((data || []).map(shape));
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadRequests();
    return () => { cancelled = true; };
  }, []);

  const showToast = (message) => {
    setSuccessMessage(message);
    setTimeout(() => {
      setSuccessMessage('');
    }, 3000);
  };

  // No endpoint exists to approve or dispatch a part order — the technician-side
  // module exposes only create and read (/tech/inventory/part-orders). Say so
  // rather than flip the badge for a change that was never saved.
  const updateStatus = (id, newStatus) => {
    setError(`Moving a part request to "${newStatus}" is not supported by the API yet — no change was saved.`);
  };

  const handleRowClick = (req) => {
    setSelectedRequest(req);
    setShowModal(true);
  };

  const filteredRequests = requests.filter(req => {
    const matchesSearch = req.ref.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.part.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.technician.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.product.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesStatus = selectedStatus === 'All Status' || req.status === selectedStatus;
    const matchesWarranty = selectedWarranty === 'Warranty' || req.warranty === selectedWarranty;
    
    return matchesSearch && matchesStatus && matchesWarranty;
  });

  const pendingCount = requests.filter(r => r.status === 'Pending').length;
  const approvedCount = requests.filter(r => r.status === 'Approved').length;
  const dispatchedCount = requests.filter(r => r.status === 'Dispatched').length;
  const rejectedCount = requests.filter(r => r.status === 'Rejected').length;

  const stats = [
    { title: 'Pending Approval', value: String(pendingCount), icon: <Clock size={20} />, color: 'bg-yellow-500' },
    { title: 'Approved', value: String(approvedCount), icon: <CheckCircle2 size={20} />, color: 'bg-blue-600' },
    { title: 'Dispatched', value: String(dispatchedCount), icon: <Truck size={20} />, color: 'bg-teal-600' },
    { title: 'Rejected', value: String(rejectedCount), icon: <XCircle size={20} />, color: 'bg-[#EF4444]' },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 ml-64 min-h-screen flex flex-col relative">
        {/* Topbar */}
        <Topbar title="Part Requests" />

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
                  placeholder="Search Request ID or Part..."
                />
              </div>

              {/* Filters */}
              <select 
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="text-sm text-[#1E293B] border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#0D47A1] bg-[#F8FAFC]"
              >
                <option>All Status</option>
                <option>Pending</option>
                <option>Approved</option>
                <option>Dispatched</option>
                <option>Rejected</option>
              </select>

              <select 
                value={selectedWarranty}
                onChange={(e) => setSelectedWarranty(e.target.value)}
                className="text-sm text-[#1E293B] border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#0D47A1] bg-[#F8FAFC]"
              >
                <option>Warranty</option>
                <option>Under Warranty</option>
                <option>Out of Warranty</option>
              </select>
            </div>

            <button 
              onClick={() => {
                setSelectedStatus('All Status');
                setSelectedWarranty('Warranty');
                setSearchQuery('');
                showToast('Filters reset successfully');
              }}
              className="bg-white text-[#1E293B] border border-[#E2E8F0] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#F8FAFC] transition-colors flex items-center gap-2"
            >
              <Filter size={16} /> Reset Filters
            </button>
          </div>

          {/* Requests Table */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-[#F8FAFC] text-[#64748B] text-xs uppercase">
                  <tr>
                    <th className="px-6 py-4">Request ID</th>
                    <th className="px-6 py-4">Technician</th>
                    <th className="px-6 py-4">Product & Part</th>
                    <th className="px-6 py-4">Warranty</th>
                    <th className="px-6 py-4">Est. Cost</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {loading && (
                    <tr><td colSpan={9} className="px-6 py-10 text-center text-[#64748B] font-semibold">Loading part requests…</td></tr>
                  )}
                  {!loading && error && (
                    <tr><td colSpan={9} className="px-6 py-10 text-center text-red-600 font-semibold">{error}</td></tr>
                  )}
                  {!loading && !error && filteredRequests.length === 0 && (
                    <tr><td colSpan={9} className="px-6 py-10 text-center text-[#64748B] font-semibold">No part requests raised on this brand's jobs.</td></tr>
                  )}
                  {filteredRequests.map((req) => (
                    <tr 
                      key={req.id} 
                      className="hover:bg-[#F8FAFC] transition-colors cursor-pointer"
                      onClick={() => handleRowClick(req)}
                    >
                      <td className="px-6 py-4 font-medium text-[#0D47A1]">{req.ref}</td>
                      <td className="px-6 py-4 text-[#1E293B]">{req.technician}</td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-[#1E293B] font-medium">{req.part}</p>
                          <p className="text-[#64748B] text-xs">{req.product}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-medium ${req.warranty === 'Under Warranty' ? 'text-green-600' : 'text-orange-600'}`}>
                          {req.warranty}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium text-[#1E293B]">{req.cost}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          req.status === 'Approved' ? 'bg-blue-50 text-blue-600' :
                          req.status === 'Dispatched' ? 'bg-teal-50 text-teal-600' :
                          req.status === 'Pending' ? 'bg-yellow-50 text-yellow-600' :
                          'bg-red-50 text-red-600'
                        }`}>
                          {req.status}
                        </span>
                      </td>
                      <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-2">
                          {req.status === 'Pending' && (
                            <>
                              <button 
                                onClick={() => updateStatus(req.id, 'Approved')}
                                className="p-1.5 text-green-600 hover:bg-green-50 rounded" 
                                title="Approve"
                              >
                                <Check size={16} />
                              </button>
                              <button 
                                onClick={() => updateStatus(req.id, 'Rejected')}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded" 
                                title="Reject"
                              >
                                <X size={16} />
                              </button>
                            </>
                          )}
                          {req.status === 'Approved' && (
                            <button 
                              onClick={() => updateStatus(req.id, 'Dispatched')}
                              className="p-1.5 text-teal-600 hover:bg-teal-50 rounded flex items-center gap-1 text-xs font-medium" 
                              title="Dispatch"
                            >
                              <Truck size={14} /> Dispatch
                            </button>
                          )}
                          <button 
                            onClick={() => handleRowClick(req)}
                            className="p-1.5 text-[#64748B] hover:text-[#1E293B] rounded"
                            title="View Details"
                          >
                            <MoreVertical size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredRequests.length === 0 && (
                    <tr>
                      <td colSpan="7" className="px-6 py-10 text-center text-sm text-[#64748B]">
                        No part requests found matching search or filter criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Detail Modal */}
        {showModal && selectedRequest && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="p-6 border-b border-[#E2E8F0] flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold text-[#1E293B]">Part Request Details</h2>
                  <p className="text-sm text-[#0D47A1] font-medium">{selectedRequest.id}</p>
                </div>
                <button 
                  onClick={() => setShowModal(false)}
                  className="text-[#64748B] hover:text-[#1E293B] p-2 hover:bg-[#F8FAFC] rounded-full"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-[#64748B]">Technician</p>
                    <p className="font-medium text-[#1E293B]">{selectedRequest.technician}</p>
                  </div>
                  <div>
                    <p className="text-[#64748B]">Product</p>
                    <p className="font-medium text-[#1E293B]">{selectedRequest.product}</p>
                  </div>
                  <div>
                    <p className="text-[#64748B]">Part Required</p>
                    <p className="font-medium text-[#1E293B]">{selectedRequest.part}</p>
                  </div>
                  <div>
                    <p className="text-[#64748B]">Estimated Cost</p>
                    <p className="font-medium text-[#1E293B]">{selectedRequest.cost}</p>
                  </div>
                </div>
                
                <div>
                  <p className="text-sm text-[#64748B]">Reason for Request</p>
                  <p className="text-sm font-medium text-[#1E293B] bg-[#F8FAFC] p-3 rounded-lg mt-1">
                    {selectedRequest.reason}
                  </p>
                </div>
                
                <div className="flex justify-between items-center text-sm">
                  <span className="text-[#64748B]">Warranty Status:</span>
                  <span className={`font-medium ${selectedRequest.warranty === 'Under Warranty' ? 'text-green-600' : 'text-orange-600'}`}>
                    {selectedRequest.warranty}
                  </span>
                </div>

                <div className="flex justify-between items-center text-sm">
                  <span className="text-[#64748B]">Current Status:</span>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    selectedRequest.status === 'Approved' ? 'bg-blue-50 text-blue-600' :
                    selectedRequest.status === 'Dispatched' ? 'bg-teal-50 text-teal-600' :
                    selectedRequest.status === 'Pending' ? 'bg-yellow-50 text-yellow-600' :
                    'bg-red-50 text-red-600'
                  }`}>
                    {selectedRequest.status}
                  </span>
                </div>
              </div>

              <div className="p-6 border-t border-[#E2E8F0] flex gap-3 justify-end">
                {selectedRequest.status === 'Pending' && (
                  <>
                    <button 
                      onClick={() => { updateStatus(selectedRequest.id, 'Rejected'); setShowModal(false); }}
                      className="bg-white text-[#1E293B] border border-[#E2E8F0] px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-[#F8FAFC] transition-colors"
                    >
                      Reject
                    </button>
                    <button 
                      onClick={() => { updateStatus(selectedRequest.id, 'Approved'); setShowModal(false); }}
                      className="bg-[#0D47A1] text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                    >
                      Approve
                    </button>
                  </>
                )}
                {selectedRequest.status === 'Approved' && (
                  <button 
                    onClick={() => { updateStatus(selectedRequest.id, 'Dispatched'); setShowModal(false); }}
                    className="bg-[#0D47A1] text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <Truck size={18} /> Dispatch Now
                  </button>
                )}
                <button 
                  onClick={() => setShowModal(false)}
                  className="bg-white text-[#64748B] border border-[#E2E8F0] px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-[#F8FAFC] transition-colors"
                >
                  Close
                </button>
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
    </div>
  );
};

export default PartRequests;
