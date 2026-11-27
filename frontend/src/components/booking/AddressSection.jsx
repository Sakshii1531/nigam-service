import { useState } from 'react';
import { Briefcase, Check, Crosshair, Home, Loader2, MapPin, Navigation, Pencil, Plus, X } from 'lucide-react';
import { apiRequest } from '../../lib/apiClient';
import { useAuth } from '../../context/AuthContext';
import { INDIAN_STATES } from '../../utils/indiaGeoData';

const TYPES = ['Home', 'Work', 'Other'];
const idOf = (a) => a?._id || a?.id || null;

/** A saved address in the shape the booking form uses. */
export function addressFromSaved(addr) {
  return {
    house: addr.house || '',
    area: addr.landmark || addr.area || '',
    city: addr.city || '',
    state: addr.state || '',
    pincode: addr.pincode || addr.house?.match(/\b\d{6}\b/)?.[0] || '',
    latitude: addr.latitude ?? null,
    longitude: addr.longitude ?? null,
  };
}

// The booking itself accepts an address without a pincode (BookingFlow's step-4
// check), but anything saved to the account must have one: the server fills a
// missing pincode with a placeholder, which would then look like real data.
function missingParts(a, { needPincode = true } = {}) {
  const missing = [];
  if (!a.house?.trim()) missing.push('house / flat');
  if (!a.city?.trim()) missing.push('city');
  if (!a.state?.trim()) missing.push('state');
  const pin = a.pincode?.trim() || '';
  if ((needPincode || pin) && !/^\d{6}$/.test(pin)) missing.push('6-digit pincode');
  return missing;
}

const field = 'w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[13px] font-semibold text-slate-900 placeholder-slate-400 focus:bg-white focus:border-brand-blue outline-none transition-all';

/**
 * Step 4's "Service Address": pick one of the customer's saved addresses, or add
 * (and optionally save) a new one without leaving the booking. The chosen
 * address lives in BookingFlow's `address` state; the map picker modal stays in
 * BookingFlow too (onOpenMap), writing its pin into that same state.
 */
export default function AddressSection({ address, setAddress, selectedAddrId, setSelectedAddrId, onOpenMap, stateForCity }) {
  const { user, updateUser } = useAuth();
  const saved = (user?.addresses || []).filter(Boolean);
  // 'list' = choosing a saved address; 'new' / 'edit' = the form.
  const [mode, setMode] = useState(saved.length ? 'list' : 'new');
  const [type, setType] = useState('Home');
  const [saveIt, setSaveIt] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [locating, setLocating] = useState(false);

  // Form edits clear the last 'please fill in' message.
  const edit = (fn) => {
    setError('');
    setAddress(fn);
  };

  const effectiveMode = mode === 'list' && !saved.length ? 'new' : mode;
  const pinned = address.latitude != null && address.longitude != null;

  const choose = (addr) => {
    setSelectedAddrId(idOf(addr));
    setAddress(addressFromSaved(addr));
  };

  // The saved address chosen before opening the form, so Cancel goes back to it.
  const [previousId, setPreviousId] = useState(null);

  const startNew = () => {
    setPreviousId(selectedAddrId);
    setMode('new');
    setType('Home');
    setSaveIt(true);
    setError('');
    setSelectedAddrId(null);
    setAddress((p) => ({ house: '', area: '', city: p.city || '', state: p.state || '', pincode: '', latitude: null, longitude: null }));
  };

  const startEdit = (addr) => {
    choose(addr);
    setType(addr.type || 'Home');
    setSaveIt(true);
    setError('');
    setMode('edit');
  };

  const backToList = () => {
    setError('');
    setMode('list');
    const wanted = mode === 'new' ? previousId : selectedAddrId;
    const current = saved.find((a) => idOf(a) === wanted) || saved.find((a) => a.isDefault) || saved[0];
    if (current) choose(current);
  };

  const useMyLocation = () => {
    if (!navigator?.geolocation) return onOpenMap();
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        setAddress((p) => ({ ...p, latitude: pos.coords.latitude, longitude: pos.coords.longitude }));
      },
      () => {
        setLocating(false);
        onOpenMap();
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  const save = async () => {
    const missing = missingParts(address, { needPincode: Boolean(user && saveIt) });
    if (missing.length) {
      setError(`Please fill in the ${missing.join(', ')}.`);
      return;
    }
    setError('');
    if (!user || !saveIt) {
      // Used for this booking only.
      if (saved.length) setMode('list');
      return;
    }
    setSaving(true);
    try {
      const body = {
        type,
        house: address.house.trim(),
        landmark: address.area?.trim() || '',
        city: address.city.trim(),
        state: address.state,
        pincode: address.pincode.trim(),
        latitude: address.latitude,
        longitude: address.longitude,
      };
      const editingId = effectiveMode === 'edit' ? selectedAddrId : null;
      const res = await apiRequest(editingId ? `/auth/addresses/${editingId}` : '/auth/addresses', {
        method: editingId ? 'PUT' : 'POST',
        auth: true,
        portal: 'customer',
        body,
      });
      const list = Array.isArray(res) ? res : [];
      updateUser({ addresses: list }, 'customer');
      const match =
        (editingId && list.find((a) => idOf(a) === editingId)) ||
        [...list].reverse().find((a) => a.house === body.house && (a.pincode || '') === body.pincode && (a.city || '') === body.city);
      if (match) choose(match);
      setMode('list');
    } catch (err) {
      setError(err?.message || 'Could not save the address. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ── Saved addresses ────────────────────────────────────────────────────────
  if (effectiveMode === 'list') {
    return (
      <div className="flex flex-col gap-2" role="radiogroup" aria-label="Saved addresses">
        {saved.map((addr) => {
          const id = idOf(addr);
          const selected = id === selectedAddrId;
          // Checked against the live booking address, which has the state filled
          // in from the city when the saved address left it out.
          const missing = selected ? missingParts(address, { needPincode: false }) : [];
          const Icon = addr.type === 'Work' ? Briefcase : addr.type === 'Other' ? MapPin : Home;
          const line = [addr.house, addr.landmark, addr.city, addr.pincode].filter(Boolean).join(', ');
          return (
            <div
              key={id || line}
              className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${selected ? 'border-brand-blue bg-blue-50/60 ring-1 ring-brand-blue' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
              <button type="button" role="radio" aria-checked={selected} onClick={() => choose(addr)} className="flex items-start gap-3 flex-1 min-w-0 text-left cursor-pointer">
                <span className={`mt-0.5 w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center shrink-0 ${selected ? 'border-brand-blue bg-brand-blue' : 'border-slate-300'}`}>
                  {selected && <Check size={11} className="text-white" strokeWidth={3} />}
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5">
                    <Icon size={13} className="text-slate-500" />
                    <span className="text-[13px] font-bold text-slate-900">{addr.type || 'Address'}</span>
                    {addr.isDefault && <span className="text-[9px] font-bold text-brand-blue bg-blue-100 px-1.5 rounded">Default</span>}
                  </span>
                  <span className="block text-[12px] text-slate-600 leading-snug mt-0.5">{line}</span>
                  {selected && missing.length > 0 && (
                    <span className="block text-[11px] font-semibold text-rose-600 mt-1">Missing {missing.join(', ')} - tap Edit to add it.</span>
                  )}
                </span>
              </button>
              <button type="button" onClick={() => startEdit(addr)} aria-label={`Edit ${addr.type || 'address'}: ${line}`} className="shrink-0 flex items-center gap-1 text-[11px] font-bold text-brand-blue px-2 py-1 rounded-lg hover:bg-blue-100 cursor-pointer">
                <Pencil size={12} /> Edit
              </button>
            </div>
          );
        })}
        <button type="button" onClick={startNew} className="flex items-center justify-center gap-1.5 py-3 rounded-xl border-2 border-dashed border-blue-200 text-brand-blue text-[13px] font-bold hover:bg-blue-50 cursor-pointer">
          <Plus size={15} /> Add new address
        </button>
      </div>
    );
  }

  // ── Add / edit form ────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-3">
      {saved.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-[12px] font-bold text-slate-700">{effectiveMode === 'edit' ? 'Edit address' : 'New address'}</p>
          <button type="button" onClick={backToList} className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-800 cursor-pointer">
            <X size={13} /> Cancel
          </button>
        </div>
      )}

      {/* Map pin: one compact row */}
      <div className={`flex items-center gap-2 p-2.5 rounded-xl border ${pinned ? 'border-emerald-200 bg-emerald-50/60' : 'border-slate-200 bg-slate-50'}`}>
        <MapPin size={16} className={pinned ? 'text-emerald-600 shrink-0' : 'text-slate-400 shrink-0'} />
        <p className="flex-1 min-w-0 text-[12px] font-semibold text-slate-700">
          {pinned ? 'Location pinned on map' : 'Pin your location (helps the partner find you)'}
        </p>
        {pinned ? (
          <>
            <button type="button" onClick={onOpenMap} className="text-[11px] font-bold text-brand-blue px-2 py-1 rounded-lg hover:bg-blue-100 cursor-pointer">Change</button>
            <button type="button" aria-label="Remove pin" onClick={() => setAddress((p) => ({ ...p, latitude: null, longitude: null }))} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"><X size={14} /></button>
          </>
        ) : (
          <>
            <button type="button" onClick={useMyLocation} disabled={locating} className="flex items-center gap-1 text-[11px] font-bold text-brand-blue px-2 py-1 rounded-lg hover:bg-blue-100 cursor-pointer disabled:opacity-60">
              {locating ? <Loader2 size={12} className="animate-spin" /> : <Crosshair size={12} />} Current
            </button>
            <button type="button" onClick={onOpenMap} className="flex items-center gap-1 text-[11px] font-bold text-brand-blue px-2 py-1 rounded-lg hover:bg-blue-100 cursor-pointer">
              <Navigation size={12} /> Map
            </button>
          </>
        )}
      </div>

      <input type="text" aria-label="House / Flat / Building" value={address.house} onChange={(e) => edit((p) => ({ ...p, house: e.target.value }))} placeholder="House / Flat / Building No. *" className={field} />
      <input type="text" aria-label="Area / Landmark" value={address.area} onChange={(e) => edit((p) => ({ ...p, area: e.target.value }))} placeholder="Area / Street / Landmark" className={field} />
      <div className="grid grid-cols-2 gap-3">
        <input
          type="text"
          aria-label="City"
          value={address.city}
          onChange={(e) => edit((p) => ({ ...p, city: e.target.value, state: stateForCity(e.target.value) || p.state }))}
          placeholder="City *"
          className={field}
        />
        <input
          type="text"
          inputMode="numeric"
          aria-label="Pincode"
          value={address.pincode}
          maxLength={6}
          onChange={(e) => edit((p) => ({ ...p, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
          placeholder="Pincode *"
          className={`${field} ${address.pincode && address.pincode.length < 6 ? 'border-rose-400' : ''}`}
        />
      </div>
      <select aria-label="State" value={address.state || ''} onChange={(e) => edit((p) => ({ ...p, state: e.target.value }))} className={`${field} ${address.state ? '' : 'text-slate-400'}`}>
        <option value="">State *</option>
        {INDIAN_STATES.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>

      {user && (
        <>
          <p className="text-[11px] font-bold text-slate-500 -mb-1">Save as</p>
          <div className="flex gap-2" role="radiogroup" aria-label="Save as">
            {TYPES.map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={type === t}
                onClick={() => setType(t)}
                className={`flex-1 py-2 rounded-lg border text-[12px] font-bold cursor-pointer ${type === t ? 'border-brand-blue bg-blue-50 text-brand-blue' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                {t}
              </button>
            ))}
          </div>
          {effectiveMode === 'new' && (
            <label className="flex items-center gap-2 text-[12px] font-semibold text-slate-700 cursor-pointer">
              <input type="checkbox" checked={saveIt} onChange={(e) => setSaveIt(e.target.checked)} className="w-4 h-4 accent-[#0D47A1]" />
              Save to my addresses for next time
            </label>
          )}
        </>
      )}

      {error && <p className="text-[12px] font-semibold text-rose-600" role="alert">{error}</p>}

      {(user || saved.length > 0) && (
        <button type="button" onClick={save} disabled={saving} className="py-3 rounded-xl bg-brand-blue text-white text-[13px] font-bold flex items-center justify-center gap-1.5 hover:bg-[#083679] disabled:opacity-60 cursor-pointer">
          {saving && <Loader2 size={14} className="animate-spin" />}
          {effectiveMode === 'edit' ? 'Save changes' : user && saveIt ? 'Save & use this address' : 'Use this address'}
        </button>
      )}
    </div>
  );
}
