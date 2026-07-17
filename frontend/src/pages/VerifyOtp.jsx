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
  const { verifyOtp, resendOtp } = useAuth();

  const hasRealSession = state?.role && state?.identifier;

  return (
    <OtpVerification
      variant="mobile"
      destination={state?.destination || '+91 98•••••210'}
      onVerified="/dashboard"
      backTo="/login"
      onSubmit={
        hasRealSession
          ? async (code) => {
              await verifyOtp({ role: state.role, identifier: state.identifier, code });
              navigate('/dashboard');
            }
          : undefined
      }
      onResend={
        hasRealSession ? async () => resendOtp({ role: state.role, identifier: state.identifier }) : undefined
      }
    />
  );
};

export default VerifyOtp;
