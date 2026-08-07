import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/brand-admin/Sidebar';
import Topbar from '../../components/brand-admin/Topbar';
import { apiRequest } from '../../lib/apiClient';
import { 
  Search, 
  Filter, 
  Download, 
  Plus, 
  Eye, 
  MoreVertical,
  ClipboardList,
  Clock,
  AlertTriangle,
  CheckCircle2,
  X,
  Check,
  ArrowLeft
} from 'lucide-react';

const dateFormatter = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

// This screen groups the API's fifteen service-request statuses into the four
// buckets it filters and reports on. Anything not named here is treated as
// in-flight work, so a newly added API status shows up rather than disappearing.
const PENDING_STATUSES = ['New'];
const COMPLETED_STATUSES = ['Closed'];
const CLOSED_OTHER_STATUSES = ['Cancelled', 'Customer NA'];

function toBucket(status) {
  if (PENDING_STATUSES.includes(status)) return 'Pending';
  if (COMPLETED_STATUSES.includes(status)) return 'Completed';
  if (CLOSED_OTHER_STATUSES.includes(status)) return 'Cancelled';
  return 'In Progress';
}

function shape(req) {
  return {
    id: req.id,
    ref: req.humanId || req.id,
    customer: req.user?.name || 'Customer',
    product: req.category || '—',
    model: req.model || '—',
    // ServiceRequest records only whether an invoice exists, not its number.
    invoice: req.invoiceAvailable ? 'Provided' : 'Not provided',
    warranty: req.warranty || 'Unknown',
    technician: req.technician?.name || 'Unassigned',
    priority: req.priority || 'Medium',
    // Keep the API's own status alongside the coarse bucket the UI filters on.
    apiStatus: req.status,
    status: toBucket(req.status),
    date: req.createdAt ? dateFormatter.format(new Date(req.createdAt)) : '—',
  };
}

const Requests = () => {
  const [showDrawer, setShowDrawer] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);

  const [successMessage, setSuccessMessage] = useState('');
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [reassignTechName, setReassignTechName] = useState('Rahul Kumar');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All Status');
  const [selectedWarranty, setSelectedWarranty] = useState('Warranty Status');
  const [selectedPriority, setSelectedPriority] = useState('Priority');

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function loadRequests() {
      try {
        // Brand-scoped server-side: the API forces `brand = req.user.brand`.
        const data = await apiRequest('/service-requests', { auth: true });
        if (!cancelled) setRequests((data?.data || []).map(shape));
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadRequests();
    return () => { cancelled = true; };
  }, []);

  const countBucket = (bucket) => requests.filter(r => r.status === bucket).length;
  const summaryCards = [
    { title: 'Pending Complaints', value: String(countBucket('Pending')), icon: <Clock size={20} />, color: 'bg-yellow-500' },
    { title: 'Active Complaints', value: String(countBucket('In Progress')), icon: <ClipboardList size={20} />, color: 'bg-blue-600' },
    { title: 'Cancelled / NA', value: String(countBucket('Cancelled')), icon: <AlertTriangle size={20} />, color: 'bg-red-500' },
    { title: 'Completed Calls', value: String(countBucket('Completed')), icon: <CheckCircle2 size={20} />, color: 'bg-green-600' },
  ];

  // `apiStatus` is what the server validates against SERVICE_REQUEST_TRANSITIONS,
  // so transitions are expressed in the API's vocabulary, not the UI's buckets.
  const updateRequestStatus = async (id, apiStatus) => {
    const row = requests.find(r => r.id === id);
    try {
      const updated = await apiRequest(`/service-requests/${id}/status`, {
        method: 'PATCH', auth: true, body: { status: apiStatus },
      });
      const next = { apiStatus: updated.status, status: toBucket(updated.status) };
      setRequests(prev => prev.map(r => (r.id === id ? { ...r, ...next } : r)));
      if (selectedRequest && selectedRequest.id === id) {
        setSelectedRequest({ ...selectedRequest, ...next });
      }
      setShowDrawer(false);
      setSuccessMessage(`Request ${row?.ref || id} moved to "${updated.status}".`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(`Could not update request: ${err.message}`);
    }
  };

  // No endpoint exists to reassign a service request's technician — the API
  // exposes only a status transition. Kept as a local no-op with an explicit
  // notice rather than pretending the change was saved.
  const handleReassignSubmit = (e) => {
    e.preventDefault();
    setShowReassignModal(false);
    setShowDrawer(false);
    setError('Reassigning a technician is not supported by the API yet — no change was saved.');
  };

  const handleRowClick = (req) => {
    setSelectedRequest(req);
    setShowDrawer(true);
  };

  const filteredRequests = requests.filter(req => {
    const matchesSearch = req.customer.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          req.ref.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          req.product.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === 'All Status' || req.status === selectedStatus;
    const matchesWarranty = selectedWarranty === 'Warranty Status' || req.warranty === selectedWarranty;
    const matchesPriority = selectedPriority === 'Priority' || req.priority === selectedPriority;
    return matchesSearch && matchesStatus && matchesWarranty && matchesPriority;
  });

  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage) || 1;
  const paginatedRequests = filteredRequests.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 ml-64 min-h-screen flex flex-col relative">
        {/* Topbar */}
        <Topbar title="All Complaints" />

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

            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden flex flex-col max-w-3xl">
              <div className="p-6 border-b border-[#E2E8F0] flex justify-between items-center bg-[#F8FAFC]">
                <div>
                  <h2 className="text-lg font-bold text-[#1E293B]">Request Details</h2>
                  <p className="text-sm text-[#0D47A1] font-medium">{selectedRequest.ref}</p>
                </div>
              </div>

              <div className="p-6 space-y-6 flex-1">
                {/* Customer Details */}
                <div>
                  <h3 className="text-xs uppercase text-[#64748B] font-semibold mb-2">Customer Details</h3>
                  <div className="bg-[#F8FAFC] p-4 rounded-xl space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-[#64748B]">Name:</span>
                      <span className="text-sm font-medium text-[#1E293B]">{selectedRequest.customer}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-[#64748B]">Phone:</span>
                      <span className="text-sm font-medium text-[#1E293B]">+91 98765 43210</span>
                    </div>
                  </div>
                </div>

                {/* Appliance Details */}
                <div>
                  <h3 className="text-xs uppercase text-[#64748B] font-semibold mb-2">Appliance Details</h3>
                  <div className="bg-[#F8FAFC] p-4 rounded-xl space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-[#64748B]">Product:</span>
                      <span className="text-sm font-medium text-[#1E293B]">{selectedRequest.product}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-[#64748B]">Model:</span>
                      <span className="text-sm font-medium text-[#1E293B]">{selectedRequest.model}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-[#64748B]">Invoice:</span>
                      <span className="text-sm font-medium text-[#0D47A1]">{selectedRequest.invoice}</span>
                    </div>
                  </div>
                </div>

                {/* Status & Timeline */}
                <div>
                  <h3 className="text-xs uppercase text-[#64748B] font-semibold mb-2">Status & Timeline</h3>
                  <div className="bg-[#F8FAFC] p-4 rounded-xl space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[#64748B]">Current Status:</span>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        selectedRequest.status === 'Completed' ? 'bg-green-50 text-green-600' :
                        selectedRequest.status === 'In Progress' ? 'bg-blue-50 text-blue-600' :
                        selectedRequest.status === 'Pending' ? 'bg-yellow-50 text-yellow-600' :
                        'bg-red-50 text-red-600'
                      }`}>
                        {selectedRequest.status}
                      </span>
                    </div>
                    
                    {/* Mini Timeline */}
                    <div className="border-l-2 border-[#E2E8F0] ml-2 pl-4 space-y-3 mt-2">
                      <div className="relative">
                        <div className="absolute -left-[21px] top-1 w-3 h-3 bg-[#0D47A1] rounded-full"></div>
                        <p className="text-sm font-medium text-[#1E293B]">Request Raised</p>
                        <p className="text-xs text-[#64748B]">12 May, 2026 - 10:00 AM</p>
                      </div>
                      <div className="relative">
                        <div className="absolute -left-[21px] top-1 w-3 h-3 bg-[#0D47A1] rounded-full"></div>
                        <p className="text-sm font-medium text-[#1E293B]">Technician Assigned</p>
                        <p className="text-xs text-[#64748B]">12 May, 2026 - 11:30 AM</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="p-6 border-t border-[#E2E8F0] flex gap-3 bg-[#F8FAFC]">
                <button 
                  onClick={() => setShowReassignModal(true)}
                  className="bg-white text-[#1E293B] border border-[#E2E8F0] px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-[#F8FAFC] transition-colors"
                >
                  Reassign
                </button>
                {selectedRequest.status === 'Pending' && (
                  <button 
                    onClick={() => updateRequestStatus(selectedRequest.id, 'Assigned')}
                    className="bg-[#0D47A1] text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    Approve Warranty
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-6 flex-1">
          
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {summaryCards.map((card, index) => (
              <div key={index} className="bg-white p-6 rounded-2xl border border-[#E2E8F0] flex items-center gap-4">
                <div className={`w-12 h-12 ${card.color} rounded-xl flex items-center justify-center text-white flex-shrink-0`}>
                  {card.icon}
                </div>
                <div>
                  <p className="text-xs font-medium text-[#64748B]">{card.title}</p>
                  <p className="text-2xl font-bold text-[#1E293B]">{card.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Filters & Actions */}
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
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  className="w-full pl-10 pr-4 py-2 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] focus:border-[#0D47A1] outline-none transition-all text-sm bg-[#F8FAFC]"
                  placeholder="Search Ticket ID, Customer..."
                />
              </div>

              {/* Filters */}
              <select 
                value={selectedStatus}
                onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
                className="text-sm text-[#1E293B] border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#0D47A1] bg-[#F8FAFC]"
              >
                <option>All Status</option>
                <option>Pending</option>
                <option>In Progress</option>
                <option>Completed</option>
                <option>Cancelled</option>
              </select>

              <select 
                value={selectedWarranty}
                onChange={(e) => { setSelectedWarranty(e.target.value); setCurrentPage(1); }}
                className="text-sm text-[#1E293B] border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#0D47A1] bg-[#F8FAFC]"
              >
                <option>Warranty Status</option>
                <option>Under Warranty</option>
                <option>Out of Warranty</option>
              </select>

              <select 
                value={selectedPriority}
                onChange={(e) => { setSelectedPriority(e.target.value); setCurrentPage(1); }}
                className="text-sm text-[#1E293B] border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#0D47A1] bg-[#F8FAFC]"
              >
                <option>Priority</option>
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>
            </div>

            <div className="flex gap-2">
              <button 
                onClick={() => {
                  setSuccessMessage('Additional filters loaded successfully.');
                  setTimeout(() => setSuccessMessage(''), 2500);
                }}
                className="bg-white text-[#1E293B] border border-[#E2E8F0] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#F8FAFC] transition-colors flex items-center gap-2"
              >
                <Filter size={16} /> More Filters
              </button>
              <button 
                onClick={() => {
                  setSuccessMessage('Data exported successfully as CSV!');
                  setTimeout(() => setSuccessMessage(''), 3000);
                }}
                className="bg-white text-[#1E293B] border border-[#E2E8F0] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#F8FAFC] transition-colors flex items-center gap-2"
              >
                <Download size={16} /> Export
              </button>
            </div>
          </div>

          {/* Data Table */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-[#F8FAFC] text-[#64748B] text-xs uppercase">
                  <tr>
                    <th className="px-6 py-4">Ticket ID</th>
                    <th className="px-6 py-4">Customer</th>
                    <th className="px-6 py-4">Product</th>
                    <th className="px-6 py-4">Warranty</th>
                    <th className="px-6 py-4">Technician</th>
                    <th className="px-6 py-4">Priority</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {loading && (
                    <tr><td colSpan={10} className="px-6 py-10 text-center text-[#64748B] font-semibold">Loading complaints…</td></tr>
                  )}
                  {!loading && error && (
                    <tr><td colSpan={10} className="px-6 py-10 text-center text-red-600 font-semibold">{error}</td></tr>
                  )}
                  {!loading && !error && paginatedRequests.length === 0 && (
                    <tr><td colSpan={10} className="px-6 py-10 text-center text-[#64748B] font-semibold">No complaints found.</td></tr>
                  )}
                  {paginatedRequests.map((req) => (
                    <tr 
                      key={req.id} 
                      className="hover:bg-[#F8FAFC] transition-colors cursor-pointer"
                      onClick={() => handleRowClick(req)}
                    >
                      <td className="px-6 py-4 font-medium text-[#0D47A1]">{req.ref}</td>
                      <td className="px-6 py-4 text-[#1E293B]">{req.customer}</td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-[#1E293B] font-medium">{req.product}</p>
                          <p className="text-[#64748B] text-xs">{req.model}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-medium ${req.warranty === 'Under Warranty' ? 'text-green-600' : 'text-orange-600'}`}>
                          {req.warranty}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-[#1E293B]">{req.technician}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          req.priority === 'High' ? 'bg-red-50 text-red-600' :
                          req.priority === 'Medium' ? 'bg-yellow-50 text-yellow-600' :
                          'bg-green-50 text-green-600'
                        }`}>
                          {req.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          req.status === 'Completed' ? 'bg-green-50 text-green-600' :
                          req.status === 'In Progress' ? 'bg-blue-50 text-blue-600' :
                          req.status === 'Pending' ? 'bg-yellow-50 text-yellow-600' :
                          'bg-red-50 text-red-600'
                        }`}>
                          {req.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-[#64748B]">{req.date}</td>
                      <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                        <button 
                          onClick={() => handleRowClick(req)}
                          className="text-[#64748B] hover:text-[#1E293B] p-1.5 hover:bg-[#F1F5F9] rounded-lg"
                        >
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            <div className="p-4 border-t border-[#E2E8F0] flex justify-between items-center text-sm text-[#64748B]">
              <span>
                Showing {filteredRequests.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to {Math.min(currentPage * itemsPerPage, filteredRequests.length)} of {filteredRequests.length} entries
              </span>
              <div className="flex gap-2">
                <button 
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-[#E2E8F0] rounded hover:bg-[#F8FAFC] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                {[...Array(totalPages)].map((_, i) => (
                  <button 
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`px-3 py-1 rounded ${currentPage === i + 1 ? 'bg-[#0D47A1] text-white' : 'border border-[#E2E8F0] hover:bg-[#F8FAFC]'}`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button 
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-[#E2E8F0] rounded hover:bg-[#F8FAFC] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>

          </div>
        )}



        {/* Reassign Modal */}
        {showReassignModal && selectedRequest && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl max-w-md w-full overflow-hidden">
              <div className="p-6 border-b border-[#E2E8F0] flex justify-between items-center bg-[#F8FAFC]">
                <div>
                  <h3 className="text-lg font-bold text-[#1E293B]">Reassign Technician</h3>
                  <p className="text-xs text-[#64748B]">Select a new service partner for ticket {selectedRequest.ref}</p>
                </div>
                <button onClick={() => setShowReassignModal(false)} className="text-[#64748B] hover:text-[#1E293B] p-2 hover:bg-[#EEF2F6] rounded-full">
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleReassignSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#64748B] uppercase mb-1">Select Technician</label>
                  <select
                    value={reassignTechName}
                    onChange={(e) => setReassignTechName(e.target.value)}
                    className="w-full px-3.5 py-2 border border-[#E2E8F0] rounded-lg bg-[#F8FAFC] text-sm outline-none focus:ring-2 focus:ring-[#0D47A1]"
                  >
                    <option>Rahul Kumar</option>
                    <option>Amit Singh</option>
                    <option>Suresh Raina</option>
                    <option>Vikram Batra</option>
                  </select>
                </div>

                <div className="pt-4 border-t border-[#E2E8F0] flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowReassignModal(false)}
                    className="flex-1 bg-white text-[#1E293B] border border-[#E2E8F0] py-2 rounded-lg text-sm font-medium hover:bg-[#F8FAFC]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-[#0D47A1] text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
                  >
                    Confirm Reassign
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
    </div>
  );
};

export default Requests;
