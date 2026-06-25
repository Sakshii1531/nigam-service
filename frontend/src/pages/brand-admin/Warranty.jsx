import React, { useState } from 'react';
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

const Warranty = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [result, setResult] = useState(null); // null, 'active', 'expired', 'not_found'
  const [successMessage, setSuccessMessage] = useState('');
  const [showQRModal, setShowQRModal] = useState(false);

  const [history, setHistory] = useState([
    { id: 'VR-1001', invoice: 'INV-2026-001', customer: 'Amit Sharma', date: '12 May, 2026', status: 'Valid' },
    { id: 'VR-1002', invoice: 'INV-2026-002', customer: 'Priya Patel', date: '12 May, 2026', status: 'Expired' },
    { id: 'VR-1003', invoice: 'INV-2026-003', customer: 'Rajesh K.', date: '11 May, 2026', status: 'Valid' },
  ]);

  const showToast = (message) => {
    setSuccessMessage(message);
    setTimeout(() => {
      setSuccessMessage('');
    }, 3000);
  };

  const handleSearch = (e) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim();
    if (!query) {
      showToast('Please enter an invoice number or customer mobile.');
      return;
    }

    if (query.includes('123') || query.toLowerCase().includes('inv-2026-001')) {
      setResult('active');
      const nextId = `VR-${1000 + history.length + 1}`;
      const newRecord = {
        id: nextId,
        invoice: 'INV-2026-001',
        customer: 'Amit Sharma',
        date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
        status: 'Valid'
      };
      setHistory([newRecord, ...history]);
      showToast('Warranty Active record found.');
    } else if (query.includes('456') || query.toLowerCase().includes('inv-2026-002')) {
      setResult('expired');
      const nextId = `VR-${1000 + history.length + 1}`;
      const newRecord = {
        id: nextId,
        invoice: 'INV-2026-002',
        customer: 'Priya Patel',
        date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
        status: 'Expired'
      };
      setHistory([newRecord, ...history]);
      showToast('Warranty Expired record found.');
    } else {
      setResult('not_found');
      showToast('No record found.');
    }
  };

  const handleQRScanSimulate = (mockType) => {
    setShowQRModal(false);
    if (mockType === 'active') {
      setSearchQuery('INV-2026-001');
      setResult('active');
      const nextId = `VR-${1000 + history.length + 1}`;
      const newRecord = {
        id: nextId,
        invoice: 'INV-2026-001',
        customer: 'Amit Sharma',
        date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
        status: 'Valid'
      };
      setHistory([newRecord, ...history]);
      showToast('QR Code Scanned: Active Device Detected.');
    } else {
      setSearchQuery('INV-2026-002');
      setResult('expired');
      const nextId = `VR-${1000 + history.length + 1}`;
      const newRecord = {
        id: nextId,
        invoice: 'INV-2026-002',
        customer: 'Priya Patel',
        date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
        status: 'Expired'
      };
      setHistory([newRecord, ...history]);
      showToast('QR Code Scanned: Expired Device Detected.');
    }
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
                type="button"
                onClick={() => setShowQRModal(true)}
                className="bg-white text-[#1E293B] border border-[#E2E8F0] px-4 py-3 rounded-xl text-sm font-medium hover:bg-[#F8FAFC] transition-colors flex items-center gap-2"
              >
                <QrCode size={18} /> Scan QR
              </button>
              
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
                      <p className="text-sm font-medium text-[#1E293B]">Amit Sharma</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-[#E2E8F0]">
                      <p className="text-xs text-[#64748B] mb-1 flex items-center gap-1"><Calendar size={14} /> Purchase Date</p>
                      <p className="text-sm font-medium text-[#1E293B]">10 May, 2025</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-[#E2E8F0]">
                      <p className="text-xs text-[#64748B] mb-1 flex items-center gap-1"><Clock size={14} /> Expiry Date</p>
                      <p className="text-sm font-medium text-[#1E293B]">09 May, 2027</p>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex justify-end">
                    <button 
                      onClick={() => { showToast('Technician assigned successfully!'); setResult(null); }}
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
                      <p className="text-sm font-medium text-[#1E293B]">09 May, 2025</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-[#E2E8F0]">
                      <p className="text-xs text-[#64748B] mb-1">Estimated Repair Cost</p>
                      <p className="text-sm font-bold text-[#1E293B]">₹2,500 + Parts</p>
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
                      onClick={() => { showToast('Paid service request created successfully!'); setResult(null); }}
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

        {/* QR Scanner Simulation Modal */}
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
                <p className="text-xs text-[#64748B]">Simulate a QR scan by selecting one of the demo devices below:</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleQRScanSimulate('active')}
                    className="p-3 bg-green-50 border border-green-200 rounded-xl hover:bg-green-100 transition-colors text-xs font-semibold text-green-700"
                  >
                    Active Device
                  </button>
                  <button
                    onClick={() => handleQRScanSimulate('expired')}
                    className="p-3 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition-colors text-xs font-semibold text-red-700"
                  >
                    Expired Device
                  </button>
                </div>
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
