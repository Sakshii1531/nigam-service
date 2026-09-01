import React, { useState, useEffect } from 'react';
import { Star, User, ChevronRight, ChevronLeft, ArrowRight, ArrowLeft } from 'lucide-react';
import { apiRequest } from '../../lib/apiClient';

const THEME_STYLES = {
  pink: {
    bg: 'bg-gradient-to-br from-[#FFF5F8] to-[#FCE7F3]', // Rose Pink Gradient
    border: 'border-[#FBCFE8]',
    title: 'text-[#BE185D]',
    badge: 'bg-[#BE185D] text-white',
    author: 'text-[#BE185D]',
  },
  purple: {
    bg: 'bg-gradient-to-br from-[#F5F3FF] to-[#EDE9FE]', // Indigo Lavender Gradient
    border: 'border-[#DDD6FE]',
    title: 'text-[#6D28D9]',
    badge: 'bg-[#6D28D9] text-white',
    author: 'text-[#6D28D9]',
  },
  teal: {
    bg: 'bg-gradient-to-br from-[#F0FDF4] to-[#DCFCE7]', // Mint Emerald Gradient
    border: 'border-[#BBF7D0]',
    title: 'text-[#047857]',
    badge: 'bg-[#047857] text-white',
    author: 'text-[#047857]',
  },
  amber: {
    bg: 'bg-gradient-to-br from-[#EFF6FF] to-[#DBEAFE]', // Ice Royal Blue Gradient
    border: 'border-[#BFDBFE]',
    title: 'text-[#0B4EA2]',
    badge: 'bg-[#0B4EA2] text-white',
    author: 'text-[#0B4EA2]',
  },
};

const DEFAULT_REVIEWS = [
  {
    id: 'rev_f1',
    title: 'Very time convenient!',
    comment: 'Very happy with the salon service. Professional came on time & completed her work with perfection. Overall a great relaxing experience.',
    rating: 5.0,
    authorName: 'Priyanka',
    theme: 'pink',
  },
  {
    id: 'rev_f2',
    title: 'Spotless. Advance tools',
    comment: 'Amazing! Professional used the scrubbing machine to remove all the hard water stains. Now my bathroom is spotless.',
    rating: 5.0,
    authorName: 'Atharva Singh',
    theme: 'purple',
  },
  {
    id: 'rev_f3',
    title: 'Expert Professional',
    comment: 'Professional was very knowledgeable about AC repair. He had all the necessary spare parts for faster & easier service.',
    rating: 4.7,
    authorName: 'Aman',
    theme: 'teal',
  },
  {
    id: 'rev_f4',
    title: 'Superb Quality & Quick Fix!',
    comment: 'Replaced defective water purifier filter in under 30 minutes. Extremely polite behavior and reasonable price.',
    rating: 5.0,
    authorName: 'Rajesh Sharma',
    theme: 'amber',
  },
  {
    id: 'rev_f5',
    title: 'Hassle-free Booking',
    comment: 'Great doorstep service for refrigerator cooling issues. Transparent billing and genuine replacement parts.',
    rating: 4.9,
    authorName: 'Sneha Patel',
    theme: 'pink',
  },
  {
    id: 'rev_f6',
    title: 'Punctual & Thorough',
    comment: 'Deep cleaning service was done meticulously. Used high grade eco-friendly materials and left zero mess behind.',
    rating: 5.0,
    authorName: 'Vikas Verma',
    theme: 'purple',
  },
];

const PlatformReviewCarousel = () => {
  const [reviews, setReviews] = useState(DEFAULT_REVIEWS);
  const [startIndex, setStartIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    apiRequest('/reviews/featured')
      .then((data) => {
        if (!cancelled && Array.isArray(data) && data.length > 0) {
          setReviews(data);
        }
      })
      .catch((err) => {
        console.warn('[PlatformReviewCarousel] Using fallback reviews:', err.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const visibleCards = 3;
  const maxIndex = Math.max(0, reviews.length - visibleCards);

  const handleNext = () => {
    setStartIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
  };

  const handlePrev = () => {
    setStartIndex((prev) => (prev <= 0 ? maxIndex : prev - 1));
  };

  const displayedReviews = reviews.slice(startIndex, startIndex + visibleCards);
  if (displayedReviews.length < visibleCards && reviews.length >= visibleCards) {
    displayedReviews.push(...reviews.slice(0, visibleCards - displayedReviews.length));
  }

  return (
    <div className="w-full mt-12 md:mt-16 lg:mt-20 relative">
      <div className="relative flex items-center">
        {/* Previous Button */}
        {startIndex > 0 && (
          <button
            onClick={handlePrev}
            aria-label="Previous reviews"
            className="absolute -left-5 z-20 w-11 h-11 rounded-full bg-white shadow-lg border border-slate-200 flex items-center justify-center text-slate-800 hover:bg-slate-50 hover:scale-105 active:scale-95 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
          </button>
        )}

        {/* Card Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full">
          {displayedReviews.map((item, idx) => {
            const themeKey = item.theme && THEME_STYLES[item.theme] ? item.theme : ['pink', 'purple', 'teal', 'amber'][idx % 4];
            const theme = THEME_STYLES[themeKey];

            return (
              <div
                key={`${item.id}-${idx}`}
                className={`${theme.bg} border ${theme.border} rounded-[24px] p-6 shadow-xs flex flex-col justify-between h-[215px] transition-all hover:shadow-md duration-300 relative overflow-hidden`}
              >
                <div className="flex-1 flex flex-col justify-between">
                  {/* Top Header Row */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h4 className={`text-sm lg:text-base font-extrabold ${theme.title} leading-tight truncate`}>
                      {item.title}
                    </h4>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <div className="flex items-center gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3.5 h-3.5 ${
                              i < Math.floor(item.rating)
                                ? 'fill-amber-400 text-amber-400'
                                : 'fill-slate-200 text-slate-200'
                            }`}
                          />
                        ))}
                      </div>
                      <span className={`px-1.5 py-0.5 rounded-md text-[11px] font-black ${theme.badge}`}>
                        {Number(item.rating).toFixed(1)}
                      </span>
                    </div>
                  </div>

                  {/* Body Quotes & Comment */}
                  <div className="relative pt-0 flex-1 flex flex-col justify-center">
                    <span className="text-xl font-serif font-black block text-slate-800 leading-none mb-0.5 select-none">
                      “
                    </span>
                    <p className="text-xs text-slate-700 leading-relaxed font-normal pl-1 pr-1 line-clamp-3">
                      {item.comment}
                    </p>
                    <span className="text-xl font-serif font-black block text-slate-800 leading-none text-right -mt-1 select-none">
                      ”
                    </span>
                  </div>
                </div>

                {/* Footer Author Row */}
                <div className={`flex items-center justify-end gap-1 mt-4 text-xs font-bold ${theme.author}`}>
                  <User className="w-3.5 h-3.5" />
                  <span>{item.authorName}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Arrow Carousel Button (Matching Screenshot) */}
        <button
          onClick={handleNext}
          aria-label="Next reviews"
          className="absolute -right-5 z-20 w-11 h-11 rounded-full bg-white shadow-lg border border-slate-200 flex items-center justify-center text-slate-800 hover:bg-slate-50 hover:scale-105 active:scale-95 transition-all cursor-pointer"
        >
          <ArrowRight className="w-5 h-5 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
};

export default PlatformReviewCarousel;
