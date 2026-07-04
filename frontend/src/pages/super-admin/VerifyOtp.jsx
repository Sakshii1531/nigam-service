import React from 'react';
import { useLocation } from 'react-router-dom';
import OtpVerification from '../../components/auth/OtpVerification';

const VerifyOtp = () => {
  const { state } = useLocation();
  return (
    <OtpVerification
      variant="admin"
      portalLabel="Super Admin Portal"
      destination={state?.destination || 'admin1•••@gmail.com'}
      onVerified="/super-admin/dashboard"
      backTo="/super-admin/login"
    />
  );
};

export default VerifyOtp;
