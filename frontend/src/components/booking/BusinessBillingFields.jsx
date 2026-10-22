export const emptyBusinessBilling = { gstin: '', legalName: '', address: '', city: '', pincode: '' };
export function isValidBusinessBilling(value) {
  if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(value.gstin)) return false;
  let sum = 0, factor = 2;
  for (let i = 13; i >= 0; i--) { const n = parseInt(value.gstin[i], 36) * factor; sum += Math.floor(n / 36) + n % 36; factor = factor === 2 ? 1 : 2; }
  return ((36 - sum % 36) % 36).toString(36).toUpperCase() === value.gstin[14] && value.legalName.trim().length >= 2 && value.address.trim().length >= 5 && value.city.trim().length >= 2 && /^[1-9][0-9]{5}$/.test(value.pincode);
}
export default function BusinessBillingFields({ enabled, onEnabledChange, value, onChange }) {
  return <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
    <label className="flex items-start gap-3 text-sm font-bold text-slate-800"><input className="mt-0.5" type="checkbox" checked={enabled} onChange={e => onEnabledChange(e.target.checked)} />I need a business GST invoice</label>
    <p className="mt-2 text-xs leading-5 text-slate-500">Add your registered business details. Your final invoice will show the service value and GST separately. GST remains payable.</p>
    {enabled && <div className="mt-4 grid gap-3 sm:grid-cols-2">{[['gstin', 'GSTIN', 15], ['legalName', 'Registered business name', 160], ['address', 'Business billing address', 500], ['city', 'Billing city', 100], ['pincode', 'Billing pincode', 6]].map(([key, title, maxLength]) => <label key={key} className={`text-xs font-semibold text-slate-600 ${key === 'address' ? 'sm:col-span-2' : ''}`}>{title}<input aria-label={title} required value={value[key]} maxLength={maxLength} onChange={e => onChange({ ...value, [key]: key === 'gstin' ? e.target.value.toUpperCase().replace(/\s/g, '') : key === 'pincode' ? e.target.value.replace(/\D/g, '') : e.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500" /></label>)}<p className="text-[11px] leading-5 text-slate-500 sm:col-span-2">Use the legal name and address from your GST registration. Final invoices are available after service completion; accounts reviews billing across different states.</p>{value.gstin.length === 15 && !isValidBusinessBilling({ ...value, legalName:'Test', address:'Test address', city:'Test', pincode:'452001' }) && <p role="alert" className="text-xs text-red-700 sm:col-span-2">Please check your GSTIN, including its last character.</p>}</div>}
  </section>;
}
