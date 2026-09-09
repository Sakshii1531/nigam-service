import React from 'react';
import ForgotPasswordScreen from '../../components/auth/ForgotPassword';

const ForgotPassword = () => (
  <ForgotPasswordScreen role="service_provider" variant="mobile" portalLabel="Service Provider Portal" backTo="/service-provider/login" />
);

export default ForgotPassword;
