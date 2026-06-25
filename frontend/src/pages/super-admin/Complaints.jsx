import React, { useState } from 'react';
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
  Clock
} from 'lucide-react';

const Complaints = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('All Priority');
  const [selectedStatus, setSelectedStatus] = useState('All Status');
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [showDrawer, setShowDrawer] = useState(false);

  const [complaints, setComplaints] = useState([
    { id: 'CMP-301', user: 'Amit Sharma', subject: 'Technician did not arrive', priority: 'High', status: 'Pending', date: '12 May, 2026', description: 'Technician Rahul Kumar was scheduled to arrive at 10 AM for LG TV repair. He has not arrived yet and is not picking up calls.' },
    { id: 'CMP-302', user: 'Priya Patel', subject: 'Overcharged for part', priority: 'Medium', status: 'In Progress', date: '12 May, 2026', description: 'Charged INR 2500 for Refrigerator filter which was listed as 1200 on the brand panel catalog.' },
    { id: 'CMP-303', user: 'Rajesh K.', subject: 'Bad behavior by tech', priority: 'High', status: 'Pending', date: '11 May, 2026', description: 'Technician used inappropriate language when asked to show identity proof.' },
    { id: 'CMP-304', user: 'Neha Gupta', subject: 'Appliance not working after repair', priority: 'High', status: 'Resolved', date: '10 May, 2026', description: 'Washing machine dryer motor stopped spinning again just 2 hours after technician left.' },
  ]);

  const showToast = (message) => {
    setSuccessMessage(message);
    setTimeout(() => {
      setSuccessMessage('');
    }, 3000);
  };

  const handleStatusChange = (id, newStatus) => {
    setComplaints(complaints.map(c => c.id === id ? { ...c, status: newStatus } : c));
    if (selectedComplaint && selectedComplaint.id === id) {
      setSelectedComplaint({ ...selectedComplaint, status: newStatus });
    }
    showToast(`Complaint ${id} status updated to ${newStatus}`);
  };

  const handleEscalate = (id) => {
    setComplaints(complaints.map(c => c.id === id ? { ...c, priority: 'High' } : c));
    if (selectedComplaint && selectedComplaint.id === id) {
      setSelectedComplaint({ ...selectedComplaint, priority: 'High' });
    }
    showToast(`Complaint ${id} has been escalated to HIGH priority!`);
  };

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
  const pendingCount = complaints.filter(c => c.status === 'Pending').length;
  const resolvedCount = complaints.filter(c => c.status === 'Resolved').length;

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex relative">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 ml-64 min-h-screen flex flex-col">
        {/* Topbar */}
        <Topbar title="Complaints & Escalations" />

        {/* Body */}
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
                <p className="text-2xl font-bold text-[#1E293B]">{highPriorityCount + 4}</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] flex items-center gap-4 shadow-sm">
              <div className="w-12 h-12 bg-yellow-500 rounded-xl flex items-center justify-center text-white flex-shrink-0">
                <Clock size={20} />
              </div>
              <div>
                <p className="text-xs font-medium text-[#64748B]">Pending Resolution</p>
                <p className="text-2xl font-bold text-[#1E293B]">{pendingCount + 10}</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] flex items-center gap-4 shadow-sm">
              <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center text-white flex-shrink-0">
                <CheckCircle size={20} />
              </div>
              <div>
                <p className="text-xs font-medium text-[#64748B]">Resolved Total</p>
                <p className="text-2xl font-bold text-[#1E293B]">{resolvedCount + 7}</p>
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
                <option>Pending</option>
                <option>In Progress</option>
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

                          <button 
                            onClick={() => handleEscalate(cmp.id)}
                            className="p-1.5 text-[#64748B] hover:text-red-600 hover:bg-red-50 rounded" 
                            title="Escalate"
                          >
                            <ArrowUpRight size={16} />
                          </button>
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
      </div>

      {/* Slide-over Drawer for details */}
      {showDrawer && selectedComplaint && (
        <div className="fixed inset-0 z-40 overflow-hidden">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity" onClick={() => setShowDrawer(false)} />
          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
              
              {/* Header */}
              <div className="p-6 border-b border-[#E2E8F0] flex justify-between items-center bg-[#F8FAFC]">
                <div>
                  <h3 className="text-lg font-bold text-[#1E293B]">Complaint Record</h3>
                  <p className="text-xs text-[#0D47A1] font-semibold">{selectedComplaint.id}</p>
                </div>
                <button 
                  onClick={() => setShowDrawer(false)}
                  className="text-[#64748B] hover:text-[#1E293B] p-2 hover:bg-[#E2E8F0] rounded-full"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Body */}
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

              {/* Footer */}
              <div className="p-4 border-t border-[#E2E8F0] bg-[#F8FAFC] flex gap-3">
                {selectedComplaint.status !== 'Resolved' ? (
                  <>
                    <button 
                      onClick={() => { handleStatusChange(selectedComplaint.id, 'In Progress'); setShowDrawer(false); }}
                      className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-xs font-semibold hover:bg-blue-700 transition-colors"
                    >
                      Investigate
                    </button>
                    <button 
                      onClick={() => { handleStatusChange(selectedComplaint.id, 'Resolved'); setShowDrawer(false); }}
                      className="flex-1 bg-green-600 text-white py-2.5 rounded-xl text-xs font-semibold hover:bg-green-700 transition-colors"
                    >
                      Resolve
                    </button>
                  </>
                ) : (
                  <button 
                    disabled 
                    className="flex-1 bg-slate-100 text-slate-400 py-2.5 rounded-xl text-xs font-semibold cursor-not-allowed"
                  >
                    Resolved & Closed
                  </button>
                )}
                <button 
                  onClick={() => setShowDrawer(false)}
                  className="flex-1 bg-white text-[#64748B] border border-[#E2E8F0] py-2.5 rounded-xl text-xs font-semibold hover:bg-[#F8FAFC] transition-colors"
                >
                  Close
                </button>
              </div>

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

export default Complaints;
