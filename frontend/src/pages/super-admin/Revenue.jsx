import React, { useState } from 'react';
import Sidebar from '../../components/super-admin/Sidebar';
import Topbar from '../../components/super-admin/Topbar';
import { IndianRupee, TrendingUp, TrendingDown, ArrowUpRight, BarChart3, ShieldCheck } from 'lucide-react';

const Revenue = () => {
  const [earnings] = useState([
    { id: 1, source: 'Air Conditioner Maintenance', gross: '₹4,50,000', partners: '₹3,60,000', margin: '20%', net: '₹90,000' },
    { id: 2, source: 'Appliance Repair Services', gross: '₹3,20,000', partners: '₹2,40,000', margin: '25%', net: '₹80,000' },
    { id: 3, source: 'AMC Plan Sales', gross: '₹2,84,000', partners: '₹0', margin: '100%', net: '₹2,84,000' },
    { id: 4, source: 'Warranty Registrations', gross: '₹1,50,000', partners: '₹0', margin: '100%', net: '₹1,50,000' },
  ]);

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
                <p className="text-xl font-black text-slate-800 mt-1">₹12,04,000</p>
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center border border-green-100">
                <TrendingUp size={20} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Platform Net Share</p>
                <p className="text-xl font-black text-slate-800 mt-1">₹6,04,000</p>
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 bg-yellow-50 text-yellow-600 rounded-xl flex items-center justify-center border border-yellow-100">
                <BarChart3 size={20} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Avg Commission Rate</p>
                <p className="text-xl font-black text-slate-800 mt-1">22.5%</p>
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center border border-purple-100">
                <ShieldCheck size={20} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">GST Collected</p>
                <p className="text-xl font-black text-slate-800 mt-1">₹2,16,720</p>
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
                {earnings.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 pl-6 font-bold text-slate-800">{e.source}</td>
                    <td className="p-4 text-slate-800 font-bold">{e.gross}</td>
                    <td className="p-4 text-slate-600 font-semibold">{e.partners}</td>
                    <td className="p-4 text-[#0D47A1] font-bold">{e.margin}</td>
                    <td className="p-4 pr-6 text-green-600 font-black flex items-center gap-1">{e.net} <ArrowUpRight size={12} /></td>
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
