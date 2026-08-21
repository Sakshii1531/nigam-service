import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Wrench } from 'lucide-react';
import { apiRequest } from '../lib/apiClient';

const tabs = ['All', 'Upcoming', 'Completed', 'Cancelled'];

const statusStyles = {
  Upcoming: 'text-[#1565C0] font-extrabold',
  Completed: 'text-[#2E7D32] font-extrabold',
  Cancelled: 'text-rose-600 font-extrabold',
  Pending: 'text-[#1565C0] font-extrabold',
};

const MyBookings = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('All');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadBookings = async () => {
      setLoading(true);
      try {
        const res = await apiRequest('/bookings', { auth: true });
        const listToMap = Array.isArray(res) ? res : [];
        // Field names are the Booking schema's: there is no `bookingId` or
        // `serviceName`, and `service` is an object — reading it directly would
        // have rendered "[object Object]".
        const apiList = listToMap.map(b => ({
          id: b.humanId || b.id,
          service: b.service?.name || b.category || 'Service Request',
          date: b.scheduledDate ? new Date(b.scheduledDate).toLocaleDateString() : 'Scheduled',
          status: b.status || 'Upcoming',
        }));

        setBookings(apiList);
      } catch (err) {
        setBookings([]);
      } finally {
        setLoading(false);
      }
    };

    loadBookings();
  }, []);

  const filtered = activeTab === 'All'
    ? bookings
    : bookings.filter((b) => b.status === activeTab);

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
        {loading ? (
          <div className="animate-pulse p-5 space-y-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-white border border-slate-100 rounded-xl p-4 flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <div className="h-4 bg-slate-200 rounded w-1/4"></div>
                  <div className="h-4 bg-slate-200 rounded-full w-1/5"></div>
                </div>
                <div className="h-3.5 bg-slate-200 rounded w-1/2"></div>
                <div className="h-3 bg-slate-200 rounded w-1/3"></div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
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
