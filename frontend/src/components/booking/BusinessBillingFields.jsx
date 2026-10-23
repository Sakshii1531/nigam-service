import { useId, useState } from 'react';

export const emptyBusinessBilling = { gstin: '', legalName: '', address: '', city: '', pincode: '' };
const gstStateCodes = new Set(['01','02','03','04','05','06','07','08','09','10','11','12','13','14','15','16','17','18','19','20','21','22','23','24','26','27','28','29','30','31','32','33','34','35','36','37','38']);
export function gstinError(gstin) {
  if (!gstin) return 'Enter the GSTIN from your GST registration certificate.';
  if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(gstin)) return 'Enter a complete 15-character GSTIN from your GST registration certificate.';
  if (!gstStateCodes.has(gstin.slice(0,2))) return 'Check the first two digits of your GSTIN: the state code is not recognised.';
  let sum = 0, factor = 2;
  for (let i = 13; i >= 0; i--) {
    const n = parseInt(gstin[i], 36) * factor;
    sum += Math.floor(n / 36) + n % 36;
    factor = factor === 2 ? 1 : 2;
  }
  return ((36 - sum % 36) % 36).toString(36).toUpperCase() === gstin[14] ? '' : 'This GSTIN fails its check-digit validation. Copy the full GSTIN from your registration certificate and check for typing errors.';
}
export function isValidBusinessBilling(value) {
  return !gstinError(value.gstin) && value.legalName.trim().length >= 2 && value.address.trim().length >= 5 && value.city.trim().length >= 2 && /^[1-9][0-9]{5}$/.test(value.pincode);
}
export default function BusinessBillingFields({ enabled, onEnabledChange, value, onChange }) {
  const [gstinTouched, setGstinTouched] = useState(false);
  const errorId = useId();
  const error = enabled && gstinTouched ? gstinError(value.gstin) : '';
  return <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
    <label className="flex items-start gap-3 text-sm font-bold text-slate-800"><input className="mt-0.5" type="checkbox" checked={enabled} onChange={e => { onEnabledChange(e.target.checked); setGstinTouched(false); }} />I need a business GST invoice</label>
    <p className="mt-2 text-xs leading-5 text-slate-500">Add your registered business details. Your final invoice will show the service value and GST separately. GST remains payable.</p>
    {enabled && <div className="mt-4 grid gap-3 sm:grid-cols-2">
      {[['gstin', 'GSTIN', 15], ['legalName', 'Registered business name', 160], ['address', 'Business billing address', 500], ['city', 'Billing city', 100], ['pincode', 'Billing pincode', 6]].map(([key, title, maxLength]) => <label key={key} className={`text-xs font-semibold text-slate-600 ${key === 'address' ? 'sm:col-span-2' : ''}`}>
        {title}<input aria-label={title} required value={value[key]} maxLength={maxLength}
          aria-invalid={key === 'gstin' && !!error} aria-describedby={key === 'gstin' && error ? errorId : undefined}
          onBlur={key === 'gstin' ? () => setGstinTouched(true) : undefined}
          onChange={e => onChange({ ...value, [key]: key === 'gstin' ? e.target.value.toUpperCase().replace(/\s/g, '') : key === 'pincode' ? e.target.value.replace(/\D/g, '') : e.target.value })}
          className={`mt-1 w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:border-blue-500 ${key === 'gstin' && error ? 'border-red-300 bg-red-50/40' : 'border-slate-200'}`} />
        {key === 'gstin' && error && <span id={errorId} role="alert" className="mt-2 block text-xs font-normal leading-5 text-red-700">{error}</span>}
      </label>)}
      <p className="text-[11px] leading-5 text-slate-500 sm:col-span-2">Use the legal name and address from your GST registration. Final invoices are available after service completion; accounts reviews billing across different states.</p>
    </div>}
  </section>;
}
