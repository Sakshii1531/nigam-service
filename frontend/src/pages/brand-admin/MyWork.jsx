import { Link } from 'react-router-dom';
import Sidebar from '../../components/brand-admin/Sidebar';
import Topbar from '../../components/brand-admin/Topbar';
import { useApiData } from '../../hooks/useApiData';
import { useWarrantyClaimLive } from '../../hooks/useWarrantyClaimLive';
import { apiRequest } from '../../lib/apiClient';
import { formatDateTime } from '../../lib/partnerWarrantyFormat';
const titles={assigned:'My open tickets',contacts:'Open contact requests',callbacks:'Callbacks today',awaitingCustomer:'Registered by me · Awaiting customer'};
export default function MyWork(){
  const result=useApiData(()=>apiRequest('/brand/my-work',{auth:true}),[]);
  useWarrantyClaimLive(result.reload,null,'brand_admin');
  return <div className="min-h-screen bg-slate-100 flex"><Sidebar/><main className="flex-1 ml-64 min-w-0"><Topbar title="My Work" subtitle="Your tickets, customer contacts and callbacks"/><div className="p-5 space-y-5">{result.error&&<p role="alert">{result.error.message}</p>}{result.loading&&<p>Loading work…</p>}<div className="flex justify-end"><button onClick={result.reload} className="text-xs text-blue-900">Refresh work</button></div>{Object.entries(titles).map(([key,title])=><section key={key} className="rounded-2xl border bg-white p-5"><h2 className="font-bold text-sm">{title} <span className="text-blue-900" data-testid={`work-count-${key}`}>{result.data?.counts[key]??0}</span></h2><ul className="divide-y mt-3">{result.data?.sections[key].items.map(c=><li key={c.id} className="py-3 text-xs"><Link to={`/brand-admin/tickets/${c.id}`} className="text-blue-900 font-bold underline">{c.humanId}</Link><p>{c.productName} · {c.issueName} · {c.status} · {c.priority}</p>{key==='contacts'&&c.contactRequests.map(r=><p key={r.id}>{r.reason}</p>)}{key==='callbacks'&&c.callbacks.map(r=><p key={r.id}>{formatDateTime(r.dueAt)} · {r.remarks}</p>)}</li>)}</ul>{result.data?.counts[key]===0&&<p className="text-xs text-slate-500 mt-3">No work in this list.</p>}{result.data?.counts[key]>100&&<p className="text-xs mt-3">Showing the latest 100 tickets. Use All Tickets to narrow the list.</p>}</section>)}</div></main></div>;
}
