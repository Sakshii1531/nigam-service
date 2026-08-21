import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/super-admin/Sidebar';
import Topbar from '../../components/super-admin/Topbar';
import { Search, Megaphone, Plus, Trash2, BarChart2 } from 'lucide-react';
import { apiRequest } from '../../lib/apiClient';

const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const Advertisements = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function loadAds() {
      try {
        // /admin, not the public reader — the console must see Paused campaigns too.
        const data = await apiRequest('/cms/advertisements/admin', { auth: true });
        if (!cancelled) setAds(data || []);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadAds();
    return () => { cancelled = true; };
  }, []);

  const handleDelete = async (id) => {
    const previous = ads;
    setAds(prev => prev.filter(ad => ad.id !== id));
    try {
      await apiRequest(`/cms/advertisements/${id}`, { method: 'DELETE', auth: true });
    } catch (err) {
      setAds(previous);
      setError(`Could not delete advertisement: ${err.message}`);
    }
  };

  const filteredAds = ads.filter(ad =>
    (ad.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex text-slate-800">
      <Sidebar />
      <div className="flex-1 ml-64 min-h-screen flex flex-col">
        <Topbar title="Advertisements Management" subtitle="Create and monitor in-app advertisements and campaigns" />
        <div className="p-6 space-y-6 flex-1">
          
          <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] flex flex-wrap gap-4 items-center justify-between shadow-sm">
            <div className="relative w-64">
              <Search size={16} className="absolute left-3 top-3 text-[#64748B]" />
              <input 
                type="text" 
                placeholder="Search Ad Campaign..." 
                className="w-full pl-10 pr-4 py-2 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] outline-none text-sm bg-[#F8FAFC]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button className="bg-[#0D47A1] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2 cursor-pointer shadow-sm">
              <Plus size={16} /> Create Ad Campaign
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 text-xs font-black tracking-wider uppercase">
                  <th className="p-4 pl-6">Campaign Name</th>
                  <th className="p-4">Ad Placement Type</th>
                  <th className="p-4">Campaign Budget</th>
                  <th className="p-4">Clicks Recorded</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {loading && (
                  <tr><td colSpan={6} className="p-8 text-center text-slate-400 font-semibold">Loading campaigns…</td></tr>
                )}
                {!loading && error && (
                  <tr><td colSpan={6} className="p-8 text-center text-red-600 font-semibold">{error}</td></tr>
                )}
                {!loading && !error && filteredAds.length === 0 && (
                  <tr><td colSpan={6} className="p-8 text-center text-slate-400 font-semibold">No campaigns yet.</td></tr>
                )}
                {filteredAds.map((ad) => (
                  <tr key={ad.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 pl-6">
                      <p className="font-bold text-slate-800 flex items-center gap-1.5"><Megaphone size={14} className="text-slate-400" /> {ad.name}</p>
                      <span className="text-[10px] text-slate-400 font-bold uppercase">ID: {ad.id}</span>
                    </td>
                    <td className="p-4 font-semibold text-slate-600">{ad.type}</td>
                    <td className="p-4 text-xs font-bold text-slate-700">{ad.budget != null ? `${currency.format(ad.budget)}/mo` : '—'}</td>
                    <td className="p-4 text-slate-700 font-bold flex items-center gap-1"><BarChart2 size={12} /> {ad.clicks ?? 0} clicks</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        ad.status === 'Running' ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {ad.status}
                      </span>
                    </td>
                    <td className="p-4 pr-6 text-right space-x-2">
                      <button className="text-slate-500 hover:text-[#0D47A1] inline-block p-1 hover:bg-slate-100 rounded transition-colors cursor-pointer"><BarChart2 size={14} /></button>
                      <button onClick={() => handleDelete(ad.id)} className="text-slate-500 hover:text-red-600 inline-block p-1 hover:bg-red-50 rounded transition-colors cursor-pointer"><Trash2 size={14} /></button>
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

export default Advertisements;
