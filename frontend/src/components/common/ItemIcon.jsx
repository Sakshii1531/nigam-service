import { Wrench } from 'lucide-react';
import { resolveMediaUrl } from '../../lib/apiClient';

/** True when `value` is something an <img> can show (an uploaded picture), not typed text. */
export const isImageIcon = (value) => {
  if (typeof value !== 'string') return false;
  const s = value.trim().toLowerCase();
  return s.startsWith('http://') || s.startsWith('https://') || s.startsWith('/') || s.startsWith('data:image/') || s.startsWith('blob:');
};

/**
 * The picture for a service, product type, category or product group.
 *
 * Admins upload these pictures (with the background removed), so they are drawn
 * as they are — no tile, no tint, `object-contain` on transparent. With no
 * picture uploaded the slot shows a neutral line icon, never text: anything
 * stored in the old "icon" field that is not a picture address (for example an
 * emoji typed in before pictures were supported) is ignored.
 */
export default function ItemIcon({ src, alt = '', className = 'w-6 h-6', fallback: Fallback = Wrench }) {
  if (isImageIcon(src)) return <img src={resolveMediaUrl(src)} alt={alt} className={`${className} object-contain`} />;
  return <Fallback className={`${className} text-slate-400`} strokeWidth={1.6} aria-hidden="true" />;
}
