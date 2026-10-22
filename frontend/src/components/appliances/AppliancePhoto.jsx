import { useEffect, useState } from 'react';
import { Box } from 'lucide-react';
import { apiDownload } from '../../lib/apiClient';

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
  return <div className={`flex items-center justify-center overflow-hidden rounded-xl bg-blue-50 text-blue-700 ${className}`}>{url ? <img src={url} alt={appliance.nickname || `${appliance.brand} ${appliance.category}`} className="h-full w-full object-contain p-2" /> : <Box size={32} />}</div>;
}
