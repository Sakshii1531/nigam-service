import { useState } from 'react';
import { apiRequest } from '../../lib/apiClient';
import { useApiData } from '../../hooks/useApiData';
// Keep exact interval boundaries when editing or replacing a rate mid-minute.
const dateInput = value => new Date(value).toISOString().slice(0, -1);
const inputClass = 'border border-slate-300 rounded-lg p-2 w-full text-sm';
const currency = n => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR'
}).format(n || 0);
export default function BrandRatesPanel({
  admin = false,
  canEdit = false
}) {
  const base = admin ? '/super-admin/brand-rates' : '/brand/rates';
  const [brand, setBrand] = useState(''),
    [form, setForm] = useState(null),
    [error, setError] = useState(''),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false),
    [history, setHistory] = useState(null),
    [csv, setCsv] = useState(''),
    [preview, setPreview] = useState(null),
    [test, setTest] = useState({
      categoryId: '',
      serviceType: 'repair',
      state: '',
      city: ''
    }),
    [resolved, setResolved] = useState(null);
  const opts = useApiData(() => apiRequest(`${base}/options`, {
    auth: true
  }), [base]);
  const list = useApiData(() => apiRequest(`${base}${admin ? `?brand=${brand}` : ''}`, {
    auth: true
  }), [base, brand], {
    enabled: !admin || !!brand,
    initial: []
  });
  const o = opts.data || {},
    rates = list.data || [],
    categories = (o.categories || []).filter(c => !admin || !brand || (o.brands || []).find(b => b._id === brand)?.coverage.includes(c._id));
  const states = [...new Set((o.cities || []).map(c => c.state).filter(Boolean))];
  const run = async fn => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await fn();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const request = (path, method, body, responseType = 'json') => apiRequest(`${base}${path}${admin ? `${path.includes('?') ? '&' : '?'}brand=${brand}` : ''}`, {
    auth: true,
    method,
    body,
    responseType
  });
  const empty = {
    category: categories[0]?._id || '',
    serviceType: 'repair',
    state: '',
    city: '',
    brandRate: '',
    partnerPayout: '',
    visitOnlyRate: '',
    effectiveFrom: dateInput(new Date()),
    effectiveTo: ''
  };
  const geo = (value, onChange) => <><label>State<select aria-label="State" className={inputClass} value={value.state} onChange={e => onChange({
        ...value,
        state: e.target.value,
        city: ''
      })}><option value="">National</option>{states.map(s => <option key={s}>{s}</option>)}</select></label><label>City<select aria-label="City" className={inputClass} disabled={!value.state} value={value.city} onChange={e => onChange({
        ...value,
        city: e.target.value
      })}><option value="">All cities in state</option>{(o.cities || []).filter(c => c.state === value.state).map(c => <option key={c._id}>{c.name}</option>)}</select></label></>;
  const download = () => run(async () => {
    const token = await request('/export', 'GET', undefined, 'text');
    const blob = new Blob([token], {
      type: 'text/csv'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'brand-rates.csv';
    a.click();
    URL.revokeObjectURL(url);
  });
  return <div className="space-y-5">
 {admin && <label className="block max-w-md">Brand<select aria-label="Brand" className={inputClass} value={brand} onChange={e => {
        setBrand(e.target.value);
        setForm(null);
        setHistory(null);
        setResolved(null);
      }}><option value="">Select brand</option>{(o.brands || []).map(b => <option key={b._id} value={b._id}>{b.name}</option>)}</select></label>}
 {(error || list.error || opts.error) && <p role="alert" className="text-red-700">{error || list.error?.message || opts.error?.message}</p>}{message && <p role="status" className="text-green-700">{message}</p>}
 {(!admin || brand) && <>
 <p className="text-sm text-slate-600">Use Edit to change an existing rate. Add override creates a rate for a new location or effective period.</p>
 <div className="flex gap-3">{canEdit && <button className="bg-blue-900 text-white rounded-lg px-4 py-2" onClick={() => setForm(empty)}>Add override</button>}<button className="border rounded-lg px-4 py-2" onClick={download} disabled={busy}>Export CSV</button></div>
 <section className="bg-white rounded-xl border p-4"><h2 className="font-bold mb-3">Service rates</h2>{list.loading ? <p>Loading rates…</p> : categories.map(c => <div key={c._id} className="mb-5"><h3 className="font-semibold">{c.name}</h3>{(o.serviceTypes || []).map(service => {
            const group = rates.filter(r => r.category === c._id && r.serviceType === service),
              current = group.filter(r => r.isActive && (!r.effectiveTo || +new Date(r.effectiveTo) > Date.now())),
              national = current.find(r => !r.state && +new Date(r.effectiveFrom) <= Date.now());
            return <details key={service} className="border-b py-2"><summary className="cursor-pointer flex justify-between"><span>{service.replaceAll('_', ' ')}</span><span>{national?.brandRate != null ? currency(national.brandRate) : 'National rate missing'} · {current.length} active rules</span></summary><div className="overflow-x-auto"><table className="w-full text-sm mt-3"><thead><tr>{['Scope', 'Brand rate', ...(admin ? ['Partner payout', 'Margin'] : []), 'Effective dates', 'Status', 'Actions'].map(h => <th key={h} className="text-left p-2">{h}</th>)}</tr></thead><tbody>{current.map(r => <tr key={r.id}><td className="p-2">{r.city ? `${r.state} / ${r.city}` : r.state || 'National'}</td><td>{currency(r.brandRate)}</td>{admin && <><td>{r.partnerPayout == null ? 'PAYOUT_MISSING' : currency(r.partnerPayout)}</td><td>{r.partnerPayout == null ? '—' : currency(r.brandRate - r.partnerPayout)}</td></>}<td>{new Date(r.effectiveFrom).toLocaleString()} → {r.effectiveTo ? new Date(r.effectiveTo).toLocaleString() : 'Open'}</td><td>{+new Date(r.effectiveFrom) > Date.now() ? 'Scheduled' : 'Active'}</td><td>{canEdit && <div className="flex gap-3"><button onClick={() => setForm({
                            ...empty,
                            ...r,
                            partnerPayout: r.partnerPayout ?? '',
                            visitOnlyRate: r.visitOnlyRate ?? '',
                            effectiveFrom: dateInput(r.effectiveFrom),
                            effectiveTo: r.effectiveTo ? dateInput(r.effectiveTo) : ''
                          })}>Edit</button><button disabled={busy} onClick={() => run(async () => {
                            await request(`/${r.id}/deactivate`, 'POST', {});
                            await list.reload();
                          })}>Deactivate</button></div>}<button className="text-blue-900 underline" onClick={() => setHistory({name:`${c.name} · ${service} · ${r.city || r.state || 'National'}`,rows:group.filter(h => h.state === r.state && h.city === r.city)})}>Key history</button></td></tr>)}</tbody></table></div><button className="text-blue-900 underline mt-2" onClick={() => setHistory({
                name: `${c.name} · ${service}`,
                rows: group
              })}>View history</button></details>;
          })}</div>)}</section>
 {form && <section className="bg-white border rounded-xl p-5"><h2 className="font-bold mb-4">{form.id ? 'Edit rate' : 'Add rate override'}</h2>{form.usageCount > 0 && <p className="text-sm mb-3">Saving creates a new version from now. Captured charges keep their original rate.</p>}<form className="grid md:grid-cols-3 gap-4" onSubmit={e => {
          e.preventDefault();
          run(async () => {
            const payload = {
              category: form.category,
              serviceType: form.serviceType,
              state: form.state || null,
              city: form.city || null,
              brandRate: Number(form.brandRate),
              effectiveFrom: new Date(`${form.effectiveFrom}Z`).toISOString(),
              effectiveTo: form.effectiveTo ? new Date(`${form.effectiveTo}Z`).toISOString() : null,
              ...(admin ? {
                partnerPayout: form.partnerPayout === '' ? null : Number(form.partnerPayout),
                visitOnlyRate: form.visitOnlyRate === '' ? null : Number(form.visitOnlyRate)
              } : {})
            };
            await request(form.id ? `/${form.id}` : '', form.id ? 'PATCH' : 'POST', payload);
            setForm(null);
            await list.reload();
            setMessage('Rate saved');
          });
        }}>
 <label>Category<select aria-label="Category" className={inputClass} value={form.category} onChange={e => setForm({
              ...form,
              category: e.target.value
            })}>{categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}</select></label><label>Service type<select aria-label="Service type" className={inputClass} value={form.serviceType} onChange={e => setForm({
              ...form,
              serviceType: e.target.value
            })}>{(o.serviceTypes || []).map(s => <option key={s}>{s}</option>)}</select></label>{geo(form, setForm)}
 {['brandRate', ...(admin ? ['partnerPayout', 'visitOnlyRate'] : [])].map(k => <label key={k}>{k === 'brandRate' ? 'Brand rate' : k === 'partnerPayout' ? 'Partner payout' : 'Visit only rate'}<input aria-label={k === 'brandRate' ? 'Brand rate' : k === 'partnerPayout' ? 'Partner payout' : 'Visit only rate'} className={inputClass} type="number" min="0" step="0.01" required={k === 'brandRate'} value={form[k]} onChange={e => setForm({
              ...form,
              [k]: e.target.value
            })} /></label>)}
 {['effectiveFrom', 'effectiveTo'].map(k => <label key={k}>{k === 'effectiveFrom' ? 'Effective from (UTC)' : 'Effective to (UTC)'}<input className={inputClass} type="datetime-local" step="0.001" required={k === 'effectiveFrom'} value={form[k]} onChange={e => setForm({
              ...form,
              [k]: e.target.value
            })} /></label>)}<div className="flex gap-4 items-end"><button disabled={busy} className="bg-blue-900 text-white rounded-lg px-4 py-2">Save rate</button><button type="button" onClick={() => setForm(null)}>Cancel</button></div></form></section>}
 {history && <section className="bg-white border rounded-xl p-5" aria-label="Rate history"><div className="flex justify-between"><h2 className="font-bold">History: {history.name}</h2><button onClick={() => setHistory(null)}>Close history</button></div>{history.rows.map(r => <p className="py-2 text-sm" key={r.id}>{r.city || r.state || 'National'} · {currency(r.brandRate)} · {new Date(r.effectiveFrom).toLocaleString()} → {r.effectiveTo ? new Date(r.effectiveTo).toLocaleString() : 'Open'} · {r.isActive ? 'Active' : 'Historical'}</p>)}</section>}
 <section className="bg-white border rounded-xl p-5"><h2 className="font-bold mb-3">What rate applies?</h2><div className="grid md:grid-cols-4 gap-3"><label>Test category<select aria-label="Test category" className={inputClass} value={test.categoryId} onChange={e => setTest({
              ...test,
              categoryId: e.target.value
            })}><option value="">Select category</option>{categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}</select></label><label>Test service<select aria-label="Test service" className={inputClass} value={test.serviceType} onChange={e => setTest({
              ...test,
              serviceType: e.target.value
            })}>{(o.serviceTypes || []).map(s => <option key={s}>{s}</option>)}</select></label>{geo(test, setTest)}</div><button className="mt-3 border rounded-lg p-2" disabled={busy || !test.categoryId} onClick={() => run(async () => setResolved(await request(`/resolve?${new URLSearchParams(Object.fromEntries(Object.entries(test).filter(([, v]) => v)))}`, 'GET')))}>Resolve rate</button>{resolved && <p role="status" className="mt-3">{currency(resolved.rate)} · matched on {resolved.matchedOn}{resolved.row?.city ? `: ${resolved.row.city}` : resolved.row?.state ? `: ${resolved.row.state}` : ''}</p>}</section>
 {canEdit && <section className="bg-white border rounded-xl p-5"><h2 className="font-bold mb-3">Import CSV</h2><p className="text-sm mb-2">Columns: category (ID), serviceType, state, city, brandRate, effectiveFrom, effectiveTo{admin ? ', partnerPayout, visitOnlyRate' : ''}. Export provides a template. Imports add dated rows; overlapping rates are rejected.</p><input aria-label="CSV file" type="file" accept=".csv,text/csv" onChange={async e => {
          setCsv((await e.target.files?.[0]?.text()) || '');
          setPreview(null);
        }} /><textarea aria-label="CSV content" className={`${inputClass} mt-3`} rows="4" value={csv} onChange={e => {
          setCsv(e.target.value);
          setPreview(null);
        }} /><div className="flex gap-3 mt-3"><button disabled={busy || !csv} onClick={() => run(async () => setPreview(await request('/import', 'POST', {
            csv,
            dryRun: true
          })))}>Preview import</button><button disabled={busy || !preview || preview.errors.length > 0 || !preview.ok} onClick={() => run(async () => {
            const result = await request('/import', 'POST', {
              csv,
              dryRun: false
            });
            setMessage(`Imported ${result.imported} rates`);
            setPreview(null);
            await list.reload();
          })}>Commit import</button></div>{preview && <div className="text-sm mt-3">{preview.ok} valid / {preview.total} rows{preview.errors.map(e => <p key={e.row} className="text-red-700">Row {e.row}: {e.message}</p>)}</div>}</section>}
 </>}
 </div>;
}
