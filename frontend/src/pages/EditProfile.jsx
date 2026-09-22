import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Phone, Mail, MapPin, Camera, ChevronRight, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/apiClient';
import { goBack } from '../lib/navigation';

const EditProfile = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const fileInputRef = useRef(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    avatarUrl: '',
  });

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        phone: user.phone || '',
        email: user.email || '',
        avatarUrl: user.avatarUrl || '',
      });
    }
  }, [user]);

  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const defaultAddress = user?.addresses?.find((a) => a.isDefault) || user?.addresses?.[0] || null;

  // Previously this only ran the picked file through FileReader for a local
  // preview — nothing was ever uploaded, so the preview vanished the moment
  // Save was pressed. It now really uploads to the shared /upload endpoint
  // and saves the returned URL, the same as every other photo-upload flow.
  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAvatarError('');
    const localUrl = URL.createObjectURL(file);
    setAvatarPreview(localUrl);
    setAvatarUploading(true);
    try {
      const body = new FormData();
      body.append('file', file);
      const res = await apiRequest('/upload', { method: 'POST', auth: true, body });
      setForm((prev) => ({ ...prev, avatarUrl: res.url }));
    } catch (err) {
      setAvatarError(err.message || 'Could not upload photo. Please try again.');
      setAvatarPreview('');
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await apiRequest('/auth/me', {
        method: 'PATCH',
        auth: true,
        body: { name: form.name, phone: form.phone, email: form.email, avatarUrl: form.avatarUrl },
      });
      if (res) updateUser(res);
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        navigate('/profile');
      }, 900);
    } catch (err) {
      setError(err.message || 'Could not save your profile.');
    } finally {
      setSaving(false);
    }
  };

  const avatarDisplay = avatarPreview || form.avatarUrl;
  const inputCls =
    'w-full pl-12 pr-4 py-2.5 bg-white/50 border border-slate-200 rounded-2xl focus:border-brand-blue focus:ring-1 focus:ring-brand-blue outline-none transition-all text-[13px] shadow-xs focus:shadow-md';

  return (
    <div className="min-h-screen bg-[#F8FAFC] relative overflow-x-hidden">
      {/* Background Decorative Blurs — same treatment as Login.jsx, so this
          quick-edit form reads as part of the same app instead of the flat,
          unstyled card it was before. */}
      <div className="absolute -top-25 -left-25 w-75 h-75 bg-brand-blue opacity-10 rounded-full blur-3xl" />
      <div className="absolute -bottom-25 -right-25 w-75 h-75 bg-brand-yellow opacity-20 rounded-full blur-3xl" />

      <div className="min-h-screen w-full flex items-start justify-center px-3 sm:px-4 md:px-6 py-6 sm:py-10">
        <div className="w-full max-w-md bg-white/90 backdrop-blur-xl rounded-2xl sm:rounded-[30px] shadow-[0_20px_50px_rgba(13,71,161,0.05)] border border-white/50 overflow-hidden flex flex-col p-5 sm:p-6 md:p-8 relative z-10">

          {/* Header */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => goBack(navigate, '/profile')}
              className="p-2 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors cursor-pointer border border-slate-100"
            >
              <ArrowLeft className="h-5 w-5 text-brand-blue" />
            </button>
            <h1 className="text-lg font-black text-slate-900">Edit Profile</h1>
          </div>

          {/* Avatar Section */}
          <div className="flex flex-col items-center mt-5 mb-1">
            <div className="relative">
              {avatarDisplay ? (
                <img
                  src={avatarDisplay}
                  alt="Profile"
                  className="w-20 h-20 rounded-full object-cover shadow-md border-2 border-white"
                />
              ) : (
                <div className="w-20 h-20 bg-brand-blue rounded-full flex items-center justify-center text-white font-black text-2xl shadow-md">
                  {form.name.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current.click()}
                disabled={avatarUploading}
                className="absolute bottom-0 right-0 w-7 h-7 bg-brand-yellow rounded-full flex items-center justify-center shadow border-2 border-white cursor-pointer disabled:opacity-60"
              >
                {avatarUploading ? (
                  <Loader2 className="h-3.5 w-3.5 text-brand-blue animate-spin" />
                ) : (
                  <Camera className="h-3.5 w-3.5 text-brand-blue" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>
            <span className="text-xs text-slate-400 font-semibold mt-2">
              {avatarUploading ? 'Uploading…' : 'Tap to change photo'}
            </span>
            {avatarError && (
              <span className="text-[11px] text-rose-600 font-semibold mt-1">{avatarError}</span>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleSave} className="flex flex-col gap-3 mt-3">

            {/* Full Name */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Full Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  className={inputCls}
                  required
                />
              </div>
            </div>

            {/* Phone */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="Enter phone number"
                  className={inputCls}
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="Enter email address"
                  className={inputCls}
                />
              </div>
            </div>

            {/* Delivery Addresses — a single free-text "address" field used to
                sit here bound to nothing PATCH /auth/me accepts, so anything
                typed into it was silently discarded on Save. Addresses are
                managed for real on their own page; this links there instead
                of pretending to edit one inline. */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Delivery Addresses</label>
              <button
                type="button"
                onClick={() => navigate('/saved-addresses')}
                className="w-full flex items-center gap-3 pl-4 pr-3.5 py-2.5 bg-white/50 hover:bg-slate-50 border border-slate-200 rounded-2xl transition-colors cursor-pointer text-left shadow-xs"
              >
                <MapPin className="h-5 w-5 text-slate-400 shrink-0" />
                <span className="flex-1 min-w-0 text-[13px] font-semibold text-slate-700 truncate">
                  {defaultAddress?.house || 'Add your first delivery address'}
                </span>
                <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
              </button>
            </div>

            {/* Save Button */}
            {error && (
              <p className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={saving || avatarUploading}
              className={`w-full font-bold py-3 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-md mt-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer active:scale-98 ${
                saved
                  ? 'bg-emerald-500 text-white'
                  : 'bg-linear-to-r from-brand-yellow to-[#FFCA00] text-brand-blue hover:shadow-lg hover:shadow-yellow-400/20'
              }`}
            >
              {saved ? '✓ Saved! Redirecting...' : saving ? 'Saving…' : 'Save Changes'}
            </button>

          </form>

        </div>
      </div>
    </div>
  );
};

export default EditProfile;
