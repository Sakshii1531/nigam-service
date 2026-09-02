import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, Truck, CheckCircle, Clock } from 'lucide-react';
import { apiRequest } from '../lib/apiClient';

const statusStyles = {
  Placed: 'text-amber-600 bg-amber-50 border-amber-200',
  Confirmed: 'text-purple-600 bg-purple-50 border-purple-200',
  Shipped: 'text-blue-600 bg-blue-50 border-blue-200',
  Delivered: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  Cancelled: 'text-rose-600 bg-rose-50 border-rose-200'
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
      <div className="flex border-b border-slate-100 bg-white sticky top-[57px] lg:top-[121px] z-40 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 min-w-[70px] py-3 text-[11px] font-black transition-all cursor-pointer border-b-2 ${
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
      <div className="flex flex-col divide-y divide-slate-100 max-w-3xl mx-auto w-full p-4 space-y-4">
        {loading ? (
          <div className="animate-pulse space-y-4 w-full">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-white border border-slate-100 rounded-2xl p-4 flex flex-col gap-2 shadow-sm">
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
            <p className="text-[11px] text-slate-400 font-semibold">You have no orders in this status yet.</p>
          </div>
        ) : (
          filtered.map((order) => (
            <div
              key={order.rawId}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 flex flex-col gap-4 shadow-sm hover:shadow-md transition-all"
            >
              {/* Top Row: Order ID & Status */}
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-black text-slate-900">{order.id}</span>
                  <span className="text-[9px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold uppercase">
                    {order.type}
                  </span>
                </div>
                <span className={`text-[10px] font-black px-3 py-1 rounded-full border ${statusStyles[order.status] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                  {order.status}
                </span>
              </div>

              {/* Items List with Thumbnails */}
              <div className="space-y-3">
                {order.items.map((it, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {it.image ? (
                        <img src={it.image} className="w-12 h-12 rounded-xl object-cover border border-slate-100 flex-shrink-0" alt={it.name} />
                      ) : (
                        <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 flex-shrink-0">
                          <Package className="h-5 w-5" />
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-bold text-slate-800 leading-snug">{it.name}</p>
                        <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                          {it.category} {it.sku !== '—' ? `• SKU: ${it.sku}` : ''}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-slate-700">Qty: {it.quantity}</span>
                  </div>
                ))}
              </div>

              {/* Courier & Tracking Banner if Shipped */}
              {order.status === 'Shipped' && order.trackingNumber && (
                <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-blue-900 font-semibold">
                    <Truck className="h-4 w-4 text-[#0D47A1]" />
                    <span>Courier: <strong className="font-extrabold">{order.courierPartner || 'Express'}</strong></span>
                  </div>
                  <span className="font-mono font-bold text-[#0D47A1] bg-white px-2.5 py-1 rounded-lg border border-blue-100">
                    ID: {order.trackingNumber}
                  </span>
                </div>
              )}

              {/* Footer: Date & Price */}
              <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {order.date}
                </span>
                <span className="text-sm font-black text-[#0D47A1]">{order.price}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MyOrders;
