import React from 'react';
import { useLocation } from 'react-router-dom';
import OtpVerification from '../../components/auth/OtpVerification';

const VerifyOtp = () => {
  const { state } = useLocation();
  return (
    <OtpVerification
      variant="mobile"
      portalLabel="Technician Portal"
      destination={state?.destination || '+91 98•••••210'}
      onVerified="/technician/dashboard"
      backTo="/technician/login"
    />
  );
};

export default VerifyOtp;
