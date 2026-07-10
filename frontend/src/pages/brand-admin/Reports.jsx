import React, { useState } from 'react';
import Sidebar from '../../components/brand-admin/Sidebar';
import Topbar from '../../components/brand-admin/Topbar';
import { 
  Calendar, 
  TrendingUp, 
  Smile, 
  Frown, 
  Meh,
  Download,
  CheckCircle2
} from 'lucide-react';

const Reports = () => {
  const [timeframe, setTimeframe] = useState('Last 30 Days');
  const [successMessage, setSuccessMessage] = useState('');
  const [activeReportBar, setActiveReportBar] = useState(null);

  const showToast = (message) => {
    setSuccessMessage(message);
    setTimeout(() => {
      setSuccessMessage('');
    }, 3000);
  };

  const handleTimeframeChange = (e) => {
    const val = e.target.value;
    setTimeframe(val);
    showToast(`Timeframe updated to ${val}`);
  };

  const handleExport = (format) => {
    showToast(`Exporting data to ${format}... Download started!`);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex relative">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 ml-64 min-h-screen flex flex-col">
        {/* Topbar */}
        <Topbar title="Reports & Analytics" />

        {/* Body */}
        <div className="p-6 space-y-6 flex-1">
          
          {/* Header Actions */}
          <div className="flex justify-between items-center">
            <div className="flex gap-3 items-center">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#64748B]">
                  <Calendar size={16} />
                </div>
                <select 
                  value={timeframe}
                  onChange={handleTimeframeChange}
                  className="pl-10 pr-4 py-2 border border-[#E2E8F0] rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-[#0D47A1] text-slate-700 font-medium"
                >
                  <option>Last 30 Days</option>
                  <option>Last Quarter</option>
                  <option>This Year</option>
                </select>
              </div>
            </div>
            
            <div className="flex gap-2">
              <button 
                onClick={() => handleExport('CSV')}
                className="bg-white text-[#1E293B] border border-[#E2E8F0] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#F8FAFC] transition-colors flex items-center gap-2"
              >
                <Download size={16} /> Export CSV
              </button>
              <button 
                onClick={() => handleExport('PDF')}
                className="bg-[#0D47A1] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Download size={16} /> Export PDF
              </button>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Monthly Service Reports (Simulated Bar) */}
            <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0]">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-[#1E293B]">Monthly Service Reports ({timeframe})</h2>
                <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                  <TrendingUp size={14} /> +15% vs last month
                </span>
              </div>
              
              <div className="flex items-end justify-between h-48 gap-4 pt-4">
                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map((month, index) => {
                  const heights = [40, 65, 35, 80, 55, 90];
                  const isActive = activeReportBar === index;
                  return (
                    <div key={index} className="flex-1 flex flex-col items-center gap-2">
                      <div 
                        className={`w-full rounded-t-lg transition-all duration-300 group relative cursor-pointer ${
                          isActive ? 'bg-[#0D47A1] scale-x-105 shadow-sm' : 'bg-[#E3ECF9] hover:bg-[#0D47A1]'
                        }`}
                        style={{ height: `${heights[index]}%` }}
                        onMouseEnter={() => setActiveReportBar(index)}
                        onMouseLeave={() => setActiveReportBar(null)}
                        onClick={() => {
                          setActiveReportBar(index);
                          showToast(`Month: ${month}, Tickets: ${heights[index] * 10}`);
                        }}
                      >
                        <div className={`absolute -top-8 left-1/2 -translate-x-1/2 bg-[#1E293B] text-white text-xs px-2 py-1 rounded transition-opacity whitespace-nowrap z-10 ${
                          isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 pointer-events-none'
                        }`}>
                          {heights[index] * 10} Tickets
                        </div>
                      </div>
                      <span className={`text-xs transition-colors font-semibold ${isActive ? 'text-[#0D47A1] font-bold' : 'text-[#64748B]'}`}>{month}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Product Failure Analysis (Simulated Horizontal Bar) */}
            <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0]">
              <h2 className="text-lg font-bold text-[#1E293B] mb-6">Product Failure Analysis</h2>
              
              <div className="space-y-4">
                {[
                  { label: 'Refrigerator', value: 45, color: 'bg-blue-600' },
                  { label: 'Washing Machine', value: 25, color: 'bg-yellow-500' },
                  { label: 'Smart TV', value: 15, color: 'bg-gray-400' },
                  { label: 'Microwave', value: 15, color: 'bg-gray-300' },
                ].map((item, index) => (
                  <div 
                    key={index}
                    onClick={() => showToast(`${item.label} accounts for ${item.value}% of failures`)}
                    className="cursor-pointer group p-1.5 rounded-lg hover:bg-slate-50 transition-all duration-200"
                  >
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-[#1E293B] font-semibold group-hover:text-[#0D47A1] transition-colors">{item.label}</span>
                      <span className="text-[#64748B] font-bold">{item.value}%</span>
                    </div>
                    <div className="w-full h-2 bg-[#F1F5F9] rounded-full overflow-hidden">
                      <div className={`h-full ${item.color} transition-all group-hover:scale-y-110`} style={{ width: `${item.value}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Technician Productivity (Simulated List/Bar) */}
            <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0]">
              <h2 className="text-lg font-bold text-[#1E293B] mb-6">Technician Productivity</h2>
              
              <div className="space-y-4">
                {[
                  { name: 'Rahul Kumar', jobs: 145, rate: 95 },
                  { name: 'Amit Singh', jobs: 98, rate: 88 },
                  { name: 'Suresh Raina', jobs: 210, rate: 92 },
                  { name: 'Vikram Batra', jobs: 67, rate: 75 },
                ].map((tech, index) => (
                  <div 
                    key={index} 
                    className="flex items-center gap-4 cursor-pointer group p-1.5 rounded-lg hover:bg-slate-50 transition-all duration-200"
                    onClick={() => showToast(`${tech.name}: ${tech.jobs} jobs completed with ${tech.rate}% success rating`)}
                  >
                    <div className="w-8 h-8 bg-[#EEF4FF] rounded-full flex items-center justify-center text-[#0D47A1] font-bold text-xs flex-shrink-0 group-hover:scale-105 transition-transform">
                      {tech.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-[#1E293B] font-semibold group-hover:text-[#0D47A1] transition-colors">{tech.name}</span>
                        <span className="text-[#64748B] font-bold">{tech.jobs} jobs</span>
                      </div>
                      <div className="w-full h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden">
                        <div className="h-full bg-[#0D47A1] transition-all group-hover:scale-y-110" style={{ width: `${tech.rate}%` }}></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Customer Satisfaction (Simulated CSAT) */}
            <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0]">
              <h2 className="text-lg font-bold text-[#1E293B] mb-6">Customer Satisfaction (CSAT)</h2>
              
              <div className="flex items-center justify-around h-40">
                <div 
                  className="text-center cursor-pointer group p-2.5 rounded-xl hover:bg-slate-50 hover:scale-105 transition-all duration-200"
                  onClick={() => showToast('75% of customers left a positive feedback!')}
                >
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600 mx-auto mb-2 group-hover:scale-110 transition-transform">
                    <Smile size={24} />
                  </div>
                  <p className="text-xl font-bold text-[#1E293B]">75%</p>
                  <p className="text-xs text-[#64748B]">Satisfied</p>
                </div>
                
                <div 
                  className="text-center cursor-pointer group p-2.5 rounded-xl hover:bg-slate-50 hover:scale-105 transition-all duration-200"
                  onClick={() => showToast('20% of customers left a neutral feedback!')}
                >
                  <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-600 mx-auto mb-2 group-hover:scale-110 transition-transform">
                    <Meh size={24} />
                  </div>
                  <p className="text-xl font-bold text-[#1E293B]">20%</p>
                  <p className="text-xs text-[#64748B]">Neutral</p>
                </div>
                
                <div 
                  className="text-center cursor-pointer group p-2.5 rounded-xl hover:bg-slate-50 hover:scale-105 transition-all duration-200"
                  onClick={() => showToast('Warning: 5% of customers left an unsatisfied feedback.')}
                >
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-600 mx-auto mb-2 group-hover:scale-110 transition-transform">
                    <Frown size={24} />
                  </div>
                  <p className="text-xl font-bold text-[#1E293B]">5%</p>
                  <p className="text-xs text-[#64748B]">Unsatisfied</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Success Toast */}
      {successMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="h-4 w-4" />
          {successMessage}
        </div>
      )}
    </div>
  );
};

export default Reports;
