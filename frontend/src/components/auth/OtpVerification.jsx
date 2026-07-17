import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ShieldCheck, Cpu } from 'lucide-react';

/**
 * Reusable OTP verification screen used by all four panels.
 * Purely simulated / in-memory by default — any 6 digits verify successfully.
 * A caller can opt into real verification via `onSubmit` (Phase 13 — currently
 * only the customer login flow does this; technician/brand-admin/super-admin
 * logins are unchanged, see frontend/docs/PHASE13_INTEGRATION.md).
 *
 * Props:
 *  - variant: 'mobile' (user/technician) | 'admin' (brand/super-admin)
 *  - portalLabel: eyebrow label, e.g. "Technician Portal"
 *  - destination: masked phone/email string shown to the user
 *  - onVerified: path to navigate to on successful verify (used as-is when no
 *    onSubmit is given; ignored in favor of onSubmit's own navigation otherwise)
 *  - backTo: path for the back button / "Change" link
 *  - title, subtitle: optional copy overrides
 *  - onSubmit: optional async (code) => void. Rejecting shows the thrown
 *    Error's `message` inline instead of navigating; resolving is expected to
 *    handle its own navigation (the code that owns the real session knows
 *    better than this generic component where to send the user next).
 *  - onResend: optional async () => void, called instead of the local 30s-reset demo.
 */
const OtpVerification = ({
  variant = 'mobile',
  portalLabel = '',
  destination = '+91 98•••••210',
  onVerified = '/dashboard',
  backTo = '/login',
  title = 'Verify OTP',
  subtitle = 'Enter the 6-digit code we sent to',
  onSubmit,
  onResend,
}) => {
  const navigate = useNavigate();
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [seconds, setSeconds] = useState(30);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const inputsRef = useRef([]);

  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setInterval(() => setSeconds((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [seconds]);

  const filled = digits.every((d) => d !== '');

  const handleChange = (index, value) => {
    const clean = value.replace(/\D/g, '');
    if (!clean) {
      setDigits((prev) => prev.map((d, i) => (i === index ? '' : d)));
      return;
    }
    // support paste of full code into one box
    if (clean.length > 1) {
      const chars = clean.slice(0, 6).split('');
      const next = ['', '', '', '', '', ''];
      chars.forEach((c, i) => (next[i] = c));
      setDigits(next);
      inputsRef.current[Math.min(chars.length, 5)]?.focus();
      return;
    }
    setDigits((prev) => prev.map((d, i) => (i === index ? clean : d)));
    if (index < 5) inputsRef.current[index + 1]?.focus();
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    if (!filled) return;
    setError('');
    setVerifying(true);
    if (onSubmit) {
      try {
        await onSubmit(digits.join(''));
      } catch (err) {
        setError(err?.message || 'Incorrect code. Please try again.');
        setVerifying(false);
      }
      return; // onSubmit owns navigation on success — don't also navigate here.
    }
    setTimeout(() => navigate(onVerified), 700);
  };

  const handleResend = async () => {
    if (seconds > 0) return;
    setError('');
    setDigits(['', '', '', '', '', '']);
    inputsRef.current[0]?.focus();
    if (onResend) {
      try {
        await onResend();
      } catch (err) {
        setError(err?.message || 'Could not resend the code. Please try again.');
      }
    }
    setSeconds(30);
  };

  const isAdmin = variant === 'admin';

  const otpBoxes = (
    <div className="flex justify-center gap-2 sm:gap-3">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => (inputsRef.current[i] = el)}
          type="tel"
          inputMode="numeric"
          maxLength={6}
          value={d}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          className={`w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-bold rounded-2xl outline-none transition-all ${
            d
              ? 'border-2 border-[#0D47A1] bg-[#E3ECF9] text-[#0D47A1]'
              : 'border border-slate-200 bg-slate-50 text-slate-900'
          } focus:border-[#0D47A1] focus:ring-1 focus:ring-[#0D47A1]`}
        />
      ))}
    </div>
  );

  const errorRow = error ? (
    <p className="text-center text-xs font-semibold text-red-600">{error}</p>
  ) : null;

  const resendRow = (
    <div className="text-center text-xs text-text-secondary">
      Didn&apos;t get the code?{' '}
      {seconds > 0 ? (
        <span className="font-semibold text-slate-400">Resend in 0:{seconds.toString().padStart(2, '0')}</span>
      ) : (
        <button onClick={handleResend} className="font-bold text-[#0D47A1] hover:text-blue-800 transition-colors">
          Resend Code
        </button>
      )}
    </div>
  );

  const demoHint = onSubmit ? null : (
    <p className="text-center text-[11px] text-slate-400">Demo: enter any 6 digits to continue</p>
  );

  // ---------- ADMIN VARIANT (brand / super-admin) ----------
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
            <div className="mb-6 text-center">
              <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
              <p className="text-gray-500 text-sm mt-1">
                {subtitle} <span className="font-semibold text-gray-700">{destination}</span>
              </p>
            </div>

            <div className="space-y-6">
              {otpBoxes}
              <button
                onClick={handleVerify}
                disabled={!filled || verifying}
                className="w-full bg-[#0D47A1] text-white font-semibold py-2.5 rounded-xl hover:bg-blue-700 transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {verifying ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Verify & Continue'
                )}
              </button>
              {errorRow}
              {resendRow}
              {demoHint}
              <button
                onClick={() => navigate(backTo)}
                className="w-full text-center text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
              >
                ← Change email / back to login
              </button>
            </div>
          </div>

          <div className="mt-8 text-center">
            <p className="text-xs text-gray-400">© 2026 Nigam Care. All rights reserved.</p>
          </div>
        </motion.div>
      </div>
    );
  }

  // ---------- MOBILE VARIANT (user / technician) ----------
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

        <div className="flex flex-col items-center mb-5">
          <div className="w-14 h-14 bg-[#E3ECF9] rounded-2xl flex items-center justify-center mb-3">
            <ShieldCheck className="h-7 w-7 text-[#0D47A1]" />
          </div>
          <h1 className="text-lg font-bold text-text-primary mb-1">{title}</h1>
          <p className="text-text-secondary text-xs text-center">
            {subtitle}
            <br />
            <span className="font-semibold text-text-primary">{destination}</span>
          </p>
        </div>

        <div className="flex flex-col gap-5">
          {otpBoxes}
          <button
            onClick={handleVerify}
            disabled={!filled || verifying}
            className="w-full bg-gradient-to-r from-[#FFD600] to-[#FFCA00] text-[#0D47A1] font-bold py-3 rounded-2xl hover:shadow-lg hover:shadow-yellow-400/20 transition-all transform hover:-translate-y-0.5 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center"
          >
            {verifying ? (
              <div className="w-5 h-5 border-2 border-[#0D47A1] border-t-transparent rounded-full animate-spin" />
            ) : (
              'Verify & Continue'
            )}
          </button>
          {errorRow}
          {resendRow}
          {demoHint}
        </div>
      </div>
    </div>
  );
};

export default OtpVerification;
