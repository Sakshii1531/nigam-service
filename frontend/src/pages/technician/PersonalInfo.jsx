import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, Briefcase, ClipboardList, Calendar, Wrench, User, Save } from 'lucide-react';
import TechBottomNav from '../../components/TechBottomNav';
import TechTopNav from '../../components/TechTopNav';
import { apiRequest } from '../../lib/apiClient';

const PersonalInfo = () => {
  const navigate = useNavigate();
  const [showToast, setShowToast] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    apiRequest('/tech/profile/profile', { auth: true })
      .then((res) => setForm({
        name: res?.name || '',
        email: res?.email || '',
        phone: res?.phone || '',
        address: res?.address || '',
      }))
      .catch((err) => setError(err.message || 'Could not load your profile.'));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiRequest('/tech/profile/profile', { method: 'PUT', auth: true, body: form });
      setError('');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (err) {
      setError(err.message || 'Could not save your profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col pb-20 lg:pb-8 lg:pt-14 relative font-sans">

      {/* Desktop Top Nav */}
      <TechTopNav activePage="profile" />

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-2xl shadow-lg z-55 flex items-center gap-2 border border-green-500 animate-in fade-in slide-in-from-top-4 duration-250">
          <span className="text-xs font-semibold">✓ Profile updated successfully!</span>
        </div>
      )}

      {/* Header — mobile only */}
      <div className="bg-white border-b border-slate-100 p-4 flex items-center justify-between sticky top-0 z-10 lg:hidden">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1 hover:bg-slate-50 rounded-full">
            <ArrowLeft className="h-6 w-6 text-slate-700" />
          </button>
          <h1 className="text-lg font-semibold text-slate-900">Personal Info</h1>
        </div>
        <button className="p-2 hover:bg-slate-50 rounded-full transition-colors relative">
          <Bell className="h-5 w-5 text-slate-700" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 flex flex-col gap-4 max-w-screen-md mx-auto w-full">

        {/* Info Card */}
        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex flex-col gap-4">
          
          {/* Name */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-500 uppercase">Full Name</label>
            <input 
              type="text" 
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} 
              className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm text-slate-700 focus:outline-none focus:border-[#0D47A1]"
            />
          </div>

          {/* Email */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-500 uppercase">Email Address</label>
            <input 
              type="email" 
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} 
              className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm text-slate-700 focus:outline-none focus:border-[#0D47A1]"
            />
          </div>

          {/* Phone */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-500 uppercase">Phone Number</label>
            <input 
              type="tel" 
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })} 
              className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm text-slate-700 focus:outline-none focus:border-[#0D47A1]"
            />
          </div>

          {/* Address */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-500 uppercase">Address</label>
            <textarea 
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })} 
              className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm text-slate-700 focus:outline-none focus:border-[#0D47A1] resize-none h-20"
            />
          </div>

        </div>

        {/* Save Button */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 text-[11px] font-semibold text-rose-600">
            {error}
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-[#0D47A1] text-white font-semibold py-3 rounded-xl hover:bg-blue-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Save className="h-5 w-5" />
          {saving ? 'Saving…' : 'Save Changes'}
        </button>

      </div>

      {/* Bottom Navigation */}
      <TechBottomNav activeTab="profile" />

    </div>
  );
};

export default PersonalInfo;
