import { ExternalLink, ShoppingCart } from 'lucide-react';
import { resolveMediaUrl } from '../../lib/apiClient';

export const isExternalLink = (url) => /^https?:\/\//i.test(String(url || ''));

/** Follows a card's link: web addresses open in a new tab, in-app paths navigate. */
export function openCardLink(url, navigate) {
  const target = String(url || '').trim();
  if (!target) return;
  if (isExternalLink(target)) window.open(target, '_blank', 'noopener,noreferrer');
  else navigate(target);
}

/**
 * One "Brands & Offers" promo card. The customer's home screen and the admin's
 * live preview both render this component, so what an admin sees while editing
 * is exactly what customers get.
 *
 * card: { brandName, title, subtitle, image, buttonText, actionUrl, badgeText, gradient, textColor }
 */
export default function BrandOfferCard({ card, onOpen, className = '' }) {
  const external = isExternalLink(card.actionUrl);
  const color = card.textColor || '#014694';
  const interactive = Boolean(onOpen && card.actionUrl);
  const open = () => interactive && onOpen(card);

  return (
    <div
      role={interactive ? 'link' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={open}
      onKeyDown={(e) => {
        if (interactive && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          open();
        }
      }}
      className={`h-50 md:h-55 rounded-[24px] bg-linear-to-br ${card.gradient} p-4 md:p-6 flex flex-col justify-between relative overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.03)] border border-slate-100/50 ${interactive ? 'cursor-pointer' : ''} ${className}`}>
      <div className="flex flex-col items-start z-10 max-w-[65%]">
        {card.badgeText && (
          <span className="text-[9px] font-bold px-2 py-0.5 rounded-md tracking-wide mb-1" style={{ backgroundColor: `${color}1F`, color }}>
            {card.badgeText}
          </span>
        )}
        <span className="font-sans font-black text-xl tracking-tight break-words" style={{ color }}>
          {card.brandName}
        </span>
        <h3 className="text-xs font-black text-slate-800 mt-1.5 leading-tight line-clamp-2">{card.title}</h3>
        {card.subtitle && <p className="text-[10px] font-semibold text-slate-600 mt-0.5 leading-tight line-clamp-2">{card.subtitle}</p>}
      </div>

      {card.image && (
        <img src={resolveMediaUrl(card.image)} alt={card.brandName} className="absolute -right-3 top-8 w-35 md:w-40 h-25 md:h-28.75 object-contain z-0 mix-blend-multiply" />
      )}

      <div className="z-10 mt-auto flex items-center">
        <div className="bg-white text-brand-blue text-[11px] font-black py-2 px-4 rounded-full flex items-center gap-2 shadow-[0_2px_8px_rgba(0,0,0,0.05)] border border-slate-100/80">
          <span>{card.buttonText || 'Explore on NCC'}</span>
          {external ? <ExternalLink className="w-3.5 h-3.5 text-brand-blue" /> : <ShoppingCart className="w-3.5 h-3.5 text-brand-blue" />}
        </div>
      </div>
    </div>
  );
}
