import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/super-admin/Sidebar';
import Topbar from '../../components/super-admin/Topbar';
import { 
  Search, 
  Truck, 
  Eye, 
  CheckCircle, 
  Package, 
  X, 
  CheckCircle2, 
  User, 
  Activity, 
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Send,
  ShoppingBag,
  Clock,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { apiRequest } from '../../lib/apiClient';

const Orders = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All Statuses');
  const [successMessage, setSuccessMessage] = useState('');
  
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Dispatch Modal State
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [dispatchTargetId, setDispatchTargetId] = useState(null);
  const [courierInput, setCourierInput] = useState('');
  const [trackingInput, setTrackingInput] = useState('');
  const [dispatchError, setDispatchError] = useState('');

  const shapeOrder = (o) => {
    const rawItems = o.items || [];
    const formattedItems = rawItems.map((i) => {
      const prod = i.product || {};
      return {
        id: prod._id || prod.id || String(Math.random()),
        name: i.name || prod.name || 'Product Item',
        price: i.price ?? prod.price ?? 0,
        quantity: i.quantity || 1,
        image: prod.imageUrl || null,
        sku: prod.sku || '—',
        category: prod.category || 'General',
        warranty: prod.warrantyMonths ? `${prod.warrantyMonths} Months` : 'None',
      };
    });

    const subtotal = o.subtotal ?? formattedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const discounts = (o.couponDiscount || 0) + (o.exchangeDiscount || 0) + (o.coinsValue || 0);
    const total = o.total ?? Math.max(0, subtotal - discounts);

    // Format shipping address
    const addr = o.address;
    let fullAddressStr = 'N/A';
    if (addr) {
      const parts = [
        addr.house,
        addr.street,
        addr.landmark ? `Landmark: ${addr.landmark}` : null,
        addr.city,
        addr.state,
        addr.pincode ? `PIN: ${addr.pincode}` : null,
      ].filter(Boolean);
      fullAddressStr = parts.join(', ');
    }

    const rawMongoId = String(o._id || o.id || '');
    const shortHash = rawMongoId.length >= 7 ? rawMongoId.slice(-7).toUpperCase() : rawMongoId.toUpperCase();
    const displayOrderId = `#ORD-${shortHash}`;

    return {
      id: displayOrderId,
      rawId: o._id || o.id,
      humanId: displayOrderId,
      requester: o.user?.name || (addr?.name || 'Customer'),
      requesterPhone: o.user?.phone || addr?.mobile || 'N/A',
      requesterEmail: o.user?.email || 'N/A',
      items: formattedItems,
      part: formattedItems.map((i) => i.name).join(', ') || 'Product',
      quantity: formattedItems.reduce((sum, i) => sum + i.quantity, 0) || 1,
      priority: o.priority || 'Medium',
      status: o.status || 'Placed',
      paymentMethod: o.paymentMethod || 'Online',
      paymentStatus: o.paymentStatus || 'Pending',
      date: o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A',
      address: fullAddressStr,
      rawAddress: addr,
      subtotal,
      discounts,
      total,
      trackingNo: o.trackingNumber || '—',
      courier: o.courierPartner || '—',
    };
  };

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const data = await apiRequest('/super-admin/orders?limit=200', { auth: true });
        const items = Array.isArray(data) ? data : [];
        setOrders(items.map(shapeOrder));
      } catch (err) {
        setLoadError(err.message || 'Could not load orders.');
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const showToast = (message) => {
    setSuccessMessage(message);
    setTimeout(() => {
      setSuccessMessage('');
    }, 3000);
  };

  const handleStatusChange = async (targetOrder, newStatus, extraData = {}) => {
    const rawId = typeof targetOrder === 'object' ? (targetOrder.rawId || targetOrder.id) : targetOrder;
    const body = { status: newStatus, ...extraData };

    try {
      const res = await apiRequest(`/super-admin/orders/${rawId}/status`, { method: 'PATCH', auth: true, body });
      const updated = shapeOrder(res);
      setOrders((prev) => prev.map((o) => (o.rawId === rawId || o.id === updated.id ? updated : o)));
      if (selectedOrder?.rawId === rawId || selectedOrder?.id === updated.id) setSelectedOrder(updated);
      showToast(`Order status updated to ${newStatus}`);
    } catch (err) {
      setLoadError(err.message || 'Could not update the order status.');
    }
  };

  const handlePaymentStatusChange = async (targetOrder) => {
    const rawId = typeof targetOrder === 'object' ? (targetOrder.rawId || targetOrder.id) : targetOrder;
    try {
      const res = await apiRequest(`/super-admin/orders/${rawId}/payment-status`, {
        method: 'PATCH',
        auth: true,
        body: { paymentStatus: 'Paid' },
      });
      const updated = shapeOrder(res);
      setOrders((prev) => prev.map((o) => (o.rawId === rawId || o.id === updated.id ? updated : o)));
      if (selectedOrder?.rawId === rawId || selectedOrder?.id === updated.id) setSelectedOrder(updated);
      showToast('Payment marked as Paid ✔');
    } catch (err) {
      setLoadError(err.message || 'Could not update payment status.');
    }
  };

  const openDispatchModal = (orderId) => {
    setDispatchTargetId(orderId);
    setCourierInput('');
    setTrackingInput('');
    setDispatchError('');
    setIsDispatchModalOpen(true);
  };

  const handleDispatchSubmit = async (e) => {
    e.preventDefault();
    if (!courierInput.trim() || !trackingInput.trim()) {
      setDispatchError('Please fill in both Courier Partner and Tracking ID.');
      return;
    }
    await handleStatusChange(dispatchTargetId, 'Shipped', {
      courierPartner: courierInput.trim(),
      trackingNumber: trackingInput.trim(),
    });
    setIsDispatchModalOpen(false);
  };

  const filteredOrders = orders.filter(o => {
    const matchesSearch = o.requester.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          o.part.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === 'All Statuses' || o.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  // Calculate Metrics
  const totalOrdersCount = orders.length;
  const pendingOrdersCount = orders.filter(o => ['Placed', 'Confirmed'].includes(o.status)).length;
  const shippedOrdersCount = orders.filter(o => o.status === 'Shipped').length;
  const deliveredOrdersCount = orders.filter(o => o.status === 'Delivered').length;

  const STATUS_STEPS = ['Placed', 'Confirmed', 'Shipped', 'Delivered'];
  const getStepIndex = (status) => STATUS_STEPS.indexOf(status);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex relative text-slate-800 font-sans">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 ml-64 min-h-screen flex flex-col">
        {/* Topbar */}
        <Topbar title="Orders & Dispatch" />

        {loadError && (
          <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-xs font-bold text-red-700 shadow-sm flex items-center justify-between">
            <span>{loadError}</span>
            <button onClick={() => setLoadError('')} className="text-red-500 hover:text-red-800"><X size={14} /></button>
          </div>
        )}

        {/* Body */}
        {showDrawer && selectedOrder ? (
          <div className="p-6 md:p-8 space-y-6 flex-1 bg-[#F8FAFC] text-left max-w-7xl mx-auto w-full animate-in fade-in duration-200">
            {/* Top Navigation & Status Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 md:px-6 rounded-2xl border border-slate-200/80 shadow-xs">
              <button 
                onClick={() => {
                  setShowDrawer(false);
                  setSelectedOrder(null);
                }}
                className="flex items-center gap-2 text-xs font-black text-[#0D47A1] bg-blue-50 hover:bg-blue-100 px-3.5 py-2 rounded-xl transition-all cursor-pointer border border-blue-100"
              >
                <ArrowLeft size={16} /> Back to All Orders
              </button>

              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-400">Order Stage:</span>
                <span className={`px-3 py-1 rounded-full text-xs font-extrabold border ${
                  selectedOrder.status === 'Delivered' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                  selectedOrder.status === 'Shipped' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                  selectedOrder.status === 'Confirmed' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                  selectedOrder.status === 'Cancelled' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                  'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  {selectedOrder.status}
                </span>
              </div>
            </div>

            {/* Main Order Card Header */}
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden p-6 md:p-8">
              <div className="flex flex-wrap justify-between items-start gap-4 border-b border-slate-100 pb-6">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono font-black text-[#0D47A1] bg-blue-50 px-3 py-1 rounded-xl border border-blue-100/80">
                      {selectedOrder.id}
                    </span>
                    <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                      <Clock size={13} /> Placed: {selectedOrder.date}
                    </span>
                  </div>
                  <h1 className="text-2xl font-black text-slate-900 mt-2">Order Details</h1>
                </div>

                {/* Header Context Action Buttons */}
                <div className="flex items-center gap-3">
                  {selectedOrder.status === 'Placed' && (
                    <button
                      onClick={() => handleStatusChange(selectedOrder.id, 'Confirmed')}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-2"
                    >
                      <CheckCircle size={16} /> Confirm Order
                    </button>
                  )}

                  {/* Mark as Paid — visible for COD orders with pending payment */}
                  {selectedOrder.paymentMethod === 'COD' && selectedOrder.paymentStatus === 'Pending' && (
                    <button
                      onClick={() => handlePaymentStatusChange(selectedOrder)}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-2"
                    >
                      <CheckCircle2 size={16} /> Mark as Paid
                    </button>
                  )}

                  {['Placed', 'Confirmed'].includes(selectedOrder.status) && (
                    <button
                      onClick={() => openDispatchModal(selectedOrder.id)}
                      className="bg-gradient-to-r from-[#0D47A1] to-[#1565C0] hover:from-[#0B3C88] hover:to-[#0D47A1] text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-2"
                    >
                      <Truck size={16} /> Dispatch Order Now
                    </button>
                  )}

                  {selectedOrder.status === 'Shipped' && (
                    <button
                      onClick={() => handleStatusChange(selectedOrder.id, 'Delivered')}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-2"
                    >
                      <CheckCircle size={16} /> Mark Order Delivered
                    </button>
                  )}
                </div>
              </div>

              {/* 2-Column Systematic Grid Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-6">
                
                {/* Left Primary Column (Items + Logistics Tracker) */}
                <div className="lg:col-span-2 space-y-6">
                  
                  {/* Itemized Products Card */}
                  <div className="bg-slate-50/60 rounded-2xl border border-slate-200/80 p-5 space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-200/60 pb-3">
                      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                        <Package size={16} className="text-[#0D47A1]" /> Ordered Items ({selectedOrder.items.length})
                      </h3>
                      <span className="text-xs font-black text-[#0D47A1] bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                        Total: ₹{Number(selectedOrder.total).toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="space-y-3">
                      {selectedOrder.items.map((item, idx) => (
                        <div key={item.id || idx} className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex flex-wrap sm:flex-nowrap items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            {item.image ? (
                              <img src={item.image} className="w-16 h-16 rounded-xl object-cover border border-slate-200 flex-shrink-0" alt={item.name} />
                            ) : (
                              <div className="w-16 h-16 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 border border-slate-200 flex-shrink-0">
                                <Package size={24} />
                              </div>
                            )}
                            <div>
                              <h4 className="font-bold text-slate-900 text-sm leading-snug">{item.name}</h4>
                              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                <span className="text-[11px] font-mono font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                                  SKU: {item.sku}
                                </span>
                                <span className="text-[11px] font-semibold bg-blue-50 text-[#0D47A1] px-2 py-0.5 rounded border border-blue-100">
                                  {item.category}
                                </span>
                                {item.warranty !== 'None' && (
                                  <span className="text-[11px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-100">
                                    Warranty: {item.warranty}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="text-right sm:text-right w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 flex sm:flex-col justify-between items-center sm:items-end">
                            <span className="text-xs text-slate-500 font-bold">Qty: <strong className="text-slate-900">{item.quantity}</strong></span>
                            <span className="text-sm font-black text-slate-900 mt-0.5">₹{Number(item.price * item.quantity).toLocaleString('en-IN')}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Order Stage Tracker */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-4">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
                      <Activity size={16} className="text-[#0D47A1]" /> Order Lifecycle Tracker
                    </h3>

                    <div className="grid grid-cols-4 gap-2 text-center pt-2">
                      {STATUS_STEPS.map((step, idx) => {
                        const currentIdx = getStepIndex(selectedOrder.status);
                        const isPassed = currentIdx >= idx;
                        const isCurrent = currentIdx === idx;
                        return (
                          <div key={step} className="flex flex-col items-center gap-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                              isPassed 
                                ? 'bg-[#0D47A1] text-white shadow-xs' 
                                : 'bg-slate-100 text-slate-400 border border-slate-200'
                            } ${isCurrent ? 'ring-4 ring-blue-500/20 animate-pulse' : ''}`}>
                              {isPassed ? <CheckCircle size={16} /> : idx + 1}
                            </div>
                            <span className={`text-xs font-extrabold ${isPassed ? 'text-slate-800' : 'text-slate-400'}`}>
                              {step}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Right Secondary Column (Customer Info + Financial Summary) */}
                <div className="space-y-6">
                  
                  {/* Customer & Address Card */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-4 shadow-xs">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
                      <User size={16} className="text-[#0D47A1]" /> Requester & Shipping Info
                    </h3>

                    <div className="space-y-3 text-xs">
                      <div>
                        <span className="text-slate-400 font-semibold block">Customer Name</span>
                        <p className="font-bold text-slate-800 text-sm mt-0.5">{selectedOrder.requester}</p>
                      </div>

                      <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
                        <span className="text-slate-500 font-semibold flex items-center gap-1.5"><Phone size={13} /> Phone</span>
                        <span className="font-bold text-slate-800">{selectedOrder.requesterPhone}</span>
                      </div>

                      <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
                        <span className="text-slate-500 font-semibold flex items-center gap-1.5"><Mail size={13} /> Email</span>
                        <span className="font-bold text-slate-800 truncate max-w-[140px]">{selectedOrder.requesterEmail}</span>
                      </div>

                      <div className="pt-2">
                        <span className="text-slate-400 font-semibold flex items-center gap-1 mb-1.5">
                          <MapPin size={13} className="text-red-500" /> Destination Address
                        </span>
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-xs font-medium text-slate-700 leading-relaxed">
                          {selectedOrder.address}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Billing & Payment Card */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-3 shadow-xs">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
                      <CreditCard size={16} className="text-[#0D47A1]" /> Payment Summary
                    </h3>

                    {/* Payment method + status badges */}
                    <div className="flex items-center gap-2 flex-wrap pb-1">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border ${
                        selectedOrder.paymentMethod === 'COD'
                          ? 'bg-orange-50 text-orange-700 border-orange-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}>
                        {selectedOrder.paymentMethod === 'COD' ? '🚚 Pay on Delivery' : '⚡ Online Payment'}
                      </span>
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border ${
                        selectedOrder.paymentStatus === 'Paid'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {selectedOrder.paymentStatus === 'Paid' ? '✓ Paid' : '⏳ Payment Pending'}
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between text-slate-500 font-semibold">
                        <span>Items Subtotal</span>
                        <span className="text-slate-800">₹{Number(selectedOrder.subtotal).toLocaleString('en-IN')}</span>
                      </div>

                      {selectedOrder.discounts > 0 && (
                        <div className="flex justify-between text-emerald-600 font-semibold">
                          <span>Discounts & Redemptions</span>
                          <span>-₹{Number(selectedOrder.discounts).toLocaleString('en-IN')}</span>
                        </div>
                      )}

                      <div className="flex justify-between items-center pt-3 border-t border-slate-100 text-sm font-black text-slate-900 bg-blue-50/50 -mx-5 -mb-5 p-5 rounded-b-2xl border-t-blue-100">
                        <span>Grand Total</span>
                        <span className="text-[#0D47A1] text-base">₹{Number(selectedOrder.total).toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Logistics Status Details Card */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-3 shadow-xs">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
                      <Truck size={16} className="text-[#0D47A1]" /> Logistics Details
                    </h3>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-semibold">Courier:</span>
                        <span className="font-bold text-slate-800">{selectedOrder.courier}</span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-slate-400 font-semibold">Tracking Number:</span>
                        <span className="font-mono font-bold text-[#0D47A1] bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                          {selectedOrder.trackingNo}
                        </span>
                      </div>
                    </div>
                  </div>

                </div>

              </div>

            </div>
          </div>
        ) : (
          <div className="p-6 md:p-8 space-y-6 flex-1 max-w-7xl mx-auto w-full">
          
          {/* Analytics Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Orders</span>
                <h3 className="text-2xl font-black text-slate-900 mt-1">{totalOrdersCount}</h3>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#0D47A1] flex items-center justify-center font-bold">
                <ShoppingBag size={22} />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">Pending Orders</span>
                <h3 className="text-2xl font-black text-slate-900 mt-1">{pendingOrdersCount}</h3>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <Clock size={22} />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Shipped Orders</span>
                <h3 className="text-2xl font-black text-slate-900 mt-1">{shippedOrdersCount}</h3>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <Truck size={22} />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Delivered</span>
                <h3 className="text-2xl font-black text-slate-900 mt-1">{deliveredOrdersCount}</h3>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <CheckCircle2 size={22} />
              </div>
            </div>
          </div>

          {/* Filters & Search Bar */}
          <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] flex flex-wrap gap-4 items-center justify-between shadow-xs">
            <div className="flex flex-wrap gap-3 items-center flex-1">
              <div className="relative w-72">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Search size={16} />
                </div>
                <input
                  type="text"
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0D47A1] outline-none text-sm bg-slate-50/50 text-slate-800 font-medium"
                  placeholder="Search Order ID, Requester..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <select 
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="text-sm font-bold text-slate-700 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-[#0D47A1] bg-slate-50/50 cursor-pointer"
              >
                <option>All Statuses</option>
                <option>Placed</option>
                <option>Confirmed</option>
                <option>Shipped</option>
                <option>Delivered</option>
                <option>Cancelled</option>
              </select>
            </div>
          </div>

          {/* Orders Table */}
          <div className="bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase border-b border-slate-200/80 font-black tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Order ID</th>
                    <th className="px-6 py-4">Requester</th>
                    <th className="px-6 py-4">Ordered Items</th>
                    <th className="px-6 py-4">Total Amount</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-blue-50/20 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-[#0D47A1]">
                        <span className="bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-lg">
                          {order.id}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-900 font-bold">{order.requester}</td>
                      <td className="px-6 py-4 text-slate-700 font-medium max-w-xs truncate">{order.part}</td>
                      <td className="px-6 py-4 text-slate-900 font-black">₹{Number(order.total).toLocaleString('en-IN')}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1.5">
                          <span className={`px-3 py-1 rounded-full text-xs font-extrabold border w-fit ${
                            order.status === 'Delivered' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            order.status === 'Shipped' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            order.status === 'Confirmed' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                            'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {order.status}
                          </span>
                          {order.paymentMethod === 'COD' && (
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border w-fit ${
                              order.paymentStatus === 'Paid'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-orange-50 text-orange-700 border-orange-200'
                            }`}>
                              {order.paymentStatus === 'Paid' ? '✓ COD Paid' : '💵 COD Pending'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-500 font-semibold">{order.date}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex gap-2 justify-end">
                          <button 
                            onClick={() => {
                              setSelectedOrder(order);
                              setShowDrawer(true);
                            }}
                            className="p-2 text-slate-500 hover:text-[#0D47A1] hover:bg-blue-50 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-blue-100" 
                            title="View Details"
                          >
                            <Eye size={17} />
                          </button>
                          
                          {['Placed', 'Confirmed'].includes(order.status) && (
                            <button 
                              onClick={() => openDispatchModal(order.id)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-blue-100" 
                              title="Dispatch Now"
                            >
                              <Truck size={17} />
                            </button>
                          )}

                          {order.status === 'Shipped' && (
                            <button 
                              onClick={() => handleStatusChange(order.id, 'Delivered')}
                              className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-emerald-100" 
                              title="Mark Delivered"
                            >
                              <CheckCircle size={17} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Empty State */}
            {filteredOrders.length === 0 && (
              <div className="text-center py-16 bg-white">
                <Package size={48} className="text-slate-300 mx-auto mb-4" />
                <h3 className="text-base font-black text-slate-800 mb-1">No Orders Found</h3>
                <p className="text-xs text-slate-400 font-medium">Try adjusting your search or filters.</p>
              </div>
            )}
          </div>
        </div>
      )}
      </div>

      {/* Dispatch Inline Modal */}
      {isDispatchModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xl shadow-blue-950/20 max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#0D47A1] flex items-center justify-center">
                  <Truck size={20} />
                </div>
                <h3 className="font-black text-lg text-slate-800">Dispatch Order</h3>
              </div>
              <button 
                onClick={() => setIsDispatchModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {dispatchError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-bold p-3.5 rounded-2xl">
                {dispatchError}
              </div>
            )}

            <form onSubmit={handleDispatchSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Courier Partner
                </label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. BlueDart / Delhivery / DTDC"
                  className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-2xl outline-none focus:bg-white focus:border-[#0D47A1] focus:ring-4 focus:ring-blue-500/10 text-sm font-medium text-slate-800"
                  value={courierInput}
                  onChange={(e) => setCourierInput(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Tracking Number / ID
                </label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. BD-982301923"
                  className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-2xl outline-none focus:bg-white focus:border-[#0D47A1] focus:ring-4 focus:ring-blue-500/10 text-sm font-mono font-bold text-slate-800"
                  value={trackingInput}
                  onChange={(e) => setTrackingInput(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsDispatchModalOpen(false)}
                  className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 text-xs font-bold bg-[#0D47A1] hover:bg-blue-700 text-white rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2"
                >
                  <Send size={15} /> Submit & Ship
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Success Toast */}
      {successMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white text-xs font-bold px-5 py-3 rounded-full shadow-xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="h-4 w-4" />
          {successMessage}
        </div>
      )}
    </div>
  );
};

export default Orders;
