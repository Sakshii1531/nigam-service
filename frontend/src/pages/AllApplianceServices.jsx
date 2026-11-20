import { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { listServiceGroups, formatRupees } from '../lib/catalogueApi';
import { useLocationContext } from '../context/LocationContext';
import ItemIcon from '../components/common/ItemIcon';
import { LoadingSection, SkeletonCardRow } from '../components/common/Skeleton';

const AllApplianceServices = () => {
  const navigate = useNavigate();

  // Every bookable service in the Master Catalogue, with its "from" price
  // (sizes folded together) and a link straight into the booking flow.
  const { currentLocation } = useLocationContext();
  const city = currentLocation?.city || '';
  const [services, setServices] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    listServiceGroups({ city: city || undefined })
      .then((groups) => {
        if (cancelled) return;
        setServices(groups || []);
        setLoadError('');
      })
      .catch((err) => !cancelled && setLoadError(err.message || 'Could not load services.'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [city]);

  return (
    <div className="min-h-screen bg-bg-light flex flex-col pb-20 lg:pb-8">
      {/* Header */}
      <div className="bg-[#E3ECF9] p-6 rounded-b-[30px] shadow-sm flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 bg-white rounded-full shadow-sm">
          <ArrowLeft className="h-5 w-5 text-brand-blue" />
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

        <LoadingSection
          loading={loading}
          label="services"
          skeleton={<SkeletonCardRow count={10} columns="grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" cardClassName="w-auto" imageClassName="h-32" />}
        >
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {services.map((service) => (
            <div 
              key={service.deepLink}
              onClick={() => navigate(service.deepLink)}
              className="flex flex-col gap-2 cursor-pointer border border-border-color rounded-2xl p-2 bg-white hover:border-brand-blue transition-all"
            >
              <div className="w-full h-32 bg-white rounded-xl flex items-center justify-center overflow-hidden relative">
                <ItemIcon src={service.imageUrl} alt={service.title} className="w-full h-full p-3" />

              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold text-text-primary truncate">
                  {service.title}
                </span>
                <span className="text-[10px] text-text-secondary truncate">{service.category.name}</span>
                <span className="text-sm font-bold text-brand-blue">
                  {service.offeringCount > 1 ? 'from ' : ''}
                  {formatRupees(service.fromPrice)}
                </span>
              </div>
            </div>
          ))}
        </div>
        </LoadingSection>
      </div>
    </div>
  );
};

export default AllApplianceServices;
