import React, { useState } from 'react';
import Sidebar from '../../components/super-admin/Sidebar';
import Topbar from '../../components/super-admin/Topbar';
import { Search, CreditCard, ArrowDownRight, ArrowUpRight, Clock } from 'lucide-react';

const Transactions = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All');

  const [transactions] = useState([
    { id: 1, ref: 'TXN-982103482', customer: 'Amit Sharma', date: '12 May, 2026 - 11:30 AM', amount: '₹1,250', gateway: 'UPI (GPay)', status: 'Success' },
    { id: 2, ref: 'TXN-092810349', customer: 'Jyoti Singh', date: '12 May, 2026 - 11:12 AM', amount: '₹4,999', gateway: 'Visa Credit Card', status: 'Success' },
    { id: 3, ref: 'TXN-872910348', customer: 'Rohan Sen', date: '11 May, 2026 - 10:20 AM', amount: '₹850', gateway: 'Net Banking', status: 'Failed' },
    { id: 4, ref: 'TXN-562910347', customer: 'Sunita Pal', date: '10 May, 2026 - 04:45 PM', amount: '₹2,499', gateway: 'UPI (PhonePe)', status: 'Refunded' },
  ]);

  const filteredTxns = transactions.filter(t => {
    const matchesSearch = t.ref.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.customer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === 'All' || t.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex text-slate-800">
      <Sidebar />
      <div className="flex-1 ml-64 min-h-screen flex flex-col">
        <Topbar title="Gateway Transactions" subtitle="Track live client gateway transaction statuses and payments" />
        <div className="p-6 space-y-6 flex-1">
          
          <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] flex flex-wrap gap-4 items-center justify-between shadow-sm">
            <div className="flex flex-wrap gap-3 items-center flex-1">
              <div className="relative w-64">
                <Search size={16} className="absolute left-3 top-3 text-[#64748B]" />
                <input 
                  type="text" 
                  placeholder="Search Reference, Customer..." 
                  className="w-full pl-10 pr-4 py-2 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] outline-none text-sm bg-[#F8FAFC]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <select 
                value={selectedStatus} 
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="text-sm border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#0D47A1] bg-[#F8FAFC]"
              >
                <option>All</option>
                <option>Success</option>
                <option>Failed</option>
                <option>Refunded</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 text-xs font-black tracking-wider uppercase">
                  <th className="p-4 pl-6">Txn Reference</th>
                  <th className="p-4">Client Customer</th>
                  <th className="p-4">Timestamp</th>
                  <th className="p-4">Paid Amount</th>
                  <th className="p-4">Gateway Source</th>
                  <th className="p-4 pr-6">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredTxns.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 pl-6 font-mono text-xs font-bold text-slate-600 flex items-center gap-1.5">
                      <CreditCard size={14} className="text-slate-400" /> {t.ref}
                    </td>
                    <td className="p-4 font-bold text-slate-800">{t.customer}</td>
                    <td className="p-4 text-xs font-semibold text-slate-400 flex items-center gap-1"><Clock size={12} /> {t.date}</td>
                    <td className="p-4 text-slate-800 font-black">{t.amount}</td>
                    <td className="p-4 text-xs text-slate-500 font-semibold">{t.gateway}</td>
                    <td className="p-4 pr-6">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        t.status === 'Success' ? 'bg-green-50 text-green-600 border border-green-100' :
                        t.status === 'Failed' ? 'bg-red-50 text-red-600 border border-red-100' :
                        'bg-slate-100 text-slate-500'
                      }`}>
                        {t.status}
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
  );
};

export default Transactions;
