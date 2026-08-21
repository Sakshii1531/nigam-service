import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/super-admin/Sidebar';
import Topbar from '../../components/super-admin/Topbar';
import { Search, CreditCard, ArrowDownRight, ArrowUpRight, Clock } from 'lucide-react';
import { apiRequest } from '../../lib/apiClient';

const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
});

// The gateway enum is coarse (UPI / Card / NetBanking); the log records the rail,
// not the specific app or issuer, so these are the only labels available.
const GATEWAY_LABELS = { UPI: 'UPI', Card: 'Card', NetBanking: 'Net Banking' };

function shape(txn) {
  return {
    id: txn.id,
    ref: txn.ref,
    customer: txn.customer?.name || 'Customer',
    date: txn.createdAt ? dateFormatter.format(new Date(txn.createdAt)) : '—',
    amount: currency.format(txn.amount || 0),
    gateway: GATEWAY_LABELS[txn.gateway] || txn.gateway,
    status: txn.status,
  };
}

const Transactions = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refundingId, setRefundingId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function loadTransactions() {
      try {
        const data = await apiRequest('/super-admin/transactions', { auth: true });
        if (!cancelled) setTransactions((data || []).map(shape));
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadTransactions();
    return () => { cancelled = true; };
  }, []);

  // Refunds move money, so this waits on the server. Only Success rows can be
  // refunded — the API rejects anything else.
  const handleRefund = async (id) => {
    setRefundingId(id);
    try {
      const updated = await apiRequest(`/super-admin/transactions/${id}/refund`, { method: 'PATCH', auth: true });
      setTransactions(prev => prev.map(t => (t.id === id ? shape(updated) : t)));
    } catch (err) {
      setError(`Could not refund transaction: ${err.message}`);
    } finally {
      setRefundingId(null);
    }
  };

  const q = searchQuery.toLowerCase();
  const filteredTxns = transactions.filter(t => {
    const matchesSearch = t.ref.toLowerCase().includes(q) || t.customer.toLowerCase().includes(q);
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
                  <th className="p-4">Status</th>
                  <th className="p-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {loading && (
                  <tr><td colSpan={7} className="p-8 text-center text-slate-400 font-semibold">Loading transactions…</td></tr>
                )}
                {!loading && error && (
                  <tr><td colSpan={7} className="p-8 text-center text-red-600 font-semibold">{error}</td></tr>
                )}
                {!loading && !error && filteredTxns.length === 0 && (
                  <tr><td colSpan={7} className="p-8 text-center text-slate-400 font-semibold">No gateway transactions.</td></tr>
                )}
                {filteredTxns.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 pl-6 font-mono text-xs font-bold text-slate-600 flex items-center gap-1.5">
                      <CreditCard size={14} className="text-slate-400" /> {t.ref}
                    </td>
                    <td className="p-4 font-bold text-slate-800">{t.customer}</td>
                    <td className="p-4 text-xs font-semibold text-slate-400 flex items-center gap-1"><Clock size={12} /> {t.date}</td>
                    <td className="p-4 text-slate-800 font-black">{t.amount}</td>
                    <td className="p-4 text-xs text-slate-500 font-semibold">{t.gateway}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        t.status === 'Success' ? 'bg-green-50 text-green-600 border border-green-100' :
                        t.status === 'Failed' ? 'bg-red-50 text-red-600 border border-red-100' :
                        'bg-slate-100 text-slate-500'
                      }`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="p-4 pr-6 text-right">
                      {/* A failed charge never collected anything, and a refunded
                          one is already reversed — neither can be refunded. */}
                      {t.status === 'Success' ? (
                        <button
                          onClick={() => handleRefund(t.id)}
                          disabled={refundingId === t.id}
                          className="text-xs bg-red-600 text-white font-semibold px-2.5 py-1 rounded-lg hover:bg-red-700 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {refundingId === t.id ? 'Refunding…' : 'Refund'}
                        </button>
                      ) : (
                        <span className="text-slate-400 text-xs font-semibold">—</span>
                      )}
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
