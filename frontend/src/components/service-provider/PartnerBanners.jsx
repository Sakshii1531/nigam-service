import { useCallback, useEffect, useState } from 'react';
import { Megaphone } from 'lucide-react';
import { apiRequest, resolveMediaUrl } from '../../lib/apiClient';

const PartnerBanners = () => {
  const [banners, setBanners] = useState([]);

  const load = useCallback(async () => {
    try {
      const rows = await apiRequest('/cms/banners?app=service_provider', { silentError: true });
      setBanners(Array.isArray(rows) ? rows : []);
    } catch {
      // Promotional content must never block the operational dashboard.
    }
  }, []);

  useEffect(() => {
    load();
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    const timer = window.setInterval(load, 30000);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.clearInterval(timer);
    };
  }, [load]);

  if (!banners.length) return null;

  return (
    <section aria-label="Partner announcements" className="flex gap-3 overflow-x-auto snap-x snap-mandatory no-scrollbar">
      {banners.map((banner) => (
        <article key={banner.id} className="relative min-w-full md:min-w-[calc(50%-0.375rem)] snap-start overflow-hidden rounded-2xl border border-blue-100 bg-[#052355] text-white shadow-sm min-h-32">
          <img src={resolveMediaUrl(banner.imageUrl)} alt="" className="absolute inset-0 h-full w-full object-cover opacity-45" />
          <div className="absolute inset-0 bg-linear-to-r from-[#052355] via-[#052355]/85 to-transparent" />
          <div className="relative z-10 p-5 max-w-[78%]">
            <Megaphone size={18} className="text-[#FFD400] mb-2" />
            <h3 className="text-sm font-bold leading-tight">{banner.title || 'Partner update'}</h3>
            {banner.description && <p className="text-xs text-blue-100 mt-1.5 leading-relaxed line-clamp-2">{banner.description}</p>}
          </div>
        </article>
      ))}
    </section>
  );
};

export default PartnerBanners;
