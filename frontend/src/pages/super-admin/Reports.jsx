import React from 'react';
import Sidebar from '../../components/super-admin/Sidebar';
import Topbar from '../../components/super-admin/Topbar';
import { 
  BarChart3, 
  Download, 
  TrendingUp, 
  Users, 
  UserCheck, 
  CreditCard 
} from 'lucide-react';

const Reports = () => {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
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
            <h2 className="text-lg font-bold text-[#1E293B]">Performance Analytics</h2>
            <div className="flex gap-2">
              <button className="bg-white text-[#1E293B] border border-[#E2E8F0] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#F8FAFC] transition-colors flex items-center gap-2">
                <Download size={16} /> Export PDF
              </button>
              <button className="bg-[#0D47A1] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2">
                <Download size={16} /> Export Excel
              </button>
            </div>
          </div>

          {/* Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Revenue Report */}
            <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0]">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-[#1E293B]">Monthly Revenue</h3>
                <span className="text-xs text-[#64748B]">Last 6 Months</span>
              </div>
              <div className="flex items-end justify-between h-48 pt-4">
                {[30, 45, 60, 20, 75, 90].map((height, i) => (
                  <div key={i} className="w-12 flex flex-col items-center gap-2">
                    <div className="w-full bg-[#0D47A1] rounded-t-md" style={{ height: `${height}%` }}></div>
                    <span className="text-xs text-[#64748B] font-medium">M{i+1}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Service Success Rate */}
            <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0]">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-[#1E293B]">Service Success Rate</h3>
                <span className="text-green-600 text-sm font-bold">94% Average</span>
              </div>
              <div className="space-y-4">
                {[
                  { label: 'Delhi', pct: 95 },
                  { label: 'Mumbai', pct: 92 },
                  { label: 'Bangalore', pct: 96 },
                  { label: 'Chennai', pct: 88 },
                ].map((item, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-[#1E293B]">{item.label}</span>
                      <span className="text-[#0D47A1]">{item.pct}%</span>
                    </div>
                    <div className="w-full bg-[#F1F5F9] h-2 rounded-full overflow-hidden">
                      <div className="bg-green-600 h-full" style={{ width: `${item.pct}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tech Productivity */}
            <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0]">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-[#1E293B]">Technician Productivity</h3>
                <span className="text-xs text-[#64748B]">Avg Jobs/Day</span>
              </div>
              <div className="flex items-end justify-between h-48 pt-4">
                {[5, 7, 4, 8, 6, 9].map((val, i) => (
                  <div key={i} className="w-12 flex flex-col items-center gap-2">
                    <div className="w-full bg-[#FFB300] rounded-t-md" style={{ height: `${val * 10}%` }}></div>
                    <span className="text-xs text-[#64748B] font-medium">{val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Customer Retention */}
            <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0]">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-[#1E293B]">Customer Retention</h3>
                <span className="text-[#0D47A1] text-sm font-bold">78% Return Rate</span>
              </div>
              <div className="flex items-center justify-center h-48">
                <div className="relative w-32 h-32">
                  <div className="absolute inset-0 rounded-full border-[12px] border-[#EEF4FF]"></div>
                  <div className="absolute inset-0 rounded-full border-[12px] border-[#0D47A1] border-t-transparent border-r-transparent rotate-45"></div>
                  <div className="absolute inset-0 flex items-center justify-center flex-col">
                    <span className="text-xl font-black text-[#1E293B]">78%</span>
                    <span className="text-xs text-[#64748B]">Loyal</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
};

export default Reports;
