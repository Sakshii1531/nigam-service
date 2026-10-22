import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, FileText, Monitor, Smartphone, Laptop, Bath, Box, Home, X } from 'lucide-react';
import { apiRequest } from '../../lib/apiClient';
import AppliancePhoto from './AppliancePhoto';

const blank = { nickname:'', category:'', brand:'', modelNumber:'', serialNumber:'', purchaseDate:'', manufacturerWarrantyEndsOn:'', dealer:'', notes:'' };
const input = 'mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100';
const groups = [['Electronics',Monitor],['IT & Computer',Laptop],['Mobile & Gadgets',Smartphone],['Home Appliances',Home],['Bathware & Sanitary',Bath],['Others',Box]];
const documentLabels = { invoice:'Purchase invoice / bill', warranty:'Warranty card / certificate', photo:'Product photos' };
export default function ApplianceForm({ appliance, category, onSaved, onClose, showSuccess = false }) {
  const initial = () => Object.fromEntries(Object.keys(blank).map(key => [key,
    key.endsWith('Date') || key === 'manufacturerWarrantyEndsOn' ? appliance?.[key]?.slice(0,10) || '' : appliance?.[key] || (key === 'category' ? category || '' : ''),
  ]));
  const [draft, setDraft] = useState(initial);
  const [categories, setCategories] = useState([]), [brands, setBrands] = useState([]);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [step, setStep] = useState(1);
  const [files, setFiles] = useState([]), [success, setSuccess] = useState(null), [manual, setManual] = useState(false);
  const savedRef = useRef(null), uploaded = useRef(new Set());
  const [savedProduct, setSavedProduct] = useState(null), [uploadedKeys, setUploadedKeys] = useState(new Set());
  useEffect(() => {
    let active = true;
    apiRequest('/catalog/categories').then(items => active && setCategories(items || [])).catch(() => {});
    apiRequest('/catalog/brands').then(items => active && setBrands(items || [])).catch(() => {});
    return () => { active = false; };
  }, []);
  function selectFiles(kind, selection) {
    const added = Array.from(selection || []);
    if (files.length + added.length + (appliance?.documents?.length || 0) > 20) return setError('Keep up to 20 files per appliance.');
    if (added.some(file => file.size > 10 * 1024 * 1024)) return setError('Each file must be 10 MB or smaller.');
    const allowed = kind === 'photo' ? ['image/jpeg','image/png','image/webp'] : ['application/pdf','image/jpeg','image/png','image/webp'];
    if (added.some(file => !allowed.includes(file.type))) return setError('Choose PDF, JPG, PNG or WebP documents, or JPG, PNG or WebP photos.');
    setError(''); setFiles(p => [...p, ...added.map(file => ({ file, kind, key:crypto.randomUUID() }))]);
  }
  async function save(e) {
    e.preventDefault();
    if (!appliance && step === 1) { setStep(2); setError(''); return; }
    setBusy(true); setError('');
    try {
      let saved = savedRef.current;
      if (!saved) {
        const body = { ...draft, purchaseDate:draft.purchaseDate || null, manufacturerWarrantyEndsOn:draft.manufacturerWarrantyEndsOn || null };
        if (!appliance) body.createSeparateUnit = true;
        saved = await apiRequest(`/appliances${appliance ? `/${appliance.id}` : ''}`, { method:appliance ? 'PATCH' : 'POST', auth:true, body });
        savedRef.current = saved; setSavedProduct(saved);
      }
      for (const entry of files) {
        if (uploaded.current.has(entry.key)) continue;
        const body = new FormData(); body.append('kind',entry.kind); body.append('file',entry.file);
        await apiRequest(`/appliances/${saved.id}/documents`, { method:'POST',auth:true,body });
        uploaded.current.add(entry.key); setUploadedKeys(new Set(uploaded.current));
      }
      saved = await apiRequest(`/appliances/${saved.id}`, { auth:true });
      if (!appliance && showSuccess) setSuccess(saved); else onSaved(saved);
    } catch (e) { setError(`${savedRef.current ? 'Product details are saved. Some files may still need uploading. Retry to upload the remaining files. ' : ''}${e.message}`); }
    finally { setBusy(false); }
  }
  function another() {
    savedRef.current = null; setSavedProduct(null); uploaded.current.clear(); setUploadedKeys(new Set()); setSuccess(null); setDraft({ ...blank }); setFiles([]); setStep(1); setError('');
  }
  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-3 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget && !busy && !success && !savedRef.current) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="appliance-form-title" className="max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl sm:p-7">
      {success ? <div className="py-7 text-center"><CheckCircle2 size={64} className="mx-auto text-emerald-600" /><h2 id="appliance-form-title" className="mt-5 text-2xl font-extrabold text-slate-900">Product saved successfully!</h2><p className="mt-2 text-sm text-slate-500">Your product details and selected files are saved in My Appliances.</p><div className="my-6 rounded-2xl bg-slate-50 p-5"><AppliancePhoto appliance={success} className="mx-auto mb-3 h-20 w-28" /><p className="font-bold">{success.nickname || `${success.brand} ${success.category}`}</p><p className="mt-1 text-sm text-slate-500">{success.modelNumber || 'Model not recorded'}</p><span className="mt-3 inline-block rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">Details saved</span></div><button onClick={() => onSaved(success, { view:'list' })} className="w-full rounded-xl bg-yellow-400 p-3 text-sm font-bold text-slate-900">View My Appliances</button><button onClick={another} className="mt-3 w-full rounded-xl border border-blue-200 p-3 text-sm font-bold text-blue-800">Register another</button></div> : <>
      <div className="flex items-start justify-between gap-3"><div><h2 id="appliance-form-title" className="text-xl font-extrabold text-slate-900">{appliance ? 'Edit appliance' : 'Register appliance'}</h2><p className="mt-1 text-sm text-slate-500">Any brand · Any category · One place</p></div><button type="button" aria-label="Close appliance form" disabled={busy} onClick={() => savedRef.current ? onSaved(savedRef.current) : onClose()} className="rounded-full p-2 hover:bg-slate-100"><X size={20} /></button></div>
      {!appliance && <div className="mt-5 grid grid-cols-2 gap-3 text-xs font-bold"><p className={`border-b-2 pb-3 ${step === 1 ? 'border-blue-700 text-blue-800' : 'border-slate-100 text-slate-400'}`}>1. Product details</p><p className={`border-b-2 pb-3 ${step === 2 ? 'border-blue-700 text-blue-800' : 'border-slate-100 text-slate-400'}`}>2. Documents & photos</p></div>}
      <form onSubmit={save} className="mt-5 grid gap-4 sm:grid-cols-2">
        {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700 sm:col-span-2">{error}</p>}
        {(appliance || step === 1) && <>
        {!appliance && <div className="sm:col-span-2"><p className="mb-2 text-xs font-bold text-slate-600">Choose a category or enter one below</p><div className="grid grid-cols-3 gap-2">{groups.map(([name,Icon]) => <button key={name} type="button" onClick={() => setDraft(p => ({ ...p, category:name }))} aria-pressed={draft.category === name} className={`flex flex-col items-center gap-2 rounded-xl border p-3 text-center text-xs font-semibold ${draft.category === name ? 'border-blue-600 bg-blue-50 text-blue-800' : 'border-slate-200 text-slate-600'}`}><Icon size={22} />{name}</button>)}</div></div>}
        <div className="flex gap-2 sm:col-span-2" role="group" aria-label="Product entry mode">{['Brand & model','Manual entry'].map((label,i) => <button type="button" key={label} aria-pressed={manual === !!i} onClick={() => setManual(!!i)} className={`rounded-full px-4 py-2 text-xs font-bold ${manual === !!i ? 'bg-blue-800 text-white' : 'bg-slate-100 text-slate-600'}`}>{label}</button>)}</div>
        {[
          ['nickname','Appliance name','text',false,100],['category','Category','text',true,100],['brand','Brand','text',true,80],
          ['modelNumber','Model number','text',false,200],['serialNumber','Serial number','text',false,200],
          ['purchaseDate','Purchase date','date',false],['manufacturerWarrantyEndsOn','Warranty end date (your record)','date',false],['dealer','Purchased from','text',false,200],
        ].map(([key,title,type,required,maxLength]) => <label key={key} className="text-xs font-bold text-slate-600">{key === 'nickname' ? 'Product / appliance name' : title}{required ? ' *' : ''}<input autoFocus={key === 'nickname'} aria-label={title} required={required} maxLength={maxLength} type={type} list={!manual && key === 'category' ? 'appliance-categories' : !manual && key === 'brand' ? 'appliance-brands' : undefined} value={draft[key]} onChange={e => setDraft(p => ({ ...p, [key]:e.target.value }))} className={input} /></label>)}
        <datalist id="appliance-categories">{[...new Set([...groups.map(([name]) => name),...categories.map(c => c.key || c.name)])].map(c => <option key={c} value={c} />)}</datalist>
        <datalist id="appliance-brands">{brands.map(b => typeof b === 'string' ? b : b.name).filter(Boolean).map(b => <option key={b} value={b} />)}</datalist>
        <p className="text-xs leading-5 text-slate-500 sm:col-span-2">{manual ? 'Enter any brand and model, even if they are not in the catalogue.' : 'Choose a suggested brand or type another. Enter the model printed on your product.'} Warranty dates are your personal record; NCC verifies service coverage separately.</p>
        </>}
        {!appliance && step === 2 && <><div className="sm:col-span-2"><h3 className="font-bold text-slate-800">Documents & photos <span className="text-xs font-normal text-slate-500">(optional)</span></h3><p className="mt-1 text-xs text-slate-500">Private to your account. Up to 20 files, 10 MB each.</p></div>{Object.entries(documentLabels).map(([kind,label]) => <label key={kind} className="flex cursor-pointer items-center gap-3 rounded-xl border border-blue-100 bg-blue-50/50 p-4 text-sm font-bold text-blue-900 sm:col-span-2"><FileText size={22} /><span className="min-w-0 flex-1">{label}<span className="mt-1 block text-xs font-normal text-slate-500">{kind === 'photo' ? 'Front, serial label or installation · JPG, PNG, WebP' : 'PDF, JPG, PNG or WebP'}</span></span><span className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs">Upload</span><input aria-label={`Upload ${label}`} className="sr-only" type="file" multiple disabled={busy} accept={kind === 'photo' ? 'image/jpeg,image/png,image/webp' : 'application/pdf,image/jpeg,image/png,image/webp'} onChange={e => { selectFiles(kind,e.target.files); e.target.value = ''; }} /></label>)}<div className="space-y-2 sm:col-span-2">{files.map(entry => <div key={entry.key} className="flex items-center gap-2 rounded-lg bg-slate-50 p-2 text-xs"><span className="min-w-0 flex-1 truncate">{entry.file.name}{uploadedKeys.has(entry.key) ? ' · Uploaded' : ''}</span><button type="button" disabled={busy || uploadedKeys.has(entry.key)} aria-label={`Remove ${entry.file.name}`} onClick={() => setFiles(p => p.filter(f => f.key !== entry.key))} className="p-1"><X size={16} /></button></div>)}</div></>}
        {(appliance || step === 2) && <label className="text-xs font-bold text-slate-600 sm:col-span-2">Additional notes<textarea aria-label="Appliance notes" rows={3} maxLength={2000} disabled={!!savedProduct} value={draft.notes} onChange={e => setDraft(p => ({ ...p, notes:e.target.value }))} placeholder="Installation location, product colour or other details" className={input} /></label>}
        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 sm:col-span-2"><button type="button" disabled={busy} onClick={() => !appliance && step === 2 && !savedRef.current ? setStep(1) : savedRef.current ? onSaved(savedRef.current) : onClose()} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold">{savedProduct ? 'View saved appliance' : !appliance && step === 2 ? 'Back' : 'Cancel'}</button><button disabled={busy} className="rounded-xl bg-yellow-400 px-5 py-2.5 text-sm font-bold text-slate-900 disabled:opacity-50">{busy ? 'Saving…' : !appliance && step === 1 ? 'Next' : savedProduct ? 'Retry uploads' : 'Save appliance'}</button></div>
      </form></>}
    </section>
  </div>;
}
