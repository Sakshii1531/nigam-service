import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Wrench } from 'lucide-react';

const bookingsData = [
  { id: '#NCCP123456', service: 'AC Service', date: '12 May 2025, 10:00 AM', status: 'Upcoming' },
  { id: '#NCCP123455', service: 'Washing Machine Repair', date: '10 May 2025, 02:00 PM', status: 'Completed' },
  { id: '#NCCP123454', service: 'RO Service', date: '08 May 2025, 11:00 AM', status: 'Completed' },
  { id: '#NCCP123453', service: 'Refrigerator Service', date: '05 May 2025, 04:00 PM', status: 'Cancelled' },
];

const tabs = ['All', 'Upcoming', 'Completed', 'Cancelled'];

const statusStyles = {
  Upcoming: 'text-[#1565C0] font-extrabold',
  Completed: 'text-[#2E7D32] font-extrabold',
  Cancelled: 'text-rose-600 font-extrabold',
};

const MyBookings = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('All');

  const filtered = activeTab === 'All'
    ? bookingsData
    : bookingsData.filter((b) => b.status === activeTab);

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
        <h1 className="text-sm font-black text-slate-900 uppercase tracking-wide">My Bookings</h1>
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

      {/* Bookings List */}
      <div className="flex flex-col divide-y divide-slate-100">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center px-6">
            <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center">
              <Wrench className="h-6 w-6 text-slate-400" />
            </div>
            <p className="text-sm font-black text-slate-700">No {activeTab} Bookings</p>
            <p className="text-[11px] text-slate-400 font-semibold">You have no bookings in this category yet.</p>
          </div>
        ) : (
          filtered.map((booking, i) => (
            <div
              key={i}
              className="bg-white px-5 py-4 flex flex-col gap-0.5 hover:bg-slate-50 transition-colors cursor-pointer"
              onClick={() => navigate('/bookings')}
            >
              <div className="flex justify-between items-start">
                <span className="text-xs font-black text-slate-800">{booking.id}</span>
                <span className={`text-[11px] ${statusStyles[booking.status]}`}>{booking.status}</span>
              </div>
              <p className="text-[11px] font-extrabold text-slate-700 mt-0.5">{booking.service}</p>
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{booking.date}</p>
            </div>
          ))
        )}
      </div>

      {/* View All Bookings Button */}
      {filtered.length > 0 && (
        <div className="px-5 mt-5">
          <button
            onClick={() => navigate('/bookings')}
            className="w-full border border-slate-200 text-slate-700 text-xs font-black py-3.5 rounded-2xl hover:bg-slate-50 transition-colors cursor-pointer"
          >
            View All Bookings
          </button>
        </div>
      )}
    </div>
  );
};

export default MyBookings;
