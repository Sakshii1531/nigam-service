import React, { useState } from 'react';
import Sidebar from '../../components/super-admin/Sidebar';
import Topbar from '../../components/super-admin/Topbar';
import { 
  Search, 
  Filter, 
  CreditCard, 
  Eye, 
  Download,
  IndianRupee,
  CheckCircle2,
  XCircle,
  Clock,
  X,
  FileCheck,
  ArrowLeft
} from 'lucide-react';

const Billing = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('All Types');
  const [selectedStatus, setSelectedStatus] = useState('All Status');
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedTxn, setSelectedTxn] = useState(null);
  const [showDrawer, setShowDrawer] = useState(false);

  const [transactions, setTransactions] = useState([
    { id: 'TXN-9001', user: 'Amit Sharma', amount: '₹1,500', type: 'Service Fee', status: 'Paid', date: '12 May, 2026', description: 'Convenience and technician visit charges collected for LG TV display repair.' },
    { id: 'TXN-9002', user: 'Tech Rahul', amount: '₹800', type: 'Payout', status: 'Pending', date: '12 May, 2026', description: 'Pending payout share for completing job #SR-8902.' },
    { id: 'TXN-9003', user: 'Brand LG', amount: '₹12,000', type: 'Brand Share', status: 'Paid', date: '11 May, 2026', description: 'Spare parts commission settlement for month of May.' },
    { id: 'TXN-9004', user: 'Priya Patel', amount: '₹500', type: 'Refund', status: 'Failed', date: '10 May, 2026', description: 'Refund attempt failed due to customer account verification issues.' },
  ]);

  const showToast = (message) => {
    setSuccessMessage(message);
    setTimeout(() => {
      setSuccessMessage('');
    }, 3000);
  };

  const handleReleasePayout = (id) => {
    setTransactions(transactions.map(t => t.id === id ? { ...t, status: 'Paid' } : t));
    if (selectedTxn && selectedTxn.id === id) {
      setSelectedTxn({ ...selectedTxn, status: 'Paid' });
    }
    showToast(`Payout ${id} released successfully!`);
    setShowDrawer(false);
  };

  const handleExport = () => {
    showToast('Exporting billing ledger to CSV... Download started!');
  };

  const filteredTxns = transactions.filter(t => {
    const matchesSearch = t.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === 'All Types' || t.type === selectedType;
    const matchesStatus = selectedStatus === 'All Status' || t.status === selectedStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const paidAmount = transactions
    .filter(t => t.status === 'Paid' && t.type !== 'Payout')
    .reduce((acc, curr) => acc + parseInt(curr.amount.replace(/[^0-9]/g, ''), 10), 0);

  const pendingAmount = transactions
    .filter(t => t.status === 'Pending')
    .reduce((acc, curr) => acc + parseInt(curr.amount.replace(/[^0-9]/g, ''), 10), 0);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex relative">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 ml-64 min-h-screen flex flex-col">
        {/* Topbar */}
        <Topbar title="Billing & Payments" />

        {/* Body */}
        {showDrawer && selectedTxn ? (
          <div className="p-6 space-y-6 flex-1 bg-[#F8FAFC] text-left">
            <div className="flex items-center justify-between">
              <button 
                onClick={() => setShowDrawer(false)}
                className="flex items-center gap-2 text-sm font-semibold text-[#0D47A1] hover:text-blue-800 transition-colors"
              >
                <ArrowLeft size={16} /> Back to Billing
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden flex flex-col">
              <div className="p-6 border-b border-[#E2E8F0] bg-[#F8FAFC]">
                <h3 className="text-lg font-bold text-[#1E293B]">Transaction Details</h3>
                <p className="text-xs text-[#0D47A1] font-semibold">{selectedTxn.id}</p>
              </div>

              <div className="p-6 space-y-6 flex-1 overflow-y-auto">
                <div className="space-y-4">
                  <div>
                    <span className="text-xs font-semibold text-[#64748B] uppercase block">Entity/User</span>
                    <p className="text-sm font-bold text-[#1E293B]">{selectedTxn.user}</p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-[#64748B] uppercase block">Transacted Amount</span>
                    <p className="text-lg font-extrabold text-[#0D47A1]">{selectedTxn.amount}</p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-[#64748B] uppercase block">Transaction Description</span>
                    <p className="text-sm text-[#1E293B] bg-slate-50 p-3 rounded-lg border border-slate-100 mt-1 leading-relaxed">
                      {selectedTxn.description}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs font-semibold text-[#64748B] uppercase block">Type</span>
                      <span className="inline-block mt-1 px-2.5 py-0.5 rounded bg-slate-100 text-slate-800 text-xs font-semibold">
                        {selectedTxn.type}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-[#64748B] uppercase block">Status</span>
                      <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        selectedTxn.status === 'Paid' ? 'bg-green-50 text-green-600' :
                        selectedTxn.status === 'Pending' ? 'bg-yellow-50 text-yellow-600' :
                        'bg-red-50 text-red-600'
                      }`}>
                        {selectedTxn.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-[#E2E8F0] bg-[#F8FAFC] flex gap-3">
                {selectedTxn.status === 'Pending' && selectedTxn.type === 'Payout' && (
                  <button 
                    onClick={() => handleReleasePayout(selectedTxn.id)}
                    className="bg-[#0D47A1] text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <FileCheck size={14} /> Release Payout
                  </button>
                )}
                <button 
                  onClick={() => { showToast(`Generating invoice download for ${selectedTxn.id}...`); setShowDrawer(false); }}
                  className="bg-white text-[#1E293B] border border-[#E2E8F0] px-4 py-2 rounded-lg text-xs font-semibold hover:bg-[#F8FAFC] transition-colors"
                >
                  Download Invoice
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-6 flex-1">
          
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] flex items-center gap-4 shadow-sm">
              <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center text-white flex-shrink-0">
                <IndianRupee size={20} />
              </div>
              <div>
                <p className="text-xs font-medium text-[#64748B]">Analyzed Paid Revenue</p>
                <p className="text-2xl font-bold text-[#1E293B]">₹{(paidAmount + 12000).toLocaleString()}</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] flex items-center gap-4 shadow-sm">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white flex-shrink-0">
                <CreditCard size={20} />
              </div>
              <div>
                <p className="text-xs font-medium text-[#64748B]">Pending Payouts</p>
                <p className="text-2xl font-bold text-[#1E293B]">₹{(pendingAmount + 44000).toLocaleString()}</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] flex items-center gap-4 shadow-sm">
              <div className="w-12 h-12 bg-red-600 rounded-xl flex items-center justify-center text-white flex-shrink-0">
                <IndianRupee size={20} />
              </div>
              <div>
                <p className="text-xs font-medium text-[#64748B]">Refunds Processed</p>
                <p className="text-2xl font-bold text-[#1E293B]">₹8,500</p>
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
                  placeholder="Search TXN ID, User, Type..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Filters */}
              <select 
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="text-sm text-[#1E293B] border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#0D47A1] bg-[#F8FAFC]"
              >
                <option>All Types</option>
                <option>Service Fee</option>
                <option>Payout</option>
                <option>Brand Share</option>
                <option>Refund</option>
              </select>

              <select 
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="text-sm text-[#1E293B] border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#0D47A1] bg-[#F8FAFC]"
              >
                <option>All Status</option>
                <option>Paid</option>
                <option>Pending</option>
                <option>Failed</option>
              </select>
            </div>

            <div className="flex gap-2">
              <button 
                onClick={() => {
                  setSearchQuery('');
                  setSelectedType('All Types');
                  setSelectedStatus('All Status');
                  showToast('Filters reset successfully');
                }}
                className="bg-white text-[#1E293B] border border-[#E2E8F0] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#F8FAFC] transition-colors"
              >
                Reset Filters
              </button>
              <button 
                onClick={handleExport}
                className="bg-white text-[#1E293B] border border-[#E2E8F0] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#F8FAFC] transition-colors flex items-center gap-2"
              >
                <Download size={16} /> Export CSV
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-[#F8FAFC] text-[#64748B] text-xs uppercase">
                  <tr>
                    <th className="px-6 py-4">Transaction ID</th>
                    <th className="px-6 py-4">User / Entity</th>
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {filteredTxns.map((txn) => (
                    <tr 
                      key={txn.id} 
                      className="hover:bg-[#F8FAFC] transition-colors cursor-pointer"
                      onClick={() => { setSelectedTxn(txn); setShowDrawer(true); }}
                    >
                      <td className="px-6 py-4 font-medium text-[#0D47A1]">{txn.id}</td>
                      <td className="px-6 py-4 text-[#1E293B] font-medium">{txn.user}</td>
                      <td className="px-6 py-4 font-bold text-[#1E293B]">{txn.amount}</td>
                      <td className="px-6 py-4 text-[#64748B]">{txn.type}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          txn.status === 'Paid' ? 'bg-green-50 text-green-600' :
                          txn.status === 'Pending' ? 'bg-yellow-50 text-yellow-600' :
                          'bg-red-50 text-red-600'
                        }`}>
                          {txn.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-[#64748B]">{txn.date}</td>
                      <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-2 justify-center">
                          <button 
                            onClick={() => { setSelectedTxn(txn); setShowDrawer(true); }}
                            className="p-1.5 text-[#64748B] hover:text-[#0D47A1] hover:bg-[#EEF4FF] rounded" 
                            title="View Details"
                          >
                            <Eye size={16} />
                          </button>
                          <button 
                            onClick={() => showToast(`Generating invoice download for ${txn.id}...`)}
                            className="p-1.5 text-[#64748B] hover:text-[#0D47A1] hover:bg-[#EEF4FF] rounded" 
                            title="Download Invoice"
                          >
                            <Download size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Empty State */}
            {filteredTxns.length === 0 && (
              <div className="text-center py-12 bg-white">
                <CreditCard size={48} className="text-[#64748B] mx-auto mb-4" />
                <h3 className="text-lg font-bold text-[#1E293B] mb-1">No Transactions Found</h3>
                <p className="text-sm text-[#64748B]">Try adjusting your search or filters.</p>
              </div>
            )}
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

export default Billing;
