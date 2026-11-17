import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Eye, EyeOff, ExternalLink, ImagePlus, Loader2, Plus, Trash2 } from 'lucide-react';
import { apiRequest, resolveMediaUrl } from '../../../lib/apiClient';
import { uploadImage } from '../../../lib/uploadImage';
import { Modal, Field, inputClass, ErrorNote, PrimaryButton, SecondaryButton } from '../catalogue/ui';
import BrandOfferCard, { isExternalLink } from '../../home/BrandOfferCard';
import { BRAND_CARD_THEMES, themeOf } from '../../home/brandCardThemes';

// Super Admin → Customer App → "Brands & Offers". The cards the customer's home
// screen shows under that heading: exactly these, in this order, and nothing
// else (the section disappears when none is published). Every action here is a
// call to /cms/home-tiles — create, edit, show/hide, reorder, delete — and a
// failure is shown, never swallowed.

const PLACEMENT = 'brand-card';
const DEFAULT_BUTTON = 'Explore on NCC';

// Where tapping a card can take a customer. "Book a service" is built from the
// live catalogue; the rest are fixed screens of the customer app.
const DESTINATIONS = [
  { id: 'shop', label: 'Shop (Buy)', value: '/buy' },
  { id: 'amc', label: 'AMC plans', value: '/buy/amc/select-appliance' },
  { id: 'ew', label: 'Extended warranty (NCC Shield)', value: '/buy/select-appliance' },
  { id: 'pw', label: 'Partner warranty', value: '/partner-warranty' },
  { id: 'services', label: 'All services', value: '/all-services' },
];
const BOOK_PREFIX = '/book/';

/** Which picker mode a stored link belongs to. */
function modeOf(link) {
  if (!link) return { mode: 'book', category: '', custom: '' };
  if (link.startsWith(BOOK_PREFIX) && !link.includes('?')) return { mode: 'book', category: decodeURIComponent(link.slice(BOOK_PREFIX.length)), custom: '' };
  const fixed = DESTINATIONS.find((d) => d.value === link);
  if (fixed) return { mode: fixed.id, category: '', custom: '' };
  return { mode: 'custom', category: '', custom: link };
}

function linkFor({ mode, category, custom }) {
  if (mode === 'book') return category ? `${BOOK_PREFIX}${encodeURIComponent(category)}` : '';
  if (mode === 'custom') return custom.trim();
  return DESTINATIONS.find((d) => d.id === mode)?.value || '';
}

/** What an admin typed in a custom link, checked before it is sent. */
const customLinkProblem = (value) => {
  const v = value.trim();
  if (!v) return 'Enter the link customers should open.';
  if (/^\/(?!\/)\S*$/.test(v) || /^https?:\/\/\S+$/i.test(v)) return '';
  return 'Use an in-app path like /book/AC, or a full address starting with https://';
};

function CardDialog({ card, categories, onClose, onSaved }) {
  const initialMode = modeOf(card?.link || '');
  const [brandName, setBrandName] = useState(card?.brandName || '');
  const [badgeText, setBadgeText] = useState(card?.badgeText || '');
  const [title, setTitle] = useState(card?.title || '');
  const [subtitle, setSubtitle] = useState(card?.subtitle || '');
  const [buttonText, setButtonText] = useState(card?.buttonText || DEFAULT_BUTTON);
  const [mode, setMode] = useState(card ? initialMode.mode : 'book');
  const [category, setCategory] = useState(initialMode.category);
  const [custom, setCustom] = useState(initialMode.custom);
  const [theme, setTheme] = useState(card ? themeOf(card) : BRAND_CARD_THEMES[0]);
  const [imageUrl, setImageUrl] = useState(card?.imageUrl || '');
  const [isActive, setIsActive] = useState(card ? card.isActive : true);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const link = linkFor({ mode, category, custom });
  const preview = { brandName: brandName || 'BRAND', title: title || 'Offer headline', subtitle, buttonText, badgeText, image: imageUrl, actionUrl: link || '/', gradient: theme.gradient, textColor: theme.textColor };

  const upload = async (file) => {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      setImageUrl(await uploadImage(file));
    } catch (err) {
      setError(err.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const save = async (e) => {
    e.preventDefault();
    setError('');
    if (!brandName.trim()) return setError('Enter the brand name.');
    if (!title.trim()) return setError('Enter the offer headline.');
    if (mode === 'book' && !category) return setError('Choose which service customers should book.');
    if (mode === 'custom') {
      const problem = customLinkProblem(custom);
      if (problem) return setError(problem);
    }
    setBusy(true);
    const body = {
      placement: PLACEMENT,
      brandName: brandName.trim(),
      title: title.trim(),
      subtitle: subtitle.trim(),
      buttonText: buttonText.trim() || DEFAULT_BUTTON,
      badgeText: badgeText.trim(),
      link,
      gradient: theme.gradient,
      textColor: theme.textColor,
      imageUrl: imageUrl || null,
      isActive,
    };
    try {
      await (card
        ? apiRequest(`/cms/home-tiles/${card.id}`, { method: 'PUT', auth: true, body })
        : apiRequest('/cms/home-tiles', { method: 'POST', auth: true, body: { ...body, sortOrder: 9999 } }));
      onSaved(card ? 'Card updated.' : 'Card added.');
    } catch (err) {
      setError(err.message || 'Could not save the card.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={card ? 'Edit card' : 'Add a brand or offer card'} subtitle="Brands & Offers on the customer home screen" onClose={onClose} width="max-w-2xl">
      <form onSubmit={save} className="space-y-4">
        <div className="rounded-2xl bg-slate-100 p-4 flex justify-center" aria-label="Card preview">
          <BrandOfferCard card={preview} className="w-80 max-w-full" />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Brand name *">
            <input className={inputClass} value={brandName} maxLength={40} onChange={(e) => setBrandName(e.target.value)} placeholder="e.g. LLOYD" />
          </Field>
          <Field label="Badge (optional)">
            <input className={inputClass} value={badgeText} maxLength={30} onChange={(e) => setBadgeText(e.target.value)} placeholder="e.g. Official Partner" />
          </Field>
        </div>
        <Field label="Headline *">
          <input className={inputClass} value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. New Launch Glacier Series AC" />
        </Field>
        <Field label="Supporting line">
          <input className={inputClass} value={subtitle} maxLength={120} onChange={(e) => setSubtitle(e.target.value)} placeholder="e.g. Experience Superior Cooling & Comfort" />
        </Field>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Button text">
            <input className={inputClass} value={buttonText} maxLength={30} onChange={(e) => setButtonText(e.target.value)} placeholder={DEFAULT_BUTTON} />
          </Field>
          <Field label="When tapped, open *">
            <select className={inputClass} value={mode} onChange={(e) => setMode(e.target.value)} aria-label="When tapped, open">
              <option value="book">Book a service…</option>
              {DESTINATIONS.map((d) => (
                <option key={d.id} value={d.id}>{d.label}</option>
              ))}
              <option value="custom">A custom link…</option>
            </select>
          </Field>
        </div>
        {mode === 'book' && (
          <Field label="Service category *" hint="Opens the booking flow for this category.">
            <select className={inputClass} value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Service category">
              <option value="">Choose a category…</option>
              {categories.map((c) => (
                <option key={c.key} value={c.key}>{c.name || c.key}</option>
              ))}
              {category && !categories.some((c) => c.key === category) && <option value={category}>{category}</option>}
            </select>
          </Field>
        )}
        {mode === 'custom' && (
          <Field label="Custom link *" hint="An in-app path (e.g. /book/AC) or a brand website (https://…). Web addresses open in a new tab.">
            <input className={inputClass} value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="https://www.samsung.com" aria-label="Custom link" />
          </Field>
        )}

        <Field label="Colour theme" group>
          <div className="flex flex-wrap gap-2">
            {BRAND_CARD_THEMES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTheme(t)}
                aria-pressed={theme.gradient === t.gradient}
                aria-label={`${t.label} theme`}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold bg-linear-to-br ${t.gradient} border-2 cursor-pointer ${theme.gradient === t.gradient ? 'border-[#0D47A1]' : 'border-transparent'}`}
                style={{ color: t.textColor }}>
                {t.label}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Product picture" group>
          <div className="flex items-center gap-3">
            <span className="w-20 h-16 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden">
              {imageUrl ? <img src={resolveMediaUrl(imageUrl)} alt="" className="w-full h-full object-contain" /> : <ImagePlus size={18} className="text-slate-300" />}
            </span>
            <label className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer">
              {uploading ? 'Uploading…' : imageUrl ? 'Replace picture' : 'Upload picture'}
              <input type="file" accept="image/*" className="sr-only" aria-label="Upload product picture" onChange={(e) => upload(e.target.files?.[0])} />
            </label>
            {imageUrl && (
              <button type="button" onClick={() => setImageUrl('')} className="text-xs font-bold text-rose-600 cursor-pointer">Remove</button>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">A product shot on a plain or transparent background looks best. Without one the card shows text only.</p>
        </Field>

        <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="w-4 h-4" />
          Show this card to customers
        </label>

        <ErrorNote message={error} />
        <div className="flex justify-end gap-2">
          <SecondaryButton type="button" onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton type="submit" disabled={busy || uploading}>{busy ? <Loader2 size={14} className="animate-spin" /> : null} Save card</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

export default function BrandCardsEditor({ onToast }) {
  const [cards, setCards] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialog, setDialog] = useState(null); // { card } | { card: null }
  const [working, setWorking] = useState(false);

  const load = useCallback(async () => {
    try {
      const [rows, cats] = await Promise.all([
        apiRequest(`/cms/home-tiles/admin?placement=${PLACEMENT}`, { auth: true }),
        apiRequest('/catalog/categories', { silentError: true }).catch(() => []),
      ]);
      setCards(Array.isArray(rows) ? rows : []);
      setCategories(Array.isArray(cats) ? cats : []);
      setError('');
    } catch (err) {
      setError(err.message || 'Could not load the cards.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const run = async (work, message) => {
    setWorking(true);
    try {
      await work();
      onToast?.(message);
      setError('');
    } catch (err) {
      setError(err.message || 'Could not save that change.');
    } finally {
      await load();
      setWorking(false);
    }
  };
  const move = (index, delta) =>
    run(async () => {
      const order = cards.map((c) => c.id);
      const [id] = order.splice(index, 1);
      order.splice(index + delta, 0, id);
      await apiRequest('/cms/home-tiles/reorder', { method: 'PUT', auth: true, body: { placement: PLACEMENT, ids: order } });
    }, 'Order saved.');
  const toggle = (card) =>
    run(() => apiRequest(`/cms/home-tiles/${card.id}`, { method: 'PUT', auth: true, body: { isActive: !card.isActive } }), card.isActive ? 'Card hidden from customers.' : 'Card is now visible to customers.');
  const remove = (card) =>
    window.confirm(`Delete the ${card.brandName || card.title} card? Customers will stop seeing it. This cannot be undone.`) &&
    run(() => apiRequest(`/cms/home-tiles/${card.id}`, { method: 'DELETE', auth: true }), 'Card deleted.');

  const live = useMemo(() => cards.filter((c) => c.isActive), [cards]);
  const asCard = (c) => ({ brandName: c.brandName || c.title, title: c.title, subtitle: c.subtitle, image: c.imageUrl, buttonText: c.buttonText, actionUrl: c.link, badgeText: c.badgeText, gradient: c.gradient || BRAND_CARD_THEMES[0].gradient, textColor: c.textColor });

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl">
          <h2 className="text-base font-extrabold text-slate-800">Brands & Offers</h2>
          <p className="text-xs text-slate-500 mt-1">The promo cards under “Brands & Offers” on the customer home screen, shown in this order. Only cards marked visible reach customers; with none visible the whole section is hidden.</p>
        </div>
        <PrimaryButton type="button" onClick={() => setDialog({ card: null })}>
          <Plus size={14} /> Add brand / offer card
        </PrimaryButton>
      </div>

      <ErrorNote message={error} />
      {loading ? (
        <Loader2 className="animate-spin mx-auto text-slate-400" />
      ) : (
        <ol className="space-y-2" aria-label="Brand and offer cards">
          {cards.map((card, i) => (
            <li key={card.id} className={`bg-white rounded-2xl border border-slate-200/80 p-3 flex items-center gap-3 ${card.isActive ? '' : 'opacity-60'}`}>
              <span className="w-8 text-center text-xs font-black text-slate-400">{i + 1}</span>
              <span className="w-16 h-14 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden shrink-0 flex items-center justify-center">
                {card.imageUrl ? <img src={resolveMediaUrl(card.imageUrl)} alt="" className="w-full h-full object-contain" /> : <ImagePlus size={16} className="text-slate-300" />}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-extrabold text-slate-800 truncate">
                  {card.brandName || card.title}
                  {card.badgeText && <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 align-middle">{card.badgeText}</span>}
                </p>
                <p className="text-xs text-slate-500 truncate">{card.title}</p>
                <p className="text-[11px] text-slate-400 truncate flex items-center gap-1">
                  {isExternalLink(card.link) && <ExternalLink size={10} />}
                  {card.link || <span className="text-rose-600 font-bold">No link — tapping does nothing</span>}
                </p>
              </div>
              <span className={`text-[10px] font-black px-2 py-1 rounded-full ${card.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{card.isActive ? 'Visible' : 'Hidden'}</span>
              <div className="flex items-center gap-1">
                <button type="button" disabled={working || i === 0} onClick={() => move(i, -1)} aria-label={`Move ${card.brandName || card.title} up`} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"><ArrowUp size={15} /></button>
                <button type="button" disabled={working || i === cards.length - 1} onClick={() => move(i, 1)} aria-label={`Move ${card.brandName || card.title} down`} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"><ArrowDown size={15} /></button>
                <button type="button" disabled={working} onClick={() => toggle(card)} aria-label={card.isActive ? `Hide ${card.brandName || card.title}` : `Show ${card.brandName || card.title}`} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer">{card.isActive ? <Eye size={15} /> : <EyeOff size={15} />}</button>
                <button type="button" disabled={working} onClick={() => setDialog({ card })} className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-[#0D47A1] hover:bg-blue-50 cursor-pointer">Edit</button>
                <button type="button" disabled={working} onClick={() => remove(card)} aria-label={`Delete ${card.brandName || card.title}`} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 cursor-pointer"><Trash2 size={15} /></button>
              </div>
            </li>
          ))}
          {!cards.length && (
            <li className="bg-white rounded-2xl border border-dashed border-slate-300 p-6 text-center text-xs text-slate-400">No cards yet — the “Brands & Offers” section is hidden on the customer home screen.</li>
          )}
        </ol>
      )}

      {!loading && live.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5">
          <h3 className="text-sm font-extrabold text-slate-800">As customers see it</h3>
          <p className="text-[11px] text-slate-400 mt-0.5 mb-3">{live.length} visible {live.length === 1 ? 'card' : 'cards'}, in order.</p>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {live.map((c) => (
              <BrandOfferCard key={c.id} card={asCard(c)} className="w-80 shrink-0" />
            ))}
          </div>
        </div>
      )}

      {dialog && (
        <CardDialog
          card={dialog.card}
          categories={categories}
          onClose={() => setDialog(null)}
          onSaved={(message) => {
            setDialog(null);
            onToast?.(message);
            load();
          }}
        />
      )}
    </div>
  );
}
