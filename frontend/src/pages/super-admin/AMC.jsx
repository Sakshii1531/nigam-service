import React, { useState } from 'react';
import Sidebar from '../../components/super-admin/Sidebar';
import Topbar from '../../components/super-admin/Topbar';
import { Search, Shield, ShieldAlert, Award, FileText, ClipboardList } from 'lucide-react';

const AMC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('All Plans');

  const [subscriptions] = useState([
    { id: 1, customer: 'Neha Gupta', phone: '+91 95555 12345', plan: 'Gold AMC', product: 'AC Maintenance', expires: '15 June 2027', price: '₹4,999', status: 'Active' },
    { id: 2, customer: 'Rohan Sharma', phone: '+91 94444 67890', plan: 'Platinum AMC', product: 'Full Home Appliances', expires: '10 May 2027', price: '₹9,999', status: 'Active' },
    { id: 3, customer: 'Pooja Kapoor', phone: '+91 93333 54321', plan: 'Silver AMC', product: 'Fridge + Washing Machine', expires: '28 Dec 2026', price: '₹2,999', status: 'Active' },
    { id: 4, customer: 'Sanjay Dutt', phone: '+91 92222 98765', plan: 'Gold AMC', product: 'AC Maintenance', expires: '10 Feb 2026', price: '₹4,999', status: 'Expired' },
    { id: 5, customer: 'Aman Varma', phone: '+91 91111 23456', plan: 'Silver AMC', product: 'Washing Machine', expires: '12 Jan 2027', price: '₹2,499', status: 'Active' },
  ]);

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
        <div className="p-6 space-y-6 flex-1">
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center border border-blue-100">
                <ClipboardList size={20} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Sales</p>
                <p className="text-xl font-black text-slate-800 mt-1">₹12,45,000</p>
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center border border-green-100">
                <Shield size={20} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Contracts</p>
                <p className="text-xl font-black text-slate-800 mt-1">24,850</p>
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center border border-purple-100">
                <Award size={20} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Most Sold</p>
                <p className="text-xl font-black text-slate-800 mt-1">Gold AMC (AC)</p>
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 bg-red-50 text-red-500 rounded-xl flex items-center justify-center border border-red-100">
                <ShieldAlert size={20} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Expiring in 7 Days</p>
                <p className="text-xl font-black text-red-600 mt-1">265</p>
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
