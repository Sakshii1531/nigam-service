import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Eye, EyeOff, ImagePlus, Loader2, Plus, Search, Star, Trash2, Zap } from 'lucide-react';
import { apiRequest } from '../../../lib/apiClient';
import { uploadImage } from '../../../lib/uploadImage';
import { Modal, Field, inputClass, ErrorNote, PrimaryButton, SecondaryButton } from '../catalogue/ui';

// Super Admin → Customer App → "Most Booked Services" / "Appliance repair &
// service" (docs/master-catalogue Phase 22). A tile is a real bookable
// catalogue service; its price, "Instant" and rating are read live — the
// admin picks the service and, optionally, a picture and a shorter label.

const COPY = {
  'most-booked': {
    title: 'Most Booked Services',
    hint: 'Pinned services show first. The rest of the row fills itself with the services customers actually booked most in the last 90 days.',
    empty: 'Nothing pinned. The row shows the most-booked services automatically once customers book — or pin a few to launch with.',
  },
  'appliance-service': {
    title: 'Appliance repair & service',
    hint: 'The services shown in this row, in this order. Hidden when the list is empty.',
    empty: 'No services in this row yet — the customer app hides it.',
  },
};

const rupees = (n) => (n == null ? '—' : `₹${Number(n).toLocaleString('en-IN')}`);
const groupIdOf = (tile) => `${tile.target?.productType || 'none'}:${tile.target?.service}`;

function LiveFigures({ group }) {
  if (!group) return <span className="text-[11px] font-bold text-rose-600">Not bookable right now — hidden from customers</span>;
  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
      <span className="font-black text-[#0D47A1]">from {rupees(group.fromPrice)}</span>
      {group.instant && (
        <span className="inline-flex items-center gap-0.5 font-bold text-blue-700"><Zap size={11} /> Instant</span>
      )}
      <span className="inline-flex items-center gap-0.5">
        <Star size={11} className={group.reviewCount ? 'text-yellow-500 fill-yellow-500' : 'text-slate-300'} />
        {group.reviewCount ? `${group.rating.toFixed(1)} (${group.reviewCount} reviews)` : 'no reviews yet'}
      </span>
      <span>{group.bookingCount} bookings / 90 days</span>
    </span>
  );
}

function TileDialog({ placement, tile, groups, usedIds, onClose, onSaved }) {
  const [groupId, setGroupId] = useState(tile ? groupIdOf(tile) : '');
  const [title, setTitle] = useState(tile?.title || '');
  const [imageUrl, setImageUrl] = useState(tile?.imageUrl || '');
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const chosen = groups.find((g) => g.groupId === groupId);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return groups
      .filter((g) => g.groupId === groupId || !usedIds.has(g.groupId))
      .filter((g) => !q || `${g.title} ${g.category.name}`.toLowerCase().includes(q))
      .slice(0, 60);
  }, [groups, query, usedIds, groupId]);

  const upload = async (file) => {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      setImageUrl(await uploadImage(file));
    } catch (err) {
      setError(err.message || 'Upload failed.');
    } finally {
      setBusy(false);
    }
  };

  const save = async (e) => {
    e.preventDefault();
    if (!chosen) return setError('Pick the service this tile books.');
    setBusy(true);
    setError('');
    const body = {
      placement,
      title: title.trim() || chosen.title,
      target: { productType: chosen.productTypeId, service: chosen.serviceId },
      imageUrl: imageUrl || null,
    };
    try {
      await (tile
        ? apiRequest(`/cms/home-tiles/${tile.id}`, { method: 'PUT', auth: true, body })
        : apiRequest('/cms/home-tiles', { method: 'POST', auth: true, body: { ...body, sortOrder: 9999 } }));
      onSaved();
    } catch (err) {
      setError(err.message || 'Could not save the tile.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={tile ? 'Edit tile' : 'Add a service'} subtitle={COPY[placement].title} onClose={onClose} width="max-w-2xl">
      <form onSubmit={save} className="space-y-4">
        <Field label="Service *" group>
          <div className="relative mb-2">
            <Search size={14} className="absolute left-3 top-3 text-slate-400" />
            <input className={`${inputClass} pl-8`} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search bookable services — e.g. split ac, fan, tank" aria-label="Search services" />
          </div>
          <div role="listbox" aria-label="Bookable services" className="max-h-64 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
            {matches.map((g) => (
              <button
                key={g.groupId}
                type="button"
                role="option"
                aria-selected={g.groupId === groupId}
                onClick={() => {
                  setGroupId(g.groupId);
                  if (!title || title === chosen?.title) setTitle(g.title);
                }}
                className={`w-full text-left px-3 py-2 flex items-center justify-between gap-3 cursor-pointer ${g.groupId === groupId ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
              >
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-slate-800 truncate">{g.title}</span>
                  <span className="block text-[11px] text-slate-400">{g.category.name}</span>
                </span>
                <span className="text-xs font-black text-[#0D47A1] shrink-0">from {rupees(g.fromPrice)}</span>
              </button>
            ))}
            {!matches.length && <p className="p-4 text-xs text-slate-400">No bookable service matches.</p>}
          </div>
        </Field>
        {chosen && (
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
            <p className="text-[11px] font-bold text-slate-400 uppercase mb-1">Customers will see (live)</p>
            <LiveFigures group={chosen} />
          </div>
        )}
        <Field label="Label on the tile" hint="Defaults to the service name; keep it short.">
          <input className={inputClass} value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} placeholder={chosen?.title || ''} />
        </Field>
        <Field label="Picture" group>
          <div className="flex items-center gap-3">
            <span className="w-20 h-20 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden">
              {imageUrl || chosen?.imageUrl ? <img src={imageUrl || chosen.imageUrl} alt="" className="w-full h-full object-cover" /> : <ImagePlus size={18} className="text-slate-300" />}
            </span>
            <label className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer">
              {busy ? 'Uploading…' : 'Upload picture'}
              <input type="file" accept="image/*" className="sr-only" aria-label="Upload tile picture" onChange={(e) => upload(e.target.files?.[0])} />
            </label>
            {imageUrl && (
              <button type="button" onClick={() => setImageUrl('')} className="text-xs font-bold text-rose-600 cursor-pointer">Remove</button>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Without one, the service’s or appliance’s own picture is used.</p>
        </Field>
        <ErrorNote message={error} />
        <div className="flex justify-end gap-2">
          <SecondaryButton type="button" onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton type="submit" disabled={busy}>{busy ? <Loader2 size={14} className="animate-spin" /> : null} Save tile</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

export default function ServiceTilesEditor({ placement, onToast }) {
  const [tiles, setTiles] = useState([]);
  const [groups, setGroups] = useState([]);
  const [auto, setAuto] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialog, setDialog] = useState(null); // { tile } | { tile: null }

  const load = useCallback(async () => {
    try {
      const [rows, groupList, live] = await Promise.all([
        apiRequest(`/cms/home-tiles/admin?placement=${placement}`, { auth: true }),
        apiRequest('/super-admin/catalogue/service-groups', { auth: true }),
        placement === 'most-booked' ? apiRequest('/catalog/home-sections', { silentError: true }) : Promise.resolve(null),
      ]);
      setTiles((rows || []).filter((t) => t.target?.service));
      setGroups(groupList || []);
      setAuto((live?.mostBooked || []).filter((c) => !c.pinned));
      setError('');
    } catch (err) {
      setError(err.message || 'Could not load the tiles.');
    } finally {
      setLoading(false);
    }
  }, [placement]);
  useEffect(() => {
    load();
  }, [load]);

  const byGroup = useMemo(() => new Map(groups.map((g) => [g.groupId, g])), [groups]);
  const usedIds = useMemo(() => new Set(tiles.map(groupIdOf)), [tiles]);

  const run = async (work, message) => {
    try {
      await work();
      onToast?.(message);
      await load();
    } catch (err) {
      setError(err.message || 'Could not save.');
    }
  };
  const move = (index, delta) =>
    run(async () => {
      const order = [...tiles];
      const [item] = order.splice(index, 1);
      order.splice(index + delta, 0, item);
      await Promise.all(order.map((t, i) => apiRequest(`/cms/home-tiles/${t.id}`, { method: 'PUT', auth: true, body: { sortOrder: i } })));
    }, 'Order saved.');
  const toggle = (tile) =>
    run(() => apiRequest(`/cms/home-tiles/${tile.id}`, { method: 'PUT', auth: true, body: { isActive: !tile.isActive } }), tile.isActive ? 'Tile hidden.' : 'Tile shown.');
  const remove = (tile) =>
    window.confirm(`Remove "${tile.title}" from this row?`) &&
    run(() => apiRequest(`/cms/home-tiles/${tile.id}`, { method: 'DELETE', auth: true }), 'Tile removed.');

  const copy = COPY[placement];

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl">
          <h2 className="text-base font-extrabold text-slate-800">{copy.title}</h2>
          <p className="text-xs text-slate-500 mt-1">{copy.hint}</p>
          <p className="text-[11px] text-slate-400 mt-1">Price, “Instant” and rating are never typed in: they come from the Master Catalogue, the service’s express setting and real customer reviews.</p>
        </div>
        <PrimaryButton type="button" onClick={() => setDialog({ tile: null })}>
          <Plus size={14} /> {placement === 'most-booked' ? 'Pin a service' : 'Add a service'}
        </PrimaryButton>
      </div>

      <ErrorNote message={error} />
      {loading ? (
        <Loader2 className="animate-spin mx-auto text-slate-400" />
      ) : (
        <ol className="space-y-2" aria-label={`${copy.title} tiles`}>
          {tiles.map((tile, i) => {
            const group = byGroup.get(groupIdOf(tile));
            return (
              <li key={tile.id} className={`bg-white rounded-2xl border border-slate-200/80 p-3 flex items-center gap-3 ${tile.isActive ? '' : 'opacity-60'}`}>
                <span className="w-8 text-center text-xs font-black text-slate-400">{i + 1}</span>
                <span className="w-14 h-14 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden shrink-0 flex items-center justify-center">
                  {tile.imageUrl || group?.imageUrl ? <img src={tile.imageUrl || group.imageUrl} alt="" className="w-full h-full object-cover" /> : <ImagePlus size={16} className="text-slate-300" />}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-extrabold text-slate-800 truncate">
                    {tile.title}
                    {group && tile.title !== group.title && <span className="font-semibold text-slate-400"> · {group.title}</span>}
                  </p>
                  <LiveFigures group={group} />
                </div>
                <div className="flex items-center gap-1">
                  <button type="button" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move ${tile.title} up`} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"><ArrowUp size={15} /></button>
                  <button type="button" disabled={i === tiles.length - 1} onClick={() => move(i, 1)} aria-label={`Move ${tile.title} down`} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"><ArrowDown size={15} /></button>
                  <button type="button" onClick={() => toggle(tile)} aria-label={tile.isActive ? `Hide ${tile.title}` : `Show ${tile.title}`} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer">{tile.isActive ? <Eye size={15} /> : <EyeOff size={15} />}</button>
                  <button type="button" onClick={() => setDialog({ tile })} className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-[#0D47A1] hover:bg-blue-50 cursor-pointer">Edit</button>
                  <button type="button" onClick={() => remove(tile)} aria-label={`Remove ${tile.title}`} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 cursor-pointer"><Trash2 size={15} /></button>
                </div>
              </li>
            );
          })}
          {!tiles.length && <li className="bg-white rounded-2xl border border-dashed border-slate-300 p-6 text-center text-xs text-slate-400">{copy.empty}</li>}
        </ol>
      )}

      {placement === 'most-booked' && !loading && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5">
          <h3 className="text-sm font-extrabold text-slate-800">Filled automatically from real bookings</h3>
          {auto.length ? (
            <ul className="mt-2 divide-y divide-slate-100">
              {auto.map((c) => (
                <li key={c.id} className="py-2 flex items-center justify-between gap-3 text-xs">
                  <span className="font-bold text-slate-700">{c.title}</span>
                  <span className="text-slate-500">{c.bookingCount} bookings · from {rupees(c.fromPrice)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-400 mt-1">No bookings in the last 90 days yet.</p>
          )}
        </div>
      )}

      {dialog && (
        <TileDialog
          placement={placement}
          tile={dialog.tile}
          groups={groups}
          usedIds={usedIds}
          onClose={() => setDialog(null)}
          onSaved={() => {
            setDialog(null);
            onToast?.('Tile saved.');
            load();
          }}
        />
      )}
    </div>
  );
}
