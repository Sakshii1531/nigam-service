import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/brand-admin/Sidebar';
import Topbar from '../../components/brand-admin/Topbar';
import { 
  Search, 
  QrCode, 
  ShieldCheck, 
  AlertTriangle, 
  Calendar, 
  Clock, 
  User, 
  Inbox,
  CheckCircle2,
  XCircle,
  X,
  Camera
} from 'lucide-react';
import { apiRequest } from '../../lib/apiClient';

const dateFormatter = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

// Coverage is decided by the policy's own end date, not by a stored label —
// a registration written months ago would otherwise still read "Active".
function coverageOf(order) {
  if (!order.validTill) return 'Unknown';
  return new Date(order.validTill) >= new Date() ? 'Valid' : 'Expired';
}

function shape(order) {
  return {
    id: order.humanId || order.id,
    invoice: order.invoiceFileUrl ? 'Uploaded' : 'Not uploaded',
    customer: order.fullName || order.user?.name || 'Customer',
    phone: order.mobile || order.user?.phone || '',
    model: order.modelNumber || '',
    category: order.applianceCategory || '',
    date: order.validTill ? dateFormatter.format(new Date(order.validTill)) : '—',
    status: coverageOf(order),
    verificationStatus: order.verificationStatus || 'Pending',
  };
}

const Warranty = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [result, setResult] = useState(null); // null, 'active', 'expired', 'not_found'
  const [successMessage, setSuccessMessage] = useState('');
  const [showQRModal, setShowQRModal] = useState(false);

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [match, setMatch] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function loadRegistrations() {
      try {
        const data = await apiRequest('/brand/warranty-registrations', { auth: true });
        if (!cancelled) setHistory((data || []).map(shape));
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadRegistrations();
    return () => { cancelled = true; };
  }, []);

  const showToast = (message) => {
    setSuccessMessage(message);
    setTimeout(() => {
      setSuccessMessage('');
    }, 3000);
  };

  // Real lookup against the brand's registered appliances. The previous version
  // matched on the literal strings "123"/"456" and returned invented customers.
  const [lookup, setLookup] = useState(null);
  const [searching, setSearching] = useState(false);

  const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

  // Raises a real ServiceRequest against the looked-up appliance. Both of the
  // buttons below used to be success toasts — "Technician assigned
  // successfully!" and "Paid service request created successfully!" — with no
  // ticket created and no technician assigned.
  const raiseRequest = async (warranty) => {
    if (!lookup?.customer?.id) {
      setError('This record has no linked customer account, so a request cannot be raised against it.');
      return;
    }

    setError('');
    try {
      const res = await apiRequest('/service-requests', {
        method: 'POST',
        auth: true,
        body: {
          user: lookup.customer.id,
          category: lookup.appliance.category,
          model: lookup.appliance.model || undefined,
          serialNo: lookup.appliance.serialNumber || undefined,
          warranty,
          description: `Raised from warranty lookup (${lookup.status})`,
        },
      });
      showToast(`Service request ${res.humanId || res.id} created.`);
      setResult(null);
    } catch (err) {
      setError(err.message || 'Could not create the service request.');
    }
  };

  const runLookup = async (query) => {
    if (!query) {
      showToast('Please enter a serial number or customer mobile.');
      return;
    }
    setSearching(true);
    try {
      const res = await apiRequest(`/brand/warranty-lookup?query=${encodeURIComponent(query)}`, { auth: true });
      const data = res;
      if (!data?.found) {
        setLookup(null);
        setResult('not_found');
        showToast('No record found.');
        return;
      }
      setLookup(data);
      setResult(data.covered ? 'active' : 'expired');
      setHistory((prev) => [{
        id: data.appliance.id,
        invoice: data.appliance.serialNumber || '—',
        customer: data.customer.name || '—',
        date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
        status: data.covered ? 'Valid' : 'Expired',
      }, ...prev]);
      showToast(data.covered ? `Covered — ${data.status}.` : 'Warranty expired.');
    } catch (err) {
      setResult(null);
      showToast(err.message || 'Lookup failed.');
    } finally {
      setSearching(false);
    }
  };

  const handleSearch = (e) => {
    if (e) e.preventDefault();
    runLookup(searchQuery.trim());
  };

  const [scanInput, setScanInput] = useState('');

  // Manual entry of the code printed on the appliance — the camera scanner is
  // not wired up, so the operator types what they read.
  const handleQRScanEntry = (scannedCode) => {
    if (!scannedCode) return;
    setShowQRModal(false);
    setScanInput('');
    setSearchQuery(scannedCode);
    runLookup(scannedCode);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 ml-64 min-h-screen flex flex-col relative">
        {/* Topbar */}
        <Topbar title="Warranty Verification" />

        {/* Body */}
        <div className="p-6 space-y-6 flex-1">
          
          {/* Search Box */}
          <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0]">
            <h2 className="text-lg font-bold text-[#1E293B] mb-4">Verify Warranty Status</h2>
            
            <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#64748B]">
                  <Inbox size={18} />
                </div>
                <input
                  type="text"
                  className="w-full pl-11 pr-4 py-3 border border-[#E2E8F0] rounded-xl focus:ring-2 focus:ring-[#0D47A1] focus:border-[#0D47A1] outline-none transition-all text-sm bg-[#F8FAFC]"
                  placeholder="Enter Invoice Number or Customer Mobile..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <button 
                type="submit"
                className="bg-[#0D47A1] text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Search size={18} /> Search
              </button>
            </form>
            
            <p className="text-xs text-[#64748B] mt-2">Try searching "123" for active warranty or "456" for expired.</p>
          </div>

          {/* Results Section */}
          {result === 'active' && (
            <div className="bg-white p-6 rounded-2xl border border-green-200 bg-green-50/30 animate-in fade-in slide-in-from-top-4 duration-200">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-green-600 flex-shrink-0">
                  <ShieldCheck size={24} />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold text-[#1E293B]">Warranty Active</h3>
                    <span className="bg-green-100 text-green-600 px-3 py-1 rounded-full text-xs font-medium">Valid</span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                    <div className="bg-white p-4 rounded-xl border border-[#E2E8F0]">
                      <p className="text-xs text-[#64748B] mb-1 flex items-center gap-1"><User size={14} /> Customer</p>
                      <p className="text-sm font-medium text-[#1E293B]">{lookup?.customer?.name || '—'}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-[#E2E8F0]">
                      <p className="text-xs text-[#64748B] mb-1 flex items-center gap-1"><Calendar size={14} /> Purchase Date</p>
                      <p className="text-sm font-medium text-[#1E293B]">{fmtDate(lookup?.appliance?.purchaseDate)}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-[#E2E8F0]">
                      <p className="text-xs text-[#64748B] mb-1 flex items-center gap-1"><Clock size={14} /> Expiry Date</p>
                      <p className="text-sm font-medium text-[#1E293B]">{fmtDate(lookup?.appliance?.expiryDate)}</p>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex justify-end">
                    <button 
                      onClick={() => raiseRequest('In Warranty')}
                      className="bg-[#0D47A1] text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                    >
                      Assign Technician
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {result === 'expired' && (
            <div className="bg-white p-6 rounded-2xl border border-red-200 bg-red-50/30 animate-in fade-in slide-in-from-top-4 duration-200">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center text-red-600 flex-shrink-0">
                  <AlertTriangle size={24} />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold text-[#1E293B]">Warranty Expired</h3>
                    <span className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-xs font-medium">Expired</span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                    <div className="bg-white p-4 rounded-xl border border-[#E2E8F0]">
                      <p className="text-xs text-[#64748B] mb-1">Expiry Date</p>
                      <p className="text-sm font-medium text-[#1E293B]">{fmtDate(lookup?.appliance?.expiryDate)}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-[#E2E8F0]">
                      <p className="text-xs text-[#64748B] mb-1">Appliance</p>
                      <p className="text-sm font-bold text-[#1E293B]">
                        {[lookup?.appliance?.brand, lookup?.appliance?.model].filter(Boolean).join(' ') || '—'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex justify-end gap-3">
                    <button 
                      onClick={() => setResult(null)}
                      className="bg-white text-[#1E293B] border border-[#E2E8F0] px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-[#F8FAFC] transition-colors"
                    >
                      Ignore
                    </button>
                    <button 
                      onClick={() => raiseRequest('Out of Warranty')}
                      className="bg-[#0D47A1] text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                    >
                      Create Paid Request
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {result === 'not_found' && (
            <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] text-center py-12 animate-in fade-in slide-in-from-top-4 duration-200">
              <Inbox size={48} className="text-[#64748B] mx-auto mb-4" />
              <h3 className="text-lg font-bold text-[#1E293B] mb-1">No Record Found</h3>
              <p className="text-sm text-[#64748B]">We couldn't find any warranty record for this input.</p>
            </div>
          )}

          {/* Verification History */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
            <div className="p-6 border-b border-[#E2E8F0]">
              <h2 className="text-lg font-bold text-[#1E293B]">Recent Verifications</h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-[#F8FAFC] text-[#64748B] text-xs uppercase">
                  <tr>
                    <th className="px-6 py-4">Verification ID</th>
                    <th className="px-6 py-4">Invoice Number</th>
                    <th className="px-6 py-4">Customer</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {loading && (
                    <tr><td colSpan={5} className="px-6 py-10 text-center text-[#64748B] font-semibold">Loading registrations…</td></tr>
                  )}
                  {!loading && error && (
                    <tr><td colSpan={5} className="px-6 py-10 text-center text-red-600 font-semibold">{error}</td></tr>
                  )}
                  {!loading && !error && history.length === 0 && (
                    <tr><td colSpan={5} className="px-6 py-10 text-center text-[#64748B] font-semibold">No warranty registrations for this brand.</td></tr>
                  )}
                  {history.map((item) => (
                    <tr key={item.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="px-6 py-4 font-medium text-[#0D47A1]">{item.id}</td>
                      <td className="px-6 py-4 text-[#1E293B]">{item.invoice}</td>
                      <td className="px-6 py-4 text-[#1E293B]">{item.customer}</td>
                      <td className="px-6 py-4 text-[#64748B]">{item.date}</td>
                      <td className="px-6 py-4">
                        <span className={`flex items-center gap-1 text-xs font-medium ${
                          item.status === 'Valid' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {item.status === 'Valid' ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Manual code entry modal */}
        {showQRModal && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="p-6 border-b border-[#E2E8F0] flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Camera className="text-[#0D47A1]" size={20} />
                  <h2 className="text-lg font-bold text-[#1E293B]">Scan QR Code</h2>
                </div>
                <button 
                  onClick={() => setShowQRModal(false)}
                  className="text-[#64748B] hover:text-[#1E293B] p-2 hover:bg-[#F8FAFC] rounded-full"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-4 text-center">
                <div className="mx-auto w-48 h-48 border-4 border-[#0D47A1] border-dashed rounded-2xl flex flex-col items-center justify-center bg-[#F8FAFC] relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-full h-1 bg-[#0D47A1] animate-bounce"></div>
                  <QrCode size={64} className="text-[#64748B]" />
                  <span className="text-[10px] uppercase font-semibold tracking-wider text-[#64748B] mt-2">Position QR code here</span>
                </div>
                {/* Camera scanning is not implemented — the code is keyed in and
                    goes through the same lookup as the search box. */}
                <p className="text-xs text-[#64748B]">Enter the serial number printed under the QR code:</p>
                <form
                  onSubmit={(e) => { e.preventDefault(); handleQRScanEntry(scanInput.trim()); }}
                  className="flex gap-2"
                >
                  <input
                    value={scanInput}
                    onChange={(e) => setScanInput(e.target.value)}
                    placeholder="Serial number"
                    className="flex-1 border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0D47A1]"
                  />
                  <button
                    type="submit"
                    disabled={!scanInput.trim()}
                    className="bg-[#0D47A1] text-white px-4 py-2 rounded-lg text-xs font-semibold disabled:opacity-40"
                  >
                    Look up
                  </button>
                </form>
              </div>
              <div className="p-4 border-t border-[#E2E8F0] bg-[#F8FAFC] flex justify-end">
                <button
                  onClick={() => setShowQRModal(false)}
                  className="bg-white text-[#64748B] border border-[#E2E8F0] px-4 py-2 rounded-lg text-xs font-semibold hover:bg-[#F8FAFC] transition-colors"
                >
                  Cancel
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

export default Warranty;
