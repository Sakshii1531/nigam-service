import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Bell, Briefcase, ClipboardList, Calendar, Wrench, User, Search, PlusCircle, 
  MapPin, Check, Plus, AlertTriangle, ShieldCheck, ChevronRight, X 
} from 'lucide-react';
import { useTech } from '../../context/TechContext';

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
    notifications 
  } = useTech();

  // Read URL query parameter for active tab, defaulting to 'inventory'
  const queryParams = new URLSearchParams(location.search);
  const urlTab = queryParams.get('tab');
  
  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory', 'order', 'claims'
  const [searchQuery, setSearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState('All'); // 'All', 'In Stock', 'Low Stock', 'Out of Stock'
  const [claimFilter, setClaimFilter] = useState('Pending'); // 'Pending', 'Approved', 'Rejected'
  
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

  const unreadNotificationsCount = notifications.filter(n => !n.read).length;

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

  // Screen 11: Filter FOC claims
  const filteredClaims = claims.filter(claim => {
    if (claimFilter === 'Pending' && claim.status !== 'Pending Approval') return false;
    if (claimFilter === 'Approved' && claim.status !== 'Approved') return false;
    if (claimFilter === 'Rejected' && claim.status !== 'Rejected') return false;
    return true;
  });

  // Stock status styling (Screen 9)
  const getStockBadge = (qty) => {
    if (qty === 0) return 'bg-red-50 text-red-700 border-red-150';
    if (qty === 1) return 'bg-amber-50 text-amber-700 border-amber-150';
    return 'bg-green-50 text-green-700 border-green-150';
  };

  const getStockLabel = (qty) => {
    if (qty === 0) return 'Out of Stock';
    if (qty === 1) return 'Low Stock';
    return 'In Stock';
  };

  // FOC Status badge (Screen 11)
  const getClaimBadge = (status) => {
    switch (status) {
      case 'Approved': return 'bg-green-50 text-green-700 border-green-150';
      case 'Rejected': return 'bg-red-50 text-red-700 border-red-150';
      default: return 'bg-amber-50 text-amber-700 border-amber-150';
    }
  };

  const handlePlaceOrder = () => {
    if (partsCart.length === 0) {
      alert('Cart is empty! Add items from inventory first.');
      return;
    }
    const sourceLabel = orderSource === 'warehouse' ? 'NCC Warehouse' : orderSource === 'brand' ? 'Partner Brand' : 'Nearby Store';
    placePartsOrder(sourceLabel);
    setPlacedSource(sourceLabel);
  };

  const handleCreateClaim = (e) => {
    e.preventDefault();
    if (!newClaim.item || !newClaim.amount) {
      alert('Please fill all fields.');
      return;
    }
    raiseClaim(newClaim);
    setNewClaim({ brand: 'LG Partner Warranty', item: '', amount: '' });
    setShowClaimModal(false);
  };

  const calculateCartTotal = () => {
    return partsCart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  };

  return (
    <div className="min-h-screen bg-[#F5F8FC] flex flex-col pb-24 max-w-md mx-auto border-x border-slate-200 shadow-xl relative font-sans">
      
      {/* Header */}
      <div className="bg-white border-b border-slate-200 p-4 flex items-center justify-between sticky top-0 z-10">
        <h1 className="text-lg font-normal text-[#052355]">Parts & Claims</h1>
        <button 
          onClick={() => navigate('/technician/notifications')}
          className="p-2.5 hover:bg-slate-50 rounded-full transition-colors relative"
        >
          <Bell className="h-5 w-5 text-[#052355]" />
          {unreadNotificationsCount > 0 && (
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full"></span>
          )}
        </button>
      </div>

      {/* Navigation Tabs (Merges Screen 9, 10, 11) */}
      <div className="bg-white px-3.5 py-2 border-b border-slate-200 flex gap-5 justify-start items-center">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`text-center py-2 px-3.5 rounded-full text-xs font-normal transition-all ${
            activeTab === 'inventory' ? 'bg-[#E3ECF9] text-[#0D47A1]' : 'text-slate-600 hover:text-slate-600'
          }`}
        >
          Inventory
        </button>
        <button
          onClick={() => setActiveTab('order')}
          className={`text-center py-2 px-3.5 rounded-full text-xs font-normal transition-all relative ${
            activeTab === 'order' ? 'bg-[#E3ECF9] text-[#0D47A1]' : 'text-slate-600 hover:text-slate-600'
          }`}
        >
          Order Parts
          {partsCart.length > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] text-white font-normal flex items-center justify-center">
              {partsCart.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('claims')}
          className={`text-center py-2 px-3.5 rounded-full text-xs font-normal transition-all ${
            activeTab === 'claims' ? 'bg-[#E3ECF9] text-[#0D47A1]' : 'text-slate-600 hover:text-slate-600'
          }`}
        >
          FOC Claims
        </button>
      </div>

      {/* Main Views Container */}
      <div className="flex-1 p-3.5 flex flex-col gap-4">
        
        {/* VIEW 1: INVENTORY (Screen 9) */}
        {activeTab === 'inventory' && (
          <div className="flex flex-col gap-4">
            
            {/* Search Input */}
            <div className="relative">
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search parts by name or SKU..."
                className="w-full bg-white border border-slate-200 rounded-2xl pl-11 pr-4 py-3.5 text-xs font-normal focus:outline-none focus:border-[#0D47A1] shadow-sm"
              />
              <Search className="absolute left-4 top-4 h-4.5 w-4.5 text-slate-600" />
            </div>

            {/* In-Stock filters pills */}
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1">
              {['All', 'In Stock', 'Low Stock', 'Out of Stock'].map((pill) => (
                <button
                  key={pill}
                  onClick={() => setStockFilter(pill)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-normal border whitespace-nowrap transition-all ${
                    stockFilter === pill
                      ? 'bg-[#052355] text-white border-[#052355]'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {pill}
                </button>
              ))}
            </div>

            {/* Inventory List */}
            <div className="flex flex-col gap-3.5">
              {filteredInventory.length > 0 ? (
                filteredInventory.map(item => (
                  <div key={item.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 flex justify-between items-center hover:shadow-sm transition-shadow">
                    <div>
                      <h4 className="text-xs font-medium text-[#052355]">{item.name}</h4>
                      <p className="text-[10px] text-slate-600 font-normal mt-0.5">SKU: {item.sku} • Price: ₹{item.price}</p>
                      
                      <div className="flex items-center gap-1.5 mt-2">
                        <span className={`text-[9px] font-normal px-2 py-0.5 rounded-md border uppercase ${getStockBadge(item.qty)}`}>
                          {getStockLabel(item.qty)}
                        </span>
                        <span className="text-[10px] font-normal text-slate-500">Qty: {item.qty}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        addPartToCart(item);
                        setAddedPartCard(item);
                      }}
                      className="p-3 bg-blue-50 text-[#0D47A1] hover:bg-blue-100 rounded-2xl transition-all shadow-sm"
                    >
                      <Plus className="h-5 w-5 stroke-[2.5]" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 bg-white rounded-3xl border border-dashed border-slate-200 p-4 text-slate-600">
                  <AlertTriangle className="h-10 w-10 mx-auto text-slate-500 mb-2" />
                  <p className="text-sm font-normal">No inventory parts found.</p>
                </div>
              )}
            </div>

          </div>
        )}

        {/* VIEW 2: ORDER SPARE PARTS (Screen 10) */}
        {activeTab === 'order' && (
          <div className="flex flex-col gap-4">
            
            {/* Supply Source Selection */}
            <div className="bg-white rounded-3xl p-3.5 border border-slate-200 shadow-sm flex flex-col gap-3">
              <span className="text-[10px] font-medium tracking-wider text-slate-600 uppercase">Select Source</span>
              
              <div className="flex flex-col gap-3">
                {/* Source 1 */}
                <label className={`p-4 rounded-2xl border flex items-start gap-3 cursor-pointer transition-all ${
                  orderSource === 'warehouse' ? 'border-[#0D47A1] bg-[#E3ECF9]/10' : 'border-slate-200 hover:bg-slate-50/50'
                }`}>
                  <input 
                    type="radio" 
                    name="source" 
                    checked={orderSource === 'warehouse'} 
                    onChange={() => setOrderSource('warehouse')}
                    className="mt-1 accent-[#0D47A1]"
                  />
                  <div>
                    <h4 className="text-xs font-normal text-[#052355]">NCC Warehouse</h4>
                    <p className="text-[10px] text-slate-600 font-normal mt-0.5">Gurugram, Haryana • Delivery in 24-48 hrs</p>
                  </div>
                </label>

                {/* Source 2 */}
                <label className={`p-4 rounded-2xl border flex items-start gap-3 cursor-pointer transition-all ${
                  orderSource === 'brand' ? 'border-[#0D47A1] bg-[#E3ECF9]/10' : 'border-slate-200 hover:bg-slate-50/50'
                }`}>
                  <input 
                    type="radio" 
                    name="source" 
                    checked={orderSource === 'brand'} 
                    onChange={() => setOrderSource('brand')}
                    className="mt-1 accent-[#0D47A1]"
                  />
                  <div>
                    <h4 className="text-xs font-normal text-[#052355]">Partner Brand</h4>
                    <p className="text-[10px] text-slate-600 font-normal mt-0.5">Samsung Service Center • Delivery in 24 hrs</p>
                  </div>
                </label>

                {/* Source 3 */}
                <label className={`p-4 rounded-2xl border flex items-start gap-3 cursor-pointer transition-all ${
                  orderSource === 'store' ? 'border-[#0D47A1] bg-[#E3ECF9]/10' : 'border-slate-200 hover:bg-slate-50/50'
                }`}>
                  <input 
                    type="radio" 
                    name="source" 
                    checked={orderSource === 'store'} 
                    onChange={() => setOrderSource('store')}
                    className="mt-1 accent-[#0D47A1]"
                  />
                  <div>
                    <h4 className="text-xs font-normal text-[#052355]">Nearby Store</h4>
                    <p className="text-[10px] text-slate-600 font-normal mt-0.5">Check nearby partners within 10 km</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Cart Summary */}
            <div className="bg-white rounded-3xl p-3.5 border border-slate-200 shadow-sm flex flex-col gap-4">
              <span className="text-[10px] font-medium tracking-wider text-slate-600 uppercase">Cart Items</span>
              
              <div className="flex flex-col gap-3.5">
                {partsCart.length > 0 ? (
                  partsCart.map(item => (
                    <div key={item.id} className="flex justify-between items-center text-xs border-b border-slate-200 pb-3 last:border-b-0 last:pb-0">
                      <div>
                        <h5 className="font-normal text-[#052355]">{item.name}</h5>
                        <p className="text-[10px] text-slate-600 font-normal mt-0.5">Qty: {item.qty} • ₹{item.price} each</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-[#052355]">₹{item.price * item.qty}</span>
                        <button 
                          onClick={() => removePartFromCart(item.id)}
                          className="p-1 hover:bg-red-50 text-red-500 rounded-lg"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-slate-600 text-xs font-normal">
                    Cart is empty. Select items in the Inventory tab.
                  </div>
                )}
              </div>

              {partsCart.length > 0 && (
                <div className="border-t border-slate-200 pt-4 flex justify-between items-center">
                  <span className="text-xs font-normal text-slate-500">Order Total</span>
                  <span className="text-lg font-medium text-[#0D47A1]">₹{calculateCartTotal()}</span>
                </div>
              )}
            </div>

            {partsCart.length > 0 && (
              <button 
                onClick={handlePlaceOrder}
                className="w-full bg-[#0D47A1] hover:bg-[#0A3F91] text-white font-normal py-4 rounded-2xl text-sm transition-all shadow-md mt-2"
              >
                Place Order (₹{calculateCartTotal()})
              </button>
            )}

          </div>
        )}

        {/* VIEW 3: FOC CLAIMS (Screen 11) */}
        {activeTab === 'claims' && (
          <div className="flex flex-col gap-4">
            
            {/* Claim Filters Pending/Approved/Rejected */}
            <div className="flex bg-[#E2E8F0]/40 p-1.5 rounded-[1.25rem] gap-1.5">
              {['Pending', 'Approved', 'Rejected'].map((status) => (
                <button
                  key={status}
                  onClick={() => setClaimFilter(status)}
                  className={`flex-1 text-center py-2.5 rounded-xl text-xs font-normal transition-all ${
                    claimFilter === status
                      ? 'bg-white text-[#052355] shadow-sm'
                      : 'text-slate-600 hover:text-slate-600'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            {/* Claim list */}
            <div className="flex flex-col gap-3.5">
              {filteredClaims.length > 0 ? (
                filteredClaims.map(claim => (
                  <div key={claim.id} className="bg-white rounded-[2rem] p-3.5 border border-slate-200 shadow-sm flex justify-between items-start relative mb-0.5 hover:shadow-sm transition-shadow overflow-hidden">
                    <div className="flex-1 min-w-0 text-left pr-2">
                      <span className="text-[9px] font-medium text-[#0D47A1] bg-[#E3ECF9] px-2.5 py-0.5 rounded-md uppercase tracking-wider mb-2 inline-block max-w-full truncate">
                        {claim.brand}
                      </span>
                      <h4 className="text-xs font-medium text-[#052355] mt-1 truncate">
                        {claim.item}
                      </h4>
                      <p className="text-[9px] text-slate-600 font-normal mt-1.5 break-words">
                        Claim ID: {claim.claimId} • Date: {claim.date}
                      </p>
                    </div>
                    
                    <div className="flex flex-col items-end justify-between shrink-0 min-h-[50px]">
                      <span className="text-sm font-medium text-[#052355] whitespace-nowrap">₹{claim.amount}</span>
                      <span className={`text-[9px] font-medium px-2.5 py-0.5 rounded-md uppercase border mt-3 inline-block whitespace-nowrap ${
                        claim.status === 'Pending Approval' || claim.status === 'Pending'
                          ? 'border-amber-500 text-amber-500'
                          : claim.status === 'Approved'
                            ? 'border-green-600 text-green-600'
                            : 'border-red-500 text-red-500'
                      }`}>
                        {claim.status === 'Pending Approval' || claim.status === 'Pending' ? 'PENDING' : claim.status}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 bg-white rounded-[2rem] border border-dashed border-slate-200 p-4 text-slate-600">
                  <ShieldCheck className="h-10 w-10 mx-auto text-slate-500 mb-2" />
                  <p className="text-sm font-normal">No claims in this status.</p>
                </div>
              )}
            </div>

            <button 
              onClick={() => navigate('/technician/billing-estimate')}
              className="w-full bg-[#0D47A1] hover:bg-[#0A3F91] text-white font-normal py-4 rounded-2xl text-xs flex items-center justify-center gap-2 transition-all shadow-md mt-2"
            >
              <PlusCircle className="h-4.5 w-4.5" />
              <span>Raise FOC Claim</span>
            </button>

          </div>
        )}

      </div>

      {/* Claim Modal Form Popup */}
      {showClaimModal && (
        <div className="absolute inset-0 bg-[#052355]/40 backdrop-blur-xs z-30 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[2rem] p-4 shadow-2xl relative border border-slate-200 flex flex-col gap-4">
            <button 
              onClick={() => setShowClaimModal(false)}
              className="p-1.5 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors absolute top-4 right-4 text-slate-500"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-base font-medium text-[#052355] mt-1 pr-8">New FOC Claim</h3>
            
            <form onSubmit={handleCreateClaim} className="flex flex-col gap-4 mt-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-normal text-slate-600 uppercase tracking-wide">Brand Partner</label>
                <select 
                  value={newClaim.brand}
                  onChange={(e) => setNewClaim({ ...newClaim, brand: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-normal text-[#052355] focus:outline-none"
                >
                  <option>LG Partner Warranty</option>
                  <option>Samsung Warranty</option>
                  <option>Voltas Warranty</option>
                  <option>NCC EW Claim</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-normal text-slate-600 uppercase tracking-wide">Spare Item Name</label>
                <input 
                  type="text" 
                  value={newClaim.item}
                  onChange={(e) => setNewClaim({ ...newClaim, item: e.target.value })}
                  placeholder="e.g. Compressor Coil, Washing Machine Motor"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-normal text-[#052355] focus:outline-none"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-normal text-slate-600 uppercase tracking-wide">Claim Amount (₹)</label>
                <input 
                  type="number" 
                  value={newClaim.amount}
                  onChange={(e) => setNewClaim({ ...newClaim, amount: e.target.value })}
                  placeholder="e.g. 1850"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-normal text-[#052355] focus:outline-none"
                  required
                />
              </div>

              <button 
                type="submit"
                className="w-full bg-[#0D47A1] hover:bg-[#0A3F91] text-white font-normal py-3.5 rounded-2xl text-xs transition-all shadow-md mt-2"
              >
                Submit FOC Claim
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-slate-200 py-3 px-3.5 flex justify-between items-center z-20 shadow-lg">
        <button onClick={() => navigate('/technician/dashboard')} className="flex flex-col items-center gap-1 text-slate-600 hover:text-slate-700 transition-all">
          <Briefcase className="h-6 w-6 stroke-[2]" />
          <span className="text-[10px] font-normal tracking-wide">Jobs</span>
        </button>
        <button onClick={() => navigate('/technician/raise-part-request?tab=claims')} className="flex flex-col items-center gap-1 text-[#0D47A1] transition-all">
          <ClipboardList className="h-6 w-6 stroke-[2.5]" />
          <span className="text-[10px] tracking-wide font-medium">Requests</span>
        </button>
        <button onClick={() => navigate('/technician/inventory')} className="flex flex-col items-center gap-1 text-slate-600 hover:text-slate-700 transition-all">
          <Wrench className="h-6 w-6 stroke-[2]" />
          <span className="text-[10px] tracking-wide font-normal">Inventory</span>
        </button>
        <button onClick={() => navigate('/technician/schedule')} className="flex flex-col items-center gap-1 text-slate-600 hover:text-slate-700 transition-all">
          <Calendar className="h-6 w-6 stroke-[2]" />
          <span className="text-[10px] font-normal tracking-wide">Schedule</span>
        </button>
        <button onClick={() => navigate('/technician/profile')} className="flex flex-col items-center gap-1 text-slate-600 hover:text-slate-700 transition-all">
          <User className="h-6 w-6 stroke-[2]" />
          <span className="text-[10px] font-normal tracking-wide">Profile</span>
        </button>
      </div>

      {/* Added to Cart Success Card Modal */}
      {addedPartCard && (
        <div className="absolute inset-0 bg-[#052355]/40 backdrop-blur-xs z-30 flex items-center justify-center p-4 transition-all">
          <div className="bg-white rounded-[2rem] p-4 shadow-2xl border border-slate-200 max-w-sm w-full text-center flex flex-col gap-4.5 relative">
            {/* Success Icon */}
            <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto text-green-500">
              <Check className="h-6 w-6 stroke-[3]" />
            </div>

            <div>
              <h3 className="text-base font-medium text-[#052355]">Added to Cart</h3>
              <p className="text-[11px] text-slate-600 font-normal mt-1">
                {addedPartCard.name} has been added to your spare parts cart.
              </p>
            </div>

            {/* Part Details Box */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/50 text-left flex flex-col gap-1.5">
              <span className="text-[10px] font-medium text-slate-600 uppercase tracking-wide">Part Details</span>
              <div className="flex justify-between items-center text-xs font-normal text-[#052355]">
                <span>{addedPartCard.name}</span>
                <span className="text-[#0D47A1]">₹{addedPartCard.price}</span>
              </div>
              <div className="flex justify-between items-center text-[10px] text-slate-600 font-normal">
                <span>SKU: {addedPartCard.sku}</span>
                <span>Qty: {addedPartCard.qty}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-1">
              <button
                onClick={() => setAddedPartCard(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-normal py-3 px-4 rounded-xl text-xs transition-all"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setAddedPartCard(null);
                  setActiveTab('order');
                }}
                className="flex-1 bg-[#0D47A1] hover:bg-[#0A3F91] text-white font-normal py-3 px-4 rounded-xl text-xs transition-all shadow-sm"
              >
                View Cart
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Placed Order Success Card Modal */}
      {placedSource && (
        <div className="absolute inset-0 bg-[#052355]/40 backdrop-blur-xs z-30 flex items-center justify-center p-4 transition-all">
          <div className="bg-white rounded-[2rem] p-4 shadow-2xl border border-slate-200 max-w-sm w-full text-center flex flex-col gap-4.5 relative animate-fade-in">
            {/* Success Icon */}
            <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto text-green-500">
              <Check className="h-6 w-6 stroke-[3]" />
            </div>

            <div>
              <h3 className="text-base font-medium text-[#052355]">Order Placed Successfully</h3>
              <p className="text-[11px] text-slate-600 font-normal mt-1">
                Your spare parts order has been submitted successfully.
              </p>
            </div>

            {/* Order Details Box */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/50 text-left flex flex-col gap-1.5">
              <span className="text-[10px] font-medium text-slate-600 uppercase tracking-wide">Order Details</span>
              <div className="flex justify-between items-center text-xs font-normal text-[#052355]">
                <span>Supply Source</span>
                <span className="text-[#0D47A1]">{placedSource}</span>
              </div>
              <div className="flex justify-between items-center text-[10px] text-slate-600 font-normal">
                <span>Status</span>
                <span className="text-green-600">Claims raised for approval</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2.5 mt-1">
              <button
                onClick={() => {
                  setPlacedSource(null);
                  setActiveTab('claims');
                }}
                className="w-full bg-[#0D47A1] hover:bg-[#0A3F91] text-white font-normal py-3.5 rounded-xl text-xs transition-all shadow-sm"
              >
                View Claims
              </button>
              <button
                onClick={() => {
                  setPlacedSource(null);
                  setActiveTab('inventory');
                }}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-normal py-3.5 rounded-xl text-xs transition-all"
              >
                Go to Inventory
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Raised Claim Success Card Modal */}
      {raisedClaimCard && (
        <div className="absolute inset-0 bg-[#052355]/40 backdrop-blur-xs z-30 flex items-center justify-center p-4 transition-all">
          <div className="bg-white rounded-[2rem] p-4 shadow-2xl border border-slate-200 max-w-sm w-full text-center flex flex-col gap-4.5 relative animate-fade-in">
            {/* Success Icon */}
            <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto text-green-500">
              <Check className="h-6 w-6 stroke-[3]" />
            </div>

            <div>
              <h3 className="text-base font-medium text-[#052355]">Claim Raised Successfully</h3>
              <p className="text-[11px] text-slate-600 font-normal mt-1">
                Your FOC claim has been submitted successfully.
              </p>
            </div>

            {/* Claim Details Box */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/50 text-left flex flex-col gap-1.5">
              <span className="text-[10px] font-medium text-slate-600 uppercase tracking-wide">Claim Details</span>
              <div className="flex justify-between items-center text-xs font-normal text-[#052355]">
                <span>Brand Partner</span>
                <span className="text-[#0D47A1]">{raisedClaimCard.brand}</span>
              </div>
              <div className="flex justify-between items-center text-xs font-normal text-[#052355]">
                <span>Spare Item</span>
                <span>{raisedClaimCard.item}</span>
              </div>
              <div className="flex justify-between items-center text-[10px] text-slate-600 font-normal">
                <span>Claim ID</span>
                <span>{raisedClaimCard.claimId}</span>
              </div>
              <div className="flex justify-between items-center text-[10px] text-slate-600 font-normal">
                <span>Amount</span>
                <span>₹{raisedClaimCard.amount}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-1">
              <button
                onClick={() => {
                  setRaisedClaimCard(null);
                }}
                className="w-full bg-[#0D47A1] hover:bg-[#0A3F91] text-white font-normal py-3.5 rounded-xl text-xs transition-all shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default RaisePartRequest;
