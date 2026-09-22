import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, Mail, Lock, Briefcase, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ApiError } from '../../lib/apiClient';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Partners sign in with their email or their 10-digit phone number. What they
 * type first decides which: a digit means phone (only digits are kept, capped
 * at 10), a letter means email.
 */
function identifierMode(value) {
  if (!value) return null;
  if (/^\d/.test(value)) return 'phone';
  if (/^[a-z]/i.test(value)) return 'email';
  return 'invalid';
}

function identifierError(value) {
  const mode = identifierMode(value);
  if (!mode) return 'Enter your email or 10-digit phone number.';
  if (mode === 'invalid') return 'Start with a letter for email, or a digit for your phone number.';
  if (mode === 'phone' && value.length !== 10) return 'Phone number must be exactly 10 digits.';
  if (mode === 'email' && !EMAIL_PATTERN.test(value)) return 'Enter a valid email address, like name@example.com.';
  return '';
}

const ServiceProviderLogin = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [identifierTouched, setIdentifierTouched] = useState(false);

  const mode = identifierMode(identifier);
  const fieldError = identifierTouched ? identifierError(identifier) : '';

  const handleIdentifierChange = (e) => {
    const raw = e.target.value.replace(/^\s+/, '');
    // Phone mode: digits only, never more than 10.
    const next = /^\d/.test(raw) ? raw.replace(/\D/g, '').slice(0, 10) : raw.replace(/\s/g, '');
    setIdentifier(next);
    if (error) setError('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const password = form.get('password');

    setIdentifierTouched(true);
    if (identifierError(identifier)) return;

    setError('');
    setSubmitting(true);
    try {
      const { destination } = await login({ role: 'service_provider', identifier: identifier.trim(), password });
      navigate('/service-provider/verify-otp', { state: { destination, role: 'service_provider', identifier } });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] relative overflow-x-hidden">

      {/* Background Decorative Blurs */}
      <div className="absolute -top-25 -left-25 w-75 h-75 bg-brand-blue opacity-10 rounded-full blur-3xl"></div>
      <div className="absolute -bottom-25 -right-25 w-75 h-75 bg-brand-yellow opacity-20 rounded-full blur-3xl"></div>

      {/* Single layer of responsive gutter padding, matching the customer
          login page — always vertically centered since this form is short
          and never needs to scroll. */}
      <div className="min-h-screen w-full flex items-center justify-center px-3 sm:px-4 md:px-6 py-6 sm:py-10">

      <div className="w-full max-w-md bg-white/90 backdrop-blur-xl rounded-2xl sm:rounded-[30px] shadow-[0_20px_50px_rgba(13,71,161,0.05)] border border-white/50 overflow-hidden flex flex-col p-5 sm:p-6 md:p-8 relative z-10">

        {/* Portal label — no back button: there is no previous page in this
            flow to return to, and it used to send partners into the
            customer login instead. */}
        <span className="text-xs font-semibold text-brand-blue mb-2 uppercase tracking-wider text-center">Service Provider Portal</span>

        {/* Logo/Brand */}
        <div className="flex flex-col items-center mt-2 mb-4">
          <div className="w-12 h-12 bg-[#E3ECF9] rounded-2xl flex items-center justify-center mb-1">
            <Briefcase className="h-6 w-6 text-brand-blue" />
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-800 mb-1">Partner Login</h1>
          <p className="text-slate-500 text-xs">Access your job dashboard and earnings</p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 bg-rose-50 border border-rose-100 rounded-2xl p-3.5 text-center text-xs font-bold text-rose-600 animate-shake">
            ⚠️ {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="flex flex-col gap-3">
          
          {/* Email or phone */}
          <div className="flex flex-col gap-1">
            <label htmlFor="sp-login-identifier" className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Email or Phone Number</label>
            <div className="relative">
              {mode === 'email' ? (
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" aria-hidden="true" />
              ) : (
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" aria-hidden="true" />
              )}
              <input
                id="sp-login-identifier"
                type="text"
                name="identifier"
                value={identifier}
                onChange={handleIdentifierChange}
                onBlur={() => identifier && setIdentifierTouched(true)}
                inputMode={mode === 'phone' ? 'numeric' : mode === 'email' ? 'email' : 'text'}
                autoComplete={mode === 'phone' ? 'tel-national' : 'username'}
                autoCapitalize="none"
                spellCheck={false}
                maxLength={mode === 'phone' ? 10 : 254}
                placeholder="Email or 10-digit phone number"
                aria-invalid={Boolean(fieldError)}
                aria-describedby="sp-login-identifier-help"
                className={`w-full pl-12 pr-4 py-2.5 bg-white/50 border rounded-2xl focus:ring-1 outline-none transition-all text-[13px] shadow-xs focus:shadow-md ${
                  fieldError ? 'border-red-400 focus:border-red-500 focus:ring-red-500' : 'border-slate-200 focus:border-brand-blue focus:ring-brand-blue'
                }`}
              />
            </div>
            {fieldError && (
              <p
                id="sp-login-identifier-help"
                className="text-xs text-red-600 font-semibold"
              >
                {fieldError}
              </p>
            )}
          </div>

          {/* Password Field */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Enter Password"
                className="w-full pl-12 pr-12 py-2.5 bg-white/50 border border-slate-200 rounded-2xl focus:border-brand-blue focus:ring-1 focus:ring-brand-blue outline-none transition-all text-[13px] shadow-xs focus:shadow-md"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Forgot Password */}
          <button
            type="button"
            onClick={() => navigate('/service-provider/forgot-password')}
            className="text-xs font-semibold text-brand-blue self-end hover:text-blue-800 transition-colors"
          >
            Forgot Password?
          </button>

          {/* Action Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-linear-to-r from-brand-yellow to-[#FFCA00] text-brand-blue font-bold py-3 rounded-2xl hover:shadow-lg hover:shadow-yellow-400/20 transition-all transform hover:-translate-y-0.5 mt-2 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? 'Connecting...' : 'Login to Dashboard'}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-4 text-center text-xs text-slate-500 border-t border-slate-100 pt-3">
          Want to become a partner?{' '}
          <button
            type="button"
            onClick={() => navigate('/service-provider/apply')}
            className="font-bold text-brand-blue hover:text-blue-800 transition-colors"
          >
            Apply Now
          </button>
        </div>

      </div>
      </div>
    </div>
  );
};

export default ServiceProviderLogin;
