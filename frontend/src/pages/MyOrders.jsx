import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Package, Truck, CheckCircle, Clock, 
  Home as HomeIcon, LayoutGrid, ShoppingCart, Calendar, User 
} from 'lucide-react';
import { apiRequest } from '../lib/apiClient';

const statusStyles = {
  Placed: 'text-amber-700 bg-amber-50 border-amber-200/90',
  Confirmed: 'text-purple-700 bg-purple-50 border-purple-200/90',
  Shipped: 'text-blue-700 bg-blue-50 border-blue-200/90',
  Delivered: 'text-emerald-700 bg-emerald-50 border-emerald-200/90',
  Cancelled: 'text-rose-700 bg-rose-50 border-rose-200/90'
};

const tabs = ['All', 'Placed', 'Confirmed', 'Shipped', 'Delivered'];

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
          const formatted = res.map(o => {
            const rawMongoId = String(o._id || o.id || '');
            const shortHash = rawMongoId.length >= 7 ? rawMongoId.slice(-7).toUpperCase() : rawMongoId.toUpperCase();
            const displayOrderId = `#ORD-${shortHash}`;
            return {
              id: displayOrderId,
              rawId: o._id || o.id,
              items: (o.items || []).map(it => ({
                name: it.name || it.product?.name || 'Product Item',
                quantity: it.quantity || 1,
                price: it.price || 0,
                image: it.product?.imageUrl || null,
                category: it.product?.category || 'General',
                sku: it.product?.sku || '—'
              })),
              itemSummary: o.items?.map(it => `${it.name} (x${it.quantity})`).join(', ') || 'Product Purchase',
              type: o.items?.[0] ? 'Buy New' : 'Order',
              price: `₹${Number(o.total || 0).toLocaleString('en-IN')}`,
              date: new Date(o.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
              status: o.status || 'Placed',
              courierPartner: o.courierPartner || null,
              trackingNumber: o.trackingNumber || null
            };
          });
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
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col pb-20 lg:pb-10 font-sans">
      {/* Top Header */}
      <div className="bg-white/95 backdrop-blur-md px-3.5 py-2.5 flex items-center justify-between sticky top-0 z-50 shadow-2xs border-b border-slate-100">
        <button
          onClick={() => navigate(-1)}
          className="w-8 h-8 rounded-full bg-slate-100/90 active:scale-95 flex items-center justify-center text-slate-700 transition-all cursor-pointer"
          aria-label="Go Back"
        >
          <ArrowLeft className="h-4 w-4 text-slate-700" />
        </button>
        <h1 className="text-sm font-extrabold text-slate-900 tracking-tight uppercase">MY ORDERS</h1>
        <div className="w-8 h-8" />
      </div>

      {/* Filter Tabs — Edge-to-edge horizontal scroll */}
      <div className="flex border-b border-slate-100 bg-white sticky top-[45px] lg:top-[121px] z-40 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 min-w-[72px] py-2.5 text-[11px] font-extrabold transition-all cursor-pointer border-b-2 whitespace-nowrap text-center ${
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
      <div className="flex flex-col max-w-3xl mx-auto w-full p-3.5 sm:p-4 gap-3 sm:gap-4">
        {loading ? (
          <div className="animate-pulse space-y-3 w-full">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-white border border-slate-100 rounded-2xl p-4 flex flex-col gap-2 shadow-2xs">
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
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-6 bg-white rounded-2xl border border-slate-200/70 shadow-2xs my-4">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">
              <Package className="h-6 w-6 text-slate-400" />
            </div>
            <p className="text-sm font-extrabold text-slate-800">No {activeTab !== 'All' ? activeTab : ''} Orders</p>
            <p className="text-[11px] text-slate-400 font-semibold">You have no orders in this status yet.</p>
          </div>
        ) : (
          filtered.map((order) => (
            <div
              key={order.rawId}
              className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-5 flex flex-col gap-3 shadow-2xs hover:shadow-md transition-all"
            >
              {/* Top Row: Order ID & Status */}
              <div className="flex justify-between items-center border-b border-slate-100/80 pb-2.5">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="text-xs font-mono font-black text-slate-900">{order.id}</span>
                  <span className="text-[9px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">
                    {order.type}
                  </span>
                </div>
                <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${statusStyles[order.status] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                  {order.status}
                </span>
              </div>

              {/* Items List with Thumbnails */}
              <div className="space-y-2.5">
                {order.items.map((it, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {it.image ? (
                        <img src={it.image} className="w-12 h-12 rounded-xl object-contain border border-slate-100 p-1 bg-slate-50 flex-shrink-0" alt={it.name} />
                      ) : (
                        <div className="w-12 h-12 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-center text-slate-400 flex-shrink-0">
                          <Package className="h-5 w-5" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-800 leading-snug truncate">{it.name}</p>
                        <p className="text-[10px] text-slate-400 font-semibold mt-0.5 truncate">
                          {it.category} {it.sku !== '—' ? `• SKU: ${it.sku}` : ''}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-slate-700 shrink-0">Qty: {it.quantity}</span>
                  </div>
                ))}
              </div>

              {/* Courier & Tracking Banner if Shipped */}
              {order.status === 'Shipped' && order.trackingNumber && (
                <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-blue-900 font-semibold">
                    <Truck className="h-3.5 w-3.5 text-[#0D47A1]" />
                    <span>Courier: <strong className="font-extrabold">{order.courierPartner || 'Express'}</strong></span>
                  </div>
                  <span className="font-mono font-bold text-[#0D47A1] bg-white px-2 py-0.5 rounded-md border border-blue-100 text-[11px]">
                    ID: {order.trackingNumber}
                  </span>
                </div>
              )}

              {/* Footer: Date & Price */}
              <div className="flex justify-between items-center pt-2 border-t border-slate-100/80">
                <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {order.date}
                </span>
                <span className="text-sm font-black text-[#0D47A1]">{order.price}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Bottom Menu Bar (Custom Mobile Tabs) — hidden on desktop */}
      <div className="fixed bottom-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-xl border-t border-slate-200/80 px-3 sm:px-8 flex justify-around items-center z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] lg:hidden">
        <button 
          onClick={() => navigate('/dashboard')}
          className="flex flex-col items-center justify-center py-1 px-2.5 text-slate-500 hover:text-[#0D47A1] transition-colors cursor-pointer"
        >
          <HomeIcon className="h-5 w-5" />
          <span className="text-[10px] font-medium tracking-tight mt-0.5">Home</span>
        </button>

        <button 
          onClick={() => navigate('/categories')}
          className="flex flex-col items-center justify-center py-1 px-2.5 text-slate-500 hover:text-[#0D47A1] transition-colors cursor-pointer"
        >
          <LayoutGrid className="h-5 w-5" />
          <span className="text-[10px] font-medium tracking-tight mt-0.5">Categories</span>
        </button>

        <button 
          onClick={() => navigate('/buy')}
          className="flex flex-col items-center justify-center py-1 px-2.5 text-slate-500 hover:text-[#0D47A1] transition-colors cursor-pointer"
        >
          <ShoppingCart className="h-5 w-5" />
          <span className="text-[10px] font-medium tracking-tight mt-0.5">Buy</span>
        </button>

        <button 
          onClick={() => navigate('/bookings')}
          className="flex flex-col items-center justify-center py-1 px-2.5 text-slate-500 hover:text-[#0D47A1] transition-colors cursor-pointer"
        >
          <Calendar className="h-5 w-5" />
          <span className="text-[10px] font-medium tracking-tight mt-0.5">Bookings</span>
        </button>

        <button 
          onClick={() => navigate('/profile')}
          className="flex flex-col items-center justify-center relative py-1 px-2.5 text-[#0D47A1] cursor-pointer"
        >
          <div className="absolute -top-3 w-8 h-1 bg-[#0D47A1] rounded-b-full shadow-2xs" />
          <div className="p-1 rounded-xl bg-blue-50/90 text-[#0D47A1]">
            <User className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-bold tracking-tight mt-0.5">Account</span>
        </button>
      </div>
    </div>
  );
};

export default MyOrders;
