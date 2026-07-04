import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, ChevronRight } from 'lucide-react';

const ordersData = [
  { 
    id: '#NCCO876543', 
    item: 'Samsung 253L Smart Refrigerator', 
    type: 'Buy New',
    price: '₹24,990',
    date: '02 July 2026, 04:30 PM', 
    status: 'Processing' 
  },
  { 
    id: '#NCCO876542', 
    item: 'LG 1.5 Ton 5-Star Dual Inverter AC', 
    type: 'Buy New',
    price: '₹42,500',
    date: '28 June 2026, 11:15 AM', 
    status: 'Shipped' 
  },
  { 
    id: '#NCCO876541', 
    item: 'Water Purifier AMC Plan', 
    type: 'NCC AMC',
    price: '₹4,999',
    date: '15 June 2026, 02:00 PM', 
    status: 'Delivered' 
  },
  { 
    id: '#NCCO876540', 
    item: 'Havells Geyser 15L - Extended Warranty', 
    type: 'NCC Shield',
    price: '₹1,499',
    date: '10 June 2026, 09:30 AM', 
    status: 'Delivered' 
  }
];

const tabs = ['All', 'Processing', 'Shipped', 'Delivered'];

const statusStyles = {
  Processing: 'text-amber-600 bg-amber-50 border-amber-100',
  Shipped: 'text-blue-600 bg-blue-50 border-blue-100',
  Delivered: 'text-emerald-600 bg-emerald-50 border-emerald-100',
};

const MyOrders = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('All');

  const filtered = activeTab === 'All'
    ? ordersData
    : ordersData.filter((o) => o.status === activeTab);

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
        <h1 className="text-sm font-black text-slate-900 uppercase tracking-wide">My Orders</h1>
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

      {/* Orders List */}
      <div className="flex flex-col divide-y divide-slate-100">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center px-6">
            <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center">
              <Package className="h-6 w-6 text-slate-400" />
            </div>
            <p className="text-sm font-black text-slate-700">No {activeTab} Orders</p>
            <p className="text-[11px] text-slate-400 font-semibold">You have no orders in this category yet.</p>
          </div>
        ) : (
          filtered.map((order, i) => (
            <div
              key={i}
              className="bg-white px-5 py-4.5 flex flex-col gap-2 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-slate-900">{order.id}</span>
                  <span className="text-[9px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                    {order.type}
                  </span>
                </div>
                <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${statusStyles[order.status]}`}>
                  {order.status}
                </span>
              </div>
              <div>
                <p className="text-xs font-black text-slate-800 leading-snug">{order.item}</p>
                <div className="flex justify-between items-center mt-1">
                  <p className="text-[10px] text-slate-400 font-semibold">{order.date}</p>
                  <p className="text-xs font-black text-[#0D47A1]">{order.price}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MyOrders;
