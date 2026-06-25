import React, { useState } from 'react';
import Sidebar from '../../components/brand-admin/Sidebar';
import Topbar from '../../components/brand-admin/Topbar';
import { 
  Search, 
  Filter, 
  FileCheck, 
  Clock, 
  CheckCircle2, 
  TrendingUp, 
  X,
  Eye,
  IndianRupee,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  Check,
  ArrowLeft
} from 'lucide-react';

const WarrantyClaims = () => {
  const [activeTab, setActiveTab] = useState('claims'); // 'claims' or 'extended'
  const [showDrawer, setShowDrawer] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  const [claimsSearchQuery, setClaimsSearchQuery] = useState('');
  const [selectedClaimType, setSelectedClaimType] = useState('All Claim Types');
  const [selectedClaimStatus, setSelectedClaimStatus] = useState('All Status');

  const [extendedSearchQuery, setExtendedSearchQuery] = useState('');

  const [claims, setClaims] = useState([
    { id: 'CLM-8801', technician: 'Rahul Kumar', item: 'Washing Machine Motor', claimType: 'Brand Warranty', amount: '₹1,850', status: 'Pending Approval', date: '12 May, 2026', customer: 'Mrs. Neha Verma', serial: 'LG-REF-99201X', reason: 'Motor windings burnt out' },
    { id: 'CLM-8802', technician: 'Amit Singh', item: 'PCB Board', claimType: 'Extended Warranty', amount: '₹2,450', status: 'Approved', date: '10 May, 2026', customer: 'Mr. Anil Mehta', serial: 'CAR-AC-7762X', reason: 'PCB relay failure' },
    { id: 'CLM-8803', technician: 'Suresh Raina', item: 'Compressor Coil', claimType: 'Brand Warranty', amount: '₹2,200', status: 'Rejected', date: '08 May, 2026', customer: 'Mrs. Indu Mishra', serial: 'IFB-MW-3301X', reason: 'Coil damage due to external impact' },
    { id: 'CLM-8804', technician: 'Vikram Batra', item: 'LED TV Panel', claimType: 'Extended Warranty', amount: '₹8,500', status: 'Pending Approval', date: '07 May, 2026', customer: 'Vikram Singh', serial: 'SNY-TV-55102', reason: 'Vertical lines on display' },
  ]);

  const [extendedWarrantyReg, setExtendedWarrantyReg] = useState([
    { regId: 'EW-101', customer: 'Karan Johar', product: 'Split AC', brand: 'LG', model: 'LG-AC-1.5T', planName: 'NCC Protect Plus', validity: '15 Jan 2028', status: 'Active' },
    { regId: 'EW-102', customer: 'Shilpa Shetty', product: 'Washing Machine', brand: 'LG', model: 'LG-WM-FrontLoad', planName: 'NCC Shield Basic', validity: '01 Nov 2027', status: 'Active' },
    { regId: 'EW-103', customer: 'Rajkumar Hirani', product: 'Microwave', brand: 'LG', model: 'LG-MW-Convection', planName: 'NCC Shield Basic', validity: '12 Apr 2026', status: 'Expired' },
  ]);

  const stats = [
    { title: 'Total Claims', value: (claims.length + 144).toString(), icon: <FileCheck size={20} />, color: 'bg-blue-600' },
    { title: 'Approved Payouts', value: '₹2.4L', icon: <IndianRupee size={20} />, color: 'bg-emerald-600' },
    { title: 'Pending Approval', value: '₹28,500', icon: <Clock size={20} />, color: 'bg-yellow-500' },
    { title: 'Rejection Rate', value: '4.2%', icon: <AlertTriangle size={20} />, color: 'bg-red-650' },
  ];

  const handleRowClick = (claim) => {
    setSelectedClaim(claim);
    setShowDrawer(true);
  };

  const updateClaimStatus = (id, newStatus) => {
    setClaims(claims.map(c => c.id === id ? { ...c, status: newStatus } : c));
    if (selectedClaim && selectedClaim.id === id) {
      setSelectedClaim({ ...selectedClaim, status: newStatus });
    }
    setSuccessMessage(`Claim status updated to: ${newStatus}`);
    setShowDrawer(false);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const filteredClaims = claims.filter(c => {
    const matchesSearch = c.technician.toLowerCase().includes(claimsSearchQuery.toLowerCase()) || 
                          c.id.toLowerCase().includes(claimsSearchQuery.toLowerCase()) ||
                          c.item.toLowerCase().includes(claimsSearchQuery.toLowerCase());
    const matchesType = selectedClaimType === 'All Claim Types' || c.claimType === selectedClaimType;
    const matchesStatus = selectedClaimStatus === 'All Status' || c.status === selectedClaimStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const filteredExtended = extendedWarrantyReg.filter(ew => {
    return ew.customer.toLowerCase().includes(extendedSearchQuery.toLowerCase()) ||
           ew.regId.toLowerCase().includes(extendedSearchQuery.toLowerCase()) ||
           ew.product.toLowerCase().includes(extendedSearchQuery.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      <Sidebar />

      <div className="flex-1 ml-64 min-h-screen flex flex-col relative">
        <Topbar title="Warranty & Claims Management" />

        {showDrawer && selectedClaim ? (
          <div className="p-6 space-y-6 flex-1 bg-[#F8FAFC] text-left">
            <div className="flex items-center justify-between">
              <button 
                onClick={() => setShowDrawer(false)}
                className="flex items-center gap-2 text-sm font-semibold text-[#0D47A1] hover:text-blue-800 transition-colors"
              >
                <ArrowLeft size={16} /> Back to Claims
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden flex flex-col max-w-3xl text-sm">
              <div className="p-6 border-b border-[#E2E8F0] flex justify-between items-center bg-[#F8FAFC]">
                <div>
                  <h2 className="text-lg font-bold text-[#1E293B]">Claim Details</h2>
                  <p className="text-sm text-[#0D47A1] font-medium">{selectedClaim.id}</p>
                </div>
              </div>

              <div className="p-6 space-y-6 flex-1">
                <div>
                  <h3 className="text-xs uppercase text-[#64748B] font-semibold mb-2">Claim Overview</h3>
                  <div className="bg-[#F8FAFC] p-4 rounded-xl space-y-2">
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Claim Type:</span>
                      <span className="font-semibold text-indigo-600">{selectedClaim.claimType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Spare Part:</span>
                      <span className="font-semibold text-[#1E293B]">{selectedClaim.item}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Claim Amount:</span>
                      <span className="font-bold text-[#1E293B]">{selectedClaim.amount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Technician:</span>
                      <span className="font-medium text-blue-650">{selectedClaim.technician}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs uppercase text-[#64748B] font-semibold mb-2">Customer & Product details</h3>
                  <div className="bg-[#F8FAFC] p-4 rounded-xl space-y-2">
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Customer Name:</span>
                      <span className="font-medium text-[#1E293B]">{selectedClaim.customer}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Serial Number:</span>
                      <span className="font-mono text-xs text-[#1E293B]">{selectedClaim.serial}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Date Submitted:</span>
                      <span className="text-[#64748B]">{selectedClaim.date}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs uppercase text-[#64748B] font-semibold mb-2">Diagnosis Reason</h3>
                  <p className="bg-[#F8FAFC] p-4 rounded-xl text-xs text-slate-650 font-medium">
                    {selectedClaim.reason}
                  </p>
                </div>
              </div>

              <div className="p-6 border-t border-[#E2E8F0] flex gap-3 bg-[#F8FAFC]">
                {selectedClaim.status === 'Pending Approval' ? (
                  <>
                    <button 
                      onClick={() => updateClaimStatus(selectedClaim.id, 'Approved')}
                      className="bg-[#0D47A1] text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-1 shadow-sm"
                    >
                      <Check size={16} /> Approve Claim
                    </button>
                    <button 
                      onClick={() => updateClaimStatus(selectedClaim.id, 'Rejected')}
                      className="bg-white text-red-600 border border-red-200 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-red-50/20 transition-colors flex items-center justify-center gap-1"
                    >
                      <X size={16} /> Reject Claim
                    </button>
                  </>
                ) : (
                  <button 
                    disabled 
                    className="w-full bg-gray-150 text-gray-450 py-2.5 rounded-lg text-sm font-medium cursor-not-allowed flex items-center justify-center gap-1"
                  >
                    ✓ Claim Reconciled & Settle Completed
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-6 flex-1">
            {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((card, index) => (
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

          {/* Tabs */}
          <div className="flex border-b border-[#E2E8F0]">
            <button
              className={`px-6 py-3 text-sm font-bold transition-all border-b-2 -mb-[2px] ${
                activeTab === 'claims' 
                  ? 'border-[#0D47A1] text-[#0D47A1]' 
                  : 'border-transparent text-[#64748B] hover:text-[#1E293B]'
              }`}
              onClick={() => setActiveTab('claims')}
            >
              FOC Claims Queue
            </button>
            <button
              className={`px-6 py-3 text-sm font-bold transition-all border-b-2 -mb-[2px] ${
                activeTab === 'extended' 
                  ? 'border-[#0D47A1] text-[#0D47A1]' 
                  : 'border-transparent text-[#64748B] hover:text-[#1E293B]'
              }`}
              onClick={() => setActiveTab('extended')}
            >
              Extended Warranty Register
            </button>
          </div>

          {activeTab === 'claims' ? (
            <div className="space-y-6">
              {/* Filters */}
              <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] flex flex-wrap gap-4 items-center justify-between">
                <div className="flex flex-wrap gap-3 items-center flex-1">
                  <div className="relative w-64">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#64748B]">
                      <Search size={16} />
                    </div>
                    <input
                      type="text"
                      value={claimsSearchQuery}
                      onChange={(e) => setClaimsSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] focus:border-[#0D47A1] outline-none transition-all text-sm bg-[#F8FAFC]"
                      placeholder="Search Claim ID, Technician..."
                    />
                  </div>

                  <select 
                    value={selectedClaimType}
                    onChange={(e) => setSelectedClaimType(e.target.value)}
                    className="text-sm text-[#1E293B] border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#0D47A1] bg-[#F8FAFC]"
                  >
                    <option>All Claim Types</option>
                    <option>Brand Warranty</option>
                    <option>Extended Warranty</option>
                  </select>

                  <select 
                    value={selectedClaimStatus}
                    onChange={(e) => setSelectedClaimStatus(e.target.value)}
                    className="text-sm text-[#1E293B] border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#0D47A1] bg-[#F8FAFC]"
                  >
                    <option>All Status</option>
                    <option>Pending Approval</option>
                    <option>Approved</option>
                    <option>Rejected</option>
                  </select>
                </div>
              </div>

              {/* Claims Table */}
              <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-[#F8FAFC] text-[#64748B] text-xs uppercase">
                      <tr>
                        <th className="px-6 py-4">Claim ID</th>
                        <th className="px-6 py-4">Technician</th>
                        <th className="px-6 py-4">Spare Part / Item</th>
                        <th className="px-6 py-4">Claim Type</th>
                        <th className="px-6 py-4">Claim Value</th>
                        <th className="px-6 py-4">Submitted Date</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0]">
                      {filteredClaims.map((claim) => (
                        <tr 
                          key={claim.id} 
                          className="hover:bg-[#F8FAFC] transition-colors cursor-pointer"
                          onClick={() => handleRowClick(claim)}
                        >
                          <td className="px-6 py-4 font-medium text-[#0D47A1]">{claim.id}</td>
                          <td className="px-6 py-4 text-[#1E293B]">{claim.technician}</td>
                          <td className="px-6 py-4 text-[#1E293B]">{claim.item}</td>
                          <td className="px-6 py-4 text-[#64748B]">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              claim.claimType === 'Extended Warranty' ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'
                            }`}>
                              {claim.claimType}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-bold text-[#1E293B]">{claim.amount}</td>
                          <td className="px-6 py-4 text-[#64748B]">{claim.date}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                              claim.status === 'Approved' ? 'bg-green-50 text-green-600' :
                              claim.status === 'Rejected' ? 'bg-red-50 text-red-600' :
                              'bg-yellow-50 text-yellow-600'
                            }`}>
                              {claim.status}
                            </span>
                          </td>
                          <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                            <button 
                              onClick={() => handleRowClick(claim)}
                              className="text-[#64748B] hover:text-[#1E293B] p-1.5 hover:bg-[#F1F5F9] rounded-lg"
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
            </div>
          ) : (
            <div className="space-y-6">
              {/* Filters for Extended */}
              <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] flex flex-wrap gap-4 items-center justify-between">
                <div className="flex flex-wrap gap-3 items-center flex-1">
                  <div className="relative w-64">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#64748B]">
                      <Search size={16} />
                    </div>
                    <input
                      type="text"
                      value={extendedSearchQuery}
                      onChange={(e) => setExtendedSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] focus:border-[#0D47A1] outline-none transition-all text-sm bg-[#F8FAFC]"
                      placeholder="Search Reg ID, Customer, Appliance..."
                    />
                  </div>
                </div>
              </div>

              {/* Extended Warranties Table */}
              <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-[#F8FAFC] text-[#64748B] text-xs uppercase">
                      <tr>
                        <th className="px-6 py-4">Reg ID</th>
                        <th className="px-6 py-4">Customer</th>
                        <th className="px-6 py-4">Appliance</th>
                        <th className="px-6 py-4">Brand & Model</th>
                        <th className="px-6 py-4">Plan Name</th>
                        <th className="px-6 py-4">Valid Till</th>
                        <th className="px-6 py-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0]">
                      {filteredExtended.map((ew) => (
                        <tr key={ew.regId} className="hover:bg-[#F8FAFC] transition-colors">
                          <td className="px-6 py-4 font-medium text-[#0D47A1]">{ew.regId}</td>
                          <td className="px-6 py-4 text-[#1E293B]">{ew.customer}</td>
                          <td className="px-6 py-4 text-[#1E293B]">{ew.product}</td>
                          <td className="px-6 py-4 text-[#64748B]">{ew.brand} - {ew.model}</td>
                          <td className="px-6 py-4 font-semibold text-purple-700">{ew.planName}</td>
                          <td className="px-6 py-4 text-[#64748B]">{ew.validity}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                              ew.status === 'Active' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                            }`}>
                              {ew.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
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

export default WarrantyClaims;
