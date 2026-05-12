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
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';

const Billing = () => {
  const [searchQuery, setSearchQuery] = useState('');
  
  const [transactions, setTransactions] = useState([
    { id: 'TXN-9001', user: 'Amit Sharma', amount: '₹1,500', type: 'Service Fee', status: 'Paid', date: '12 May, 2026' },
    { id: 'TXN-9002', user: 'Tech Rahul', amount: '₹800', type: 'Payout', status: 'Pending', date: '12 May, 2026' },
    { id: 'TXN-9003', user: 'Brand LG', amount: '₹12,000', type: 'Brand Share', status: 'Paid', date: '11 May, 2026' },
    { id: 'TXN-9004', user: 'Priya Patel', amount: '₹500', type: 'Refund', status: 'Failed', date: '10 May, 2026' },
  ]);

  const filteredTxns = transactions.filter(t => 
    t.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 ml-64 min-h-screen flex flex-col">
        {/* Topbar */}
        <Topbar title="Billing & Payments" />

        {/* Body */}
        <div className="p-6 space-y-6 flex-1">
          
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] flex items-center gap-4">
              <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center text-white">
                <IndianRupee size={20} />
              </div>
              <div>
                <p className="text-xs font-medium text-[#64748B]">Total Revenue</p>
                <p className="text-2xl font-bold text-[#1E293B]">₹12.4L</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white">
                <CreditCard size={20} />
              </div>
              <div>
                <p className="text-xs font-medium text-[#64748B]">Pending Payouts</p>
                <p className="text-2xl font-bold text-[#1E293B]">₹45,000</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] flex items-center gap-4">
              <div className="w-12 h-12 bg-red-600 rounded-xl flex items-center justify-center text-white">
                <IndianRupee size={20} />
              </div>
              <div>
                <p className="text-xs font-medium text-[#64748B]">Refunds Processed</p>
                <p className="text-2xl font-bold text-[#1E293B]">₹8,500</p>
              </div>
            </div>
          </div>

          {/* Filters & Search */}
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
                  placeholder="Search TXN ID, User, Type..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Filters */}
              <select className="text-sm text-[#1E293B] border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#0D47A1] bg-[#F8FAFC]">
                <option>All Types</option>
                <option>Service Fee</option>
                <option>Payout</option>
                <option>Brand Share</option>
                <option>Refund</option>
              </select>

              <select className="text-sm text-[#1E293B] border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#0D47A1] bg-[#F8FAFC]">
                <option>All Status</option>
                <option>Paid</option>
                <option>Pending</option>
                <option>Failed</option>
              </select>
            </div>

            <button className="bg-white text-[#1E293B] border border-[#E2E8F0] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#F8FAFC] transition-colors flex items-center gap-2">
              <Download size={16} /> Export CSV
            </button>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
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
                    <th className="px-6 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {filteredTxns.map((txn) => (
                    <tr key={txn.id} className="hover:bg-[#F8FAFC] transition-colors">
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
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button className="p-1.5 text-[#64748B] hover:text-[#0D47A1] hover:bg-[#EEF4FF] rounded" title="View Details">
                            <Eye size={16} />
                          </button>
                          <button className="p-1.5 text-[#64748B] hover:text-[#0D47A1] hover:bg-[#EEF4FF] rounded" title="Download Invoice">
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
      </div>
    </div>
  );
};

export default Billing;
