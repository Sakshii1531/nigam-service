import { apiRequest } from '../lib/apiClient';
import { normalizeStateName } from './indiaGeoData';

// Base fallback list of active operational cities in case of network latency
export const DEFAULT_SERVICEABLE_CITIES = [
  'Lucknow',
  'New Delhi',
  'Delhi',
  'Delhi NCR',
  'Noida',
  'Gurgaon',
  'Ghaziabad',
  'Faridabad',
  'Mumbai',
  'Bengaluru',
  'Bangalore',
  'Kanpur',
  'Indore'
];

let cachedCities = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 60 * 1000; // 1 minute cache

/**
 * Fetch the active operational cities from the public endpoint
 */
export async function getActiveCities() {
  const now = Date.now();
  if (cachedCities && now - lastFetchTime < CACHE_TTL_MS) {
    return cachedCities;
  }

  try {
    const data = await apiRequest('/super-admin/cities/public');
    if (Array.isArray(data) && data.length > 0) {
      cachedCities = data
        .filter(c => c?.status === 'Active' || !c?.status)
        .map(c => ({
          name: c.name?.trim() || '',
          state: normalizeStateName(c.state?.trim() || ''),
          cityId: c.cityId || ''
        }))
        .filter(c => Boolean(c.name));
      lastFetchTime = now;
      return cachedCities;
    }
  } catch (err) {
    console.warn('[serviceableCities] Failed to load active cities from API, using fallback:', err);
  }

  // Fallback
  return DEFAULT_SERVICEABLE_CITIES.map(name => ({ name, state: '' }));
}

/**
 * Check if a given city string is in the serviceable cities list.
 * Performs case-insensitive matching and handles standard aliases.
 */
export function isCityServiceable(cityName, activeCitiesList = []) {
  if (!cityName || typeof cityName !== 'string') return false;
  
  const cleanInput = cityName.trim().toLowerCase();
  if (!cleanInput) return false;

  // List of candidate city names from active cities or defaults
  const candidates = (activeCitiesList && activeCitiesList.length > 0 ? activeCitiesList : DEFAULT_SERVICEABLE_CITIES)
    .map(c => (typeof c === 'string' ? c : c.name || '').toLowerCase().trim())
    .filter(Boolean);

  // Direct match
  if (candidates.includes(cleanInput)) return true;

  // Alias & substring match (e.g. "Delhi NCR" vs "Delhi", "Bengaluru" vs "Bangalore")
  const aliasMap = {
    'delhi': ['delhi ncr', 'new delhi', 'noida', 'gurgaon', 'ghaziabad', 'faridabad'],
    'delhi ncr': ['delhi', 'new delhi', 'noida', 'gurgaon', 'ghaziabad', 'faridabad'],
    'new delhi': ['delhi', 'delhi ncr'],
    'bengaluru': ['bangalore'],
    'bangalore': ['bengaluru'],
    'mumbai': ['bombay', 'thane', 'navi mumbai'],
    'kolkata': ['calcutta'],
    'chennai': ['madras']
  };

  const aliases = aliasMap[cleanInput] || [];
  for (const alias of aliases) {
    if (candidates.includes(alias)) return true;
  }

  for (const cand of candidates) {
    if (cand.includes(cleanInput) || cleanInput.includes(cand)) {
      return true;
    }
  }

  return false;
}
