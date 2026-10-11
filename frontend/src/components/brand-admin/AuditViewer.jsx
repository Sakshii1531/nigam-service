import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiRequest, apiDownload } from '../../lib/apiClient';
import { useApiData } from '../../hooks/useApiData';
import AuditEntries from './AuditEntries';

const fields = [['q','Search name, employee ID or action'],['entityType','Entity type'],['entityId','Entity ID'],['action','Action'],['userId','User ID'],['from','From'],['to','To (exclusive)']];
export default function AuditViewer({ admin = false }) {
  const [search, setSearch] = useSearchParams();
  const [form,setForm] = useState(()=>Object.fromEntries([...fields.map(([key])=>[key,search.get(key)||'']),['brand',search.get('brand')||''],['type',search.get('type')||'']]));
  const [brands,setBrands] = useState([]), [exportError,setExportError] = useState(''), [exporting,setExporting] = useState(false);
  const page = Number(search.get('page')) || 1;
  const query = new URLSearchParams(search); query.delete('format'); query.set('limit','25');
  const endpoint = admin ? '/super-admin/audit-logs' : '/brand/audit-logs';
  const requestKey = query.toString();
  const result = useApiData(()=>apiRequest(`${endpoint}?${requestKey}`,{auth:true,envelope:true}),[endpoint,requestKey]);
  useEffect(()=>{if(admin)apiRequest('/super-admin/brands',{auth:true}).then(setBrands).catch(()=>setBrands([]));},[admin]);
  const apply = e => {e.preventDefault();setSearch(Object.fromEntries(Object.entries(form).filter(([,v])=>v)));};
  async function download() {
    setExportError('');setExporting(true);
    try {
      const data = await apiDownload(`${endpoint}?${requestKey}&format=csv`);
      const url = URL.createObjectURL(data), a = document.createElement('a');a.href=url;a.download='brand-audit-log.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    } catch(e) {setExportError(e.message);} finally {setExporting(false);}
  }
  const meta = result.data?.meta;
  return <div className="space-y-4"><form onSubmit={apply} className="bg-white rounded-2xl border border-slate-200 p-4 grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
    {fields.map(([key,title])=><label key={key}>{title}<input name={key} value={form[key]} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))} type={['from','to'].includes(key)?'date':'text'} className="block w-full mt-1 border border-slate-200 rounded-lg p-2"/></label>)}
    {admin&&<label>Type<select aria-label="Type" value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))} className="block w-full mt-1 border rounded-lg p-2"><option value="">All types</option>{['System','Support','User','Finance','Inventory','Warranty'].map(type=><option key={type}>{type}</option>)}</select></label>}
    {admin&&<label>Brand<select aria-label="Brand" value={form.brand} onChange={e=>setForm(f=>({...f,brand:e.target.value}))} className="block w-full mt-1 border rounded-lg p-2"><option value="">All brands</option>{brands.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label>}
    <div className="flex gap-3 items-end"><button className="rounded-lg bg-blue-900 text-white px-4 py-2">Apply filters</button><button type="button" onClick={()=>{setSearch({});setForm(Object.fromEntries(Object.keys(form).map(k=>[k,''])));}} className="px-3 py-2 border rounded-lg">Clear</button></div>
  </form>
  <div className="flex items-center justify-between text-xs"><p>{meta?.total ?? 0} audit entries</p>{!admin&&<button type="button" disabled={exporting||result.loading} onClick={download} className="bg-white border rounded-lg px-4 py-2">{exporting?'Exporting…':'Export CSV'}</button>}</div>
  {(result.error||exportError)&&<p role="alert" className="text-red-700 text-sm">{result.error?.message||exportError}</p>}
  <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">{result.loading?<p role="status" className="p-8 text-slate-500 text-sm">Loading audit entries…</p>:!result.error&&<AuditEntries rows={result.data?.data||[]} admin={admin}/>}</div>
  <div className="flex gap-3 items-center text-xs"><button disabled={page<=1||result.loading} onClick={()=>setSearch({...Object.fromEntries(search),page:String(page-1)})} className="border rounded-lg p-2 disabled:opacity-40">Previous</button><span>Page {page} of {meta?.totalPages||1}</span><button disabled={page>=(meta?.totalPages||1)||result.loading} onClick={()=>setSearch({...Object.fromEntries(search),page:String(page+1)})} className="border rounded-lg p-2 disabled:opacity-40">Next</button></div></div>;
}
