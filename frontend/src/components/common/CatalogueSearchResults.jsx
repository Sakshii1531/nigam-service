import { useNavigate } from 'react-router-dom';
import { ChevronRight, LifeBuoy, Search } from 'lucide-react';
import { formatRupees } from '../../lib/catalogueApi';
import { rememberSearch } from '../../lib/recentSearches';

// Search results from the Master Catalogue: each row is a bookable service
// (grouped across sizes) with its "from" price, opening the booking flow
// already on that selection. Prices are before GST, as on the booking screen.
export default function CatalogueSearchResults({ query, results, loading, onPick, className = '' }) {
  const navigate = useNavigate();
  const go = (link, label) => {
    if (label) rememberSearch({ label, deepLink: link });
    onPick?.();
    navigate(link);
  };
  const groups = results?.groups || [];
  const categories = (results?.categories || []).filter((c) => !groups.some((g) => g.deepLink === c.deepLink));

  if (!results || (loading && !groups.length && !categories.length)) {
    return (
      <div className={`bg-white rounded-2xl border border-slate-200 p-4 text-xs font-semibold text-slate-500 ${className}`}>
        Searching…
      </div>
    );
  }

  if (!groups.length && !categories.length) {
    return (
      <div className={`bg-white rounded-2xl border border-slate-200 p-5 text-center ${className}`}>
        <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-2 text-slate-400">
          <Search className="h-5 w-5" />
        </div>
        <p className="text-sm font-bold text-slate-800">No services found for “{query.trim()}”</p>
        <p className="text-xs text-slate-500 mt-1">Try another word — like “AC”, “fan” or “tank cleaning” — or ask us.</p>
        <button
          type="button"
          onClick={() => go('/help-support')}
          className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-brand-blue text-white text-xs font-bold rounded-xl hover:bg-blue-800 cursor-pointer"
        >
          <LifeBuoy className="h-3.5 w-3.5" /> Help &amp; Support
        </button>
      </div>
    );
  }

  return (
    <div
      className={`bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden ${loading ? 'opacity-60' : ''} ${className}`}
      role="listbox"
      aria-label="Search results"
    >
      {results.didYouMean && (
        <p className="px-4 py-2 text-[11px] text-slate-500 bg-slate-50">
          Showing results for <span className="font-bold text-slate-700">{results.didYouMean}</span>
        </p>
      )}
      {categories.map((c) => (
        <button
          key={c.deepLink}
          type="button"
          role="option"
          aria-selected="false"
          onClick={() => go(c.deepLink, c.name)}
          className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50 cursor-pointer"
        >
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-800 truncate">{c.name}</p>
            <p className="text-[11px] text-slate-500">All {c.name} services</p>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
        </button>
      ))}
      {groups.map((g) => (
        <button
          key={g.deepLink}
          type="button"
          role="option"
          aria-selected="false"
          onClick={() => go(g.deepLink, g.title)}
          className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50 cursor-pointer"
        >
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-800 truncate">{g.title}</p>
            <p className="text-[11px] text-slate-500 truncate">
              {g.category.name}
              {g.offeringCount > 1 ? ` · ${g.offeringCount} options` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-black text-brand-blue">
              {g.offeringCount > 1 ? 'from ' : ''}
              {formatRupees(g.fromPrice)}
            </span>
            <ChevronRight className="h-4 w-4 text-slate-400" />
          </div>
        </button>
      ))}
    </div>
  );
}
