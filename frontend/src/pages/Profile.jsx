import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
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
  Heart
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/apiClient';

import partnerImg from '../assets/working/Gemini_Generated_Image_ahi7orahi7orahi7-removebg-preview (1).png';

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
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col pb-24 lg:pb-8">
      

      {/* Header — mobile only */}
      <div className="px-6 pt-5 pb-3 flex justify-between items-center bg-white sticky top-0 lg:top-16 z-50 shadow-xs border-b border-slate-100">
        <h1 className="text-xl font-black text-slate-900">My Account</h1>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/edit-profile')} 
            className="p-1 hover:bg-slate-50 rounded-full transition-colors cursor-pointer"
          >
            <Settings className="h-6 w-6 text-slate-800" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5 no-scrollbar max-w-screen-lg mx-auto w-full">
        
        {/* User Quick Info */}
        <div 
          onClick={() => navigate('/edit-profile')}
          className="bg-white border border-slate-100 p-4 rounded-[24px] flex items-center justify-between gap-4 shadow-sm hover:shadow-md transition-all cursor-pointer"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-[#0D47A1] rounded-full flex items-center justify-center text-white text-xl font-extrabold shadow-inner uppercase">
              {user?.name ? user.name[0] : 'U'}
            </div>
            <div className="flex flex-col">
              <h2 className="text-[15px] font-black text-slate-900 leading-tight">{user?.name || 'Customer User'}</h2>
              <span className="text-xs text-slate-500 font-semibold mt-1">{user?.phone || '—'}</span>
              <span className="text-xs font-bold text-[#0D47A1] hover:underline mt-1">
                Edit Profile
              </span>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-slate-400" />
        </div>

        {/* Plus Gold Membership Card */}
        {hasMembership && (
          <div className="bg-gradient-to-r from-[#0C1D33] via-[#102747] to-[#0C1D33] rounded-[18px] p-3.5 text-white shadow-md relative overflow-hidden border border-white/5">
            <div className="flex justify-between items-start mb-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-gradient-to-tr from-[#FFD54F] via-[#FF8F00] to-[#FFD54F] rounded-xl flex items-center justify-center shadow-md border border-amber-300">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 17L17 21L15.5 14L21 9.5H14L12 3L10 9.5H3L8.5 14L7 21L12 17Z" fill="white" stroke="#FF8F00" strokeWidth="1.5" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className="flex flex-col">
                  <span className="text-slate-300 text-[9px] font-bold uppercase tracking-wider">My Membership</span>
                  <span className="text-[#FFDF00] text-sm font-black tracking-wide leading-tight mt-0.5">{membershipName}</span>
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
        <div className="grid grid-cols-3 gap-3">
          
          {/* My Bookings */}
          <div className="bg-white border border-slate-100 rounded-2xl p-2.5 flex flex-col gap-0.5 shadow-2xs hover:shadow-xs transition-all">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider truncate">My Bookings</span>
            <span className="text-lg font-black text-slate-900 mt-0.5">{bookingsCount}</span>
            <button 
              onClick={() => navigate('/my-bookings')} 
              className="text-[9px] font-extrabold text-[#0D47A1] hover:underline self-start mt-0.5 cursor-pointer"
            >
              View All
            </button>
          </div>

          {/* Rewards */}
          <div 
            onClick={() => navigate('/rewards-play-zone')}
            className="bg-white border border-slate-100 rounded-2xl p-2.5 flex flex-col gap-0.5 shadow-2xs hover:shadow-xs transition-all cursor-pointer"
          >
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider truncate">Rewards</span>
            <span className="text-lg font-black text-slate-900 mt-0.5">{userCoins.toLocaleString('en-IN')}</span>
            <span className="text-[9px] font-extrabold text-slate-400 self-start mt-0.5">Coins</span>
          </div>

          {/* Play & Win */}
          <div className="bg-white border border-slate-100 rounded-2xl p-2.5 flex flex-col gap-0.5 shadow-2xs hover:shadow-xs transition-all">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider truncate">Play & Win</span>
            <span className="text-lg font-black text-slate-900 mt-0.5">Level {Math.max(1, Math.floor(userCoins / 500) + 1)}</span>
            <button 
              onClick={() => navigate('/rewards-play-zone')} 
              className="text-[9px] font-extrabold text-[#0D47A1] hover:underline self-start mt-0.5 cursor-pointer"
            >
              Spin Now
            </button>
          </div>

        </div>

        {/* Categorized Settings */}
        <div className="flex flex-col gap-5">

          {/* Category: My Activity */}
          <div className="flex flex-col gap-2">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">My Activity</h3>
            <div className="bg-white border border-slate-100 rounded-[20px] overflow-hidden shadow-2xs flex flex-col divide-y divide-slate-100">

              {/* My Bookings */}
              <div 
                onClick={() => navigate('/my-bookings')}
                className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <div className="p-2 bg-blue-50 text-[#0D47A1] rounded-xl">
                    <Calendar className="h-4.5 w-4.5" />
                  </div>
                  <span className="text-[13px] font-bold text-slate-800">My Bookings</span>
                </div>
                <ChevronRight className="h-4.5 w-4.5 text-slate-400" />
              </div>

              {/* My Orders */}
              <div 
                onClick={() => navigate('/my-orders')}
                className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                    <Package className="h-4.5 w-4.5" />
                  </div>
                  <span className="text-[13px] font-bold text-slate-800">My Orders</span>
                </div>
                <ChevronRight className="h-4.5 w-4.5 text-slate-400" />
              </div>

              {/* Exchange Details */}
              <div 
                onClick={() => navigate('/exchange-details')}
                className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                    <RefreshCw className="h-4.5 w-4.5" />
                  </div>
                  <span className="text-[13px] font-bold text-slate-800">Exchange Details</span>
                </div>
                <ChevronRight className="h-4.5 w-4.5 text-slate-400" />
              </div>

              {/* My Protection Plans */}
              <div 
                onClick={() => navigate('/buy/my-warranty')}
                className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <div className="p-2 bg-blue-50 text-brand-blue rounded-xl">
                    <Shield className="h-4.5 w-4.5" />
                  </div>
                  <span className="text-[13px] font-bold text-slate-800">My Protection Plans</span>
                </div>
                <ChevronRight className="h-4.5 w-4.5 text-slate-400" />
              </div>

            </div>
          </div>

          {/* Category: Rewards & Offers */}
          <div className="flex flex-col gap-2">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Rewards & Offers</h3>
            <div className="bg-white border border-slate-100 rounded-[20px] overflow-hidden shadow-2xs flex flex-col divide-y divide-slate-100">

              {/* Membership Plan */}
              <div 
                onClick={() => navigate('/membership-plans')}
                className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                    <Shield className="h-4.5 w-4.5" />
                  </div>
                  <span className="text-[13px] font-bold text-slate-800">Membership Plan</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-semibold">{hasMembership ? membershipName : 'No Active Plan'}</span>
                  <ChevronRight className="h-4.5 w-4.5 text-slate-400" />
                </div>
              </div>

              {/* Rewards & Play Zone */}
              <div 
                onClick={() => navigate('/rewards-play-zone')}
                className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                    <Gift className="h-4.5 w-4.5" />
                  </div>
                  <span className="text-[13px] font-bold text-slate-800">Rewards & Play Zone</span>
                </div>
                <ChevronRight className="h-4.5 w-4.5 text-slate-400" />
              </div>

              {/* My Coupons */}
              <div 
                onClick={() => navigate('/coupons')}
                className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                    <Ticket className="h-4.5 w-4.5" />
                  </div>
                  <span className="text-[13px] font-bold text-slate-800">My Coupons</span>
                </div>
                <ChevronRight className="h-4.5 w-4.5 text-slate-400" />
              </div>

              {/* My Wishlist */}
              <div 
                onClick={() => navigate('/my-wishlist')}
                className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <div className="p-2 bg-red-50 text-red-500 rounded-xl">
                    <Heart className="h-4.5 w-4.5" />
                  </div>
                  <span className="text-[13px] font-bold text-slate-800">My Wishlist</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-semibold">{wishlistCount} items</span>
                  <ChevronRight className="h-4.5 w-4.5 text-slate-400" />
                </div>
              </div>

            </div>
          </div>

          {/* Category: Account & Settings */}
          <div className="flex flex-col gap-2">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Account & Settings</h3>
            <div className="bg-white border border-slate-100 rounded-[20px] overflow-hidden shadow-2xs flex flex-col divide-y divide-slate-100">

              {/* Saved Addresses */}
              <div 
                onClick={() => navigate('/saved-addresses')}
                className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <div className="p-2 bg-blue-50 text-[#0D47A1] rounded-xl">
                    <MapPin className="h-4.5 w-4.5" />
                  </div>
                  <span className="text-[13px] font-bold text-slate-800">Saved Addresses</span>
                </div>
                <ChevronRight className="h-4.5 w-4.5 text-slate-400" />
              </div>

              {/* Payment Methods */}
              <div 
                onClick={() => navigate('/payment-methods')}
                className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                    <CreditCard className="h-4.5 w-4.5" />
                  </div>
                  <span className="text-[13px] font-bold text-slate-800">Payment Methods</span>
                </div>
                <ChevronRight className="h-4.5 w-4.5 text-slate-400" />
              </div>

              {/* Notification Settings */}
              <div 
                onClick={() => navigate('/notification-settings')}
                className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <div className="p-2 bg-pink-50 text-pink-600 rounded-xl">
                    <Bell className="h-4.5 w-4.5" />
                  </div>
                  <span className="text-[13px] font-bold text-slate-800">Notification Settings</span>
                </div>
                <ChevronRight className="h-4.5 w-4.5 text-slate-400" />
              </div>

            </div>
          </div>

          {/* Category: More */}
          <div className="flex flex-col gap-2">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">More</h3>
            <div className="bg-white border border-slate-100 rounded-[20px] overflow-hidden shadow-2xs flex flex-col divide-y divide-slate-100">

              {/* Help & Support */}
              <div 
                onClick={() => navigate('/help-support')}
                className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <div className="p-2 bg-teal-50 text-teal-600 rounded-xl">
                    <Headphones className="h-4.5 w-4.5" />
                  </div>
                  <span className="text-[13px] font-bold text-slate-800">Help & Support</span>
                </div>
                <ChevronRight className="h-4.5 w-4.5 text-slate-400" />
              </div>

              {/* About NCC */}
              <div 
                onClick={() => navigate('/about-ncc')}
                className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <div className="p-2 bg-slate-50 text-slate-600 rounded-xl">
                    <FileText className="h-4.5 w-4.5" />
                  </div>
                  <span className="text-[13px] font-bold text-slate-800">About NCC</span>
                </div>
                <ChevronRight className="h-4.5 w-4.5 text-slate-400" />
              </div>

              {/* Logout */}
              <div 
                onClick={() => setShowLogoutConfirm(true)}
                className="p-4 flex items-center justify-between gap-3 hover:bg-red-50/50 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="p-2 bg-red-50 text-red-600 rounded-xl">
                    <LogOut className="h-4.5 w-4.5" />
                  </div>
                  <span className="text-[13px] font-bold text-red-600">Log Out</span>
                </div>
                <ChevronRight className="h-4.5 w-4.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </div>

            </div>
          </div>

        </div>

        {/* Refer & Earn Banner */}
        <div 
          onClick={() => navigate('/refer-earn')}
          className="bg-gradient-to-r from-[#FFF8F0] to-[#FFF0E0] rounded-[24px] p-5 relative overflow-hidden shadow-2xs flex items-center justify-between mt-1 min-h-[120px] border border-amber-200/50 cursor-pointer hover:shadow-md transition-all"
        >
          <div className="flex-1 flex flex-col gap-1 pr-24 z-10">
            <h4 className="text-[13px] font-black text-amber-900">Refer & Earn</h4>
            <p className="text-[10px] text-amber-700 font-extrabold leading-snug">Earn 100 Coins for every friend who joins</p>
            <button 
              onClick={(e) => { e.stopPropagation(); navigate('/refer-earn'); }} 
              className="bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-black px-4.5 py-2 rounded-xl mt-2 transition-all cursor-pointer self-start shadow-sm"
            >
              Refer Now
            </button>
          </div>
          <div className="absolute bottom-2 right-4 h-[90px] w-24 flex items-center justify-center pointer-events-none z-0">
            <svg viewBox="0 0 100 100" className="h-18 w-18 text-amber-500 drop-shadow-[0_4px_8px_rgba(245,158,11,0.25)]">
              {/* Gift Box Base */}
              <rect x="25" y="40" width="50" height="45" rx="6" fill="#F59E0B" />
              {/* Gift Box Lid */}
              <rect x="20" y="30" width="60" height="12" rx="4" fill="#FBBF24" />
              {/* Vertical Ribbon */}
              <rect x="46" y="30" width="8" height="55" fill="#EF4444" />
              {/* Horizontal Ribbon */}
              <rect x="25" y="40" width="50" height="8" fill="#EF4444" />
              {/* Ribbon Bow Left */}
              <path d="M48 30 C35 15, 30 25, 48 30 Z" fill="#EF4444" />
              {/* Ribbon Bow Right */}
              <path d="M52 30 C65 15, 70 25, 52 30 Z" fill="#EF4444" />
            </svg>
          </div>
        </div>


      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-border-color p-4 flex justify-around items-center z-40 shadow-lg rounded-t-3xl overflow-visible lg:hidden">
        <button 
          onClick={() => navigate('/dashboard')}
          className="flex flex-col items-center text-text-secondary hover:text-brand-blue cursor-pointer transition-colors"
        >
          <HomeIcon className="h-6 w-6" />
          <span className="text-xs font-semibold mt-0.5">Home</span>
        </button>
        <button 
          onClick={() => navigate('/categories')}
          className="flex flex-col items-center text-text-secondary hover:text-brand-blue cursor-pointer transition-colors"
        >
          <LayoutGrid className="h-6 w-6" />
          <span className="text-xs font-semibold mt-0.5">Categories</span>
        </button>

        <button 
          onClick={() => navigate('/buy')}
          className="flex flex-col items-center text-text-secondary hover:text-brand-blue cursor-pointer transition-colors"
        >
          <ShoppingCart className="h-6 w-6" />
          <span className="text-xs font-semibold mt-0.5">Buy</span>
        </button>

        <button 
          onClick={() => navigate('/bookings')}
          className="flex flex-col items-center text-text-secondary hover:text-brand-blue cursor-pointer transition-colors"
        >
          <Calendar className="h-6 w-6" />
          <span className="text-xs font-semibold mt-0.5">Bookings</span>
        </button>
        <button 
          onClick={() => navigate('/profile')}
          className="flex flex-col items-center text-brand-blue cursor-pointer transition-colors"
        >
          <User className="h-6 w-6" />
          <span className="text-xs font-semibold mt-0.5">Account</span>
        </button>
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
