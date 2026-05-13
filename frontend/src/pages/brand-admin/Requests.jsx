import React, { useState } from 'react';
import Sidebar from '../../components/brand-admin/Sidebar';
import Topbar from '../../components/brand-admin/Topbar';
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
  X
} from 'lucide-react';

const Requests = () => {
  const [showDrawer, setShowDrawer] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);

  const summaryCards = [
    { title: 'Pending Requests', value: '124', icon: <Clock size={20} />, color: 'bg-yellow-500' },
    { title: 'Active Requests', value: '86', icon: <ClipboardList size={20} />, color: 'bg-blue-600' },
    { title: 'Escalated Cases', value: '12', icon: <AlertTriangle size={20} />, color: 'bg-red-600' },
    { title: 'Completed Jobs', value: '864', icon: <CheckCircle2 size={20} />, color: 'bg-green-600' },
  ];

  const [requests, setRequests] = useState([
    { id: 'SR-8901', customer: 'Amit Sharma', product: 'Smart TV', model: 'LG-55OLEDEV', invoice: 'INV-2026-001', warranty: 'Under Warranty', technician: 'Rahul Kumar', priority: 'High', status: 'In Progress', date: '12 May, 2026' },
    { id: 'SR-8902', customer: 'Priya Patel', product: 'Refrigerator', model: 'LG-REF-450', invoice: 'INV-2026-002', warranty: 'Out of Warranty', technician: 'Amit Singh', priority: 'Medium', status: 'Pending', date: '12 May, 2026' },
    { id: 'SR-8903', customer: 'Rajesh K.', product: 'Washing Machine', model: 'LG-WM-70', invoice: 'INV-2026-003', warranty: 'Under Warranty', technician: 'Suresh Raina', priority: 'Low', status: 'Completed', date: '11 May, 2026' },
    { id: 'SR-8904', customer: 'Neha Gupta', product: 'Microwave', model: 'LG-MW-20', invoice: 'INV-2026-004', warranty: 'Out of Warranty', technician: 'Vikram Batra', priority: 'High', status: 'Escalated', date: '11 May, 2026' },
  ]);

  const updateRequestStatus = (id, newStatus) => {
    setRequests(requests.map(r => r.id === id ? { ...r, status: newStatus } : r));
    if (selectedRequest && selectedRequest.id === id) {
      setSelectedRequest({ ...selectedRequest, status: newStatus });
    }
    setShowDrawer(false);
  };

  const handleRowClick = (req) => {
    setSelectedRequest(req);
    setShowDrawer(true);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 ml-64 min-h-screen flex flex-col relative">
        {/* Topbar */}
        <Topbar title="Service Requests" />

        {/* Body */}
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
                  className="w-full pl-10 pr-4 py-2 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] focus:border-[#0D47A1] outline-none transition-all text-sm bg-[#F8FAFC]"
                  placeholder="Search Ticket ID, Customer..."
                />
              </div>

              {/* Filters */}
              <select className="text-sm text-[#1E293B] border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#0D47A1] bg-[#F8FAFC]">
                <option>All Status</option>
                <option>Pending</option>
                <option>In Progress</option>
                <option>Completed</option>
                <option>Escalated</option>
              </select>

              <select className="text-sm text-[#1E293B] border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#0D47A1] bg-[#F8FAFC]">
                <option>Warranty Status</option>
                <option>Under Warranty</option>
                <option>Out of Warranty</option>
              </select>

              <select className="text-sm text-[#1E293B] border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#0D47A1] bg-[#F8FAFC]">
                <option>Priority</option>
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>
            </div>

            <div className="flex gap-2">
              <button className="bg-white text-[#1E293B] border border-[#E2E8F0] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#F8FAFC] transition-colors flex items-center gap-2">
                <Filter size={16} /> More Filters
              </button>
              <button className="bg-white text-[#1E293B] border border-[#E2E8F0] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#F8FAFC] transition-colors flex items-center gap-2">
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
                  {requests.map((req) => (
                    <tr 
                      key={req.id} 
                      className="hover:bg-[#F8FAFC] transition-colors cursor-pointer"
                      onClick={() => handleRowClick(req)}
                    >
                      <td className="px-6 py-4 font-medium text-[#0D47A1]">{req.id}</td>
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
                      <td className="px-6 py-4">
                        <button className="text-[#64748B] hover:text-[#1E293B]">
                          <MoreVertical size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            <div className="p-4 border-t border-[#E2E8F0] flex justify-between items-center text-sm text-[#64748B]">
              <span>Showing 1 to 4 of 124 entries</span>
              <div className="flex gap-2">
                <button className="px-3 py-1 border border-[#E2E8F0] rounded hover:bg-[#F8FAFC]">Previous</button>
                <button className="px-3 py-1 bg-[#0D47A1] text-white rounded">1</button>
                <button className="px-3 py-1 border border-[#E2E8F0] rounded hover:bg-[#F8FAFC]">2</button>
                <button className="px-3 py-1 border border-[#E2E8F0] rounded hover:bg-[#F8FAFC]">Next</button>
              </div>
            </div>
          </div>

        </div>

        {/* Details Drawer (Right Slide-over) */}
        {showDrawer && selectedRequest && (
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm z-30 flex justify-end">
            <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col">
              <div className="p-6 border-b border-[#E2E8F0] flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold text-[#1E293B]">Request Details</h2>
                  <p className="text-sm text-[#0D47A1] font-medium">{selectedRequest.id}</p>
                </div>
                <button 
                  onClick={() => setShowDrawer(false)}
                  className="text-[#64748B] hover:text-[#1E293B] p-2 hover:bg-[#F8FAFC] rounded-full"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6 space-y-6 flex-1 overflow-y-auto">
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
              <div className="p-6 border-t border-[#E2E8F0] flex gap-3">
                <button 
                  onClick={() => { alert('Reassign technician feature coming soon!'); setShowDrawer(false); }}
                  className="flex-1 bg-white text-[#1E293B] border border-[#E2E8F0] py-2.5 rounded-lg text-sm font-medium hover:bg-[#F8FAFC] transition-colors"
                >
                  Reassign
                </button>
                <button 
                  onClick={() => updateRequestStatus(selectedRequest.id, 'In Progress')}
                  className="flex-1 bg-[#0D47A1] text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Approve Warranty
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Requests;
