import React from 'react';
import ForgotPasswordScreen from '../../components/auth/ForgotPassword';

const ForgotPassword = () => (
  <ForgotPasswordScreen role="asm" variant="admin" portalLabel="ASM Portal" backTo="/asm/login" />
);

export default ForgotPassword;
