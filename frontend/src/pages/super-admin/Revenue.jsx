import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/super-admin/Sidebar';
import Topbar from '../../components/super-admin/Topbar';
import { IndianRupee, TrendingUp, TrendingDown, ArrowUpRight, BarChart3, ShieldCheck } from 'lucide-react';
import { apiRequest } from '../../lib/apiClient';

const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

const Revenue = () => {
  const [earnings, setEarnings] = useState([]);
  // Totals come from the API's own aggregate rather than being summed from the
  // current page, so they stay correct once the list is paginated.
  const [summary, setSummary] = useState({ gross: 0, partnerShare: 0, net: 0, marginPercent: 0, rows: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [rows, totals] = await Promise.all([
          apiRequest('/super-admin/revenue', { auth: true }),
          apiRequest('/super-admin/revenue/summary', { auth: true }),
        ]);
        if (cancelled) return;
        setEarnings(Array.isArray(rows) ? rows : []);
        if (totals) setSummary(totals);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex text-slate-800">
      <Sidebar />
      <div className="flex-1 ml-64 min-h-screen flex flex-col">
        <Topbar title="Revenue Dashboard" subtitle="Overview of gross, partner split, and platform net revenues" />
        <div className="p-6 space-y-6 flex-1">
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-50 text-[#0D47A1] rounded-xl flex items-center justify-center border border-blue-100">
                <IndianRupee size={20} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Gross Revenues</p>
                <p className="text-xl font-black text-slate-800 mt-1">{currency.format(summary.gross)}</p>
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center border border-green-100">
                <TrendingUp size={20} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Platform Net Share</p>
                <p className="text-xl font-black text-slate-800 mt-1">{currency.format(summary.net)}</p>
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 bg-yellow-50 text-yellow-600 rounded-xl flex items-center justify-center border border-yellow-100">
                <BarChart3 size={20} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Blended Margin</p>
                <p className="text-xl font-black text-slate-800 mt-1">{summary.marginPercent}%</p>
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center border border-purple-100">
                <ShieldCheck size={20} />
              </div>
              <div>
                {/* Was "GST Collected" — the revenue model records no tax
                    component, so that figure had nothing behind it. Partner
                    share is the other half of the gross/net split and is real. */}
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Partner Share</p>
                <p className="text-xl font-black text-slate-800 mt-1">{currency.format(summary.partnerShare)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-sm">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-white">
              <h3 className="font-extrabold text-sm text-[#1E293B]">Revenue Split by Channels</h3>
            </div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 text-xs font-black tracking-wider uppercase">
                  <th className="p-4 pl-6">Service Category</th>
                  <th className="p-4">Gross Revenue</th>
                  <th className="p-4">Partner Payouts</th>
                  <th className="p-4">Platform Margin</th>
                  <th className="p-4 pr-6">Platform Net Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {loading && (
                  <tr><td colSpan={5} className="p-8 text-center text-slate-400 font-semibold">Loading revenue…</td></tr>
                )}
                {!loading && error && (
                  <tr><td colSpan={5} className="p-8 text-center text-red-600 font-semibold">{error}</td></tr>
                )}
                {!loading && !error && earnings.length === 0 && (
                  <tr><td colSpan={5} className="p-8 text-center text-slate-400 font-semibold">No revenue recorded yet.</td></tr>
                )}
                {earnings.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 pl-6 font-bold text-slate-800">{e.source}</td>
                    <td className="p-4 text-slate-800 font-bold">{currency.format(e.gross || 0)}</td>
                    <td className="p-4 text-slate-600 font-semibold">{currency.format(e.partnerShare || 0)}</td>
                    <td className="p-4 text-[#0D47A1] font-bold">{e.marginPercent ?? 0}%</td>
                    <td className="p-4 pr-6 text-green-600 font-black flex items-center gap-1">{currency.format(e.net || 0)} <ArrowUpRight size={12} /></td>
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

export default Revenue;
