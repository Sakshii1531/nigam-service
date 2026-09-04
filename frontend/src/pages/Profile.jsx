import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft,
  ChevronRight, 
  Headphones, 
  CreditCard, 
  Gift,
  Home as HomeIcon,
  ShoppingCart,
  Calendar,
  Wrench,
  User,
  LogOut,
  MapPin,
  Bell,
  Settings,
  Shield,
  FileText,
  LayoutGrid,
  Package,
  RefreshCw,
  Ticket,
  Heart,
  Sparkles,
  Award,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/apiClient';

const Profile = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [hasMembership, setHasMembership] = useState(false);
  const [membershipName, setMembershipName] = useState('');
  const [membershipExpiry, setMembershipExpiry] = useState('');
  const [bookingsCount, setBookingsCount] = useState(0);

  const userCoins = user?.walletCoins || 0;
  const [wishlistCount, setWishlistCount] = useState(0);

  useEffect(() => {
    apiRequest('/wishlist', { auth: true })
      .then((res) => setWishlistCount((res || []).length))
      .catch((err) => console.warn('[profile] Could not load wishlist count:', err.message));
  }, []);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const bookingsRes = await apiRequest('/bookings', { auth: true });
        const bookingsList = Array.isArray(bookingsRes) ? bookingsRes : (bookingsRes || []);
        setBookingsCount(bookingsList.length);
      } catch (err) {
        console.warn('Error loading bookings count:', err);
      }

      try {
        const amcRes = await apiRequest('/warranty-amc/amc/subscriptions', { auth: true });
        const warrantiesRes = await apiRequest('/warranty-amc/extended-warranty/orders', { auth: true });
        
        const amcList = Array.isArray(amcRes) ? amcRes : (amcRes || []);
        const warrantyList = Array.isArray(warrantiesRes) ? warrantiesRes : (warrantiesRes || []);
        
        const activeAmc = amcList.find(s => s.status === 'Active');
        const activeWarranty = warrantyList.find(w => w.status === 'Active');

        if (activeAmc) {
          setHasMembership(true);
          setMembershipName(activeAmc.planName || 'GOLD PLAN');
          setMembershipExpiry(new Date(activeAmc.expiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }));
        } else if (activeWarranty) {
          setHasMembership(true);
          setMembershipName(`${activeWarranty.brand} Warranty`);
          setMembershipExpiry(new Date(activeWarranty.validTill).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }));
        } else {
          setHasMembership(false);
        }
      } catch (err) {
        console.warn('Error loading memberships:', err);
      }
    };

    if (user) {
      loadStats();
    }
  }, [user]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
      
      {/* ========================================================================= */}
      {/* MOBILE VIEW — 100% UNCHANGED AND UNTOUCHED                                */}
      {/* ========================================================================= */}
      <div className="lg:hidden flex flex-col min-h-screen pb-24">
        {/* Header — mobile only */}
        <div className="px-3.5 py-2.5 flex justify-between items-center bg-white/95 backdrop-blur-md sticky top-0 z-50 shadow-2xs border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <button 
              onClick={() => navigate(-1)} 
              className="w-8 h-8 rounded-full bg-slate-100/90 active:scale-95 flex items-center justify-center text-slate-700 transition-all cursor-pointer"
              aria-label="Go Back"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <h1 className="text-sm font-extrabold text-slate-900 tracking-tight">My Account</h1>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => navigate('/edit-profile')} 
              className="w-8 h-8 rounded-full bg-slate-100/90 active:scale-95 flex items-center justify-center text-slate-700 transition-all cursor-pointer"
              aria-label="Settings"
            >
              <Settings className="h-4 w-4 text-slate-800" />
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto px-3.5 py-3.5 flex flex-col gap-4 no-scrollbar max-w-screen-lg mx-auto w-full">
          
          {/* User Quick Info */}
          <div 
            onClick={() => navigate('/edit-profile')}
            className="bg-white border border-slate-200/80 p-3.5 rounded-[22px] flex items-center justify-between gap-3.5 shadow-2xs hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-13 h-13 bg-gradient-to-br from-[#0D47A1] to-blue-700 rounded-full flex items-center justify-center text-white text-lg font-black shadow-md border-2 border-blue-100 shrink-0 uppercase">
                {user?.name ? user.name[0] : 'U'}
              </div>
              <div className="flex flex-col">
                <h2 className="text-sm font-black text-slate-900 leading-tight group-hover:text-[#0D47A1] transition-colors">{user?.name || 'Customer User'}</h2>
                <span className="text-[11px] text-slate-500 font-semibold mt-0.5">{user?.phone || '—'}</span>
                <span className="text-[11px] font-bold text-[#0D47A1] hover:underline mt-0.5 inline-flex items-center gap-0.5">
                  Edit Profile
                </span>
              </div>
            </div>
            <ChevronRight className="h-4.5 w-4.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </div>

          {/* Plus Gold Membership Card */}
          {hasMembership && (
            <div className="bg-gradient-to-r from-[#0C1D33] via-[#102747] to-[#0C1D33] rounded-[20px] p-3.5 text-white shadow-xs relative overflow-hidden border border-white/10">
              <div className="flex justify-between items-start mb-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8.5 h-8.5 bg-gradient-to-tr from-[#FFD54F] via-[#FF8F00] to-[#FFD54F] rounded-xl flex items-center justify-center shadow-md border border-amber-300 shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 17L17 21L15.5 14L21 9.5H14L12 3L10 9.5H3L8.5 14L7 21L12 17Z" fill="white" stroke="#FF8F00" strokeWidth="1.5" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-slate-300 text-[9px] font-bold uppercase tracking-wider">My Membership</span>
                    <span className="text-[#FFDF00] text-xs font-black tracking-wide leading-tight mt-0.5">{membershipName}</span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-[#FFDF00] mt-0.5" />
              </div>
              
              <div className="flex justify-between items-center border-t border-white/10 pt-2.5">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                  <span>Valid till {membershipExpiry}</span>
                </div>
                <button 
                  onClick={() => navigate('/rewards')}
                  className="bg-transparent border border-[#FFDF00]/60 hover:bg-white/5 text-[#FFDF00] text-[9px] font-black px-3 py-1 rounded-full transition-all cursor-pointer"
                >
                  View Benefits
                </button>
              </div>
            </div>
          )}

          {/* 3 Status Cards (Horizontal Grid) */}
          <div className="grid grid-cols-3 gap-2.5">
            
            {/* My Bookings */}
            <div 
              onClick={() => navigate('/my-bookings')}
              className="bg-white border border-slate-200/80 rounded-2xl p-2.5 flex flex-col gap-0.5 shadow-2xs hover:shadow-xs transition-all cursor-pointer group"
            >
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider truncate">My Bookings</span>
              <span className="text-base sm:text-lg font-black text-slate-900 mt-0.5">{bookingsCount}</span>
              <span className="text-[9px] font-extrabold text-[#0D47A1] group-hover:underline self-start mt-0.5">
                View All
              </span>
            </div>

            {/* Rewards */}
            <div 
              onClick={() => navigate('/rewards-play-zone')}
              className="bg-white border border-slate-200/80 rounded-2xl p-2.5 flex flex-col gap-0.5 shadow-2xs hover:shadow-xs transition-all cursor-pointer"
            >
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider truncate">Rewards</span>
              <span className="text-base sm:text-lg font-black text-slate-900 mt-0.5">{userCoins.toLocaleString('en-IN')}</span>
              <span className="text-[9px] font-extrabold text-slate-400 self-start mt-0.5">Coins</span>
            </div>

            {/* Play & Win */}
            <div 
              onClick={() => navigate('/rewards-play-zone')}
              className="bg-white border border-slate-200/80 rounded-2xl p-2.5 flex flex-col gap-0.5 shadow-2xs hover:shadow-xs transition-all cursor-pointer group"
            >
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider truncate">Play & Win</span>
              <span className="text-base sm:text-lg font-black text-slate-900 mt-0.5">Level {Math.max(1, Math.floor(userCoins / 500) + 1)}</span>
              <span className="text-[9px] font-extrabold text-[#0D47A1] group-hover:underline self-start mt-0.5">
                Spin Now
              </span>
            </div>

          </div>

          {/* Categorized Settings */}
          <div className="flex flex-col gap-4">

            {/* Category: My Activity */}
            <div className="flex flex-col gap-1.5">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">My Activity</h3>
              <div className="bg-white border border-slate-200/80 rounded-[20px] overflow-hidden shadow-2xs flex flex-col divide-y divide-slate-100/80">

                {/* My Bookings */}
                <div 
                  onClick={() => navigate('/my-bookings')}
                  className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 text-[#0D47A1] rounded-xl shrink-0">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <span className="text-xs sm:text-[13px] font-bold text-slate-800">My Bookings</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </div>

                {/* My Orders */}
                <div 
                  onClick={() => navigate('/my-orders')}
                  className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
                      <Package className="h-4 w-4" />
                    </div>
                    <span className="text-xs sm:text-[13px] font-bold text-slate-800">My Orders</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </div>

                {/* Exchange Details */}
                <div 
                  onClick={() => navigate('/exchange-details')}
                  className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-50 text-amber-600 rounded-xl shrink-0">
                      <RefreshCw className="h-4 w-4" />
                    </div>
                    <span className="text-xs sm:text-[13px] font-bold text-slate-800">Exchange Details</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </div>

                {/* My Protection Plans */}
                <div 
                  onClick={() => navigate('/buy/my-warranty')}
                  className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 text-[#0D47A1] rounded-xl shrink-0">
                      <Shield className="h-4 w-4" />
                    </div>
                    <span className="text-xs sm:text-[13px] font-bold text-slate-800">My Protection Plans</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </div>

              </div>
            </div>

            {/* Category: Rewards & Offers */}
            <div className="flex flex-col gap-1.5">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Rewards & Offers</h3>
              <div className="bg-white border border-slate-200/80 rounded-[20px] overflow-hidden shadow-2xs flex flex-col divide-y divide-slate-100/80">

                {/* Membership Plan */}
                <div 
                  onClick={() => navigate('/membership-plans')}
                  className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-50 text-amber-600 rounded-xl shrink-0">
                      <Shield className="h-4 w-4" />
                    </div>
                    <span className="text-xs sm:text-[13px] font-bold text-slate-800">Membership Plan</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-400 font-semibold">{hasMembership ? membershipName : 'No Active Plan'}</span>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </div>
                </div>

                {/* Rewards & Play Zone */}
                <div 
                  onClick={() => navigate('/rewards-play-zone')}
                  className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-50 text-purple-600 rounded-xl shrink-0">
                      <Gift className="h-4 w-4" />
                    </div>
                    <span className="text-xs sm:text-[13px] font-bold text-slate-800">Rewards & Play Zone</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </div>

                {/* My Coupons */}
                <div 
                  onClick={() => navigate('/coupons')}
                  className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-rose-50 text-rose-600 rounded-xl shrink-0">
                      <Ticket className="h-4 w-4" />
                    </div>
                    <span className="text-xs sm:text-[13px] font-bold text-slate-800">My Coupons</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </div>

                {/* My Wishlist */}
                <div 
                  onClick={() => navigate('/my-wishlist')}
                  className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-50 text-red-500 rounded-xl shrink-0">
                      <Heart className="h-4 w-4" />
                    </div>
                    <span className="text-xs sm:text-[13px] font-bold text-slate-800">My Wishlist</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-400 font-semibold">{wishlistCount} items</span>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </div>
                </div>

              </div>
            </div>

            {/* Category: Account & Settings */}
            <div className="flex flex-col gap-1.5">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Account & Settings</h3>
              <div className="bg-white border border-slate-200/80 rounded-[20px] overflow-hidden shadow-2xs flex flex-col divide-y divide-slate-100/80">

                {/* Saved Addresses */}
                <div 
                  onClick={() => navigate('/saved-addresses')}
                  className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 text-[#0D47A1] rounded-xl shrink-0">
                      <MapPin className="h-4 w-4" />
                    </div>
                    <span className="text-xs sm:text-[13px] font-bold text-slate-800">Saved Addresses</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </div>

                {/* Payment Methods */}
                <div 
                  onClick={() => navigate('/payment-methods')}
                  className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl shrink-0">
                      <CreditCard className="h-4 w-4" />
                    </div>
                    <span className="text-xs sm:text-[13px] font-bold text-slate-800">Payment Methods</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </div>

                {/* Notification Settings */}
                <div 
                  onClick={() => navigate('/notification-settings')}
                  className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-pink-50 text-pink-600 rounded-xl shrink-0">
                      <Bell className="h-4 w-4" />
                    </div>
                    <span className="text-xs sm:text-[13px] font-bold text-slate-800">Notification Settings</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </div>

              </div>
            </div>

            {/* Category: More */}
            <div className="flex flex-col gap-1.5">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">More</h3>
              <div className="bg-white border border-slate-200/80 rounded-[20px] overflow-hidden shadow-2xs flex flex-col divide-y divide-slate-100/80">

                {/* Help & Support */}
                <div 
                  onClick={() => navigate('/help-support')}
                  className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-teal-50 text-teal-600 rounded-xl shrink-0">
                      <Headphones className="h-4 w-4" />
                    </div>
                    <span className="text-xs sm:text-[13px] font-bold text-slate-800">Help & Support</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </div>

                {/* About NCC */}
                <div 
                  onClick={() => navigate('/about-ncc')}
                  className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-50 text-slate-600 rounded-xl shrink-0">
                      <FileText className="h-4 w-4" />
                    </div>
                    <span className="text-xs sm:text-[13px] font-bold text-slate-800">About NCC</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </div>

                {/* Logout */}
                <div 
                  onClick={() => setShowLogoutConfirm(true)}
                  className="p-3.5 flex items-center justify-between gap-3 hover:bg-red-50/50 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-50 text-red-600 rounded-xl shrink-0">
                      <LogOut className="h-4 w-4" />
                    </div>
                    <span className="text-xs sm:text-[13px] font-bold text-red-600">Log Out</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </div>

              </div>
            </div>

          </div>

          {/* Refer & Earn Banner */}
          <div 
            onClick={() => navigate('/refer-earn')}
            className="bg-gradient-to-r from-[#FFF8F0] via-[#FFF3E0] to-[#FFE8CC] rounded-[22px] p-4 relative overflow-hidden shadow-2xs flex items-center justify-between mt-1 min-h-[115px] border border-amber-200/70 cursor-pointer hover:shadow-md transition-all"
          >
            <div className="flex-1 flex flex-col gap-1 pr-20 z-10">
              <h4 className="text-xs font-black text-amber-900">Refer & Earn</h4>
              <p className="text-[10px] text-amber-800 font-bold leading-snug">Earn 100 Coins for every friend who joins</p>
              <button 
                onClick={(e) => { e.stopPropagation(); navigate('/refer-earn'); }} 
                className="bg-amber-600 hover:bg-amber-700 text-white text-[9.5px] font-black px-4 py-1.5 rounded-xl mt-1.5 transition-all cursor-pointer self-start shadow-2xs"
              >
                Refer Now
              </button>
            </div>
            <div className="absolute bottom-2 right-3 h-[85px] w-20 flex items-center justify-center pointer-events-none z-0">
              <svg viewBox="0 0 100 100" className="h-16 w-16 text-amber-500 drop-shadow-[0_4px_8px_rgba(245,158,11,0.25)]">
                <rect x="25" y="40" width="50" height="45" rx="6" fill="#F59E0B" />
                <rect x="20" y="30" width="60" height="12" rx="4" fill="#FBBF24" />
                <rect x="46" y="30" width="8" height="55" fill="#EF4444" />
                <rect x="25" y="40" width="50" height="8" fill="#EF4444" />
                <path d="M48 30 C35 15, 30 25, 48 30 Z" fill="#EF4444" />
                <path d="M52 30 C65 15, 70 25, 52 30 Z" fill="#EF4444" />
              </svg>
            </div>
          </div>

        </div>

        {/* Bottom Navigation — Mobile only */}
        <div className="fixed bottom-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-xl border-t border-slate-200/80 px-3 sm:px-8 flex justify-around items-center z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
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


      {/* ========================================================================= */}
      {/* DESKTOP VIEW — STUNNING, HIGH-END DASHBOARD UI (NAVBAR HIDDEN)            */}
      {/* ========================================================================= */}
      <div className="hidden lg:flex flex-col max-w-screen-2xl mx-auto w-full px-8 py-8 gap-8">
        
        {/* Desktop Header Navigation Banner */}
        <div className="flex items-center justify-between bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(-1)}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 rounded-2xl text-slate-700 transition-colors cursor-pointer flex-shrink-0"
              title="Go Back"
              aria-label="Go Back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="w-12 h-12 rounded-2xl bg-[#EAF4FF] text-[#0D47A1] flex items-center justify-center font-black">
              <User className="h-6 w-6 text-[#0D47A1]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">My Account</h1>
                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold px-3 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  Verified Account
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">Manage your personal information, active bookings, membership, and preferences</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-2xl transition-all cursor-pointer border border-slate-200/60"
            >
              <HomeIcon className="h-4 w-4" />
              <span>Back to Home</span>
            </button>
            <button
              onClick={() => navigate('/edit-profile')}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0D47A1] hover:bg-[#083679] text-white text-xs font-bold rounded-2xl shadow-xs transition-all cursor-pointer"
            >
              <Settings className="h-4 w-4" />
              <span>Edit Profile</span>
            </button>
          </div>
        </div>

        {/* Desktop Main Split Grid */}
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          
          {/* Left Column: User Profile Card + Membership + Quick Stats */}
          <div className="w-full lg:w-96 flex flex-col gap-6 shrink-0">
            
            {/* User Executive Badge */}
            <div className="bg-gradient-to-br from-[#0C2340] via-[#0D47A1] to-[#051C38] rounded-3xl p-6 text-white shadow-md relative overflow-hidden border border-slate-800">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-400/10 rounded-full blur-2xl pointer-events-none" />
              
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-20 h-20 bg-gradient-to-tr from-amber-400 via-yellow-200 to-white rounded-2xl p-0.5 shadow-md">
                  <div className="w-full h-full bg-[#051C38] rounded-[14px] flex items-center justify-center text-white text-3xl font-black uppercase">
                    {user?.name ? user.name[0] : 'U'}
                  </div>
                </div>
                <div className="flex flex-col min-w-0">
                  <h2 className="text-lg font-black text-white truncate leading-snug">{user?.name || 'Customer User'}</h2>
                  <p className="text-xs text-blue-200 font-semibold mt-0.5">{user?.phone || '—'}</p>
                  <span className="inline-flex items-center gap-1 text-[11px] text-amber-300 font-bold mt-2">
                    <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                    <span>Nigam Premium Customer</span>
                  </span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs">
                <span className="text-blue-200 font-medium">Account Status</span>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-3 py-0.5 rounded-full font-bold text-[11px]">Active</span>
              </div>
            </div>

            {/* Plus Gold Membership Card */}
            {hasMembership ? (
              <div className="bg-gradient-to-r from-[#0C1D33] via-[#102747] to-[#0C1D33] rounded-3xl p-5 text-white shadow-md relative overflow-hidden border border-amber-400/30">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-tr from-[#FFD54F] via-[#FF8F00] to-[#FFD54F] rounded-xl flex items-center justify-center shadow-md border border-amber-300">
                      <Award className="h-5 w-5 text-amber-950" />
                    </div>
                    <div>
                      <span className="text-slate-300 text-[10px] font-bold uppercase tracking-wider block">My Active Plan</span>
                      <span className="text-[#FFDF00] text-base font-black tracking-wide leading-tight">{membershipName}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-between items-center border-t border-white/10 pt-3 mt-2">
                  <span className="text-xs text-slate-300 font-medium">Valid till {membershipExpiry}</span>
                  <button 
                    onClick={() => navigate('/rewards')}
                    className="bg-transparent border border-[#FFDF00]/60 hover:bg-white/10 text-[#FFDF00] text-xs font-bold px-4 py-1.5 rounded-xl transition-all cursor-pointer"
                  >
                    Benefits
                  </button>
                </div>
              </div>
            ) : (
              <div 
                onClick={() => navigate('/membership-plans')}
                className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-2xs hover:shadow-md transition-all cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center border border-amber-200/60">
                    <Shield className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 group-hover:text-[#0D47A1] transition-colors">Join Membership Plan</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Save up to 20% on all home service bookings</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-400 group-hover:translate-x-1 transition-transform" />
              </div>
            )}

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-3 gap-3">
              <div 
                onClick={() => navigate('/my-bookings')}
                className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col gap-1 shadow-2xs hover:shadow-md transition-all cursor-pointer group"
              >
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bookings</span>
                <span className="text-xl font-black text-slate-900 group-hover:text-[#0D47A1] transition-colors">{bookingsCount}</span>
                <span className="text-[10px] font-bold text-[#0D47A1] mt-1">View All →</span>
              </div>

              <div 
                onClick={() => navigate('/rewards-play-zone')}
                className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col gap-1 shadow-2xs hover:shadow-md transition-all cursor-pointer group"
              >
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Coins</span>
                <span className="text-xl font-black text-slate-900 group-hover:text-[#0D47A1] transition-colors">{userCoins.toLocaleString('en-IN')}</span>
                <span className="text-[10px] font-bold text-slate-400 mt-1">Rewards</span>
              </div>

              <div 
                onClick={() => navigate('/rewards-play-zone')}
                className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col gap-1 shadow-2xs hover:shadow-md transition-all cursor-pointer group"
              >
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Play & Win</span>
                <span className="text-xl font-black text-slate-900 group-hover:text-[#0D47A1] transition-colors">Level {Math.max(1, Math.floor(userCoins / 500) + 1)}</span>
                <span className="text-[10px] font-bold text-[#0D47A1] mt-1">Spin Now →</span>
              </div>
            </div>

            {/* Refer & Earn Desktop Card */}
            <div 
              onClick={() => navigate('/refer-earn')}
              className="bg-gradient-to-r from-[#FFF8F0] to-[#FFF0E0] rounded-3xl p-5 border border-amber-200/70 shadow-2xs hover:shadow-md transition-all cursor-pointer flex justify-between items-center relative overflow-hidden"
            >
              <div className="flex flex-col gap-1 z-10 max-w-[200px]">
                <span className="text-xs font-black text-amber-900 uppercase tracking-wider">Refer & Earn</span>
                <p className="text-xs text-amber-800 font-bold leading-snug">Earn 100 coins for every friend who signs up</p>
                <button className="mt-2 bg-amber-600 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-xs self-start cursor-pointer">
                  Refer Friends
                </button>
              </div>
              <Gift className="h-16 w-16 text-amber-500/80 absolute right-4 bottom-2 pointer-events-none" />
            </div>

          </div>

          {/* Right Column: Categorized Settings Cards Grid */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
            
            {/* Category 1: My Activity */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-2xs flex flex-col gap-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <div className="w-2 h-4 bg-[#0D47A1] rounded-full" />
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">My Activity</h3>
              </div>

              <div className="flex flex-col gap-2">
                <div 
                  onClick={() => navigate('/my-bookings')}
                  className="p-3.5 bg-slate-50 hover:bg-[#EAF4FF]/60 rounded-2xl border border-slate-100 flex items-center justify-between cursor-pointer transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white text-[#0D47A1] rounded-xl shadow-2xs">
                      <Calendar className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 group-hover:text-[#0D47A1]">My Bookings</h4>
                      <p className="text-[11px] text-slate-400 font-medium">{bookingsCount} active/completed requests</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                </div>

                <div 
                  onClick={() => navigate('/my-orders')}
                  className="p-3.5 bg-slate-50 hover:bg-[#EAF4FF]/60 rounded-2xl border border-slate-100 flex items-center justify-between cursor-pointer transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white text-emerald-600 rounded-xl shadow-2xs">
                      <Package className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 group-hover:text-[#0D47A1]">My Orders</h4>
                      <p className="text-[11px] text-slate-400 font-medium">Track product purchases & parts</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                </div>

                <div 
                  onClick={() => navigate('/exchange-details')}
                  className="p-3.5 bg-slate-50 hover:bg-[#EAF4FF]/60 rounded-2xl border border-slate-100 flex items-center justify-between cursor-pointer transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white text-amber-600 rounded-xl shadow-2xs">
                      <RefreshCw className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 group-hover:text-[#0D47A1]">Exchange Details</h4>
                      <p className="text-[11px] text-slate-400 font-medium">Old appliance trade-in status</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                </div>

                <div 
                  onClick={() => navigate('/buy/my-warranty')}
                  className="p-3.5 bg-slate-50 hover:bg-[#EAF4FF]/60 rounded-2xl border border-slate-100 flex items-center justify-between cursor-pointer transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white text-blue-600 rounded-xl shadow-2xs">
                      <Shield className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 group-hover:text-[#0D47A1]">My Protection Plans</h4>
                      <p className="text-[11px] text-slate-400 font-medium">Extended warranties & AMC contracts</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>

            {/* Category 2: Rewards & Offers */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-2xs flex flex-col gap-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <div className="w-2 h-4 bg-amber-500 rounded-full" />
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Rewards & Offers</h3>
              </div>

              <div className="flex flex-col gap-2">
                <div 
                  onClick={() => navigate('/membership-plans')}
                  className="p-3.5 bg-slate-50 hover:bg-[#EAF4FF]/60 rounded-2xl border border-slate-100 flex items-center justify-between cursor-pointer transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white text-amber-600 rounded-xl shadow-2xs">
                      <Shield className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 group-hover:text-[#0D47A1]">Membership Plan</h4>
                      <p className="text-[11px] text-slate-400 font-medium">{hasMembership ? membershipName : 'No active plan'}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                </div>

                <div 
                  onClick={() => navigate('/rewards-play-zone')}
                  className="p-3.5 bg-slate-50 hover:bg-[#EAF4FF]/60 rounded-2xl border border-slate-100 flex items-center justify-between cursor-pointer transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white text-purple-600 rounded-xl shadow-2xs">
                      <Gift className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 group-hover:text-[#0D47A1]">Rewards & Play Zone</h4>
                      <p className="text-[11px] text-slate-400 font-medium">Spin wheel & earn extra coins</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                </div>

                <div 
                  onClick={() => navigate('/coupons')}
                  className="p-3.5 bg-slate-50 hover:bg-[#EAF4FF]/60 rounded-2xl border border-slate-100 flex items-center justify-between cursor-pointer transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white text-rose-600 rounded-xl shadow-2xs">
                      <Ticket className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 group-hover:text-[#0D47A1]">My Coupons</h4>
                      <p className="text-[11px] text-slate-400 font-medium">Discount vouchers & active offers</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                </div>

                <div 
                  onClick={() => navigate('/my-wishlist')}
                  className="p-3.5 bg-slate-50 hover:bg-[#EAF4FF]/60 rounded-2xl border border-slate-100 flex items-center justify-between cursor-pointer transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white text-red-500 rounded-xl shadow-2xs">
                      <Heart className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 group-hover:text-[#0D47A1]">My Wishlist</h4>
                      <p className="text-[11px] text-slate-400 font-medium">{wishlistCount} saved items</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>

            {/* Category 3: Account & Settings */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-2xs flex flex-col gap-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <div className="w-2 h-4 bg-purple-500 rounded-full" />
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Account & Settings</h3>
              </div>

              <div className="flex flex-col gap-2">
                <div 
                  onClick={() => navigate('/saved-addresses')}
                  className="p-3.5 bg-slate-50 hover:bg-[#EAF4FF]/60 rounded-2xl border border-slate-100 flex items-center justify-between cursor-pointer transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white text-[#0D47A1] rounded-xl shadow-2xs">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 group-hover:text-[#0D47A1]">Saved Addresses</h4>
                      <p className="text-[11px] text-slate-400 font-medium">Manage home & office service locations</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                </div>

                <div 
                  onClick={() => navigate('/payment-methods')}
                  className="p-3.5 bg-slate-50 hover:bg-[#EAF4FF]/60 rounded-2xl border border-slate-100 flex items-center justify-between cursor-pointer transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white text-indigo-600 rounded-xl shadow-2xs">
                      <CreditCard className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 group-hover:text-[#0D47A1]">Payment Methods</h4>
                      <p className="text-[11px] text-slate-400 font-medium">UPI, saved cards & wallet settings</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                </div>

                <div 
                  onClick={() => navigate('/notification-settings')}
                  className="p-3.5 bg-slate-50 hover:bg-[#EAF4FF]/60 rounded-2xl border border-slate-100 flex items-center justify-between cursor-pointer transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white text-pink-600 rounded-xl shadow-2xs">
                      <Bell className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 group-hover:text-[#0D47A1]">Notification Settings</h4>
                      <p className="text-[11px] text-slate-400 font-medium">SMS, WhatsApp & push alerts</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>

            {/* Category 4: Support & Legal */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-2xs flex flex-col gap-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <div className="w-2 h-4 bg-teal-500 rounded-full" />
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Support & Legal</h3>
              </div>

              <div className="flex flex-col gap-2">
                <div 
                  onClick={() => navigate('/help-support')}
                  className="p-3.5 bg-slate-50 hover:bg-[#EAF4FF]/60 rounded-2xl border border-slate-100 flex items-center justify-between cursor-pointer transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white text-teal-600 rounded-xl shadow-2xs">
                      <Headphones className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 group-hover:text-[#0D47A1]">Help & Support</h4>
                      <p className="text-[11px] text-slate-400 font-medium">24/7 customer care & raised tickets</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                </div>

                <div 
                  onClick={() => navigate('/about-ncc')}
                  className="p-3.5 bg-slate-50 hover:bg-[#EAF4FF]/60 rounded-2xl border border-slate-100 flex items-center justify-between cursor-pointer transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white text-slate-600 rounded-xl shadow-2xs">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 group-hover:text-[#0D47A1]">About NCC</h4>
                      <p className="text-[11px] text-slate-400 font-medium">Terms, privacy policy & brand info</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                </div>

                <div 
                  onClick={() => setShowLogoutConfirm(true)}
                  className="p-3.5 bg-rose-50/70 hover:bg-rose-100/80 rounded-2xl border border-rose-100 flex items-center justify-between cursor-pointer transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white text-rose-600 rounded-xl shadow-2xs">
                      <LogOut className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-rose-700">Log Out</h4>
                      <p className="text-[11px] text-rose-500 font-medium">Sign out from your account</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-rose-400 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* Logout Confirmation Modal Overlay */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-6 z-[100] animate-fade-in">
          <div className="bg-white border border-slate-100 rounded-[28px] p-6 max-w-xs w-full flex flex-col items-center text-center gap-4 shadow-xl">
            <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center">
              <LogOut className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-900 mb-1">Log Out</h4>
              <p className="text-[11px] text-slate-500 font-semibold leading-normal">
                Are you sure you want to log out of your account?
              </p>
            </div>
            <div className="flex gap-2.5 w-full mt-2">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-[10.5px] font-black py-2.5 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setShowLogoutConfirm(false);
                  await logout();
                  navigate('/login', { replace: true });
                }}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white text-[10.5px] font-black py-2.5 rounded-xl transition-colors cursor-pointer shadow-sm"
              >
                Yes, Log Out
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Profile;
