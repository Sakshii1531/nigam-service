import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { KeyRound, Lock, ArrowRight, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { apiRequest } from '../../lib/apiClient';
import { useAuth } from '../../context/AuthContext';

// Forced first-login step for an account created with a temporary password
// (today, only an ASM created via the super-admin console — asm.service.js's
// createAsm sets mustChangePassword). Generic rather than asm-specific: any
// role provisioned this way in the future reaches it the same way, via
// App.jsx's route guard checking user.mustChangePassword.
const ChangePassword = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [tempPassword, setTempPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }
    if (newPassword === tempPassword) {
      setError('Choose a new password different from the temporary one.');
      return;
    }

    setIsLoading(true);
    try {
      await apiRequest('/auth/password', {
        method: 'PATCH',
        auth: true,
        portal: 'super_admin',
        body: { currentPassword: tempPassword, newPassword },
      });

      // PATCH /auth/password revokes every refresh token on success (any
      // password change does, not just this forced one) — the access token
      // this page is still holding dies within its own short remaining
      // lifetime regardless, so signing out now and asking for a fresh
      // login is more honest than a session that silently expires later.
      await logout();
      navigate('/super-admin/login', { state: { passwordChanged: true } });
    } catch (err) {
      setError(err.message || 'Could not update your password.');
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
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-[#0D47A1] rounded-2xl shadow-sm mb-4">
            <ShieldCheck className="text-white" size={28} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1 font-sans">Set Your Password</h1>
          <p className="text-gray-500 text-sm">Your account was created with a temporary password — set your own before continuing.</p>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-8 shadow-sm">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-xs text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Temporary Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <KeyRound size={18} />
                </div>
                <input
                  type={showPasswords ? 'text' : 'password'}
                  className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#0D47A1] focus:ring-1 focus:ring-[#0D47A1] outline-none transition-all text-sm text-gray-900 placeholder-gray-400"
                  placeholder="The password super-admin gave you"
                  value={tempPassword}
                  onChange={(e) => setTempPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="border-t border-gray-100 pt-5">
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">New Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock size={18} />
                </div>
                <input
                  type={showPasswords ? 'text' : 'password'}
                  className="w-full pl-11 pr-11 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#0D47A1] focus:ring-1 focus:ring-[#0D47A1] outline-none transition-all text-sm text-gray-900 placeholder-gray-400"
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(!showPasswords)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  {showPasswords ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Confirm New Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock size={18} />
                </div>
                <input
                  type={showPasswords ? 'text' : 'password'}
                  className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#0D47A1] focus:ring-1 focus:ring-[#0D47A1] outline-none transition-all text-sm text-gray-900 placeholder-gray-400"
                  placeholder="Re-enter the new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-100 p-3.5 rounded-xl text-xs text-blue-700">
              Your phone and email stay as super-admin set them — only your password changes here.
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
                  Set Password &amp; Continue
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default ChangePassword;
