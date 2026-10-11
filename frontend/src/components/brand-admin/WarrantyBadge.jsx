import {reasonLabel} from '../../lib/warrantyReason';
export default function WarrantyBadge({warranty}){
 return <span title={(warranty?.reasons||[]).map(reasonLabel).join(' · ')} className="inline-flex flex-col gap-1"><span className={`font-semibold ${warranty?.status==='In Warranty'?'text-emerald-700':warranty?.status==='Out of Warranty'?'text-red-700':'text-amber-700'}`}>{warranty?.status||'Not verified'}</span>{warranty?.policy&&<span className="text-xs text-slate-500">{warranty.policy.name} · v{warranty.policy.version}</span>}</span>;
}
