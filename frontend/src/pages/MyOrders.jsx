import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, ChevronRight } from 'lucide-react';
import { apiRequest } from '../lib/apiClient';

const statusStyles = {
  Processing: 'text-amber-600 bg-amber-50 border-amber-100',
  Shipped: 'text-blue-600 bg-blue-50 border-blue-100',
  Delivered: 'text-emerald-600 bg-emerald-50 border-emerald-100',
  Cancelled: 'text-rose-600 bg-rose-50 border-rose-100'
};

const tabs = ['All', 'Processing', 'Shipped', 'Delivered'];

const MyOrders = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('All');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      try {
        const res = await apiRequest('/orders', { auth: true });
        if (res) {
          const formatted = res.map(o => ({
            id: o.humanId || o.id,
            item: o.items?.map(it => `${it.name} (x${it.quantity})`).join(', ') || 'Product Purchase',
            type: o.items?.[0] ? 'Buy New' : 'Order',
            price: `₹${o.total.toFixed(2)}`,
            date: new Date(o.createdAt).toLocaleString(),
            status: o.status === 'Placed' || o.status === 'Confirmed' ? 'Processing' : o.status
          }));
          setOrders(formatted);
        }
      } catch (err) {
        console.warn('Could not fetch user orders:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const filtered = activeTab === 'All'
    ? orders
    : orders.filter((o) => o.status === activeTab);

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
      <div className="flex border-b border-slate-100 bg-white sticky top-[57px] lg:top-[121px] z-40">
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
        {loading ? (
          <div className="animate-pulse p-5 space-y-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-white border border-slate-100 rounded-xl p-4 flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <div className="h-4 bg-slate-200 rounded w-1/3"></div>
                  <div className="h-4 bg-slate-200 rounded-full w-1/5"></div>
                </div>
                <div className="h-3 bg-slate-200 rounded w-3/4"></div>
                <div className="h-3.5 bg-slate-200 rounded w-1/4"></div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
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
