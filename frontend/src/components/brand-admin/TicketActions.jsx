import {useEffect,useId,useRef,useState} from 'react';
import {useApiData} from '../../hooks/useApiData';
import {useBrandPermissions} from '../../hooks/useBrandPermissions';
import {apiRequest} from '../../lib/apiClient';
const titles={approve:'Approve warranty claim',reject:'Reject warranty claim',hold:'Hold ticket',resume:'Resume ticket','request-info':'Request more information','request-contact':'Request customer contact',priority:'Change priority'};
export default function TicketActions({claim,onSaved}){
 const {can}=useBrandPermissions();const opts=useApiData(()=>apiRequest('/brand/tickets/queue-options',{auth:true}),[]);
 const [action,setAction]=useState(null),[text,setText]=useState(''),[coverage,setCoverage]=useState('warranty'),[code,setCode]=useState(''),[priority,setPriority]=useState('Normal'),[kinds,setKinds]=useState([]),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const ref=useRef(null),textId=useId(),codeId=useId(),priorityId=useId();
 useEffect(()=>{if(action&&ref.current&&!ref.current.open)ref.current.showModal();},[action]);
 if(!claim)return null;
 const before=['Submitted','Brand Review','Info Requested','On Hold'].includes(claim.status)&&!claim.serviceJob;
 const decision=before&&claim.status!=='On Hold'&&can('tickets:approve');
 const open=kind=>{setAction(kind);setText('');setError('');setCode('');setKinds([]);setCoverage(claim.warranty?.status==='Out of Warranty'?'goodwill':'warranty');setPriority(claim.priority||'Normal');};
 const submit=async e=>{e.preventDefault();setBusy(true);setError('');let body;
 if(action==='approve')body={coverageDecision:coverage,...(text.trim()?{remarks:text.trim()}:{})};
 if(action==='reject')body={rejectionCode:code,reason:text.trim()};
 if(action==='hold'||action==='request-contact')body={reason:text.trim()};
 if(action==='resume')body={remarks:text.trim()};
 if(action==='request-info')body={message:text.trim(),documentKinds:kinds};
 if(action==='priority')body={priority,remarks:text.trim()};
 try{await apiRequest(`/brand/tickets/${claim.id}/${action}`,{auth:true,method:'POST',body});ref.current.close();setAction(null);onSaved();}catch(e){setError(e.message);}finally{setBusy(false);}};
 const optional=action==='resume'||(action==='approve'&&coverage!=='goodwill');
 const label=action==='approve'?(coverage==='goodwill'?'Goodwill justification':'Remarks for the record (optional)'):action==='reject'?'Reason for rejection':action==='request-info'?'What do you need from the customer?':action==='resume'?'Resume remarks (optional)':action==='priority'?'Priority change remarks':action==='hold'?'Hold reason':'Contact request reason';
 return <div className="flex flex-wrap gap-2 text-xs print:hidden">
 {decision&&<><button className="px-3 py-2 rounded-lg bg-emerald-700 text-white" onClick={()=>open('approve')}>Approve</button><button className="px-3 py-2 rounded-lg border text-red-700" onClick={()=>open('reject')}>Reject</button>{claim.status!=='Info Requested'&&<button className="px-3 py-2 rounded-lg border" onClick={()=>open('request-info')}>Request more information</button>}</>}
 {before&&can('tickets:approve')&&<><button className="px-3 py-2 rounded-lg border" onClick={()=>open(claim.status==='On Hold'?'resume':'hold')}>{claim.status==='On Hold'?'Resume':'Hold'}</button><button className="px-3 py-2 rounded-lg border" onClick={()=>open('request-contact')}>Request customer contact</button></>}
 {!['Closed','Rejected','Cancelled'].includes(claim.status)&&can('tickets:priority')&&<button className="px-3 py-2 rounded-lg border" onClick={()=>open('priority')}>Change priority</button>}
 <dialog ref={ref} onClose={()=>setAction(null)} aria-label={titles[action]||'Ticket action'} className="m-auto rounded-2xl w-full max-w-md p-6 backdrop:bg-black/40"><form onSubmit={submit} className="space-y-4"><h2 className="font-bold">{titles[action]}</h2>{action==='approve'&&<fieldset><legend className="font-semibold text-sm mb-2">Coverage decision</legend>{[['warranty','Warranty coverage'],['goodwill','Goodwill — brand pays']].map(([v,l])=><label className="block text-sm mb-2" key={v}><input type="radio" name="coverage" value={v} checked={coverage===v} onChange={()=>setCoverage(v)} className="mr-2"/>{l}</label>)}<p className="text-xs text-slate-500">{claim.warranty?.status}. Approval creates one NCC service job.</p></fieldset>}
 {action==='reject'&&<div><label htmlFor={codeId} className="text-sm">Rejection code</label><select id={codeId} required className="block w-full border rounded-lg p-2 mt-1" value={code} onChange={e=>setCode(e.target.value)}><option value="">Choose a reason code</option>{opts.data?.rejectionCodes.map(v=><option key={v} value={v}>{v.replaceAll('_',' ')}</option>)}</select></div>}
 {action==='priority'&&<div><label htmlFor={priorityId} className="text-sm">New priority</label><select id={priorityId} className="block w-full border rounded-lg p-2 mt-1" value={priority} onChange={e=>setPriority(e.target.value)}>{opts.data?.priorities.map(v=><option key={v}>{v}</option>)}</select></div>}
 {action==='request-info'&&<fieldset><legend className="text-sm mb-2">Request documents (optional)</legend><div className="flex flex-wrap gap-3">{opts.data?.documentKinds.filter(k=>!['additional','other','service_report'].includes(k)).map(k=><label key={k} className="text-sm"><input type="checkbox" className="mr-2" checked={kinds.includes(k)} onChange={e=>setKinds(e.target.checked?[...kinds,k]:kinds.filter(v=>v!==k))}/>{k.replaceAll('_',' ')}</label>)}</div></fieldset>}
 <div><label htmlFor={textId} className="text-sm">{label}</label><textarea id={textId} required={!optional} minLength={optional?undefined:5} maxLength={1000} value={text} onChange={e=>setText(e.target.value)} className="block w-full border rounded-lg p-2 mt-1" rows={4}/></div>{error&&<p role="alert" className="text-sm text-red-700">{error}</p>}<div className="flex justify-end gap-3"><button type="button" disabled={busy} onClick={()=>ref.current.close()}>Cancel</button><button disabled={busy||!opts.data} className="bg-blue-800 text-white px-4 py-2 rounded-lg">{busy?'Saving…':action==='approve'?'Approve claim':action==='reject'?'Reject claim':action==='request-info'||action==='request-contact'?'Send request':'Save action'}</button></div></form></dialog></div>;
}
