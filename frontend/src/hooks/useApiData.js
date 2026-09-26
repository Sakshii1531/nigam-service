import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * One section's data, loaded on its own so a page can show each section the
 * moment its request finishes (skeletons stay only where data is pending).
 *
 *   const offers = useApiData(() => apiRequest('/coupons'), []);
 *   <LoadingSection loading={offers.loading} skeleton={<SkeletonList />}>…
 *
 * `loading` is true only until the first answer (or error) — a later
 * `reload()` keeps showing the current data instead of flashing skeletons.
 * Pass `enabled: false` to wait (e.g. until an id or the user is known).
 */
export function useApiData(loader, deps = [], { initial = null, enabled = true } = {}) {
  const [state, setState] = useState({ data: initial, loading: enabled, error: null });
  const loaderRef = useRef(loader);
  loaderRef.current = loader;
  const runId = useRef(0);

  const run = useCallback(async () => {
    const id = ++runId.current;
    try {
      const data = await loaderRef.current();
      if (id === runId.current) setState({ data, loading: false, error: null });
    } catch (error) {
      if (id === runId.current) setState((s) => ({ data: s.data ?? initial, loading: false, error }));
    }
    // `initial` is a default, not a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;
    run();
    return () => {
      runId.current += 1; // ignore answers for an unmounted / superseded load
    };
    // The caller's deps decide when to load again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps]);

  const setData = useCallback((updater) => setState((s) => ({ ...s, data: typeof updater === 'function' ? updater(s.data) : updater })), []);
  return { ...state, reload: run, setData };
}
