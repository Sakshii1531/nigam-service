import { useSearchParams } from 'react-router-dom';
import { useState } from 'react';
import { apiRequest, apiDownload } from '../../lib/apiClient';
import { useApiData } from '../../hooks/useApiData';
import { useBrandPermissions } from '../../hooks/useBrandPermissions';
const money = value => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR'
}).format(value || 0);
const date = value => value ? new Date(value).toLocaleDateString('en-IN') : '—';
const field = 'border border-slate-300 rounded-lg px-3 py-2 text-sm w-full';
const button = 'rounded-lg bg-blue-800 text-white px-4 py-2 text-sm disabled:opacity-50';
const keyOf = row => row.id || row._id;
async function download(path, filename, print = false) {
  const blob = await apiDownload(path);
  const url = URL.createObjectURL(blob);
  if (print) window.open(url, '_blank', 'noopener,noreferrer');else {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  }
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
function DataTable({
  columns,
  rows,
  empty = 'No records in this period.'
}) {
  return <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead className="bg-slate-50"><tr>{columns.map(([label]) => <th key={label} className="p-3 whitespace-nowrap">{label}</th>)}</tr></thead><tbody>{rows.map(row => <tr key={keyOf(row)} className="border-t">{columns.map(([label, render]) => <td key={label} className="p-3">{render(row)}</td>)}</tr>)}</tbody></table>{!rows.length && <p className="p-6 text-slate-500">{empty}</p>}</div>;
}
export default function BrandBillingPanel({
  admin = false,
  paymentsOnly = false
}) {
  const {
    can
  } = useBrandPermissions();
  const base = admin ? '/super-admin/brand-billing' : '/brand/billing';
  const [search] = useSearchParams();
  const [brand, setBrand] = useState('');
  const [tab, setTab] = useState(paymentsOnly ? 'payments' : search.get('tab') === 'invoices' ? 'invoices' : 'lines');
  const [detail, setDetail] = useState(null);
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [filters, setFilters] = useState({
    from: search.get('from') || '',
    to: search.get('to') || '',
    state: '',
    city: '',
    q: '',
    status: search.get('status') || (paymentsOnly || search.get('tab') === 'invoices' ? '' : 'unbilled'),
    dateField: search.get('dateField') || undefined
  });
  const [period, setPeriod] = useState({
    periodFrom: '',
    periodTo: ''
  });
  const query = new URLSearchParams(Object.entries({
    ...filters,
    ...(admin && brand ? {
      brand
    } : {})
  }).filter(([, v]) => v)).toString();
  const path = endpoint => `${base}/${endpoint}${query ? `?${query}` : ''}`;
  const enabled = !admin || !!brand;
  const summary = useApiData(() => apiRequest(path('summary'), {
    auth: true
  }), [base, query], {
    enabled: enabled && (admin || can('billing:view')),
    initial: {}
  });
  const rows = useApiData(() => apiRequest(path(tab), {
    auth: true
  }), [base, query, tab], {
    enabled,
    initial: []
  });
  const brands = useApiData(() => apiRequest('/super-admin/brand-rates/options', {
    auth: true
  }), [], {
    enabled: admin,
    initial: {}
  });
  const ageing = useApiData(() => apiRequest(`${base}/ageing`, {
    auth: true
  }), [base], {
    enabled: admin,
    initial: []
  });
  const profile = useApiData(() => apiRequest(`${base}/billing-profile?brand=${brand}`, {
    auth: true
  }), [brand], {
    enabled: admin && !!brand,
    initial: {}
  });
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
  const reload = async () => {
    await Promise.all([summary.reload(), rows.reload(), ...(admin ? [ageing.reload()] : [])]);
  };
  const openInvoice = row => run(async () => setDetail(await apiRequest(`${base}/invoices/${keyOf(row)}`, {
    auth: true
  })));
  const mutate = (endpoint, body, method = 'POST') => apiRequest(`${base}/${endpoint}`, {
    auth: true,
    method,
    body
  });
  const payAllowed = admin || can('payments:view');
  const lineColumns = [['Ticket', r => r.ticketNo], ['Closed', r => date(r.closedAt)], ['State / City', r => `${r.state || ''} / ${r.city || ''}`], ['Service', r => r.serviceType], ['Status', r => [r.status, ...(r.flags || [])].join(' · ')], ['Rate', r => money(r.rate?.amount)], ['Parts / Other', r => money((r.subtotal || 0) - (r.rate?.amount || 0))], ['GST', r => `${money(r.gstAmount)} (${r.gstPercent}%)`], ['Total', r => money(r.total)], ...(admin ? [['Actions', r => ['billable', 'pending_closure'].includes(r.status) && <button className="text-blue-800 underline" onClick={() => setForm({
    type: 'charge',
    id: keyOf(r),
    label: '',
    amount: '',
    reason: ''
  })}>Add charge</button>]] : [])];
  const invoiceColumns = [['Invoice', r => <button className="text-blue-800 underline" onClick={() => openInvoice(r)}>{r.humanId}</button>], ['Issued', r => date(r.issuedAt)], ['Due', r => date(r.dueDate)], ['Status', r => r.status], ['Total', r => money(r.total)], ['Paid', r => money(r.paidAmount)], ['Pending', r => money(r.balance)]];
  const paymentColumns = [['Received', r => date(r.receivedAt)], ['Invoice', r => r.invoice?.humanId || '—'], ['Amount', r => money(r.amount)], ['Mode', r => r.mode], ['Reference', r => r.reference]];
  const s = summary.data || {};
  return <div className="space-y-5">
    {admin && <label className="block max-w-md font-semibold">Brand<select aria-label="Brand" className={field} value={brand} onChange={e => {
        setBrand(e.target.value);
        setDetail(null);
      }}><option value="">Select a brand</option>{(brands.data?.brands || []).map(b => <option key={b._id} value={b._id}>{b.name}</option>)}</select></label>}
    {(error || rows.error || summary.error || brands.error || ageing.error) && <p role="alert" className="bg-red-50 text-red-800 p-3 rounded-lg">{error || rows.error?.message || summary.error?.message || brands.error?.message || ageing.error?.message}</p>}
    {message && <p role="status" className="bg-green-50 text-green-800 p-3 rounded-lg">{message}</p>}
    {enabled && <>
      <div className="grid grid-cols-2 xl:grid-cols-6 gap-3">{[['Completed calls', s.completedCalls || 0], ['Invoice value', money(s.invoiceValue)], ['Paid', money(s.paid)], ['Pending', money(s.pending)], ['Overdue', money(s.overdue)], ['Unbilled', money(s.unbilledAmount)]].map(([label, value]) => <div key={label} data-testid={`billing-${label.toLowerCase().replaceAll(' ', '-')}`} className="bg-white border rounded-xl p-4"><p className="text-xs text-slate-500">{label}</p><p className="text-xl font-semibold mt-2">{value}</p></div>)}</div>
      <div className="bg-white border rounded-xl p-4 grid grid-cols-2 md:grid-cols-6 gap-3">{['from', 'to', 'state', 'city', 'q'].map(k => <label key={k} className="text-xs">{{
            from: 'From date',
            to: 'Before date',
            state: 'State',
            city: 'City',
            q: 'Ticket / Job'
          }[k]}<input className={field} type={['from', 'to'].includes(k) ? 'date' : 'text'} value={filters[k]} onChange={e => setFilters({
            ...filters,
            [k]: e.target.value
          })} /></label>)}<label className="text-xs">Status<select aria-label="Status" className={field} value={filters.status} onChange={e => setFilters({
            ...filters,
            status: e.target.value
          })}><option value="">All</option>{(tab === 'lines' ? ['unbilled', 'pending_closure', 'billable', 'invoiced', 'void'] : tab === 'invoices' ? ['outstanding', 'draft', 'issued', 'partially_paid', 'paid', 'overdue', 'cancelled'] : []).map(v => <option key={v}>{v}</option>)}</select></label></div>
      {admin && <section className="bg-white border rounded-xl p-4"><h2 className="font-semibold mb-3">Draft invoice</h2><form className="flex flex-wrap items-end gap-3" onSubmit={e => {
          e.preventDefault();
          run(async () => {
            const result = await mutate('invoices', {
              brand,
              ...period
            });
            setDetail(result);
            setFilters(current => ({ ...current, status: '' }));
            setTab('invoices');
            setMessage('Draft ready for review');
            await reload();
          });
        }}><label className="text-xs">Period from<input required type="date" className={field} value={period.periodFrom} onChange={e => setPeriod({
              ...period,
              periodFrom: e.target.value
            })} /></label><label className="text-xs">Period before (exclusive)<input required type="date" className={field} value={period.periodTo} onChange={e => setPeriod({
              ...period,
              periodTo: e.target.value
            })} /></label><button className={button} disabled={busy}>Draft invoice</button></form><button className="mt-3 text-blue-800 underline text-sm" onClick={() => setForm({
          type: 'terms',
          paymentTermsDays: profile.data?.paymentTermsDays ?? 30,
          gstPercent: profile.data?.gstPercent ?? 18
        })}>Edit billing terms</button></section>}
      <section className="bg-white border rounded-xl overflow-hidden"><div className="p-4 flex gap-3 border-b items-center"><div className="flex flex-1 gap-2" role="tablist" aria-label="Billing records">{(paymentsOnly ? ['payments'] : ['lines', 'invoices', ...(payAllowed ? ['payments'] : [])]).map(v => <button key={v} role="tab" aria-selected={tab === v} onClick={() => {
              setTab(v);
              setFilters({
                ...filters,
                status: v === 'lines' ? 'unbilled' : ''
              });
            }} className={`px-4 py-2 rounded-lg ${tab === v ? 'bg-blue-800 text-white' : 'bg-slate-100'}`}>{{
                lines: 'Unbilled lines',
                invoices: 'Invoices',
                payments: 'Payments'
              }[v]}</button>)}</div>{(admin || can('billing:export')) && <button disabled={busy} className="text-blue-800 underline" onClick={() => run(() => download(`${path('export')}${query ? '&' : '?'}type=${tab}`, `brand-${tab}.csv`))}>Export CSV</button>}</div>{rows.loading ? <p className="p-6">Loading billing…</p> : <DataTable rows={rows.data || []} columns={tab === 'lines' ? lineColumns : tab === 'invoices' ? invoiceColumns : paymentColumns} />}</section>
      <section className="bg-white border rounded-xl p-4"><h2 className="font-semibold mb-3">Dues ageing</h2><div className="grid grid-cols-2 md:grid-cols-5 gap-4">{Object.entries({
            current: 'Not due',
            days1to30: '1–30 days overdue',
            days31to60: '31–60 days overdue',
            days61to90: '61–90 days overdue',
            days90plus: 'Over 90 days'
          }).map(([k, label]) => <div key={k}><p className="text-xs text-slate-500">{label}</p><p className="font-semibold">{money(s.ageing?.[k])}</p></div>)}</div></section>
    </>}
    {admin && <section className="bg-white border rounded-xl p-4"><h2 className="font-semibold mb-3">Ageing across brands</h2><DataTable rows={(ageing.data || []).map(r => ({
        ...r,
        id: r.brand
      }))} columns={[["Brand", r => r.name], ["Pending", r => money(r.pending)], ["Overdue", r => money(r.overdue)], ...[['current', 'Not due'], ['days1to30', '1–30 days'], ['days31to60', '31–60 days'], ['days61to90', '61–90 days'], ['days90plus', '90+ days']].map(([k, label]) => [label, r => money(r.ageing[k])])]} /></section>}
    {detail && <div className="fixed inset-0 bg-black/30 z-50 flex justify-end" onClick={() => setDetail(null)}><section role="dialog" aria-modal="true" aria-label="Invoice details" className="bg-white w-full max-w-5xl p-6 overflow-y-auto shadow-xl" onClick={e => e.stopPropagation()}><button className="float-right text-blue-800" onClick={() => setDetail(null)}>Close invoice</button><h2 className="text-xl font-semibold">{detail.humanId}</h2><p className="my-3">{detail.status} · Due {date(detail.dueDate)} · Total {money(detail.total)} · Pending {money(detail.balance)}</p><DataTable rows={detail.lineSnapshots || []} columns={lineColumns.slice(0, 9)} /><div className="flex flex-wrap gap-3 mt-5"><button className={button} onClick={() => run(() => download(`${base}/invoices/${keyOf(detail)}/pdf`, `${detail.humanId}.html`, true))}>Print / Save PDF</button>{admin && detail.status === 'draft' && <button disabled={busy} className={button} onClick={() => run(async () => {
            setDetail(await mutate(`invoices/${keyOf(detail)}/issue`, {}));
            setMessage('Invoice issued');
            await reload();
          })}>Issue invoice</button>}{admin && ['issued', 'partially_paid', 'overdue'].includes(detail.status) && <button className={button} onClick={() => setForm({
            type: 'payment',
            id: keyOf(detail),
            amount: '',
            mode: 'bank_transfer',
            reference: '',
            receivedAt: new Date().toISOString().slice(0, 10),
            note: ''
          })}>Record payment</button>}{admin && ['draft', 'issued', 'overdue'].includes(detail.status) && !detail.paidAmount && <button className="text-red-700 underline" onClick={() => setForm({
            type: 'cancel',
            id: keyOf(detail),
            reason: ''
          })}>Cancel invoice</button>}</div>{!!detail.payments?.length && <><h3 className="font-semibold mt-5">Payment history</h3><DataTable rows={detail.payments.map(p => ({
            ...p,
            invoice: {
              humanId: detail.humanId
            }
          }))} columns={paymentColumns} /></>}</section></div>}
    {form && <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-5"><form role="dialog" aria-modal="true" aria-label="Billing action" className="bg-white rounded-xl p-6 space-y-4 w-full max-w-md" onSubmit={e => {
        e.preventDefault();
        run(async () => {
          const {
            type,
            id,
            ...data
          } = form;
          let result;
          if (type === 'payment') result = (await mutate(`invoices/${id}/payments`, {
            ...data,
            amount: Number(data.amount)
          })).invoice;
          if (type === 'cancel') result = await mutate(`invoices/${id}/cancel`, data);
          if (type === 'charge') await mutate(`lines/${id}/charges`, {
            ...data,
            amount: Number(data.amount)
          });
          if (type === 'terms') {
            await mutate(`brands/${brand}/terms`, {
              paymentTermsDays: Number(data.paymentTermsDays),
              gstPercent: Number(data.gstPercent)
            }, 'PUT');
            await profile.reload();
          }
          if (result) setDetail(await apiRequest(`${base}/invoices/${keyOf(result)}`, {
            auth: true
          }));
          setForm(null);
          setMessage(type === 'payment' ? 'Payment recorded' : 'Billing updated');
          await reload();
        });
      }}><h2 className="font-semibold text-lg">{{
            payment: 'Record payment',
            cancel: 'Cancel invoice',
            charge: 'Add charge',
            terms: 'Billing terms'
          }[form.type]}</h2>{Object.entries(form).filter(([k]) => !['id', 'type'].includes(k)).map(([k, v]) => <label key={k} className="block text-sm">{{
            amount: 'Amount (₹)',
            reference: 'Reference',
            receivedAt: 'Received date',
            mode: 'Mode',
            note: 'Note',
            reason: 'Reason',
            label: 'Charge label',
            paymentTermsDays: 'Payment terms (days)',
            gstPercent: 'GST (%)'
          }[k]}{k === 'mode' ? <select aria-label="Mode" className={field} value={v} onChange={e => setForm({
            ...form,
            [k]: e.target.value
          })}>{['neft', 'rtgs', 'bank_transfer', 'upi', 'cheque', 'cash', 'other'].map(m => <option key={m}>{m}</option>)}</select> : <input className={field} required={k !== 'note'} type={k === 'receivedAt' ? 'date' : ['amount', 'paymentTermsDays', 'gstPercent'].includes(k) ? 'number' : 'text'} step={k === 'paymentTermsDays' ? '1' : '0.01'} min={k === 'amount' ? '0.01' : '0'} value={v} onChange={e => setForm({
            ...form,
            [k]: e.target.value
          })} />}</label>)}{error && <p role="alert" className="text-red-700">{error}</p>}<div className="flex gap-3"><button className={button} disabled={busy}>Save</button><button type="button" onClick={() => setForm(null)}>Close</button></div></form></div>}
  </div>;
}
