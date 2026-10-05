import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, ShieldCheck } from 'lucide-react';
import { apiRequest } from '../../lib/apiClient';
import { useAuth } from '../../context/AuthContext';

export default function ChangePassword() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (password.length < 6) return setError('Password must be at least 6 characters.');
    if (password !== confirmPassword) return setError('Password and confirm password do not match.');
    setSaving(true);
    try {
      await apiRequest('/auth/first-login-password', { method: 'PATCH', auth: true, portal: 'brand_admin', body: { newPassword: password } });
      await logout('brand_admin');
      navigate('/brand-admin/login', { replace: true, state: { passwordChanged: true } });
    } catch (err) { setError(err.message || 'Could not set your password.'); }
    finally { setSaving(false); }
  };

  return <div className="min-h-screen bg-[#F5F7FB] flex items-center justify-center p-4">
    <div className="max-w-md w-full">
      <div className="text-center mb-7"><div className="inline-flex w-14 h-14 rounded-2xl bg-[#0D47A1] text-white items-center justify-center mb-4"><ShieldCheck size={28} /></div><h1 className="text-2xl font-black text-slate-900">Create Your Password</h1><p className="text-sm text-slate-500 mt-2">For security, replace the temporary password before entering the Brand Panel.</p></div>
      <form onSubmit={submit} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-7 space-y-5">
        {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded-xl">{error}</div>}
        <PasswordField label="Password" value={password} setValue={setPassword} show={show} toggle={() => setShow(!show)} />
        <PasswordField label="Confirm password" value={confirmPassword} setValue={setConfirmPassword} show={show} />
        <div className="p-3 rounded-xl bg-blue-50 text-blue-800 text-xs">Your login email stays the same. Super Admin cannot see the password you set here.</div>
        <button disabled={saving} className="w-full py-3 rounded-xl bg-[#0D47A1] text-white font-bold disabled:opacity-60">{saving ? 'Setting password…' : 'Set Password & Continue'}</button>
      </form>
    </div>
  </div>;
}

function PasswordField({ label, value, setValue, show, toggle }) {
  return <label className="block"><span className="block text-sm font-semibold text-slate-700 mb-1.5">{label}</span><div className="relative"><Lock size={18} className="absolute left-3.5 top-3 text-slate-400" /><input required minLength={6} type={show ? 'text' : 'password'} value={value} onChange={(e) => setValue(e.target.value)} className="w-full pl-11 pr-11 py-2.5 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-blue-600" />{toggle && <button type="button" onClick={toggle} className="absolute right-3.5 top-2.5 text-slate-400">{show ? <EyeOff size={18} /> : <Eye size={18} />}</button>}</div></label>;
}
