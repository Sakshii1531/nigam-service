import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Bell, Briefcase, ClipboardList, Calendar, Wrench, User, Search, PlusCircle, 
  MapPin, Check, Plus, AlertTriangle, ShieldCheck, ChevronRight, ChevronLeft, X,
  Package, ShoppingCart, Layers, Cpu, Wind, Droplets, Zap, Shield, Flame, Trash2, ArrowRight
} from 'lucide-react';
import TechBottomNav from '../../components/TechBottomNav';
import { useTech } from '../../context/TechContext';
import { useNotifications } from '../../context/NotificationContext';

const RaisePartRequest = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const { 
    inventory, 
    claims, 
    addPartToCart, 
    partsCart, 
    removePartFromCart, 
    placePartsOrder, 
    raiseClaim,
  } = useTech();

  // Read URL query parameter for active tab, defaulting to 'inventory'
  const queryParams = new URLSearchParams(location.search);
  const urlTab = queryParams.get('tab');
  
  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory', 'order', 'claims'
  const [actionError, setActionError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState('All'); // 'All', 'In Stock', 'Low Stock', 'Out of Stock'
  const [claimFilter, setClaimFilter] = useState('Pending'); // 'Pending', 'Approved', 'Rejected'
  const [selectedPendingPart, setSelectedPendingPart] = useState(null);
  
  const [orderSource, setOrderSource] = useState('warehouse'); // 'warehouse', 'brand', 'store'
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [newClaim, setNewClaim] = useState({ brand: 'LG Partner Warranty', item: '', amount: '' });
  const [addedPartCard, setAddedPartCard] = useState(null);
  const [placedSource, setPlacedSource] = useState(null);
  const [raisedClaimCard, setRaisedClaimCard] = useState(null);

  // Sync tab with URL
  useEffect(() => {
    if (urlTab === 'claims') {
      setActiveTab('claims');
    } else if (urlTab === 'inventory') {
      setActiveTab('inventory');
    } else if (urlTab === 'order') {
      setActiveTab('order');
    }
  }, [urlTab]);

  const { unreadCount: unreadNotificationsCount } = useNotifications();

  // Screen 9: Filter inventory items
  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.sku.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;
    
    if (stockFilter === 'In Stock' && item.qty <= 1) return false;
    if (stockFilter === 'Low Stock' && item.qty !== 1) return false;
    if (stockFilter === 'Out of Stock' && item.qty > 0) return false;
    
    return true;
  });

  // Counts for pills
  const inStockCount = inventory.filter(i => i.qty > 1).length;
  const lowStockCount = inventory.filter(i => i.qty === 1).length;
  const outOfStockCount = inventory.filter(i => i.qty === 0).length;

  // Screen 11: Filter FOC claims
  const filteredClaims = claims.filter(claim => {
    if (claimFilter === 'Pending' && claim.status !== 'Pending Approval' && claim.status !== 'Pending') return false;
    if (claimFilter === 'Approved' && claim.status !== 'Approved') return false;
    if (claimFilter === 'Rejected' && claim.status !== 'Rejected') return false;
    return true;
  });

  const pendingClaimsCount = claims.filter(c => c.status === 'Pending Approval' || c.status === 'Pending').length;

  // Helper to categorize part icon
  const getPartIcon = (name = '', sku = '') => {
    const n = (name + ' ' + sku).toLowerCase();
    if (n.includes('gas') || n.includes('canister') || n.includes('refrigerant')) {
      return { icon: <Flame className="w-5 h-5 text-amber-600" />, bg: 'bg-amber-50 border-amber-200/70', tag: 'Gas / AC' };
    }
    if (n.includes('sensor') || n.includes('defrost') || n.includes('thermostat')) {
      return { icon: <Wind className="w-5 h-5 text-cyan-600" />, bg: 'bg-cyan-50 border-cyan-200/70', tag: 'Sensor' };
    }
    if (n.includes('pcb') || n.includes('board') || n.includes('circuit') || n.includes('inverter')) {
      return { icon: <Cpu className="w-5 h-5 text-indigo-600" />, bg: 'bg-indigo-50 border-indigo-200/70', tag: 'PCB & Electrical' };
    }
    if (n.includes('ro') || n.includes('membrane') || n.includes('filter') || n.includes('pump') || n.includes('water')) {
      return { icon: <Droplets className="w-5 h-5 text-blue-600" />, bg: 'bg-blue-50 border-blue-200/70', tag: 'RO / Plumbing' };
    }
    if (n.includes('pipe') || n.includes('copper') || n.includes('coil') || n.includes('wire')) {
      return { icon: <Layers className="w-5 h-5 text-orange-600" />, bg: 'bg-orange-50 border-orange-200/70', tag: 'Piping' };
    }
    if (n.includes('motor') || n.includes('fan') || n.includes('drain') || n.includes('valve')) {
      return { icon: <Wrench className="w-5 h-5 text-purple-600" />, bg: 'bg-purple-50 border-purple-200/70', tag: 'Mechanical' };
    }
    return { icon: <Package className="w-5 h-5 text-slate-600" />, bg: 'bg-slate-50 border-slate-200/70', tag: 'General Spare' };
  };

  const getStockBadge = (qty) => {
    if (qty === 0) return {
      dot: 'bg-red-500',
      style: 'bg-red-50 text-red-700 border-red-200',
      label: 'Out of Stock'
    };
    if (qty === 1) return {
      dot: 'bg-amber-500 animate-pulse',
      style: 'bg-amber-50 text-amber-700 border-amber-200',
      label: 'Low Stock'
    };
    return {
      dot: 'bg-emerald-500',
      style: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      label: 'In Stock'
    };
  };

  const calculateCartTotal = () => {
    return partsCart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  };

  const handlePlaceOrder = async () => {
    if (partsCart.length === 0) {
      setActionError('Cart is empty — add items from inventory first.');
      return;
    }
    const sourceLabel = orderSource === 'warehouse' ? 'NCC Warehouse' : orderSource === 'brand' ? 'Partner Brand' : 'Nearby Store';

    setActionError('');
    setSubmitting(true);
    const result = await placePartsOrder(sourceLabel);
    setSubmitting(false);

    if (!result?.ok) {
      setActionError(result?.error || 'Could not place the parts order.');
      return;
    }
    setPlacedSource(sourceLabel);
  };

  const handleCreateClaim = async (e) => {
    e.preventDefault();
    if (!newClaim.item || !newClaim.amount) {
      setActionError('Please fill all fields.');
      return;
    }

    setActionError('');
    setSubmitting(true);
    const result = await raiseClaim(newClaim);
    setSubmitting(false);

    if (!result?.ok) {
      setActionError(result?.error || 'Could not raise the claim.');
      return;
    }
    setNewClaim({ brand: 'LG Partner Warranty', item: '', amount: '' });
    setShowClaimModal(false);
  };

  return (
    <div className="min-h-screen bg-[#F4F7FC] flex flex-col pb-28 relative font-sans text-left">
      
      {/* Selected Pending Part Detail Drawer View */}
      {selectedPendingPart ? (
        <div className="flex-1 flex flex-col">
          <div className="bg-[#052355] text-white pt-5 pb-8 px-5 flex items-center justify-between sticky top-0 z-20 shadow-md rounded-b-[2rem]">
            <button 
              type="button"
              onClick={() => setSelectedPendingPart(null)}
              className="p-1.5 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
            >
              <ChevronLeft className="h-6 w-6 text-white stroke-[2.5]" />
            </button>
            <h1 className="text-base font-extrabold text-white flex-1 text-center pr-8 tracking-wide">Pending Part Tracking</h1>
          </div>

          <div className="flex-1 p-4 -mt-4 flex flex-col gap-4 w-full">
            <div className="bg-white border border-slate-150 rounded-3xl p-5 flex flex-col gap-4 shadow-sm text-left">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Part Details</span>
                <span className="bg-amber-50 text-amber-800 text-[10px] font-extrabold px-2.5 py-1 rounded-full border border-amber-200 uppercase tracking-wider">
                  Pending Approval
                </span>
              </div>
              
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 flex-shrink-0">
                  <ClipboardList className="w-7 h-7" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-extrabold text-[#052355] truncate">{selectedPendingPart.item}</h3>
                  <p className="text-[11px] text-slate-500 font-semibold mt-0.5">Part No: {selectedPendingPart.claimId}</p>
                  <p className="text-[11px] text-[#0D47A1] font-bold mt-0.5">Brand: {selectedPendingPart.brand}</p>
                </div>
              </div>

              <div className="h-[1px] bg-slate-100 my-1"></div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Requested On</span>
                  <span className="text-slate-800 font-bold">{selectedPendingPart.date === 'Just now' ? 'Today' : selectedPendingPart.date}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Estimated Arrival</span>
                  <span className="text-emerald-700 font-bold">24-48 Hours</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Claim Amount</span>
                  <span className="text-lg font-black text-[#052355]">₹{selectedPendingPart.amount}</span>
                </div>
              </div>
            </div>

            <button 
              type="button"
              onClick={() => {
                setSelectedPendingPart(null);
                setActiveTab('inventory');
              }}
              className="w-full py-4 bg-[#052355] hover:bg-[#0a2c66] text-white font-extrabold text-sm rounded-2xl cursor-pointer text-center transition-all shadow-md mt-auto"
            >
              Back to Inventory List
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Header Section */}
          <div className="bg-gradient-to-b from-[#052355] to-[#0A337A] text-white pt-5 pb-7 px-4 shadow-md rounded-b-[2.2rem] sticky top-0 z-20">
            <div className="flex items-center justify-between">
              <button 
                type="button"
                onClick={() => navigate('/technician/dashboard')} 
                className="p-1.5 hover:bg-white/10 rounded-full text-white transition-colors cursor-pointer"
              >
                <ChevronLeft className="h-6 w-6 text-white stroke-[2.5]" />
              </button>
              <div className="text-center flex-1 pr-2">
                <h1 className="text-base font-extrabold text-white tracking-wide">Parts & Inventory</h1>
                <span className="text-[11px] text-white/80 font-normal">NCC Technician Service Hub</span>
              </div>
              <button 
                onClick={() => navigate('/technician/notifications')}
                className="p-2 hover:bg-white/10 rounded-full transition-colors relative"
              >
                <Bell className="h-5 w-5 text-white" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-[#052355]"></span>
                )}
              </button>
            </div>

            {/* Quick KPI Overview */}
            <div className="grid grid-cols-3 gap-2 mt-4 pt-1">
              <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-2.5 text-center border border-white/15">
                <span className="text-[10px] font-bold text-white/70 uppercase tracking-wider block">Total SKUs</span>
                <span className="text-base font-black text-white">{inventory.length}</span>
              </div>
              <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-2.5 text-center border border-white/15">
                <span className="text-[10px] font-bold text-white/70 uppercase tracking-wider block">In Stock</span>
                <span className="text-base font-black text-emerald-300">{inStockCount + lowStockCount}</span>
              </div>
              <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-2.5 text-center border border-white/15">
                <span className="text-[10px] font-bold text-white/70 uppercase tracking-wider block">In Cart</span>
                <span className="text-base font-black text-amber-300">{partsCart.length}</span>
              </div>
            </div>
          </div>

          {/* Segmented Tab Navigation */}
          <div className="px-3.5 -mt-3.5 relative z-30">
            <div className="bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200/80 flex items-center justify-between gap-1.5">
              <button
                onClick={() => setActiveTab('inventory')}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'inventory' 
                    ? 'bg-[#052355] text-white shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                <span>Inventory</span>
              </button>
              <button
                onClick={() => setActiveTab('order')}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 relative ${
                  activeTab === 'order' 
                    ? 'bg-[#052355] text-white shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>Order</span>
                {partsCart.length > 0 && (
                  <span className={`w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center ${
                    activeTab === 'order' ? 'bg-amber-400 text-slate-900' : 'bg-red-500 text-white'
                  }`}>
                    {partsCart.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('claims')}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 relative ${
                  activeTab === 'claims' 
                    ? 'bg-[#052355] text-white shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>FOC Claims</span>
                {pendingClaimsCount > 0 && (
                  <span className={`w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center ${
                    activeTab === 'claims' ? 'bg-amber-400 text-slate-900' : 'bg-amber-500 text-white'
                  }`}>
                    {pendingClaimsCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 px-3.5 pt-3.5 flex flex-col gap-3.5">
            
            {/* VIEW 1: INVENTORY */}
            {activeTab === 'inventory' && (
              <div className="flex flex-col gap-3.5">
                
                {/* Search Bar */}
                <div className="relative">
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search parts by name, category or SKU..."
                    className="w-full bg-white border border-slate-200/90 rounded-2xl pl-10 pr-10 py-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#0D47A1]/20 focus:border-[#0D47A1] shadow-2xs placeholder:text-slate-400"
                  />
                  <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-3 p-0.5 hover:bg-slate-100 rounded-full text-slate-400"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Stock Filter Pills with Live Counts */}
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                  {[
                    { id: 'All', label: 'All', count: inventory.length },
                    { id: 'In Stock', label: 'In Stock', count: inStockCount },
                    { id: 'Low Stock', label: 'Low Stock', count: lowStockCount },
                    { id: 'Out of Stock', label: 'Out of Stock', count: outOfStockCount }
                  ].map((pill) => (
                    <button
                      key={pill.id}
                      onClick={() => setStockFilter(pill.id)}
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                        stockFilter === pill.id
                          ? 'bg-[#052355] text-white border-[#052355] shadow-xs'
                          : 'bg-white border-slate-200/90 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <span>{pill.label}</span>
                      <span className={`text-[9.5px] px-1.5 py-0.2 rounded-md font-bold ${
                        stockFilter === pill.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {pill.count}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Inventory List */}
                <div className="flex flex-col gap-2.5">
                  {filteredInventory.length > 0 ? (
                    filteredInventory.map(item => {
                      const iconData = getPartIcon(item.name, item.sku);
                      const stockInfo = getStockBadge(item.qty);
                      const inCartItem = partsCart.find(p => p.id === item.id);

                      return (
                        <div 
                          key={item.id} 
                          className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-4 shadow-2xs flex items-center justify-between gap-3 hover:shadow-sm transition-all"
                        >
                          {/* Left: Category Icon Container */}
                          <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center flex-shrink-0 ${iconData.bg}`}>
                            {iconData.icon}
                          </div>

                          {/* Center: Details */}
                          <div className="flex-1 min-w-0 flex flex-col gap-1 text-left">
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider bg-slate-100 px-1.5 py-0.5 rounded-md">
                                {iconData.tag}
                              </span>
                            </div>

                            <h4 className="text-xs sm:text-sm font-extrabold text-[#052355] truncate leading-tight">
                              {item.name}
                            </h4>

                            <div className="flex items-center gap-2 text-[10.5px]">
                              <span className="text-slate-500 font-medium">SKU: <b className="text-slate-700 font-bold">{item.sku}</b></span>
                            </div>

                            {/* Stock Badge with Status Dot */}
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className={`inline-flex items-center gap-1.5 text-[9.5px] font-extrabold px-2 py-0.5 rounded-full border ${stockInfo.style}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${stockInfo.dot}`}></span>
                                {stockInfo.label} • {item.qty} units
                              </span>
                            </div>
                          </div>

                          {/* Right: Price & Add Button */}
                          <div className="flex flex-col items-end justify-between gap-2 shrink-0">
                            <span className="text-sm sm:text-base font-black text-[#16A34A]">
                              ₹{item.price.toLocaleString('en-IN')}
                            </span>

                            {item.qty === 0 ? (
                              <button
                                disabled
                                className="px-2.5 py-1.5 bg-slate-100 text-slate-400 text-[10px] font-bold rounded-xl cursor-not-allowed border border-slate-200"
                              >
                                Unavailable
                              </button>
                            ) : inCartItem ? (
                              <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-xl p-1">
                                <span className="text-[10px] font-black text-emerald-800 px-1.5">
                                  {inCartItem.qty} in cart
                                </span>
                                <button
                                  onClick={() => addPartToCart(item)}
                                  className="w-6 h-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center justify-center font-bold cursor-pointer transition-colors shadow-2xs"
                                >
                                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  addPartToCart(item);
                                  setAddedPartCard(item);
                                }}
                                className="flex items-center gap-1 bg-[#052355] hover:bg-[#0D47A1] text-white px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all shadow-xs cursor-pointer active:scale-95"
                              >
                                <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                                <span>Add</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-slate-200 p-6 text-slate-500 flex flex-col items-center gap-2">
                      <Package className="h-10 w-10 text-slate-300 stroke-[1.5]" />
                      <p className="text-sm font-bold text-slate-700">No matching parts found</p>
                      <p className="text-xs text-slate-400 max-w-xs">Try adjusting your search terms or filter selection.</p>
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* VIEW 2: ORDER SPARE PARTS */}
            {activeTab === 'order' && (
              <div className="flex flex-col gap-3.5">
                
                {/* Supply Source Selection */}
                <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs flex flex-col gap-3">
                  <div>
                    <span className="text-[10px] font-black tracking-wider text-slate-400 uppercase">Select Source</span>
                    <h3 className="text-sm font-extrabold text-[#052355] mt-0.5">Supply Fulfilment Channel</h3>
                  </div>
                  
                  <div className="flex flex-col gap-2.5">
                    {/* Source 1 */}
                    <label className={`p-3.5 rounded-2xl border-2 flex items-start gap-3 cursor-pointer transition-all ${
                      orderSource === 'warehouse' ? 'border-[#0D47A1] bg-blue-50/20 shadow-2xs' : 'border-slate-200/80 bg-white hover:border-slate-300'
                    }`}>
                      <input 
                        type="radio" 
                        name="source" 
                        checked={orderSource === 'warehouse'} 
                        onChange={() => setOrderSource('warehouse')}
                        className="mt-1 accent-[#0D47A1] h-4 w-4"
                      />
                      <div className="flex-1">
                        <div className="flex justify-between items-center">
                          <h4 className="text-xs font-bold text-[#052355]">NCC Central Warehouse</h4>
                          <span className="text-[9px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md">24-48 hrs</span>
                        </div>
                        <p className="text-[10px] text-slate-500 font-medium mt-0.5">Gurugram, Haryana • Standard dispatched stock</p>
                      </div>
                    </label>

                    {/* Source 2 */}
                    <label className={`p-3.5 rounded-2xl border-2 flex items-start gap-3 cursor-pointer transition-all ${
                      orderSource === 'brand' ? 'border-[#0D47A1] bg-blue-50/20 shadow-2xs' : 'border-slate-200/80 bg-white hover:border-slate-300'
                    }`}>
                      <input 
                        type="radio" 
                        name="source" 
                        checked={orderSource === 'brand'} 
                        onChange={() => setOrderSource('brand')}
                        className="mt-1 accent-[#0D47A1] h-4 w-4"
                      />
                      <div className="flex-1">
                        <div className="flex justify-between items-center">
                          <h4 className="text-xs font-bold text-[#052355]">Partner Brand Official Hub</h4>
                          <span className="text-[9px] font-bold text-blue-800 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded-md">Same Day</span>
                        </div>
                        <p className="text-[10px] text-slate-500 font-medium mt-0.5">Direct OEM Authorized Spare Inventory</p>
                      </div>
                    </label>

                    {/* Source 3 */}
                    <label className={`p-3.5 rounded-2xl border-2 flex items-start gap-3 cursor-pointer transition-all ${
                      orderSource === 'store' ? 'border-[#0D47A1] bg-blue-50/20 shadow-2xs' : 'border-slate-200/80 bg-white hover:border-slate-300'
                    }`}>
                      <input 
                        type="radio" 
                        name="source" 
                        checked={orderSource === 'store'} 
                        onChange={() => setOrderSource('store')}
                        className="mt-1 accent-[#0D47A1] h-4 w-4"
                      />
                      <div className="flex-1">
                        <div className="flex justify-between items-center">
                          <h4 className="text-xs font-bold text-[#052355]">Nearby Local Vendor Store</h4>
                          <span className="text-[9px] font-bold text-purple-800 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded-md">&lt; 10 km</span>
                        </div>
                        <p className="text-[10px] text-slate-500 font-medium mt-0.5">Immediate pickup from verified distributors</p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Cart Summary */}
                <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs flex flex-col gap-3.5">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-[10px] font-black tracking-wider text-slate-400 uppercase">Cart Items</span>
                      <h3 className="text-sm font-extrabold text-[#052355] mt-0.5">Order Items Summary</h3>
                    </div>
                    {partsCart.length > 0 && (
                      <span className="text-[10px] font-bold bg-blue-50 text-[#0D47A1] border border-blue-200 px-2 py-0.5 rounded-full">
                        {partsCart.length} {partsCart.length === 1 ? 'item' : 'items'}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex flex-col gap-2.5">
                    {partsCart.length > 0 ? (
                      partsCart.map(item => (
                        <div key={item.id} className="flex justify-between items-center text-xs border border-slate-100 rounded-2xl p-3 bg-slate-50/50">
                          <div>
                            <h5 className="font-extrabold text-[#052355]">{item.name}</h5>
                            <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Qty: {item.qty} • ₹{item.price.toLocaleString('en-IN')} each</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-black text-[#16A34A] text-sm">₹{(item.price * item.qty).toLocaleString('en-IN')}</span>
                            <button 
                              onClick={() => removePartFromCart(item.id)}
                              className="p-1.5 hover:bg-red-50 text-red-500 rounded-xl transition-colors cursor-pointer"
                              title="Remove item"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-slate-500 text-xs font-medium flex flex-col items-center gap-2">
                        <ShoppingCart className="w-8 h-8 text-slate-300" />
                        <span>Your parts cart is currently empty.</span>
                        <button 
                          onClick={() => setActiveTab('inventory')}
                          className="mt-1 text-xs font-bold text-[#0D47A1] hover:underline"
                        >
                          Browse Inventory →
                        </button>
                      </div>
                    )}
                  </div>

                  {partsCart.length > 0 && (
                    <div className="border-t border-slate-150 pt-3 flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-600">Total Order Amount</span>
                      <span className="text-xl font-black text-[#052355]">₹{calculateCartTotal().toLocaleString('en-IN')}</span>
                    </div>
                  )}
                </div>

                {actionError && (
                  <p className="text-[11px] font-bold text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{actionError}</p>
                )}

                {partsCart.length > 0 && (
                  <button 
                    onClick={handlePlaceOrder}
                    disabled={submitting}
                    className="w-full bg-[#16A34A] hover:bg-[#15803D] disabled:opacity-60 text-white font-extrabold py-4 rounded-2xl text-base transition-all shadow-md mt-1 cursor-pointer active:scale-[0.99]"
                  >
                    {submitting ? 'Placing order…' : `Place Parts Order (₹${calculateCartTotal().toLocaleString('en-IN')})`}
                  </button>
                )}

              </div>
            )}

            {/* VIEW 3: FOC CLAIMS */}
            {activeTab === 'claims' && (
              <div className="flex flex-col gap-3.5">
                
                {/* Claim Filters Pending/Approved/Rejected */}
                <div className="flex bg-slate-200/60 p-1.5 rounded-2xl gap-1.5">
                  {['Pending', 'Approved', 'Rejected'].map((status) => (
                    <button
                      key={status}
                      onClick={() => setClaimFilter(status)}
                      className={`flex-1 text-center py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                        claimFilter === status
                          ? 'bg-white text-[#052355] shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>

                {/* Claim list */}
                <div className="flex flex-col gap-2.5">
                  {filteredClaims.length > 0 ? (
                    filteredClaims.map(claim => (
                      <div 
                        key={claim.id} 
                        onClick={() => {
                          if (claim.status === 'Pending Approval' || claim.status === 'Pending') {
                            setSelectedPendingPart(claim);
                          }
                        }}
                        className={`bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs flex justify-between items-start hover:shadow-sm transition-all ${
                          claim.status === 'Pending Approval' || claim.status === 'Pending' ? 'cursor-pointer hover:border-blue-200' : ''
                        }`}
                      >
                        <div className="flex-1 min-w-0 text-left pr-2">
                          <span className="text-[9.5px] font-extrabold text-[#0D47A1] bg-blue-50 border border-blue-150 px-2 py-0.5 rounded-md uppercase tracking-wider mb-1.5 inline-block truncate max-w-full">
                            {claim.brand}
                          </span>
                          <h4 className="text-xs sm:text-sm font-extrabold text-[#052355] truncate">
                            {claim.item}
                          </h4>
                          <p className="text-[10px] text-slate-500 font-semibold mt-1">
                            Claim #{claim.claimId} • Date: {claim.date}
                          </p>
                        </div>
                        
                        <div className="flex flex-col items-end justify-between shrink-0 gap-2">
                          <span className="text-sm sm:text-base font-black text-[#052355]">₹{claim.amount}</span>
                          <span className={`text-[9.5px] font-black px-2.5 py-0.5 rounded-full uppercase border ${
                            claim.status === 'Pending Approval' || claim.status === 'Pending'
                              ? 'border-amber-300 text-amber-800 bg-amber-50'
                              : claim.status === 'Approved'
                                ? 'border-emerald-300 text-emerald-800 bg-emerald-50'
                                : 'border-red-300 text-red-800 bg-red-50'
                          }`}>
                            {claim.status === 'Pending Approval' || claim.status === 'Pending' ? 'PENDING' : claim.status}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-slate-200 p-6 text-slate-500 flex flex-col items-center gap-2">
                      <ShieldCheck className="h-10 w-10 text-slate-300 stroke-[1.5]" />
                      <p className="text-sm font-bold text-slate-700">No {claimFilter.toLowerCase()} claims found</p>
                      <p className="text-xs text-slate-400">Claims submitted to brands will be tracked here.</p>
                    </div>
                  )}
                </div>

                <button 
                  onClick={() => setShowClaimModal(true)}
                  className="w-full bg-[#052355] hover:bg-[#0D47A1] text-white font-extrabold py-4 rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md mt-1 cursor-pointer active:scale-[0.99]"
                >
                  <PlusCircle className="h-4.5 w-4.5" />
                  <span>Raise New FOC Claim</span>
                </button>

              </div>
            )}

          </div>

          {/* Sticky Floating Bottom Cart Bar when items exist in Cart and on Inventory Tab */}
          {activeTab === 'inventory' && partsCart.length > 0 && (
            <div className="fixed bottom-18 left-0 right-0 max-w-md mx-auto px-4 z-40 animate-fade-in">
              <div className="bg-[#052355] text-white p-3.5 rounded-2xl shadow-xl flex items-center justify-between border border-blue-400/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/40 flex items-center justify-center text-amber-300">
                    <ShoppingCart className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-black block text-white">{partsCart.length} {partsCart.length === 1 ? 'Item' : 'Items'} in Cart</span>
                    <span className="text-xs text-emerald-400 font-black">₹{calculateCartTotal().toLocaleString('en-IN')}</span>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('order')}
                  className="bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-black px-4 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <span>Review Order</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

        </>
      )}

      {/* Claim Modal Form Popup */}
      {showClaimModal && (
        <div className="fixed inset-0 bg-[#052355]/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl relative border border-slate-200 flex flex-col gap-4 text-left">
            <button 
              onClick={() => setShowClaimModal(false)}
              className="p-1.5 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors absolute top-4 right-4 text-slate-500 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Warranty Claim</span>
              <h3 className="text-base font-black text-[#052355] mt-0.5">Raise New FOC Claim</h3>
            </div>
            
            <form onSubmit={handleCreateClaim} className="flex flex-col gap-3.5">
              {actionError && (
                <p className="text-[11px] font-bold text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{actionError}</p>
              )}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-slate-600">Brand Partner</label>
                <select 
                  value={newClaim.brand}
                  onChange={(e) => setNewClaim({ ...newClaim, brand: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold text-[#052355] focus:outline-none focus:border-[#0D47A1]"
                >
                  <option>LG Partner Warranty</option>
                  <option>Samsung Warranty</option>
                  <option>Voltas Warranty</option>
                  <option>NCC EW Claim</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-slate-600">Spare Item Name</label>
                <input 
                  type="text" 
                  value={newClaim.item}
                  onChange={(e) => setNewClaim({ ...newClaim, item: e.target.value })}
                  placeholder="e.g. Compressor Coil, Washing Machine Motor"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold text-[#052355] focus:outline-none focus:border-[#0D47A1]"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-slate-600">Claim Amount (₹)</label>
                <input 
                  type="number" 
                  value={newClaim.amount}
                  onChange={(e) => setNewClaim({ ...newClaim, amount: e.target.value })}
                  placeholder="e.g. 1850"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold text-[#052355] focus:outline-none focus:border-[#0D47A1]"
                  required
                />
              </div>

              <button 
                type="submit"
                disabled={submitting}
                className="w-full bg-[#052355] hover:bg-[#0a2c66] text-white font-extrabold py-3.5 rounded-2xl text-xs transition-all shadow-md mt-2 cursor-pointer"
              >
                {submitting ? 'Submitting…' : 'Submit FOC Claim'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Added to Cart Success Toast Modal */}
      {addedPartCard && (
        <div className="fixed inset-0 bg-[#052355]/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 transition-all">
          <div className="bg-white rounded-3xl p-5 shadow-2xl border border-slate-200 max-w-sm w-full text-center flex flex-col gap-4 relative">
            <div className="w-14 h-14 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-center mx-auto text-emerald-600">
              <Check className="h-7 w-7 stroke-[3]" />
            </div>

            <div>
              <h3 className="text-base font-black text-[#052355]">Added to Cart</h3>
              <p className="text-xs text-slate-500 font-medium mt-1">
                <b>{addedPartCard.name}</b> was added to your spare parts order.
              </p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/60 text-left flex flex-col gap-1 text-xs">
              <div className="flex justify-between items-center font-bold text-[#052355]">
                <span>{addedPartCard.name}</span>
                <span className="text-[#16A34A]">₹{addedPartCard.price.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between items-center text-[10.5px] text-slate-500 font-medium">
                <span>SKU: {addedPartCard.sku}</span>
                <span>Stock: {addedPartCard.qty} available</span>
              </div>
            </div>

            <div className="flex gap-2.5 mt-1">
              <button
                onClick={() => setAddedPartCard(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-4 rounded-xl text-xs transition-all cursor-pointer"
              >
                Keep Browsing
              </button>
              <button
                onClick={() => {
                  setAddedPartCard(null);
                  setActiveTab('order');
                }}
                className="flex-1 bg-[#052355] hover:bg-[#0D47A1] text-white font-extrabold py-3 px-4 rounded-xl text-xs transition-all shadow-xs cursor-pointer"
              >
                Go to Cart
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Placed Order Success Modal */}
      {placedSource && (
        <div className="fixed inset-0 bg-[#052355]/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 transition-all">
          <div className="bg-white rounded-3xl p-5 shadow-2xl border border-slate-200 max-w-sm w-full text-center flex flex-col gap-4 relative">
            <div className="w-14 h-14 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-center mx-auto text-emerald-600">
              <Check className="h-7 w-7 stroke-[3]" />
            </div>

            <div>
              <h3 className="text-base font-black text-[#052355]">Order Placed Successfully</h3>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Your spare parts dispatch request has been submitted.
              </p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/60 text-left flex flex-col gap-1 text-xs">
              <div className="flex justify-between items-center font-bold text-[#052355]">
                <span>Supply Channel</span>
                <span className="text-[#0D47A1]">{placedSource}</span>
              </div>
              <div className="flex justify-between items-center text-[10.5px] text-slate-500 font-medium">
                <span>Status</span>
                <span className="text-emerald-700 font-bold">Dispatched for delivery</span>
              </div>
            </div>

            <div className="flex flex-col gap-2 mt-1">
              <button
                onClick={() => {
                  setPlacedSource(null);
                  setActiveTab('claims');
                }}
                className="w-full bg-[#052355] hover:bg-[#0D47A1] text-white font-extrabold py-3.5 rounded-xl text-xs transition-all shadow-xs cursor-pointer"
              >
                View Claims Tracker
              </button>
              <button
                onClick={() => {
                  setPlacedSource(null);
                  setActiveTab('inventory');
                }}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl text-xs transition-all cursor-pointer"
              >
                Back to Inventory
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <TechBottomNav activeTab={activeTab === 'claims' ? 'requests' : 'inventory'} />

    </div>
  );
};

export default RaisePartRequest;
