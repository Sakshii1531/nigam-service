import { useEffect, useState } from "react";
import { apiRequest } from "../../lib/apiClient";

/**
 * Super-admin sets a service provider's service city directly (no request
 * needed). Any pending request from the provider is closed as superseded
 * server-side.
 */
export default function ChangeServiceCityModal({ provider, onClose, onChanged }) {
  const [cities, setCities] = useState([]);
  const [citiesError, setCitiesError] = useState("");
  const [cityId, setCityId] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    apiRequest("/super-admin/cities/public")
      .then((res) => {
        if (!cancelled) setCities(Array.isArray(res) ? res : []);
      })
      .catch((err) => {
        if (!cancelled) setCitiesError(err.message || "Could not load cities.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const options = cities.filter((c) => c.id !== provider.cityId);

  const save = async () => {
    if (!cityId) {
      setError("Choose the new service city.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await apiRequest(`/super-admin/service-providers/${provider.id}/city`, {
        method: "PATCH",
        auth: true,
        body: { cityId, ...(reason.trim() ? { reason: reason.trim() } : {}) },
      });
      onChanged(res?.serviceProvider);
    } catch (err) {
      setError(err.message || "Could not change the service city.");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4" onClick={() => !saving && onClose()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="change-city-title"
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
        <div>
          <h3 id="change-city-title" className="text-base font-bold text-[#1E293B]">
            Change service city
          </h3>
          <p className="text-sm text-slate-600 mt-1">
            {provider.name} currently serves <strong>{provider.city || "no city"}</strong>.
          </p>
          <p className="text-xs text-slate-500 mt-2">
            They start getting jobs from the new city immediately and are notified. Jobs already accepted are not affected.
          </p>
        </div>

        <label className="block">
          <span className="text-xs font-semibold text-slate-600">New service city</span>
          <select
            value={cityId}
            onChange={(e) => setCityId(e.target.value)}
            disabled={!cities.length}
            className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0D47A1]/20 focus:border-[#0D47A1]">
            <option value="">{cities.length ? "Select a city" : "Loading cities…"}</option>
            {options.map((c) => (
              <option key={c.id} value={c.id}>
                {[c.name, c.state].filter(Boolean).join(", ")}
              </option>
            ))}
          </select>
        </label>
        {citiesError && <p className="text-sm text-rose-600">{citiesError}</p>}

        <label className="block">
          <span className="text-xs font-semibold text-slate-600">Reason (optional, shown to the service provider)</span>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
            rows={3}
            className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D47A1]/20 focus:border-[#0D47A1]"
          />
        </label>

        {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 rounded-lg border border-[#E2E8F0] text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving || !cityId}
            className="px-4 py-2 rounded-lg bg-[#0D47A1] text-white text-sm font-semibold hover:bg-blue-800 disabled:opacity-60">
            {saving ? "Saving…" : "Change city"}
          </button>
        </div>
      </div>
    </div>
  );
}
