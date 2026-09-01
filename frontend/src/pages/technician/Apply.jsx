import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Phone, Mail, Lock, Eye, EyeOff, Briefcase, MapPin, Check, ShieldCheck } from 'lucide-react';
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

  const [selectedServices, setSelectedServices] = useState(['AC Repair']);
  // Seeded empty on purpose. This list used to start as a hardcoded
  // ['Delhi NCR', 'Mumbai', ...] that only got replaced when the fetch returned
  // rows — so whenever no city was configured (or the request failed) an
  // applicant was offered five cities the business does not operate in.
  // /tech/register resolves this value with an exact City.findOne({ name }), so
  // picking one of those saved the technician with city: null, which the
  // assignment engine then has no proximity to score against.
  const [availableCities, setAvailableCities] = useState([]);
  const [citiesLoading, setCitiesLoading] = useState(true);
  
  const [availableServices, setAvailableServices] = useState([
    'AC Repair', 'Washing Machine', 'Electrician', 'Full Home Cleaning'
  ]);
  
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

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
        // apiRequest returns the envelope's `data` payload directly, so the
        // Array.isArray(tiles) guard failed while it was unwrapped twice, and
        // this always fell through
        // to /catalog/services — an endpoint that does not exist, so the
        // specialisation list was always empty. A technician's specs are matched
        // against a request's category by the assignment engine, so the category
        // catalogue is the right source.
        let serviceList = [];
        const tiles = await apiRequest('/cms/home-tiles?placement=dashboard-service');
        serviceList = (tiles || []).map((t) => t.title).filter(Boolean);

        if (serviceList.length === 0) {
          const categories = await apiRequest('/catalog/categories');
          serviceList = (categories || []).map((c) => c.name).filter(Boolean);
        }

        // Deduplicate: the same service is merchandised under more than one
        // home tile, and the specialisation chips are keyed by name — repeats
        // made React collapse them into one another.
        serviceList = [...new Set(serviceList)];

        if (serviceList.length > 0) {
          setAvailableServices(serviceList);
          setSelectedServices([serviceList[0]]);
        }
      } catch (err) {
        console.warn('Error reading admin dashboard services:', err.message);
      }
    }

    loadFormMetadata();
  }, []);

  const handleChange = (e) => {
    setError('');
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const toggleService = (serviceName) => {
    if (selectedServices.includes(serviceName)) {
      if (selectedServices.length === 1) return;
      setSelectedServices(selectedServices.filter(s => s !== serviceName));
    } else {
      setSelectedServices([...selectedServices, serviceName]);
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
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match. Please verify your password.');
      return;
    }

    if (!aadharFront || !aadharBack) {
      setError('Please upload both Aadhar Card Front and Back photos before submitting.');
      return;
    }

    // The select is disabled while empty, and browsers skip validation on a
    // disabled control — so `required` alone would let an application through
    // with no city, which /tech/register stores as city: null.
    if (!form.city) {
      setError('Please select an operating city. If none are listed, service is not open in your area yet.');
      return;
    }

    // The application is the API call — a failure has to surface, not be
    // swallowed behind a success screen.
    try {
      const formData = new FormData();
      formData.append('name', form.name);
      formData.append('email', form.email);
      formData.append('phone', form.phone);
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
          <p className="text-slate-500 text-xs mt-1 text-center">Fill credentials & upload Aadhar WebP photos for verification</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs font-semibold text-center">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          
          {/* Full Name & Email Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Full Name */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Full Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Enter your name"
                  className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl focus:border-[#0D47A1] focus:ring-1 focus:ring-[#0D47A1] outline-none transition-all text-xs"
                  required
                />
              </div>
            </div>

            {/* Email Address */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="name@example.com"
                  className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl focus:border-[#0D47A1] focus:ring-1 focus:ring-[#0D47A1] outline-none transition-all text-xs"
                  required
                />
              </div>
            </div>
          </div>

          {/* Phone Number */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Phone Number</label>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="Enter phone number"
                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl focus:border-[#0D47A1] focus:ring-1 focus:ring-[#0D47A1] outline-none transition-all text-xs"
                required
              />
            </div>
          </div>

          {/* Password & Confirm Password Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Password */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Create password"
                  className="w-full pl-11 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl focus:border-[#0D47A1] focus:ring-1 focus:ring-[#0D47A1] outline-none transition-all text-xs"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  placeholder="Re-enter password"
                  className="w-full pl-11 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl focus:border-[#0D47A1] focus:ring-1 focus:ring-[#0D47A1] outline-none transition-all text-xs"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>

          {/* Service Categories Selection (Multi-select Chips) */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Services You Provide</label>
              <span className="text-[10px] text-[#0D47A1] font-bold">{selectedServices.length} Selected</span>
            </div>
            
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 bg-slate-50 border border-slate-200 rounded-2xl">
              {availableServices.map((srv) => {
                const isSelected = selectedServices.includes(srv);
                return (
                  <button
                    key={srv}
                    type="button"
                    onClick={() => toggleService(srv)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all border ${
                      isSelected
                        ? 'bg-[#0D47A1] text-white border-[#0D47A1] shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                    {srv}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Operational City Selection (Dropdown) */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Operating City / Territory</label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none z-10" />
              <select
                name="city"
                value={form.city}
                onChange={handleChange}
                className="w-full pl-11 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl focus:border-[#0D47A1] focus:ring-1 focus:ring-[#0D47A1] outline-none transition-all text-xs appearance-none font-medium text-slate-800"
                required
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
            {!citiesLoading && availableCities.length === 0 && (
              // Better than silently offering nothing: this is the state an
              // applicant hits before the admin has added any operational city.
              <p className="text-[11px] text-amber-600 mt-0.5">
                No service cities have been configured yet. Please check back soon or contact support.
              </p>
            )}
          </div>

          {/* Aadhar Photo Upload (WebP Converted -> Cloudinary) */}
          <div className="flex flex-col gap-2 p-3 bg-blue-50/60 border border-blue-200 rounded-2xl">
            <label className="text-xs font-bold text-[#0D47A1] uppercase tracking-wide flex items-center gap-1">
              <ShieldCheck size={14} /> Aadhar Card Photos (Required)
            </label>
            <p className="text-[10px] text-slate-500">Photos will automatically convert to WebP format before Cloudinary upload.</p>
            
            <div className="grid grid-cols-2 gap-2">
              {/* Front Photo */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-semibold text-slate-700">Aadhar Front</span>
                <label className="border-2 border-dashed border-blue-300 hover:border-[#0D47A1] bg-white rounded-xl p-2 flex flex-col items-center justify-center cursor-pointer transition-all min-h-[65px] relative overflow-hidden">
                  {aadharFrontPreview ? (
                    <img src={aadharFrontPreview} alt="Aadhar Front" className="w-full h-14 object-cover rounded-lg" />
                  ) : (
                    <span className="text-[10px] font-bold text-[#0D47A1] text-center">📷 Upload Front (.webp)</span>
                  )}
                  <input type="file" accept="image/*" onChange={handleAadharFrontChange} className="hidden" required />
                </label>
              </div>

              {/* Back Photo */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-semibold text-slate-700">Aadhar Back</span>
                <label className="border-2 border-dashed border-blue-300 hover:border-[#0D47A1] bg-white rounded-xl p-2 flex flex-col items-center justify-center cursor-pointer transition-all min-h-[65px] relative overflow-hidden">
                  {aadharBackPreview ? (
                    <img src={aadharBackPreview} alt="Aadhar Back" className="w-full h-14 object-cover rounded-lg" />
                  ) : (
                    <span className="text-[10px] font-bold text-[#0D47A1] text-center">📷 Upload Back (.webp)</span>
                  )}
                  <input type="file" accept="image/*" onChange={handleAadharBackChange} className="hidden" required />
                </label>
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
            {submitted ? '✓ Registration Request Sent!' : uploading ? 'Converting Image to WebP...' : 'Submit Verification Request'}
          </button>
        </form>

      </div>
    </div>
  );
};

export default TechApply;
