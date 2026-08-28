import React, { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../lib/apiClient';
import mostBookedAc1 from '../assets/most_booked_ac_1.png';
import mostBookedAc2 from '../assets/most_booked_ac_2.png';
import mostBookedWm from '../assets/most_booked_wm.png';
import applianceFridge from '../assets/appliance_fridge.png';

// Illustration per category — artwork, not data.
const CATEGORY_IMAGES = [mostBookedAc1, mostBookedAc2, mostBookedWm, applianceFridge];

const AllApplianceServices = () => {
  const navigate = useNavigate();

  // The real catalogue. This page listed six services with hardcoded prices and
  // star ratings (4.76, 4.74, …) that no review ever produced, and every card
  // navigated to a generic /booking regardless of which service was tapped.
  const [services, setServices] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const catRes = await apiRequest('/catalog/categories');
        const categories = catRes || [];

        const detailed = await Promise.all(
          categories.map((c) => apiRequest(`/catalog/categories/${encodeURIComponent(c.key)}`).catch(() => null)),
        );
        if (cancelled) return;

        const rows = [];
        detailed.forEach((res, i) => {
          const category = categories[i];
          (res?.data?.services || []).forEach((svc) => {
            rows.push({
              id: `${category.key}:${svc.id}`,
              categoryKey: category.key,
              slug: svc.id,
              title: svc.name,
              price: svc.price,
              unit: svc.unit,
              image: CATEGORY_IMAGES[i % CATEGORY_IMAGES.length],
            });
          });
        });
        setServices(rows);
      } catch (err) {
        if (!cancelled) setLoadError(err.message || 'Could not load services.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-screen bg-bg-light flex flex-col pb-20 lg:pb-8">
      {/* Header */}
      <div className="bg-[#E3ECF9] p-6 rounded-b-[30px] shadow-sm flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 bg-white rounded-full shadow-sm">
          <ArrowLeft className="h-5 w-5 text-[#0D47A1]" />
        </button>
        <h1 className="text-xl font-bold text-text-primary">Appliance Repair & Service</h1>
      </div>

      {/* Services Grid */}
      <div className="p-6">
        {loadError && (
          <p className="mb-4 bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-[11px] font-bold text-red-700">{loadError}</p>
        )}
        {!loading && !loadError && services.length === 0 && (
          <p className="text-center text-xs font-semibold text-slate-400 py-10">No services published yet.</p>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {services.map((service) => (
            <div 
              key={service.id}
              onClick={() => navigate(`/booking?service=${encodeURIComponent(service.title)}&price=${service.price}`)}
              className="flex flex-col gap-2 cursor-pointer border border-border-color rounded-2xl p-2 bg-white hover:border-[#0D47A1] transition-all"
            >
              <div className="w-full h-32 bg-white rounded-xl flex items-center justify-center overflow-hidden relative">
                <img src={service.image} alt={service.title} className="w-full h-full object-cover" />

              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold text-text-primary truncate">
                  {service.title}
                </span>
                <span className="text-[10px] text-text-secondary truncate">{service.categoryKey}</span>
                <span className="text-sm font-bold text-[#0D47A1]">
                  ₹{Number(service.price || 0).toLocaleString('en-IN')}{service.unit ? ` ${service.unit}` : ''}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AllApplianceServices;
