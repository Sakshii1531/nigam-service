import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Phone, Mail, Lock, ShieldCheck, User, Gift, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAppLogo } from '../context/LogoContext';
import { ApiError } from '../lib/apiClient';

const STATE_CITIES = {
  'Delhi NCR': ['Delhi', 'Noida', 'Gurgaon', 'Ghaziabad', 'Faridabad'],
  'Andhra Pradesh': ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Nellore', 'Tirupati', 'Kakinada', 'Kurnool', 'Rajahmundry'],
  'Arunachal Pradesh': ['Itanagar', 'Naharlagun', 'Pasighat', 'Tawang'],
  'Assam': ['Guwahati', 'Silchar', 'Dibrugarh', 'Jorhat', 'Nagaon', 'Tinsukia', 'Tezpur'],
  'Bihar': ['Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur', 'Purnia', 'Darbhanga', 'Bihar Sharif', 'Arrah'],
  'Chhattisgarh': ['Raipur', 'Bhilai', 'Bilaspur', 'Korba', 'Durg', 'Rajnandgaon'],
  'Goa': ['Panaji', 'Margao', 'Vasco da Gama', 'Mapusa', 'Ponda'],
  'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar', 'Jamnagar', 'Gandhinagar', 'Junagadh'],
  'Haryana': ['Gurgaon', 'Faridabad', 'Panipat', 'Ambala', 'Yamunanagar', 'Rohtak', 'Hisar', 'Karnal'],
  'Himachal Pradesh': ['Shimla', 'Dharamshala', 'Mandi', 'Solan', 'Bilaspur', 'Kullu'],
  'Jharkhand': ['Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro', 'Hazaribagh', 'Deoghar'],
  'Karnataka': ['Bangalore', 'Mysore', 'Hubli-Dharwad', 'Mangalore', 'Belgaum', 'Gulbarga', 'Davangere', 'Bellary'],
  'Kerala': ['Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Thrissur', 'Kollam', 'Palakkad', 'Kannur', 'Alappuzha'],
  'Madhya Pradesh': ['Indore', 'Bhopal', 'Jabalpur', 'Gwalior', 'Ujjain', 'Sagar', 'Dewas', 'Satna', 'Ratlam'],
  'Maharashtra': ['Mumbai', 'Pune', 'Nagpur', 'Thane', 'Nashik', 'Kalyan-Dombivli', 'Vasai-Virar', 'Aurangabad', 'Solapur', 'Amravati', 'Kolhapur'],
  'Manipur': ['Imphal', 'Churachandpur', 'Thoubal'],
  'Meghalaya': ['Shillong', 'Tura', 'Jowai'],
  'Mizoram': ['Aizawl', 'Lunglei', 'Champhai'],
  'Nagaland': ['Kohima', 'Dimapur', 'Mokokchung'],
  'Odisha': ['Bhubaneswar', 'Cuttack', 'Rourkela', 'Berhampur', 'Sambalpur', 'Puri', 'Balasore'],
  'Punjab': ['Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Bathinda', 'Mohali', 'Pathankot'],
  'Rajasthan': ['Jaipur', 'Jodhpur', 'Kota', 'Bikaner', 'Ajmer', 'Udaipur', 'Bhilwara', 'Alwar', 'Sikar'],
  'Sikkim': ['Gangtok', 'Namchi', 'Geyzing'],
  'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tiruppur', 'Erode', 'Vellore', 'Tirunelveli'],
  'Telangana': ['Hyderabad', 'Warangal', 'Nizamabad', 'Khammam', 'Karimnagar', 'Ramagundam', 'Mahbubnagar'],
  'Tripura': ['Agartala', 'Udaipur', 'Dharmanagar'],
  'Uttar Pradesh': ['Lucknow', 'Kanpur', 'Ghaziabad', 'Agra', 'Varanasi', 'Meerut', 'Prayagraj', 'Noida', 'Bareilly', 'Aligarh', 'Moradabad', 'Saharanpur', 'Gorakhpur'],
  'Uttarakhand': ['Dehradun', 'Haridwar', 'Roorkee', 'Haldwani', 'Rudrapur', 'Rishikesh', 'Nainital'],
  'West Bengal': ['Kolkata', 'Howrah', 'Durgapur', 'Asansol', 'Siliguri', 'Kharagpur', 'Bardhaman'],
  'Andaman and Nicobar Islands': ['Port Blair'],
  'Chandigarh': ['Chandigarh'],
  'Dadra and Nagar Haveli and Daman and Diu': ['Daman', 'Diu', 'Silvassa'],
  'Jammu and Kashmir': ['Srinagar', 'Jammu', 'Anantnag', 'Baramulla', 'Udhampur'],
  'Ladakh': ['Leh', 'Kargil'],
  'Lakshadweep': ['Kavaratti'],
  'Puducherry': ['Puducherry', 'Karaikal', 'Mahe', 'Yanam']
};

const Login = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { login, signupCheck } = useAuth();
  const { logoUrl, rawLogoUrl } = useAppLogo();

  const [isSignup, setIsSignup] = useState(location.state?.isSignup || false);
  const [usePhone, setUsePhone] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Password visibility state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Signup form fields state
  const [signupForm, setSignupForm] = useState({
    name: location.state?.signupData?.name || '',
    phone: location.state?.signupData?.phone || '',
    email: location.state?.signupData?.email || '',
    password: location.state?.signupData?.password || '',
    confirmPassword: location.state?.signupData?.password || '',
    state: 'Delhi NCR',
    city: 'Delhi',
    address: location.state?.signupData?.address?.split(' (City:')[0] || '',
    referralCode: location.state?.signupData?.referralCode || ''
  });

  // Validation field errors state
  const [fieldErrors, setFieldErrors] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    address: ''
  });

  const validateSignupForm = () => {
    const errors = {};
    
    // Name validation: characters only, no numbers
    if (!signupForm.name.trim()) {
      errors.name = 'Full name is required';
    } else if (!/^[A-Za-z\s]+$/.test(signupForm.name)) {
      errors.name = 'Name must contain only letters and spaces';
    }

    // Phone validation: fixed 10 digits
    if (!signupForm.phone) {
      errors.phone = 'Phone number is required';
    } else if (!/^\d{10}$/.test(signupForm.phone)) {
      errors.phone = 'Phone number must be exactly 10 digits';
    }

    // Email validation
    if (!signupForm.email) {
      errors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signupForm.email)) {
      errors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!signupForm.password) {
      errors.password = 'Password is required';
    } else if (signupForm.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    // Confirm password validation
    if (!signupForm.confirmPassword) {
      errors.confirmPassword = 'Confirm password is required';
    } else if (signupForm.password !== signupForm.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    // Address validation
    if (!signupForm.address.trim()) {
      errors.address = 'Full address is required';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (isSignup) return;

    const form = new FormData(e.currentTarget);
    const identifier = (form.get('identifier') || '').trim();
    const password = form.get('password');

    setError('');
    setSubmitting(true);
    try {
      const { destination } = await login({ role: 'customer', identifier, password });
      navigate('/verify-otp', { state: { destination, role: 'customer', identifier } });
    } catch (err) {
      setError(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({ name: '', phone: '', email: '', password: '', confirmPassword: '', address: '' });

    if (!validateSignupForm()) return;

    setSubmitting(true);
    try {
      const formattedAddress = `${signupForm.address.trim()} (City: ${signupForm.city}, State: ${signupForm.state})`;
      
      const response = await signupCheck({
        name: signupForm.name.trim(),
        phone: signupForm.phone,
        email: signupForm.email.trim(),
        password: signupForm.password,
        confirmPassword: signupForm.confirmPassword,
        address: formattedAddress,
        referralCode: signupForm.referralCode.trim() || undefined
      });

      if (response.status === 'otp_sent') {
        navigate('/verify-otp', {
          state: {
            destination: response.destination,
            role: 'customer',
            identifier: signupForm.phone,
            purpose: 'signup',
            signupData: {
              name: signupForm.name.trim(),
              phone: signupForm.phone,
              email: signupForm.email.trim(),
              password: signupForm.password,
              address: formattedAddress,
              referralCode: signupForm.referralCode.trim() || undefined
            }
          }
        });
      }
    } catch (err) {
      const errType = err?.details?.errorType;
      const errMsg = err?.message || 'Something went wrong. Please try again.';
      if (errType === 'both') {
        setError(errMsg);
        setFieldErrors(prev => ({
          ...prev,
          phone: 'This phone is already registered',
          email: 'This email is already registered'
        }));
      } else if (errType === 'phone') {
        setError(errMsg);
        setFieldErrors(prev => ({
          ...prev,
          phone: 'This number is already registered, kindly login or use another number'
        }));
      } else if (errType === 'email') {
        setError(errMsg);
        setFieldErrors(prev => ({
          ...prev,
          email: 'This email already exists, kindly login or enter a different email'
        }));
      } else {
        setError(errMsg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* Background Decorative Blurs */}
      <div className="absolute top-[-100px] left-[-100px] w-[300px] h-[300px] bg-[#0D47A1] opacity-10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-[-100px] right-[-100px] w-[300px] h-[300px] bg-[#FFD600] opacity-20 rounded-full blur-3xl"></div>

      {/* Form card wrapper */}
      <div className="w-full flex items-center justify-center p-4 lg:p-8 min-h-screen">

      <div className={`w-full ${isSignup ? 'max-w-xl' : 'max-w-md'} bg-white/90 backdrop-blur-xl rounded-[30px] shadow-[0_20px_50px_rgba(13,71,161,0.05)] border border-white/50 overflow-hidden flex flex-col p-8 relative z-10 transition-all duration-300`}>
        
        {/* Logo/Brand */}
        <div className="flex flex-col items-center mt-2 mb-4">
          <img src={logoUrl} alt="Nigam Care" className="h-16 w-auto" />
        </div>

        {/* Title */}
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold text-slate-800 mb-1">
            {isSignup ? "Create Customer Account" : "Welcome Back"}
          </h1>
          <p className="text-slate-500 text-xs">
            {isSignup ? "Fill in the required fields to verify and register." : "Enter your credentials to access your account."}
          </p>
        </div>

        {error && (
          <div className="mb-4 bg-rose-50 border border-rose-100 rounded-2xl p-3.5 text-center text-xs font-bold text-rose-600 animate-shake">
            ⚠️ {error}
          </div>
        )}

        {/* FORM */}
        {!isSignup ? (
          /* LOGIN FORM */
          <form onSubmit={handleLogin} className="flex flex-col gap-3">
            {/* Toggle Phone/Email */}
            <div className="flex bg-slate-100/80 rounded-2xl p-1 mb-1 border border-slate-100">
              <button
                type="button"
                className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all ${
                  usePhone ? 'bg-white text-[#0D47A1] shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
                onClick={() => setUsePhone(true)}
              >
                Phone Number
              </button>
              <button
                type="button"
                className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all ${
                  !usePhone ? 'bg-white text-[#0D47A1] shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
                onClick={() => setUsePhone(false)}
              >
                Email Address
              </button>
            </div>

            {usePhone ? (
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  type="tel"
                  name="identifier"
                  placeholder="Enter Phone Number"
                  className="w-full pl-12 pr-4 py-2.5 bg-white/50 border border-slate-200 rounded-2xl focus:border-[#0D47A1] focus:ring-1 focus:ring-[#0D47A1] outline-none transition-all text-sm shadow-xs focus:shadow-md"
                  required
                />
              </div>
            ) : (
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  type="email"
                  name="identifier"
                  placeholder="Enter Email Address"
                  className="w-full pl-12 pr-4 py-2.5 bg-white/50 border border-slate-200 rounded-2xl focus:border-[#0D47A1] focus:ring-1 focus:ring-[#0D47A1] outline-none transition-all text-sm shadow-xs focus:shadow-md"
                  required
                />
              </div>
            )}

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Enter Password"
                className="w-full pl-12 pr-11 py-2.5 bg-white/50 border border-slate-200 rounded-2xl focus:border-[#0D47A1] focus:ring-1 focus:ring-[#0D47A1] outline-none transition-all text-sm shadow-xs focus:shadow-md"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <button
              type="button"
              onClick={() => navigate('/forgot-password')}
              className="text-xs font-semibold text-[#0D47A1] self-end hover:text-blue-800 transition-colors"
            >
              Forgot Password?
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-gradient-to-r from-[#FFD600] to-[#FFCA00] text-[#0D47A1] font-bold py-3 rounded-2xl hover:shadow-lg hover:shadow-yellow-400/20 transition-all transform hover:-translate-y-0.5 mt-2 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? "Logging in…" : "Login"}
            </button>
          </form>
        ) : (
          /* REDESIGNED SIGNUP FORM */
          <form onSubmit={handleSignupSubmit} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Full Name Input */}
              <div className="flex flex-col gap-1 text-left">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Full Name *</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={signupForm.name}
                    onChange={(e) => setSignupForm({ ...signupForm, name: e.target.value })}
                    placeholder="Enter Full Name"
                    className={`w-full pl-10 pr-4 py-2.5 bg-white border ${fieldErrors.name ? 'border-rose-400 focus:ring-rose-400' : 'border-slate-200 focus:border-[#0D47A1]'} rounded-xl focus:ring-1 outline-none transition-all text-sm`}
                  />
                </div>
                {fieldErrors.name && (
                  <span className="text-[10px] font-semibold text-rose-500 mt-0.5">{fieldErrors.name}</span>
                )}
              </div>

              {/* Phone Number Input */}
              <div className="flex flex-col gap-1 text-left">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Phone Number (10 digits) *</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="tel"
                    maxLength={10}
                    value={signupForm.phone}
                    onChange={(e) => setSignupForm({ ...signupForm, phone: e.target.value.replace(/\D/g, '') })}
                    placeholder="Enter Phone Number"
                    className={`w-full pl-10 pr-4 py-2.5 bg-white border ${fieldErrors.phone ? 'border-rose-400 focus:ring-rose-400' : 'border-slate-200 focus:border-[#0D47A1]'} rounded-xl focus:ring-1 outline-none transition-all text-sm`}
                  />
                </div>
                {fieldErrors.phone && (
                  <span className="text-[10px] font-semibold text-rose-500 mt-0.5">{fieldErrors.phone}</span>
                )}
              </div>

            </div>

            {/* Email Address Input */}
            <div className="flex flex-col gap-1 text-left">
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Email Address *</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  value={signupForm.email}
                  onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                  placeholder="Enter Email Address"
                  className={`w-full pl-10 pr-4 py-2.5 bg-white border ${fieldErrors.email ? 'border-rose-400 focus:ring-rose-400' : 'border-slate-200 focus:border-[#0D47A1]'} rounded-xl focus:ring-1 outline-none transition-all text-sm`}
                />
              </div>
              {fieldErrors.email && (
                <span className="text-[10px] font-semibold text-rose-500 mt-0.5">{fieldErrors.email}</span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Password Input */}
              <div className="flex flex-col gap-1 text-left">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Password *</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={signupForm.password}
                    onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                    placeholder="Enter Password"
                    className={`w-full pl-10 pr-10 py-2.5 bg-white border ${fieldErrors.password ? 'border-rose-400 focus:ring-rose-400' : 'border-slate-200 focus:border-[#0D47A1]'} rounded-xl focus:ring-1 outline-none transition-all text-sm`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {fieldErrors.password && (
                  <span className="text-[10px] font-semibold text-rose-500 mt-0.5">{fieldErrors.password}</span>
                )}
              </div>

              {/* Confirm Password Input */}
              <div className="flex flex-col gap-1 text-left">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Confirm Password *</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={signupForm.confirmPassword}
                    onChange={(e) => setSignupForm({ ...signupForm, confirmPassword: e.target.value })}
                    placeholder="Confirm Password"
                    className={`w-full pl-10 pr-10 py-2.5 bg-white border ${fieldErrors.confirmPassword ? 'border-rose-400 focus:ring-rose-400' : 'border-slate-200 focus:border-[#0D47A1]'} rounded-xl focus:ring-1 outline-none transition-all text-sm`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {fieldErrors.confirmPassword && (
                  <span className="text-[10px] font-semibold text-rose-500 mt-0.5">{fieldErrors.confirmPassword}</span>
                )}
              </div>

            </div>

            {/* Location & Address Sector */}
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-[#0D47A1] uppercase tracking-wider">Location & Address</span>
              </div>

              {/* State & City Dropdowns */}
              <div className="grid grid-cols-2 gap-2 text-left">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">State *</label>
                  <select
                    value={signupForm.state}
                    onChange={(e) => {
                      const st = e.target.value;
                      const cities = STATE_CITIES[st] || ['Other'];
                      setSignupForm({ ...signupForm, state: st, city: cities[0] });
                    }}
                    className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-2 outline-none text-xs focus:border-[#0D47A1] transition-all"
                  >
                    {Object.keys(STATE_CITIES).map(st => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">City *</label>
                  <select
                    value={signupForm.city}
                    onChange={(e) => setSignupForm({ ...signupForm, city: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-2 outline-none text-xs focus:border-[#0D47A1] transition-all"
                  >
                    {(STATE_CITIES[signupForm.state] || ['Other']).map(ct => (
                      <option key={ct} value={ct}>{ct}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Full Address Input */}
              <div className="flex flex-col gap-1 text-left">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Street Address *</label>
                <div className="relative">
                  <textarea
                    rows={2}
                    value={signupForm.address}
                    onChange={(e) => setSignupForm({ ...signupForm, address: e.target.value })}
                    placeholder="Enter house/flat number, road, landmark"
                    className={`w-full p-2.5 bg-white border ${fieldErrors.address ? 'border-rose-400 focus:ring-rose-400' : 'border-slate-200 focus:border-[#0D47A1]'} rounded-xl focus:ring-1 outline-none transition-all text-xs resize-none`}
                  />
                </div>
                {fieldErrors.address && (
                  <span className="text-[10px] font-semibold text-rose-500 mt-0.5">{fieldErrors.address}</span>
                )}
              </div>
            </div>

            {/* Referral Code (Optional) */}
            <div className="flex flex-col gap-1 text-left">
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Referral Code (Optional)</label>
              <div className="relative">
                <Gift className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={signupForm.referralCode}
                  onChange={(e) => setSignupForm({ ...signupForm, referralCode: e.target.value })}
                  placeholder="Enter Referral Code"
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-[#0D47A1] focus:ring-1 focus:ring-[#0D47A1] outline-none transition-all text-sm"
                />
              </div>
            </div>

            {/* Action Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-gradient-to-r from-[#FFD600] to-[#FFCA00] text-[#0D47A1] font-bold py-3 rounded-2xl hover:shadow-lg hover:shadow-yellow-400/20 transition-all transform hover:-translate-y-0.5 mt-2 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <div className="w-5 h-5 border-2 border-[#0D47A1] border-t-transparent rounded-full animate-spin" />
              ) : (
                'Sign Up'
              )}
            </button>
          </form>
        )}

        {/* Footer */}
        <div className="mt-4 text-center text-xs text-slate-500 border-t border-slate-100 pt-3">
          {isSignup ? "Already have an account? " : "Don't have an account? "}
          <button 
            type="button"
            onClick={() => {
              setIsSignup(!isSignup);
              setError('');
              setFieldErrors({});
            }}
            className="font-bold text-[#0D47A1] hover:text-blue-800 transition-colors"
          >
            {isSignup ? "Login" : "Sign Up"}
          </button>
        </div>

      </div>
      </div>
    </div>
  );
};

export default Login;
