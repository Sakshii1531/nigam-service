import { useState } from 'react';
import { uploadClaimVideo, VIDEO_ACCEPT } from '../../lib/partnerWarrantyApi';
import { resolveMediaUrl } from '../../lib/apiClient';
export default function VideoUploads({ value, onChange, onBusyChange = () => {} }) {
  const [progress,setProgress]=useState(null);
  const [error,setError]=useState('');
  const upload=async e=>{
    const file=e.target.files?.[0]; e.target.value='';
    if(!file)return;
    setError('');setProgress(0);onBusyChange(true);
    try {const doc=await uploadClaimVideo(file,setProgress);onChange([...value,doc]);}
    catch(err){setError(err.message);}finally{setProgress(null);onBusyChange(false);}
  };
  return <fieldset className="space-y-3"><legend className="font-semibold text-sm">Fault videos (optional)</legend><p className="text-xs text-slate-500">Up to 2 videos, 50 MB each. MP4, WebM or MOV.</p>
    <div className="flex flex-wrap gap-3">{value.map((v,i)=><div key={v.url} className="border rounded-xl p-3 max-w-xs"><video controls preload="metadata" className="w-full rounded-lg" src={resolveMediaUrl(v.url)} aria-label={v.name||'Fault video'}/><p className="text-xs mt-2 truncate">{v.name}</p><button type="button" disabled={progress!==null} onClick={()=>onChange(value.filter((_,j)=>j!==i))} className="text-sm text-red-700 mt-1">Remove video</button></div>)}</div>
    {value.length<2&&<label className="block text-sm font-semibold text-blue-800">Add video<input aria-label="Add video" type="file" accept={VIDEO_ACCEPT} disabled={progress!==null} onChange={upload} className="block mt-2 text-xs"/></label>}
    {progress!==null&&<div><progress aria-label="Video upload progress" max={100} value={progress} className="w-full"/><p role="status" className="text-xs">{progress===100?'Saving video…':`Uploading video: ${progress}%`}</p></div>}
    {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
  </fieldset>;
}
