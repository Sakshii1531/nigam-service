import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, Smartphone, ArrowRight, ShieldCheck, HelpCircle } from 'lucide-react';
import illustration from '../../assets/brand_login_illustration.png';

const Login = () => {
  const navigate = useNavigate();
  const [loginMethod, setLoginMethod] = useState('email'); // 'email' or 'otp'
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    phone: '',
    otp: ''
  });

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // For demo purposes, we just navigate to dashboard
    navigate('/brand-admin/dashboard');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4 md:p-8">
      <div className="max-w-6xl w-full bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col md:flex-row min-h-[600px]">
        
        {/* Left Side - Illustration & Branding */}
        <div className="w-full md:w-1/2 bg-[#0D47A1] p-8 md:p-12 flex flex-col justify-between text-white relative overflow-hidden">
          {/* Background shapes */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-800 rounded-full blur-3xl opacity-50 -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-900 rounded-full blur-3xl opacity-50 -ml-32 -mb-32"></div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-8">
              <div className="w-10 h-10 bg-[#FFD600] rounded-lg flex items-center justify-center text-[#0D47A1] font-bold text-xl">
                N
              </div>
              <span className="text-xl font-bold font-sans">Nigam Care</span>
              <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full text-white ml-2">Brand Portal</span>
            </div>
            
            <h1 className="text-3xl md:text-4xl font-bold mb-4 font-sans">Welcome Back!</h1>
            <p className="text-blue-100 max-w-md text-sm md:text-base">
              Manage your brand's warranty claims, service requests, and technician dispatch all in one secure place.
            </p>
          </div>
          
          <div className="relative z-10 flex justify-center items-center my-8">
            <img 
              src={illustration} 
              alt="Service Illustration" 
              className="w-full max-w-sm h-auto object-contain"
            />
          </div>
          
          <div className="relative z-10 flex justify-between items-center text-xs text-blue-200">
            <span>© 2026 Nigam Care Company</span>
            <a href="#" className="hover:text-white flex items-center gap-1">
              <HelpCircle size={14} /> Brand Support
            </a>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center">
          <div className="max-w-md w-full mx-auto">
            <div className="text-center md:text-left mb-8">
              <h2 className="text-2xl font-bold text-[#1E293B] mb-2 font-sans">Partner Login</h2>
              <p className="text-[#64748B] text-sm">Enter your credentials to access your brand dashboard.</p>
            </div>
            
            {/* Login Method Toggle */}
            <div className="flex bg-[#EEF4FF] p-1 rounded-xl mb-6">
              <button
                className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
                  loginMethod === 'email' 
                    ? 'bg-white text-[#0D47A1] shadow-sm' 
                    : 'text-[#64748B] hover:text-[#1E293B]'
                }`}
                onClick={() => setLoginMethod('email')}
              >
                Password Login
              </button>
              <button
                className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
                  loginMethod === 'otp' 
                    ? 'bg-white text-[#0D47A1] shadow-sm' 
                    : 'text-[#64748B] hover:text-[#1E293B]'
                }`}
                onClick={() => setLoginMethod('otp')}
              >
                OTP Verification
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              {loginMethod === 'email' ? (
                <>
                  <div>
                    <label className="text-sm font-medium text-[#1E293B] mb-1.5 block">Email Address</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#64748B]">
                        <Mail size={18} />
                      </div>
                      <input
                        type="email"
                        name="email"
                        className="w-full pl-11 pr-4 py-3 border border-[#E2E8F0] rounded-xl focus:ring-2 focus:ring-[#0D47A1] focus:border-[#0D47A1] outline-none transition-all text-sm"
                        placeholder="admin@brand.com"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-1.5">
                      <label className="text-sm font-medium text-[#1E293B]">Password</label>
                      <a href="#" className="text-xs text-[#0D47A1] hover:underline font-medium">Forgot Password?</a>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#64748B]">
                        <Lock size={18} />
                      </div>
                      <input
                        type="password"
                        name="password"
                        className="w-full pl-11 pr-4 py-3 border border-[#E2E8F0] rounded-xl focus:ring-2 focus:ring-[#0D47A1] focus:border-[#0D47A1] outline-none transition-all text-sm"
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="text-sm font-medium text-[#1E293B] mb-1.5 block">Phone Number</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#64748B]">
                        <Smartphone size={18} />
                      </div>
                      <input
                        type="tel"
                        name="phone"
                        className="w-full pl-11 pr-4 py-3 border border-[#E2E8F0] rounded-xl focus:ring-2 focus:ring-[#0D47A1] focus:border-[#0D47A1] outline-none transition-all text-sm"
                        placeholder="+91 98765 43210"
                        value={formData.phone}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-1.5">
                      <label className="text-sm font-medium text-[#1E293B]">OTP</label>
                      <button type="button" className="text-xs text-[#0D47A1] hover:underline font-medium">Resend OTP</button>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#64748B]">
                        <ShieldCheck size={18} />
                      </div>
                      <input
                        type="text"
                        name="otp"
                        className="w-full pl-11 pr-4 py-3 border border-[#E2E8F0] rounded-xl focus:ring-2 focus:ring-[#0D47A1] focus:border-[#0D47A1] outline-none transition-all text-sm tracking-widest"
                        placeholder="••••••"
                        value={formData.otp}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>
                </>
              )}
              
              <div className="flex items-center">
                <input
                  id="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-[#0D47A1] focus:ring-[#0D47A1] border-[#E2E8F0] rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-xs text-[#64748B]">
                  Remember this device
                </label>
              </div>
              
              <button
                type="submit"
                className="w-full bg-[#0D47A1] text-white font-semibold py-3 rounded-xl hover:bg-blue-700 transition-colors shadow-sm flex items-center justify-center gap-2 group"
              >
                Sign In to Dashboard
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </form>
            
            <div className="mt-8 text-center">
              <p className="text-xs text-[#64748B]">
                Need help? <a href="#" className="text-[#0D47A1] hover:underline font-medium">Contact Support</a> or reach out to your partner manager.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
