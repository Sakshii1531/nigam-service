import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Package, Truck, Clock, X, Check, Copy,
  ChevronRight, MapPin, CreditCard, HelpCircle, AlertCircle
} from 'lucide-react';
import { apiRequest } from '../lib/apiClient';
import CustomerBottomNav from '../components/CustomerBottomNav';

const statusStyles = {
  Placed: 'text-amber-700 bg-amber-50 border-amber-200/90',
  Confirmed: 'text-purple-700 bg-purple-50 border-purple-200/90',
  Shipped: 'text-blue-700 bg-blue-50 border-blue-200/90',
  Delivered: 'text-emerald-700 bg-emerald-50 border-emerald-200/90',
  Cancelled: 'text-rose-700 bg-rose-50 border-rose-200/90'
};

const ORDER_STEPS = ['Placed', 'Confirmed', 'Shipped', 'Delivered'];

const tabs = ['All', 'Placed', 'Confirmed', 'Shipped', 'Delivered'];

const MyOrders = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('All');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      try {
        const res = await apiRequest('/orders', { auth: true });
        if (res) {
          const formatted = res.map(o => {
            const rawMongoId = String(o._id || o.id || '');
            const shortHash = rawMongoId.length >= 7 ? rawMongoId.slice(-7).toUpperCase() : rawMongoId.toUpperCase();
            const displayOrderId = o.humanId || `#ORD-${shortHash}`;
            return {
              id: displayOrderId,
              rawId: o._id || o.id,
              items: (o.items || []).map(it => ({
                name: it.name || it.product?.name || 'Product Item',
                quantity: it.quantity || 1,
                price: it.price || 0,
                image: it.product?.imageUrl || it.imageUrl || null,
                category: it.product?.category || 'General',
                sku: it.product?.sku || '—'
              })),
              itemSummary: o.items?.map(it => `${it.name} (x${it.quantity})`).join(', ') || 'Product Purchase',
              type: o.items?.[0] ? 'Buy New' : 'Order',
              subtotal: Number(o.subtotal || o.total || 0),
              couponCode: o.couponCode || null,
              couponDiscount: Number(o.couponDiscount || 0),
              exchangeDiscount: Number(o.exchangeDiscount || 0),
              coinsValue: Number(o.coinsValue || 0),
              totalNum: Number(o.total || 0),
              price: `₹${Number(o.total || 0).toLocaleString('en-IN')}`,
              date: new Date(o.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
              status: o.status || 'Placed',
              courierPartner: o.courierPartner || null,
              trackingNumber: o.trackingNumber || null,
              address: o.address || null,
              paymentMethod: o.paymentMethod || 'Online',
              paymentStatus: o.paymentStatus || 'Pending'
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

  const handleCopy = (text, id) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filtered = activeTab === 'All'
    ? orders
    : orders.filter((o) => o.status === activeTab);

  const getStepIndex = (status) => {
    return ORDER_STEPS.indexOf(status);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col pb-24 lg:pb-12 font-sans text-slate-800">
      {/* Top Header */}
      <div className="bg-white/95 backdrop-blur-md px-3.5 py-2.5 flex items-center justify-between sticky top-0 z-40 shadow-2xs border-b border-slate-100">
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
      <div className="flex border-b border-slate-100 bg-white sticky top-[45px] z-30 overflow-x-auto no-scrollbar px-2">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 min-w-[72px] py-2.5 text-[11px] font-extrabold transition-all cursor-pointer border-b-2 whitespace-nowrap text-center ${
              activeTab === tab
                ? 'text-brand-blue border-brand-blue'
                : 'text-slate-400 border-transparent hover:text-slate-600'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Orders List */}
      <div className="flex flex-col max-w-3xl mx-auto w-full p-2.5 sm:p-4 gap-2.5 sm:gap-3.5 flex-1">
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
              onClick={() => setSelectedOrder(order)}
              className="bg-white rounded-2xl border border-slate-200/80 p-3 sm:p-4 flex flex-col gap-2.5 sm:gap-3 shadow-2xs hover:shadow-md hover:border-brand-blue/40 transition-all cursor-pointer group text-left active:scale-[0.99]"
            >
              {/* Top Row: Order ID & Status */}
              <div className="flex justify-between items-center border-b border-slate-100/80 pb-2">
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                  <span className="text-xs font-mono font-black text-slate-900 truncate">{order.id}</span>
                  <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded-md font-bold uppercase tracking-wider shrink-0">
                    {order.type}
                  </span>
                </div>
                <span className={`text-[10px] font-extrabold px-2 sm:px-2.5 py-0.5 rounded-full border shrink-0 ${statusStyles[order.status] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                  {order.status}
                </span>
              </div>

              {/* Items List with Thumbnails */}
              <div className="space-y-2">
                {order.items.slice(0, 2).map((it, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {it.image ? (
                        <img 
                          src={it.image} 
                          className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl object-contain border border-slate-100 p-1 bg-slate-50 shrink-0" 
                          alt={it.name}
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      ) : (
                        <div className="w-10 h-10 sm:w-11 sm:h-11 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                          <Package className="h-4 w-4" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-800 leading-snug line-clamp-1">{it.name}</p>
                        <p className="text-[10px] text-slate-400 font-semibold truncate mt-0.5">
                          {it.category} {it.sku !== '—' ? `• SKU: ${it.sku}` : ''}
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-slate-600 shrink-0">Qty: {it.quantity}</span>
                  </div>
                ))}
                {order.items.length > 2 && (
                  <p className="text-[10px] font-bold text-brand-blue pl-1">
                    +{order.items.length - 2} more item{order.items.length - 2 > 1 ? 's' : ''}
                  </p>
                )}
              </div>

              {/* Courier & Tracking Banner if Shipped */}
              {order.status === 'Shipped' && order.trackingNumber && (
                <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-2 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-blue-900 font-semibold truncate">
                    <Truck className="h-3.5 w-3.5 text-brand-blue shrink-0" />
                    <span className="truncate">Courier: <strong className="font-extrabold">{order.courierPartner || 'Express'}</strong></span>
                  </div>
                  <span className="font-mono font-bold text-brand-blue bg-white px-2 py-0.5 rounded-md border border-blue-100 text-[10px] shrink-0">
                    ID: {order.trackingNumber}
                  </span>
                </div>
              )}

              {/* Footer: Date & Price */}
              <div className="flex justify-between items-center pt-2 border-t border-slate-100/80">
                <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                  <Clock className="h-3 w-3 shrink-0" /> {order.date}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs sm:text-sm font-black text-brand-blue">{order.price}</span>
                  <div className="flex items-center gap-0.5 text-[11px] font-bold text-brand-blue bg-[#EAF4FF] px-2 py-0.5 rounded-lg group-hover:bg-brand-blue group-hover:text-white transition-colors">
                    <span>Details</span>
                    <ChevronRight className="h-3 w-3" />
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── Order Details Bottom Sheet Popup ── */}
      {selectedOrder && (
        <div 
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs transition-opacity animate-fade-in"
          onClick={() => setSelectedOrder(null)}
        >
          <div 
            className="bg-white w-full sm:max-w-lg rounded-t-[28px] sm:rounded-3xl shadow-2xl max-h-[85vh] flex flex-col overflow-hidden text-left animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sheet Handle for mobile */}
            <div className="w-12 h-1 bg-slate-300 rounded-full mx-auto mt-2.5 sm:hidden shrink-0" />

            {/* Header */}
            <div className="px-4 sm:px-5 py-3.5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-sm sm:text-base font-black text-slate-900 leading-tight">Order Details</h3>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Placed on {selectedOrder.date}</p>
              </div>
              <button 
                onClick={() => setSelectedOrder(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Scrollable Modal Body */}
            <div className="overflow-y-auto p-4 sm:p-5 flex flex-col gap-4 text-xs">
              
              {/* Order ID & Status Banner */}
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Order ID</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="font-mono font-black text-slate-900 text-xs sm:text-sm">{selectedOrder.id}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(selectedOrder.id, 'modal-id')}
                      className="p-1 rounded-md hover:bg-slate-200 text-slate-500 transition-colors"
                      title="Copy Order ID"
                    >
                      {copiedId === 'modal-id' ? (
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>
                <span className={`text-[10px] font-black px-3 py-1 rounded-full border ${statusStyles[selectedOrder.status] || 'bg-slate-100 text-slate-700'}`}>
                  {selectedOrder.status}
                </span>
              </div>

              {/* Status Timeline */}
              {selectedOrder.status !== 'Cancelled' ? (
                <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-2xs">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-3">Order Status Tracker</span>
                  <div className="flex items-center justify-between relative">
                    {/* Connecting Line */}
                    <div className="absolute top-3 left-4 right-4 h-0.5 bg-slate-200 -z-0" />
                    
                    {ORDER_STEPS.map((step, idx) => {
                      const currentIdx = getStepIndex(selectedOrder.status);
                      const isDone = currentIdx >= idx;
                      const isCurrent = currentIdx === idx;

                      return (
                        <div key={step} className="flex flex-col items-center gap-1 relative z-10">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${
                            isDone 
                              ? 'bg-emerald-600 text-white shadow-xs' 
                              : 'bg-slate-200 text-slate-500'
                          } ${isCurrent ? 'ring-4 ring-emerald-100' : ''}`}>
                            {isDone ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : idx + 1}
                          </div>
                          <span className={`text-[10px] font-bold ${isCurrent ? 'text-emerald-700' : isDone ? 'text-slate-700' : 'text-slate-400'}`}>
                            {step}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-2xl flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                  <span className="text-[11px] font-bold">This order was cancelled.</span>
                </div>
              )}

              {/* Tracking Information (if shipped/delivered) */}
              {selectedOrder.trackingNumber && (
                <div className="bg-blue-50/60 p-3 rounded-2xl border border-blue-200/80 flex flex-col gap-1.5">
                  <span className="text-[10px] font-black text-brand-blue uppercase tracking-wider flex items-center gap-1">
                    <Truck className="h-3.5 w-3.5" /> Shipping Details
                  </span>
                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-slate-600 font-medium">
                      Courier Partner: <strong className="text-slate-900 font-bold">{selectedOrder.courierPartner || 'Standard Courier'}</strong>
                    </span>
                    <div className="flex items-center gap-1 font-mono font-bold text-brand-blue bg-white px-2 py-0.5 rounded-lg border border-blue-100 text-[11px]">
                      <span>{selectedOrder.trackingNumber}</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(selectedOrder.trackingNumber, 'modal-trk')}
                        className="p-0.5 text-slate-400 hover:text-brand-blue"
                      >
                        {copiedId === 'modal-trk' ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Delivery Address (if provided) */}
              {selectedOrder.address && (
                <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-2xs flex flex-col gap-1.5">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-slate-500" /> Delivery Address
                  </span>
                  <div className="text-xs text-slate-700 leading-relaxed pt-0.5">
                    {selectedOrder.address.name && (
                      <p className="font-extrabold text-slate-900">{selectedOrder.address.name}</p>
                    )}
                    <p className="font-medium text-slate-600">
                      {[
                        selectedOrder.address.street || selectedOrder.address.addressLine1,
                        selectedOrder.address.city,
                        selectedOrder.address.state,
                        selectedOrder.address.pinCode || selectedOrder.address.pincode
                      ].filter(Boolean).join(', ')}
                    </p>
                    {selectedOrder.address.phone && (
                      <p className="text-[11px] text-slate-500 font-bold mt-1">Phone: {selectedOrder.address.phone}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Items List */}
              <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-2xs flex flex-col gap-2.5">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                  Items in Order ({selectedOrder.items.length})
                </span>
                <div className="divide-y divide-slate-100">
                  {selectedOrder.items.map((it, idx) => (
                    <div key={idx} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {it.image ? (
                          <img 
                            src={it.image} 
                            className="w-11 h-11 rounded-xl object-contain border border-slate-100 p-1 bg-slate-50 shrink-0" 
                            alt={it.name}
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                        ) : (
                          <div className="w-11 h-11 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                            <Package className="h-5 w-5" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 text-xs leading-snug line-clamp-1">{it.name}</p>
                          <p className="text-[10px] text-slate-400 font-medium">
                            {it.category} {it.sku !== '—' ? `• SKU: ${it.sku}` : ''}
                          </p>
                          <p className="text-[10px] text-slate-500 font-bold mt-0.5">
                            ₹{it.price.toLocaleString('en-IN')} × {it.quantity}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-black text-slate-900 shrink-0">
                        ₹{(it.price * it.quantity).toLocaleString('en-IN')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-2xs flex flex-col gap-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Payment & Pricing</span>
                <div className="space-y-1.5 text-[11px] pt-1 border-b border-slate-100 pb-2">
                  <div className="flex justify-between text-slate-600">
                    <span>Items Subtotal</span>
                    <span className="font-bold text-slate-800">₹{selectedOrder.subtotal.toLocaleString('en-IN')}</span>
                  </div>
                  {selectedOrder.couponDiscount > 0 && (
                    <div className="flex justify-between text-emerald-600 font-bold">
                      <span>Coupon Discount {selectedOrder.couponCode ? `(${selectedOrder.couponCode})` : ''}</span>
                      <span>-₹{selectedOrder.couponDiscount.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  {selectedOrder.exchangeDiscount > 0 && (
                    <div className="flex justify-between text-emerald-600 font-bold">
                      <span>Exchange Bonus</span>
                      <span>-₹{selectedOrder.exchangeDiscount.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  {selectedOrder.coinsValue > 0 && (
                    <div className="flex justify-between text-emerald-600 font-bold">
                      <span>Coins Redeemed</span>
                      <span>-₹{selectedOrder.coinsValue.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-600">
                    <span>Delivery Charges</span>
                    <span className="font-bold text-emerald-600">FREE</span>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-1 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Amount</span>
                    <span className="text-base font-black text-brand-blue">{selectedOrder.price}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-xl">
                    <CreditCard className="h-3.5 w-3.5 text-slate-500" />
                    <span>{selectedOrder.paymentMethod === 'COD' ? 'Cash on Delivery' : 'Paid via Razorpay'}</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Footer Action Buttons */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  window.location.href = 'tel:+919999999999';
                }}
                className="flex-1 py-2.5 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <HelpCircle className="h-3.5 w-3.5 text-slate-500" />
                <span>Help & Support</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="flex-1 py-2.5 px-3 rounded-xl bg-brand-blue hover:bg-[#072C63] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <span>Done</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Bottom Menu Bar (Custom Mobile Tabs) — hidden on desktop */}
      <CustomerBottomNav />
    </div>
  );
};

export default MyOrders;
