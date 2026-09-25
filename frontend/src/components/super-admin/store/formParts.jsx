import { useState } from 'react';
import { ArrowUp, ImagePlus, Loader2, Plus, Star, Trash2, X } from 'lucide-react';
import { uploadImages } from '../../../lib/uploadImage';
import { inputClass } from '../catalogue/ui';

// Form building blocks shared by the NCC Products and Inventory editors
// (docs/master-catalogue Phases 20–21).

/** A titled card that groups one part of a long form. */
export function Section({ title, hint, children, aside }) {
  return (
    <section className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
      <header className="flex items-start justify-between gap-3 px-5 pt-4 pb-3 border-b border-slate-100">
        <div>
          <h2 className="text-sm font-extrabold text-slate-800">{title}</h2>
          {hint && <p className="text-[11px] text-slate-400 mt-0.5">{hint}</p>}
        </div>
        {aside}
      </header>
      <div className="p-5 space-y-4">{children}</div>
    </section>
  );
}

/**
 * Picture gallery: upload several (Cloudinary via POST /uploads), remove,
 * reorder. The first picture is the main one everywhere.
 */
export function ImageGalleryInput({ value, onChange, max = 8, label = 'pictures' }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const add = async (files) => {
    const list = Array.from(files || []).slice(0, Math.max(0, max - value.length));
    if (!list.length) return;
    setUploading(true);
    setError('');
    try {
      onChange([...value, ...(await uploadImages(list))]);
    } catch (err) {
      setError(err.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };
  const move = (from, to) => {
    const next = [...value];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };

  return (
    <div>
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
        {value.map((url, i) => (
          <figure key={url} className="relative group aspect-square rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
            <img src={url} alt={`Picture ${i + 1}`} className="w-full h-full object-contain p-1.5" />
            {i === 0 && (
              <span className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 bg-[#0D47A1] text-white text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md">
                <Star size={9} /> Main
              </span>
            )}
            <div className="absolute inset-x-0 bottom-0 flex justify-end gap-1 p-1.5 bg-linear-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
              {i > 0 && (
                <button type="button" onClick={() => move(i, 0)} aria-label={`Make picture ${i + 1} the main picture`} className="p-1 rounded-md bg-white/90 text-slate-700 cursor-pointer">
                  <ArrowUp size={12} />
                </button>
              )}
              <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label={`Remove picture ${i + 1}`} className="p-1 rounded-md bg-white/90 text-rose-600 cursor-pointer">
                <Trash2 size={12} />
              </button>
            </div>
          </figure>
        ))}
        {value.length < max && (
          <label className="aspect-square rounded-xl border-2 border-dashed border-slate-300 hover:border-[#0D47A1] flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-[#0D47A1] cursor-pointer transition-colors">
            {uploading ? <Loader2 size={20} className="animate-spin" /> : <ImagePlus size={20} />}
            <span className="text-[10px] font-bold">{uploading ? 'Uploading…' : 'Add'}</span>
            <input
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              aria-label={`Upload ${label}`}
              disabled={uploading}
              onChange={(e) => {
                add(e.target.files);
                e.target.value = '';
              }}
            />
          </label>
        )}
      </div>
      <p className="text-[11px] text-slate-400 mt-2">
        Up to {max} {label}, 5 MB each. The first is the main picture — hover a picture to make it main or remove it.
      </p>
      {error && <p className="text-xs font-bold text-red-600 mt-1">{error}</p>}
    </div>
  );
}

/** An editable list of short lines (highlights, in-the-box items, models…). */
export function ListInput({ value, onChange, placeholder, max = 30, label }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const text = draft.trim();
    if (!text || value.includes(text) || value.length >= max) return;
    onChange([...value, text]);
    setDraft('');
  };
  return (
    <div>
      <div className="flex gap-2">
        <input
          className={inputClass}
          value={draft}
          placeholder={placeholder}
          aria-label={label}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
        />
        <button type="button" onClick={add} aria-label={`Add ${label}`} className="px-3 rounded-xl border border-slate-200 text-[#0D47A1] hover:bg-blue-50 cursor-pointer">
          <Plus size={16} />
        </button>
      </div>
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-1.5 mt-2">
          {value.map((item) => (
            <li key={item} className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-lg bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700">
              {item}
              <button type="button" onClick={() => onChange(value.filter((v) => v !== item))} aria-label={`Remove ${item}`} className="p-0.5 rounded text-slate-400 hover:text-rose-600 cursor-pointer">
                <X size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Label / value rows. */
export function KeyValueEditor({ value, onChange, labelPlaceholder = 'e.g. Capacity', valuePlaceholder = 'e.g. 1.5 Ton' }) {
  const update = (i, field, text) => onChange(value.map((row, j) => (j === i ? { ...row, [field]: text } : row)));
  return (
    <div className="space-y-2">
      {value.map((row, i) => (
        <div key={i} className="grid grid-cols-[1fr_1.4fr_auto] gap-2">
          <input className={inputClass} value={row.label} placeholder={labelPlaceholder} aria-label={`Row ${i + 1} label`} onChange={(e) => update(i, 'label', e.target.value)} />
          <input className={inputClass} value={row.value} placeholder={valuePlaceholder} aria-label={`Row ${i + 1} value`} onChange={(e) => update(i, 'value', e.target.value)} />
          <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label={`Remove row ${i + 1}`} className="px-2 text-slate-400 hover:text-rose-600 cursor-pointer">
            <Trash2 size={15} />
          </button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...value, { label: '', value: '' }])} className="inline-flex items-center gap-1 text-xs font-bold text-[#0D47A1] cursor-pointer">
        <Plus size={13} /> Add row
      </button>
    </div>
  );
}

/** Grouped specifications ("General", "Dimensions", "Performance"…) like a marketplace listing. */
export function SpecGroupsEditor({ value, onChange }) {
  const update = (i, patch) => onChange(value.map((g, j) => (j === i ? { ...g, ...patch } : g)));
  return (
    <div className="space-y-4">
      {value.map((group, i) => (
        <div key={i} className="rounded-xl border border-slate-200 p-3.5 space-y-3 bg-slate-50/50">
          <div className="flex gap-2">
            <input
              className={`${inputClass} font-bold`}
              value={group.group}
              placeholder="Group name, e.g. General"
              aria-label={`Specification group ${i + 1} name`}
              onChange={(e) => update(i, { group: e.target.value })}
            />
            <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label={`Remove group ${group.group || i + 1}`} className="px-2 text-slate-400 hover:text-rose-600 cursor-pointer">
              <Trash2 size={15} />
            </button>
          </div>
          <KeyValueEditor value={group.items} onChange={(items) => update(i, { items })} />
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...value, { group: value.length ? '' : 'General', items: [{ label: '', value: '' }] }])}
        className="inline-flex items-center gap-1 text-xs font-bold text-[#0D47A1] cursor-pointer"
      >
        <Plus size={13} /> Add specification group
      </button>
    </div>
  );
}


/** Stock state pill shared by both lists. */
export function StockBadge({ status, stock, unit }) {
  const style =
    status === 'Out of Stock'
      ? 'bg-rose-50 text-rose-700 border-rose-200'
      : status === 'Low Stock'
        ? 'bg-amber-50 text-amber-700 border-amber-200'
        : 'bg-emerald-50 text-emerald-700 border-emerald-200';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10.5px] font-black whitespace-nowrap ${style}`}>
      {stock != null && <span>{stock}{unit ? ` ${unit}` : ''} ·</span>}
      {status}
    </span>
  );
}
