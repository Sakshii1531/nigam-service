import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  ChevronRight, 
  Heart, 
  Headphones, 
  Sparkles, 
  FileText, 
  CreditCard, 
  Wallet,
  Package,
  Gift,
  Home as HomeIcon,
  ShoppingCart,
  Calendar,
  Wrench,
  User
} from 'lucide-react';

const Profile = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F1F3F6] flex flex-col pb-24">
      
      {/* Header */}
      <div className="bg-white px-3 py-3 border-b border-slate-200/60 flex items-center gap-3 sticky top-0 z-50 shadow-sm">
        <button 
          onClick={() => navigate(-1)}
          className="p-1 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4.5 w-4.5 text-[#212121]" />
        </button>
        <h1 className="text-sm font-bold text-[#212121]">Account</h1>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col gap-2.5 overflow-y-auto">
        
        {/* Plus Gold Banner */}
        <div className="mx-2.5 mt-2.5 bg-[#F0F5FE] border border-[#D0E2FF]/80 p-3.5 rounded-lg flex flex-col gap-3 relative shadow-sm">
          <div className="flex justify-between items-start">
            <div className="flex flex-col">
              <h2 className="text-[13px] font-bold text-[#212121]">Sakshi Dwivedi</h2>
              <p className="text-[10px] text-slate-500 mt-0.5">Congratulations on your journey to Plus</p>
            </div>
            {/* Gold coin capsule */}
            <div className="flex items-center gap-0.5 bg-[#FFF9C4] border border-[#FFD54F] px-2 py-0.5 rounded-full shadow-sm">
              <span className="text-amber-500 text-[10px] font-bold">⚡</span>
              <span className="text-slate-800 text-[10px] font-extrabold">0</span>
            </div>
          </div>
          
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-600">
              <span>Unlock early access with</span>
              <span className="text-amber-600 flex items-center gap-0.5 ml-1">
                <Sparkles className="h-3 w-3 fill-amber-500 text-amber-500 inline" />
                Plus Gold
              </span>
            </div>
            <button className="self-start bg-black hover:bg-slate-900 text-white text-[9px] font-bold px-2.5 py-1.5 rounded-md transition-all shadow-md cursor-pointer">
              Unlock Plus Gold
            </button>
          </div>
        </div>

        {/* 2x2 Grid of Quick Actions */}
        <div className="mx-2.5 grid grid-cols-2 gap-2">
          {/* Rewards */}
          <div className="bg-white border border-slate-200/60 py-2.5 px-3 rounded-md flex items-center gap-2.5 shadow-sm hover:border-[#2874F0] transition-colors cursor-pointer">
            <Package className="h-[18px] w-[18px] text-[#2874F0]" />
            <span className="text-[11px] font-semibold text-[#212121]">Rewards</span>
          </div>

          {/* Wishlist */}
          <div className="bg-white border border-slate-200/60 py-2.5 px-3 rounded-md flex items-center gap-2.5 shadow-sm hover:border-[#2874F0] transition-colors cursor-pointer">
            <Heart className="h-[18px] w-[18px] text-[#2874F0]" />
            <span className="text-[11px] font-semibold text-[#212121]">Wishlist</span>
          </div>

          {/* Coupons */}
          <div className="bg-white border border-slate-200/60 py-2.5 px-3 rounded-md flex items-center gap-2.5 shadow-sm hover:border-[#2874F0] transition-colors cursor-pointer">
            <Gift className="h-[18px] w-[18px] text-[#2874F0]" />
            <span className="text-[11px] font-semibold text-[#212121]">Coupons</span>
          </div>

          {/* Help Center */}
          <div className="bg-white border border-slate-200/60 py-2.5 px-3 rounded-md flex items-center gap-2.5 shadow-sm hover:border-[#2874F0] transition-colors cursor-pointer">
            <Headphones className="h-[18px] w-[18px] text-[#2874F0]" />
            <span className="text-[11px] font-semibold text-[#212121]">Help Center</span>
          </div>
        </div>

        {/* Email Verification Banner */}
        <div className="bg-white border-y border-slate-200/60 py-2.5 px-3.5 flex items-center justify-between gap-2.5 shadow-sm">
          <div className="flex items-center gap-2.5">
            {/* Custom SVG replicating the yellow envelope illustration in the screenshot */}
            <div className="flex-shrink-0">
              <svg width="34" height="24" viewBox="0 0 40 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="40" height="28" rx="4" fill="#FFE082" />
                <path d="M2 4L18.2 16.15C19.28 16.96 20.72 16.96 21.8 16.15L38 4" stroke="#FFB300" strokeWidth="2" strokeLinecap="round" />
                <path d="M2 24L14 15" stroke="#FFB300" strokeWidth="2" strokeLinecap="round" />
                <path d="M38 24L26 15" stroke="#FFB300" strokeWidth="2" strokeLinecap="round" />
                <circle cx="6" cy="14" r="3" fill="#FFF59D" />
                <line x1="12" y1="14" x2="22" y2="14" stroke="#FFE082" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                <span className="text-[11px] font-bold text-[#212121]">Add/Verify your Email</span>
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
              </div>
              <span className="text-[9px] text-slate-500 mt-0.5">Get latest updates of your orders</span>
            </div>
          </div>
          <button className="bg-[#2874F0] hover:bg-blue-600 text-white text-[10px] font-bold px-3 py-1 rounded-[4px] shadow-sm transition-colors cursor-pointer">
            Update
          </button>
        </div>

        {/* Finance Options Section */}
        <div className="flex flex-col gap-1 mt-1">
          <h3 className="px-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Finance Options
          </h3>
          <div className="bg-white border-y border-slate-200/60 flex flex-col shadow-sm">
            {/* Personal Loan */}
            <div className="p-3.5 flex items-center justify-between gap-2.5 hover:bg-slate-50 transition-colors border-b border-slate-100 cursor-pointer">
              <div className="flex items-center gap-2.5">
                <FileText className="h-[17px] w-[17px] text-[#2874F0] flex-shrink-0" />
                <div className="flex flex-col">
                  <span className="text-[11px] font-semibold text-[#212121]">Nigam Personal Loan upto ₹10,00,000</span>
                  <span className="text-[9px] text-slate-400 mt-0.5">Loan Mela is Live: FREE ₹250 Voucher</span>
                </div>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            </div>

            {/* Nigam EMI */}
            <div className="p-3.5 flex items-center justify-between gap-2.5 hover:bg-slate-50 transition-colors border-b border-slate-100 cursor-pointer">
              <div className="flex items-center gap-2.5">
                <CreditCard className="h-[17px] w-[17px] text-[#2874F0] flex-shrink-0" />
                <div className="flex flex-col">
                  <span className="text-[11px] font-semibold text-[#212121]">Nigam EMI | Get 10% off up to ₹1,00,000</span>
                  <span className="text-[9px] text-slate-400 mt-0.5">No Cost EMI* | Unlock ₹1 lakh</span>
                </div>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            </div>

            {/* Credit Card */}
            <div className="p-3.5 flex items-center justify-between gap-2.5 hover:bg-slate-50 transition-colors cursor-pointer">
              <div className="flex items-center gap-2.5">
                <CreditCard className="h-[17px] w-[17px] text-[#2874F0] flex-shrink-0" />
                <div className="flex flex-col">
                  <span className="text-[11px] font-semibold text-[#212121]">Apply Now for Nigam Axis Bank Credit Card</span>
                  <span className="text-[9px] text-slate-400 mt-0.5">ZERO JOINING FEE | ₹1,000 Gift Vouchers</span>
                </div>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            </div>
          </div>
        </div>

        {/* Finance On UPI Section */}
        <div className="flex flex-col gap-1 mt-1">
          <h3 className="px-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Finance On UPI
          </h3>
          <div className="bg-white border-y border-slate-200/60 flex flex-col shadow-sm">
            <div className="p-3.5 flex items-center justify-between gap-2.5 hover:bg-slate-50 transition-colors cursor-pointer">
              <div className="flex items-center gap-2.5">
                <Wallet className="h-[17px] w-[17px] text-[#2874F0] flex-shrink-0" />
                <div className="flex flex-col">
                  <span className="text-[11px] font-semibold text-[#212121]">superCard | Buy Now Pay later in 3</span>
                  <span className="text-[9px] text-slate-400 mt-0.5">Enjoy 3% cashback | Activate Nigam UPI and pay in 3 months</span>
                </div>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            </div>
          </div>
        </div>

      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-border-color p-4 flex justify-around items-center z-40">
        <button 
          onClick={() => navigate('/dashboard')}
          className="flex flex-col items-center text-text-secondary hover:text-brand-blue"
        >
          <HomeIcon className="h-6 w-6" />
          <span className="text-xs font-medium">Home</span>
        </button>
        <button 
          onClick={() => navigate('/buy')}
          className="flex flex-col items-center text-text-secondary hover:text-brand-blue"
        >
          <ShoppingCart className="h-6 w-6" />
          <span className="text-xs font-medium">Buy</span>
        </button>
        <button 
          onClick={() => navigate('/bookings')}
          className="flex flex-col items-center text-text-secondary hover:text-brand-blue"
        >
          <Calendar className="h-6 w-6" />
          <span className="text-xs font-medium">Bookings</span>
        </button>
        <button 
          onClick={() => navigate('/services')}
          className="flex flex-col items-center text-text-secondary hover:text-brand-blue"
        >
          <Wrench className="h-6 w-6" />
          <span className="text-xs font-medium">Services</span>
        </button>
        <button className="flex flex-col items-center text-brand-blue">
          <User className="h-6 w-6" />
          <span className="text-xs font-medium">Profile</span>
        </button>
      </div>

    </div>
  );
};

export default Profile;
