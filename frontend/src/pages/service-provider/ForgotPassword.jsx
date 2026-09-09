import React from 'react';
import ForgotPasswordScreen from '../../components/auth/ForgotPassword';

const ForgotPassword = () => (
  <ForgotPasswordScreen role="technician" variant="mobile" portalLabel="Technician Portal" backTo="/technician/login" />
);

export default ForgotPassword;
