import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Zap, FileText } from 'lucide-react';

const recentEarnings = [
  { id: 1, title: 'Electrician Repair', tag: 'QuickPayout', date: '16 May 2026, 02:20 PM', amount: 400, status: 'Credited', statusColor: 'text-green-500', icon: 'zap' },
  { id: 2, title: 'Plumbing Service', tag: 'QuickPayout', date: '16 May 2026, 11:15 AM', amount: 350, status: 'Credited', statusColor: 'text-green-500', icon: 'zap' },
  { id: 3, title: 'LG Refrigerator – Warranty Claim', tag: 'InvoicePayout', date: '17 May 2026, 04:20 PM', amount: 450, status: 'Approval Pending', statusColor: 'text-orange-500', icon: 'file' },
  { id: 4, title: 'NCC AMC – Quarterly Visit', tag: 'InvoicePayout', date: '17 May 2026, 10:30 AM', amount: 250, status: 'Approved', statusColor: 'text-green-500', icon: 'file' },
  { id: 5, title: 'Voltas AC Service (Partner Brand)', tag: 'InvoicePayout', date: '16 May 2026, 03:45 PM', amount: 600, status: 'Verification', statusColor: 'text-blue-500', icon: 'file' },
];

const RecentEarnings = () => {
  const navigate = useNavigate();

  return (
    <div className="tech-app-container min-h-screen bg-[#F4F6FA] flex flex-col pb-24 max-w-md mx-auto border-x border-slate-200 shadow-xl relative font-sans">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3.5 flex items-center gap-3 sticky top-0 z-10">
        <button
          onClick={() => navigate('/technician/profile')}
          className="p-1 hover:bg-slate-100 rounded-full transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-slate-700" />
        </button>
        <h1 className="text-base font-bold text-[#052355]">Recent Earnings</h1>
      </div>

      {/* Earnings List */}
      <div className="flex-1 p-3 flex flex-col gap-3">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="divide-y divide-slate-100">
            {recentEarnings.map((item) => (
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
                  <p className="text-xs font-black text-[#052355]">₹{item.amount}</p>
                  <p className={`text-[9px] font-bold mt-0.5 ${item.statusColor}`}>{item.status} •</p>
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
