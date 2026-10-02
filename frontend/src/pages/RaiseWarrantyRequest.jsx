import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { FileText, CreditCard, Camera, MapPin, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { WarrantyHeader, DocumentTile, AddDocumentButton, DocumentChip, ErrorNote } from '../components/partner-warranty/ui';
import { warrantyApi } from '../lib/partnerWarrantyApi';

// The customer's warranty claim form (docs/partner-warranty Phase 12) — the
// approved layout, now submitting a real claim. Required fields use native
// `required` so the browser blocks an incomplete submit; `:user-invalid`
// styles a field only after the customer has interacted with it, and
// aria-invalid is kept in step for screen readers.

const today = () => new Date().toISOString().slice(0, 10);

/** Keep aria-invalid in step with the browser's :user-invalid state. */
function syncAria(e) {
  const el = e.target;
  if (!el.matches?.('input, textarea, select')) return;
  if (el.matches(':user-invalid')) el.setAttribute('aria-invalid', 'true');
  else el.removeAttribute('aria-invalid');
}

const inputClass =
  'peer w-full px-4 py-3.5 bg-slate-50 border border-slate-200/60 rounded-2xl text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue/20 user-invalid:border-red-400 user-invalid:bg-red-50/50';
const errorClass = 'hidden peer-user-invalid:flex items-center gap-1 text-[11px] font-semibold text-red-600 mt-1';

function Field({ id, label, required, children, error }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-bold text-slate-700">
        {label}
        {required && <span aria-hidden="true" className="text-red-500"> *</span>}
      </label>
      <div>
        {children}
        {error && (
          <p id={`${id}-error`} className={errorClass}>
            <span aria-hidden="true">⚠</span> {error}
          </p>
        )}
      </div>
    </div>
  );
}

function addressLine(a) {
  return [a.house, a.landmark, a.city, a.state].filter(Boolean).join(', ');
}

const RaiseWarrantyRequest = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { group, brandId, categoryId } = useParams();
  const picked = location.state || {};

  const savedAddresses = useMemo(() => user?.addresses || [], [user]);
  const defaultAddress = savedAddresses.find((a) => a.isDefault) || savedAddresses[0];

  const [docs, setDocs] = useState({ invoice: null, warranty_card: null, product_photo: null });
  const [extra, setExtra] = useState([]);
  const [form, setForm] = useState({ modelNumber: '', serialNumber: '', purchaseDate: '', remarks: '' });
  const [addressId, setAddressId] = useState(defaultAddress ? String(defaultAddress._id || defaultAddress.id) : 'new');
  const [newAddress, setNewAddress] = useState({ house: '', landmark: '', city: '', state: '', pincode: '' });
  const [tried, setTried] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const setAddr = (key) => (e) => setNewAddress((a) => ({ ...a, [key]: e.target.value }));

  if (!picked.issueId) {
    // Reached directly (refresh, shared link): the issue choice lives in navigation state.
    return (
      <div className="min-h-screen bg-blue-50/50 flex flex-col">
        <WarrantyHeader title="Raise Warranty Request" />
        <div className="p-6 max-w-lg mx-auto w-full flex flex-col gap-4">
          <p className="bg-white border border-slate-200 rounded-2xl p-5 text-sm text-slate-600">Please choose the issue with your product first.</p>
          <Link
            to={/^[a-f0-9]{24}$/i.test(brandId || '') && /^[a-f0-9]{24}$/i.test(categoryId || '') ? `/partner-warranty/issues/${group}/${brandId}/${categoryId}` : '/partner-warranty'}
            className="text-center py-3.5 bg-brand-navy text-white font-bold rounded-2xl"
          >
            Choose Issue
          </Link>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-blue-50/50 flex flex-col">
        <WarrantyHeader title="Raise Warranty Request" />
        <div className="p-6 max-w-lg mx-auto w-full flex flex-col gap-4">
          <p className="bg-white border border-slate-200 rounded-2xl p-5 text-sm text-slate-600">Log in to raise a warranty claim — we'll keep you updated on it.</p>
          <Link to="/login" state={{ from: location }} className="text-center py-3.5 bg-brand-navy text-white font-bold rounded-2xl">
            Log in
          </Link>
        </div>
      </div>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    setTried(true);
    setError(null);
    if (!docs.invoice) {
      setError({ message: 'Please upload the purchase bill / invoice.' });
      return;
    }
    const documents = [
      ...Object.entries(docs).filter(([, d]) => d).map(([kind, d]) => ({ kind, url: d.url, name: d.name })),
      ...extra.map((d) => ({ kind: 'additional', url: d.url, name: d.name })),
    ];
    const body = {
      brandId,
      categoryId,
      issueId: picked.issueId,
      modelNumber: form.modelNumber.trim(),
      serialNumber: form.serialNumber.trim(),
      purchaseDate: form.purchaseDate,
      remarks: form.remarks.trim() || undefined,
      documents,
      ...(addressId === 'new'
        ? { address: Object.fromEntries(Object.entries(newAddress).map(([k, v]) => [k, v.trim() || undefined])) }
        : { addressId }),
    };
    setSubmitting(true);
    try {
      const claim = await warrantyApi.submit(body);
      navigate('/partner-warranty/ticket-success', { replace: true, state: { claim } });
    } catch (err) {
      setError({ message: err.message || 'Could not submit the claim.', existing: err.details?.existingClaim });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-blue-50/50 flex flex-col pb-8">
      <WarrantyHeader title="Raise Warranty Request" back={`/partner-warranty/issues/${group}/${brandId}/${categoryId}`} />

      <form onSubmit={submit} onBlur={syncAria} onInput={syncAria} className="flex-1 p-4 sm:p-6 flex flex-col gap-6 max-w-lg mx-auto w-full">
        <div className="bg-white border border-slate-200/80 rounded-2xl px-5 py-4">
          <p className="text-xs text-slate-400 font-semibold">Your request</p>
          <p className="text-sm font-black text-brand-navy">
            {picked.productName} · {picked.issueName}
          </p>
        </div>

        <fieldset className="flex flex-col gap-3">
          <legend className="text-sm font-black text-black tracking-wide pl-1 mb-3">Upload Documents</legend>
          <div className="flex gap-3">
            <DocumentTile label="Bill / Invoice" icon={FileText} required invalid={tried} value={docs.invoice} onChange={(d) => {
                setDocs((s) => ({ ...s, invoice: d }));
                if (d) setError(null); // the "upload the invoice" message no longer applies
              }} />
            <DocumentTile label="Warranty Card" icon={CreditCard} value={docs.warranty_card} onChange={(d) => setDocs((s) => ({ ...s, warranty_card: d }))} />
            <DocumentTile label="Product Photo" icon={Camera} value={docs.product_photo} onChange={(d) => setDocs((s) => ({ ...s, product_photo: d }))} />
          </div>
          <p className="text-[11px] text-slate-500 pl-1">Photos (JPG, PNG, WebP) or PDF, up to 10 MB each.</p>
        </fieldset>

        <fieldset className="flex flex-col gap-3">
          <legend className="text-sm font-black text-black tracking-wide pl-1 mb-3">
            Additional Photos <span className="text-slate-400 font-normal text-xs">(Optional)</span>
          </legend>
          <div className="flex flex-wrap gap-3">
            {extra.map((doc, i) => (
              <DocumentChip key={doc.url} doc={doc} onRemove={() => setExtra((list) => list.filter((_, j) => j !== i))} />
            ))}
            {extra.length < 6 && <AddDocumentButton onAdded={(d) => setExtra((list) => [...list, d].slice(0, 6))} />}
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-3">
          <legend className="text-sm font-black text-black tracking-wide pl-1 mb-3">Enter Details</legend>
          <div className="bg-white border border-slate-200/80 rounded-3xl px-5 py-5 flex flex-col gap-5">
            <Field id="pw-model" label="Model Number" required error="Enter the model number">
              <input id="pw-model" required maxLength={60} value={form.modelNumber} onChange={set('modelNumber')} placeholder="Printed on the product label" aria-errormessage="pw-model-error" className={inputClass} />
            </Field>
            <Field id="pw-serial" label="Serial Number" required error="Enter the serial number">
              <input id="pw-serial" required maxLength={60} value={form.serialNumber} onChange={set('serialNumber')} placeholder="Printed on the product label" aria-errormessage="pw-serial-error" className={inputClass} />
            </Field>
            <Field id="pw-date" label="Purchase Date" required error="Choose the purchase date (not in the future)">
              <input id="pw-date" type="date" required max={today()} value={form.purchaseDate} onChange={set('purchaseDate')} aria-errormessage="pw-date-error" className={inputClass} />
            </Field>
            <Field id="pw-remarks" label="Description of Issue">
              <div className="relative">
                <textarea
                  id="pw-remarks"
                  rows={4}
                  maxLength={1000}
                  value={form.remarks}
                  onChange={set('remarks')}
                  placeholder="What's happening, and since when?"
                  className={`${inputClass} resize-none`}
                />
                <span className="absolute bottom-3 right-4 text-xs text-slate-400" aria-hidden="true">
                  {form.remarks.length}/1000
                </span>
              </div>
            </Field>
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-3">
          <legend className="text-sm font-black text-black tracking-wide pl-1 mb-3">Service Address</legend>
          <div className="bg-white border border-slate-200/80 rounded-3xl px-4 py-4 flex flex-col gap-2">
            {savedAddresses.map((a) => {
              const id = String(a._id || a.id);
              return (
                <label key={id} className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer ${addressId === id ? 'border-brand-blue bg-blue-50/60' : 'border-slate-200'}`}>
                  <input type="radio" name="pw-address" value={id} checked={addressId === id} onChange={() => setAddressId(id)} className="mt-1 accent-brand-navy" />
                  <span className="text-sm">
                    <span className="flex items-center gap-1 font-bold text-brand-navy">
                      <MapPin className="h-3.5 w-3.5" aria-hidden="true" /> {a.type || a.name || 'Address'}
                    </span>
                    <span className="block text-slate-600">{addressLine(a)}</span>
                    <span className="block text-slate-500 text-xs">Pincode {a.pincode || '—'}</span>
                  </span>
                </label>
              );
            })}
            <label className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer ${addressId === 'new' ? 'border-brand-blue bg-blue-50/60' : 'border-slate-200'}`}>
              <input type="radio" name="pw-address" value="new" checked={addressId === 'new'} onChange={() => setAddressId('new')} className="accent-brand-navy" />
              <span className="text-sm font-bold text-brand-navy">{savedAddresses.length ? 'Use a different address' : 'Enter the service address'}</span>
            </label>
            {addressId === 'new' && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="col-span-2">
                  <Field id="pw-house" label="House / Street" required error="Required">
                    <input id="pw-house" required maxLength={200} value={newAddress.house} onChange={setAddr('house')} aria-errormessage="pw-house-error" className={inputClass} />
                  </Field>
                </div>
                <div className="col-span-2">
                  <Field id="pw-landmark" label="Landmark">
                    <input id="pw-landmark" maxLength={200} value={newAddress.landmark} onChange={setAddr('landmark')} className={inputClass} />
                  </Field>
                </div>
                <Field id="pw-city" label="City" required error="Required">
                  <input id="pw-city" required maxLength={80} value={newAddress.city} onChange={setAddr('city')} aria-errormessage="pw-city-error" className={inputClass} />
                </Field>
                <Field id="pw-pincode" label="Pincode" required error="6 digits">
                  <input
                    id="pw-pincode"
                    required
                    inputMode="numeric"
                    pattern="\d{6}"
                    maxLength={6}
                    value={newAddress.pincode}
                    onChange={setAddr('pincode')}
                    aria-errormessage="pw-pincode-error"
                    className={inputClass}
                  />
                </Field>
                <div className="col-span-2">
                  <Field id="pw-state" label="State">
                    <input id="pw-state" maxLength={80} value={newAddress.state} onChange={setAddr('state')} className={inputClass} />
                  </Field>
                </div>
              </div>
            )}
          </div>
        </fieldset>

        <div aria-live="polite">
          {error && (
            <div className="flex flex-col gap-2">
              <ErrorNote message={error.message} />
              {error.existing && (
                <Link to={`/partner-warranty/claims/${error.existing}`} className="text-sm font-bold text-brand-blue underline pl-1">
                  Open {error.existing}
                </Link>
              )}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-4 bg-brand-navy text-white font-bold text-base rounded-2xl cursor-pointer tracking-wide mt-2 flex items-center justify-center gap-2 disabled:opacity-70"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {submitting ? 'Submitting…' : 'Raise Ticket'}
        </button>
      </form>
    </div>
  );
};

export default RaiseWarrantyRequest;
