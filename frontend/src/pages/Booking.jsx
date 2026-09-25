import { useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { getOffering, resolveLabels } from "../lib/catalogueApi";

// Redirect-only routes into the catalogue booking flow (docs/master-catalogue
// Phase 6). A booking is always one catalogue offering priced by the server,
// so nothing here carries a price.
//
//  /booking?service=AC%20Repair   old links (`&price=` is ignored) — the label
//                                 is resolved like a home tile's title
//  /book/o/:offeringCode          short link to one offering (CMS, share links)

function Redirecting() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white gap-3">
      <div className="w-10 h-10 border-4 border-blue-200 border-t-brand-blue rounded-full animate-spin" />
      <p className="text-xs font-bold text-slate-500">Opening booking…</p>
    </div>
  );
}

const Booking = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  useEffect(() => {
    const service = (params.get("service") || "").trim();
    let alive = true;
    (service ? resolveLabels([service]) : Promise.resolve([]))
      .catch(() => [])
      .then(([result] = []) => {
        if (alive) navigate(result?.match?.deepLink || "/services", { replace: true });
      });
    return () => {
      alive = false;
    };
  }, [params, navigate]);

  return <Redirecting />;
};

export function OfferingLink() {
  const navigate = useNavigate();
  const { offeringCode } = useParams();

  useEffect(() => {
    let alive = true;
    getOffering(offeringCode)
      .then((offering) => {
        if (!alive) return;
        navigate(`/book/${encodeURIComponent(offering.category.key)}?offering=${encodeURIComponent(offering.code)}`, { replace: true });
      })
      .catch(() => alive && navigate("/services", { replace: true }));
    return () => {
      alive = false;
    };
  }, [offeringCode, navigate]);

  return <Redirecting />;
}

export default Booking;
