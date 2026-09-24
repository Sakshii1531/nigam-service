import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiRequest } from "../lib/apiClient";

// The old single-page booking screen took its price from the URL
// (`/booking?service=…&price=…`) and booked "category + service name" —
// both retired by the Master Catalogue (docs/master-catalogue Phase 4): a
// booking is now one catalogue offering, priced by the server.
//
// Until every link that still points here is re-pointed at the catalogue
// flow (Phase 6), this forwards to `/book/:category` when the service name
// names a category ("AC Repair" → AC), otherwise to the services list.
const Booking = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  useEffect(() => {
    const service = (params.get("service") || "").toLowerCase().trim();
    let alive = true;
    apiRequest("/catalog/categories", { silentError: true })
      .catch(() => [])
      .then((categories) => {
        if (!alive) return;
        const match = (Array.isArray(categories) ? categories : [])
          .filter((c) => service && (service.startsWith(c.key.toLowerCase()) || service.startsWith((c.name || "").toLowerCase())))
          .sort((a, b) => b.key.length - a.key.length)[0];
        navigate(match ? `/book/${encodeURIComponent(match.key)}` : "/services", { replace: true });
      });
    return () => {
      alive = false;
    };
  }, [params, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white gap-3">
      <div className="w-10 h-10 border-4 border-blue-200 border-t-brand-blue rounded-full animate-spin" />
      <p className="text-xs font-bold text-slate-500">Opening booking…</p>
    </div>
  );
};

export default Booking;
