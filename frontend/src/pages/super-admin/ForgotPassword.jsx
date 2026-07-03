import React from 'react';
import ForgotPasswordScreen from '../../components/auth/ForgotPassword';

const ForgotPassword = () => (
  <ForgotPasswordScreen variant="admin" portalLabel="Super Admin Portal" backTo="/super-admin/login" />
);

export default ForgotPassword;
