import React, { useState } from 'react';
import Sidebar from '../../components/super-admin/Sidebar';
import Topbar from '../../components/super-admin/Topbar';
import { 
  BarChart3, 
  Download, 
  TrendingUp, 
  Users, 
  UserCheck, 
  CreditCard,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';

const Reports = () => {
  const [successMessage, setSuccessMessage] = useState('');
  const [isPdfExporting, setIsPdfExporting] = useState(false);
  const [isExcelExporting, setIsExcelExporting] = useState(false);
  
  const [activeRevenueBar, setActiveRevenueBar] = useState(null);
  const [activeTechBar, setActiveTechBar] = useState(null);

  const showToast = (message) => {
    setSuccessMessage(message);
    setTimeout(() => {
      setSuccessMessage('');
    }, 3000);
  };

  const handleExportPDF = () => {
    setIsPdfExporting(true);
    setTimeout(() => {
      setIsPdfExporting(false);
      showToast('PDF Performance Report downloaded successfully!');
    }, 1500);
  };

  const handleExportExcel = () => {
    setIsExcelExporting(true);
    setTimeout(() => {
      setIsExcelExporting(false);
      showToast('Excel Billing Ledger downloaded successfully!');
    }, 1500);
  };

  const revenueData = [
    { month: 'Jan', val: '₹1.8L', height: 30 },
    { month: 'Feb', val: '₹2.5L', height: 45 },
    { month: 'Mar', val: '₹3.4L', height: 60 },
    { month: 'Apr', val: '₹1.2L', height: 20 },
    { month: 'May', val: '₹4.5L', height: 75 },
    { month: 'Jun', val: '₹5.8L', height: 90 },
  ];

  const productivityData = [
    { day: 'Mon', val: '5 jobs', height: 50 },
    { day: 'Tue', val: '7 jobs', height: 70 },
    { day: 'Wed', val: '4 jobs', height: 40 },
    { day: 'Thu', val: '8 jobs', height: 80 },
    { day: 'Fri', val: '6 jobs', height: 60 },
    { day: 'Sat', val: '9 jobs', height: 90 },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex relative text-slate-800">
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
              <button 
                onClick={handleExportPDF}
                disabled={isPdfExporting || isExcelExporting}
                className="bg-white text-[#1E293B] border border-[#E2E8F0] px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#F8FAFC] transition-all flex items-center gap-2 shadow-sm disabled:opacity-75 disabled:cursor-not-allowed"
              >
                {isPdfExporting ? (
                  <RefreshCw size={16} className="animate-spin text-[#0D47A1]" />
                ) : (
                  <Download size={16} className="text-[#0D47A1]" />
                )}
                {isPdfExporting ? 'Exporting PDF...' : 'Export PDF'}
              </button>

              <button 
                onClick={handleExportExcel}
                disabled={isPdfExporting || isExcelExporting}
                className="bg-[#0D47A1] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-all flex items-center gap-2 shadow-sm disabled:opacity-75 disabled:cursor-not-allowed"
              >
                {isExcelExporting ? (
                  <RefreshCw size={16} className="animate-spin text-white" />
                ) : (
                  <Download size={16} className="text-white" />
                )}
                {isExcelExporting ? 'Exporting Excel...' : 'Export Excel'}
              </button>
            </div>
          </div>

          {/* Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Revenue Report */}
            <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="font-bold text-[#1E293B]">Monthly Revenue</h3>
                  <p className="text-xs text-[#64748B]">Click bars to see exact revenue values</p>
                </div>
                <span className="text-xs text-[#64748B] font-semibold bg-[#F8FAFC] px-2 py-1 rounded-md">Last 6 Months</span>
              </div>
              <div className="flex items-end justify-between h-48 pt-4 border-b border-[#E2E8F0] pb-2 px-4">
                {revenueData.map((item, i) => (
                  <div 
                    key={i} 
                    className="w-12 flex flex-col items-center gap-2 cursor-pointer group"
                    onClick={() => setActiveRevenueBar(activeRevenueBar === i ? null : i)}
                  >
                    <div className="w-full relative">
                      {/* Tooltip */}
                      {(activeRevenueBar === i || activeRevenueBar === null) && (
                        <div className={`absolute -top-8 left-1/2 -translate-x-1/2 bg-[#1E293B] text-white text-xs px-2 py-1 rounded font-bold transition-opacity shadow-lg whitespace-nowrap ${
                          activeRevenueBar === i ? 'opacity-100 scale-100 z-10' : 'opacity-0 scale-95 group-hover:opacity-100 pointer-events-none'
                        }`}>
                          {item.val}
                        </div>
                      )}
                      <div 
                        className={`w-full bg-[#0D47A1] rounded-t-md transition-all ${
                          activeRevenueBar === i ? 'bg-blue-600 scale-x-105 shadow-md' : 'hover:bg-blue-500 opacity-90'
                        }`} 
                        style={{ height: `${item.height * 1.5}px` }}
                      ></div>
                    </div>
                    <span className="text-xs text-[#64748B] font-semibold">{item.month}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Service Success Rate */}
            <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-[#1E293B]">Service Success Rate</h3>
                <span className="text-green-600 text-sm font-bold bg-green-50 px-2 py-0.5 rounded">94% Average</span>
              </div>
              <div className="space-y-4">
                {[
                  { label: 'Delhi', pct: 95 },
                  { label: 'Mumbai', pct: 92 },
                  { label: 'Bangalore', pct: 96 },
                  { label: 'Chennai', pct: 88 },
                ].map((item, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-[#1E293B]">{item.label}</span>
                      <span className="text-[#0D47A1]">{item.pct}%</span>
                    </div>
                    <div className="w-full bg-[#F1F5F9] h-2 rounded-full overflow-hidden">
                      <div className="bg-green-600 h-full rounded-full" style={{ width: `${item.pct}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tech Productivity */}
            <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="font-bold text-[#1E293B]">Technician Productivity</h3>
                  <p className="text-xs text-[#64748B]">Click bars to see exact job count</p>
                </div>
                <span className="text-xs text-[#64748B] font-semibold bg-[#F8FAFC] px-2 py-1 rounded-md">Avg Jobs/Day</span>
              </div>
              <div className="flex items-end justify-between h-48 pt-4 border-b border-[#E2E8F0] pb-2 px-4">
                {productivityData.map((item, i) => (
                  <div 
                    key={i} 
                    className="w-12 flex flex-col items-center gap-2 cursor-pointer group"
                    onClick={() => setActiveTechBar(activeTechBar === i ? null : i)}
                  >
                    <div className="w-full relative">
                      {/* Tooltip */}
                      {(activeTechBar === i || activeTechBar === null) && (
                        <div className={`absolute -top-8 left-1/2 -translate-x-1/2 bg-[#1E293B] text-white text-xs px-2 py-1 rounded font-bold transition-opacity shadow-lg whitespace-nowrap ${
                          activeTechBar === i ? 'opacity-100 scale-100 z-10' : 'opacity-0 scale-95 group-hover:opacity-100 pointer-events-none'
                        }`}>
                          {item.val}
                        </div>
                      )}
                      <div 
                        className={`w-full bg-[#FFB300] rounded-t-md transition-all ${
                          activeTechBar === i ? 'bg-amber-500 scale-x-105 shadow-md' : 'hover:bg-amber-400 opacity-90'
                        }`} 
                        style={{ height: `${item.height * 1.5}px` }}
                      ></div>
                    </div>
                    <span className="text-xs text-[#64748B] font-semibold">{item.day}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Customer Retention */}
            <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-[#1E293B]">Customer Retention</h3>
                <span className="text-[#0D47A1] text-sm font-bold bg-blue-50 px-2 py-0.5 rounded">78% Return Rate</span>
              </div>
              <div className="flex items-center justify-center h-48">
                <div className="relative w-32 h-32 cursor-pointer group" onClick={() => showToast('Customer Retention is up 3.4% this quarter!')}>
                  <div className="absolute inset-0 rounded-full border-[12px] border-[#EEF4FF]"></div>
                  <div className="absolute inset-0 rounded-full border-[12px] border-[#0D47A1] border-t-transparent border-r-transparent rotate-45 transition-transform group-hover:rotate-90 duration-500"></div>
                  <div className="absolute inset-0 flex items-center justify-center flex-col">
                    <span className="text-xl font-black text-[#1E293B]">78%</span>
                    <span className="text-xs text-[#64748B] font-semibold">Loyal</span>
                  </div>
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
