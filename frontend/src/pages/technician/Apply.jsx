import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Phone, Mail, Lock, Eye, EyeOff, Briefcase, MapPin, Check, ShieldCheck, ChevronDown, X } from 'lucide-react';
import { BOOKING_CATALOG } from '../../data/bookingCatalog';
import { apiRequest } from '../../lib/apiClient';

const TechApply = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    city: '',
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [selectedServices, setSelectedServices] = useState([]);
  const [isServicesDropdownOpen, setIsServicesDropdownOpen] = useState(false);
  const [serviceSearch, setServiceSearch] = useState('');
  const servicesDropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (servicesDropdownRef.current && !servicesDropdownRef.current.contains(event.target)) {
        setIsServicesDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Seeded empty on purpose.
  const [availableCities, setAvailableCities] = useState([]);
  const [citiesLoading, setCitiesLoading] = useState(true);
  
  const [availableServices, setAvailableServices] = useState([
    'AC Repair', 'Washing Machine', 'Electrician', 'Full Home Cleaning'
  ]);
  
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    // Strictly load cities & service categories configured in the Admin Panel
    async function loadFormMetadata() {
      try {
        // Use the public endpoint — no auth token required for technician registration
        const cityData = await apiRequest('/super-admin/cities/public');
        // The name is what /tech/register matches on; the state is shown beside
        // it so an applicant can tell two same-named cities apart.
        const cityList = (Array.isArray(cityData) ? cityData : [])
          .filter((c) => c?.name)
          .map((c) => ({ name: c.name, state: c.state || '' }));
        setAvailableCities(cityList);
        if (cityList.length > 0) {
          setForm(prev => ({ ...prev, city: cityList[0].name }));
        }
      } catch (err) {
        console.warn('Error reading admin operational cities:', err.message);
      } finally {
        setCitiesLoading(false);
      }

      try {
        // The services a technician can pick are the ones merchandised on the
        // customer home screen, read from the CMS rather than another browser's
        // localStorage — which only ever worked on the admin's own machine.
        let serviceList = [];
        const tiles = await apiRequest('/cms/home-tiles?placement=dashboard-service');
        serviceList = (tiles || []).map((t) => t.title).filter(Boolean);

        if (serviceList.length === 0) {
          const categories = await apiRequest('/catalog/categories');
          serviceList = (categories || []).map((c) => c.name).filter(Boolean);
        }

        // Deduplicate
        serviceList = [...new Set(serviceList)];

        if (serviceList.length > 0) {
          setAvailableServices(serviceList);
        }
      } catch (err) {
        console.warn('Error reading admin dashboard services:', err.message);
      }
    }

    loadFormMetadata();
  }, []);

  const validateForm = () => {
    const errors = {};

    // Full Name validation
    if (!form.name.trim()) {
      errors.name = 'Full name is required';
    } else if (!/^[A-Za-z\s]+$/.test(form.name.trim())) {
      errors.name = 'Name must contain only letters and spaces';
    } else if (form.name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters';
    }

    // Email validation
    if (!form.email.trim()) {
      errors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errors.email = 'Please enter a valid email address';
    }

    // Phone validation
    if (!form.phone.trim()) {
      errors.phone = 'Phone number is required';
    } else if (!/^\d{10}$/.test(form.phone.trim())) {
      errors.phone = 'Phone number must be exactly 10 digits';
    }

    // Password validation
    if (!form.password) {
      errors.password = 'Password is required';
    } else if (form.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    // Confirm Password validation
    if (!form.confirmPassword) {
      errors.confirmPassword = 'Confirm password is required';
    } else if (form.password !== form.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    // Services validation
    if (!selectedServices || selectedServices.length === 0) {
      errors.services = 'Please select at least one service';
    }

    // Operating City validation
    if (!form.city) {
      errors.city = 'Please select an operating city';
    }

    // Aadhar Card Photos validation
    if (!aadharFront) {
      errors.aadharFront = 'Aadhar front photo is required';
    }
    if (!aadharBack) {
      errors.aadharBack = 'Aadhar back photo is required';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e) => {
    setError('');
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const toggleService = (serviceName) => {
    let nextServices;
    if (selectedServices.includes(serviceName)) {
      nextServices = selectedServices.filter(s => s !== serviceName);
    } else {
      nextServices = [...selectedServices, serviceName];
    }
    setSelectedServices(nextServices);
    if (fieldErrors.services && nextServices.length > 0) {
      setFieldErrors(prev => ({ ...prev, services: '' }));
    }
  };

  const [aadharFront, setAadharFront] = useState(null);
  const [aadharFrontPreview, setAadharFrontPreview] = useState('');
  const [aadharBack, setAadharBack] = useState(null);
  const [aadharBackPreview, setAadharBackPreview] = useState('');
  const [uploading, setUploading] = useState(false);

  // Client-side WebP Image Converter helper
  const convertImageToWebP = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          canvas.toBlob((blob) => {
            if (blob) {
              const webpFileName = file.name.replace(/\.[^/.]+$/, "") + ".webp";
              const webpFile = new File([blob], webpFileName, { type: 'image/webp' });
              resolve({ webpFile, previewUrl: URL.createObjectURL(blob) });
            } else {
              reject(new Error("Canvas conversion to WebP failed"));
            }
          }, 'image/webp', 0.85);
        };
        img.onerror = () => reject(new Error("Failed to load image for WebP conversion"));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error("Failed to read image file"));
      reader.readAsDataURL(file);
    });
  };

  const handleAadharFrontChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (fieldErrors.aadharFront) {
      setFieldErrors(prev => ({ ...prev, aadharFront: '' }));
    }
    try {
      setUploading(true);
      const { webpFile, previewUrl } = await convertImageToWebP(file);
      setAadharFront(webpFile);
      setAadharFrontPreview(previewUrl);
    } catch (err) {
      console.error('WebP conversion error:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleAadharBackChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (fieldErrors.aadharBack) {
      setFieldErrors(prev => ({ ...prev, aadharBack: '' }));
    }
    try {
      setUploading(true);
      const { webpFile, previewUrl } = await convertImageToWebP(file);
      setAadharBack(webpFile);
      setAadharBackPreview(previewUrl);
    } catch (err) {
      console.error('WebP conversion error:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    try {
      const formData = new FormData();
      formData.append('name', form.name.trim());
      formData.append('email', form.email.trim());
      formData.append('phone', form.phone.trim());
      formData.append('password', form.password);
      formData.append('city', form.city);
      formData.append('specs', JSON.stringify(selectedServices));
      formData.append('aadharFront', aadharFront);
      formData.append('aadharBack', aadharBack);
      await apiRequest('/tech/register', { method: 'POST', body: formData });
    } catch (err) {
      setError(err.message || 'Could not submit your application. Please try again.');
      return;
    }

    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      navigate('/technician/login');
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-[#F4F6F8] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      
      {/* Background Decorative Blurs */}
      <div className="absolute top-[-100px] left-[-100px] w-[300px] h-[300px] bg-[#0D47A1] opacity-10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-[-100px] right-[-100px] w-[300px] h-[300px] bg-[#FFD600] opacity-20 rounded-full blur-3xl"></div>

      <div className="w-full max-w-lg bg-white rounded-[30px] shadow-[0_20px_50px_rgba(5,150,105,0.05)] border border-slate-100 overflow-hidden flex flex-col pt-5 px-6 pb-6 relative z-10 my-6">
        
        {/* Header */}
        <div className="flex items-center mb-2">
          <button 
            onClick={() => navigate('/technician/login')}
            className="p-2 hover:bg-slate-50 rounded-full transition-all border border-transparent hover:border-slate-100"
          >
            <ArrowLeft className="h-5 w-5 text-[#0D47A1]" />
          </button>
          <span className="text-xs font-bold text-[#0D47A1] ml-2 uppercase tracking-wider">Join as Partner</span>
        </div>

        {/* Logo/Brand */}
        <div className="flex flex-col items-center mb-4">
          <div className="w-12 h-12 bg-[#E3ECF9] rounded-2xl flex items-center justify-center mb-1">
            <Briefcase className="h-6 w-6 text-[#0D47A1]" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Partner Registration</h1>
          <p className="text-slate-500 text-xs mt-1 text-center">Fill credentials & upload Aadhar card photos for verification</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs font-semibold text-center">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3.5">
          
          {/* Full Name & Email Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Full Name */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Full Name</label>
              <div className="relative">
                <User className={`absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 ${fieldErrors.name ? 'text-rose-400' : 'text-slate-400'}`} />
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={(e) => {
                    const val = e.target.value
                      .replace(/[^A-Za-z\s]/g, '')
                      .replace(/\b\w/g, (char) => char.toUpperCase());
                    setForm(prev => ({ ...prev, name: val }));
                    if (fieldErrors.name) setFieldErrors(prev => ({ ...prev, name: '' }));
                    if (error) setError('');
                  }}
                  autoCapitalize="words"
                  placeholder="Enter your name"
                  className={`w-full pl-11 pr-4 py-2.5 bg-slate-50 border ${fieldErrors.name ? 'border-rose-400 focus:border-rose-400 focus:ring-rose-400' : 'border-slate-200 focus:border-[#0D47A1] focus:ring-[#0D47A1]'} rounded-2xl focus:ring-1 outline-none transition-all text-xs capitalize`}
                />
              </div>
              {fieldErrors.name && (
                <span className="text-[10px] font-semibold text-rose-500 mt-0.5">{fieldErrors.name}</span>
              )}
            </div>

            {/* Email Address */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Email Address</label>
              <div className="relative">
                <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 ${fieldErrors.email ? 'text-rose-400' : 'text-slate-400'}`} />
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="name@example.com"
                  className={`w-full pl-11 pr-4 py-2.5 bg-slate-50 border ${fieldErrors.email ? 'border-rose-400 focus:border-rose-400 focus:ring-rose-400' : 'border-slate-200 focus:border-[#0D47A1] focus:ring-[#0D47A1]'} rounded-2xl focus:ring-1 outline-none transition-all text-xs`}
                />
              </div>
              {fieldErrors.email && (
                <span className="text-[10px] font-semibold text-rose-500 mt-0.5">{fieldErrors.email}</span>
              )}
            </div>
          </div>

          {/* Phone Number */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Phone Number</label>
            <div className="relative">
              <Phone className={`absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 ${fieldErrors.phone ? 'text-rose-400' : 'text-slate-400'}`} />
              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setForm(prev => ({ ...prev, phone: val }));
                  if (fieldErrors.phone) setFieldErrors(prev => ({ ...prev, phone: '' }));
                  if (error) setError('');
                }}
                maxLength={10}
                placeholder="Enter 10-digit phone number"
                className={`w-full pl-11 pr-4 py-2.5 bg-slate-50 border ${fieldErrors.phone ? 'border-rose-400 focus:border-rose-400 focus:ring-rose-400' : 'border-slate-200 focus:border-[#0D47A1] focus:ring-[#0D47A1]'} rounded-2xl focus:ring-1 outline-none transition-all text-xs`}
              />
            </div>
            {fieldErrors.phone && (
              <span className="text-[10px] font-semibold text-rose-500 mt-0.5">{fieldErrors.phone}</span>
            )}
          </div>

          {/* Password & Confirm Password Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Password */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Password</label>
              <div className="relative">
                <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 ${fieldErrors.password ? 'text-rose-400' : 'text-slate-400'}`} />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Create password (min 6 chars)"
                  className={`w-full pl-11 pr-10 py-2.5 bg-slate-50 border ${fieldErrors.password ? 'border-rose-400 focus:border-rose-400 focus:ring-rose-400' : 'border-slate-200 focus:border-[#0D47A1] focus:ring-[#0D47A1]'} rounded-2xl focus:ring-1 outline-none transition-all text-xs`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {fieldErrors.password && (
                <span className="text-[10px] font-semibold text-rose-500 mt-0.5">{fieldErrors.password}</span>
              )}
            </div>

            {/* Confirm Password */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Confirm Password</label>
              <div className="relative">
                <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 ${fieldErrors.confirmPassword ? 'text-rose-400' : 'text-slate-400'}`} />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  placeholder="Re-enter password"
                  className={`w-full pl-11 pr-10 py-2.5 bg-slate-50 border ${fieldErrors.confirmPassword ? 'border-rose-400 focus:border-rose-400 focus:ring-rose-400' : 'border-slate-200 focus:border-[#0D47A1] focus:ring-[#0D47A1]'} rounded-2xl focus:ring-1 outline-none transition-all text-xs`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {fieldErrors.confirmPassword && (
                <span className="text-[10px] font-semibold text-rose-500 mt-0.5">{fieldErrors.confirmPassword}</span>
              )}
            </div>
          </div>

          {/* Service Categories Selection (Input Field with Dynamic Dropdown) */}
          <div className="flex flex-col gap-1 relative" ref={servicesDropdownRef}>
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Services You Provide</label>
              <span className="text-[10px] text-[#0D47A1] font-bold">{selectedServices.length} Selected</span>
            </div>
            
            {/* Input Trigger Field */}
            <div
              onClick={() => setIsServicesDropdownOpen(!isServicesDropdownOpen)}
              className={`w-full min-h-[42px] pl-11 pr-10 py-2 bg-slate-50 border ${
                fieldErrors.services
                  ? 'border-rose-400 focus:ring-rose-400'
                  : isServicesDropdownOpen
                  ? 'border-[#0D47A1] ring-1 ring-[#0D47A1]'
                  : 'border-slate-200 hover:border-slate-300'
              } rounded-2xl cursor-pointer transition-all flex items-center flex-wrap gap-1 relative`}
            >
              <Briefcase className={`absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 ${fieldErrors.services ? 'text-rose-400' : 'text-slate-400'} pointer-events-none`} />
              
              {selectedServices.length === 0 ? (
                <span className="text-xs text-slate-400">Select services from dropdown</span>
              ) : (
                <div className="flex flex-wrap gap-1 pr-2">
                  {selectedServices.map((s) => (
                    <span
                      key={s}
                      className="inline-flex items-center gap-1 bg-[#0D47A1] text-white text-[11px] font-semibold px-2.5 py-0.5 rounded-lg"
                    >
                      {s}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleService(s);
                        }}
                        className="hover:text-red-200 transition-colors ml-0.5"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <ChevronDown
                className={`absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 transition-transform duration-200 pointer-events-none ${
                  isServicesDropdownOpen ? 'rotate-180 text-[#0D47A1]' : ''
                }`}
              />
            </div>

            {/* Dropdown Menu */}
            {isServicesDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-2 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                {availableServices.length > 5 && (
                  <div className="p-1 mb-1 border-b border-slate-100">
                    <input
                      type="text"
                      placeholder="Search services..."
                      value={serviceSearch}
                      onChange={(e) => setServiceSearch(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#0D47A1]"
                    />
                  </div>
                )}

                <div className="max-h-48 overflow-y-auto flex flex-col gap-1">
                  {availableServices
                    .filter((s) => s.toLowerCase().includes(serviceSearch.toLowerCase()))
                    .map((srv) => {
                      const isSelected = selectedServices.includes(srv);
                      return (
                        <div
                          key={srv}
                          onClick={() => toggleService(srv)}
                          className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-blue-50 text-[#0D47A1]'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <span className={`w-4 h-4 rounded-md flex items-center justify-center border transition-all ${
                              isSelected ? 'bg-[#0D47A1] border-[#0D47A1] text-white' : 'border-slate-300 bg-white'
                            }`}>
                              {isSelected && <Check size={12} strokeWidth={3} />}
                            </span>
                            {srv}
                          </span>
                          {isSelected && (
                            <span className="text-[10px] font-bold text-[#0D47A1] uppercase tracking-wider">
                              Selected
                            </span>
                          )}
                        </div>
                      );
                    })}

                  {availableServices.filter((s) => s.toLowerCase().includes(serviceSearch.toLowerCase())).length === 0 && (
                    <div className="py-3 text-center text-xs text-slate-400">
                      No services found matching "{serviceSearch}"
                    </div>
                  )}
                </div>
              </div>
            )}

            {fieldErrors.services && (
              <span className="text-[10px] font-semibold text-rose-500 mt-0.5">{fieldErrors.services}</span>
            )}
          </div>

          {/* Operational City Selection (Dropdown) */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Operating City / Territory</label>
            <div className="relative">
              <MapPin className={`absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 ${fieldErrors.city ? 'text-rose-400' : 'text-slate-400'} pointer-events-none z-10`} />
              <select
                name="city"
                value={form.city}
                onChange={handleChange}
                className={`w-full pl-11 pr-8 py-2.5 bg-slate-50 border ${fieldErrors.city ? 'border-rose-400 focus:border-rose-400 focus:ring-rose-400' : 'border-slate-200 focus:border-[#0D47A1] focus:ring-[#0D47A1]'} rounded-2xl focus:ring-1 outline-none transition-all text-xs appearance-none font-medium text-slate-800`}
                disabled={citiesLoading || availableCities.length === 0}
              >
                {citiesLoading && <option value="">Loading cities…</option>}
                {!citiesLoading && availableCities.length === 0 && (
                  <option value="">No operational cities available</option>
                )}
                {availableCities.map((city) => (
                  <option key={city.name} value={city.name}>
                    {city.state ? `${city.name}, ${city.state}` : city.name}
                  </option>
                ))}
              </select>
            </div>
            {fieldErrors.city && (
              <span className="text-[10px] font-semibold text-rose-500 mt-0.5">{fieldErrors.city}</span>
            )}
            {!citiesLoading && availableCities.length === 0 && (
              <p className="text-[11px] text-amber-600 mt-0.5">
                No service cities have been configured yet. Please check back soon or contact support.
              </p>
            )}
          </div>

          {/* Aadhar Photo Upload */}
          <div className={`flex flex-col gap-2 p-3 bg-blue-50/60 border ${fieldErrors.aadharFront || fieldErrors.aadharBack ? 'border-rose-300 bg-rose-50/30' : 'border-blue-200'} rounded-2xl`}>
            <label className="text-xs font-bold text-[#0D47A1] uppercase tracking-wide flex items-center gap-1">
              <ShieldCheck size={14} /> Aadhar Card Photos (Required)
            </label>
            <p className="text-[10px] text-slate-500">Upload clear front and back photos of your Aadhar Card for identity verification.</p>
            
            <div className="grid grid-cols-2 gap-2">
              {/* Front Photo */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-semibold text-slate-700">Aadhar Front</span>
                <label className={`border-2 border-dashed ${fieldErrors.aadharFront ? 'border-rose-400 bg-rose-50/50' : 'border-blue-300 hover:border-[#0D47A1] bg-white'} rounded-xl p-2 flex flex-col items-center justify-center cursor-pointer transition-all min-h-[65px] relative overflow-hidden`}>
                  {aadharFrontPreview ? (
                    <img src={aadharFrontPreview} alt="Aadhar Front" className="w-full h-14 object-cover rounded-lg" />
                  ) : (
                    <span className="text-[10px] font-bold text-[#0D47A1] text-center">📷 Upload Front</span>
                  )}
                  <input type="file" accept="image/*" onChange={handleAadharFrontChange} className="hidden" />
                </label>
                {fieldErrors.aadharFront && (
                  <span className="text-[10px] font-semibold text-rose-500">{fieldErrors.aadharFront}</span>
                )}
              </div>

              {/* Back Photo */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-semibold text-slate-700">Aadhar Back</span>
                <label className={`border-2 border-dashed ${fieldErrors.aadharBack ? 'border-rose-400 bg-rose-50/50' : 'border-blue-300 hover:border-[#0D47A1] bg-white'} rounded-xl p-2 flex flex-col items-center justify-center cursor-pointer transition-all min-h-[65px] relative overflow-hidden`}>
                  {aadharBackPreview ? (
                    <img src={aadharBackPreview} alt="Aadhar Back" className="w-full h-14 object-cover rounded-lg" />
                  ) : (
                    <span className="text-[10px] font-bold text-[#0D47A1] text-center">📷 Upload Back</span>
                  )}
                  <input type="file" accept="image/*" onChange={handleAadharBackChange} className="hidden" />
                </label>
                {fieldErrors.aadharBack && (
                  <span className="text-[10px] font-semibold text-rose-500">{fieldErrors.aadharBack}</span>
                )}
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={uploading}
            className={`w-full font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5 mt-2 active:scale-95 shadow-md ${
              submitted
                ? 'bg-green-500 text-white'
                : 'bg-[#FFD600] text-[#0D47A1] hover:bg-yellow-400 shadow-yellow-400/10'
            }`}
          >
            {submitted ? '✓ Registration Request Sent!' : uploading ? 'Processing Image...' : 'Submit Verification Request'}
          </button>
        </form>

      </div>
    </div>
  );
};

export default TechApply;
