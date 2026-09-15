import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/super-admin/Sidebar';
import Topbar from '../../components/super-admin/Topbar';
import { apiRequest } from '../../lib/apiClient';
import { useAuth } from '../../context/AuthContext';
import {
  Mail,
  Phone,
  MapPin,
  Star,
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  KeyRound,
} from 'lucide-react';

const PERMISSION_LABELS = {
  'techs:view': 'View Service Providers',
  'techs:manage': 'Manage Service Providers',
};

// Self-service "change my password anytime" — distinct from the forced
// first-login flow (ChangePassword.jsx), which only ever fires once, right
// after a temporary credential. This is the normal path afterward.
const Profile = () => {
  const { user } = useAuth();
  const isAsm = user?.role === 'asm';

  const [asm, setAsm] = useState(null);
  const [loading, setLoading] = useState(isAsm);
  const [loadError, setLoadError] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (!isAsm) return;
    (async () => {
      try {
        setLoading(true);
        setAsm(await apiRequest('/super-admin/asms/me', { auth: true }));
      } catch (err) {
        setLoadError(err.message || 'Could not load your profile.');
      } finally {
        setLoading(false);
      }
    })();
  }, [isAsm]);

  const showToast = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setFormError('');

    if (newPassword.length < 6) {
      setFormError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setFormError('New password and confirmation do not match.');
      return;
    }
    if (newPassword === currentPassword) {
      setFormError('Choose a password different from your current one.');
      return;
    }

    setSaving(true);
    try {
      await apiRequest('/auth/password', {
        method: 'PATCH',
        auth: true,
        body: { currentPassword, newPassword },
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast('Password updated successfully.');
    } catch (err) {
      setFormError(err.message || 'Could not update your password.');
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (name) => (name ? name.split(' ').map((p) => p[0]).join('').toUpperCase().slice(0, 2) : 'ME');

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex text-slate-800">
      <Sidebar />
      <div className="flex-1 ml-64 min-h-screen flex flex-col">
        <Topbar title="My Profile" subtitle="Your account details and login password" />

        <div className="p-6 max-w-3xl space-y-6">
          {loading ? (
            <div className="text-center py-16 text-slate-400 font-semibold text-sm flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-[#0D47A1] border-t-transparent rounded-full animate-spin" />
              Loading your profile...
            </div>
          ) : (
            <>
              {loadError && (
                <div className="bg-red-50 border border-red-100 text-red-600 text-sm p-3 rounded-xl">{loadError}</div>
              )}

              {/* Identity card */}
              <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-6 flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[#0D47A1] text-white flex items-center justify-center font-extrabold text-lg flex-shrink-0">
                  {getInitials(user?.name)}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#1E293B]">{user?.name || 'My Account'}</h2>
                  <p className="text-xs text-[#64748B]">{isAsm ? 'Area Service Manager' : (user?.role || '').replace('_', ' ')}</p>
                </div>
              </div>

              {/* Contact info — read-only for an ASM: only super-admin can
                  change phone/email (asm.service.js's updateAsm). */}
              <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-6">
                <h3 className="text-sm font-bold text-[#1E293B] mb-4">Contact Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-3 text-slate-700">
                    <Mail size={16} className="text-[#64748B] flex-shrink-0" />
                    <span>{user?.email || asm?.email || '—'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-700">
                    <Phone size={16} className="text-[#64748B] flex-shrink-0" />
                    <span>{user?.phone || asm?.phone || '—'}</span>
                  </div>
                  {isAsm && (
                    <>
                      <div className="flex items-center gap-3 text-slate-700">
                        <MapPin size={16} className="text-[#64748B] flex-shrink-0" />
                        <span>{asm?.city?.name || 'Unassigned'} Zone</span>
                      </div>
                      <div className="flex items-center gap-3 text-slate-700">
                        <Star size={16} className="text-amber-500 flex-shrink-0" />
                        <span>{asm?.rating ?? 0} / 5.0 rating</span>
                      </div>
                    </>
                  )}
                </div>
                {isAsm && (
                  <p className="text-[11px] text-slate-400 mt-4 pt-3 border-t border-slate-100">
                    Your phone, email, and zone can only be changed by super-admin.
                  </p>
                )}
              </div>

              {/* Permissions — informational only */}
              {isAsm && (
                <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-6">
                  <h3 className="text-sm font-bold text-[#1E293B] mb-4">Your Permissions</h3>
                  {asm?.permissions?.length ? (
                    <div className="flex flex-wrap gap-2">
                      {asm.permissions.map((key) => (
                        <span key={key} className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-1.5">
                          <ShieldCheck size={13} /> {PERMISSION_LABELS[key] || key}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No permissions granted yet — contact super-admin.</p>
                  )}
                </div>
              )}

              {/* Change password */}
              <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-6">
                <h3 className="text-sm font-bold text-[#1E293B] mb-1 flex items-center gap-2">
                  <KeyRound size={16} className="text-[#0D47A1]" /> Change Password
                </h3>
                <p className="text-xs text-[#64748B] mb-4">Update the password you use to sign in — you can do this any time, not just on first login.</p>

                {formError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-xs">{formError}</div>
                )}

                <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                  <div>
                    <label className="text-xs font-bold text-[#64748B] uppercase mb-1 block">Current Password</label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type={showPasswords ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#0D47A1] focus:border-[#0D47A1]"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[#64748B] uppercase mb-1 block">New Password</label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type={showPasswords ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full pl-10 pr-10 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#0D47A1] focus:border-[#0D47A1]"
                        minLength={6}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords((s) => !s)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPasswords ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[#64748B] uppercase mb-1 block">Confirm New Password</label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type={showPasswords ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#0D47A1] focus:border-[#0D47A1]"
                        minLength={6}
                        required
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={saving}
                    className="bg-[#0D47A1] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60"
                  >
                    {saving ? 'Updating…' : 'Update Password'}
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>

      {successMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" /> {successMessage}
        </div>
      )}
    </div>
  );
};

export default Profile;
