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
  XCircle
} from 'lucide-react';

const Warranty = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [result, setResult] = useState(null); // null, 'active', 'expired'

  const handleSearch = (e) => {
    e.preventDefault();
    // Simulate search
    if (searchQuery.includes('123')) {
      setResult('active');
    } else if (searchQuery.includes('456')) {
      setResult('expired');
    } else {
      setResult('not_found');
    }
  };

  const history = [
    { id: 'VR-1001', invoice: 'INV-2026-001', customer: 'Amit Sharma', date: '12 May, 2026', status: 'Valid' },
    { id: 'VR-1002', invoice: 'INV-2026-002', customer: 'Priya Patel', date: '12 May, 2026', status: 'Expired' },
    { id: 'VR-1003', invoice: 'INV-2026-003', customer: 'Rajesh K.', date: '11 May, 2026', status: 'Valid' },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 ml-64 min-h-screen flex flex-col">
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
                  className="w-full pl-11 pr-4 py-3 border border-[#E2E8F0] rounded-xl focus:ring-2 focus:ring-[#0D47A1] focus:border-[#0D47A1] outline-none transition-all text-sm"
                  placeholder="Enter Invoice Number or Customer Mobile..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <button 
                type="button"
                onClick={() => alert('QR Scanner camera not available in demo mode.')}
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
            <div className="bg-white p-6 rounded-2xl border border-green-200 bg-green-50/30">
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
                      onClick={() => { alert('Technician assigned successfully!'); setResult(null); }}
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
            <div className="bg-white p-6 rounded-2xl border border-red-200 bg-red-50/30">
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
                      onClick={() => { alert('Paid service request created!'); setResult(null); }}
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
            <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] text-center py-12">
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
      </div>
    </div>
  );
};

export default Warranty;
