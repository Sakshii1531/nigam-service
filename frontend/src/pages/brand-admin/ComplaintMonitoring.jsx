import {Link} from 'react-router-dom';
import Sidebar from '../../components/brand-admin/Sidebar';
import Topbar from '../../components/brand-admin/Topbar';
import {useApiData} from '../../hooks/useApiData';
import {useWarrantyClaimLive} from '../../hooks/useWarrantyClaimLive';
import {apiRequest} from '../../lib/apiClient';
export default function ComplaintMonitoring(){const list=useApiData(()=>apiRequest('/brand/tickets?limit=1',{auth:true,envelope:true}),[]);const opts=useApiData(()=>apiRequest('/brand/tickets/queue-options',{auth:true}),[]);useWarrantyClaimLive(list.reload,null,'brand_admin');return <div className="min-h-screen bg-slate-50 flex"><Sidebar/><div className="flex-1 ml-64"><Topbar title="Complaint Monitoring" subtitle="Live ticket queue counts"/><main className="p-5 space-y-5">{list.error&&<p role="alert" className="text-red-700">{list.error.message}</p>}<div className="grid md:grid-cols-3 gap-5">{Object.entries(opts.data?.buckets||{}).map(([k,label])=><Link key={k} to={`/brand-admin/tickets?bucket=${k}`} className="border rounded-xl bg-white p-5"><h2 className="font-semibold">{label}</h2><p className="text-3xl font-bold mt-3">{list.data?.meta?.counts?.[k]??'—'}</p></Link>)}</div><Link to="/brand-admin/tickets" className="inline-block text-blue-800">Open all tickets</Link></main></div></div>;}
