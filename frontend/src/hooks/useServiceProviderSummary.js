import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../lib/apiClient';

/**
 * Real headline figures for the service provider (job counts, earnings,
 * customer rating). See job.service.js getJobSummary — `rating` and
 * `completionRate` are null until there is data behind them, so screens can
 * say "No ratings yet" instead of inventing a score.
 */
export function useServiceProviderSummary() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setSummary(await apiRequest('/service-provider/jobs/summary', { auth: true }));
    } catch (err) {
      console.warn('[service-provider summary]', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { summary, loading, refresh };
}
