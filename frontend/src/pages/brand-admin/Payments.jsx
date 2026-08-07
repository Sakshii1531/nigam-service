import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/brand-admin/Sidebar';
import Topbar from '../../components/brand-admin/Topbar';
import { IndianRupee, Clock, CheckCircle2, Download, Search, Filter } from 'lucide-react';
import { apiRequest } from '../../lib/apiClient';

const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const dateFormatter = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

// Payment.status is Success/Failed/Refunded/Pending; this screen's badges speak
// Paid/Pending/Failed, so 'Success' maps onto 'Paid'.
const PAYMENT_STATUS = { Success: 'Paid', Pending: 'Pending', Failed: 'Failed', Refunded: 'Refunded' };

function shapePayment(p) {
  return {
    id: p.id,
    party: p.user?.name || 'Customer',
    complaintId: '—',
    amount: currency.format(p.amount || 0),
    mode: p.method,
    date: p.createdAt ? dateFormatter.format(new Date(p.createdAt)) : '—',
    status: PAYMENT_STATUS[p.status] || p.status,
  };
}

function shapePayout(p) {
  return {
    id: p.id,
    party: p.technician?.name || 'Technician',
    complaintId: p.job?.serviceRequest?.humanId || '—',
    jobsCompleted: 1,
    amount: currency.format(p.netAmount || 0),
    mode: p.payoutType === 'Invoice' ? 'Bank Transfer' : 'UPI',
    date: p.createdAt ? dateFormatter.format(new Date(p.createdAt)) : '—',
    status: p.status === 'Settled' ? 'Paid' : 'Pending',
  };
}

function shapeDue(i) {
  return {
    id: i.id,
    party: i.customer?.name || 'Customer',
    complaintId: i.serviceRequest?.humanId || '—',
    amount: currency.format(i.total || 0),
    mode: '—',
    date: i.createdAt ? dateFormatter.format(new Date(i.createdAt)) : '—',
    status: i.status,
  };
}



const statusColors = {
  Paid: 'bg-green-100 text-green-700',
  Pending: 'bg-yellow-100 text-yellow-700',
  Overdue: 'bg-red-100 text-red-700',
  Failed: 'bg-red-100 text-red-700',
};

const modeColors = {
  UPI: 'bg-blue-50 text-blue-700',
  Cash: 'bg-green-50 text-green-700',
  Card: 'bg-purple-50 text-purple-700',
  'Net Banking': 'bg-teal-50 text-teal-700',
  'Bank Transfer': 'bg-orange-50 text-orange-700',
};

const Payments = () => {
  const [tab, setTab] = useState('Customer Payments');
  const [searchQ, setSearchQ] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [successMsg, setSuccessMsg] = useState('');

  const [customerPayments, setCustomerPayments] = useState([]);
  const [techPayouts, setTechPayouts] = useState([]);
  const [dues, setDues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const toast = (msg) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 3000); };

  useEffect(() => {
    let cancelled = false;
    async function loadPayments() {
      try {
        // Three separate views, each resolved server-side through
        // Job -> ServiceRequest.brand (or Invoice.brand for dues).
        const [pay, out, due] = await Promise.all([
          apiRequest('/brand/payments/customer', { auth: true }),
          apiRequest('/brand/payments/payouts', { auth: true }),
          apiRequest('/brand/payments/dues', { auth: true }),
        ]);
        if (cancelled) return;
        setCustomerPayments((Array.isArray(pay) ? pay : []).map(shapePayment));
        setTechPayouts((Array.isArray(out) ? out : []).map(shapePayout));
        setDues((Array.isArray(due) ? due : []).map(shapeDue));
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadPayments();
    return () => { cancelled = true; };
  }, []);

  const tabs = ['Customer Payments', 'Technician Payouts', 'Pending Dues'];

  // Pending Dues is its own server-side view (unsettled invoices), not a
  // client-side filter over the other two tabs.
  const activeData = tab === 'Customer Payments' ? customerPayments :
    tab === 'Technician Payouts' ? techPayouts : dues;

  const filtered = activeData.filter(p => {
    const matchSearch = p.party.toLowerCase().includes(searchQ.toLowerCase()) || p.id.toLowerCase().includes(searchQ.toLowerCase());
    const matchStatus = filterStatus === 'All' || p.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const summaryCards = [
    { label: 'Total Collected', value: '₹40,30,020', sub: 'This month', bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-600' },
    { label: 'Total Paid Out', value: '₹8,24,320', sub: 'To technicians', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600' },
    { label: 'Outstanding Dues', value: '₹9,910', sub: '2 pending', bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-600' },
    { label: 'Overdue Amount', value: '₹3,186', sub: '1 overdue', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-600' },
  ];

  return (
    <div className="min-h-screen bg-[#F1F5F9] flex relative">
      <Sidebar />
      <div className="flex-1 ml-64 flex flex-col">
        <Topbar title="Payments" subtitle="Track customer payments, technician payouts, and pending dues" />
        <div className="p-5 space-y-5">

          {/* Summary cards */}
          <div className="grid grid-cols-4 gap-4">
            {summaryCards.map((s, i) => (
              <div key={i} className={`${s.bg} border ${s.border} rounded-2xl p-4`}>
                <p className={`text-xl font-black ${s.text}`}>{s.value}</p>
                <p className="text-[11px] font-bold text-[#1E293B] mt-0.5">{s.label}</p>
                <p className="text-[10px] text-[#64748B]">{s.sub}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4">
            {/* Tabs */}
            <div className="flex gap-1 mb-4 border-b border-[#E2E8F0]">
              {tabs.map(t => (
                <button key={t} onClick={() => { setTab(t); setFilterStatus('All'); setSearchQ(''); }}
                  className={`px-4 py-2 text-xs font-semibold transition-all border-b-2 ${tab === t ? 'border-[#0D47A1] text-[#0D47A1]' : 'border-transparent text-[#64748B] hover:text-[#1E293B]'}`}
                >{t}</button>
              ))}
            </div>

            <div className="flex gap-3 mb-4 flex-wrap items-center">
              <div className="relative flex-1 min-w-[200px]">
                <Search size={14} className="absolute left-3 top-2.5 text-[#94A3B8]" />
                <input placeholder="Search by ID or name..." value={searchQ} onChange={e => setSearchQ(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-[#E2E8F0] rounded-xl text-xs outline-none bg-[#F8FAFC] focus:ring-2 focus:ring-[#0D47A1]" />
              </div>
              {['All', 'Paid', 'Pending', 'Overdue'].map(s => (
                <button key={s} onClick={() => setFilterStatus(s)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${filterStatus === s ? 'bg-[#0D47A1] text-white border-[#0D47A1]' : 'border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC]'}`}
                >{s}</button>
              ))}
              <button onClick={() => toast('Payments exported as CSV!')} className="flex items-center gap-1.5 border border-[#E2E8F0] px-3 py-1.5 rounded-xl text-xs font-semibold text-[#64748B] hover:bg-[#F8FAFC]">
                <Download size={13} /> Export
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#F8FAFC] text-[#64748B] text-[10px] uppercase">
                  <tr>
                    <th className="px-3 py-3">Pay ID</th>
                    <th className="px-3 py-3">{tab === 'Technician Payouts' ? 'Technician' : 'Customer'}</th>
                    {tab !== 'Technician Payouts' && <th className="px-3 py-3">Complaint ID</th>}
                    {tab === 'Technician Payouts' && <th className="px-3 py-3">Jobs Completed</th>}
                    <th className="px-3 py-3">Amount</th>
                    <th className="px-3 py-3">Mode</th>
                    <th className="px-3 py-3">Date</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {loading && (
                    <tr><td colSpan={8} className="px-3 py-10 text-center text-[#64748B] font-semibold">Loading payments…</td></tr>
                  )}
                  {!loading && error && (
                    <tr><td colSpan={8} className="px-3 py-10 text-center text-red-600 font-semibold">{error}</td></tr>
                  )}
                  {!loading && !error && filtered.length === 0 && (
                    <tr><td colSpan={8} className="px-3 py-10 text-center text-[#64748B] font-semibold">Nothing to show for this view.</td></tr>
                  )}
                  {filtered.map((p, i) => (
                    <tr key={i} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="px-3 py-3 text-[#0D47A1] font-semibold">{p.id}</td>
                      <td className="px-3 py-3 font-semibold text-[#1E293B]">{p.party}</td>
                      {tab !== 'Technician Payouts' && <td className="px-3 py-3 text-[#64748B]">{p.complaintId || '—'}</td>}
                      {tab === 'Technician Payouts' && <td className="px-3 py-3 text-[#64748B]">{p.jobsCompleted}</td>}
                      <td className="px-3 py-3 font-bold text-[#1E293B]">{p.amount}</td>
                      <td className="px-3 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${modeColors[p.mode] || 'bg-gray-100 text-gray-700'}`}>{p.mode}</span>
                      </td>
                      <td className="px-3 py-3 text-[#64748B]">{p.date}</td>
                      <td className="px-3 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusColors[p.status]}`}>{p.status}</span>
                      </td>
                      <td className="px-3 py-3">
                        {p.status !== 'Paid' && (
                          <button onClick={() => toast(`Payment ${p.id} marked as Paid!`)} className="text-[10px] font-bold text-green-600 hover:underline">Mark Paid</button>
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

      {successMsg && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2">
          <CheckCircle2 size={14} /> {successMsg}
        </div>
      )}
    </div>
  );
};

export default Payments;
