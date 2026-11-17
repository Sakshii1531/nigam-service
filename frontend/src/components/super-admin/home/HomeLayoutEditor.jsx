import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowDown, ArrowLeft, ArrowUp, Eye, EyeOff, LayoutPanelTop, Loader2, Plus, Rows3, Trash2, Wrench } from 'lucide-react';
import { apiRequest } from '../../../lib/apiClient';
import { Modal, Field, inputClass, ErrorNote, PrimaryButton, SecondaryButton } from '../catalogue/ui';
import BrandCardsEditor from './BrandCardsEditor';
import ServiceTilesEditor from './ServiceTilesEditor';

// Super Admin → Customer App → Home layout. The customer's home screen is this
// list, top to bottom: reorder it, hide a section, rename its heading, or add
// sections of your own — a row of brand/offer cards, or a curated row of
// bookable services. Every action is a call to /cms/home-layout; a failure is
// shown, never swallowed.

const KIND_LABEL = {
  banners: 'Banner carousel',
  categories: 'Service categories',
  'warranty-offers': 'Warranty banners (mobile)',
  'brand-cards': 'Brand / offer cards',
  'most-booked': 'Service row (auto + pinned)',
  'appliance-services': 'Service row',
  'spare-parts': 'Store products',
  reviews: 'Customer reviews',
  stories: 'Stories',
  'service-row': 'Service row',
};

// Where a built-in section's own content is edited.
const MANAGE_BUILT_IN = {
  banners: { tab: 'banners', label: 'Edit banners' },
  categories: { tab: 'categories', label: 'Edit categories' },
  'brand-cards': { tab: 'brands', label: 'Edit cards' },
  'most-booked': { tab: 'mostbooked', label: 'Edit services' },
  'appliance-services': { tab: 'applianceservices', label: 'Edit services' },
  stories: { tab: 'stories', label: 'Edit stories' },
  'spare-parts': { path: '/super-admin/products', label: 'Edit products' },
  reviews: { path: '/super-admin/reviews-customization', label: 'Edit reviews' },
};

const KIND_CHOICES = [
  { kind: 'brand-cards', icon: LayoutPanelTop, name: 'Brand / offer cards', blurb: 'A row of promo cards with a picture, a headline and a button — like “Brands & Offers”.' },
  { kind: 'service-row', icon: Rows3, name: 'Service row', blurb: 'A row of bookable services you pick. Price, “Instant” and rating are read live — like “Appliance repair & service”.' },
];

function contentSummary(section) {
  if (!section.tiles) return null;
  const { total, active } = section.tiles;
  const noun = section.kind === 'brand-cards' ? (total === 1 ? 'card' : 'cards') : total === 1 ? 'service' : 'services';
  if (!total) return section.kind === 'most-booked' ? 'Filled automatically from bookings' : `No ${noun} yet`;
  return active === total ? `${total} ${noun}` : `${active} of ${total} ${noun} visible`;
}

function SectionDialog({ section, onClose, onSaved }) {
  const adding = !section;
  const [kind, setKind] = useState('brand-cards');
  const [title, setTitle] = useState(section?.title || '');
  const [seeAllLink, setSeeAllLink] = useState(section?.seeAllLink || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const effectiveKind = adding ? kind : section.kind;
  const headingShown = adding || section.headingShown;

  const save = async (e) => {
    e.preventDefault();
    setError('');
    if (!title.trim()) return setError('Give the section a heading.');
    setBusy(true);
    try {
      if (adding) {
        const body = { kind, title: title.trim(), ...(kind === 'service-row' && seeAllLink.trim() ? { seeAllLink: seeAllLink.trim() } : {}) };
        const created = await apiRequest('/cms/home-layout', { method: 'POST', auth: true, body });
        onSaved('Section added at the bottom of the home screen.', created);
      } else {
        const body = { title: title.trim(), ...(section.kind === 'service-row' ? { seeAllLink: seeAllLink.trim() } : {}) };
        await apiRequest(`/cms/home-layout/${section.id}`, { method: 'PUT', auth: true, body });
        onSaved('Section updated.');
      }
    } catch (err) {
      setError(err.message || 'Could not save the section.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={adding ? 'Add a section' : 'Edit section'} subtitle="Customer home screen" onClose={onClose} width="max-w-lg">
      <form onSubmit={save} className="space-y-4">
        {adding && (
          <Field label="What kind of section?" group>
            <div className="grid gap-2">
              {KIND_CHOICES.map((c) => (
                <label key={c.kind} className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer ${kind === c.kind ? 'border-[#0D47A1] bg-blue-50/50' : 'border-slate-200 hover:bg-slate-50'}`}>
                  <input type="radio" name="section-kind" value={c.kind} checked={kind === c.kind} onChange={() => setKind(c.kind)} className="mt-1" />
                  <span>
                    <span className="flex items-center gap-1.5 text-sm font-extrabold text-slate-800"><c.icon size={15} /> {c.name}</span>
                    <span className="block text-xs text-slate-500 mt-0.5">{c.blurb}</span>
                  </span>
                </label>
              ))}
            </div>
          </Field>
        )}
        <Field label={headingShown ? 'Heading shown to customers *' : 'Name (for the console only)'} hint={headingShown ? undefined : 'This section shows no heading to customers; the name only labels it here.'}>
          <input className={inputClass} value={title} maxLength={60} onChange={(e) => setTitle(e.target.value)} placeholder={effectiveKind === 'service-row' ? 'e.g. Festive deep cleaning' : 'e.g. Summer deals'} aria-label="Section heading" />
        </Field>
        {effectiveKind === 'service-row' && (
          <Field label="“See all” link (optional)" hint="Where the button on the right of the heading goes — an in-app path like /services, or a full https:// address. Leave empty for no button.">
            <input className={inputClass} value={seeAllLink} onChange={(e) => setSeeAllLink(e.target.value)} placeholder="/services" aria-label="See all link" />
          </Field>
        )}
        {section?.builtIn && section.defaultTitle && title !== section.defaultTitle && (
          <button type="button" onClick={() => setTitle(section.defaultTitle)} className="text-xs font-bold text-[#0D47A1] cursor-pointer">Reset to “{section.defaultTitle}”</button>
        )}
        <ErrorNote message={error} />
        <div className="flex justify-end gap-2">
          <SecondaryButton type="button" onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton type="submit" disabled={busy}>{busy ? <Loader2 size={14} className="animate-spin" /> : null} {adding ? 'Add section' : 'Save'}</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

export default function HomeLayoutEditor({ onToast, onOpenTab }) {
  const navigate = useNavigate();
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [working, setWorking] = useState(false);
  const [dialog, setDialog] = useState(null); // { section } | { section: null } = add
  const [managing, setManaging] = useState(null); // a custom section whose content is being edited

  const load = useCallback(async () => {
    try {
      setSections(await apiRequest('/cms/home-layout/admin', { auth: true }));
      setError('');
    } catch (err) {
      setError(err.message || 'Could not load the home layout.');
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
      const ids = sections.map((s) => s.id);
      const [id] = ids.splice(index, 1);
      ids.splice(index + delta, 0, id);
      await apiRequest('/cms/home-layout/reorder', { method: 'PUT', auth: true, body: { ids } });
    }, 'Order saved.');
  const toggle = (s) => run(() => apiRequest(`/cms/home-layout/${s.id}`, { method: 'PUT', auth: true, body: { isActive: !s.isActive } }), s.isActive ? `“${s.title}” is now hidden from customers.` : `“${s.title}” is now visible to customers.`);
  const remove = (s) =>
    window.confirm(`Delete the “${s.title}” section${s.tiles?.total ? ` and its ${s.tiles.total} ${s.tiles.total === 1 ? 'item' : 'items'}` : ''}? Customers will stop seeing it. This cannot be undone.`) &&
    run(async () => {
      await apiRequest(`/cms/home-layout/${s.id}`, { method: 'DELETE', auth: true });
      if (managing?.id === s.id) setManaging(null);
    }, 'Section deleted.');

  const manage = (s) => {
    if (!s.builtIn) return setManaging(s);
    const target = MANAGE_BUILT_IN[s.kind];
    if (target?.path) navigate(target.path);
    else if (target?.tab) onOpenTab?.(target.tab);
  };

  if (managing) {
    const current = sections.find((s) => s.id === managing.id) || managing;
    return (
      <div className="space-y-4">
        <button type="button" onClick={() => { setManaging(null); load(); }} className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0D47A1] cursor-pointer">
          <ArrowLeft size={14} /> Back to home layout
        </button>
        {current.kind === 'brand-cards' ? (
          <BrandCardsEditor key={current.id} sectionId={current.id} heading={current.title} onToast={onToast} />
        ) : (
          <ServiceTilesEditor key={current.id} placement="appliance-service" sectionId={current.id} heading={current.title} onToast={onToast} />
        )}
      </div>
    );
  }

  const visible = sections.filter((s) => s.isActive);

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl">
          <h2 className="text-base font-extrabold text-slate-800">Home layout</h2>
          <p className="text-xs text-slate-500 mt-1">The customer app’s home screen, top to bottom. Move a section up or down, hide it, rename its heading, or add sections of your own. The search bar and category chips at the very top always stay.</p>
        </div>
        <PrimaryButton type="button" onClick={() => setDialog({ section: null })}>
          <Plus size={14} /> Add a section
        </PrimaryButton>
      </div>

      <ErrorNote message={error} />
      {loading ? (
        <Loader2 className="animate-spin mx-auto text-slate-400" />
      ) : (
        <div className="grid lg:grid-cols-[1fr_260px] gap-5 items-start">
          <ol className="space-y-2" aria-label="Home sections">
            {sections.map((s, i) => {
              const summary = contentSummary(s);
              const target = s.builtIn ? MANAGE_BUILT_IN[s.kind] : { label: s.kind === 'brand-cards' ? 'Manage cards' : 'Manage services' };
              return (
                <li key={s.id} className={`bg-white rounded-2xl border border-slate-200/80 p-3 flex items-center gap-3 ${s.isActive ? '' : 'opacity-60'}`}>
                  <span className="w-7 text-center text-xs font-black text-slate-400">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-extrabold text-slate-800 truncate">
                      {s.title}
                      {!s.builtIn && <span className="ml-2 text-[10px] font-black px-1.5 py-0.5 rounded-md bg-violet-50 text-violet-700 align-middle">Custom</span>}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">
                      {KIND_LABEL[s.kind]}
                      {summary && <span> · {summary}</span>}
                    </p>
                  </div>
                  <span className={`hidden sm:inline text-[10px] font-black px-2 py-1 rounded-full ${s.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{s.isActive ? 'Visible' : 'Hidden'}</span>
                  <div className="flex items-center gap-0.5 flex-wrap justify-end">
                    <button type="button" disabled={working || i === 0} onClick={() => move(i, -1)} aria-label={`Move ${s.title} up`} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"><ArrowUp size={15} /></button>
                    <button type="button" disabled={working || i === sections.length - 1} onClick={() => move(i, 1)} aria-label={`Move ${s.title} down`} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"><ArrowDown size={15} /></button>
                    <button type="button" disabled={working} onClick={() => toggle(s)} aria-label={s.isActive ? `Hide ${s.title}` : `Show ${s.title}`} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer">{s.isActive ? <Eye size={15} /> : <EyeOff size={15} />}</button>
                    {target && (
                      <button type="button" disabled={working} onClick={() => manage(s)} aria-label={`${target.label}: ${s.title}`} className="px-2 py-1.5 rounded-lg text-xs font-bold text-[#0D47A1] hover:bg-blue-50 cursor-pointer inline-flex items-center gap-1"><Wrench size={12} />{target.label}</button>
                    )}
                    <button type="button" disabled={working} onClick={() => setDialog({ section: s })} aria-label={`Rename ${s.title}`} className="px-2 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer">Rename</button>
                    {!s.builtIn && (
                      <button type="button" disabled={working} onClick={() => remove(s)} aria-label={`Delete ${s.title}`} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 cursor-pointer"><Trash2 size={15} /></button>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>

          <aside className="bg-white rounded-2xl border border-slate-200/80 p-4 lg:sticky lg:top-4" aria-label="Order preview">
            <h3 className="text-xs font-extrabold text-slate-800">Order on the customer’s phone</h3>
            <p className="text-[11px] text-slate-400 mb-3">Top to bottom, visible sections only.</p>
            <div className="rounded-[22px] border-2 border-slate-200 bg-slate-50 p-2.5 space-y-1.5">
              <div className="h-5 rounded-md bg-slate-200 text-[9px] font-bold text-slate-500 flex items-center justify-center">Search &amp; category chips</div>
              {visible.map((s) => (
                <div key={s.id} className={`rounded-md px-2 py-1.5 text-[10px] font-bold truncate ${s.builtIn ? 'bg-white text-slate-600 border border-slate-200' : 'bg-violet-50 text-violet-700 border border-violet-100'}`}>{s.title}</div>
              ))}
              {!visible.length && <p className="text-[10px] text-slate-400 px-1 py-2">Every section is hidden.</p>}
            </div>
          </aside>
        </div>
      )}

      {dialog && (
        <SectionDialog
          section={dialog.section}
          onClose={() => setDialog(null)}
          onSaved={(message, created) => {
            setDialog(null);
            onToast?.(message);
            load();
            // A new section is empty: take the admin straight to filling it.
            if (created) setManaging(created);
          }}
        />
      )}
    </div>
  );
}
