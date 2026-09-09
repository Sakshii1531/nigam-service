import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import OtpVerification from '../../components/auth/OtpVerification';
import { useAuth } from '../../context/AuthContext';

const VerifyOtp = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { verifyOtp: authVerifyOtp, resendOtp: authResendOtp } = useAuth();

  const hasRealSession = Boolean(state?.role && state?.identifier);

  const handleVerify = async (code) => {
    await authVerifyOtp({
      role: state.role,
      identifier: state.identifier,
      code,
    });
    navigate('/asm/dashboard');
  };

  const handleResend = async () => {
    await authResendOtp({
      role: state.role,
      identifier: state.identifier,
      purpose: 'login',
    });
  };

  return (
    <OtpVerification
      variant="admin"
      portalLabel="ASM Portal"
      destination={state?.destination || 'asm•••@nigamcare.com'}
      onSubmit={hasRealSession ? handleVerify : undefined}
      onResend={hasRealSession ? handleResend : undefined}
      backTo="/asm/login"
    />
  );
};

export default VerifyOtp;
