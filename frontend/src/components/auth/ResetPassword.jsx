import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock, Eye, EyeOff, CheckCircle2, ShieldCheck } from 'lucide-react';

/**
 * Reusable "set new password" screen (mobile variant). Simulated: on submit
 * it shows a success state and routes back to login.
 *
 * Props: portalLabel, backTo (login path)
 */
const ResetPassword = ({ portalLabel = '', backTo = '/login' }) => {
  const navigate = useNavigate();
  const [pwd, setPwd] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const strength = (() => {
    let s = 0;
    if (pwd.length >= 8) s++;
    if (/[A-Z]/.test(pwd)) s++;
    if (/[0-9]/.test(pwd)) s++;
    if (/[^A-Za-z0-9]/.test(pwd)) s++;
    return s; // 0..4
  })();
  const strengthLabel = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'][strength];
  const strengthColor = ['bg-slate-200', 'bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-green-500'][strength];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (pwd.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (pwd !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setError('');
    setDone(true);
    setTimeout(() => navigate(backTo), 1600);
  };

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

        {done ? (
          <div className="flex flex-col items-center text-center gap-3 py-6">
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-lg font-bold text-text-primary">Password Updated</h1>
            <p className="text-xs text-text-secondary">Redirecting you to login…</p>
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center mb-5">
              <div className="w-14 h-14 bg-[#E3ECF9] rounded-2xl flex items-center justify-center mb-3">
                <ShieldCheck className="h-7 w-7 text-[#0D47A1]" />
              </div>
              <h1 className="text-lg font-bold text-text-primary mb-1">Set New Password</h1>
              <p className="text-text-secondary text-xs text-center">Create a strong password for your account</p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  type={show ? 'text' : 'password'}
                  placeholder="New password"
                  value={pwd}
                  onChange={(e) => setPwd(e.target.value)}
                  required
                  className="w-full pl-12 pr-11 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:border-[#0D47A1] focus:ring-1 focus:ring-[#0D47A1] outline-none transition-all text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#0D47A1]"
                >
                  {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>

              {pwd && (
                <div className="flex items-center gap-2 px-1">
                  <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden flex gap-1">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={`flex-1 rounded-full transition-colors ${i < strength ? strengthColor : 'bg-slate-200'}`}
                      />
                    ))}
                  </div>
                  <span className="text-[11px] font-semibold text-text-secondary w-16 text-right">{strengthLabel}</span>
                </div>
              )}

              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  type={show ? 'text' : 'password'}
                  placeholder="Confirm new password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:border-[#0D47A1] focus:ring-1 focus:ring-[#0D47A1] outline-none transition-all text-sm"
                />
              </div>

              {error && <p className="text-xs text-red-500 px-1">{error}</p>}

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-[#FFD600] to-[#FFCA00] text-[#0D47A1] font-bold py-3 rounded-2xl hover:shadow-lg hover:shadow-yellow-400/20 transition-all transform hover:-translate-y-0.5 active:scale-95 mt-1"
              >
                Update Password
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
