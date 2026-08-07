import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Mail, Phone, KeyRound, CheckCircle2, Cpu, ShieldCheck } from 'lucide-react';
import { apiRequest } from '../../lib/apiClient';

/**
 * Reusable "forgot password" screen, wired to POST /auth/forgot-password and
 * POST /auth/reset-password.
 *
 * Both steps live here rather than handing off to a separate reset route: the
 * reset call needs the role, identifier, code and new password together, and
 * carrying identifier across a navigation would be lost on a page refresh.
 *
 * Props:
 *  - role: 'customer' | 'technician' | 'brand_admin' | 'super_admin'
 *  - variant: 'mobile' | 'admin'
 *  - portalLabel, backTo
 */
const ForgotPassword = ({ role = 'customer', variant = 'mobile', portalLabel = '', backTo = '/login' }) => {
  const navigate = useNavigate();
  const [usePhone, setUsePhone] = useState(true);
  const [value, setValue] = useState('');
  const [sent, setSent] = useState(false);
  const [destination, setDestination] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const isAdmin = variant === 'admin';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!value.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      // The API answers identically whether or not the account exists, so this
      // never reveals which identifiers are registered.
      const res = await apiRequest('/auth/forgot-password', {
        method: 'POST',
        body: { role, identifier: value.trim() },
      });
      setDestination(res?.destination || value.trim());
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await apiRequest('/auth/reset-password', {
        method: 'POST',
        body: { role, identifier: value.trim(), code, newPassword },
      });
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const resendCode = async () => {
    setError('');
    try {
      await apiRequest('/auth/forgot-password', {
        method: 'POST',
        body: { role, identifier: value.trim() },
      });
    } catch (err) {
      setError(err.message);
    }
  };

  const primaryBtn = isAdmin
    ? 'w-full mt-2 bg-[#0D47A1] text-white font-semibold py-2.5 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed'
    : 'w-full mt-2 bg-gradient-to-r from-[#FFD600] to-[#FFCA00] text-[#0D47A1] font-bold py-3 rounded-2xl hover:shadow-lg transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed';

  const fieldCls =
    'w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:border-[#0D47A1] focus:ring-1 focus:ring-[#0D47A1] outline-none transition-all text-sm';

  const errorBlock = error ? (
    <p className="text-xs font-semibold text-red-600 text-center">{error}</p>
  ) : null;

  // Step 3 — password actually changed.
  const doneBlock = (
    <div className="flex flex-col items-center text-center gap-3 py-2">
      <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center">
        <CheckCircle2 className="h-7 w-7 text-green-600" />
      </div>
      <h2 className={isAdmin ? 'text-xl font-semibold text-gray-800' : 'text-lg font-bold text-text-primary'}>
        Password updated
      </h2>
      <p className="text-xs text-text-secondary max-w-xs">
        You can now sign in with your new password.
      </p>
      <button onClick={() => navigate(backTo)} className={primaryBtn}>
        Back to Login
      </button>
    </div>
  );

  // Step 2 — code was sent; collect it along with the new password. The API
  // verifies the code and sets the password in a single call.
  const resetBlock = (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col items-center text-center gap-2 mb-1">
        <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center">
          <CheckCircle2 className="h-7 w-7 text-green-600" />
        </div>
        <h2 className={isAdmin ? 'text-xl font-semibold text-gray-800' : 'text-lg font-bold text-text-primary'}>
          Check your {usePhone ? 'phone' : 'inbox'}
        </h2>
        <p className="text-xs text-text-secondary max-w-xs">
          We&apos;ve sent a reset code to{' '}
          <span className="font-semibold text-text-primary">{destination}</span>.
        </p>
      </div>

      <form onSubmit={handleReset} className="flex flex-col gap-3">
        <input
          type="text"
          inputMode="numeric"
          placeholder="6-digit reset code"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          required
          className={fieldCls}
        />
        <input
          type="password"
          placeholder="New password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          className={fieldCls}
        />
        <input
          type="password"
          placeholder="Confirm new password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          className={fieldCls}
        />
        {errorBlock}
        <button type="submit" disabled={submitting} className={primaryBtn}>
          {submitting ? 'Updating…' : 'Set New Password'}
        </button>
      </form>

      <button
        type="button"
        onClick={resendCode}
        className="text-xs font-semibold text-[#0D47A1] hover:underline"
      >
        Resend code
      </button>
    </div>
  );

  const successBlock = done ? doneBlock : resetBlock;

  const toggle = (
    <div className="flex bg-slate-100/80 rounded-2xl p-1 border border-slate-100">
      <button
        type="button"
        className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all ${
          usePhone ? 'bg-white text-[#0D47A1] shadow-sm' : 'text-text-secondary'
        }`}
        onClick={() => setUsePhone(true)}
      >
        Phone Number
      </button>
      <button
        type="button"
        className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all ${
          !usePhone ? 'bg-white text-[#0D47A1] shadow-sm' : 'text-text-secondary'
        }`}
        onClick={() => setUsePhone(false)}
      >
        Email Address
      </button>
    </div>
  );

  const inputField = (
    <div className="relative">
      {usePhone ? (
        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
      ) : (
        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
      )}
      <input
        type={usePhone ? 'tel' : 'email'}
        placeholder={usePhone ? 'Enter registered phone' : 'Enter registered email'}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        required
        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:border-[#0D47A1] focus:ring-1 focus:ring-[#0D47A1] outline-none transition-all text-sm"
      />
    </div>
  );

  // ---------- ADMIN VARIANT ----------
  if (isAdmin) {
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
              <Cpu className="text-white" size={28} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Nigam Care</h1>
            <p className="text-gray-500 text-sm flex items-center justify-center gap-1">
              <ShieldCheck size={14} className="text-[#0D47A1]" /> {portalLabel}
            </p>
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl p-8 shadow-sm">
            {sent ? (
              successBlock
            ) : (
              <>
                <div className="mb-6 text-center">
                  <h2 className="text-xl font-semibold text-gray-800">Forgot Password</h2>
                  <p className="text-gray-500 text-sm mt-1">We&apos;ll send you a code to reset it</p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-5">
                  {toggle}
                  {inputField}
                  {errorBlock}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-[#0D47A1] text-white font-semibold py-2.5 rounded-xl hover:bg-blue-700 transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <KeyRound size={16} /> {submitting ? 'Sending…' : 'Send Reset Code'}
                  </button>
                </form>
              </>
            )}
            <button
              onClick={() => navigate(backTo)}
              className="w-full mt-5 text-center text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
            >
              ← Back to login
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ---------- MOBILE VARIANT ----------
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[-100px] left-[-100px] w-[300px] h-[300px] bg-[#0D47A1] opacity-10 rounded-full blur-3xl" />
      <div className="absolute bottom-[-100px] right-[-100px] w-[300px] h-[300px] bg-[#FFD600] opacity-20 rounded-full blur-3xl" />

      <div className="w-full max-w-md bg-white/80 backdrop-blur-xl rounded-[30px] shadow-[0_20px_50px_rgba(13,71,161,0.05)] border border-white/50 flex flex-col p-6 relative z-10">
        <div className="flex items-center mb-2">
          <button
            onClick={() => navigate(backTo)}
            className="p-2 hover:bg-white rounded-full transition-all shadow-sm border border-transparent hover:border-slate-100"
          >
            <ArrowLeft className="h-5 w-5 text-[#0D47A1]" />
          </button>
          {portalLabel && (
            <span className="text-xs font-semibold text-[#0D47A1] ml-2 uppercase tracking-wider">{portalLabel}</span>
          )}
        </div>

        {sent ? (
          <div className="pt-4">{successBlock}</div>
        ) : (
          <>
            <div className="flex flex-col items-center mb-5">
              <div className="w-14 h-14 bg-[#E3ECF9] rounded-2xl flex items-center justify-center mb-3">
                <KeyRound className="h-7 w-7 text-[#0D47A1]" />
              </div>
              <h1 className="text-lg font-bold text-text-primary mb-1">Forgot Password</h1>
              <p className="text-text-secondary text-xs text-center">
                Enter your details and we&apos;ll send a reset code
              </p>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              {toggle}
              {inputField}
              {errorBlock}
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-gradient-to-r from-[#FFD600] to-[#FFCA00] text-[#0D47A1] font-bold py-3 rounded-2xl hover:shadow-lg hover:shadow-yellow-400/20 transition-all transform hover:-translate-y-0.5 active:scale-95 mt-1 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? 'Sending…' : 'Send Reset Code'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
