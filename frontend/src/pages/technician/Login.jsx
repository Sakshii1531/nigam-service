import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, Lock, ShieldCheck, Briefcase } from 'lucide-react';
import logo from '../../assets/nigam-care.png'; // Reusing logo if available, or text fallback

const TechLogin = () => {
  const navigate = useNavigate();
  const [usePhone, setUsePhone] = useState(true);

  const handleLogin = (e) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const raw = (form.get('identifier') || '').toString().trim();
    const digits = raw.replace(/\D/g, '');
    const destination = digits.length >= 6 ? `+91 ${digits.slice(0, 2)}•••••${digits.slice(-3)}` : raw || 'EMP•••45';
    navigate('/technician/verify-otp', { state: { destination } });
  };

  return (
    <div className="min-h-screen bg-[#F4F6F8] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      
      {/* Background Decorative Blurs */}
      <div className="absolute top-[-100px] left-[-100px] w-[300px] h-[300px] bg-[#0D47A1] opacity-10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-[-100px] right-[-100px] w-[300px] h-[300px] bg-[#FFD600] opacity-20 rounded-full blur-3xl"></div>

      <div className="w-full max-w-md bg-white rounded-[30px] shadow-[0_20px_50px_rgba(5,150,105,0.05)] border border-slate-100 overflow-hidden flex flex-col pt-4 px-6 pb-4 relative z-10">
        
        {/* Header */}
        <div className="flex items-center mb-2">
          <button 
            onClick={() => navigate('/')}
            className="p-2 hover:bg-slate-50 rounded-full transition-all border border-transparent hover:border-slate-100"
          >
            <ArrowLeft className="h-5 w-5 text-[#0D47A1]" />
          </button>
          <span className="text-xs font-semibold text-[#0D47A1] ml-2 uppercase tracking-wider">Technician Portal</span>
        </div>

        {/* Logo/Brand */}
        <div className="flex flex-col items-center mb-2">
          <div className="w-12 h-12 bg-[#E3ECF9] rounded-2xl flex items-center justify-center mb-1">
            <Briefcase className="h-6 w-6 text-[#0D47A1]" />
          </div>
          <h1 className="text-lg font-semibold text-slate-900">Partner Login</h1>
          <p className="text-slate-500 text-xs mt-1">Access your job dashboard and earnings</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="flex flex-col gap-3">
          
          {/* Input Field (Phone or ID) */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Technician ID / Phone</label>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                name="identifier"
                placeholder="Enter your ID or Phone"
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:border-[#0D47A1] focus:ring-1 focus:ring-[#0D47A1] outline-none transition-all text-sm"
                required
                defaultValue="EMP12345"
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="password"
                placeholder="Enter Password"
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:border-[#0D47A1] focus:ring-1 focus:ring-[#0D47A1] outline-none transition-all text-sm"
                required
                defaultValue="password123"
              />
            </div>
          </div>

          {/* Forgot Password */}
          <button
            type="button"
            onClick={() => navigate('/technician/forgot-password')}
            className="text-xs font-semibold text-[#0D47A1] self-end hover:text-blue-800 transition-colors"
          >
            Forgot Password?
          </button>

          {/* Action Button */}
          <button
            type="submit"
            className="w-full bg-[#FFD600] text-[#0D47A1] font-semibold py-3.5 rounded-2xl hover:bg-yellow-400 transition-all transform hover:-translate-y-0.5 mt-2 active:scale-95 shadow-md shadow-yellow-400/10"
          >
            Login to Dashboard
          </button>
        </form>

        {/* Footer */}
        <div className="mt-4 text-center text-xs text-slate-500">
          Want to become a partner?{' '}
          <button 
            type="button"
            onClick={() => navigate('/technician/apply')}
            className="font-semibold text-[#0D47A1] hover:text-blue-800 transition-colors"
          >
            Apply Now
          </button>
        </div>

      </div>
    </div>
  );
};

export default TechLogin;
