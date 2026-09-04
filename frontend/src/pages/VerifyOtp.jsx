import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import OtpVerification from '../components/auth/OtpVerification';
import { useAuth } from '../context/AuthContext';

// Phase 13 — the customer login flow is real: identifier/role from Login.jsx's
// navigation state, code entered here goes to the actual /auth/otp/verify
// endpoint via AuthContext.verifyOtp(). If this page is reached without that
// state (e.g. a direct URL visit), there's no role/identifier to verify
// against, so it falls back to the component's original demo behavior rather
// than throwing — same reasoning as the other three portals, which don't have
// a real backend flow wired up yet at all.
import { getActiveCities, isCityServiceable } from '../utils/serviceableCities';

const VerifyOtp = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { verifyOtp, resendOtp, signupVerify } = useAuth();

  const hasRealSession = state?.role && state?.identifier;
  const isSignup = state?.purpose === 'signup';

  const handleVerify = async (code) => {
    if (isSignup) {
      const newUser = await signupVerify({ ...state.signupData, code });
      const city = state?.signupData?.city || newUser?.addresses?.[0]?.city || '';
      const activeCities = await getActiveCities();
      if (city && !isCityServiceable(city, activeCities)) {
        navigate('/area-not-serviceable', { replace: true });
        return;
      }
      navigate('/dashboard', { replace: true });
    } else {
      const sessionUser = await verifyOtp({ role: state.role, identifier: state.identifier, code });
      const city = sessionUser?.addresses?.[0]?.city || '';
      if (city) {
        const activeCities = await getActiveCities();
        if (!isCityServiceable(city, activeCities)) {
          navigate('/area-not-serviceable', { replace: true });
          return;
        }
      }
      navigate('/dashboard', { replace: true });
    }
  };

  const handleResend = async () => {
    await resendOtp({
      role: state.role,
      identifier: state.identifier,
      purpose: state.purpose || 'login'
    });
  };

  const handleBack = () => {
    if (isSignup) {
      navigate('/login', { state: { signupData: state.signupData, isSignup: true } });
    } else {
      navigate('/login');
    }
  };

  return (
    <OtpVerification
      variant="mobile"
      destination={state?.destination || '+91 98•••••210'}
      backTo="/login"
      onBackClick={handleBack}
      onSubmit={hasRealSession ? handleVerify : undefined}
      onResend={hasRealSession ? handleResend : undefined}
    />
  );
};

export default VerifyOtp;
