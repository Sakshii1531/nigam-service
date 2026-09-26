import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import cleaningBathroom1 from '../assets/cleaning_bathroom_1.png';
import cleaningBathroom2 from '../assets/cleaning_bathroom_2.png';
import cleaningSofa from '../assets/cleaning_sofa.png';
import cleaningCarpet from '../assets/cleaning_carpet.png';
import cleaningKitchen from '../assets/cleaning_kitchen.png';
import { resolveLabels, formatRupees } from '../lib/catalogueApi';
import { useLocationContext } from '../context/LocationContext';
import { Skeleton } from '../components/common/Skeleton';

// Curated cleaning tiles (artwork + title). Price and destination come from
// the Master Catalogue: a tile nothing bookable matches shows no price and
// opens the services list. (The old hardcoded prices and "% OFF" badges
// were never backed by a real rate or discount.)
const TILES = [
  { id: 1, title: 'Intense cleaning (2 bathrooms)', image: cleaningBathroom1 },
  { id: 2, title: 'Classic cleaning (2 bathrooms)', image: cleaningBathroom2 },
  { id: 3, title: 'Sofa Deep Cleaning', image: cleaningSofa },
  { id: 4, title: 'Carpet Cleaning', image: cleaningCarpet },
  { id: 5, title: 'Kitchen Deep Cleaning', image: cleaningKitchen },
];

const AllCleaningServices = () => {
  const navigate = useNavigate();

  const { currentLocation } = useLocationContext();
  const city = currentLocation?.city || '';
  const [matches, setMatches] = useState(null); // null = prices still loading
  useEffect(() => {
    let alive = true;
    resolveLabels(TILES.map((t) => t.title), { city: city || undefined })
      .then((rows) => alive && setMatches(Object.fromEntries(rows.map((r) => [r.label, r.match]))))
      .catch(() => alive && setMatches({}));
    return () => {
      alive = false;
    };
  }, [city]);

  return (
    <div className="min-h-screen bg-bg-light flex flex-col pb-20 lg:pb-8">
      {/* Header */}
      <div className="bg-[#E3ECF9] p-6 rounded-b-[30px] shadow-sm flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 bg-white rounded-full shadow-sm">
          <ArrowLeft className="h-5 w-5 text-brand-blue" />
        </button>
        <h1 className="text-xl font-bold text-text-primary">Cleaning Essentials</h1>
      </div>

      {/* Services Grid */}
      <div className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {TILES.map((service) => {
            const match = matches?.[service.title];
            return (
            <div 
              key={service.id}
              onClick={() => navigate(match?.deepLink || '/services')}
              className="flex flex-col gap-2 cursor-pointer border border-border-color rounded-2xl p-2 bg-white hover:border-brand-blue transition-all"
            >
              <div className="w-full h-32 bg-white rounded-xl flex items-center justify-center overflow-hidden relative">
                <img src={service.image} alt={service.title} className="w-full h-full object-cover" />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold text-text-primary truncate">
                  {service.title}
                </span>
                {matches === null ? (
                  <Skeleton className="h-4 w-20" />
                ) : match?.fromPrice != null && (
                  <span className="text-sm font-bold text-brand-blue">from {formatRupees(match.fromPrice)}</span>
                )}
              </div>
            </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AllCleaningServices;
