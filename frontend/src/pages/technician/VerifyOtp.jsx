import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import OtpVerification from '../../components/auth/OtpVerification';
import { useAuth } from '../../context/AuthContext';

const VerifyOtp = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { verifyOtp, resendOtp } = useAuth();

  const hasRealSession = state?.role && state?.identifier;

  return (
    <OtpVerification
      variant="mobile"
      portalLabel="Technician Portal"
      destination={state?.destination || '+91 90•••••001'}
      backTo="/technician/login"
      onSubmit={
        hasRealSession
          ? async (code) => {
              await verifyOtp({ role: state.role, identifier: state.identifier, code });
              navigate('/technician/dashboard');
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
