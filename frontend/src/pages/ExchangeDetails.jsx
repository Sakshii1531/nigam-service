import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, ChevronRight } from 'lucide-react';
import { apiRequest } from '../lib/apiClient';

const tabs = ['All', 'Valuation Approved', 'Completed'];

const statusStyles = {
  'Valuation Approved': 'text-blue-600 bg-blue-50 border-blue-100',
  'Inspection Approved': 'text-blue-600 bg-blue-50 border-blue-100',
  Completed: 'text-emerald-600 bg-emerald-50 border-emerald-100',
  Pending: 'text-amber-600 bg-amber-50 border-amber-100',
  'Inspection Scheduled': 'text-indigo-600 bg-indigo-50 border-indigo-100',
  'Inspection Rejected': 'text-rose-600 bg-rose-50 border-rose-100'
};

const ExchangeDetails = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('All');
  const [exchanges, setExchanges] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchExchanges = async () => {
      setLoading(true);
      try {
        // apiRequest returns the envelope's `data` payload directly, so this is
        // already the array — reaching for `.data` on it yields undefined and the
        // screen showed no trade-ins no matter how many the customer had.
        const res = await apiRequest('/exchange/requests', { auth: true });
        setExchanges((res || []).map(e => ({
          id: e.humanId || e.id,
          oldAppliance: `${e.brand} ${e.category} (${e.condition || 'Used'})`,
          newAppliance: e.model || 'Replacement Device',
          offeredValue: `₹${e.estimatedValue}`,
          date: new Date(e.createdAt).toLocaleString(),
          status: e.status === 'Inspection Approved' ? 'Valuation Approved' : e.status,
        })));
      } catch (err) {
        console.warn('Could not fetch exchange requests:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchExchanges();
  }, []);

  const filtered = activeTab === 'All'
    ? exchanges
    : exchanges.filter((e) => e.status === activeTab);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col pb-10">
      {/* Header */}
      <div className="bg-white px-5 py-4 flex items-center justify-center gap-3 sticky top-0 z-50 shadow-sm border-b border-slate-100 relative">
        <button
          onClick={() => navigate(-1)}
          className="absolute left-4 p-1.5 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-5 w-5 text-slate-700" />
        </button>
        <h1 className="text-sm font-black text-slate-900 uppercase tracking-wide">Exchange Details</h1>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-100 bg-white sticky top-[57px] z-40">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-[11px] font-black transition-all cursor-pointer border-b-2 ${
              activeTab === tab
                ? 'text-[#0D47A1] border-[#0D47A1]'
                : 'text-slate-400 border-transparent hover:text-slate-600'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Exchanges List */}
      <div className="flex flex-col divide-y divide-slate-100">
        {loading ? (
          <div className="animate-pulse p-5 space-y-4">
            {[1, 2].map((n) => (
              <div key={n} className="bg-white border border-slate-100 rounded-xl p-4.5 flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <div className="h-4 bg-slate-200 rounded w-1/4"></div>
                  <div className="h-4 bg-slate-200 rounded-full w-1/5"></div>
                </div>
                <div className="space-y-2">
                  <div className="h-3.5 bg-slate-200 rounded w-2/3"></div>
                  <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                </div>
                <div className="h-4 bg-slate-200 rounded w-1/3"></div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center px-6">
            <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center">
              <RefreshCw className="h-6 w-6 text-slate-400" />
            </div>
            <p className="text-sm font-black text-slate-700">No {activeTab} Exchanges</p>
            <p className="text-[11px] text-slate-400 font-semibold">You have no exchange details here yet.</p>
          </div>
        ) : (
          filtered.map((exc, i) => (
            <div
              key={i}
              className="bg-white px-5 py-4.5 flex flex-col gap-3 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <div className="flex justify-between items-center">
                <span className="text-xs font-black text-slate-900">{exc.id}</span>
                <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${statusStyles[exc.status]}`}>
                  {exc.status}
                </span>
              </div>
              
              <div className="flex flex-col gap-1.5">
                <div>
                  <span className="text-[9px] text-slate-400 font-extrabold uppercase">Old Appliance</span>
                  <p className="text-xs font-bold text-slate-700">{exc.oldAppliance}</p>
                </div>
                
                <div className="border-l-2 border-dashed border-slate-200 pl-3 py-1 my-0.5">
                  <span className="text-[9px] text-brand-blue font-black uppercase">Exchange Value: {exc.offeredValue}</span>
                </div>

                <div>
                  <span className="text-[9px] text-slate-400 font-extrabold uppercase">Upgraded To</span>
                  <p className="text-xs font-black text-slate-900">{exc.newAppliance}</p>
                </div>
              </div>

              <div className="flex justify-between items-center border-t border-slate-50 pt-2.5 mt-0.5">
                <span className="text-[10px] text-slate-400 font-semibold">{exc.date}</span>
                <span className="text-xs font-black text-[#0D47A1] hover:underline">Track Exchange</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ExchangeDetails;
