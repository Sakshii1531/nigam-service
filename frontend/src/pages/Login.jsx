import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Phone, Mail, Lock, ShieldCheck, User, Gift, Eye, EyeOff, Navigation, MapPin, Loader2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAppLogo } from '../context/LogoContext';
import { ApiError } from '../lib/apiClient';
import SearchableSelect from '../components/common/SearchableSelect';
import { STATE_CITIES, INDIAN_STATES, normalizeStateName } from '../utils/indiaGeoData';

const Login = ({ initialSignup = false }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { login, signupCheck } = useAuth();
  const { logoUrl, rawLogoUrl } = useAppLogo();

  const isSignupRoute = location.pathname === '/signup' || initialSignup;
  const [isSignup, setIsSignup] = useState(location.state?.isSignup || isSignupRoute || false);
  const [usePhone, setUsePhone] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Location detection states
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [locationStatus, setLocationStatus] = useState('');

  // Sync signup toggle if route changes
  useEffect(() => {
    if (location.pathname === '/signup' || initialSignup) {
      setIsSignup(true);
    }
  }, [location.pathname, initialSignup]);

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
    state: location.state?.signupData?.state || 'Delhi NCR',
    city: location.state?.signupData?.city || 'Delhi',
    address: location.state?.signupData?.streetAddress || location.state?.signupData?.address?.split(' (City:')[0] || '',
    latitude: location.state?.signupData?.latitude || null,
    longitude: location.state?.signupData?.longitude || null,
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

  const resolveAndFillAddress = async (latitude, longitude, hintCity = '', hintState = '') => {
    let resolvedAddress = '';
    let resolvedCity = hintCity;
    let resolvedState = hintState;

    // 1. Google Maps Geocoding API using VITE_GOOGLE_MAPS_API_KEY
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (apiKey && latitude && longitude) {
      try {
        const res = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`
        );
        const data = await res.json();
        if (data.status === 'OK' && data.results && data.results.length > 0) {
          const result = data.results[0];
          resolvedAddress = result.formatted_address || '';

          for (const comp of result.address_components) {
            if (comp.types.includes('locality') || comp.types.includes('administrative_area_level_2')) {
              if (!resolvedCity) resolvedCity = comp.long_name;
            }
            if (comp.types.includes('administrative_area_level_1')) {
              resolvedState = comp.long_name;
            }
          }
        }
      } catch (gErr) {
        console.warn('[geocode:google] Error calling Google Maps Geocoding API:', gErr);
      }
    }

    // 2. OpenStreetMap Nominatim reverse geocode fallback
    if (!resolvedAddress && latitude && longitude) {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
        );
        const data = await res.json();
        if (data) {
          resolvedAddress = data.display_name || '';
          if (!resolvedCity) {
            resolvedCity = data.address?.city || data.address?.town || data.address?.district || data.address?.county || '';
          }
          if (!resolvedState) {
            resolvedState = data.address?.state || '';
          }
        }
      } catch (nErr) {
        console.warn('[geocode:nominatim] Error calling Nominatim fallback:', nErr);
      }
    }

    // 3. Fallback to hint city/state if address is still blank
    if (!resolvedAddress && (resolvedCity || resolvedState)) {
      resolvedAddress = `${resolvedCity ? resolvedCity + ', ' : ''}${resolvedState || ''}`.trim();
    }

    // Match resolved state to STATE_CITIES keys
    let matchedState = '';
    if (resolvedState) {
      const cleanState = resolvedState.toLowerCase().replace(/state|pradesh|ncr/g, '').trim();
      const foundState = Object.keys(STATE_CITIES).find(
        (st) =>
          st.toLowerCase() === resolvedState.toLowerCase() ||
          st.toLowerCase().includes(cleanState) ||
          resolvedState.toLowerCase().includes(st.toLowerCase())
      );
      if (foundState) matchedState = foundState;
    }

    // Match resolved city to state cities
    let matchedCity = '';
    const activeState = matchedState || signupForm.state;
    const stateCities = STATE_CITIES[activeState] || [];
    if (resolvedCity) {
      const cleanCity = resolvedCity.toLowerCase().trim();
      const foundCity = stateCities.find(
        (ct) =>
          ct.toLowerCase() === cleanCity ||
          ct.toLowerCase().includes(cleanCity) ||
          cleanCity.includes(ct.toLowerCase())
      );
      if (foundCity) {
        matchedCity = foundCity;
      } else if (stateCities.length > 0) {
        matchedCity = stateCities[0];
      }
    }

    setSignupForm((prev) => ({
      ...prev,
      state: matchedState || prev.state,
      city: matchedCity || (matchedState ? (STATE_CITIES[matchedState] || ['Other'])[0] : prev.city),
      address: resolvedAddress || prev.address || (latitude ? `${latitude.toFixed(6)}, ${longitude.toFixed(6)}` : ''),
      latitude: latitude !== undefined && latitude !== null ? Number(latitude) : prev.latitude,
      longitude: longitude !== undefined && longitude !== null ? Number(longitude) : prev.longitude,
    }));

    setFieldErrors((prev) => ({ ...prev, address: '' }));
    setLocationStatus('Address detected and filled successfully!');
    setTimeout(() => setLocationStatus(''), 5000);
  };

  const handleDetectLocation = async () => {
    setDetectingLocation(true);
    setError('');
    setLocationStatus('');

    // Strategy 1: Browser Geolocation (with enableHighAccuracy: false so Mac laptops without GPS don't timeout)
    if (navigator.geolocation) {
      try {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            resolve,
            reject,
            { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
          );
        });

        if (position && position.coords) {
          await resolveAndFillAddress(position.coords.latitude, position.coords.longitude);
          setDetectingLocation(false);
          return;
        }
      } catch (browserErr) {
        console.warn('[geolocation:browser] Browser position unavailable, using IP fallback:', browserErr);
      }
    }

    // Strategy 2: Fast IP Geolocation fallback (works reliably on Macs/desktops without GPS)
    try {
      let ipData = null;
      try {
        const res = await fetch('https://ipwho.is/');
        const data = await res.json();
        if (data && data.success) {
          ipData = {
            latitude: data.latitude,
            longitude: data.longitude,
            city: data.city,
            region: data.region
          };
        }
      } catch (e1) {
        // try secondary provider
      }

      if (!ipData) {
        try {
          const res = await fetch('https://freeipapi.com/api/json');
          const data = await res.json();
          if (data && data.latitude) {
            ipData = {
              latitude: data.latitude,
              longitude: data.longitude,
              city: data.cityName,
              region: data.regionName
            };
          }
        } catch (e2) {
          // both failed
        }
      }

      if (ipData && ipData.latitude && ipData.longitude) {
        await resolveAndFillAddress(ipData.latitude, ipData.longitude, ipData.city, ipData.region);
        setDetectingLocation(false);
        return;
      }
    } catch (ipErr) {
      console.warn('[geolocation:ip] IP fallback failed:', ipErr);
    }

    setDetectingLocation(false);
    setError('Unable to detect location. Please type your address manually.');
  };

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
      errors.address = 'Street address is required';
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
        state: signupForm.state,
        city: signupForm.city,
        streetAddress: signupForm.address.trim(),
        latitude: signupForm.latitude !== null && signupForm.latitude !== undefined ? Number(signupForm.latitude) : undefined,
        longitude: signupForm.longitude !== null && signupForm.longitude !== undefined ? Number(signupForm.longitude) : undefined,
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
              state: signupForm.state,
              city: signupForm.city,
              streetAddress: signupForm.address.trim(),
              address: formattedAddress,
              latitude: signupForm.latitude !== null && signupForm.latitude !== undefined ? Number(signupForm.latitude) : undefined,
              longitude: signupForm.longitude !== null && signupForm.longitude !== undefined ? Number(signupForm.longitude) : undefined,
              referralCode: signupForm.referralCode.trim() || undefined
            }
          }
        });
      }
    } catch (err) {
      const errType = err?.details?.errorType;
      const errMsg = err?.message || 'Something went wrong. Please try again.';
      if (errType === 'both') {
        setError('An account with this phone number and email already exists.');
        setFieldErrors(prev => ({
          ...prev,
          phone: 'This number is already registered, kindly login or use another number',
          email: 'This email already exists, kindly login or enter a different email'
        }));
      } else if (errType === 'phone') {
        setError('This number is already registered. Kindly login or use another number.');
        setFieldErrors(prev => ({
          ...prev,
          phone: 'This number is already registered, kindly login or use another number'
        }));
      } else if (errType === 'email') {
        setError('This email already exists. Kindly login or enter a different email.');
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
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-extrabold text-[#0D47A1] uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin size={13} /> Location & Address
                </span>
                
                {/* Detect Location Button using Google Maps Geocoding API */}
                <button
                  type="button"
                  onClick={handleDetectLocation}
                  disabled={detectingLocation}
                  title="Detect current location using GPS & Google Maps"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold text-[#0D47A1] bg-[#E3ECF9] hover:bg-[#D3E3F8] active:scale-95 rounded-lg transition-all shadow-xs disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {detectingLocation ? (
                    <>
                      <Loader2 size={12} className="animate-spin text-[#0D47A1]" />
                      <span>Detecting...</span>
                    </>
                  ) : (
                    <>
                      <Navigation size={12} className="text-[#0D47A1]" />
                      <span>Detect Location</span>
                    </>
                  )}
                </button>
              </div>

              {locationStatus && (
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 rounded-lg animate-in fade-in">
                  <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                  <span>{locationStatus}</span>
                </div>
              )}

              {/* State & City Searchable Dropdowns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                <SearchableSelect
                  label="State *"
                  value={signupForm.state}
                  options={Object.keys(STATE_CITIES)}
                  onChange={(st) => {
                    const cities = STATE_CITIES[st] || ['Other'];
                    setSignupForm({ ...signupForm, state: st, city: cities[0] });
                  }}
                  placeholder="Select or search state..."
                />
                
                <SearchableSelect
                  label="City *"
                  value={signupForm.city}
                  options={STATE_CITIES[signupForm.state] || ['Other']}
                  onChange={(ct) => setSignupForm({ ...signupForm, city: ct })}
                  placeholder="Select or search city..."
                />
              </div>

              {/* Street Address Input */}
              <div className="flex flex-col gap-1 text-left">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Street Address (House/Flat No., Road, Landmark) *</label>
                </div>
                <div className="relative">
                  <textarea
                    rows={2}
                    value={signupForm.address}
                    onChange={(e) => {
                      setSignupForm({ ...signupForm, address: e.target.value });
                      if (fieldErrors.address) setFieldErrors(prev => ({ ...prev, address: '' }));
                    }}
                    placeholder="e.g. Flat 402, Sunshine Heights, Near City Mall"
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
