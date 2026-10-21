import { cloneElement, useId, useState } from 'react';
import { apiRequest, resolveMediaUrl } from '../../lib/apiClient';
export const inputClass = 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm';
export const buttonClass = 'rounded-xl bg-[#0D47A1] px-4 py-2 font-semibold text-white disabled:opacity-50';
export const money = value => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value || 0);
export const label = value => String(value || '').replace(/([a-z])([A-Z])/g, '$1 $2').replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
export function Field({ title, children }) { const id = useId(); return <div className="block text-sm font-medium text-slate-700 space-y-1"><label htmlFor={id}>{title}</label>{cloneElement(children, { id })}</div>; }
export function Timeline({ events = [] }) {
  return <ol className="space-y-3">{[...events].reverse().map((event, index) => <li key={index} className="border-l-2 border-blue-200 pl-3"><p className="font-medium text-slate-800">{label(event.action.replaceAll('.', ' '))}</p><p className="text-sm text-slate-600">{event.message}</p><time className="text-xs text-slate-500">{new Date(event.at).toLocaleString()}</time></li>)}</ol>;
}
export function DocumentButtons({ base }) {
  const [error, setError] = useState(''), [preview, setPreview] = useState(null);
  async function open(side) {
    setError('');
    try {
      const result = await apiRequest(`${base}/${side}`, { auth: true });
      let url = result.url;
      if (url.startsWith('data:')) { const blob = await (await fetch(url)).blob(); url = URL.createObjectURL(blob); }
      else url = resolveMediaUrl(url);
      if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview);
      setPreview(url);
    } catch (e) { setError(e.message); }
  }
  return <div className="space-y-3"><div className="flex gap-2"><button type="button" className={buttonClass} onClick={() => open('front')}>Review Aadhaar front</button><button type="button" className={buttonClass} onClick={() => open('back')}>Review Aadhaar back</button></div>{error && <p role="alert">{error}</p>}{preview && <div><a className="text-blue-800 underline" href={preview} target="_blank" rel="noreferrer">Open document</a><iframe title="Aadhaar document preview" src={preview} className="w-full h-96 border mt-2" /><button type="button" onClick={() => { if (preview.startsWith('blob:')) URL.revokeObjectURL(preview); setPreview(null); }}>Close document</button></div>}</div>;
}
