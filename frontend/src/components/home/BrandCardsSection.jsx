import { ExternalLink, ShoppingCart } from 'lucide-react';
import { Skeleton } from '../common/Skeleton';
import BrandOfferCard, { isExternalLink, openCardLink } from './BrandOfferCard';

/**
 * A home-screen section of promo cards. Used for the built-in "Brands & Offers"
 * and for every brand-card section an admin adds in Super Admin → Customer App →
 * Home layout. Hidden when it has no card to show.
 *
 * cards: [{ id, brandName, title, subtitle, image, buttonText, actionUrl, badgeText, gradient, textColor }]
 */
export default function BrandCardsSection({ title, cards, loading, navigate }) {
  if (!loading && !cards.length) return null;
  return (
    <div className="md:mt-10 lg:mt-14 xl:mt-16">
      <div className="flex items-center mb-4 sm:mb-6 md:mb-8 lg:mb-10 md:justify-center">
        <h2 className="text-lg font-bold md:text-2xl lg:text-3xl xl:text-4xl md:font-black text-text-primary md:text-center">{title}</h2>
      </div>

      {/* Master card container for desktop */}
      <div className="md:bg-slate-100 md:rounded-[32px] md:p-6 lg:p-8 md:border md:border-slate-200/80 md:shadow-[0_10px_30px_rgba(0,0,0,0.03)] md:max-w-325 md:mx-auto">
        {/* Cards — scroll on mobile, 2-column grid inside the single card on desktop */}
        <div className="flex overflow-x-auto gap-3 sm:gap-4 pt-1 pb-3 sm:pb-4 -mx-1 px-1 sm:-mx-2 sm:px-2 snap-x no-scrollbar md:grid md:grid-cols-2 md:gap-6 lg:gap-8 md:overflow-visible md:mx-0 md:px-0 md:pb-0 md:pt-0">
          {loading
            ? Array.from({ length: 2 }, (_, i) => <Skeleton key={`brand-skeleton-${i}`} className="shrink-0 w-[80vw] sm:w-96 md:w-auto h-40 md:h-48" rounded="rounded-3xl" />)
            : cards.map((card) => (
                <BrandOfferCard
                  key={card.id}
                  card={card}
                  onOpen={(c) => openCardLink(c.actionUrl, navigate)}
                  className="w-[85vw] sm:w-80 md:w-auto md:max-w-none md:flex-shrink shrink-0 snap-start"
                />
              ))}
        </div>

        {/* Legend: only the icons that appear on the cards being shown */}
        {!loading && (
          <div className="mt-4 md:mt-6 pt-3 text-[9.5px] md:text-xs font-bold text-slate-500">
            <div className="flex flex-col md:flex-row items-center justify-center gap-3 md:gap-8 w-max mx-auto px-4">
              {cards.some((c) => c.actionUrl && !isExternalLink(c.actionUrl)) && (
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-3.5 h-3.5 text-brand-blue shrink-0" />
                  <span>Cart icon: continue in the NCC app</span>
                </div>
              )}
              {cards.some((c) => isExternalLink(c.actionUrl)) && (
                <div className="flex items-center gap-2">
                  <ExternalLink className="w-3.5 h-3.5 text-brand-blue shrink-0" />
                  <span>Arrow icon: opens the brand's website</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
