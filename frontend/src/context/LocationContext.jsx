import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { getActiveCities, isCityServiceable } from "../utils/serviceableCities";

const LocationContext = createContext(null);

export const useLocationContext = () => {
  const ctx = useContext(LocationContext);
  if (!ctx) {
    throw new Error(
      "useLocationContext must be used within a LocationProvider",
    );
  }
  return ctx;
};

// Major Indian cities for search / outside coverage demo
export const POPULAR_CITIES = [
  { name: "Delhi NCR", state: "Delhi" },
  { name: "New Delhi", state: "Delhi" },
  { name: "Lucknow", state: "Uttar Pradesh" },
  { name: "Noida", state: "Uttar Pradesh" },
  { name: "Gurgaon", state: "Haryana" },
  { name: "Mumbai", state: "Maharashtra" },
  { name: "Bengaluru", state: "Karnataka" },
  { name: "Kanpur", state: "Uttar Pradesh" },
  { name: "Indore", state: "Madhya Pradesh" },
  { name: "Jaipur", state: "Rajasthan" },
  { name: "Chandigarh", state: "Punjab" },
  { name: "Bhopal", state: "Madhya Pradesh" },
  { name: "Patna", state: "Bihar" },
  { name: "Ahmedabad", state: "Gujarat" },
  { name: "Kolkata", state: "West Bengal" },
  { name: "Pune", state: "Maharashtra" },
  { name: "Hyderabad", state: "Telangana" },
  { name: "Chennai", state: "Tamil Nadu" },
];

export const LocationProvider = ({ children }) => {
  const navigate = useNavigate();
  const routerLocation = useLocation();
  const { user, updateUser } = useAuth();

  const [activeCities, setActiveCities] = useState([]);
  const [loadingCities, setLoadingCities] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [locationError, setLocationError] = useState("");

  // Determine initial location from saved localStorage or user default address
  const [currentLocation, setCurrentLocation] = useState(() => {
    try {
      const saved = localStorage.getItem("ncc_customer_location");
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {
      city: "Delhi",
      state: "Delhi",
      area: "Civil Lines",
      fullAddress: "Civil Lines, Delhi",
      isServiceable: true,
      latitude: null,
      longitude: null,
    };
  });

  // Fetch operational cities from public endpoint
  const refreshActiveCities = useCallback(async () => {
    try {
      setLoadingCities(true);
      const cities = await getActiveCities();
      setActiveCities(cities);
      return cities;
    } catch (err) {
      console.warn("[LocationContext] Error fetching cities:", err);
      return [];
    } finally {
      setLoadingCities(false);
    }
  }, []);

  useEffect(() => {
    refreshActiveCities();
  }, [refreshActiveCities]);

  // Sync with user's primary address when authenticated
  useEffect(() => {
    if (user && user.role === "customer") {
      const defaultAddr =
        user.addresses?.find((a) => a?.isDefault) || user.addresses?.[0];
      const userCity = user.city || defaultAddr?.city;
      if (
        userCity &&
        (!currentLocation.city || currentLocation.city === "Delhi")
      ) {
        const fullAddr = defaultAddr?.house
          ? `${defaultAddr.house}, ${userCity}`
          : defaultAddr?.landmark
            ? `${defaultAddr.landmark}, ${userCity}`
            : `${userCity}${defaultAddr?.state ? ", " + defaultAddr.state : ""}`;

        const serviceable = isCityServiceable(userCity, activeCities);
        const updated = {
          city: userCity,
          state: defaultAddr?.state || user.state || "",
          area: defaultAddr?.landmark || defaultAddr?.house || "",
          fullAddress: fullAddr,
          isServiceable: serviceable,
          latitude: defaultAddr?.latitude || null,
          longitude: defaultAddr?.longitude || null,
        };
        setCurrentLocation(updated);
        localStorage.setItem("ncc_customer_location", JSON.stringify(updated));
        localStorage.setItem("ncc_customer_city", userCity);
      }
    }
  }, [user, activeCities]);

  // Reverse geocode latitude and longitude to address & city
  const reverseGeocode = async (lat, lon) => {
    let resolvedCity = "";
    let resolvedState = "";
    let resolvedArea = "";
    let resolvedAddress = "";

    // 1. Google Maps Geocoding if key configured
    const gKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (gKey) {
      try {
        const res = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${gKey}`,
        );
        const data = await res.json();
        if (data.status === "OK" && data.results?.[0]) {
          const result = data.results[0];
          resolvedAddress = result.formatted_address || "";
          for (const comp of result.address_components) {
            if (
              comp.types.includes("sublocality") ||
              comp.types.includes("neighborhood")
            ) {
              resolvedArea = comp.long_name;
            }
            if (
              comp.types.includes("locality") ||
              comp.types.includes("administrative_area_level_2")
            ) {
              if (!resolvedCity) resolvedCity = comp.long_name;
            }
            if (comp.types.includes("administrative_area_level_1")) {
              resolvedState = comp.long_name;
            }
          }
        }
      } catch (err) {
        console.warn("[geocode:google] Failed:", err);
      }
    }

    // 2. OpenStreetMap Nominatim fallback
    if (!resolvedCity) {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
        );
        const data = await res.json();
        if (data && data.address) {
          resolvedAddress = data.display_name || "";
          resolvedCity =
            data.address.city ||
            data.address.town ||
            data.address.district ||
            data.address.state_district ||
            data.address.county ||
            "";
          resolvedState = data.address.state || "";
          resolvedArea =
            data.address.suburb ||
            data.address.neighbourhood ||
            data.address.residential ||
            data.address.road ||
            "";
        }
      } catch (err) {
        console.warn("[geocode:nominatim] Failed:", err);
      }
    }

    return {
      city: resolvedCity || "Unknown City",
      state: resolvedState || "",
      area: resolvedArea || "",
      fullAddress:
        resolvedAddress ||
        `${resolvedCity || "Location"}, ${resolvedState || ""}`.trim(),
    };
  };

  /**
   * Select a city directly (from list or search)
   */
  const selectCity = useCallback(
    async (cityInput, stateInput = "", customArea = "") => {
      setLocationError("");
      const cityName =
        typeof cityInput === "string"
          ? cityInput.trim()
          : (cityInput?.name || "").trim();
      const stateName =
        typeof cityInput === "object"
          ? cityInput.state || stateInput
          : stateInput;

      if (!cityName) return;

      const cities =
        activeCities.length > 0 ? activeCities : await getActiveCities();
      const serviceable = isCityServiceable(cityName, cities);

      const areaText = customArea || "";
      const fullText = areaText
        ? `${areaText}, ${cityName}`
        : stateName
          ? `${cityName}, ${stateName}`
          : cityName;

      const updated = {
        city: cityName,
        state: stateName,
        area: areaText,
        fullAddress: fullText,
        isServiceable: serviceable,
        latitude: null,
        longitude: null,
      };

      setCurrentLocation(updated);
      localStorage.setItem("ncc_customer_location", JSON.stringify(updated));
      localStorage.setItem("ncc_customer_city", cityName);

      // If user is authenticated, update primary city in profile
      if (user && user.role === "customer") {
        try {
          updateUser({ city: cityName, state: stateName });
        } catch {
          // ignore
        }
      }

      setIsModalOpen(false);

      if (!serviceable) {
        if (routerLocation.pathname !== "/area-not-serviceable") {
          navigate("/area-not-serviceable", { replace: true });
        }
      } else {
        if (routerLocation.pathname === "/area-not-serviceable") {
          navigate("/dashboard", { replace: true });
        }
      }

      return { success: true, isServiceable: serviceable, city: cityName };
    },
    [activeCities, navigate, routerLocation.pathname, user, updateUser],
  );

  /**
   * Select an existing user saved address
   */
  const selectAddress = useCallback(
    async (address) => {
      if (!address || !address.city) return;
      const customArea = address.landmark || address.house || "";
      return selectCity(address.city, address.state || "", customArea);
    },
    [selectCity],
  );

  /**
   * Detect user's current GPS location via browser navigator.geolocation
   */
  const detectCurrentLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      return { success: false, error: "Geolocation not supported" };
    }

    setDetectingLocation(true);
    setLocationError("");

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            const geocoded = await reverseGeocode(latitude, longitude);
            const cities =
              activeCities.length > 0 ? activeCities : await getActiveCities();
            const serviceable = isCityServiceable(geocoded.city, cities);

            const updated = {
              city: geocoded.city,
              state: geocoded.state,
              area: geocoded.area,
              fullAddress: geocoded.area
                ? `${geocoded.area}, ${geocoded.city}`
                : geocoded.city,
              isServiceable: serviceable,
              latitude,
              longitude,
            };

            setCurrentLocation(updated);
            localStorage.setItem(
              "ncc_customer_location",
              JSON.stringify(updated),
            );
            localStorage.setItem("ncc_customer_city", geocoded.city);

            if (user && user.role === "customer") {
              try {
                updateUser({ city: geocoded.city, state: geocoded.state });
              } catch {
                // ignore
              }
            }

            setIsModalOpen(false);
            setDetectingLocation(false);

            if (!serviceable) {
              if (routerLocation.pathname !== "/area-not-serviceable") {
                navigate("/area-not-serviceable", { replace: true });
              }
            } else {
              if (routerLocation.pathname === "/area-not-serviceable") {
                navigate("/dashboard", { replace: true });
              }
            }

            resolve({
              success: true,
              isServiceable: serviceable,
              city: geocoded.city,
            });
          } catch (err) {
            console.error(
              "[LocationContext] Geolocation processing error:",
              err,
            );
            setLocationError(
              "Could not decode your location. Please select your city manually.",
            );
            setDetectingLocation(false);
            resolve({ success: false, error: err.message });
          }
        },
        (error) => {
          let msg = "Unable to retrieve location.";
          if (error.code === error.PERMISSION_DENIED) {
            msg =
              "Location access was denied. Please allow location permissions or choose your city below.";
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            msg =
              "Location position unavailable. Please choose your city from the list.";
          } else if (error.code === error.TIMEOUT) {
            msg =
              "Location request timed out. Please try again or select your city.";
          }
          setLocationError(msg);
          setDetectingLocation(false);
          resolve({ success: false, error: msg });
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
      );
    });
  }, [activeCities, navigate, routerLocation.pathname, user, updateUser]);

  const openLocationModal = () => {
    setLocationError("");
    setIsModalOpen(true);
  };

  const closeLocationModal = () => {
    setIsModalOpen(false);
    setLocationError("");
  };

  return (
    <LocationContext.Provider
      value={{
        currentLocation,
        activeCities,
        loadingCities,
        isModalOpen,
        detectingLocation,
        locationError,
        openLocationModal,
        closeLocationModal,
        detectCurrentLocation,
        selectCity,
        selectAddress,
        refreshActiveCities,
      }}>
      {children}
    </LocationContext.Provider>
  );
};
