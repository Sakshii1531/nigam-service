import { useState } from 'react';
import { ImagePlus, Loader2 } from 'lucide-react';
import { uploadImage } from '../../../lib/uploadImage';
import { resolveMediaUrl } from '../../../lib/apiClient';
import { removePlainBackground, BACKGROUND_MESSAGES } from '../../../lib/removeBackground';
import { isImageIcon } from '../../common/ItemIcon';

const CHECKERBOARD = {
  backgroundImage: 'linear-gradient(45deg, #e2e8f0 25%, transparent 25%), linear-gradient(-45deg, #e2e8f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e2e8f0 75%), linear-gradient(-45deg, transparent 75%, #e2e8f0 75%)',
  backgroundSize: '12px 12px',
  backgroundPosition: '0 0, 0 6px, 6px -6px, -6px 0',
  backgroundColor: '#fff',
};

/**
 * Upload field for the picture of an item (a service, a product type, a product
 * category). The picture is shown to customers exactly as stored, on a plain
 * card, so it should have a transparent background: by default a plain backdrop
 * is cut out automatically before upload, and the preview sits on a checkerboard
 * so any remaining background is obvious. Anything stored here that is not a
 * picture address (an emoji typed in before pictures were supported) is
 * treated as "no picture".
 */
export default function PictureField({ label = 'Picture', value, onChange, hint, disabled = false }) {
  const [removeBg, setRemoveBg] = useState(true);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const hasPicture = isImageIcon(value);

  const pick = async (file) => {
    if (!file) return;
    setBusy(true);
    setError('');
    setNote('');
    try {
      let upload = file;
      if (removeBg && file.type !== 'image/svg+xml') {
        const result = await removePlainBackground(file);
        upload = result.file;
        setNote(BACKGROUND_MESSAGES[result.status] || '');
      }
      onChange(await uploadImage(upload));
    } catch (err) {
      setError(err.message || 'Upload failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div role="group" aria-label={label}>
      <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">{label}</span>
      <div className="flex items-start gap-3">
        <span className="w-24 h-24 rounded-xl border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center" style={CHECKERBOARD}>
          {hasPicture ? <img src={resolveMediaUrl(value)} alt="" className="max-w-full max-h-full object-contain" /> : <ImagePlus size={20} className="text-slate-300" />}
        </span>
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <label className={`px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 ${disabled || busy ? 'opacity-60 pointer-events-none' : 'cursor-pointer'}`}>
              {busy ? <span className="inline-flex items-center gap-1.5"><Loader2 size={13} className="animate-spin" /> Processing…</span> : hasPicture ? 'Replace picture' : 'Upload picture'}
              <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" aria-label={`Upload ${label.toLowerCase()}`} disabled={disabled || busy} onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }} />
            </label>
            {hasPicture && (
              <button type="button" onClick={() => { onChange(''); setNote(''); }} className="text-xs font-bold text-rose-600 cursor-pointer">Remove</button>
            )}
          </div>
          <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-500 cursor-pointer">
            <input type="checkbox" checked={removeBg} onChange={(e) => setRemoveBg(e.target.checked)} className="w-3.5 h-3.5" />
            Remove a plain background automatically
          </label>
        </div>
      </div>
      <p className="text-[11px] text-slate-400 mt-1">{hint || 'Customers see the picture exactly as uploaded, on a white card. A product on a transparent background looks best (PNG or WebP). The squares behind it here show what is transparent.'}</p>
      {note && <p role="status" className="text-[11px] font-semibold text-blue-700 mt-1">{note}</p>}
      {error && <p role="alert" className="text-[11px] font-semibold text-rose-600 mt-1">{error}</p>}
    </div>
  );
}
