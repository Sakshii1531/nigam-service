import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight, Shield, Cpu, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Login = () => {
  const navigate = useNavigate();
  const { login: authLogin } = useAuth();
  const [formData, setFormData] = useState({
    email: 'admin123@gmail.com',
    password: 'admin123',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      const res = await authLogin({
        role: 'brand_admin',
        identifier: formData.email,
        password: formData.password
      });
      navigate('/brand-admin/verify-otp', {
        state: { 
          destination: res.destination || formData.email,
          identifier: formData.email,
          role: 'brand_admin'
        },
      });
    } catch (err) {
      setError(err.message || 'Invalid credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7FB] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full"
      >
        {/* Logo/Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-[#0D47A1] rounded-2xl shadow-sm mb-4">
            <Cpu className="text-white" size={28} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1 font-sans">Nigam Care</h1>
          <p className="text-gray-500 text-sm flex items-center justify-center gap-1">
            <Shield size={14} className="text-[#0D47A1]" /> Brand Portal
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white border border-gray-100 rounded-2xl p-8 shadow-sm">
          <div className="mb-6 text-center">
            <h2 className="text-xl font-semibold text-gray-800">Partner Login</h2>
            <p className="text-gray-500 text-sm mt-1">Enter your credentials to access the brand dashboard</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-xs text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  name="email"
                  className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#0D47A1] focus:ring-1 focus:ring-[#0D47A1] outline-none transition-all text-sm text-gray-900 placeholder-gray-400 animate-pulse-subtle"
                  placeholder="admin@brand.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1.5">
                <label className="text-sm font-medium text-gray-700">Password</label>
                <button type="button" onClick={() => navigate('/brand-admin/forgot-password')} className="text-xs text-[#0D47A1] hover:underline font-medium">Forgot Password?</button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock size={18} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  className="w-full pl-11 pr-11 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#0D47A1] focus:ring-1 focus:ring-[#0D47A1] outline-none transition-all text-sm text-gray-900 placeholder-gray-400"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-100 p-3.5 rounded-xl text-xs text-blue-700">
              <span className="font-semibold block mb-0.5">Demo Credentials Pre-filled:</span>
              <span>Email: admin123@gmail.com / Password: admin123</span>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#0D47A1] text-white font-semibold py-2.5 rounded-xl hover:bg-blue-700 transition-colors shadow-sm flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  Sign In
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-400 flex items-center justify-center gap-1">
            © 2026 Nigam Care. All rights reserved.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
