import { useEffect, useState } from 'react';
import { apiRequest } from '../../lib/apiClient';
import WebhookCard from './WebhookCard';
const SCOPES=['catalog:read','uploads:create','tickets:create','tickets:read'];
export default function Integrations() {
  const [keys,setKeys]=useState([]),[name,setName]=useState(''),[sources,setSources]=useState(['whatsapp']),[scopes,setScopes]=useState(SCOPES);
  const [secret,setSecret]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[copied,setCopied]=useState(false);
  const reload=()=>apiRequest('/brand/api-keys',{auth:true}).then(setKeys);
  useEffect(()=>{reload().catch(e=>setError(e.message));},[]);
  const toggle=(value,list,set)=>set(list.includes(value)?list.filter(v=>v!==value):[...list,value]);
  async function mutate(path,method,body) {
    setBusy(true);setError('');
    if(method==='PATCH')setKeys(current=>current.map(k=>`/${k.id}`===path?{...k,...body}:k));
    try{const result=await apiRequest(`/brand/api-keys${path}`,{auth:true,method,body});
      if(result.secret){setSecret(result.secret);setCopied(false);setName('');}await reload();
    }catch(e){setError(e.message);await reload().catch(()=>{});}finally{setBusy(false);}
  }
  return <div className="space-y-8"><section className="space-y-4"><h2 className="text-lg font-bold">Intake API keys</h2>
    <p className="text-sm text-slate-500">Connect your WhatsApp bot or CRM to register and track tickets.</p>
    {error&&<p role="alert" className="text-red-700">{error}</p>}
    <form className="space-y-3" onSubmit={e=>{e.preventDefault();mutate('','POST',{name,allowedSources:sources,scopes});}}>
      <label className="block">Key name<input required maxLength={100} value={name} onChange={e=>setName(e.target.value)} className="block border rounded px-3 py-2"/></label>
      <fieldset><legend>Allowed sources</legend>{['whatsapp','api'].map(s=><label key={s} className="mr-4"><input type="checkbox" checked={sources.includes(s)} onChange={()=>toggle(s,sources,setSources)}/> {s}</label>)}</fieldset>
      <fieldset><legend>Scopes</legend>{SCOPES.map(s=><label key={s} className="mr-4 inline-block"><input type="checkbox" checked={scopes.includes(s)} onChange={()=>toggle(s,scopes,setScopes)}/> {s}</label>)}</fieldset>
      <button disabled={busy||!scopes.length||!sources.length} className="bg-blue-800 text-white rounded px-4 py-2 disabled:opacity-50">Create API key</button>
    </form>
    <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead><tr>{['Name','Prefix','Last used','Access',''].map((t,i)=><th key={i} className="p-2">{t}</th>)}</tr></thead>
      <tbody>{keys.map(k=><tr key={k.id} className="border-t"><td className="p-2">{k.name}{k.revokedAt&&' (revoked)'}</td><td>{k.prefix}</td><td>{k.lastUsedAt?new Date(k.lastUsedAt).toLocaleString():'Never'}</td>
        <td><fieldset disabled={busy||Boolean(k.revokedAt)}><legend className="sr-only">Access for {k.name}</legend>{['whatsapp','api'].map(s=><label key={s} className="block"><input type="checkbox" aria-label={`${k.name} source ${s}`} checked={k.allowedSources.includes(s)} onChange={()=>mutate(`/${k.id}`,'PATCH',{allowedSources:k.allowedSources.includes(s)?k.allowedSources.filter(v=>v!==s):[...k.allowedSources,s]})}/> {s}</label>)}
        {SCOPES.map(s=><label key={s} className="block"><input type="checkbox" aria-label={`${k.name} scope ${s}`} checked={k.scopes.includes(s)} onChange={()=>mutate(`/${k.id}`,'PATCH',{scopes:k.scopes.includes(s)?k.scopes.filter(v=>v!==s):[...k.scopes,s]})}/> {s}</label>)}</fieldset></td>
        <td>{!k.revokedAt&&<button disabled={busy} onClick={()=>mutate(`/${k.id}/revoke`,'POST',{})} className="text-red-700">Revoke {k.name}</button>}</td></tr>)}</tbody></table></div>
    {!keys.length&&<p className="text-sm text-slate-500">No API keys yet.</p>}
  </section><WebhookCard/>
    {secret&&<div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center"><section role="dialog" aria-modal="true" aria-labelledby="key-title" className="bg-white rounded-xl p-6 max-w-xl space-y-4">
      <h2 id="key-title" className="font-bold">Copy your API key now</h2><p>This secret is shown once. Store it securely.</p><code className="block break-all bg-slate-100 p-3">{secret}</code>
      <button className="border rounded px-3 py-2 mr-3" onClick={async()=>{try{await navigator.clipboard.writeText(secret);setCopied(true);}catch{setError('Clipboard unavailable. Select and copy the key.');}}}>{copied?'Copied':'Copy API key'}</button>
      <button className="border rounded px-3 py-2" autoFocus onClick={()=>setSecret('')}>Done</button>
    </section></div>}
  </div>;
}
