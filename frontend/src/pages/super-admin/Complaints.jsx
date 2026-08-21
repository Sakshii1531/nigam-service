import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/super-admin/Sidebar';
import Topbar from '../../components/super-admin/Topbar';
import { 
  Search, 
  Filter, 
  AlertTriangle, 
  Eye, 
  CheckCircle, 
  UserPlus,
  ArrowUpRight,
  X,
  CheckCircle2,
  Clock,
  ArrowLeft
} from 'lucide-react';
import { apiRequest } from '../../lib/apiClient';

const Complaints = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('All Priority');
  const [selectedStatus, setSelectedStatus] = useState('All Status');
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Field names are the Escalation schema's — `raisedBy` is a role label
  // ('Customer' | 'Technician' | …), not a populated user, and there is no
  // `subject`/`details` field, so those reads always fell through to defaults.
  const shapeComplaint = (c) => ({
    id: c.id,
    humanId: c.humanId || c.id,
    user: c.raisedBy || 'Customer',
    subject: c.reason || 'Escalation',
    priority: c.priority || 'Medium',
    status: c.status || 'Open',
    date: c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A',
    description: c.description || 'No details provided',
  });

  useEffect(() => {
    const fetchComplaints = async () => {
      try {
        const data = await apiRequest('/super-admin/escalations?limit=200', { auth: true });
        setComplaints((data || []).map(shapeComplaint));
      } catch (err) {
        setLoadError(err.message || 'Could not load complaints.');
      } finally {
        setLoading(false);
      }
    };
    fetchComplaints();
  }, []);

  const showToast = (message) => {
    setSuccessMessage(message);
    setTimeout(() => {
      setSuccessMessage('');
    }, 3000);
  };

  // Both handlers persist now. They used to change browser state only, so an
  // investigation or a priority bump vanished on reload and no one else saw it.
  const applyUpdate = async (id, path, body, message, optimistic) => {
    const previous = complaints;
    setComplaints(complaints.map(c => (c.id === id ? { ...c, ...optimistic } : c)));
    if (selectedComplaint?.id === id) setSelectedComplaint({ ...selectedComplaint, ...optimistic });

    try {
      const res = await apiRequest(`/super-admin/escalations/${id}/${path}`, { method: 'PATCH', auth: true, body });
      const updated = shapeComplaint(res);
      setComplaints((prev) => prev.map((c) => (c.id === id ? updated : c)));
      if (selectedComplaint?.id === id) setSelectedComplaint(updated);
      showToast(message);
    } catch (err) {
      setComplaints(previous);
      if (selectedComplaint?.id === id) setSelectedComplaint(previous.find((c) => c.id === id) || null);
      setLoadError(err.message || 'Could not update this escalation.');
    }
  };

  const handleStatusChange = (id, newStatus) =>
    applyUpdate(id, 'status', { status: newStatus }, `Escalation status updated to ${newStatus}`, { status: newStatus });

  const handleEscalate = (id) =>
    applyUpdate(id, 'priority', { priority: 'High' }, 'Escalation raised to HIGH priority.', { priority: 'High' });

  const handleRowClick = (cmp) => {
    setSelectedComplaint(cmp);
    setShowDrawer(true);
  };

  const filteredComplaints = complaints.filter(c => {
    const matchesSearch = c.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.subject.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority = selectedPriority === 'All Priority' || c.priority === selectedPriority;
    const matchesStatus = selectedStatus === 'All Status' || c.status === selectedStatus;
    return matchesSearch && matchesPriority && matchesStatus;
  });

  const highPriorityCount = complaints.filter(c => c.priority === 'High' && c.status !== 'Resolved').length;
  const pendingCount = complaints.filter(c => !['Resolved'].includes(c.status)).length;
  const resolvedCount = complaints.filter(c => c.status === 'Resolved').length;

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex relative">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 ml-64 min-h-screen flex flex-col">
        {/* Topbar */}
        <Topbar title="Complaints & Escalations" />

        {loadError && (
          <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs font-bold text-red-700">
            {loadError}
          </div>
        )}

        {/* Body */}
        {showDrawer && selectedComplaint ? (
          <div className="p-6 space-y-6 flex-1 bg-[#F8FAFC] text-left">
            <div className="flex items-center justify-between">
              <button 
                onClick={() => setShowDrawer(false)}
                className="flex items-center gap-2 text-sm font-semibold text-[#0D47A1] hover:text-blue-800 transition-colors"
              >
                <ArrowLeft size={16} /> Back to Complaints
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden flex flex-col">
              <div className="p-6 border-b border-[#E2E8F0] bg-[#F8FAFC]">
                <h3 className="text-lg font-bold text-[#1E293B]">Complaint Record</h3>
                <p className="text-xs text-[#0D47A1] font-semibold">{selectedComplaint.id}</p>
              </div>

              <div className="p-6 space-y-6 flex-1 overflow-y-auto">
                <div className="space-y-4">
                  <div>
                    <span className="text-xs font-semibold text-[#64748B] uppercase block">Customer/User</span>
                    <p className="text-sm font-bold text-[#1E293B]">{selectedComplaint.user}</p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-[#64748B] uppercase block">Subject</span>
                    <p className="text-sm font-semibold text-[#1E293B]">{selectedComplaint.subject}</p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-[#64748B] uppercase block">Complaint Description</span>
                    <p className="text-sm text-[#1E293B] bg-slate-50 p-3 rounded-lg border border-slate-100 mt-1 leading-relaxed">
                      {selectedComplaint.description}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs font-semibold text-[#64748B] uppercase block">Priority Level</span>
                      <span className={`inline-block mt-1 px-2.5 py-0.5 rounded text-xs font-medium ${
                        selectedComplaint.priority === 'High' ? 'bg-red-50 text-red-600' :
                        selectedComplaint.priority === 'Medium' ? 'bg-yellow-50 text-yellow-600' :
                        'bg-green-50 text-green-600'
                      }`}>
                        {selectedComplaint.priority}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-[#64748B] uppercase block">Current Status</span>
                      <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        selectedComplaint.status === 'Resolved' ? 'bg-green-50 text-green-600' :
                        selectedComplaint.status === 'In Progress' ? 'bg-blue-50 text-blue-600' :
                        'bg-yellow-50 text-yellow-600'
                      }`}>
                        {selectedComplaint.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-[#E2E8F0] bg-[#F8FAFC] flex gap-3">
                {selectedComplaint.status !== 'Resolved' ? (
                  <>
                    <button 
                      onClick={() => { handleStatusChange(selectedComplaint.id, 'In Progress'); setShowDrawer(false); }}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors"
                    >
                      Investigate
                    </button>
                    <button 
                      onClick={() => { handleStatusChange(selectedComplaint.id, 'Resolved'); setShowDrawer(false); }}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-green-700 transition-colors"
                    >
                      Resolve
                    </button>
                  </>
                ) : (
                  <button 
                    disabled 
                    className="bg-slate-100 text-slate-400 px-4 py-2 rounded-lg text-xs font-semibold cursor-not-allowed"
                  >
                    Resolved & Closed
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
          
          {/* Header Actions */}
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-[#1E293B]">Customer Complaints</h2>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] flex items-center gap-4 shadow-sm">
              <div className="w-12 h-12 bg-red-600 rounded-xl flex items-center justify-center text-white flex-shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div>
                <p className="text-xs font-medium text-[#64748B]">Active High Priority</p>
                <p className="text-2xl font-bold text-[#1E293B]">{highPriorityCount}</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] flex items-center gap-4 shadow-sm">
              <div className="w-12 h-12 bg-yellow-500 rounded-xl flex items-center justify-center text-white flex-shrink-0">
                <Clock size={20} />
              </div>
              <div>
                <p className="text-xs font-medium text-[#64748B]">Pending Resolution</p>
                <p className="text-2xl font-bold text-[#1E293B]">{pendingCount}</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] flex items-center gap-4 shadow-sm">
              <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center text-white flex-shrink-0">
                <CheckCircle size={20} />
              </div>
              <div>
                <p className="text-xs font-medium text-[#64748B]">Resolved Total</p>
                <p className="text-2xl font-bold text-[#1E293B]">{resolvedCount}</p>
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
                  placeholder="Search Complaint ID, User..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Filters */}
              <select 
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value)}
                className="text-sm text-[#1E293B] border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#0D47A1] bg-[#F8FAFC]"
              >
                <option>All Priority</option>
                <option>Critical</option>
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>

              <select 
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="text-sm text-[#1E293B] border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#0D47A1] bg-[#F8FAFC]"
              >
                <option>All Status</option>
                <option>Open</option>
                <option>Unassigned</option>
                <option>Under Review</option>
                <option>In Progress</option>
                <option>Assigned to Senior</option>
                <option>Resolved</option>
              </select>
            </div>

            <button 
              onClick={() => {
                setSearchQuery('');
                setSelectedPriority('All Priority');
                setSelectedStatus('All Status');
                showToast('Filters reset successfully');
              }}
              className="bg-white text-[#1E293B] border border-[#E2E8F0] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#F8FAFC] transition-colors"
            >
              Reset Filters
            </button>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-[#F8FAFC] text-[#64748B] text-xs uppercase">
                  <tr>
                    <th className="px-6 py-4">Complaint ID</th>
                    <th className="px-6 py-4">User</th>
                    <th className="px-6 py-4">Subject</th>
                    <th className="px-6 py-4">Priority</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {filteredComplaints.map((cmp) => (
                    <tr 
                      key={cmp.id} 
                      className="hover:bg-[#F8FAFC] transition-colors cursor-pointer"
                      onClick={() => handleRowClick(cmp)}
                    >
                      <td className="px-6 py-4 font-medium text-[#0D47A1]">{cmp.id}</td>
                      <td className="px-6 py-4 text-[#1E293B] font-medium">{cmp.user}</td>
                      <td className="px-6 py-4 text-[#1E293B]">{cmp.subject}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          cmp.priority === 'High' ? 'bg-red-50 text-red-600' :
                          cmp.priority === 'Medium' ? 'bg-yellow-50 text-yellow-600' :
                          'bg-green-50 text-green-600'
                        }`}>
                          {cmp.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          cmp.status === 'Resolved' ? 'bg-green-50 text-green-600' :
                          cmp.status === 'In Progress' ? 'bg-blue-50 text-blue-600' :
                          'bg-yellow-50 text-yellow-600'
                        }`}>
                          {cmp.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-[#64748B]">{cmp.date}</td>
                      <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-2 justify-center">
                          <button 
                            onClick={() => handleRowClick(cmp)}
                            className="p-1.5 text-[#64748B] hover:text-[#0D47A1] hover:bg-[#EEF4FF] rounded" 
                            title="View Details"
                          >
                            <Eye size={16} />
                          </button>
                          
                          {cmp.status !== 'Resolved' && (
                            <>
                              <button 
                                onClick={() => handleStatusChange(cmp.id, 'In Progress')}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" 
                                title="Investigate"
                              >
                                <UserPlus size={16} />
                              </button>
                              <button 
                                onClick={() => handleStatusChange(cmp.id, 'Resolved')}
                                className="p-1.5 text-green-600 hover:bg-green-50 rounded" 
                                title="Resolve"
                              >
                                <CheckCircle size={16} />
                              </button>
                            </>
                          )}


                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredComplaints.length === 0 && (
                    <tr>
                      <td colSpan="7" className="px-6 py-10 text-center text-sm text-[#64748B]">
                        No complaints found matching search or filter criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      </div>



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

export default Complaints;
