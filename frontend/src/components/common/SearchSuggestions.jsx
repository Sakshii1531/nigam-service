import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, TrendingUp } from 'lucide-react';
import { getPopularSearches } from '../../lib/catalogueApi';
import { readRecentSearches, rememberSearch } from '../../lib/recentSearches';

// Shown under an empty, focused search box: this device's recent searches and
// the most-booked services (GET /catalog/search/popular).
export default function SearchSuggestions({ onPick, className = '' }) {
  const navigate = useNavigate();
  const [popular, setPopular] = useState([]);
  const [recent] = useState(readRecentSearches);

  useEffect(() => {
    let alive = true;
    getPopularSearches()
      .then((list) => alive && setPopular(Array.isArray(list) ? list : []))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const go = (entry) => {
    rememberSearch(entry);
    onPick?.();
    navigate(entry.deepLink);
  };

  if (!recent.length && !popular.length) return null;
  const chip = 'inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:border-brand-blue hover:text-brand-blue cursor-pointer';

  return (
    <div className={`bg-white rounded-2xl border border-slate-200 p-4 space-y-3 ${className}`} aria-label="Search suggestions">
      {recent.length > 0 && (
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1">
            <Clock className="h-3 w-3" /> Recent
          </p>
          <div className="flex flex-wrap gap-2">
            {recent.map((r) => (
              <button key={r.deepLink} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => go(r)} className={chip}>
                {r.label}
              </button>
            ))}
          </div>
        </div>
      )}
      {popular.length > 0 && (
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1">
            <TrendingUp className="h-3 w-3" /> Popular
          </p>
          <div className="flex flex-wrap gap-2">
            {popular.map((p) => (
              <button key={p.deepLink} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => go(p)} className={chip}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
