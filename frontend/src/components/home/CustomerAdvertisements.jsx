import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Megaphone, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiRequest, resolveMediaUrl } from '../../lib/apiClient';

const PLACEMENT_LABELS = {
  'App Header Banner': 'Featured offers',
  'Category Popup': 'Special offer',
  'Cart Bottom Banner': 'Cart offers',
};

function AdvertisementCard({ ad, compact = false, onActivate }) {
  const hasAction = Boolean(ad.actionUrl);
  return (
    <article
      className={`relative overflow-hidden rounded-2xl shadow-sm border border-white/20 ${compact ? 'min-h-32' : 'min-h-40'}`}
      style={{ backgroundColor: ad.backgroundColor || '#0B4EA2', color: ad.textColor || '#FFFFFF' }}>
      {ad.imageUrl && (
        <img
          src={resolveMediaUrl(ad.imageUrl)}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
      <div className="absolute inset-0 bg-linear-to-r from-black/75 via-black/45 to-black/10" />
      <div className={`relative z-10 flex flex-col items-start justify-center ${compact ? 'p-4 min-h-32' : 'p-5 sm:p-7 min-h-40'} max-w-2xl`}>
        <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest opacity-90 mb-2">
          <Megaphone className="w-3.5 h-3.5" /> Sponsored
        </span>
        <h3 className={`${compact ? 'text-base' : 'text-xl sm:text-2xl'} font-black leading-tight`}>
          {ad.title || ad.name}
        </h3>
        {ad.description && <p className="text-xs sm:text-sm mt-1.5 opacity-90 line-clamp-2">{ad.description}</p>}
        {hasAction && (
          <button
            type="button"
            onClick={() => onActivate(ad)}
            className="mt-4 inline-flex items-center gap-1.5 bg-white text-slate-900 px-4 py-2 rounded-xl text-xs font-black shadow-sm hover:bg-slate-50 transition-colors cursor-pointer">
            {ad.buttonText || 'Learn more'} <ExternalLink className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </article>
  );
}

export default function CustomerAdvertisements({ placement, className = '' }) {
  const navigate = useNavigate();
  const [ads, setAds] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let alive = true;
    const query = encodeURIComponent(placement);
    const fetchAds = () => apiRequest(`/cms/advertisements?type=${query}`, { silentError: true })
      .then((rows) => {
        if (!alive) return;
        const nextAds = Array.isArray(rows) ? rows : [];
        setAds(nextAds);
        if (placement === 'Category Popup' && nextAds[0]?.id) {
          try {
            setDismissed(sessionStorage.getItem(`ncc_ad_seen_${nextAds[0].id}`) === '1');
          } catch {
            setDismissed(false);
          }
        }
      })
      .catch(() => alive && setAds([]));
    fetchAds();
    window.addEventListener('focus', fetchAds);
    const interval = setInterval(fetchAds, 30_000);
    return () => {
      alive = false;
      window.removeEventListener('focus', fetchAds);
      clearInterval(interval);
    };
  }, [placement]);

  const visibleAds = useMemo(() => ads || [], [ads]);
  const popupAd = visibleAds[0];
  const popupSeenKey = popupAd ? `ncc_ad_seen_${popupAd.id}` : '';

  const dismissPopup = () => {
    if (popupSeenKey) {
      try { sessionStorage.setItem(popupSeenKey, '1'); } catch { /* storage can be disabled */ }
    }
    setDismissed(true);
  };

  const activate = async (ad) => {
    try {
      await apiRequest(`/cms/advertisements/${ad.id}/click`, { method: 'POST', silentError: true });
    } catch {
      // A tracking failure must never block the customer's destination.
    }
    if (placement === 'Category Popup') dismissPopup();
    if (!ad.actionUrl) return;
    if (/^https?:\/\//i.test(ad.actionUrl)) {
      window.open(ad.actionUrl, '_blank', 'noopener,noreferrer');
    } else {
      navigate(ad.actionUrl.startsWith('/') ? ad.actionUrl : `/${ad.actionUrl}`);
    }
  };

  if (ads === null || visibleAds.length === 0) return null;

  if (placement === 'Category Popup') {
    if (!popupAd || dismissed) return null;
    return (
      <div className="fixed inset-0 z-60 bg-slate-950/55 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={popupAd.title || popupAd.name}>
        <div className="relative w-full max-w-lg">
          <button
            type="button"
            onClick={dismissPopup}
            aria-label="Close advertisement"
            className="absolute -top-3 -right-3 z-20 w-9 h-9 rounded-full bg-white text-slate-700 shadow-lg flex items-center justify-center cursor-pointer">
            <X className="w-4 h-4" />
          </button>
          <AdvertisementCard ad={popupAd} onActivate={activate} />
        </div>
      </div>
    );
  }

  return (
    <section className={className} aria-label={PLACEMENT_LABELS[placement] || 'Advertisements'}>
      <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory no-scrollbar">
        {visibleAds.map((ad) => (
          <div key={ad.id} className="min-w-full snap-start">
            <AdvertisementCard ad={ad} compact={placement === 'Cart Bottom Banner'} onActivate={activate} />
          </div>
        ))}
      </div>
    </section>
  );
}
