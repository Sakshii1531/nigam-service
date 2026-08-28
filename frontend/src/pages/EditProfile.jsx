import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Phone, Mail, MapPin, Camera } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/apiClient';

const EditProfile = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const fileInputRef = useRef(null);
  const [avatar, setAvatar] = useState(null);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
  });

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        phone: user.phone || '',
        email: user.email || '',
        address: user.addresses?.find(a => a.isDefault)?.house || user.addresses?.[0]?.house || '',
      });
    }
  }, [user]);

  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setAvatar(ev.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // This previously just flashed "Saved" and navigated away without persisting
  // anything — the edits were lost the moment the page unmounted.
  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await apiRequest('/auth/me', {
        method: 'PATCH',
        auth: true,
        body: { name: form.name, phone: form.phone, email: form.email },
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

  return (
    <div className="min-h-screen bg-bg-light flex flex-col pb-20 lg:pb-8">

      {/* Header */}
      <div className="bg-[#E3ECF9] p-6 rounded-b-[30px] shadow-sm flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 bg-white rounded-full shadow-sm hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-[#0D47A1]" />
        </button>
        <h1 className="text-xl font-bold text-text-primary">Edit Profile</h1>
      </div>

      {/* Avatar Section */}
      <div className="flex flex-col items-center mt-8 mb-2">
        <div className="relative">
          {avatar ? (
            <img
              src={avatar}
              alt="Profile"
              className="w-20 h-20 rounded-full object-cover shadow-md border-2 border-white"
            />
          ) : (
            <div className="w-20 h-20 bg-[#0D47A1] rounded-full flex items-center justify-center text-white font-bold text-3xl shadow-md">
              {form.name.charAt(0).toUpperCase()}
            </div>
          )}
          <button
            type="button"
            onClick={() => fileInputRef.current.click()}
            className="absolute bottom-0 right-0 w-7 h-7 bg-[#FFD600] rounded-full flex items-center justify-center shadow border-2 border-white"
          >
            <Camera className="h-3.5 w-3.5 text-[#0D47A1]" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </div>
        <span className="text-xs text-text-secondary mt-2">Tap to change photo</span>
      </div>

      {/* Form */}
      <form onSubmit={handleSave} className="flex-1 p-6 flex flex-col gap-4">

        {/* Full Name */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Full Name</label>
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-text-secondary" />
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Enter your full name"
              className="w-full pl-12 pr-4 py-3 bg-white border border-border-color rounded-2xl text-sm focus:outline-none focus:border-[#0D47A1] focus:ring-1 focus:ring-[#0D47A1] transition-all shadow-sm"
              required
            />
          </div>
        </div>

        {/* Phone */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Phone Number</label>
          <div className="relative">
            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-text-secondary" />
            <input
              type="tel"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              placeholder="Enter phone number"
              className="w-full pl-12 pr-4 py-3 bg-white border border-border-color rounded-2xl text-sm focus:outline-none focus:border-[#0D47A1] focus:ring-1 focus:ring-[#0D47A1] transition-all shadow-sm"
              required
            />
          </div>
        </div>

        {/* Email */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Email Address</label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-text-secondary" />
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="Enter email address"
              className="w-full pl-12 pr-4 py-3 bg-white border border-border-color rounded-2xl text-sm focus:outline-none focus:border-[#0D47A1] focus:ring-1 focus:ring-[#0D47A1] transition-all shadow-sm"
            />
          </div>
        </div>

        {/* Address */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Default Address</label>
          <div className="relative">
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-text-secondary" />
            <input
              type="text"
              name="address"
              value={form.address}
              onChange={handleChange}
              placeholder="Enter your address"
              className="w-full pl-12 pr-4 py-3 bg-white border border-border-color rounded-2xl text-sm focus:outline-none focus:border-[#0D47A1] focus:ring-1 focus:ring-[#0D47A1] transition-all shadow-sm"
            />
          </div>
        </div>

        {/* Save Button */}
        {error && (
          <p className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className={`w-full font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-md mt-2 text-sm disabled:opacity-60 ${
            saved
              ? 'bg-green-500 text-white'
              : 'bg-[#FFD600] text-[#0D47A1] hover:bg-yellow-400'
          }`}
        >
          {saved ? '✓ Saved! Redirecting...' : saving ? 'Saving…' : 'Save Changes'}
        </button>

      </form>

    </div>
  );
};

export default EditProfile;
