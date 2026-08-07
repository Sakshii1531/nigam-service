import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/super-admin/Sidebar';
import Topbar from '../../components/super-admin/Topbar';
import { 
  Search, 
  Filter, 
  MoreVertical, 
  Eye, 
  CheckCircle, 
  XCircle,
  FileCheck,
  Download,
  ExternalLink,
  X,
  CheckCircle2,
  Calendar,
  Building,
  User,
  CreditCard,
  ArrowLeft
} from 'lucide-react';
import { apiRequest } from '../../lib/apiClient';

const Warranty = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All Status');
  const [successMessage, setSuccessMessage] = useState('');
  
  // Modals state
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    const fetchClaims = async () => {
      try {
        const data = await apiRequest('/super-admin/claims', { auth: true });
        const list = Array.isArray(data?.data) ? data.data : [];
        // Field names are the Claim schema's — the previous mapping read
        // c.user / c.invoiceNumber / c.issueDescription, none of which exist,
        // so every row showed "Customer", "N/A" and a generic issue string.
        setClaims(list.map(c => ({
          id: c.id,
          humanId: c.humanId || c.id,
          customer: c.raisedBy?.name || 'Unknown',
          phone: c.raisedBy?.phone || 'N/A',
          product: c.item || c.serviceRequest?.category || 'Appliance',
          brand: c.brand || 'N/A',
          amount: c.amount || 0,
          serviceRequest: c.serviceRequest?.humanId || null,
          status: c.status || 'Pending Approval',
          date: c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A',
          issue: c.reason || 'No reason recorded',
          coverage: c.claimType || 'D2C',
        })));
      } catch (err) {
        setLoadError(err.message || 'Could not load warranty claims.');
      } finally {
        setLoading(false);
      }
    };
    fetchClaims();
  }, []);

  const showToast = (message) => {
    setSuccessMessage(message);
    setTimeout(() => {
      setSuccessMessage('');
    }, 3000);
  };

  // Persists the decision. This used to only mutate local state and show a
  // success toast, so an approval vanished on the next page load — and the
  // customer was never notified, since the notification fires server-side.
  const handleStatusChange = async (id, newStatus) => {
    const previous = claims;
    setClaims(claims.map(c => (c.id === id ? { ...c, status: newStatus } : c)));
    if (selectedClaim?.id === id) setSelectedClaim({ ...selectedClaim, status: newStatus });

    try {
      await apiRequest(`/super-admin/claims/${id}/status`, {
        method: 'PATCH',
        auth: true,
        body: { status: newStatus },
      });
      showToast(`Warranty claim status updated to ${newStatus}`);
    } catch (err) {
      setClaims(previous);
      if (selectedClaim?.id === id) setSelectedClaim(previous.find(c => c.id === id) || null);
      setLoadError(err.message || 'Could not update the claim status.');
    }
  };

  // Writes the rows actually on screen to a CSV the browser downloads. The
  // previous version only showed a "Download complete!" toast and produced no file.
  const handleExport = () => {
    if (!filteredClaims.length) {
      setLoadError('There are no claims matching the current filters to export.');
      return;
    }
    const header = ['Claim ID', 'Customer', 'Phone', 'Item', 'Brand', 'Amount', 'Coverage', 'Status', 'Raised On', 'Reason'];
    const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [
      header.join(','),
      ...filteredClaims.map(c => [c.humanId, c.customer, c.phone, c.product, c.brand, c.amount, c.coverage, c.status, c.date, c.issue].map(escape).join(',')),
    ].join('\n');

    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `warranty-claims-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast(`Exported ${filteredClaims.length} claim(s) to CSV.`);
  };

  const filteredClaims = claims.filter(c => {
    const matchesSearch = c.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.invoice.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === 'All Status' || c.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex relative text-slate-800">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 ml-64 min-h-screen flex flex-col">
        {/* Topbar */}
        <Topbar title="Warranty Management" />

        {loadError && (
          <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs font-bold text-red-700">
            {loadError}
          </div>
        )}

        {/* Body */}
        {showDrawer && selectedClaim ? (
          <div className="p-6 space-y-6 flex-1 bg-[#F8FAFC] text-left">
            <div className="flex items-center justify-between">
              <button 
                onClick={() => {
                  setShowDrawer(false);
                  setSelectedClaim(null);
                }}
                className="flex items-center gap-2 text-sm font-semibold text-[#0D47A1] hover:text-blue-800 transition-colors"
              >
                <ArrowLeft size={16} /> Back to Warranty Claims
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden flex flex-col">
              <div className="p-6 border-b border-[#E2E8F0] bg-[#F8FAFC] flex justify-between items-center">
                <div>
                  <span className="text-xs font-bold text-[#0D47A1]">{selectedClaim.id}</span>
                  <h3 className="text-lg font-black text-[#1E293B]">Claim Verification</h3>
                </div>
              </div>

              <div className="p-6 space-y-6 flex-1 overflow-y-auto">
                <div className="space-y-4">
                  <div className="bg-slate-50 p-4 rounded-xl space-y-2.5 text-xs font-medium">
                    <p className="text-xs text-[#64748B] font-bold uppercase tracking-wider flex items-center gap-1.5"><User size={14} /> Customer details</p>
                    <p className="text-sm font-bold text-[#1E293B]">{selectedClaim.customer}</p>
                    <p className="text-slate-600">Contact: {selectedClaim.phone}</p>
                  </div>

                  <div className="p-4 border border-[#E2E8F0] rounded-xl space-y-3 text-xs">
                    <h4 className="text-xs font-bold text-[#64748B] uppercase tracking-wider flex items-center gap-1.5"><FileCheck size={14} /> Product Coverage</h4>
                    <div className="flex justify-between">
                      <span className="text-[#1E293B] font-bold">{selectedClaim.product} ({selectedClaim.brand})</span>
                      <span className="text-[#0D47A1] font-semibold">₹{Number(selectedClaim.amount).toLocaleString('en-IN')}</span>
                    </div>
                    <p className="text-slate-700 font-semibold bg-blue-50 text-[#0D47A1] p-2 rounded-lg">Claim type: {selectedClaim.coverage}</p>
                    {selectedClaim.serviceRequest && (
                      <p className="text-slate-600">Raised against service request <strong className="text-[#1E293B]">{selectedClaim.serviceRequest}</strong></p>
                    )}
                  </div>

                  <div className="p-4 border border-[#E2E8F0] rounded-xl space-y-2.5 text-xs">
                    <h4 className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Reported Issue</h4>
                    <p className="text-slate-600 leading-relaxed bg-[#F8FAFC] p-3 rounded-lg border border-[#E2E8F0] font-semibold">{selectedClaim.issue}</p>
                    <div className="flex justify-between items-center pt-2">
                      <span className="text-[#64748B] font-semibold">Claim Date:</span>
                      <span className="font-bold text-slate-700">{selectedClaim.date}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-[#E2E8F0] bg-[#F8FAFC] flex gap-3">
                {selectedClaim.status === 'Pending Approval' ? (
                  <>
                    <button
                      onClick={() => handleStatusChange(selectedClaim.id, 'Rejected')}
                      className="flex-1 bg-red-50 text-red-600 border border-red-200 py-2.5 rounded-xl text-sm font-semibold hover:bg-red-100 transition-colors shadow-sm text-center flex items-center justify-center gap-1.5"
                    >
                      <XCircle size={16} /> Reject Claim
                    </button>
                    <button
                      onClick={() => handleStatusChange(selectedClaim.id, 'Approved')}
                      className="flex-1 bg-green-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors shadow-sm text-center flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle size={16} /> Approve Claim
                    </button>
                  </>
                ) : (
                  <div className={`w-full p-3 rounded-xl text-center text-xs font-bold ${
                    selectedClaim.status === 'Approved' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'
                  }`}>
                    Claim is {selectedClaim.status}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-6 flex-1">
          
          {/* Header Actions */}
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-[#1E293B]">Warranty Claims & Verification</h2>
            <div className="flex gap-2">
              <button 
                onClick={handleExport}
                className="bg-white text-[#1E293B] border border-[#E2E8F0] px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#F8FAFC] transition-colors flex items-center gap-2 shadow-sm"
              >
                <Download size={16} className="text-[#0D47A1]" /> Export Logs
              </button>
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
                  placeholder="Search Claim ID, Customer, Invoice..."
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
                <option>Pending Approval</option>
                <option>Approved</option>
                <option>Rejected</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-[#F8FAFC] text-[#64748B] text-xs uppercase border-b border-[#E2E8F0]">
                  <tr>
                    <th className="px-6 py-4">Claim ID</th>
                    <th className="px-6 py-4">Customer</th>
                    <th className="px-6 py-4">Product</th>
                    <th className="px-6 py-4">Brand</th>
                    <th className="px-6 py-4">Invoice No.</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {filteredClaims.map((claim) => (
                    <tr key={claim.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="px-6 py-4 font-semibold text-[#0D47A1]">{claim.humanId}</td>
                      <td className="px-6 py-4 text-[#1E293B] font-bold">{claim.customer}</td>
                      <td className="px-6 py-4 text-[#1E293B] font-medium">{claim.product}</td>
                      <td className="px-6 py-4 text-[#1E293B] font-semibold">{claim.brand}</td>
                      <td className="px-6 py-4 text-[#0D47A1] font-bold">₹{Number(claim.amount).toLocaleString('en-IN')}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          claim.status === 'Approved' ? 'bg-green-50 text-green-600' :
                          claim.status === 'Pending Approval' ? 'bg-yellow-50 text-yellow-600' :
                          'bg-red-50 text-red-600'
                        }`}>
                          {claim.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-[#64748B] font-semibold">{claim.date}</td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button 
                            onClick={() => {
                              setSelectedClaim(claim);
                              setShowDrawer(true);
                            }}
                            className="p-1.5 text-[#64748B] hover:text-[#0D47A1] hover:bg-[#EEF4FF] rounded transition-colors" 
                            title="View Document"
                          >
                            <Eye size={16} />
                          </button>
                          
                          {claim.status === 'Pending Approval' && (
                            <>
                              <button 
                                onClick={() => handleStatusChange(claim.id, 'Approved')}
                                className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors" 
                                title="Approve"
                              >
                                <CheckCircle size={16} />
                              </button>
                              <button 
                                onClick={() => handleStatusChange(claim.id, 'Rejected')}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors" 
                                title="Reject"
                              >
                                <XCircle size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Empty State */}
            {filteredClaims.length === 0 && (
              <div className="text-center py-12 bg-white">
                <FileCheck size={48} className="text-[#64748B] mx-auto mb-4 opacity-50 text-slate-400" />
                <h3 className="text-lg font-bold text-[#1E293B] mb-1">No Claims Found</h3>
                <p className="text-sm text-[#64748B]">Try adjusting your search or filters.</p>
              </div>
            )}
          </div>
        </div>
      )}
      </div>



      {/* Invoice Preview Modal */}

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

export default Warranty;
