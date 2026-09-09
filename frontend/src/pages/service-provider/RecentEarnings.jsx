import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Zap, FileText } from 'lucide-react';
import { apiRequest } from '../../lib/apiClient';


const RecentEarnings = () => {
  const navigate = useNavigate();
  const [earnings, setEarnings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiRequest('/tech/earnings/recent?limit=50', { auth: true })
      .then((res) => setEarnings((res || []).map((e) => ({
        id: e.id,
        title: e.title,
        // 'NCC Paid Service' is settled directly to the technician; the other
        // job types are billed through and settle on the invoice cycle.
        tag: e.type === 'NCC Paid Service' ? 'QuickPayout' : 'InvoicePayout',
        icon: e.type === 'NCC Paid Service' ? 'zap' : 'file',
        date: e.completedAt
          ? new Date(e.completedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
          : '—',
        amount: e.amount,
      }))))
      .catch((err) => setError(err.message || 'Could not load your earnings.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="tech-app-container min-h-screen bg-[#F4F6FA] flex flex-col pb-16 lg:pb-8 relative font-sans">
      {/* Mobile Top Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3.5 flex items-center gap-3 sticky top-0 z-10 lg:hidden">
        <button
          onClick={() => navigate('/technician/profile')}
          className="p-1 hover:bg-slate-100 rounded-full transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-slate-700" />
        </button>
        <h1 className="text-base font-bold text-[#052355]">Recent Earnings</h1>
      </div>

      {/* Desktop Page Top Header Bar (lg+ only) */}
      <div className="hidden lg:block max-w-screen-xl mx-auto w-full px-6 xl:px-8 pt-6 pb-2">
        <div className="flex items-center justify-between bg-white rounded-3xl p-5 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-3.5">
            <button
              onClick={() => navigate('/technician/profile')}
              className="p-2 bg-slate-100 hover:bg-slate-200 rounded-2xl text-[#052355] transition-colors cursor-pointer"
              title="Back"
            >
              <ArrowLeft className="h-5 w-5 stroke-[2.5]" />
            </button>
            <div>
              <h1 className="text-xl font-black text-[#052355] tracking-tight">Recent Earnings History</h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Daily transaction breakdown and completed job settlements</p>
            </div>
          </div>
        </div>
      </div>

      {/* Earnings List */}
      <div className="flex-1 p-3.5 lg:px-6 xl:px-8 flex flex-col gap-3 max-w-screen-xl mx-auto w-full">
        {loading && <p className="text-[11px] text-slate-400 font-semibold py-6 text-center">Loading earnings…</p>}
        {error && <p className="text-[11px] text-rose-500 font-semibold py-6 text-center">{error}</p>}
        {!loading && !error && earnings.length === 0 && (
          <p className="text-[11px] text-slate-400 font-semibold py-6 text-center">No completed jobs yet.</p>
        )}

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="divide-y divide-slate-100">
            {earnings.map((item) => (
              <button
                key={item.id}
                onClick={() => navigate(`/technician/earning-detail/${item.id}`)}
                className="w-full px-4 py-3.5 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left"
              >
                <div className={`p-2 rounded-lg flex-shrink-0 ${item.icon === 'zap' ? 'bg-amber-50' : 'bg-blue-50'}`}>
                  {item.icon === 'zap'
                    ? <Zap className="h-4.5 w-4.5 text-amber-500 fill-amber-400" />
                    : <FileText className="h-4.5 w-4.5 text-[#0D47A1]" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-[#052355] leading-tight truncate">{item.title}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${item.tag === 'QuickPayout' ? 'text-amber-600 bg-amber-50 border-amber-200' : 'text-blue-600 bg-blue-50 border-blue-200'}`}>
                      {item.tag}
                    </span>
                    <p className="text-[9px] text-slate-400 font-medium">{item.date}</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs font-black text-[#052355]">₹{item.amount.toLocaleString('en-IN')}</p>
                </div>
                <ChevronRight className="h-4.5 w-4.5 text-slate-300 flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecentEarnings;
