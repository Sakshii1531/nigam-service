import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/super-admin/Sidebar';
import Topbar from '../../components/super-admin/Topbar';
import { Search, Shield, ShieldAlert, Award, FileText, ClipboardList } from 'lucide-react';
import { apiRequest } from '../../lib/apiClient';

const AMC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('All Plans');
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    const fetchSubs = async () => {
      try {
        // The customer-facing /warranty-amc route is scoped to req.user, so the
        // console reads the platform-wide super-admin view instead.
        const [listRes, summaryRes] = await Promise.all([
          apiRequest('/super-admin/amc/subscriptions?limit=200', { auth: true }),
          apiRequest('/super-admin/amc/summary', { auth: true }),
        ]);
        setSummary(summaryRes || null);
        setSubscriptions((listRes || []).map(s => ({
          id: s.id,
          ref: s.humanId || s.id,
          customer: s.user?.name || 'Customer',
          phone: s.user?.phone || '—',
          plan: s.plan?.name || 'AMC Plan',
          product: [s.brand, s.model].filter(Boolean).join(' ') || 'Appliance',
          expires: s.expiryDate ? new Date(s.expiryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
          price: s.plan?.price ? `₹${s.plan.price.toLocaleString('en-IN')}` : '—',
          status: s.status || 'Active'
        })));
      } catch (err) {
        setLoadError(err.message || 'Could not load AMC subscriptions.');
      } finally {
        setLoading(false);
      }
    };
    fetchSubs();
  }, []);

  const filteredSubscriptions = subscriptions.filter(sub => {
    const matchesSearch = sub.customer.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          sub.product.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPlan = selectedPlan === 'All Plans' || sub.plan === selectedPlan;
    return matchesSearch && matchesPlan;
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex text-slate-800">
      <Sidebar />
      <div className="flex-1 ml-64 min-h-screen flex flex-col">
        <Topbar title="NCC AMC Contracts" subtitle="View and manage Annual Maintenance Contracts (AMC)" />

        {loadError && (
          <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs font-bold text-red-700">
            {loadError}
          </div>
        )}
        <div className="p-6 space-y-6 flex-1">
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center border border-blue-100">
                <ClipboardList size={20} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Sales</p>
                <p className="text-xl font-black text-slate-800 mt-1">
                  ₹{(summary?.totalSales || 0).toLocaleString('en-IN')}
                </p>
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center border border-green-100">
                <Shield size={20} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Contracts</p>
                <p className="text-xl font-black text-slate-800 mt-1">
                  {(summary?.activeContracts || 0).toLocaleString('en-IN')}
                </p>
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center border border-purple-100">
                <Award size={20} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Most Sold</p>
                <p className="text-xl font-black text-slate-800 mt-1">{summary?.mostSoldPlan || '—'}</p>
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 bg-red-50 text-red-500 rounded-xl flex items-center justify-center border border-red-100">
                <ShieldAlert size={20} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Expiring in {summary?.expiringWindowDays || 7} Days
                </p>
                <p className="text-xl font-black text-red-600 mt-1">
                  {(summary?.expiringSoon || 0).toLocaleString('en-IN')}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] flex flex-wrap gap-4 items-center justify-between shadow-sm">
            <div className="flex flex-wrap gap-3 items-center flex-1">
              <div className="relative w-64">
                <Search size={16} className="absolute left-3 top-3 text-[#64748B]" />
                <input 
                  type="text" 
                  placeholder="Search Customer, Appliance..." 
                  className="w-full pl-10 pr-4 py-2 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] outline-none text-sm bg-[#F8FAFC]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <select 
                value={selectedPlan} 
                onChange={(e) => setSelectedPlan(e.target.value)}
                className="text-sm border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#0D47A1] bg-[#F8FAFC]"
              >
                <option>All Plans</option>
                <option>Gold AMC</option>
                <option>Platinum AMC</option>
                <option>Silver AMC</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 text-xs font-black tracking-wider uppercase">
                  <th className="p-4 pl-6">Customer Details</th>
                  <th className="p-4">Plan Selected</th>
                  <th className="p-4">Covered Appliance</th>
                  <th className="p-4">Contract Price</th>
                  <th className="p-4">Expires On</th>
                  <th className="p-4 pr-6">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredSubscriptions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 pl-6">
                      <p className="font-bold text-slate-800">{sub.customer}</p>
                      <span className="text-[10px] text-slate-400 font-semibold">{sub.phone}</span>
                    </td>
                    <td className="p-4 font-bold text-[#0D47A1]">{sub.plan}</td>
                    <td className="p-4 text-slate-700 font-semibold">{sub.product}</td>
                    <td className="p-4 text-slate-800 font-bold">{sub.price}</td>
                    <td className="p-4 text-slate-500 font-semibold">{sub.expires}</td>
                    <td className="p-4 pr-6">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        sub.status === 'Active' ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-red-50 text-red-600 border border-red-100'
                      }`}>
                        {sub.status}
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

export default AMC;
