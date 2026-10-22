import PdfPreview from './PdfPreview';
import { useEffect, useRef, useState } from 'react';
import { Download, FileText, Image, Trash2, Upload, X } from 'lucide-react';
import { apiDownload, apiRequest } from '../../lib/apiClient';
const labels = { invoice:'Purchase invoice', warranty:'Warranty document', photo:'Product photo', other:'Other document' };
export default function ApplianceDocuments({ appliance, onChanged }) {
  const [kind, setKind] = useState('invoice'), [busy, setBusy] = useState(false), [error, setError] = useState(''), [preview, setPreview] = useState(null);
  const alive = useRef(true), latestUrl = useRef(null);
  useEffect(() => { alive.current = true; return () => { alive.current = false; if (latestUrl.current) URL.revokeObjectURL(latestUrl.current); }; }, []);
  const [remove, setRemove] = useState(null);
  useEffect(() => () => { if (preview?.url) URL.revokeObjectURL(preview.url); }, [preview]);
  async function upload(file) {
    if (!file) return;
    setError('');
    if (file.size > 10 * 1024 * 1024) return setError('Choose a file up to 10 MB.');
    setBusy(true);
    try {
      const form = new FormData(); form.append('kind', kind); form.append('file', file);
      await apiRequest(`/appliances/${appliance.id}/documents`, { method:'POST', auth:true, body:form });
      await onChanged();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function view(doc) {
    setBusy(true); setError('');
    try {
      const response = await apiDownload(`/appliances/${appliance.id}/documents/${doc.fileId}`);
      if (!alive.current) return;
      if (latestUrl.current) URL.revokeObjectURL(latestUrl.current);
      latestUrl.current = URL.createObjectURL(response);
      setPreview({ ...doc, url:latestUrl.current });
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function deleteDocument() {
    setBusy(true); setError('');
    try { await apiRequest(`/appliances/${appliance.id}/documents/${remove.fileId}`, { method:'DELETE', auth:true }); setRemove(null); await onChanged(); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"><h2 className="text-base font-bold text-slate-900">Documents & photos</h2><p className="mt-1 text-xs text-slate-500">Private to your account. PDF, JPG, PNG or WebP · up to 10 MB each · 20 files per appliance.</p>
    {error && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <div className="mt-4 flex flex-wrap items-end gap-3"><label className="text-xs font-bold text-slate-600">Document type<select aria-label="Document type" value={kind} onChange={e => setKind(e.target.value)} className="mt-1 block rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm">{Object.entries(labels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className={`flex cursor-pointer items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-bold text-blue-800 ${busy ? 'pointer-events-none opacity-50' : ''}`}><Upload size={16} />{busy ? 'Please wait…' : 'Upload file'}<input disabled={busy} aria-label="Upload appliance document" type="file" className="sr-only" accept={kind === 'photo' ? 'image/jpeg,image/png,image/webp' : 'application/pdf,image/jpeg,image/png,image/webp'} onChange={e => { upload(e.target.files?.[0]); e.target.value = ''; }} /></label></div>
    <div className="mt-4 space-y-2">{!appliance.documents?.length ? <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No documents or photos added yet.</p> : appliance.documents.map(doc => <div key={doc.fileId} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3">{doc.kind === 'photo' ? <Image size={20} className="shrink-0 text-blue-700" /> : <FileText size={20} className="shrink-0 text-blue-700" />}<button disabled={busy} onClick={() => view(doc)} className="min-w-0 flex-1 text-left"><span className="block truncate text-sm font-semibold text-slate-800">{doc.name}</span><span className="text-xs text-slate-500">{labels[doc.kind]} · {Math.ceil(doc.size/1024)} KB · View</span></button><button disabled={busy} aria-label={`Delete ${doc.name}`} onClick={() => setRemove(doc)} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={16} /></button></div>)}</div>
    {remove && <div role="alertdialog" aria-label="Delete document" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm"><p>Delete {remove.name} permanently?</p><div className="mt-3 flex gap-3"><button disabled={busy} onClick={deleteDocument} className="rounded-lg bg-red-600 px-4 py-2 font-bold text-white">Delete document</button><button disabled={busy} onClick={() => setRemove(null)}>Keep document</button></div></div>}
    {preview && <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/70 p-3 backdrop-blur-sm"><section role="dialog" aria-modal="true" aria-label="Document preview" className="flex max-h-[90dvh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white"><div className="flex items-center justify-between gap-3 border-b border-slate-100 p-4"><h3 className="truncate text-sm font-bold">{preview.name}</h3><div className="flex gap-2"><a href={preview.url} download={preview.name} aria-label="Download document" className="rounded-lg p-2 text-blue-700"><Download size={20} /></a><button aria-label="Close document preview" onClick={() => setPreview(null)} className="rounded-lg p-2"><X size={20} /></button></div></div>{preview.mimeType.startsWith('image/') ? <img src={preview.url} alt={preview.name} className="max-h-[70dvh] min-h-0 object-contain p-4" /> : <PdfPreview key={preview.url} url={preview.url} />}<p className="border-t border-slate-100 p-3 text-xs text-slate-500">If your browser cannot preview this file, use Download document.</p></section></div>}
  </section>;
}
