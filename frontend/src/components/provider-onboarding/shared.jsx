import { cloneElement, useEffect, useId, useRef, useState } from 'react';
import { Check, Circle, Clock3, ExternalLink, FileCheck2, FileText, LoaderCircle, X } from 'lucide-react';
import { apiRequest, resolveMediaUrl } from '../../lib/apiClient';
export const inputClass = 'w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50';
export const buttonClass = 'inline-flex items-center justify-center gap-2 rounded-xl bg-[#0D47A1] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#09377E] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50';
export const secondaryButtonClass = 'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50';
export const money = value => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value || 0);
const names = { ASM_REVIEW: 'ASM review', INTERVIEW_SCHEDULED: 'Interview scheduled', CHANGES_REQUESTED: 'Changes requested', ASM_REJECTED: 'Interview not approved', SUPER_ADMIN_REVIEW: 'Final approval pending', SUPER_ADMIN_REJECTED: 'Final review not approved', APPROVED: 'Approved', interview_pass: 'Interview passed', final_approve: 'Final approval', final_reject: 'Final review not approved', interview_reject: 'Interview not approved', schedule: 'Schedule interview', request_changes: 'Request changes' };
export const label = value => names[value] || String(value || '').replace(/([a-z])([A-Z])/g, '$1 $2').replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
export const dateTime = value => value ? new Date(value).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Not scheduled';
export function Field({ title, children }) { const id = useId(); return <div className="min-w-0 space-y-1.5"><label className="block text-xs font-semibold text-slate-600" htmlFor={id}>{title}</label>{cloneElement(children, { id })}</div>; }
export function Panel({ title, description, icon: Icon, action, children, className = '' }) {
  return <section className={`min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}><div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4"><div className="flex items-start gap-2.5">{Icon && <Icon size={18} className="mt-0.5 shrink-0 text-[#0D47A1]" />}<div><h2 className="text-sm font-bold text-slate-900">{title}</h2>{description && <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>}</div></div>{action}</div><div className="p-5">{children}</div></section>;
}
export function StatusBadge({ children, tone = 'blue' }) {
  const tones = { blue: 'bg-blue-50 text-blue-800 ring-blue-100', green: 'bg-emerald-50 text-emerald-700 ring-emerald-100', amber: 'bg-amber-50 text-amber-800 ring-amber-100', red: 'bg-red-50 text-red-700 ring-red-100', slate: 'bg-slate-100 text-slate-500 ring-slate-200' };
  return <span className={`inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${tones[tone] || tones.blue}`}>{children}</span>;
}
export function JourneyProgress({ application, orders = [], ready = false, legacy = false }) {
  if (legacy) return <div className="flex items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900"><FileCheck2 size={20} />Existing provider · recorded legacy onboarding exemption</div>;
  const state = application?.state;
  const interview = ['SUPER_ADMIN_REVIEW', 'APPROVED'].includes(state);
  const approved = state === 'APPROVED';
  const paid = orders.some(o => o.paymentStatus === 'Paid' && o.items?.some(i => i.qualifiesForOnboarding));
  const received = orders.some(o => o.paymentStatus === 'Paid' && o.status === 'ReceiptVerified' && o.items?.some(i => i.qualifiesForOnboarding));
  const done = [Boolean(application), interview, approved, paid || ready, received || ready];
  const steps = ['Application', 'ASM interview', 'Final approval', 'Kit payment', 'Verified delivery'];
  const current = done.findIndex(value => !value);
  return <ol aria-label="Onboarding progress" className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-5 sm:gap-0 sm:p-5">{steps.map((step, index) => <li key={step} aria-current={current === index ? 'step' : undefined} className="relative flex items-center gap-3 sm:flex-col sm:gap-2 sm:text-center"><div className={`z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${done[index] ? 'bg-[#0D47A1] text-white' : current === index ? 'bg-blue-50 text-[#0D47A1] ring-2 ring-blue-200' : 'bg-slate-100 text-slate-400'}`}>{done[index] ? <Check size={15} /> : index + 1}</div>{index < steps.length - 1 && <span aria-hidden="true" className={`absolute left-[60%] top-4 hidden h-px w-[80%] sm:block ${done[index + 1] ? 'bg-blue-300' : 'bg-slate-200'}`} />}<span className={`text-xs font-semibold ${done[index] || current === index ? 'text-slate-800' : 'text-slate-400'}`}>{step}</span><span className="ml-auto text-[10px] text-slate-400 sm:ml-0">{done[index] ? 'Complete' : current === index ? 'Next step' : 'Upcoming'}</span></li>)}</ol>;
}
export function Timeline({ events = [] }) {
  if (!events.length) return <p className="py-2 text-xs text-slate-400">No updates recorded yet.</p>;
  return <ol className="space-y-0">{[...events].reverse().map((event, index) => <li key={index} className="relative flex gap-3 pb-6 last:pb-0"><div className="relative flex w-5 shrink-0 justify-center">{index < events.length - 1 && <span className="absolute bottom-[-4px] top-5 w-px bg-slate-200" />}<span className={`z-10 mt-0.5 flex h-5 w-5 items-center justify-center rounded-full ${index === 0 ? 'bg-blue-50 text-[#0D47A1]' : 'bg-slate-100 text-slate-400'}`}>{index === 0 ? <Clock3 size={12} /> : <Circle size={8} />}</span></div><div className="min-w-0"><p className="text-xs font-bold text-slate-800">{label(event.action.replaceAll('.', ' '))}</p>{event.message && <p className="mt-1 break-words text-xs leading-5 text-slate-500">{event.message}</p>}<time className="mt-1.5 block text-[10px] text-slate-400">{dateTime(event.at)}</time></div></li>)}</ol>;
}
export function DocumentButtons({ base }) { return <DocumentPreview key={base} base={base} />; }
function DocumentPreview({ base }) {
  const [error, setError] = useState(''), [preview, setPreview] = useState(null), [loading, setLoading] = useState(null), [mediaLoading, setMediaLoading] = useState(false), [mediaError, setMediaError] = useState(false);
  const requestId = useRef(0);
  const previewRef = useRef(null);
  useEffect(() => () => { requestId.current++; if (previewRef.current?.startsWith('blob:')) URL.revokeObjectURL(previewRef.current); }, []);
  function close() { requestId.current++; setLoading(null); setMediaLoading(false); if (previewRef.current?.startsWith('blob:')) URL.revokeObjectURL(previewRef.current); previewRef.current = null; setPreview(null); }
  async function open(side) {
    const id = ++requestId.current;
    setError(''); setLoading(side);
    try {
      const result = await apiRequest(`${base}/${side}`, { auth: true });
      if (id !== requestId.current) return;
      let url = result.url;
      if (!url) throw new Error('No document is available. Please ask the provider to upload it again.');
      const type = result.contentType || url.match(/^data:([^;]+)/)?.[1] || (/\.pdf(?:$|[?#])|[?&]format=pdf(?:&|$)/i.test(url) ? 'application/pdf' : 'image');
      if (url.startsWith('data:')) { const blob = await (await fetch(url)).blob(); url = URL.createObjectURL(blob); }
      else url = resolveMediaUrl(url);
      if (id !== requestId.current) { if (url.startsWith('blob:')) URL.revokeObjectURL(url); return; }
      if (previewRef.current?.startsWith('blob:')) URL.revokeObjectURL(previewRef.current);
      previewRef.current = url; setMediaError(false); setMediaLoading(true); setPreview({ url, type, side });
    } catch (e) { if (id === requestId.current) setError(e.message); } finally { if (id === requestId.current) setLoading(null); }
  }
  return <div className="space-y-3"><div className="grid gap-3 sm:grid-cols-2">{['front', 'back'].map(side => <button key={side} type="button" disabled={Boolean(loading)} aria-label={`Review Aadhaar ${side}`} onClick={() => open(side)} className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 text-left transition hover:border-blue-200 hover:bg-blue-50/60 disabled:opacity-60"><span className="rounded-lg border border-slate-200 bg-white p-2 text-[#0D47A1]">{loading === side ? <LoaderCircle size={18} className="animate-spin" /> : <FileText size={18} />}</span><span className="min-w-0 flex-1"><span className="block text-xs font-bold text-slate-700">Aadhaar {side}</span><span className="mt-1 block text-[10px] text-slate-400">View submitted document</span></span><ExternalLink size={14} className="shrink-0 text-slate-400" /></button>)}</div>{error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-xs text-red-700">{error}</p>}{preview && <div className="overflow-hidden rounded-xl border border-slate-200"><div className="flex items-center justify-between gap-2 bg-slate-50 px-3 py-2"><a className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-800" href={preview.url} target="_blank" rel="noreferrer">Open document <ExternalLink size={12} /></a><button type="button" aria-label="Close document" onClick={close} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-200"><X size={16} /></button></div><div className="relative bg-slate-100 p-3">
        {mediaLoading && <p role="status" className="flex items-center justify-center gap-2 p-5 text-xs text-slate-500"><LoaderCircle size={16} className="animate-spin" />Loading document…</p>}
        {mediaError ? <p role="alert" className="p-5 text-sm text-red-700">The document could not be displayed. Use Open document to try it in a new tab, or ask the provider to upload it again.</p> : preview.type === 'application/pdf' ? <><iframe key={preview.url} title="Aadhaar document preview" src={preview.url} onLoad={() => setMediaLoading(false)} onError={() => { setMediaLoading(false); setMediaError(true); }} className="h-[32rem] w-full bg-white" /><p className="mt-2 text-xs text-slate-500">If your browser cannot display this PDF, use Open document above.</p></> : <img key={preview.url} alt={`Aadhaar ${preview.side} document preview`} src={preview.url} onLoad={() => setMediaLoading(false)} onError={() => { setMediaLoading(false); setMediaError(true); }} className="mx-auto max-h-[36rem] w-full rounded-lg bg-white object-contain" />}
      </div></div>}</div>;
}
