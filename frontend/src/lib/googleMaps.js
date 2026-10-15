let mapsPromise;

export function loadGoogleMaps() {
  if (window.google?.maps?.Geocoder) return Promise.resolve(window.google.maps);
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!key) return Promise.reject(new Error('Google Maps is not configured. Enter your address manually or contact support.'));
  if (mapsPromise) return mapsPromise;
  mapsPromise = new Promise((resolve, reject) => {
    const callback = `__nccMaps${Date.now()}`;
    const script = document.createElement('script');
    const fail = () => {
      clearTimeout(timer); delete window[callback]; script.remove(); mapsPromise = null;
      reject(new Error('Google Maps could not load. Check the Maps API configuration or enter your address manually.'));
    };
    const timer = setTimeout(fail, 20000);
    window[callback] = () => {
      clearTimeout(timer); delete window[callback];
      if (window.google?.maps?.Geocoder) resolve(window.google.maps);
      else fail();
    };
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places&callback=${callback}&loading=async`;
    script.async = true; script.onerror = fail;
    document.head.appendChild(script);
  });
  return mapsPromise;
}

export function googleAddress(result) {
  const components = result.address_components || [];
  const get = type => components.find(component => component.types.includes(type))?.long_name || '';
  return {
    formattedAddress: result.formatted_address || '',
    house: [get('premise'), get('street_number'), get('route')].filter(Boolean).join(', '),
    area: get('sublocality_level_1') || get('sublocality') || get('neighborhood'),
    city: get('locality') || get('postal_town') || get('administrative_area_level_2'),
    state: get('administrative_area_level_1'),
    pincode: get('postal_code'),
  };
}

export async function reverseGeocodeCoordinates(latitude, longitude) {
  const maps = await loadGoogleMaps();
  return new Promise((resolve, reject) => {
    new maps.Geocoder().geocode({ location: { lat: latitude, lng: longitude } }, (results, status) => {
      if (status === 'OK' && results?.[0]) resolve(googleAddress(results[0]));
      else reject(new Error('Could not resolve this pin to an address. Check your city, state and pincode manually.'));
    });
  });
}

export function currentCoordinates() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('This browser does not support location. Choose a pin on the map.'));
    navigator.geolocation.getCurrentPosition(
      position => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      error => reject(new Error(error.code === 1 ? 'Location permission denied. Allow location in browser settings or select a map pin.' : 'Could not read your location. Try again outdoors or select a map pin.')),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  });
}
