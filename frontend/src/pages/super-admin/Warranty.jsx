import React, { useState } from 'react';
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

const Warranty = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All Status');
  const [successMessage, setSuccessMessage] = useState('');
  
  // Modals state
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  const [claims, setClaims] = useState([
    { id: 'WRN-101', customer: 'Amit Sharma', product: 'Smart TV', brand: 'LG', invoice: 'INV-2026-001', status: 'Pending', date: '12 May, 2026', issue: 'Main circuit board damaged due to voltage fluctuation. Need screen display panel check.', coverage: '1 Year Brand Warranty', phone: '+91 98765 43210' },
    { id: 'WRN-102', customer: 'Priya Patel', product: 'Refrigerator', brand: 'Samsung', invoice: 'INV-2026-002', status: 'Approved', date: '12 May, 2026', issue: 'Cooling gas leakage in compressor unit. Requires replacement.', coverage: '5 Years Compressor Warranty', phone: '+91 98765 43211' },
    { id: 'WRN-103', customer: 'Rajesh K.', product: 'Washing Machine', brand: 'Whirlpool', invoice: 'INV-2026-003', status: 'Rejected', date: '11 May, 2026', issue: 'Drum spinner physical damage due to heavy overload loading. Out of coverage.', coverage: '2 Years Manufacturer Warranty', phone: '+91 98765 43212' },
    { id: 'WRN-104', customer: 'Neha Gupta', product: 'Microwave', brand: 'LG', invoice: 'INV-2026-004', status: 'Approved', date: '11 May, 2026', issue: 'Touch panel controls unresponsive. Sensor board faulty.', coverage: '1 Year Brand Warranty', phone: '+91 98765 43213' },
  ]);

  const showToast = (message) => {
    setSuccessMessage(message);
    setTimeout(() => {
      setSuccessMessage('');
    }, 3000);
  };

  const handleStatusChange = (id, newStatus) => {
    setClaims(claims.map(c => {
      if (c.id === id) {
        const updated = { ...c, status: newStatus };
        if (selectedClaim && selectedClaim.id === id) {
          setSelectedClaim(updated);
        }
        return updated;
      }
      return c;
    }));
    showToast(`Warranty Claim ${id} status updated to ${newStatus}`);
  };

  const handleExport = () => {
    showToast('Exporting warranty claim registers to Excel... Download complete!');
  };

  const filteredClaims = claims.filter(c => {
    const matchesSearch = c.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.invoice.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === 'All Status' || c.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const getInvoiceDetails = (invoiceNo) => {
    // Mock details
    const mapping = {
      'INV-2026-001': { no: 'INV-2026-001', date: '15 Jan, 2026', customer: 'Amit Sharma', phone: '+91 98765 43210', items: [{ name: 'LG 55" OLED Smart TV', price: 62000, qty: 1 }], tax: 11160, total: 73160, method: 'HDFC Credit Card' },
      'INV-2026-002': { no: 'INV-2026-002', date: '22 Feb, 2026', customer: 'Priya Patel', phone: '+91 98765 43211', items: [{ name: 'Samsung Double Door Fridge 320L', price: 34500, qty: 1 }], tax: 6210, total: 40710, method: 'UPI Payment' },
      'INV-2026-003': { no: 'INV-2026-003', date: '04 Mar, 2026', customer: 'Rajesh K.', phone: '+91 98765 43212', items: [{ name: 'Whirlpool 7kg Washing Machine', price: 18900, qty: 1 }], tax: 3402, total: 22302, method: 'Net Banking' },
      'INV-2026-004': { no: 'INV-2026-004', date: '10 Apr, 2026', customer: 'Neha Gupta', phone: '+91 98765 43213', items: [{ name: 'LG Convection Microwave 28L', price: 12500, qty: 1 }], tax: 2250, total: 14750, method: 'UPI Payment' },
    };
    return mapping[invoiceNo] || { no: invoiceNo, date: 'N/A', customer: 'N/A', items: [], tax: 0, total: 0, method: 'Cash' };
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex relative text-slate-800">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 ml-64 min-h-screen flex flex-col">
        {/* Topbar */}
        <Topbar title="Warranty Management" />

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
                      <span className="text-[#0D47A1] font-semibold hover:underline cursor-pointer" onClick={() => {
                        setSelectedInvoice(getInvoiceDetails(selectedClaim.invoice));
                        setShowInvoiceModal(true);
                      }}>{selectedClaim.invoice}</span>
                    </div>
                    <p className="text-slate-700 font-semibold bg-blue-50 text-[#0D47A1] p-2 rounded-lg">Warranty: {selectedClaim.coverage}</p>
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
                {selectedClaim.status === 'Pending' ? (
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
                <option>Pending</option>
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
                      <td className="px-6 py-4 font-semibold text-[#0D47A1]">{claim.id}</td>
                      <td className="px-6 py-4 text-[#1E293B] font-bold">{claim.customer}</td>
                      <td className="px-6 py-4 text-[#1E293B] font-medium">{claim.product}</td>
                      <td className="px-6 py-4 text-[#1E293B] font-semibold">{claim.brand}</td>
                      <td className="px-6 py-4">
                        <button 
                          onClick={() => {
                            setSelectedInvoice(getInvoiceDetails(claim.invoice));
                            setShowInvoiceModal(true);
                          }}
                          className="text-[#0D47A1] font-bold flex items-center gap-1 hover:underline"
                        >
                          {claim.invoice} <ExternalLink size={12} />
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          claim.status === 'Approved' ? 'bg-green-50 text-green-600' :
                          claim.status === 'Pending' ? 'bg-yellow-50 text-yellow-600' :
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
                          
                          {claim.status === 'Pending' && (
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
      {showInvoiceModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black/55 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-[#E2E8F0] pb-3">
              <div className="flex items-center gap-2 text-[#0D47A1]">
                <Building size={20} />
                <span className="font-black text-slate-800 text-base">Invoice Receipt</span>
              </div>
              <button 
                onClick={() => {
                  setShowInvoiceModal(false);
                  setSelectedInvoice(null);
                }}
                className="text-[#64748B] hover:text-[#1E293B] p-1 rounded-full hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            {/* Simulated invoice details */}
            <div className="space-y-4 text-xs">
              <div className="flex justify-between font-semibold">
                <div>
                  <p className="text-[#64748B]">Invoice Number:</p>
                  <p className="text-sm font-bold text-[#1E293B]">{selectedInvoice.no}</p>
                </div>
                <div className="text-right">
                  <p className="text-[#64748B]">Purchase Date:</p>
                  <p className="text-sm font-bold text-slate-700">{selectedInvoice.date}</p>
                </div>
              </div>

              <div className="border-t border-b border-dashed border-[#E2E8F0] py-3 space-y-1.5 font-medium">
                <p className="text-[#64748B] font-bold">Billed To:</p>
                <p className="text-slate-800 font-bold">{selectedInvoice.customer}</p>
                <p className="text-slate-600">{selectedInvoice.phone}</p>
              </div>

              <div className="space-y-2">
                <p className="text-[#64748B] font-bold uppercase tracking-wider">Line Items</p>
                {selectedInvoice.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2 bg-slate-50 border border-[#E2E8F0] rounded-lg font-semibold">
                    <div>
                      <p className="text-slate-800">{item.name}</p>
                      <p className="text-[10px] text-slate-500">Qty: {item.qty}</p>
                    </div>
                    <span className="text-slate-800">₹{item.price.toLocaleString()}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-[#E2E8F0] pt-3 space-y-1.5 text-right font-medium">
                <div className="flex justify-between">
                  <span className="text-[#64748B]">GST/TAX (18%):</span>
                  <span className="text-slate-700">₹{selectedInvoice.tax.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-t border-dashed border-[#E2E8F0] pt-1.5 font-bold text-sm">
                  <span className="text-[#1E293B]">Grand Total:</span>
                  <span className="text-[#0D47A1] text-base font-black">₹{selectedInvoice.total.toLocaleString()}</span>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-lg p-2.5 flex items-center justify-between text-[11px] text-[#0D47A1] font-bold">
                <span className="flex items-center gap-1"><CreditCard size={14} /> Paid via {selectedInvoice.method}</span>
                <span>Success</span>
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

export default Warranty;
