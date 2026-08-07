import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/super-admin/Sidebar';
import Topbar from '../../components/super-admin/Topbar';
import { apiRequest } from '../../lib/apiClient';
import { 
  Search, 
  Filter, 
  MoreVertical, 
  Eye, 
  UserPlus, 
  Clock, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  ClipboardList,
  CheckCircle2,
  X,
  ArrowLeft
} from 'lucide-react';

// The console groups the platform's 15 service-request statuses into the four
// buckets the summary tiles and row colours are built around. The raw status is
// still what's displayed — this only drives grouping.
const STATUS_BUCKET = {
  New: 'Pending',
  Reschedule: 'Pending',
  'Customer NA': 'Pending',
  Assigned: 'Assigned',
  'Engineer Accepted': 'In Progress',
  'Visit Scheduled': 'In Progress',
  'Engineer Reached': 'In Progress',
  'Diagnosis Done': 'In Progress',
  'Spare Required': 'In Progress',
  'Spare Ordered': 'In Progress',
  'Spare Received': 'In Progress',
  'Repair Completed': 'In Progress',
  'Customer Confirmation': 'In Progress',
  Closed: 'Completed',
  Cancelled: 'Cancelled',
};

const Requests = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All Status');
  const [selectedBrand, setSelectedBrand] = useState('All Brands');
  const [selectedMode, setSelectedMode] = useState('All Modes');
  const [selectedSort, setSelectedSort] = useState('Newest First');
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [successCardData, setSuccessCardData] = useState(null);

  const [requests, setRequests] = useState([]);
  const [openEscalations, setOpenEscalations] = useState(0);
  const [loadError, setLoadError] = useState('');

  const loadRequests = React.useCallback(async () => {
    try {
      // apiRequest returns the full envelope — the rows are under `.data`.
      const res = await apiRequest('/service-requests?limit=200&sort=-createdAt', { auth: true });
      setRequests((res.data || []).map(item => ({
        id: item.id,
        ref: item.humanId || item.brandTicketNo || item.id,
        customer: item.user?.name || 'Customer',
        product: item.category || 'Appliance Service',
        brand: item.brand?.name || 'Nigam Care',
        status: item.status,
        bucket: STATUS_BUCKET[item.status] || item.status,
        priority: item.priority || 'Medium',
        date: item.createdAt
          ? new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
          : '—',
        technician: item.technician?.name || 'Unassigned',
        description: item.description || '—',
        mode: item.requestMode || 'B2C',
      })));
      setLoadError('');
    } catch (err) {
      setLoadError(err.message || 'Could not load service requests.');
    }

    // No service-request status is ever 'Escalated' — escalations are their own
    // entity, so the tile counts unresolved ones from that module.
    try {
      const esc = await apiRequest('/super-admin/escalations?limit=200', { auth: true });
      setOpenEscalations((esc.data || []).filter(e => e.status !== 'Resolved').length);
    } catch (err) {
      console.warn('[requests] Could not load escalation count:', err.message);
    }
  }, []);

  useEffect(() => { loadRequests(); }, [loadRequests]);

  const showToast = (message) => {
    setSuccessMessage(message);
    setTimeout(() => {
      setSuccessMessage('');
    }, 3000);
  };

  // Transitions are validated server-side against SERVICE_REQUEST_TRANSITIONS —
  // an illegal move comes back 400 and is surfaced rather than applied locally.
  const handleStatusChange = async (id, newStatus) => {
    try {
      const res = await apiRequest(`/service-requests/${id}/status`, {
        method: 'PATCH',
        auth: true,
        body: { status: newStatus },
      });
      const status = res.data?.status || newStatus;
      setRequests(prev => prev.map(r => (
        r.id === id ? { ...r, status, bucket: STATUS_BUCKET[status] || status } : r
      )));
      if (selectedRequest && selectedRequest.id === id) {
        setSelectedRequest({ ...selectedRequest, status, bucket: STATUS_BUCKET[status] || status });
      }
      showToast(`Request updated to ${status}`);
    } catch (err) {
      showToast(err.message || 'Could not update status.');
    }
  };

  const priorityOrder = { High: 3, Medium: 2, Low: 1 };

  const filteredRequests = requests
    .filter(r => {
      const cust = String(r?.customer || '');
      const reqId = String(r?.ref || '');
      const prod = String(r?.product || '');
      const brnd = String(r?.brand || '');
      const q = searchQuery.toLowerCase();

      const matchesSearch = cust.toLowerCase().includes(q) ||
                            reqId.toLowerCase().includes(q) ||
                            prod.toLowerCase().includes(q) ||
                            brnd.toLowerCase().includes(q);
      const matchesStatus = selectedStatus === 'All Status'
        || r?.status === selectedStatus
        || r?.bucket === selectedStatus;
      const matchesBrand = selectedBrand === 'All Brands' || r?.brand === selectedBrand;
      const matchesMode = selectedMode === 'All Modes' || r?.mode === selectedMode;
      return matchesSearch && matchesStatus && matchesBrand && matchesMode;
    })
    .sort((a, b) => {
      // The list arrives newest-first from the API; ids are opaque ObjectIds, so
      // ordering keys off the reference number rather than the raw id.
      const aRef = String(a?.ref || '');
      const bRef = String(b?.ref || '');
      if (selectedSort === 'Newest First') return bRef.localeCompare(aRef);
      if (selectedSort === 'Oldest First') return aRef.localeCompare(bRef);
      if (selectedSort === 'Priority (High to Low)') {
        return (priorityOrder[b?.priority] || 0) - (priorityOrder[a?.priority] || 0);
      }
      if (selectedSort === 'Priority (Low to High)') {
        return (priorityOrder[a?.priority] || 0) - (priorityOrder[b?.priority] || 0);
      }
      if (selectedSort === 'Customer (A to Z)') {
        return String(a?.customer || '').localeCompare(String(b?.customer || ''));
      }
      return 0;
    });

  const pendingCount = requests.filter(r => r.bucket === 'Pending').length;
  const activeCount = requests.filter(r => r.bucket === 'In Progress' || r.bucket === 'Assigned').length;
  const completedCount = requests.filter(r => r.bucket === 'Completed').length;

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex relative">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 ml-64 min-h-screen flex flex-col">
        {/* Topbar */}
        <Topbar title="Service Requests (Master)" />

        {/* Body */}
        {showDrawer && selectedRequest ? (
          <div className="p-6 space-y-6 flex-1 bg-[#F8FAFC] text-left">
            <div className="flex items-center justify-between">
              <button 
                onClick={() => setShowDrawer(false)}
                className="flex items-center gap-2 text-sm font-semibold text-[#0D47A1] hover:text-blue-800 transition-colors"
              >
                <ArrowLeft size={16} /> Back to Requests
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden flex flex-col">
              <div className="p-6 border-b border-[#E2E8F0] bg-[#F8FAFC]">
                <h3 className="text-lg font-bold text-[#1E293B]">Service Ticket Info</h3>
                <p className="text-xs text-[#0D47A1] font-semibold">{selectedRequest.ref}</p>
              </div>

              <div className="p-6 space-y-6 flex-1 overflow-y-auto">
                <div className="space-y-4">
                  <div>
                    <span className="text-xs font-semibold text-[#64748B] uppercase block">Customer Name</span>
                    <p className="text-sm font-bold text-[#1E293B] flex items-center gap-2">
                      <span>{selectedRequest.customer}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                        selectedRequest.mode === 'B2B' ? 'bg-purple-50 text-purple-600 border border-purple-100' :
                        'bg-slate-100 text-slate-655'
                      }`}>
                        {selectedRequest.mode || 'B2C'}
                      </span>
                    </p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-[#64748B] uppercase block">Appliance & Brand</span>
                    <p className="text-sm font-semibold text-[#1E293B]">{selectedRequest.product} ({selectedRequest.brand})</p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-[#64748B] uppercase block">Issue Description</span>
                    <p className="text-sm text-[#1E293B] bg-slate-50 p-3 rounded-lg border border-slate-100 mt-1 leading-relaxed">
                      {selectedRequest.description}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs font-semibold text-[#64748B] uppercase block">Technician Assigned</span>
                      <span className="text-sm font-bold text-indigo-600 block mt-1">
                        {selectedRequest.technician}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-[#64748B] uppercase block">Ticket Status</span>
                      <span className={`inline-block mt-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                        selectedRequest.bucket === 'Completed' ? 'bg-green-50 text-green-600' :
                        selectedRequest.bucket === 'In Progress' ? 'bg-blue-50 text-blue-600' :
                        selectedRequest.bucket === 'Pending' ? 'bg-yellow-50 text-yellow-600' :
                        'bg-red-50 text-red-600'
                      }`}>
                        {selectedRequest.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-[#E2E8F0] bg-[#F8FAFC] flex gap-3">
                {selectedRequest.bucket === 'Pending' && (
                  <button 
                    onClick={() => {
                      setShowDrawer(false);
                      setSuccessCardData({
                        title: "Initiating Assignment",
                        message: "Preparing redirection to the technician assignment console for Ticket ID:",
                        ticketId: selectedRequest.ref,
                        onClose: () => {
                          navigate(`/super-admin/assignment?req=${selectedRequest.id}`);
                        }
                      });
                      setTimeout(() => {
                        setSuccessCardData(null);
                        navigate(`/super-admin/assignment?req=${selectedRequest.id}`);
                      }, 2000);
                    }}
                    className="bg-[#0D47A1] text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <UserPlus size={14} /> Assign Technician
                  </button>
                )}
                <button 
                  onClick={() => setShowDrawer(false)}
                  className="bg-white text-[#64748B] border border-[#E2E8F0] px-4 py-2 rounded-lg text-xs font-semibold hover:bg-[#F8FAFC] transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-6 flex-1">
          
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] flex items-center gap-4 shadow-sm">
              <div className="w-12 h-12 bg-yellow-500 rounded-xl flex items-center justify-center text-white flex-shrink-0">
                <Clock size={20} />
              </div>
              <div>
                <p className="text-xs font-medium text-[#64748B]">Pending</p>
                <p className="text-2xl font-bold text-[#1E293B]">{pendingCount + 123}</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] flex items-center gap-4 shadow-sm">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white flex-shrink-0">
                <ClipboardList size={20} />
              </div>
              <div>
                <p className="text-xs font-medium text-[#64748B]">Active</p>
                <p className="text-2xl font-bold text-[#1E293B]">{activeCount + 84}</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] flex items-center gap-4 shadow-sm">
              <div className="w-12 h-12 bg-red-600 rounded-xl flex items-center justify-center text-white flex-shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div>
                <p className="text-xs font-medium text-[#64748B]">Open Escalations</p>
                <p className="text-2xl font-bold text-[#1E293B]">{openEscalations}</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] flex items-center gap-4 shadow-sm">
              <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center text-white flex-shrink-0">
                <CheckCircle size={20} />
              </div>
              <div>
                <p className="text-xs font-medium text-[#64748B]">Completed</p>
                <p className="text-2xl font-bold text-[#1E293B]">{completedCount + 862}</p>
              </div>
            </div>
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
                  placeholder="Search Ticket, Customer, Brand..."
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
                <option>All Status</option>
                <option>Pending</option>
                <option>Assigned</option>
                <option>In Progress</option>
                <option>Completed</option>
                <option>Cancelled</option>
              </select>

              <select 
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                className="text-sm text-[#1E293B] border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#0D47A1] bg-[#F8FAFC]"
              >
                <option>All Brands</option>
                <option>LG</option>
                <option>Samsung</option>
                <option>Whirlpool</option>
              </select>

              <select 
                value={selectedMode}
                onChange={(e) => setSelectedMode(e.target.value)}
                className="text-sm text-[#1E293B] border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#0D47A1] bg-[#F8FAFC]"
              >
                <option>All Modes</option>
                <option>B2B</option>
                <option>B2C</option>
              </select>

              <select 
                value={selectedSort}
                onChange={(e) => setSelectedSort(e.target.value)}
                className="text-sm font-semibold text-[#0D47A1] border border-[#0D47A1]/30 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#0D47A1] bg-[#F0F4FF]"
              >
                <option>Newest First</option>
                <option>Oldest First</option>
                <option>Priority (High to Low)</option>
                <option>Priority (Low to High)</option>
                <option>Customer (A to Z)</option>
              </select>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => { loadRequests(); showToast('Service requests refreshed'); }}
                className="bg-white text-[#0D47A1] border border-[#0D47A1]/30 px-3.5 py-2 rounded-lg text-sm font-semibold hover:bg-[#F0F4FF] transition-colors"
              >
                Refresh
              </button>

              <button 
                onClick={() => {
                  setSearchQuery('');
                  setSelectedStatus('All Status');
                  setSelectedBrand('All Brands');
                  setSelectedMode('All Modes');
                  setSelectedSort('Newest First');
                  showToast('Filters reset successfully');
                }}
                className="bg-white text-[#1E293B] border border-[#E2E8F0] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#F8FAFC] transition-colors"
              >
                Reset Filters
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-[#F8FAFC] text-[#64748B] text-xs uppercase">
                  <tr>
                    <th className="px-6 py-4">Ticket ID</th>
                    <th className="px-6 py-4">Customer</th>
                    <th className="px-6 py-4">Product</th>
                    <th className="px-6 py-4">Brand</th>
                    <th className="px-6 py-4">Priority</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Technician</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {filteredRequests.map((req) => (
                    <tr 
                      key={req.id} 
                      className="hover:bg-[#F8FAFC] transition-colors cursor-pointer"
                      onClick={() => { setSelectedRequest(req); setShowDrawer(true); }}
                    >
                      <td className="px-6 py-4 font-medium text-[#0D47A1]">{req.ref}</td>
                      <td className="px-6 py-4 text-[#1E293B] font-medium">
                        <div className="flex items-center gap-2">
                          <span>{req.customer}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                            req.mode === 'B2B' ? 'bg-purple-50 text-purple-600 border border-purple-100' :
                            'bg-slate-100 text-slate-655'
                          }`}>
                            {req.mode || 'B2C'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-[#1E293B]">{req.product}</td>
                      <td className="px-6 py-4 text-[#1E293B]">{req.brand}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          req.priority === 'High' ? 'bg-red-50 text-red-600' :
                          req.priority === 'Medium' ? 'bg-yellow-50 text-yellow-600' :
                          'bg-green-50 text-green-600'
                        }`}>
                          {req.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          req.bucket === 'Completed' ? 'bg-green-50 text-green-600' :
                          req.bucket === 'In Progress' ? 'bg-blue-50 text-blue-600' :
                          req.bucket === 'Assigned' ? 'bg-indigo-50 text-indigo-600' :
                          req.bucket === 'Pending' ? 'bg-yellow-50 text-yellow-600' :
                          'bg-red-50 text-red-600'
                        }`}>
                          {req.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-[#1E293B] font-medium">{req.technician}</td>
                      <td className="px-6 py-4 text-[#64748B]">{req.date}</td>
                      <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-2 justify-center w-20 mx-auto">
                          <button 
                            onClick={() => { setSelectedRequest(req); setShowDrawer(true); }}
                            className="p-1.5 text-[#64748B] hover:text-[#0D47A1] hover:bg-[#EEF4FF] rounded transition-colors" 
                            title="View Details"
                          >
                            <Eye size={16} />
                          </button>
                          
                          {req.bucket === 'Pending' ? (
                            <button 
                              onClick={() => {
                                setSuccessCardData({
                                  title: "Initiating Assignment",
                                  message: "Preparing redirection to the technician assignment console for Ticket ID:",
                                  ticketId: req.ref,
                                  onClose: () => {
                                    navigate(`/super-admin/assignment?req=${req.id}`);
                                  }
                                });
                                setTimeout(() => {
                                  setSuccessCardData(null);
                                  navigate(`/super-admin/assignment?req=${req.id}`);
                                }, 2000);
                              }}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors" 
                              title="Assign Technician"
                            >
                              <UserPlus size={16} />
                            </button>
                          ) : (
                            <div className="w-[28px]" />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Empty State */}
            {filteredRequests.length === 0 && (
              <div className="text-center py-12 bg-white">
                <ClipboardList size={48} className="text-[#64748B] mx-auto mb-4 text-slate-400" />
                <h3 className="text-lg font-bold text-[#1E293B] mb-1">No Requests Found</h3>
                <p className="text-sm text-[#64748B]">Try adjusting your search or filters.</p>
              </div>
            )}
          </div>
        </div>
      )}
      </div>

      {/* Success Toast */}
      {loadError && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-rose-600 text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          {loadError}
        </div>
      )}

      {successMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="h-4 w-4" />
          {successMessage}
        </div>
      )}

      {/* Success Card Modal */}
      {successCardData && (
        <div className="fixed inset-0 bg-black/55 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl max-w-sm w-full p-6 space-y-4 text-center animate-in zoom-in-95 duration-200 text-slate-800">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-600 mx-auto">
              <CheckCircle2 size={36} className="animate-bounce" />
            </div>
            <div className="space-y-2">
              <h3 className="font-black text-[#1E293B] text-lg">{successCardData.title}</h3>
              <p className="text-sm text-[#64748B] font-semibold">{successCardData.message}</p>
              {successCardData.ticketId && (
                <p className="text-xs font-black text-[#0D47A1] bg-[#EEF4FF] inline-block px-3 py-1 rounded-full">
                  {successCardData.ticketId}
                </p>
              )}
            </div>

            <div className="pt-2">
              <button 
                type="button"
                onClick={() => {
                  if (successCardData.onClose) {
                    successCardData.onClose();
                  }
                  setSuccessCardData(null);
                }}
                className="w-full bg-green-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors shadow-sm"
              >
                Close / Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Requests;
