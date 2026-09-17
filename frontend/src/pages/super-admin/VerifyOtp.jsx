import { useLocation, useNavigate } from 'react-router-dom';
import OtpVerification from '../../components/auth/OtpVerification';
import { useAuth } from '../../context/AuthContext';

const VerifyOtp = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { verifyOtp: authVerifyOtp, resendOtp: authResendOtp } = useAuth();

  // Without the identifier the login step navigated here with, there is
  // nothing to verify against.
  const hasRealSession = Boolean(state?.role && state?.identifier);

  const handleVerify = async (code) => {
    const user = await authVerifyOtp({
      role: state.role,
      identifier: state.identifier,
      code
    });
    // A temporary credential (super-admin-issued, asm.service.js's
    // createAsm) must be replaced before anything else is reachable — the
    // App.jsx route guard enforces this too, so a direct URL visit can't
    // skip it. super_admin accounts are never provisioned this way today,
    // but the check is generic rather than asm-specific.
    if (user?.mustChangePassword) {
      navigate('/super-admin/change-password');
    } else if (user?.role === 'asm') {
      // An ASM's role-scoped home — the platform-wide analytics dashboard
      // isn't meaningful (or appropriate) for a single-zone account.
      navigate('/super-admin/zone-dashboard');
    } else {
      navigate('/super-admin/dashboard');
    }
  };

  const handleResend = async () => {
    await authResendOtp({
      role: state.role,
      identifier: state.identifier,
      purpose: 'login'
    });
  };

  return (
    <OtpVerification
      variant="admin"
      portalLabel="Super Admin Portal"
      destination={state?.destination || 'admin1•••@gmail.com'}
      onSubmit={hasRealSession ? handleVerify : undefined}
      onResend={hasRealSession ? handleResend : undefined}
      backTo="/super-admin/login"
    />
  );
};

export default VerifyOtp;
