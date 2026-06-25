import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/brand-admin/Sidebar';
import Topbar from '../../components/brand-admin/Topbar';
import { 
  ClipboardList, 
  ShieldCheck, 
  AlertTriangle, 
  Clock, 
  Package, 
  Truck, 
  Users, 
  IndianRupee, 
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  QrCode,
  FileText,
  MoreVertical,
  Eye,
  X,
  CheckCircle2,
  Search
} from 'lucide-react';

const StatCard = ({ title, value, icon, trend, trendType, color }) => {
  return (
    <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] hover:shadow-lg hover:shadow-[#0D47A1]/5 transition-all duration-300">
      <div className="flex justify-between items-start mb-4">
        <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center text-white`}>
          {icon}
        </div>
        {trend && (
          <div className={`flex items-center text-xs font-medium ${trendType === 'up' ? 'text-green-600' : 'text-red-600'}`}>
            {trend}
            {trendType === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          </div>
        )}
      </div>
      <h3 className="text-sm font-medium text-[#64748B] mb-1">{title}</h3>
      <p className="text-2xl font-bold text-[#1E293B] font-sans">{value}</p>
    </div>
  );
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [successMessage, setSuccessMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyQuery, setVerifyQuery] = useState('');
  const [verifyResult, setVerifyResult] = useState(null);

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignReqId, setAssignReqId] = useState('SR-8902');
  const [assignTechName, setAssignTechName] = useState('Rahul Kumar');

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedReq, setSelectedReq] = useState(null);

  const [requests, setRequests] = useState([
    { id: 'SR-8901', customer: 'Amit Sharma', product: 'Smart TV', technician: 'Rahul Kumar', status: 'In Progress', warranty: 'Under Warranty', date: '12 May, 2026' },
    { id: 'SR-8902', customer: 'Priya Patel', product: 'Refrigerator', technician: 'Amit Singh', status: 'Pending', warranty: 'Out of Warranty', date: '12 May, 2026' },
    { id: 'SR-8903', customer: 'Rajesh Koothrappali', product: 'Washing Machine', technician: 'Suresh Raina', status: 'Completed', warranty: 'Under Warranty', date: '11 May, 2026' },
    { id: 'SR-8904', customer: 'Neha Gupta', product: 'Microwave', technician: 'Vikram Batra', status: 'Cancelled', warranty: 'Out of Warranty', date: '11 May, 2026' },
  ]);

  const stats = [
    { title: 'Total Requests', value: (requests.length + 1244).toString(), icon: <ClipboardList size={22} />, trend: '+12%', trendType: 'up', color: 'bg-blue-600' },
    { title: 'Warranty Claims', value: '342', icon: <ShieldCheck size={22} />, trend: '+5%', trendType: 'up', color: 'bg-green-600' },
    { title: 'Non-Warranty Cases', value: '906', icon: <AlertTriangle size={22} />, trend: '+15%', trendType: 'up', color: 'bg-yellow-600' },
    { title: 'Pending Approvals', value: requests.filter(r => r.status === 'Pending').length.toString(), icon: <Clock size={22} />, trend: '-2%', trendType: 'down', color: 'bg-orange-600' },
    { title: 'Parts Requested', value: '45', icon: <Package size={22} />, trend: '+8%', trendType: 'up', color: 'bg-purple-600' },
    { title: 'Parts Dispatched', value: '32', icon: <Truck size={22} />, trend: '+10%', trendType: 'up', color: 'bg-teal-600' },
    { title: 'Active Technicians', value: '86', icon: <Users size={22} />, trend: '+4%', trendType: 'up', color: 'bg-indigo-600' },
    { title: 'Total Revenue', value: '₹4.2L', icon: <IndianRupee size={22} />, trend: '+8%', trendType: 'up', color: 'bg-emerald-600' },
  ];

  const recentActivities = [
    { id: 1, text: 'Customer raised new refrigerator complaint', time: '10 mins ago' },
    { id: 2, text: 'Technician assigned to Request #SR-8902', time: '25 mins ago' },
    { id: 3, text: 'Warranty approved for Washing Machine #WM-451', time: '1 hour ago' },
    { id: 4, text: 'Spare part dispatched for Microwave #MW-102', time: '2 hours ago' },
    { id: 5, text: 'Service completed for AC #AC-302', time: '4 hours ago' },
  ];

  const handleVerifySubmit = (e) => {
    e.preventDefault();
    if (verifyQuery.includes('123')) {
      setVerifyResult({ status: 'Active', customer: 'Amit Sharma', purchaseDate: '10 May, 2025', expiryDate: '09 May, 2027' });
    } else if (verifyQuery.includes('456')) {
      setVerifyResult({ status: 'Expired', customer: 'Priya Patel', purchaseDate: '10 May, 2023', expiryDate: '09 May, 2025' });
    } else {
      setVerifyResult({ status: 'Not Found' });
    }
  };

  const handleAssignSubmit = (e) => {
    e.preventDefault();
    setRequests(requests.map(r => r.id === assignReqId ? { ...r, status: 'In Progress', technician: assignTechName } : r));
    setShowAssignModal(false);
    setSuccessMessage(`Technician ${assignTechName} successfully assigned to request ${assignReqId}!`);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleRowClick = (req) => {
    setSelectedReq(req);
    setShowDetailModal(true);
  };

  const filteredRequests = requests.filter(req => 
    req.customer.toLowerCase().includes(searchQuery.toLowerCase()) || 
    req.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    req.product.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex relative">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 ml-64 min-h-screen flex flex-col">
        {/* Topbar */}
        <Topbar title="Dashboard" />

        {/* Dashboard Body */}
        <div className="p-6 space-y-6 flex-1">
          
          {/* Greeting */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-[#1E293B]">Hello, LG Electronics</h1>
              <p className="text-[#64748B] text-sm">Here's what's happening with your brand today.</p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => { setShowVerifyModal(true); setVerifyQuery(''); setVerifyResult(null); }}
                className="bg-[#0D47A1] text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"
              >
                <QrCode size={18} /> Verify Warranty
              </button>
              <button 
                onClick={() => setShowAssignModal(true)}
                className="bg-white text-[#1E293B] border border-[#E2E8F0] px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-[#F8FAFC] transition-colors flex items-center gap-2 shadow-sm"
              >
                <Plus size={18} /> Assign Technician
              </button>
            </div>
          </div>

          {/* KPI Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <StatCard key={index} {...stat} />
            ))}
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Monthly Service Trends (Simulated) */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-[#E2E8F0]">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-[#1E293B]">Monthly Service Trends</h2>
                <select className="text-sm text-[#64748B] border border-[#E2E8F0] rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-[#0D47A1] bg-[#F8FAFC]">
                  <option>Last 6 Months</option>
                  <option>This Year</option>
                </select>
              </div>
              
              <div className="flex items-end justify-between h-48 gap-4 pt-4">
                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map((month, index) => {
                  const heights = [40, 65, 35, 80, 55, 90];
                  return (
                    <div key={index} className="flex-1 flex flex-col items-center gap-2">
                      <div 
                        className="w-full bg-[#E3ECF9] hover:bg-[#0D47A1] rounded-t-lg transition-all duration-300 group relative"
                        style={{ height: `${heights[index]}%` }}
                      >
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[#1E293B] text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                          {heights[index] * 10}
                        </div>
                      </div>
                      <span className="text-xs text-[#64748B]">{month}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Warranty vs Non-Warranty */}
            <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0]">
              <h2 className="text-lg font-bold text-[#1E293B] mb-6">Warranty vs Non-Warranty</h2>
              
              <div className="flex flex-col items-center justify-center h-48">
                {/* Donut chart simulation */}
                <div 
                  className="w-32 h-32 rounded-full flex items-center justify-center"
                  style={{ background: 'conic-gradient(#0D47A1 65%, #FFD600 0%)' }}
                >
                  <div className="w-20 h-20 bg-white rounded-full flex flex-col items-center justify-center">
                    <span className="text-xl font-bold text-[#1E293B]">65%</span>
                    <span className="text-xs text-[#64748B]">Warranty</span>
                  </div>
                </div>
                
                <div className="flex gap-4 mt-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 bg-[#0D47A1] rounded-full"></div>
                    <span className="text-[#64748B]">Warranty</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 bg-[#FFD600] rounded-full"></div>
                    <span className="text-[#64748B]">Non-Warranty</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tables & Feed Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Recent Requests Table */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
              <div className="p-6 border-b border-[#E2E8F0] flex justify-between items-center">
                <div className="flex items-center gap-4 flex-1">
                  <h2 className="text-lg font-bold text-[#1E293B]">Recent Requests</h2>
                  <div className="relative w-48">
                    <input
                      type="text"
                      className="w-full pl-8 pr-3 py-1 border border-[#E2E8F0] rounded-lg text-xs outline-none bg-[#F8FAFC]"
                      placeholder="Search recent..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <Search size={12} className="absolute left-2.5 top-2 text-[#64748B]" />
                  </div>
                </div>
                <button 
                  onClick={() => navigate('/brand-admin/requests')}
                  className="text-sm text-[#0D47A1] hover:underline font-medium"
                >
                  View All
                </button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-[#F8FAFC] text-[#64748B] text-xs uppercase">
                    <tr>
                      <th className="px-6 py-4">Request ID</th>
                      <th className="px-6 py-4">Customer</th>
                      <th className="px-6 py-4">Product</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {filteredRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-[#F8FAFC] transition-colors">
                        <td className="px-6 py-4 font-medium text-[#0D47A1]">{req.id}</td>
                        <td className="px-6 py-4 text-[#1E293B]">{req.customer}</td>
                        <td className="px-6 py-4 text-[#64748B]">{req.product}</td>
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
                        <td className="px-6 py-4">
                          <button 
                            onClick={() => handleRowClick(req)}
                            className="text-[#64748B] hover:text-[#1E293B] p-1.5 hover:bg-[#EEF2F6] rounded"
                            title="View Details"
                          >
                            <Eye size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Live Activity Feed */}
            <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0]">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-[#1E293B]">Live Activity</h2>
                <button 
                  onClick={() => {
                    setSuccessMessage('Live activity history loaded successfully.');
                    setTimeout(() => setSuccessMessage(''), 3000);
                  }}
                  className="text-sm text-[#0D47A1] hover:underline font-medium"
                >
                  View All
                </button>
              </div>
              
              <div className="space-y-4">
                {recentActivities.map((activity) => (
                  <div key={activity.id} className="flex gap-3 text-sm">
                    <div className="w-2 h-2 bg-[#0D47A1] rounded-full mt-1.5 flex-shrink-0"></div>
                    <div>
                      <p className="text-[#1E293B] font-medium">{activity.text}</p>
                      <p className="text-[#64748B] text-xs mt-0.5">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Verify Warranty Modal */}
      {showVerifyModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-[#E2E8F0] flex justify-between items-center bg-[#F8FAFC]">
              <div>
                <h3 className="text-lg font-bold text-[#1E293B]">Verify Product Warranty</h3>
                <p className="text-xs text-[#64748B]">Scan or check status via Invoice/Serial number</p>
              </div>
              <button onClick={() => setShowVerifyModal(false)} className="text-[#64748B] hover:text-[#1E293B] p-2 hover:bg-[#EEF2F6] rounded-full">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <form onSubmit={handleVerifySubmit} className="flex gap-2">
                <input
                  type="text"
                  required
                  placeholder="e.g. 123 (Active) or 456 (Expired)"
                  value={verifyQuery}
                  onChange={(e) => setVerifyQuery(e.target.value)}
                  className="flex-1 px-3.5 py-2 border border-[#E2E8F0] rounded-lg text-sm bg-[#F8FAFC] outline-none focus:ring-2 focus:ring-[#0D47A1]"
                />
                <button type="submit" className="bg-[#0D47A1] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
                  Verify
                </button>
              </form>

              {verifyResult && (
                <div className="bg-[#F8FAFC] p-4 rounded-xl border border-[#E2E8F0] text-sm space-y-2">
                  {verifyResult.status === 'Active' ? (
                    <>
                      <div className="flex justify-between items-center text-green-600 font-bold">
                        <span className="flex items-center gap-1"><ShieldCheck size={16} /> Warranty Active</span>
                        <span className="text-xs text-[#64748B]">Invoice Verified</span>
                      </div>
                      <p className="text-xs text-[#64748B]">Customer: <span className="font-semibold text-[#1E293B]">{verifyResult.customer}</span></p>
                      <p className="text-xs text-[#64748B]">Valid Till: <span className="font-semibold text-[#1E293B]">{verifyResult.expiryDate}</span></p>
                    </>
                  ) : verifyResult.status === 'Expired' ? (
                    <>
                      <div className="flex justify-between items-center text-red-600 font-bold">
                        <span className="flex items-center gap-1"><AlertTriangle size={16} /> Warranty Expired</span>
                      </div>
                      <p className="text-xs text-[#64748B]">Customer: <span className="font-semibold text-[#1E293B]">{verifyResult.customer}</span></p>
                      <p className="text-xs text-[#64748B]">Expired On: <span className="font-semibold text-[#1E293B]">{verifyResult.expiryDate}</span></p>
                    </>
                  ) : (
                    <p className="text-red-500 font-semibold text-center text-xs">No records found. Try "123" or "456".</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Assign Technician Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-[#E2E8F0] flex justify-between items-center bg-[#F8FAFC]">
              <div>
                <h3 className="text-lg font-bold text-[#1E293B]">Assign Technician</h3>
                <p className="text-xs text-[#64748B]">Dispatch a partner for pending requests</p>
              </div>
              <button onClick={() => setShowAssignModal(false)} className="text-[#64748B] hover:text-[#1E293B] p-2 hover:bg-[#EEF2F6] rounded-full">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleAssignSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#64748B] uppercase mb-1">Select Request</label>
                <select
                  value={assignReqId}
                  onChange={(e) => setAssignReqId(e.target.value)}
                  className="w-full px-3.5 py-2 border border-[#E2E8F0] rounded-lg bg-[#F8FAFC] text-sm outline-none focus:ring-2 focus:ring-[#0D47A1]"
                >
                  {requests.filter(r => r.status === 'Pending').map(r => (
                    <option key={r.id} value={r.id}>{r.id} - {r.customer} ({r.product})</option>
                  ))}
                  {requests.filter(r => r.status === 'Pending').length === 0 && (
                    <option disabled>No pending requests available</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#64748B] uppercase mb-1">Select Technician</label>
                <select
                  value={assignTechName}
                  onChange={(e) => setAssignTechName(e.target.value)}
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
                  onClick={() => setShowAssignModal(false)}
                  className="flex-1 bg-white text-[#1E293B] border border-[#E2E8F0] py-2 rounded-lg text-sm font-medium hover:bg-[#F8FAFC]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={requests.filter(r => r.status === 'Pending').length === 0}
                  className="flex-1 bg-[#0D47A1] text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Assign Partner
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailModal && selectedReq && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-[#E2E8F0] flex justify-between items-center bg-[#F8FAFC]">
              <div>
                <h3 className="text-lg font-bold text-[#1E293B]">Request Details</h3>
                <p className="text-xs text-[#0D47A1] font-bold">{selectedReq.id}</p>
              </div>
              <button onClick={() => setShowDetailModal(false)} className="text-[#64748B] hover:text-[#1E293B] p-2 hover:bg-[#EEF2F6] rounded-full">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-[#64748B] block">Customer</span>
                  <span className="font-semibold text-[#1E293B]">{selectedReq.customer}</span>
                </div>
                <div>
                  <span className="text-xs text-[#64748B] block">Product</span>
                  <span className="font-semibold text-[#1E293B]">{selectedReq.product}</span>
                </div>
                <div>
                  <span className="text-xs text-[#64748B] block">Technician</span>
                  <span className="font-semibold text-[#1E293B]">{selectedReq.technician || 'Not Assigned'}</span>
                </div>
                <div>
                  <span className="text-xs text-[#64748B] block">Coverage</span>
                  <span className="font-semibold text-blue-650">{selectedReq.warranty}</span>
                </div>
              </div>
              <div className="border-t border-[#E2E8F0] pt-3 flex justify-between items-center">
                <span className="text-xs text-[#64748B]">Status:</span>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                  selectedReq.status === 'Completed' ? 'bg-green-50 text-green-600' :
                  selectedReq.status === 'In Progress' ? 'bg-blue-50 text-blue-600' :
                  selectedReq.status === 'Pending' ? 'bg-yellow-50 text-yellow-600' :
                  'bg-red-50 text-red-600'
                }`}>
                  {selectedReq.status}
                </span>
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

export default Dashboard;
