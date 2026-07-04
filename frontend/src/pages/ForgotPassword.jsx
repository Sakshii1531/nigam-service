import React from 'react';
import ForgotPasswordScreen from '../components/auth/ForgotPassword';

const ForgotPassword = () => (
  <ForgotPasswordScreen variant="mobile" backTo="/login" resetTo="/reset-password" />
);

export default ForgotPassword;
