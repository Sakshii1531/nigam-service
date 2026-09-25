import { useEffect, useState } from 'react';
import { searchCatalogue } from './catalogueApi';

// Debounced customer search over the Master Catalogue (GET /catalog/search).
// Returns { results, loading } for the current query; results is null until
// the query has at least two characters, and always answers the latest query
// (a slow response to an older query is dropped).
export function useCatalogueSearch(query, { city, delay = 250 } = {}) {
  const q = query.trim();
  const active = q.length >= 2;
  const [state, setState] = useState({ q: '', results: null });

  useEffect(() => {
    if (!active) return undefined;
    let alive = true;
    const timer = setTimeout(() => {
      searchCatalogue(q, { city: city || undefined })
        .then((results) => alive && setState({ q, results }))
        .catch(() => alive && setState({ q, results: { query: q, groups: [], categories: [] } }));
    }, delay);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [q, active, city, delay]);

  if (!active) return { results: null, loading: false };
  // While a new query is in flight the previous results stay (dimmed by the caller).
  return { results: state.results, loading: state.q !== q };
}
