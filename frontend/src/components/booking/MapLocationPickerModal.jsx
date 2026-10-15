import { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Navigation, Search, Check, X, Loader2, AlertCircle } from 'lucide-react';

import { loadGoogleMaps, googleAddress, currentCoordinates } from '../../lib/googleMaps';

const DEFAULT_CENTER = { lat: 28.6139, lng: 77.2090 }; // New Delhi default

const MapLocationPickerModal = ({
  isOpen,
  onClose,
  onSelectLocation,
  initialCoordinates = null,
  initialCity = '',
}) => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const searchInputRef = useRef(null);
  const geocoderRef = useRef(null);

  const [loadingMap, setLoadingMap] = useState(true);
  const [mapError, setMapError] = useState(false);
  const [detectingGps, setDetectingGps] = useState(false);
  const [selectedCoords, setSelectedCoords] = useState(initialCoordinates || DEFAULT_CENTER);
  const [detectedAddress, setDetectedAddress] = useState('');
  const [geocodedDetails, setGeocodedDetails] = useState(null);
  const [hasSelection, setHasSelection] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [locationError, setLocationError] = useState('');
  const geocodeSequence = useRef(0);

  // Reverse geocode lat/lng to readable address
  const reverseGeocode = useCallback((lat, lng) => {
    const sequence = ++geocodeSequence.current;
    setGeocodedDetails(null);
    setDetectedAddress('');
    if (!geocoderRef.current) return;
    setGeocoding(true);
    geocoderRef.current.geocode({ location: { lat, lng } }, (results, status) => {
      if (sequence !== geocodeSequence.current) return;
      setGeocoding(false);
      if (status === 'OK' && results?.[0]) {
        const details = googleAddress(results[0]);
        setDetectedAddress(details.formattedAddress);
        setGeocodedDetails(details);
        setLocationError('');
      } else {
        setDetectedAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        setLocationError('Address lookup failed. Coordinates are captured; check the address fields manually.');
      }
    });
  }, []);

  // Update pin position and geocode
  const updatePin = useCallback((lat, lng, panTo = true) => {
    setSelectedCoords({ lat, lng });
    setHasSelection(true);
    if (markerRef.current) {
      markerRef.current.setPosition({ lat, lng });
    }
    if (panTo && mapInstanceRef.current) {
      mapInstanceRef.current.panTo({ lat, lng });
    }
    reverseGeocode(lat, lng);
  }, [reverseGeocode]);

  // Request GPS coordinates
  const handleUseCurrentGps = async () => {
    setDetectingGps(true); setLocationError('');
    try {
      const { latitude, longitude } = await currentCoordinates();
      updatePin(latitude, longitude, true);
      mapInstanceRef.current?.setZoom(17);
    } catch (error) { setLocationError(error.message); }
    finally { setDetectingGps(false); }
  };

  // Initialize Map
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setLoadingMap(true);
    setMapError(false);
    setHasSelection(false); setGeocoding(false); setGeocodedDetails(null); setDetectedAddress(''); setLocationError('');

    loadGoogleMaps()
      .then((gMaps) => {
        if (!isMounted || !mapContainerRef.current) return;

        geocoderRef.current = new gMaps.Geocoder();

        const startPos = initialCoordinates?.lat != null && initialCoordinates?.lng != null
          ? { lat: Number(initialCoordinates.lat), lng: Number(initialCoordinates.lng) }
          : DEFAULT_CENTER;

        const map = new gMaps.Map(mapContainerRef.current, {
          center: startPos,
          zoom: 16,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          zoomControl: true,
        });
        mapInstanceRef.current = map;

        const marker = new gMaps.Marker({
          position: startPos,
          map,
          draggable: true,
          animation: gMaps.Animation.DROP,
          title: 'Drag to adjust exact location',
        });
        markerRef.current = marker;

        setSelectedCoords(startPos);
        if (initialCoordinates?.lat != null && initialCoordinates?.lng != null) {
          setHasSelection(true); reverseGeocode(startPos.lat, startPos.lng);
        } else if (initialCity) {
          geocoderRef.current.geocode({ address: `${initialCity}, India` }, (results, status) => {
            if (isMounted && status === 'OK' && results?.[0]?.geometry?.location) map.setCenter(results[0].geometry.location);
          });
        }

        // Marker drag end listener
        marker.addListener('dragend', () => {
          const pos = marker.getPosition();
          if (pos) {
            updatePin(pos.lat(), pos.lng(), false);
          }
        });

        // Map click listener
        map.addListener('click', (e) => {
          if (e.latLng) {
            updatePin(e.latLng.lat(), e.latLng.lng(), true);
          }
        });

        // Search Autocomplete
        if (searchInputRef.current && gMaps.places) {
          const autocomplete = new gMaps.places.Autocomplete(searchInputRef.current, {
            types: ['geocode', 'establishment'],
            componentRestrictions: { country: 'in' },
          });
          autocomplete.bindTo('bounds', map);
          autocomplete.addListener('place_changed', () => {
            const place = autocomplete.getPlace();
            if (place.geometry?.location) {
              const loc = place.geometry.location;
              map.setCenter(loc);
              map.setZoom(17);
              updatePin(loc.lat(), loc.lng(), true);
            }
          });
        }

        setLoadingMap(false);
      })
      .catch((err) => {
        console.error('[MapPicker] Failed to load Google Maps:', err);
        if (isMounted) {
          setMapError(true);
          setLoadingMap(false);
        }
      });

    return () => {
      isMounted = false; ++geocodeSequence.current;
      if (window.google?.maps?.event) {
        if (markerRef.current) window.google.maps.event.clearInstanceListeners(markerRef.current);
        if (mapInstanceRef.current) window.google.maps.event.clearInstanceListeners(mapInstanceRef.current);
      }
      mapInstanceRef.current = null;
      markerRef.current = null;
    };
  }, [isOpen, initialCoordinates, initialCity, reverseGeocode, updatePin]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!hasSelection || geocoding || detectingGps) return;
    onSelectLocation({
      latitude: selectedCoords.lat,
      longitude: selectedCoords.lng,
      addressDetails: geocodedDetails,
      formattedAddress: detectedAddress,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[120] bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4 animate-fade-in">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full sm:max-w-2xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200/60 text-brand-blue flex items-center justify-center shadow-xs">
              <MapPin className="w-5 h-5 text-brand-blue" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                Pin Your Exact Service Location
              </h3>
              <p className="text-[11px] text-slate-500">
                Helps the verified technician navigate directly to your doorstep
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & GPS Toolbar */}
        <div className="p-3 bg-slate-50/80 border-b border-slate-200/80 flex items-center gap-2 shrink-0">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search apartment, street, or area..."
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-blue shadow-xs"
            />
          </div>
          <button
            type="button"
            onClick={handleUseCurrentGps}
            disabled={detectingGps}
            className="px-3.5 py-2 bg-brand-blue hover:bg-[#083679] text-white text-xs font-extrabold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors shrink-0 cursor-pointer disabled:opacity-60"
            title="Use device GPS location"
          >
            {detectingGps ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span className="hidden sm:inline">Locating...</span>
              </>
            ) : (
              <>
                <Navigation className="w-3.5 h-3.5" />
                <span>Use Current Location</span>
              </>
            )}
          </button>
        </div>

        {/* Map Container Area */}
        <div className="relative flex-1 min-h-80 sm:min-h-95 bg-slate-100 overflow-hidden">
          {loadingMap && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-xs z-10 flex flex-col items-center justify-center gap-2 text-slate-600">
              <Loader2 className="w-8 h-8 animate-spin text-brand-blue" />
              <span className="text-xs font-bold">Loading interactive map...</span>
            </div>
          )}

          {mapError ? (
            <div className="absolute inset-0 p-6 flex flex-col items-center justify-center text-center bg-rose-50/50">
              <AlertCircle className="w-10 h-10 text-rose-500 mb-2" />
              <h4 className="text-sm font-black text-slate-800">Map Service Offline</h4>
              <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">
                You can still use your device GPS coordinates or enter your address details directly.
              </p>
              <button
                type="button"
                onClick={handleUseCurrentGps}
                className="px-4 py-2 bg-brand-blue text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <Navigation className="w-4 h-4" /> Use Device GPS Location
              </button>
            </div>
          ) : (
            <div ref={mapContainerRef} className="w-full h-full min-h-80 sm:min-h-95" />
          )}

          {/* Floating Instructions Pill */}
          {!mapError && !loadingMap && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-200/80 shadow-md text-[11px] font-bold text-slate-700 flex items-center gap-1.5 pointer-events-none">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              Click or drag the red pin to set your exact location
            </div>
          )}
        </div>

        {locationError && <p role="alert" className="px-4 py-2 text-xs text-red-700">{locationError}</p>}
        {/* Footer Summary & Confirm */}
        <div className="p-4 sm:p-5 bg-white border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <span>Selected Coordinates:</span>
              <span className="font-mono text-slate-700 font-extrabold">
                {selectedCoords.lat.toFixed(5)}, {selectedCoords.lng.toFixed(5)}
              </span>
            </div>
            <p className="text-xs font-bold text-slate-800 truncate mt-0.5" title={detectedAddress}>
              {detectedAddress || 'Pin dropped on map'}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!hasSelection || geocoding || detectingGps || loadingMap}
              className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-brand-blue hover:bg-[#083679] text-white text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-colors"
            >
              <Check className="w-4 h-4" />
              {geocoding ? 'Resolving address…' : 'Confirm & Pin Location'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapLocationPickerModal;
