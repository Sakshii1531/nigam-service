import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Plus, Download, Users } from 'lucide-react';
import Sidebar from '../../components/brand-admin/Sidebar';
import Topbar from '../../components/brand-admin/Topbar';
import CustomerForm from '../../components/brand-admin/CustomerForm';
import Pagination from '../../components/common/Pagination';
import { useBrandPermissions } from '../../hooks/useBrandPermissions';
import { apiRequest, apiDownload } from '../../lib/apiClient';

export default function Customers() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { can } = useBrandPermissions();
  const [query, setQuery] = useState(params.get('search') || '');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ data: [], meta: { total: 0, limit: 20 } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [create, setCreate] = useState(false);
  const [phone, setPhone] = useState('');
  const [match, setMatch] = useState(null);
  const [searching, setSearching] = useState(false);
  const [exporting, setExporting] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true); setError('');
      try {
        const data = await apiRequest(`/brand/customers?q=${encodeURIComponent(query)}&page=${page}&limit=20`, { auth: true, envelope: true });
        if (!cancelled) setResult(data);
      } catch (err) { if (!cancelled) setError(err.message); }
      finally { if (!cancelled) setLoading(false); }
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [query, page]);
  const mobileSearch = async e => {
    e.preventDefault(); setSearching(true); setMatch(null); setError('');
    try {
      const data = await apiRequest(`/brand/customers/search?phone=${encodeURIComponent(phone)}`, { auth: true });
      if (data.match === 'brand') navigate(`/brand-admin/customers/${data.customer.id}`);
      else setMatch(data);
    } catch (err) { setError(err.message); }
    finally { setSearching(false); }
  };
  const download = async () => {
    setExporting(true); setError('');
    try {
      const blob = await apiDownload(`/brand/customers?format=csv&q=${encodeURIComponent(query)}`);
      const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'brand-customers.csv'; a.click(); URL.revokeObjectURL(url);
    } catch (err) { setError(err.message); } finally { setExporting(false); }
  };
  return <div className="min-h-screen bg-slate-50 flex"><Sidebar /><div className="flex-1 ml-64 min-w-0"><Topbar title="Customer 360" />
    <main className="p-6 space-y-5">
      <div className="flex items-center justify-between gap-4"><div><h1 className="text-2xl font-bold text-slate-900">Customers</h1><p className="text-sm text-slate-500 mt-1">Profiles, registered products and service history for your brand.</p></div><div className="flex gap-3">{can('customers:export') && <button onClick={download} disabled={exporting} className="flex gap-2 items-center border border-slate-200 bg-white px-4 py-2 rounded-lg text-sm"><Download size={16} />{exporting ? 'Exporting…' : 'Export CSV'}</button>}{can('customers:create') && <button onClick={() => setCreate(true)} className="flex gap-2 items-center bg-blue-800 text-white px-4 py-2 rounded-lg text-sm"><Plus size={16} />New customer</button>}</div></div>
      <form onSubmit={mobileSearch} className="bg-white rounded-xl border border-slate-200 p-4 flex gap-3 items-end"><label className="flex-1 text-sm font-semibold text-slate-700">Find by mobile<input aria-label="Find by mobile" type="tel" required value={phone} onChange={e => setPhone(e.target.value)} placeholder="10 digits or +91 number" className="block w-full mt-2 border rounded-lg px-3 py-2 font-normal" /></label><button disabled={searching} className="bg-blue-800 text-white px-4 py-2 rounded-lg text-sm">{searching ? 'Searching…' : 'Find customer'}</button></form>
      {match?.match === 'platform' && <div role="status" className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm"><strong>{match.customer.name}</strong> · {match.customer.maskedPhone}<p className="mt-1">This customer is registered on NCC but has no relationship with your brand. Select them during ticket registration to avoid creating a duplicate.</p>{can('tickets:create') && <Link to={`/brand-admin/requests?customer=${match.customer.id}&phone=${encodeURIComponent(phone)}`} className="inline-block mt-2 text-blue-800 underline">Use existing customer for a ticket</Link>}</div>}
      {match?.match === 'none' && <p role="status" className="bg-white border rounded-xl p-4 text-sm">No customer found for this mobile.{can('customers:create') && <button onClick={() => setCreate(true)} className="ml-2 text-blue-800 underline">Create customer</button>}</p>}
      {error && <p role="alert" className="bg-red-50 text-red-700 p-4 rounded-xl">{error}</p>}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden"><div className="p-4 border-b flex items-center gap-3"><Search size={18} className="text-slate-400" /><input aria-label="Search customers" value={query} onChange={e => { setQuery(e.target.value); setPage(1); }} placeholder="Search name, mobile or CUST ID" className="w-full outline-none text-sm" /></div>
        <div className="overflow-auto"><table className="w-full text-sm text-left"><thead className="bg-slate-50 text-slate-500"><tr>{['Customer', 'Mobile', 'Products', 'Open / total tickets', 'Last activity', ''].map(h => <th key={h} className="px-5 py-4 font-semibold">{h}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{loading ? <tr><td colSpan={6} className="text-center p-10 text-slate-500">Loading customers…</td></tr> : result.data.map(c => <tr key={c.id} className="hover:bg-slate-50"><td className="px-5 py-4"><Link to={`/brand-admin/customers/${c.id}`} className="font-semibold text-blue-800">{c.name}</Link><p className="text-xs text-slate-500 mt-1">{c.humanId}</p></td><td className="px-5 py-4">{c.phone || '—'}</td><td className="px-5 py-4">{c.productCount}</td><td className="px-5 py-4">{c.openTickets} / {c.totalTickets}</td><td className="px-5 py-4 text-slate-500">{c.lastActivity ? new Date(c.lastActivity).toLocaleDateString('en-IN') : '—'}</td><td className="px-5 py-4"><Link to={`/brand-admin/customers/${c.id}`} className="text-blue-800">Open profile</Link></td></tr>)}{!loading && !result.data.length && <tr><td colSpan={6} className="p-12 text-center text-slate-500"><Users className="mx-auto mb-3" />No customers match this search.</td></tr>}</tbody></table></div>
        <Pagination currentPage={page} totalItems={result.meta.total} itemsPerPage={20} onPageChange={setPage} />
      </section>
    </main>{create && <CustomerForm onClose={() => setCreate(false)} onSaved={customer => navigate(`/brand-admin/customers/${customer.id}`)} />}
  </div></div>;
}
