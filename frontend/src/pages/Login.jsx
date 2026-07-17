import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, Mail, Lock, ShieldCheck, User } from 'lucide-react';
import logo from '../assets/nigam-care.png';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../lib/apiClient';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [usePhone, setUsePhone] = useState(true);
  const [isSignup, setIsSignup] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    if (isSignup) return; // Signup is not wired to the backend in this pass — see PHASE13_INTEGRATION.md.

    const form = new FormData(e.currentTarget);
    const identifier = (form.get('identifier') || '').trim();
    const password = form.get('password');

    setError('');
    setSubmitting(true);
    try {
      const { destination } = await login({ role: 'customer', identifier, password });
      navigate('/verify-otp', { state: { destination, role: 'customer', identifier } });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      
      {/* Background Decorative Blurs */}
      <div className="absolute top-[-100px] left-[-100px] w-[300px] h-[300px] bg-[#0D47A1] opacity-10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-[-100px] right-[-100px] w-[300px] h-[300px] bg-[#FFD600] opacity-20 rounded-full blur-3xl"></div>

      <div className="w-full max-w-md bg-white/80 backdrop-blur-xl rounded-[30px] shadow-[0_20px_50px_rgba(13,71,161,0.05)] border border-white/50 overflow-hidden flex flex-col pt-2 px-4 pb-4 relative z-10">
        
        {/* Header */}
        <div className="flex items-center mb-0">
          <button 
            onClick={() => navigate('/')}
            className="p-2 hover:bg-white rounded-full transition-all shadow-sm border border-transparent hover:border-slate-100"
          >
            <ArrowLeft className="h-5 w-5 text-[#0D47A1]" />
          </button>
        </div>

        {/* Logo/Brand */}
        <div className="flex flex-col items-center mb-2">
          <img src={logo} alt="Nigam Care" className="h-14 w-auto" />
        </div>

        {/* Title */}
        <div className="text-center mb-2">
          <h1 className="text-lg font-bold text-text-primary mb-1">
            {isSignup ? "Create Account" : "Welcome Back"}
          </h1>
          <p className="text-text-secondary text-xs">
            {isSignup ? "Fill in the details to get started." : "Enter your details to access your account."}
          </p>
        </div>

        {/* Toggle Phone/Email */}
        <div className="flex bg-slate-100/80 rounded-2xl p-1 mb-2 border border-slate-100">
          <button
            className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all ${
              usePhone ? 'bg-white text-[#0D47A1] shadow-sm' : 'text-text-secondary hover:text-text-primary'
            }`}
            onClick={() => setUsePhone(true)}
          >
            Phone Number
          </button>
          <button
            className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all ${
              !usePhone ? 'bg-white text-[#0D47A1] shadow-sm' : 'text-text-secondary hover:text-text-primary'
            }`}
            onClick={() => setUsePhone(false)}
          >
            Email Address
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="flex flex-col gap-2">
          {isSignup && (
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-text-secondary" />
              <input
                type="text"
                placeholder="Enter Full Name"
                className="w-full pl-12 pr-4 py-2 bg-white/50 border border-slate-200 rounded-2xl focus:border-[#0D47A1] focus:ring-1 focus:ring-[#0D47A1] outline-none transition-all text-sm shadow-sm focus:shadow-md"
                required
              />
            </div>
          )}
          {usePhone ? (
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-text-secondary" />
              <input
                type="tel"
                name="identifier"
                placeholder="Enter Phone Number"
                className="w-full pl-12 pr-4 py-2 bg-white/50 border border-slate-200 rounded-2xl focus:border-[#0D47A1] focus:ring-1 focus:ring-[#0D47A1] outline-none transition-all text-sm shadow-sm focus:shadow-md"
                required
                defaultValue="9876543210"
              />
            </div>
          ) : (
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-text-secondary" />
              <input
                type="email"
                name="identifier"
                placeholder="Enter Email Address"
                className="w-full pl-12 pr-4 py-2 bg-white/50 border border-slate-200 rounded-2xl focus:border-[#0D47A1] focus:ring-1 focus:ring-[#0D47A1] outline-none transition-all text-sm shadow-sm focus:shadow-md"
                required
                defaultValue="user@example.com"
              />
            </div>
          )}

          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-text-secondary" />
            <input
              type="password"
              name="password"
              placeholder="Enter Password"
              className="w-full pl-12 pr-4 py-2 bg-white/50 border border-slate-200 rounded-2xl focus:border-[#0D47A1] focus:ring-1 focus:ring-[#0D47A1] outline-none transition-all text-sm shadow-sm focus:shadow-md"
              required
              defaultValue="password123"
            />
          </div>

          {error && (
            <p className="text-xs font-semibold text-red-600 text-center">{error}</p>
          )}

          <button
            type="button"
            onClick={() => navigate('/forgot-password')}
            className="text-xs font-semibold text-[#0D47A1] self-end hover:text-blue-800 transition-colors"
          >
            Forgot Password?
          </button>

          {/* Action Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-gradient-to-r from-[#FFD600] to-[#FFCA00] text-[#0D47A1] font-bold py-2 rounded-2xl hover:shadow-lg hover:shadow-yellow-400/20 transition-all transform hover:-translate-y-0.5 mt-1 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
          >
            {isSignup ? "Sign Up" : submitting ? "Logging in…" : "Login"}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-2 text-center text-xs text-text-secondary">
          {isSignup ? "Already have an account? " : "Don't have an account? "}
          <button 
            type="button"
            onClick={() => setIsSignup(!isSignup)}
            className="font-bold text-[#0D47A1] hover:text-blue-800 transition-colors"
          >
            {isSignup ? "Login" : "Sign Up"}
          </button>
        </div>

      </div>
    </div>
  );
};

export default Login;
