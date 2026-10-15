import { useEffect, useMemo, useRef, useState } from 'react';
import { MapPin, Navigation } from 'lucide-react';
import { getActiveCities } from '../../utils/serviceableCities';
import { normalizeStateName } from '../../utils/indiaGeoData';
import { currentCoordinates, reverseGeocodeCoordinates } from '../../lib/googleMaps';
import MapLocationPickerModal from './MapLocationPickerModal';

const normalize = value => String(value || '').trim().toLowerCase();
const cityKey = value => ({ bangalore: 'bengaluru', bombay: 'mumbai', 'new delhi': 'delhi' })[normalize(value)] || normalize(value);
const input = 'w-full border border-slate-300 rounded-xl p-3 text-sm bg-white';

/** Shared saved-address and warranty visit location fields. No fabricated GPS. */
export default function AddressLocationFields({ value, onChange, onValidityChange, idPrefix = 'address' }) {
  const [cities, setCities] = useState([]), [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [mapOpen, setMapOpen] = useState(false);
  const cityInput = useRef(null);
  useEffect(() => {
    let active = true;
    getActiveCities({ allowFallback: false }).then(items => { if (active) setCities(items); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const states = [...new Set(cities.map(city => city.state).filter(Boolean))].sort();
  const selectedState = normalizeStateName(value.state || '');
  const matchesCity = city => cityKey(city.name) === cityKey(value.city) && normalize(city.state) === normalize(selectedState);
  const matched = cities.find(matchesCity);
  useEffect(() => { onValidityChange?.(!loading && !busy && Boolean(matched)); }, [loading, busy, matched, onValidityChange]);
  useEffect(() => {
    cityInput.current?.setCustomValidity(busy ? 'Wait for location lookup to finish.' : value.city && !matched ? 'Select a serviceable city and state.' : '');
  }, [busy, value.city, matched]);
  const coordinates = useMemo(() => value.latitude != null && value.longitude != null
    ? { lat: Number(value.latitude), lng: Number(value.longitude) } : null, [value.latitude, value.longitude]);
  const applyLocation = (location, details) => {
    const state = normalizeStateName(details?.state || '');
    const city = cities.find(item => cityKey(item.name) === cityKey(details?.city) && normalize(item.state) === normalize(state));
    onChange({ ...value, latitude: location.latitude, longitude: location.longitude,
      city: city?.name || details?.city || '', state: city?.state || state,
      pincode: details?.pincode || '',
      house: details?.house || details?.formattedAddress?.slice(0, 200) || value.house || '',
      landmark: details?.area || value.landmark || '' });
    setError(details?.city && !city ? `${details.city}, ${state} is outside the configured service cities. Choose a supported visit location.` : !details ? 'Coordinates captured. Check the city, state, pincode and street address manually.' : '');
  };
  const useGps = async () => {
    setBusy(true); setError('');
    try {
      const position = await currentCoordinates();
      let details;
      try { details = await reverseGeocodeCoordinates(position.latitude, position.longitude); }
      catch { details = null; }
      applyLocation(position, details);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };
  return <div className="space-y-3">
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={useGps} disabled={busy || loading} className="inline-flex gap-2 items-center px-3 py-2 rounded-xl bg-blue-50 text-blue-800 font-semibold text-sm disabled:opacity-50"><Navigation size={16}/>{busy ? 'Detecting address…' : 'Use my live location'}</button>
      <button type="button" onClick={() => setMapOpen(true)} disabled={busy} className="inline-flex gap-2 items-center px-3 py-2 rounded-xl border text-sm"><MapPin size={16}/>Choose / drag map pin</button>
    </div>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {!loading && !cities.length && <p role="alert" className="text-sm text-red-700">Service cities could not be loaded. Ask NCC to configure active cities or retry after checking your connection.</p>}
    <div className="grid grid-cols-2 gap-3">
      <label htmlFor={`${idPrefix}-state`} className="text-sm font-semibold">State
        <select aria-label="State" id={`${idPrefix}-state`} required className={input} disabled={loading || busy} value={selectedState} onChange={event => { setError(''); onChange({ ...value, state: event.target.value, city: '', latitude: null, longitude: null }); }}>
          <option value="">{loading ? 'Loading service areas…' : 'Select state'}</option>
          {selectedState && !states.includes(selectedState) && <option value={selectedState}>{selectedState} (not serviceable)</option>}
          {states.map(state => <option key={state}>{state}</option>)}
        </select>
      </label>
      <label htmlFor={`${idPrefix}-city`} className="text-sm font-semibold">City
        <select aria-label="City" ref={cityInput} id={`${idPrefix}-city`} required className={input} disabled={loading || busy} value={value.city || ''} onChange={event => { setError(''); onChange({ ...value, city: event.target.value, latitude: null, longitude: null }); }}>
          <option value="">Select serviceable city</option>
          {value.city && !matched && <option value={value.city}>{value.city} (check service area)</option>}
          {cities.filter(city => normalize(city.state) === normalize(selectedState)).map(city => <option key={`${city.state}:${city.name}`} value={city.name}>{city.name}</option>)}
        </select>
      </label>
      <label htmlFor={`${idPrefix}-pincode`} className="text-sm font-semibold">Pincode
        <input aria-label="Pincode" id={`${idPrefix}-pincode`} required inputMode="numeric" pattern="\d{6}" maxLength={6} value={value.pincode || ''} onChange={event => onChange({ ...value, pincode: event.target.value })} className={input}/>
      </label>
    </div>
    <p className="text-xs text-slate-600">{coordinates ? `Visit pin: ${coordinates.lat.toFixed(6)}, ${coordinates.lng.toFixed(6)}` : 'No visit pin saved. Use live location or drag the map pin so the technician can navigate to your door.'}</p>
    <MapLocationPickerModal isOpen={mapOpen} onClose={() => setMapOpen(false)} initialCoordinates={coordinates} initialCity={value.city || ''} onSelectLocation={location => applyLocation(location, location.addressDetails)}/>
  </div>;
}
