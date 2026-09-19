import { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../lib/apiClient';
import Footer from '../components/layout/Footer';
import CustomerBottomNav from '../components/CustomerBottomNav';

// Category-first browsing: pick a serviceable category here, then the
// existing /book/:category flow lists the real services under it. This
// used to be a flat grid of 12 hardcoded, mostly-fake cards ("Women Salon",
// "Electrician Service", "WM Complete Checkup" — none of them real
// categories or services), so most taps either mis-guessed a category from
// the title or fell through to a booking page with a fabricated price.
const AllServices = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiRequest('/catalog/categories')
      .then((res) => setCategories(Array.isArray(res) ? res : []))
      .catch((err) => setError(err.message || 'Could not load categories.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-bg-light flex flex-col pb-20 lg:pb-12">
      {/* Top Header */}
      <div className="bg-[#E3ECF9] p-6 lg:py-8 rounded-b-[30px] shadow-sm flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2.5 bg-white rounded-full shadow-sm hover:shadow-md transition-all active:scale-95 cursor-pointer">
          <ArrowLeft className="h-5 w-5 text-brand-blue" />
        </button>
        <div>
          <h1 className="text-xl lg:text-3xl font-black text-text-primary">Service Categories</h1>
          <p className="text-xs lg:text-sm text-text-secondary mt-0.5">Pick a category to see its services & pricing</p>
        </div>
      </div>

      {/* Category Grid */}
      <div className="p-6 md:p-10 lg:px-16 xl:px-20 max-w-screen-2xl mx-auto w-full flex-1 mt-4">
        {loading ? (
          <p className="text-sm text-text-secondary text-center py-10">Loading categories…</p>
        ) : error ? (
          <p className="text-sm text-rose-600 text-center py-10">{error}</p>
        ) : categories.length === 0 ? (
          <p className="text-sm text-text-secondary text-center py-10">No service categories are available right now.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
            {categories.map((cat) => {
              const emoji = cat.productTypes?.[0]?.icon || '🛠️';
              return (
                <button
                  key={cat.key}
                  onClick={() => navigate(`/book/${encodeURIComponent(cat.key)}`)}
                  className="flex flex-col items-center gap-2.5 cursor-pointer border border-border-color rounded-2xl p-4 md:p-5 bg-white hover:border-brand-blue hover:shadow-md transition-all text-center"
                >
                  <div
                    className="w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center text-2xl md:text-3xl flex-shrink-0"
                    style={{ backgroundColor: cat.lightBg || '#EAF4FF' }}
                  >
                    {emoji}
                  </div>
                  <span className="text-sm md:text-base font-semibold text-text-primary">{cat.name}</span>
                  <span className="text-[11px] text-text-secondary">
                    {cat.services?.length || 0} service{cat.services?.length === 1 ? '' : 's'}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Navigation — mobile only */}
      <CustomerBottomNav />

      {/* Desktop Footer */}
      <Footer />
    </div>
  );
};

export default AllServices;
