import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, History, Pencil, AlertTriangle } from 'lucide-react';
import Sidebar from '../../components/super-admin/Sidebar';
import Topbar from '../../components/super-admin/Topbar';
import { apiRequest } from '../../lib/apiClient';
import { catalogueAdmin, formatINR, RATE_FIELD_LABELS } from '../../lib/catalogueAdminApi';
import CatalogueStructure from '../../components/super-admin/catalogue/CatalogueStructure';
import OfferingTable from '../../components/super-admin/catalogue/OfferingTable';
import OfferingEditor from '../../components/super-admin/catalogue/OfferingEditor';
import RateChangeModal from '../../components/super-admin/catalogue/RateChangeModal';
import DuplicateOfferingModal from '../../components/super-admin/catalogue/DuplicateOfferingModal';
import { Modal, Field, inputClass, Toggle, ErrorNote, PrimaryButton, SecondaryButton } from '../../components/super-admin/catalogue/ui';
import { listToText, textToList } from '../../components/super-admin/catalogue/listText';

// Master Service & Offering Catalogue (docs/master-catalogue Phase 3) — the
// single place where what customers can book, what they pay and what the
// partner earns is configured. Replaces the old "Service Catalog" page.

const EMPTY_FILTERS = { q: '', bookingType: '', active: '', needsRateReview: '' };

function CategoryModal({ category, onClose, onSaved }) {
  const isNew = !category;
  const [key, setKey] = useState(category?.key || '');
  const [name, setName] = useState(category?.name || '');
  const [keywords, setKeywords] = useState(listToText(category?.keywords, ', '));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const body = { name: name.trim(), keywords: textToList(keywords, { commas: true }) };
      const saved = isNew
        ? await catalogueAdmin.createCategory({ ...body, key: key.trim() })
        : await catalogueAdmin.updateCategory(category.id, body);
      onSaved(saved);
    } catch (err) {
      setError(err.message || 'Could not save the category.');
      setSaving(false);
    }
  };

  return (
    <Modal title={isNew ? 'New category' : `Edit ${category.name}`} onClose={onClose}>
      <form onSubmit={save} className="space-y-3">
        {isNew && (
          <Field label="Key" hint='Unique and permanent — the app routes by it, e.g. "AC", "Electrician".'>
            <input required autoFocus value={key} onChange={(e) => setKey(e.target.value)} className={inputClass} />
          </Field>
        )}
        <Field label="Display name">
          <input required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Search keywords" hint="Comma separated, e.g. electrician, wiring, switch.">
          <input value={keywords} onChange={(e) => setKeywords(e.target.value)} className={inputClass} />
        </Field>
        <ErrorNote message={error} />
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <SecondaryButton type="button" onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

function RecentChangesModal({ onClose }) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    catalogueAdmin
      .rateChanges({ limit: 50 })
      .then((res) => setItems(res.data))
      .catch((err) => setError(err.message || 'Could not load changes.'));
  }, []);

  return (
    <Modal title="Recent price & payout changes" subtitle="Every rate change across the catalogue, newest first" onClose={onClose} width="max-w-2xl">
      <ErrorNote message={error} />
      {!items && !error && <p className="text-sm text-slate-400">Loading…</p>}
      {items && items.length === 0 && <p className="text-sm text-slate-400">No changes yet — only initial rates exist.</p>}
      {items && items.length > 0 && (
        <ul className="divide-y divide-slate-100">
          {items.map((item) => (
            <li key={item.id} className="py-3 text-sm">
              <p className="flex flex-wrap items-center gap-2">
                <code className="text-[11px] font-bold text-[#0D47A1]">{item.offering?.code}</code>
                <span className="text-slate-700 font-semibold">{item.offering?.name}</span>
                <span className="text-[11px] text-slate-400">v{item.version}</span>
              </p>
              <p className="text-xs text-slate-600 mt-0.5">
                {item.changes.map((c) => `${RATE_FIELD_LABELS[c.field]} ${formatINR(c.from)} → ${formatINR(c.to)}`).join(' · ')}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {item.changedBy?.name || 'Unknown'} · {new Date(item.createdAt).toLocaleString('en-IN')} · from {new Date(item.effectiveFrom).toLocaleDateString('en-IN')} · “{item.reason}”
              </p>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

const MasterCatalogue = () => {
  const [categories, setCategories] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [structure, setStructure] = useState(null);
  const [rows, setRows] = useState([]);
  const [rowsLoading, setRowsLoading] = useState(false);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [query, setQuery] = useState(EMPTY_FILTERS);
  const [focus, setFocus] = useState(null);
  const [cities, setCities] = useState([]);
  const [error, setError] = useState('');

  const [editor, setEditor] = useState(null); // { mode: 'create' | 'edit', offeringId }
  const [rateFor, setRateFor] = useState(null);
  const [duplicateFor, setDuplicateFor] = useState(null);
  const [categoryModal, setCategoryModal] = useState(null); // { category | null }
  const [showChanges, setShowChanges] = useState(false);
  const [rateVersionKey, setRateVersionKey] = useState(0);

  const selected = categories.find((c) => c.id === selectedId);

  const loadCategories = useCallback(async () => {
    try {
      const list = await catalogueAdmin.listCategories();
      setCategories(list);
      setSelectedId((prev) => prev || list.find((c) => c.offerings.total > 0)?.id || list[0]?.id || '');
    } catch (err) {
      setError(err.message || 'Could not load categories.');
    }
  }, []);

  const loadStructure = useCallback(async (id) => {
    if (!id) return setStructure(null);
    try {
      setStructure(await catalogueAdmin.getStructure(id));
    } catch (err) {
      setError(err.message || 'Could not load this category.');
    }
  }, []);

  const loadRows = useCallback(async (id, q) => {
    if (!id) return setRows([]);
    setRowsLoading(true);
    try {
      const res = await catalogueAdmin.listOfferings({ category: id, limit: 100, ...q });
      setRows(res.data);
    } catch (err) {
      setError(err.message || 'Could not load offerings.');
    } finally {
      setRowsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
    apiRequest('/super-admin/cities', { auth: true, silentError: true })
      .then((list) => setCities((Array.isArray(list) ? list : []).filter((c) => (c.status || 'Active') === 'Active').map((c) => c.name)))
      .catch(() => setCities([]));
  }, [loadCategories]);

  // Search text is debounced; the other filters apply immediately.
  useEffect(() => {
    const t = setTimeout(() => setQuery(filters), filters.q === query.q ? 0 : 250);
    return () => clearTimeout(t);
  }, [filters, query.q]);

  useEffect(() => {
    loadStructure(selectedId);
  }, [selectedId, loadStructure]);

  useEffect(() => {
    loadRows(selectedId, query);
  }, [selectedId, query, loadRows]);

  const refreshAll = useCallback(() => {
    loadStructure(selectedId);
    loadRows(selectedId, query);
    loadCategories();
  }, [selectedId, query, loadStructure, loadRows, loadCategories]);

  const visibleRows = useMemo(() => {
    if (!focus) return rows;
    return rows.filter((r) => (focus.kind === 'productType' ? r.productType?.id === focus.id : r.service?.id === focus.id));
  }, [rows, focus]);

  const totals = useMemo(
    () =>
      categories.reduce(
        (acc, c) => ({
          total: acc.total + c.offerings.total,
          active: acc.active + c.offerings.active,
          review: acc.review + c.offerings.needsRateReview,
        }),
        { total: 0, active: 0, review: 0 },
      ),
    [categories],
  );

  const toggleOffering = async (row) => {
    try {
      await catalogueAdmin.setOfferingStatus(row.id, !row.isActive);
      refreshAll();
    } catch (err) {
      setError(err.message || 'Could not change status.');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex text-slate-800 animate-in fade-in duration-150">
      <Sidebar />
      <div className="flex-1 ml-64 min-h-screen flex flex-col min-w-0">
        <Topbar title="Master Catalogue" subtitle="Every bookable service offering — customer price, partner payout, GST and availability in one place" />

        <div className="px-6 pt-5 grid grid-cols-2 xl:grid-cols-4 gap-3">
          {[
            ['Offerings', totals.total],
            ['Live', totals.active],
            ['Demo rates to replace', totals.review],
          ].map(([label, value]) => (
            <div key={label} className="bg-white rounded-2xl border border-[#E2E8F0] p-4">
              <p className="text-[11px] font-bold uppercase text-slate-400">{label}</p>
              <p className={`text-2xl font-extrabold ${label.startsWith('Demo') && value > 0 ? 'text-amber-600' : 'text-slate-800'}`}>{value}</p>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setShowChanges(true)}
            className="bg-white rounded-2xl border border-[#E2E8F0] p-4 text-left hover:border-[#0D47A1] transition-colors cursor-pointer"
          >
            <p className="text-[11px] font-bold uppercase text-slate-400">Audit</p>
            <p className="text-sm font-bold text-[#0D47A1] flex items-center gap-1.5 mt-1.5">
              <History size={15} /> Recent price changes
            </p>
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs font-bold text-red-700 flex items-center justify-between gap-2">
            <span className="flex items-center gap-2"><AlertTriangle size={14} /> {error}</span>
            <button type="button" onClick={() => setError('')} className="underline cursor-pointer">Dismiss</button>
          </div>
        )}

        <div className="p-6 flex-1 flex flex-col xl:flex-row gap-6 min-w-0">
          {/* Category rail */}
          <div className="xl:w-60 shrink-0 space-y-3">
            <PrimaryButton type="button" onClick={() => setCategoryModal({ category: null })} className="w-full justify-center">
              <Plus size={14} /> New category
            </PrimaryButton>
            <nav aria-label="Categories" className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden max-h-[70vh] overflow-y-auto">
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setFocus(null);
                    setSelectedId(c.id);
                  }}
                  aria-current={selectedId === c.id}
                  className={`w-full text-left px-4 py-2.5 text-sm font-semibold border-b border-slate-50 last:border-0 transition-colors cursor-pointer ${
                    selectedId === c.id ? 'bg-[#E3ECF9] text-[#0D47A1]' : 'text-slate-600 hover:bg-slate-50'
                  } ${c.isActive ? '' : 'opacity-50'}`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate">{c.name}</span>
                    {c.offerings.needsRateReview > 0 && (
                      <span title="Offerings with demo rates" className="text-[9px] font-black bg-amber-100 text-amber-800 rounded px-1">{c.offerings.needsRateReview}</span>
                    )}
                  </span>
                  <span className="block text-[10px] font-normal text-slate-400">
                    {c.offerings.active}/{c.offerings.total} offerings live
                  </span>
                </button>
              ))}
            </nav>
          </div>

          {!selected || !structure ? (
            <div className="flex-1 bg-white rounded-2xl border border-[#E2E8F0] p-10 text-center text-slate-400 text-sm">
              {categories.length ? 'Loading…' : 'No categories yet — create one to start.'}
            </div>
          ) : (
            <div className="flex-1 min-w-0 flex flex-col 2xl:flex-row gap-6">
              {/* Structure */}
              <section className="2xl:w-80 shrink-0 bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-4 space-y-4 self-start w-full">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="text-base font-extrabold text-slate-800 truncate">{selected.name}</h2>
                    <p className="text-[11px] text-slate-400">key: {selected.key}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => setCategoryModal({ category: selected })} aria-label="Edit category" className="p-1.5 text-slate-400 hover:text-[#0D47A1] hover:bg-slate-100 rounded-lg cursor-pointer">
                      <Pencil size={14} />
                    </button>
                    <Toggle
                      checked={selected.isActive}
                      onChange={async (next) => {
                        try {
                          await catalogueAdmin.setCategoryStatus(selected.id, next);
                          loadCategories();
                        } catch (err) {
                          setError(err.message || 'Could not change the category.');
                        }
                      }}
                    />
                  </div>
                </div>
                <CatalogueStructure
                  structure={structure}
                  categoryId={selected.id}
                  focus={focus}
                  onFocus={setFocus}
                  onChanged={refreshAll}
                  onError={setError}
                />
              </section>

              {/* Offerings */}
              <section className="flex-1 min-w-0">
                <OfferingTable
                  rows={visibleRows}
                  loading={rowsLoading}
                  filters={filters}
                  onFilters={setFilters}
                  focus={focus}
                  onClearFocus={() => setFocus(null)}
                  onNew={() => setEditor({ mode: 'create' })}
                  onOpen={(row) => setEditor({ mode: 'edit', offeringId: row.id })}
                  onChangeRate={(row) => setRateFor(row)}
                  onToggle={toggleOffering}
                  onDuplicate={(row) => setDuplicateFor(row)}
                />
              </section>
            </div>
          )}
        </div>
      </div>

      {editor && structure && (
        <OfferingEditor
          mode={editor.mode}
          offeringId={editor.offeringId}
          categoryId={selectedId}
          structure={structure}
          cities={cities}
          rateVersionKey={rateVersionKey}
          onClose={() => setEditor(null)}
          onChangeRate={(offering) => setRateFor(offering)}
          onSaved={(saved, { keepOpen } = {}) => {
            refreshAll();
            if (keepOpen) return;
            setEditor(editor.mode === 'create' ? { mode: 'edit', offeringId: saved.id } : null);
          }}
        />
      )}

      {rateFor && (
        <RateChangeModal
          offering={rateFor}
          onClose={() => setRateFor(null)}
          onSaved={() => {
            setRateFor(null);
            setRateVersionKey((k) => k + 1);
            refreshAll();
          }}
        />
      )}

      {duplicateFor && structure && (
        <DuplicateOfferingModal
          row={duplicateFor}
          structure={structure}
          onClose={() => setDuplicateFor(null)}
          onDuplicated={(copy) => {
            setDuplicateFor(null);
            refreshAll();
            setEditor({ mode: 'edit', offeringId: copy.id });
          }}
        />
      )}

      {categoryModal && (
        <CategoryModal
          category={categoryModal.category}
          onClose={() => setCategoryModal(null)}
          onSaved={(saved) => {
            setCategoryModal(null);
            loadCategories();
            if (!categoryModal.category) setSelectedId(saved.id);
          }}
        />
      )}

      {showChanges && <RecentChangesModal onClose={() => setShowChanges(false)} />}
    </div>
  );
};

export default MasterCatalogue;
