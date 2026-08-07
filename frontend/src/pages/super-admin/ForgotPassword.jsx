import React from 'react';
import ForgotPasswordScreen from '../../components/auth/ForgotPassword';

const ForgotPassword = () => (
  <ForgotPasswordScreen role="super_admin" variant="admin" portalLabel="Super Admin Portal" backTo="/super-admin/login" />
);

export default ForgotPassword;
