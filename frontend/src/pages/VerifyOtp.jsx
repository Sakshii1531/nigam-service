import React from 'react';
import { useLocation } from 'react-router-dom';
import OtpVerification from '../components/auth/OtpVerification';

const VerifyOtp = () => {
  const { state } = useLocation();
  return (
    <OtpVerification
      variant="mobile"
      destination={state?.destination || '+91 98•••••210'}
      onVerified="/dashboard"
      backTo="/login"
    />
  );
};

export default VerifyOtp;
