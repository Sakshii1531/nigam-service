import { useEffect, useRef } from 'react';
import { openCardLink } from './BrandOfferCard';

/**
 * A sliding strip of banner pictures — one per slide, advancing by itself every
 * few seconds and swipeable by hand. Used for the banner sections an admin adds
 * in Super Admin → Customer App → Home layout. A banner with a link opens it
 * when tapped. Renders nothing when there are no banners.
 *
 * banners: [{ id, image, link }]
 */
export default function BannerStrip({ banners, navigate, title }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current || banners.length < 2) return undefined;
    const timer = setInterval(() => {
      const el = ref.current;
      if (!el) return;
      if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 10) el.scrollTo({ left: 0, behavior: 'smooth' });
      else el.scrollBy({ left: el.clientWidth, behavior: 'smooth' });
    }, 3000);
    return () => clearInterval(timer);
  }, [banners.length]);

  if (!banners.length) return null;
  return (
    <div
      ref={ref}
      aria-label={title || 'Banners'}
      className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 -mx-1 px-1 sm:-mx-2 sm:px-2 snap-x snap-mandatory scroll-smooth no-scrollbar md:mx-auto md:px-0 md:pb-0 md:max-w-355 md:w-full relative">
      {banners.map((banner) => {
        const body = (
          <div className="relative h-32 sm:h-36 md:h-auto md:aspect-[3.35/1] w-full">
            <img src={banner.image} alt={title || 'Banner'} className="w-full h-full object-cover" />
          </div>
        );
        const card = 'bg-white rounded-2xl shadow-sm border border-border-color overflow-hidden min-w-[85vw] max-w-full sm:min-w-85 md:min-w-full md:w-full shrink-0 snap-center hover:shadow-md transition-shadow';
        return banner.link ? (
          <button key={banner.id} type="button" onClick={() => openCardLink(banner.link, navigate)} className={`${card} text-left cursor-pointer`}>
            {body}
          </button>
        ) : (
          <div key={banner.id} className={card}>
            {body}
          </div>
        );
      })}
    </div>
  );
}
