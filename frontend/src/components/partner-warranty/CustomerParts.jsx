import {useState} from 'react';
import {useApiData} from '../../hooks/useApiData';
import {apiRequest} from '../../lib/apiClient';
export default function CustomerParts({ticketId}){
 const [actionError,setError]=useState(''),[busy,setBusy]=useState(false);
 const res=useApiData(()=>apiRequest(`/partner-warranty/claims/${ticketId}/parts`,{auth:true}),[ticketId],{initial:[]});
 const parts=res.data,error=actionError||res.error?.message,load=res.reload;
 async function respond(p,approved){setBusy(true);try{await apiRequest(`/partner-warranty/claims/${ticketId}/parts/${p.id||p._id}/respond`,{auth:true,method:'POST',body:{approved}});await load();}catch(e){setError(e.message);}finally{setBusy(false);}}
 if(!parts.length&&!error)return null;
 return <section aria-label="Replacement parts" className="bg-white border rounded-2xl p-4 space-y-3"><h2 className="font-bold">Replacement parts</h2>{error&&<p role="alert">{error}</p>}{parts.map(p=><div key={p.id||p._id} className="text-sm"><p>{p.partName} · Qty {p.qty} · {p.status}</p>{p.payer==='customer'?<><p>Cost: ₹{p.price*p.qty} · {p.customerApprovalStatus}</p>{p.customerApprovalStatus==='Pending'&&p.status==='Pending'&&<div className="flex gap-4 mt-2"><button disabled={busy} onClick={()=>respond(p,true)} className="text-blue-800 font-bold">Approve part cost</button><button disabled={busy} onClick={()=>respond(p,false)}>Decline part cost</button></div>}</>:<p>Covered by {p.payer==='brand'?'the brand':'NCC'} · No payment required</p>}</div>)}</section>;
}
