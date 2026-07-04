import React from 'react';
import { useLocation } from 'react-router-dom';
import OtpVerification from '../../components/auth/OtpVerification';

const VerifyOtp = () => {
  const { state } = useLocation();
  return (
    <OtpVerification
      variant="admin"
      portalLabel="Brand Portal"
      destination={state?.destination || 'admin1•••@gmail.com'}
      onVerified="/brand-admin/dashboard"
      backTo="/brand-admin/login"
    />
  );
};

export default VerifyOtp;
