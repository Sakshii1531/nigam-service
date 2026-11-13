import { useEffect, useState } from 'react';
import { AirVent, Bath, Box, Cctv, Laptop, Monitor, Refrigerator, Smartphone } from 'lucide-react';
import { apiDownload, resolveMediaUrl } from '../../lib/apiClient';

// Fetch through the authenticated endpoint; private documents never become public URLs.
export default function AppliancePhoto({ appliance, className = '' }) {
  const [url, setUrl] = useState('');
  const fileId = appliance.documents?.find(d => d.kind === 'photo')?.fileId;
  useEffect(() => {
    let active = true, objectUrl;
    setUrl('');
    if (fileId) apiDownload(`/appliances/${appliance.id}/documents/${fileId}`).then(blob => {
      if (!active) return;
      objectUrl = URL.createObjectURL(blob); setUrl(objectUrl);
    }).catch(() => {});
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [appliance.id, fileId]);
  // A category tile carries the picture the admin uploaded for it (public, unlike a customer's own appliance photo).
  const shown = url || (appliance.imageUrl ? resolveMediaUrl(appliance.imageUrl) : '');
  const category = appliance.category?.toLowerCase() || '';
  const Icon = category === 'ac' || category.includes('air') ? AirVent : category.includes('mobile') || category.includes('gadget') ? Smartphone : category.includes('computer') || category.includes('laptop') || category.includes('it &') ? Laptop : category.includes('bath') ? Bath : category.includes('cctv') ? Cctv : category.includes('refrigerator') || category.includes('fridge') ? Refrigerator : category.includes('electronic') || category.includes('tv') ? Monitor : Box;
  return <div className={`flex items-center justify-center overflow-hidden rounded-2xl border border-blue-100/60 bg-gradient-to-br from-blue-50 to-slate-100 text-blue-800 ${className}`}>{shown ? <img src={shown} alt={appliance.nickname || `${appliance.brand} ${appliance.category}`} className="h-full w-full object-contain p-2" /> : <Icon size={32} strokeWidth={1.5} />}</div>;
}
