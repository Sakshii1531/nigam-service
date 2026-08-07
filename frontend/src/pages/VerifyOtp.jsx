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
const VerifyOtp = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { verifyOtp, resendOtp, signupVerify } = useAuth();

  const hasRealSession = state?.role && state?.identifier;
  const isSignup = state?.purpose === 'signup';

  const handleVerify = async (code) => {
    if (isSignup) {
      await signupVerify({ ...state.signupData, code });
      navigate('/dashboard');
    } else {
      await verifyOtp({ role: state.role, identifier: state.identifier, code });
      navigate('/dashboard');
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
