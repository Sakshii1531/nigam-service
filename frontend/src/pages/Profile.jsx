import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, MapPin, CreditCard, HelpCircle, LogOut, ChevronRight } from 'lucide-react';

const Profile = () => {
  const navigate = useNavigate();

  const menuItems = [
    { icon: <MapPin className="h-5 w-5 text-[#0D47A1]" />, title: 'Saved Addresses' },
    { icon: <CreditCard className="h-5 w-5 text-[#0D47A1]" />, title: 'Payment Methods' },
    { icon: <HelpCircle className="h-5 w-5 text-[#0D47A1]" />, title: 'Help & Support' },
  ];

  return (
    <div className="min-h-screen bg-bg-light flex flex-col pb-20">
      
      {/* Header */}
      <div className="bg-[#E3ECF9] p-6 rounded-b-[30px] shadow-sm flex items-center gap-4">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 bg-white rounded-full shadow-sm hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-[#0D47A1]" />
        </button>
        <h1 className="text-xl font-bold text-text-primary">Profile</h1>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto">
        
        {/* User Info Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-border-color flex items-center gap-4">
          <div className="w-16 h-16 bg-[#0D47A1] rounded-full flex items-center justify-center text-white font-bold text-xl">
            U
          </div>
          <div>
            <h2 className="text-lg font-bold text-text-primary">User</h2>
            <p className="text-sm text-text-secondary">+91 9876543210</p>
            <span className="text-xs text-[#2E7D32] font-semibold bg-[#E8F5E9] px-2 py-0.5 rounded-full mt-1 inline-block">
              Premium Member
            </span>
          </div>
        </div>

        {/* Menu Items */}
        <div className="bg-white rounded-2xl shadow-sm border border-border-color overflow-hidden">
          {menuItems.map((item, index) => (
            <div 
              key={item.title}
              className={`p-4 flex justify-between items-center cursor-pointer hover:bg-slate-50 transition-colors ${index !== menuItems.length - 1 ? 'border-b border-border-color' : ''}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#E3ECF9]/50 rounded-xl flex items-center justify-center">
                  {item.icon}
                </div>
                <span className="text-sm font-semibold text-text-primary">{item.title}</span>
              </div>
              <ChevronRight className="h-5 w-5 text-text-secondary" />
            </div>
          ))}
        </div>

        {/* Logout Button */}
        <button 
          onClick={() => navigate('/login')}
          className="bg-white p-4 rounded-2xl shadow-sm border border-border-color flex items-center justify-center gap-2 text-red-500 font-semibold hover:bg-red-50 transition-colors"
        >
          <LogOut className="h-5 w-5" />
          <span>Logout</span>
        </button>

      </div>

    </div>
  );
};

export default Profile;
