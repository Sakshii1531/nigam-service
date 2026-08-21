import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/super-admin/Sidebar';
import Topbar from '../../components/super-admin/Topbar';
import { Search, IndianRupee, CreditCard, CheckCircle, ArrowRight } from 'lucide-react';
import { apiRequest } from '../../lib/apiClient';

const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

function shape(payout) {
  return {
    id: payout.id,
    partner: payout.partner?.name || 'Partner',
    city: payout.city?.name || '—',
    balance: payout.balance ?? 0,
    lastPaid: payout.lastPaidAmount ?? 0,
    status: payout.status || 'Pending Approval',
  };
}

const Payouts = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payingId, setPayingId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function loadPayouts() {
      try {
        const data = await apiRequest('/super-admin/payouts', { auth: true });
        if (!cancelled) setPayouts((data || []).map(shape));
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadPayouts();
    return () => { cancelled = true; };
  }, []);

  // Settlement is money moving, so this waits on the server rather than
  // optimistically zeroing the balance — a failed request must leave the row
  // showing what is still owed.
  const handlePay = async (id) => {
    setPayingId(id);
    try {
      const updated = await apiRequest(`/super-admin/payouts/${id}/pay`, { method: 'PATCH', auth: true });
      setPayouts(prev => prev.map(p => (p.id === id ? shape(updated) : p)));
    } catch (err) {
      setError(`Could not settle payout: ${err.message}`);
    } finally {
      setPayingId(null);
    }
  };

  const filteredPayouts = payouts.filter(p =>
    p.partner.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex text-slate-800">
      <Sidebar />
      <div className="flex-1 ml-64 min-h-screen flex flex-col">
        <Topbar title="Partner Payouts Control" subtitle="Process service partner commissions and wallet balances" />
        <div className="p-6 space-y-6 flex-1">
          
          <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] flex flex-wrap gap-4 items-center justify-between shadow-sm">
            <div className="relative w-64">
              <Search size={16} className="absolute left-3 top-3 text-[#64748B]" />
              <input 
                type="text" 
                placeholder="Search Service Partner..." 
                className="w-full pl-10 pr-4 py-2 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] outline-none text-sm bg-[#F8FAFC]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 text-xs font-black tracking-wider uppercase">
                  <th className="p-4 pl-6">Service Partner Name</th>
                  <th className="p-4">Region</th>
                  <th className="p-4">Accrued Wallet Balance</th>
                  <th className="p-4">Last Paid Amount</th>
                  <th className="p-4">Payout Status</th>
                  <th className="p-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {loading && (
                  <tr><td colSpan={6} className="p-8 text-center text-slate-400 font-semibold">Loading payouts…</td></tr>
                )}
                {!loading && error && (
                  <tr><td colSpan={6} className="p-8 text-center text-red-600 font-semibold">{error}</td></tr>
                )}
                {!loading && !error && filteredPayouts.length === 0 && (
                  <tr><td colSpan={6} className="p-8 text-center text-slate-400 font-semibold">No partner payouts recorded.</td></tr>
                )}
                {filteredPayouts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 pl-6">
                      <p className="font-bold text-slate-800">{p.partner}</p>
                      <span className="text-[10px] text-slate-400 font-bold uppercase">ID: {p.id}</span>
                    </td>
                    <td className="p-4 font-semibold text-slate-600">{p.city}</td>
                    <td className="p-4 text-slate-800 font-black flex items-center gap-0.5"><IndianRupee size={14} className="text-blue-600" /> {currency.format(p.balance).replace('₹', '')}</td>
                    <td className="p-4 text-slate-600 font-semibold">{p.lastPaid ? currency.format(p.lastPaid) : '—'}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        p.status === 'Paid' ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-yellow-50 text-yellow-600 border border-yellow-100'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="p-4 pr-6 text-right">
                      {p.status === 'Pending Approval' ? (
                        <button
                          onClick={() => handlePay(p.id)}
                          disabled={payingId === p.id || p.balance <= 0}
                          className="text-xs bg-[#0D47A1] text-white font-semibold px-2.5 py-1 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer flex items-center gap-1 ml-auto disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          <CreditCard size={12} /> {payingId === p.id ? 'Paying…' : 'Pay Balance'}
                        </button>
                      ) : (
                        <span className="text-green-600 font-bold text-xs flex items-center justify-end gap-1"><CheckCircle size={14} /> Paid</span>
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

export default Payouts;
