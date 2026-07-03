import React from 'react';
import ForgotPasswordScreen from '../../components/auth/ForgotPassword';

const ForgotPassword = () => (
  <ForgotPasswordScreen variant="admin" portalLabel="Brand Portal" backTo="/brand-admin/login" />
);

export default ForgotPassword;
