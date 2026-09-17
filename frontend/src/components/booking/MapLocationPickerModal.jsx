import { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Navigation, Search, Check, X, Loader2, AlertCircle } from 'lucide-react';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

// Singleton loader for Google Maps JS API
let googleMapsPromise = null;
function loadGoogleMapsScript() {
  if (!GOOGLE_MAPS_API_KEY) return Promise.reject(new Error('No Google Maps API Key found'));
  if (window.google?.maps) return Promise.resolve(window.google.maps);
  if (!googleMapsPromise) {
    googleMapsPromise = new Promise((resolve, reject) => {
      const cbName = `__gmaps_cb_${Date.now()}`;
      window[cbName] = () => {
        delete window[cbName];
        resolve(window.google.maps);
      };
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&callback=${cbName}&loading=async`;
      script.async = true;
      script.defer = true;
      script.onerror = () => {
        googleMapsPromise = null;
        delete window[cbName];
        reject(new Error('Failed to load Google Maps script'));
      };
      document.head.appendChild(script);
    });
  }
  return googleMapsPromise;
}

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

  // Reverse geocode lat/lng to readable address
  const reverseGeocode = useCallback((lat, lng) => {
    if (!geocoderRef.current) return;
    geocoderRef.current.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === 'OK' && results?.[0]) {
        const res = results[0];
        setDetectedAddress(res.formatted_address);

        // Extract components
        const comps = res.address_components || [];
        const findComp = (type) => comps.find((c) => c.types.includes(type))?.long_name || '';

        const house = findComp('street_number') || findComp('premise') || findComp('subpremise') || '';
        const area = findComp('sublocality_level_1') || findComp('sublocality') || findComp('neighborhood') || findComp('route') || '';
        const city = findComp('locality') || findComp('administrative_area_level_2') || '';
        const state = findComp('administrative_area_level_1') || '';
        const pincode = findComp('postal_code') || '';

        setGeocodedDetails({
          formattedAddress: res.formatted_address,
          house,
          area,
          city,
          state,
          pincode,
        });
      } else {
        setDetectedAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      }
    });
  }, []);

  // Update pin position and geocode
  const updatePin = useCallback((lat, lng, panTo = true) => {
    setSelectedCoords({ lat, lng });
    if (markerRef.current) {
      markerRef.current.setPosition({ lat, lng });
    }
    if (panTo && mapInstanceRef.current) {
      mapInstanceRef.current.panTo({ lat, lng });
    }
    reverseGeocode(lat, lng);
  }, [reverseGeocode]);

  // Request GPS coordinates
  const handleUseCurrentGps = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setDetectingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        updatePin(latitude, longitude, true);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setZoom(17);
        }
        setDetectingGps(false);
      },
      (err) => {
        console.warn('[MapPicker] GPS error:', err.message);
        alert('Could not access current location. Please select your pin manually on the map.');
        setDetectingGps(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Initialize Map
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setLoadingMap(true);
    setMapError(false);

    loadGoogleMapsScript()
      .then((gMaps) => {
        if (!isMounted || !mapContainerRef.current) return;

        geocoderRef.current = new gMaps.Geocoder();

        const startPos = initialCoordinates?.lat && initialCoordinates?.lng
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

        // Geocode initial position
        reverseGeocode(startPos.lat, startPos.lng);

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
      isMounted = false;
      mapInstanceRef.current = null;
      markerRef.current = null;
    };
  }, [isOpen, initialCoordinates, reverseGeocode, updatePin]);

  if (!isOpen) return null;

  const handleConfirm = () => {
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
        <div className="relative flex-1 min-h-[320px] sm:min-h-[380px] bg-slate-100 overflow-hidden">
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
            <div ref={mapContainerRef} className="w-full h-full min-h-[320px] sm:min-h-[380px]" />
          )}

          {/* Floating Instructions Pill */}
          {!mapError && !loadingMap && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-200/80 shadow-md text-[11px] font-bold text-slate-700 flex items-center gap-1.5 pointer-events-none">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              Click or drag the red pin to set your exact location
            </div>
          )}
        </div>

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
              className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-brand-blue hover:bg-[#083679] text-white text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-colors"
            >
              <Check className="w-4 h-4" />
              Confirm & Pin Location
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapLocationPickerModal;
