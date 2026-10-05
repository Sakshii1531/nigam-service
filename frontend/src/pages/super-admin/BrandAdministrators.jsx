import { useEffect, useMemo, useState } from 'react';
import { Building2, CheckCircle2, Edit2, KeyRound, Plus, Search, ShieldCheck, X } from 'lucide-react';
import Sidebar from '../../components/super-admin/Sidebar';
import Topbar from '../../components/super-admin/Topbar';
import { apiRequest } from '../../lib/apiClient';

const EMPTY_FORM = { name: '', email: '', phone: '', brand: '', temporaryPassword: '' };
const FIELD_CLASS = 'w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-600';

function makeTemporaryPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$';
  const bytes = new Uint32Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (value) => chars[value % chars.length]).join('');
}

export default function BrandAdministrators() {
  const [admins, setAdmins] = useState([]);
  const [brands, setBrands] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const notify = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 3500);
  };

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [adminRows, brandRows] = await Promise.all([
        apiRequest('/super-admin/brand-admins', { auth: true }),
        apiRequest('/super-admin/brands', { auth: true }),
      ]);
      setAdmins(adminRows || []);
      setBrands(brandRows || []);
    } catch (err) {
      setError(err.message || 'Could not load brand administrators.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      apiRequest('/super-admin/brand-admins', { auth: true }),
      apiRequest('/super-admin/brands', { auth: true }),
    ]).then(([adminRows, brandRows]) => {
      if (cancelled) return;
      setAdmins(adminRows || []);
      setBrands(brandRows || []);
    }).catch((err) => {
      if (!cancelled) setError(err.message || 'Could not load brand administrators.');
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return admins;
    return admins.filter((admin) => [admin.name, admin.email, admin.phone, admin.brand?.name]
      .some((value) => String(value || '').toLowerCase().includes(needle)));
  }, [admins, query]);

  const openCreate = () => {
    setSelected(null);
    setForm({ ...EMPTY_FORM, brand: brands[0]?.id || '', temporaryPassword: makeTemporaryPassword() });
    setModal('edit');
  };

  const openEdit = (admin) => {
    setSelected(admin);
    setForm({ name: admin.name, email: admin.email, phone: admin.phone || '', brand: admin.brand?.id || '', temporaryPassword: '' });
    setModal('edit');
  };

  const saveAdmin = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (selected) {
        await apiRequest(`/super-admin/brand-admins/${selected.id}`, {
          method: 'PUT', auth: true,
          body: { name: form.name, email: form.email, phone: form.phone, brand: form.brand },
        });
        notify('Brand administrator updated.');
      } else {
        await apiRequest('/super-admin/brand-admins', { method: 'POST', auth: true, body: form });
        notify('Brand administrator created. Share the temporary credentials securely.');
      }
      setModal(null);
      await load();
    } catch (err) {
      setError(err.message || 'Could not save the brand administrator.');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (admin) => {
    const status = admin.status === 'Active' ? 'Suspended' : 'Active';
    try {
      await apiRequest(`/super-admin/brand-admins/${admin.id}`, { method: 'PUT', auth: true, body: { status } });
      setAdmins((rows) => rows.map((row) => row.id === admin.id ? { ...row, status } : row));
      notify(`Account ${status === 'Active' ? 'activated' : 'suspended'}.`);
    } catch (err) { setError(err.message); }
  };

  const resetPassword = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await apiRequest(`/super-admin/brand-admins/${selected.id}/temporary-password`, {
        method: 'PATCH', auth: true, body: { temporaryPassword: form.temporaryPassword },
      });
      setAdmins((rows) => rows.map((row) => row.id === selected.id ? { ...row, mustChangePassword: true } : row));
      setModal(null);
      notify('Temporary password reset. The administrator must set a new password on next login.');
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex relative">
      <Sidebar />
      <div className="flex-1 ml-64 min-h-screen flex flex-col">
        <Topbar title="Brand Administrators" subtitle="Create and manage Brand Panel login accounts" />
        <main className="p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Stat icon={<ShieldCheck size={20} />} label="Total administrators" value={admins.length} />
            <Stat icon={<CheckCircle2 size={20} />} label="Active accounts" value={admins.filter((a) => a.status === 'Active').length} />
            <Stat icon={<KeyRound size={20} />} label="Awaiting password change" value={admins.filter((a) => a.mustChangePassword).length} />
          </div>

          <section className="bg-white border border-slate-200 rounded-2xl shadow-sm">
            <div className="p-4 border-b border-slate-200 flex flex-wrap gap-3 items-center justify-between">
              <div className="relative w-full sm:w-80">
                <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, email, phone or brand"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-600" />
              </div>
              <button onClick={openCreate} disabled={!brands.length}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0D47A1] text-white text-sm font-bold disabled:opacity-50">
                <Plus size={16} /> Add Brand Administrator
              </button>
            </div>
            {error && <div className="m-4 p-3 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div>}
            {!brands.length && !loading && <div className="m-4 p-3 rounded-xl bg-amber-50 text-amber-800 text-sm">Create a Brand Partner first, then add its administrator here.</div>}
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-[11px] uppercase text-slate-500"><tr>
                  <th className="px-5 py-3">Administrator</th><th className="px-5 py-3">Brand</th><th className="px-5 py-3">Login status</th><th className="px-5 py-3">Account</th><th className="px-5 py-3 text-right">Actions</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {loading && <tr><td colSpan={5} className="py-12 text-center text-slate-500">Loading administrators…</td></tr>}
                  {!loading && !filtered.length && <tr><td colSpan={5} className="py-12 text-center text-slate-500">No brand administrators found.</td></tr>}
                  {filtered.map((admin) => <tr key={admin.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4"><div className="font-bold text-slate-800">{admin.name}</div><div className="text-xs text-slate-500">{admin.email}{admin.phone ? ` · ${admin.phone}` : ''}</div></td>
                    <td className="px-5 py-4"><span className="inline-flex items-center gap-1.5 font-semibold text-slate-700"><Building2 size={14} />{admin.brand?.name || 'Unassigned'}</span></td>
                    <td className="px-5 py-4"><span className={`px-2.5 py-1 rounded-full text-xs font-bold ${admin.mustChangePassword ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-700'}`}>{admin.mustChangePassword ? 'Temporary password' : 'Password set'}</span></td>
                    <td className="px-5 py-4"><button onClick={() => toggleStatus(admin)} className={`px-2.5 py-1 rounded-full text-xs font-bold ${admin.status === 'Active' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'}`}>{admin.status}</button></td>
                    <td className="px-5 py-4"><div className="flex justify-end gap-2">
                      <button onClick={() => openEdit(admin)} title="Edit" className="p-2 rounded-lg text-blue-700 hover:bg-blue-50"><Edit2 size={16} /></button>
                      <button onClick={() => { setSelected(admin); setForm({ ...EMPTY_FORM, temporaryPassword: makeTemporaryPassword() }); setModal('reset'); }} title="Reset temporary password" className="p-2 rounded-lg text-amber-700 hover:bg-amber-50"><KeyRound size={16} /></button>
                    </div></td>
                  </tr>)}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>

      {modal && <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl">
          <div className="px-6 py-4 border-b border-slate-200 flex justify-between"><div><h2 className="font-black text-slate-900">{modal === 'reset' ? 'Reset temporary password' : selected ? 'Edit brand administrator' : 'Add brand administrator'}</h2><p className="text-xs text-slate-500 mt-1">{modal === 'reset' ? selected?.email : 'Brand Panel login credentials'}</p></div><button onClick={() => setModal(null)}><X size={20} /></button></div>
          <form onSubmit={modal === 'reset' ? resetPassword : saveAdmin} className="p-6 space-y-4">
            {modal === 'edit' && <>
              <Field label="Full name"><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={FIELD_CLASS} /></Field>
              <Field label="Login email"><input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={FIELD_CLASS} /></Field>
              <Field label="Phone for OTP"><input required inputMode="numeric" pattern="[0-9]{10}" maxLength={10} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '') })} className={FIELD_CLASS} /><p className="text-xs text-slate-500 mt-1.5">They sign in with email; the verification code is sent to this phone.</p></Field>
              <Field label="Brand partner"><select required value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} className={FIELD_CLASS}>{brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}</select></Field>
            </>}
            {(!selected || modal === 'reset') && <Field label="Temporary password"><div className="flex gap-2"><input required minLength={6} value={form.temporaryPassword} onChange={(e) => setForm({ ...form, temporaryPassword: e.target.value })} className={`${FIELD_CLASS} flex-1`} /><button type="button" onClick={() => setForm({ ...form, temporaryPassword: makeTemporaryPassword() })} className="px-3 rounded-xl bg-slate-100 text-xs font-bold">Generate</button><button type="button" onClick={async () => { await navigator.clipboard.writeText(form.temporaryPassword); notify('Temporary password copied.'); }} className="px-3 rounded-xl bg-blue-50 text-blue-700 text-xs font-bold">Copy</button></div><p className="text-xs text-slate-500 mt-1.5">Share it securely. It only works for initial access; the user must replace it immediately after login.</p></Field>}
            <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setModal(null)} className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-bold">Cancel</button><button disabled={saving} className="px-4 py-2 rounded-xl bg-[#0D47A1] text-white text-sm font-bold disabled:opacity-60">{saving ? 'Saving…' : modal === 'reset' ? 'Reset Password' : selected ? 'Save Changes' : 'Create Login'}</button></div>
          </form>
        </div>
      </div>}
      {toast && <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[60] bg-green-600 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-bold">{toast}</div>}
    </div>
  );
}

function Stat({ icon, label, value }) {
  return <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">{icon}</div><div><div className="text-2xl font-black text-slate-900">{value}</div><div className="text-xs text-slate-500 font-semibold">{label}</div></div></div>;
}

function Field({ label, children }) {
  return <label className="block"><span className="block mb-1.5 text-xs font-bold text-slate-600">{label}</span>{children}</label>;
}
