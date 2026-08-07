import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import OtpVerification from '../../components/auth/OtpVerification';
import { useAuth } from '../../context/AuthContext';

const VerifyOtp = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { verifyOtp: authVerifyOtp, resendOtp: authResendOtp } = useAuth();

  // Without the identifier the login step navigated here with, there is
  // nothing to verify against.
  const hasRealSession = Boolean(state?.role && state?.identifier);

  const handleVerify = async (code) => {
    await authVerifyOtp({
      role: state.role,
      identifier: state.identifier,
      code
    });
    navigate('/super-admin/dashboard');
  };

  const handleResend = async () => {
    await authResendOtp({
      role: state.role,
      identifier: state.identifier,
      purpose: 'login'
    });
  };

  return (
    <OtpVerification
      variant="admin"
      portalLabel="Super Admin Portal"
      destination={state?.destination || 'admin1•••@gmail.com'}
      onSubmit={hasRealSession ? handleVerify : undefined}
      onResend={hasRealSession ? handleResend : undefined}
      backTo="/super-admin/login"
    />
  );
};

export default VerifyOtp;
