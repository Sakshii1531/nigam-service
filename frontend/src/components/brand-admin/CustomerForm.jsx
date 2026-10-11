import { useState } from 'react';
import { apiRequest } from '../../lib/apiClient';
import { Link } from 'react-router-dom';

const inputClass = 'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-700 outline-none';
export default function CustomerForm({ customer, onClose, onSaved }) {
  const [form, setForm] = useState({ name: customer?.name || '', phone: customer?.phone || '', alternatePhone: customer?.alternatePhone || '', email: customer?.email || '', house: '', city: '', state: '', pincode: '' });
  const [error, setError] = useState('');
  const [existing, setExisting] = useState(null);
  const [busy, setBusy] = useState(false);
  const change = e => setForm({ ...form, [e.target.name]: e.target.value });
  const save = async e => {
    e.preventDefault(); setBusy(true); setError(''); setExisting(null);
    try {
      const body = { name: form.name, email: form.email, alternatePhone: form.alternatePhone };
      if (!customer) {
        body.phone = form.phone;
        if (form.house || form.city || form.state || form.pincode) body.address = { house: form.house, city: form.city, state: form.state, pincode: form.pincode };
      }
      const saved = await apiRequest(customer ? `/brand/customers/${customer.id}` : '/brand/customers', { auth: true, method: customer ? 'PATCH' : 'POST', body, silentError: true });
      onSaved(saved);
    } catch (err) {
      setError(err.message);
      if (err.status === 409 && err.details?.existingId) {
        try { setExisting(await apiRequest(`/brand/customers/search?phone=${encodeURIComponent(form.phone)}`, { auth: true })); } catch { /* Keep the original duplicate message. */ }
      }
    } finally { setBusy(false); }
  };
  return <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget && !busy) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="customer-form-title" className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-auto">
      <h2 id="customer-form-title" className="text-lg font-bold mb-2">{customer ? 'Edit customer' : 'Create customer'}</h2>
      <p className="text-sm text-slate-500 mb-5">{customer ? 'These details belong to the shared customer profile. Changes are visible to other brands serving this customer. Phone changes require verification.' : 'Search by mobile first to avoid duplicate profiles. The customer can sign in with OTP.'}</p>
      <form onSubmit={save} className="space-y-3">
        {[['name', 'Name', 'text'], ['phone', 'Mobile number', 'tel'], ['alternatePhone', 'Alternate mobile', 'tel'], ['email', 'Email', 'email'], ...(!customer ? [['house', 'House / street', 'text'], ['city', 'City', 'text'], ['state', 'State', 'text'], ['pincode', 'Pincode', 'text']] : [])].map(([key, label, type]) => <label key={key} className="block text-sm font-medium text-slate-700">{label}<input className={inputClass} name={key} type={type} value={form[key]} onChange={change} disabled={customer && key === 'phone'} required={key === 'name' || key === 'phone'} pattern={key.toLowerCase().includes('phone') ? '(\\+91\\s*)?([0]?\\s*\\d\\s*){10,11}' : key === 'pincode' ? '[0-9]{6}' : undefined} /></label>)}
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        {existing?.match === 'brand' && <Link className="block text-sm text-blue-800 underline" to={`/brand-admin/customers/${existing.customer.id}`}>Open existing profile</Link>}
        {existing?.match === 'platform' && <p className="text-sm bg-blue-50 p-3 rounded-lg">{existing.customer.name} · {existing.customer.maskedPhone}. This customer exists on NCC. Their profile becomes available when a ticket is registered with your brand.</p>}
        <div className="flex justify-end gap-3 pt-3"><button type="button" onClick={onClose} disabled={busy} className="px-4 py-2 border rounded-lg">Cancel</button><button disabled={busy} className="px-4 py-2 bg-blue-800 text-white rounded-lg">{busy ? 'Saving…' : customer ? 'Save changes' : 'Create customer'}</button></div>
      </form>
    </section>
  </div>;
}
