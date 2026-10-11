import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Pencil } from 'lucide-react';
import Sidebar from '../../components/brand-admin/Sidebar';
import Topbar from '../../components/brand-admin/Topbar';
import CustomerForm from '../../components/brand-admin/CustomerForm';
import { useBrandPermissions } from '../../hooks/useBrandPermissions';
import { apiRequest } from '../../lib/apiClient';
const date = value => value ? new Date(value).toLocaleString('en-IN') : 'Not recorded';
const tabs = ['Overview', 'Products', 'Tickets', 'Service history', 'Communication'];
const empty = text => <p className="p-8 text-center text-slate-500 text-sm">{text}</p>;
const inputClass = 'border border-slate-200 rounded-lg px-3 py-2 text-sm w-full';
export default function CustomerProfile() {
  const { id } = useParams();
  const { can } = useBrandPermissions();
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('Overview');
  const [error, setError] = useState('');
  const [edit, setEdit] = useState(false);
  const [addressOpen, setAddressOpen] = useState(false);
  const [address, setAddress] = useState({ house: '', city: '', state: '', pincode: '' });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let cancelled = false;
    apiRequest(`/brand/customers/${id}`, { auth: true }).then(profile => { if (!cancelled) setData(profile); }).catch(err => { if (!cancelled) setError(err.message); });
    return () => { cancelled = true; };
  }, [id]);
  const addAddress = async e => {
    e.preventDefault(); setBusy(true); setError('');
    try {
      const customer = await apiRequest(`/brand/customers/${id}/addresses`, { auth: true, method: 'POST', body: address });
      setData({ ...data, customer }); setAddressOpen(false); setAddress({ house: '', city: '', state: '', pincode: '' });
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  const customer = data?.customer;
  return <div className="min-h-screen bg-slate-50 flex"><Sidebar /><div className="flex-1 ml-64 min-w-0"><Topbar title="Customer 360" /><main className="p-6 space-y-5">
    <Link to="/brand-admin/customers" className="inline-flex items-center gap-2 text-sm text-slate-600"><ArrowLeft size={16} />Back to customers</Link>
    {error && <p role="alert" className="bg-red-50 p-4 rounded-xl text-red-700">{error}</p>}
    {!data && !error && empty('Loading customer profile…')}
    {data && <>
      <section className="bg-white border border-slate-200 rounded-xl p-6 flex flex-wrap justify-between items-center gap-4"><div><h1 className="text-2xl font-bold text-slate-900">{customer.name}</h1><p className="text-sm text-slate-500 mt-2">{customer.humanId} · {customer.phone}</p></div><div className="flex gap-3">{can('customers:edit') && <button onClick={() => setEdit(true)} className="px-4 py-2 border rounded-lg text-sm flex items-center gap-2"><Pencil size={15} />Edit customer</button>}{can('tickets:create') && <Link to={`/brand-admin/requests?customer=${id}`} className="px-4 py-2 bg-blue-800 text-white rounded-lg text-sm flex items-center gap-2"><Plus size={15} />New ticket for this customer</Link>}</div></section>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[['Total tickets', data.stats.total], ['Open tickets', data.stats.open], ['Completed jobs', data.stats.completed], ['Average resolution', data.stats.avgTatHours == null ? 'Not recorded' : `${data.stats.avgTatHours.toFixed(1)} hours`]].map(([label, value]) => <div key={label} className="bg-white rounded-xl border p-4"><p className="text-xs text-slate-500">{label}</p><p className="text-xl font-semibold mt-2">{value}</p></div>)}</div>
      <section className="bg-white rounded-xl border border-slate-200 overflow-hidden"><div role="tablist" aria-label="Customer profile" className="flex overflow-x-auto border-b">{tabs.map(t => <button key={t} role="tab" aria-selected={tab === t} aria-controls="customer-panel" onClick={() => setTab(t)} className={`px-5 py-4 text-sm whitespace-nowrap border-b-2 ${tab === t ? 'border-blue-800 text-blue-800 font-semibold' : 'border-transparent text-slate-500'}`}>{t}</button>)}</div>
        <div id="customer-panel" role="tabpanel" aria-label={tab} className="p-5">
          {tab === 'Overview' && <div className="grid lg:grid-cols-2 gap-8"><div><h2 className="font-semibold mb-4">Contact details</h2><dl className="grid grid-cols-2 gap-3 text-sm">{[['Mobile', customer.phone], ['Alternate mobile', customer.alternatePhone], ['Email', customer.email], ['Joined NCC', date(customer.createdAt)]].map(([label, value]) => <div key={label}><dt className="text-slate-500 text-xs mb-1">{label}</dt><dd>{value || 'Not recorded'}</dd></div>)}</dl></div><div><div className="flex justify-between"><h2 className="font-semibold">Saved addresses</h2>{can('customers:edit') && <button onClick={() => setAddressOpen(!addressOpen)} className="text-sm text-blue-800">Add address</button>}</div>{customer.addresses.length ? customer.addresses.map((a, i) => <div key={a._id || i} className="bg-slate-50 border border-slate-100 p-3 rounded-lg mt-3 text-sm"><p className="font-semibold">{a.name || a.type}</p><p>{[a.house, a.landmark, a.city, a.state, a.pincode].filter(Boolean).join(', ')}</p></div>) : empty('No addresses recorded.')}{addressOpen && <form onSubmit={addAddress} className="mt-4 space-y-3"><p className="text-xs text-slate-500">This address will be saved to the shared customer profile.</p>{[['house', 'House / street'], ['city', 'City'], ['state', 'State'], ['pincode', 'Pincode']].map(([key, label]) => <label className="block text-sm" key={key}>{label}<input className={inputClass} required value={address[key]} pattern={key === 'pincode' ? '[0-9]{6}' : undefined} onChange={e => setAddress({ ...address, [key]: e.target.value })} /></label>)}<button disabled={busy} className="bg-blue-800 text-white px-4 py-2 rounded-lg text-sm">{busy ? 'Saving…' : 'Save address'}</button></form>}</div></div>}
          {tab === 'Products' && (data.products.length ? <div className="grid md:grid-cols-2 gap-4">{data.products.map(p => <article key={p.id} className="border rounded-xl p-4 space-y-2 text-sm"><h2 className="font-semibold">{p.category} · {p.model || 'Model not recorded'}</h2><p className="text-slate-500">Serial: {p.serialNumber || 'Not recorded'}</p><p>Purchase: {date(p.purchaseDate)}</p><p className="text-blue-800 font-medium">{p.warranty.status}</p><p className="text-slate-500 text-xs">Warranty evaluation · {p.warranty.months} months{p.warranty.expiresOn ? ` · expires ${date(p.warranty.expiresOn)}` : ''}</p>{p.invoiceFileUrl && <a href={p.invoiceFileUrl} target="_blank" rel="noreferrer" className="text-blue-800 underline">View invoice</a>}</article>)}</div> : empty('No products registered with this brand.'))}
          {tab === 'Tickets' && (data.tickets.length ? <div className="overflow-auto"><table className="w-full text-sm text-left"><thead className="text-xs text-slate-500"><tr>{['Ticket', 'Product / issue', 'Source', 'Status / job stage', 'Created'].map(h => <th key={h} className="p-3">{h}</th>)}</tr></thead><tbody className="divide-y">{data.tickets.map(t => <tr key={t.id}><td className="p-3">{can('tickets:view') ? <Link to={`/brand-admin/tickets/${t.id}`} className="font-medium text-blue-800">{t.humanId}</Link> : t.humanId}<p className="text-xs text-slate-500">{t.brandTicketNo}</p>{t.jobNo && <p className="text-xs text-slate-500">{t.jobNo}</p>}</td><td className="p-3">{t.product}<p className="text-xs text-slate-500">{t.issue}</p></td><td className="p-3">{t.source}</td><td className="p-3">{t.status}<p className="text-xs text-slate-500">{t.jobStage || 'No job stage recorded'}</p></td><td className="p-3">{date(t.createdAt)}</td></tr>)}</tbody></table></div> : empty('No tickets for this brand.'))}
          {tab === 'Service history' && (data.completedJobs.length ? data.completedJobs.map(j => <article key={j.ticketId} className="border rounded-lg p-4 mb-3 text-sm"><h2 className="font-semibold">{j.product} · {j.ticketNo}</h2><p className="mt-2">NCC job: {j.jobNo || 'Not recorded'}</p><p>Partner: {j.partnerName || 'Not recorded'}</p><p>Closed: {date(j.closedAt)}</p><p>Rating: {j.rating ?? 'Not recorded'}</p></article>) : empty('No completed jobs for this brand.'))}
          {tab === 'Communication' && (data.communication.length ? <ol className="space-y-3">{data.communication.map(c => <li key={c.id} className="border-l-2 border-blue-200 pl-4 py-2 text-sm"><p className="font-semibold">{c.title || c.action}</p><p className="mt-1">{c.note || 'No remarks recorded'}</p><p className="text-xs text-slate-500 mt-1">{date(c.at)}{c.actor?.name ? ` · ${c.actor.name}` : ''}{c.actor?.employeeId ? ` · ${c.actor.employeeId}` : ''}{c.ticketNo ? ` · ${c.ticketNo}` : ''}</p></li>)}</ol> : empty('No brand communication recorded.'))}
        </div>
      </section>
    </>}
  </main>{edit && customer && <CustomerForm customer={customer} onClose={() => setEdit(false)} onSaved={updated => { setData({ ...data, customer: updated }); setEdit(false); }} />}</div></div>;
}
