import { useEffect, useRef, useState } from 'react';
import { Phone, MessageSquare, CalendarDays, Paperclip, X } from 'lucide-react';
import { apiRequest } from '../../lib/apiClient';
import { uploadClaimDocument, uploadClaimVideo, DOCUMENT_LABELS, DOCUMENT_ACCEPT, VIDEO_ACCEPT } from '../../lib/partnerWarrantyApi';
import { useApiData } from '../../hooks/useApiData';
const inputClass='block w-full border border-slate-200 rounded-lg p-2 mt-1';
const label=s=>s.replaceAll('_',' ').replace(/^./,c=>c.toUpperCase());
export default function TicketCommunication({ ticket, complaint, onSaved }) {
  const options=useApiData(()=>apiRequest('/brand/tickets/communication-options',{auth:true}),[]);
  const [mode,setMode]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[call,setCall]=useState(null);
  const [form,setForm]=useState({channel:'phone',direction:'outbound',outcome:'connected',durationSec:'',callbackAt:'',remarks:'',contactRequestId:'',date:'',slot:'morning',reason:''});
  const [kind,setKind]=useState('invoice'),[documents,setDocuments]=useState([]);
  const dialog=useRef(null);
  useEffect(()=>{if(mode&&dialog.current&&!dialog.current.open)dialog.current.showModal();},[mode]);
  useEffect(()=>{
    if(!call?.id||['completed','failed','no-answer','busy','canceled'].includes(call.status))return;
    let active=true;const timer=setInterval(async()=>{try{const result=await apiRequest(`/brand/tickets/${ticket.id}/calls/${call.id}`,{auth:true});if(active){setCall(result);if(['completed','failed','no-answer','busy','canceled'].includes(result.status))await onSaved();}}catch(e){if(active)setError(e.message);}},2000);
    return ()=>{active=false;clearInterval(timer);};
  },[call?.id,call?.status,ticket.id,onSaved]);
  const change=e=>setForm(f=>({...f,[e.target.name]:e.target.value}));
  const field=(name,title,type='text',props={})=><label>{title}<input name={name} type={type} value={form[name]} onChange={change} className={inputClass} {...props}/></label>;
  async function save(e){e.preventDefault();setBusy(true);setError('');try{
    let body;
    if(mode==='contacts')body={channel:form.channel,direction:form.direction,outcome:form.outcome,remarks:form.remarks,...(form.durationSec!==''?{durationSec:Number(form.durationSec)}:{}),...(form.outcome==='callback_requested'?{callbackAt:new Date(form.callbackAt).toISOString()}:{}),...(form.contactRequestId?{contactRequestId:form.contactRequestId}:{})};
    if(mode==='reschedule')body={date:form.date,slot:form.slot,reason:form.reason};
    if(mode==='documents')body={documents};
    await apiRequest(`/brand/tickets/${ticket.id}/${mode}`,{method:'POST',auth:true,body});
    dialog.current.close();setDocuments([]);setForm(f=>({...f,remarks:'',reason:'',contactRequestId:'',callbackAt:''}));await onSaved();window.dispatchEvent(new Event('brand:my-work-changed'));
  }catch(e){setError(e.message);}finally{setBusy(false);}}
  async function upload(e){const file=e.target.files?.[0];e.target.value='';if(!file)return;setBusy(true);setError('');try{const d=kind==='video'?await uploadClaimVideo(file):await uploadClaimDocument(file);setDocuments(ds=>[...ds,{kind,url:d.url,name:file.name}]);}catch(e){setError(e.message);}finally{setBusy(false);}}
  async function startCall(){setBusy(true);setError('');try{setCall(await apiRequest(`/brand/tickets/${ticket.id}/call`,{method:'POST',auth:true,body:{to:'customer'}}));}catch(e){setError(e.message);}finally{setBusy(false);}}
  return <div className="mt-3 text-xs print-hide">
    <div className="flex flex-wrap gap-2">{[['contacts','Log contact',MessageSquare],['reschedule','Reschedule',CalendarDays],['documents','Add document',Paperclip]].map(([key,title,Icon])=><button key={key} type="button" disabled={busy} onClick={()=>{setError('');setMode(key);}} className="border rounded-lg px-3 py-2 flex gap-2 items-center bg-white"><Icon size={14}/>{title}</button>)}{options.data?.callEnabled&&<button disabled={busy||Boolean(call&&!['completed','failed','no-answer','busy','canceled'].includes(call.status))} onClick={startCall} className="border rounded-lg px-3 py-2 flex gap-2 items-center"><Phone size={14}/>Call customer</button>}</div>
    {call&&<p role="status" className="mt-2">Call: {label(call.status)}{call.duration!=null?` · ${call.duration}s`:''}. Your registered phone will ring first.</p>}
    {error&&!mode&&<p role="alert" className="text-red-700 mt-2">{error}</p>}
    <dialog ref={dialog} onCancel={e=>{if(busy)e.preventDefault();}} onClose={()=>setMode('')} aria-label={mode==='contacts'?'Log contact':mode==='reschedule'?'Reschedule visit':'Add document'} className="m-auto w-full max-w-lg rounded-2xl p-6 backdrop:bg-black/60">
      <button type="button" disabled={busy} aria-label="Close communication dialog" onClick={()=>dialog.current.close()} className="float-right"><X size={18}/></button><h2 className="font-bold text-sm mb-4">{mode==='contacts'?'Log contact':mode==='reschedule'?'Reschedule visit':'Add document'}</h2>
      {error&&<p role="alert" className="text-red-700 mb-3">{error}</p>}
      <form onSubmit={save} className="space-y-3 text-xs">
        {mode==='contacts'&&<>
          {['channel','direction','outcome'].map(name=><label key={name} className="block">{label(name)}<select aria-label={label(name)} name={name} value={form[name]} onChange={change} className={inputClass}>{(name==='channel'?options.data?.channels||['phone']:name==='outcome'?options.data?.outcomes||['connected']:['inbound','outbound']).map(v=><option key={v} value={v}>{label(v)}</option>)}</select></label>)}
          {field('durationSec','Duration (seconds)','number',{min:0,max:86400})}
          {form.outcome==='callback_requested'&&field('callbackAt','Callback time','datetime-local',{required:true})}
          <label className="block">Contact request<select aria-label="Contact request" name="contactRequestId" value={form.contactRequestId} onChange={change} className={inputClass}><option value="">General contact</option>{complaint.contactRequests.filter(r=>r.status==='open').map(r=><option key={r.id} value={r.id}>{r.reason}</option>)}</select></label>
          <label className="block">Contact remarks<textarea required minLength={5} maxLength={2000} name="remarks" value={form.remarks} onChange={change} className={inputClass}/></label>
        </>}
        {mode==='reschedule'&&<><p className="text-slate-500">Before assignment this changes the preferred visit. An assigned partner must confirm a proposed slot.</p>{field('date','New visit date','date',{required:true})}<label className="block">New visit slot<select aria-label="New visit slot" name="slot" value={form.slot} onChange={change} className={inputClass}>{['morning','afternoon','evening'].map(v=><option key={v} value={v}>{label(v)}</option>)}</select></label><label className="block">Reschedule reason<textarea required minLength={5} maxLength={2000} name="reason" value={form.reason} onChange={change} className={inputClass}/></label></>}
        {mode==='documents'&&<><label className="block">Document kind<select aria-label="Document kind" value={kind} onChange={e=>setKind(e.target.value)} className={inputClass}>{Object.entries(DOCUMENT_LABELS).map(([value,title])=><option key={value} value={value}>{title}</option>)}</select></label><label className="block">Upload document<input type="file" disabled={busy||documents.length>=10} accept={kind==='video'?VIDEO_ACCEPT:DOCUMENT_ACCEPT} onChange={upload} className="block mt-2"/></label><ul>{documents.map((d,i)=><li key={`${d.url}:${i}`} className="flex justify-between mt-2">{d.name}<button type="button" disabled={busy} onClick={()=>setDocuments(ds=>ds.filter((_,j)=>i!==j))}>Remove</button></li>)}</ul><p className="text-slate-500">Up to 10 documents. Warranty evidence is re-evaluated before approval.</p></>}
        <button disabled={busy||(mode==='documents'&&!documents.length)} className="rounded-lg px-4 py-2 bg-blue-900 text-white">{busy?'Saving…':mode==='contacts'?'Save contact':mode==='reschedule'?'Request reschedule':'Save documents'}</button>
      </form>
    </dialog>
  </div>;
}
