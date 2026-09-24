import { useEffect, useState } from 'react';
import { X, Plus, Trash2, BadgeIndianRupee, Lock } from 'lucide-react';
import { catalogueAdmin, formatINR, PRICING_UNIT_LABELS } from '../../../lib/catalogueAdminApi';
import { Field, inputClass, Toggle, ErrorNote, PrimaryButton, SecondaryButton, DemoBadge, StatusPill } from './ui';
import { listToText, textToList } from './listText';
import RateHistoryPanel from './RateHistoryPanel';

// Create / edit one Service Offering — every field from the client brief
// (Req 20). An offering's code and the combination it prices are fixed once
// it exists; its money only changes through "Change price / payout" so every
// change is versioned. Everything else is editable here.

const TABS = [
  { id: 'basics', label: 'Basics' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'content', label: 'Content' },
  { id: 'info', label: 'Required info' },
  { id: 'availability', label: 'Availability' },
  { id: 'internal', label: 'Internal' },
  { id: 'history', label: 'History', editOnly: true },
];

const toDateInput = (value) => (value ? new Date(value).toISOString().slice(0, 10) : '');
const fromDateInput = (value) => (value ? new Date(`${value}T00:00:00`).toISOString() : null);
const keyFromLabel = (label) => label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

function blankForm() {
  return {
    bookingType: 'PRODUCT_LINKED',
    productType: '',
    variant: '',
    service: '',
    name: '',
    code: '',
    pricingUnit: 'PER_UNIT',
    unitLabel: 'per unit',
    minQty: 1,
    maxQty: 5,
    expressEnabled: true,
    gstOverride: '',
    sacCode: '',
    estimatedDurationMins: '',
    description: '',
    included: '',
    excluded: '',
    customerInstructions: '',
    keywords: '',
    requiredInfo: [],
    isActive: true,
    displayOrder: 0,
    serviceabilityMode: 'ALL',
    cities: [],
    availableFrom: '',
    availableUntil: '',
    internalNotes: '',
    rate: { customerPrice: '', spPayout: '', expressFee: '99', expressSpIncentive: '0' },
  };
}

function formFromOffering(o) {
  return {
    ...blankForm(),
    bookingType: o.bookingType,
    productType: o.productType?.id || '',
    variant: o.variant?.id || '',
    service: o.service?.id || '',
    name: o.name,
    code: o.code,
    pricingUnit: o.pricingUnit,
    unitLabel: o.unitLabel,
    minQty: o.minQty,
    maxQty: o.maxQty,
    expressEnabled: Boolean(o.express?.enabled),
    gstOverride: o.tax?.gstPercent ?? '',
    sacCode: o.tax?.sacCode || '',
    estimatedDurationMins: o.estimatedDurationMins ?? '',
    description: o.description || '',
    included: listToText(o.included),
    excluded: listToText(o.excluded),
    customerInstructions: o.customerInstructions || '',
    keywords: listToText(o.keywords, ', '),
    requiredInfo: (o.requiredInfo || []).map((r) => ({ ...r, options: listToText(r.options, ', ') })),
    isActive: o.isActive,
    displayOrder: o.displayOrder ?? 0,
    serviceabilityMode: o.serviceability?.mode || 'ALL',
    cities: o.serviceability?.cities || [],
    availableFrom: toDateInput(o.availableFrom),
    availableUntil: toDateInput(o.availableUntil),
    internalNotes: o.internalNotes || '',
  };
}

/** The editable, non-commercial fields in the backend's shape. */
function contentBody(form) {
  return {
    name: form.name.trim(),
    pricingUnit: form.pricingUnit,
    unitLabel: form.unitLabel.trim(),
    minQty: Number(form.minQty) || 1,
    maxQty: Number(form.maxQty) || 1,
    express: { enabled: form.expressEnabled },
    tax: { gstPercent: form.gstOverride === '' ? null : Number(form.gstOverride), sacCode: form.sacCode.trim() },
    estimatedDurationMins: form.estimatedDurationMins === '' ? null : Number(form.estimatedDurationMins),
    description: form.description.trim(),
    included: textToList(form.included),
    excluded: textToList(form.excluded),
    customerInstructions: form.customerInstructions.trim(),
    keywords: textToList(form.keywords, { commas: true }),
    requiredInfo: form.requiredInfo
      .filter((r) => r.label.trim())
      .map((r) => ({
        key: r.key || keyFromLabel(r.label),
        label: r.label.trim(),
        type: r.type,
        options: r.type === 'select' ? textToList(r.options, { commas: true }) : [],
        required: Boolean(r.required),
      })),
    displayOrder: Number(form.displayOrder) || 0,
    serviceability: { mode: form.serviceabilityMode, cities: form.serviceabilityMode === 'CITIES' ? form.cities : [] },
    availableFrom: fromDateInput(form.availableFrom),
    availableUntil: fromDateInput(form.availableUntil),
    internalNotes: form.internalNotes.trim(),
  };
}

export default function OfferingEditor({ mode, offeringId, categoryId, structure, cities, onClose, onSaved, onChangeRate, rateVersionKey }) {
  const isCreate = mode === 'create';
  const [tab, setTab] = useState('basics');
  const [offering, setOffering] = useState(null);
  const [form, setForm] = useState(blankForm);
  const [nameTouched, setNameTouched] = useState(false);
  const [codeTouched, setCodeTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e?.target ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value) : e }));

  // Load the offering when editing (and again after a rate change elsewhere).
  useEffect(() => {
    if (isCreate) return undefined;
    let alive = true;
    catalogueAdmin
      .getOffering(offeringId)
      .then((o) => {
        if (!alive) return;
        setOffering(o);
        setForm(formFromOffering(o));
      })
      .catch((err) => alive && setError(err.message || 'Could not load this offering.'));
    return () => {
      alive = false;
    };
  }, [isCreate, offeringId, rateVersionKey]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // ── Create: selections drive the variant/option lists, name and code ─────
  const productTypes = structure?.productTypes || [];
  const services = structure?.services || [];
  const selectedPT = productTypes.find((pt) => pt.id === form.productType);
  const selectedService = services.find((s) => s.id === form.service);
  const variantChoices = form.bookingType === 'PRODUCT_LINKED' ? selectedPT?.variants || [] : selectedService?.options || [];
  const variantLabel = variantChoices.find((v) => v.id === form.variant)?.label;

  const suggestedName = (form.bookingType === 'PRODUCT_LINKED'
    ? [selectedPT?.name, variantLabel, selectedService?.name]
    : [selectedService?.name, variantLabel && `(${variantLabel})`]
  ).filter(Boolean).join(' ');
  // Until the admin types a name, it follows the selections.
  const name = isCreate && !nameTouched ? suggestedName : form.name;

  useEffect(() => {
    if (!isCreate || codeTouched || !form.service) return undefined;
    let alive = true;
    catalogueAdmin
      .suggestCode({
        category: categoryId,
        productType: form.bookingType === 'PRODUCT_LINKED' ? form.productType : undefined,
        variant: form.variant || undefined,
        service: form.service,
      })
      .then((res) => alive && setForm((f) => ({ ...f, code: res.code })))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [isCreate, codeTouched, categoryId, form.bookingType, form.productType, form.variant, form.service]);

  const save = async (e) => {
    e.preventDefault();
    setError('');
    if (Number(form.minQty) > Number(form.maxQty)) {
      setTab('pricing');
      return setError('Maximum quantity cannot be less than minimum quantity.');
    }
    setSaving(true);
    try {
      let saved;
      if (isCreate) {
        if (!form.service) throw new Error('Choose a service on the Basics tab.');
        if (form.bookingType === 'PRODUCT_LINKED' && !form.productType) throw new Error('Choose a product type on the Basics tab.');
        if (form.rate.customerPrice === '' || form.rate.spPayout === '') {
          setTab('pricing');
          throw new Error('Enter the customer price and SP payout on the Pricing tab.');
        }
        saved = await catalogueAdmin.createOffering({
          ...contentBody({ ...form, name }),
          code: form.code.trim() || undefined,
          bookingType: form.bookingType,
          category: categoryId,
          productType: form.bookingType === 'PRODUCT_LINKED' ? form.productType : null,
          variant: form.variant || null,
          service: form.service,
          isActive: form.isActive,
          initialRate: {
            customerPrice: Number(form.rate.customerPrice),
            spPayout: Number(form.rate.spPayout),
            expressFee: Number(form.rate.expressFee) || 0,
            expressSpIncentive: Number(form.rate.expressSpIncentive) || 0,
          },
        });
      } else {
        saved = await catalogueAdmin.updateOffering(offeringId, contentBody(form));
      }
      onSaved(saved);
    } catch (err) {
      setError(err.message || 'Could not save this offering.');
      setSaving(false);
    }
  };

  const toggleActive = async (next) => {
    if (isCreate) return setForm((f) => ({ ...f, isActive: next }));
    try {
      const updated = await catalogueAdmin.setOfferingStatus(offeringId, next);
      setOffering(updated);
      setForm((f) => ({ ...f, isActive: updated.isActive }));
      onSaved(updated, { keepOpen: true });
    } catch (err) {
      setError(err.message || 'Could not change status.');
    }
  };

  const perService = form.pricingUnit === 'PER_SERVICE';
  const loading = !isCreate && !offering && !error;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30 animate-in fade-in duration-150" onMouseDown={onClose}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={isCreate ? 'New offering' : `Edit ${offering?.code || 'offering'}`}
        className="w-full max-w-2xl h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-200"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="p-5 border-b border-slate-100 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{isCreate ? 'New offering' : 'Offering'}</p>
            <h2 className="text-lg font-extrabold text-slate-800 truncate">{isCreate ? name || 'Untitled offering' : offering?.name || 'Loading…'}</h2>
            {!isCreate && offering && (
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <code className="text-[11px] font-bold text-[#0D47A1] bg-blue-50 px-1.5 py-0.5 rounded">{offering.code}</code>
                <StatusPill active={offering.isActive} />
                {offering.needsRateReview && <DemoBadge />}
              </div>
            )}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer">
            <X size={20} />
          </button>
        </header>

        <nav className="px-5 border-b border-slate-100 flex gap-1 overflow-x-auto" role="tablist">
          {TABS.filter((t) => !(t.editOnly && isCreate)).map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`px-3 py-2.5 text-xs font-bold whitespace-nowrap border-b-2 -mb-px cursor-pointer ${
                tab === t.id ? 'border-[#0D47A1] text-[#0D47A1]' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <form onSubmit={save} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {loading && <p className="text-sm text-slate-400">Loading…</p>}

            {!loading && tab === 'basics' && (
              <>
                {isCreate ? (
                  <>
                    <Field label="Booking type" group>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          ['PRODUCT_LINKED', 'Product-linked', 'AC → Split → 1.5 Ton → Installation'],
                          ['STANDALONE', 'Standalone service', 'Electrical → Fan Installation'],
                        ].map(([value, label, example]) => (
                          <button
                            key={value}
                            type="button"
                            disabled={value === 'PRODUCT_LINKED' && productTypes.length === 0}
                            onClick={() => setForm((f) => ({ ...f, bookingType: value, productType: '', variant: '' }))}
                            className={`text-left p-3 rounded-xl border cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                              form.bookingType === value ? 'border-[#0D47A1] bg-blue-50' : 'border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            <span className="block text-sm font-bold text-slate-800">{label}</span>
                            <span className="block text-[11px] text-slate-500 mt-0.5">{example}</span>
                          </button>
                        ))}
                      </div>
                    </Field>
                    {form.bookingType === 'PRODUCT_LINKED' && (
                      <Field label="Product type">
                        <select required value={form.productType} onChange={(e) => setForm((f) => ({ ...f, productType: e.target.value, variant: '' }))} className={inputClass}>
                          <option value="">Choose…</option>
                          {productTypes.map((pt) => (
                            <option key={pt.id} value={pt.id}>{pt.name}{pt.isActive ? '' : ' (off)'}</option>
                          ))}
                        </select>
                      </Field>
                    )}
                    <Field label="Service">
                      <select required value={form.service} onChange={(e) => setForm((f) => ({ ...f, service: e.target.value, ...(f.bookingType === 'STANDALONE' ? { variant: '' } : {}) }))} className={inputClass}>
                        <option value="">Choose…</option>
                        {services.map((s) => (
                          <option key={s.id} value={s.id}>{s.name}{s.isActive ? '' : ' (off)'}</option>
                        ))}
                      </select>
                    </Field>
                    {variantChoices.length > 0 && (
                      <Field
                        label={form.bookingType === 'PRODUCT_LINKED' ? selectedPT?.variantDimension?.label || 'Size' : selectedService?.optionDimension?.label || 'Option'}
                        hint="“Any” makes one offering that applies to every size — e.g. one uninstallation price for all Split AC capacities. A size-specific offering always wins over it."
                      >
                        <select value={form.variant} onChange={set('variant')} className={inputClass}>
                          <option value="">Any (applies to all)</option>
                          {variantChoices.map((v) => (
                            <option key={v.id} value={v.id}>{v.label}</option>
                          ))}
                        </select>
                      </Field>
                    )}
                  </>
                ) : (
                  offering && (
                    <div className="bg-slate-50 rounded-xl p-4 text-sm space-y-1.5">
                      <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-slate-400">
                        <Lock size={11} /> Fixed after creation
                      </p>
                      <p><span className="text-slate-500">Type:</span> <b>{offering.bookingType === 'PRODUCT_LINKED' ? 'Product-linked' : 'Standalone'}</b></p>
                      <p>
                        <span className="text-slate-500">Combination:</span>{' '}
                        <b>{[offering.category?.name, offering.productType?.name, offering.variant?.label || (offering.productType?.hasVariants ? 'Any size' : null), offering.service?.name].filter(Boolean).join(' → ')}</b>
                      </p>
                      <p className="text-[11px] text-slate-500">To offer a different combination, use Duplicate from the table.</p>
                    </div>
                  )
                )}
                <Field label="Offering name" hint="Shown to customers and partners.">
                  <input
                    required
                    value={name}
                    onChange={(e) => {
                      setNameTouched(true);
                      set('name')(e);
                    }}
                    className={inputClass}
                  />
                </Field>
                {isCreate && (
                  <Field label="Offering code" hint="Unique ID, e.g. AC-SPLIT-15T-INSTALL. Suggested automatically; cannot be changed after saving.">
                    <input
                      value={form.code}
                      onChange={(e) => {
                        setCodeTouched(true);
                        setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }));
                      }}
                      className={`${inputClass} font-mono`}
                      pattern="[A-Z0-9]+(-[A-Z0-9]+)*"
                    />
                  </Field>
                )}
              </>
            )}

            {!loading && tab === 'pricing' && (
              <>
                {isCreate ? (
                  <div className="grid grid-cols-2 gap-3 bg-blue-50/50 border border-blue-100 rounded-xl p-4">
                    <p className="col-span-2 text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <BadgeIndianRupee size={14} className="text-[#0D47A1]" /> Initial rate (per unit, before GST)
                    </p>
                    {[
                      ['customerPrice', 'Customer price (₹)'],
                      ['spPayout', 'SP fixed payout (₹)'],
                      ['expressFee', 'Express fee (₹)'],
                      ['expressSpIncentive', 'Express SP incentive (₹)'],
                    ].map(([field, label]) => (
                      <Field key={field} label={label}>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          required={field === 'customerPrice' || field === 'spPayout'}
                          value={form.rate[field]}
                          onChange={(e) => setForm((f) => ({ ...f, rate: { ...f.rate, [field]: e.target.value } }))}
                          className={inputClass}
                        />
                      </Field>
                    ))}
                  </div>
                ) : (
                  offering && (
                    <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-bold text-slate-700">Current rate {offering.rate ? `(v${offering.rate.version})` : ''}</p>
                        <PrimaryButton type="button" onClick={() => onChangeRate(offering)} disabled={!offering.rate}>
                          <BadgeIndianRupee size={14} /> Change price / payout
                        </PrimaryButton>
                      </div>
                      {offering.rate ? (
                        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                          {[
                            ['Customer price', offering.rate.customerPrice],
                            ['SP payout', offering.rate.spPayout],
                            ['Express fee', offering.rate.expressFee],
                            ['Express incentive', offering.rate.expressSpIncentive],
                          ].map(([label, value]) => (
                            <div key={label}>
                              <dt className="text-[10px] uppercase font-bold text-slate-400">{label}</dt>
                              <dd className="font-extrabold text-slate-800">{formatINR(value)}</dd>
                            </div>
                          ))}
                        </dl>
                      ) : (
                        <p className="text-xs text-red-600">No active rate — this offering is not bookable.</p>
                      )}
                      <p className="text-xs text-slate-500">
                        Customer pays {formatINR(offering.finalPrice)} incl. {offering.gstPercent}% GST · NCC margin {offering.marginPercent ?? '—'}%
                      </p>
                      {offering.nextRate && (
                        <p className="text-xs text-amber-800 bg-amber-50 rounded-lg px-3 py-2">
                          Scheduled: {formatINR(offering.nextRate.customerPrice)} / SP {formatINR(offering.nextRate.spPayout)} from{' '}
                          {new Date(offering.nextRate.effectiveFrom).toLocaleString('en-IN')}
                        </p>
                      )}
                    </div>
                  )
                )}

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Pricing unit">
                    <select value={form.pricingUnit} onChange={set('pricingUnit')} className={inputClass}>
                      {Object.entries(PRICING_UNIT_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Unit label" hint='Shown next to the price, e.g. "per AC", "per fan".'>
                    <input value={form.unitLabel} onChange={set('unitLabel')} className={inputClass} />
                  </Field>
                  <Field label="Minimum quantity">
                    <input type="number" min="1" disabled={perService} value={perService ? 1 : form.minQty} onChange={set('minQty')} className={inputClass} />
                  </Field>
                  <Field label="Maximum quantity" hint={perService ? 'Per-visit services are always booked one at a time.' : undefined}>
                    <input type="number" min="1" disabled={perService} value={perService ? 1 : form.maxQty} onChange={set('maxQty')} className={inputClass} />
                  </Field>
                  <Field label="GST override (%)" hint="Leave empty to use the platform default.">
                    <input type="number" min="0" max="100" step="0.01" value={form.gstOverride} onChange={set('gstOverride')} className={inputClass} placeholder="Default" />
                  </Field>
                  <Field label="SAC code">
                    <input value={form.sacCode} onChange={set('sacCode')} className={inputClass} placeholder="998719" />
                  </Field>
                </div>
                <Toggle checked={form.expressEnabled} onChange={(v) => setForm((f) => ({ ...f, expressEnabled: v }))} label="Express / instant booking available" />
              </>
            )}

            {!loading && tab === 'content' && (
              <>
                <Field label="Service description">
                  <textarea rows={3} value={form.description} onChange={set('description')} className={inputClass} />
                </Field>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Field label="What's included" hint="One item per line.">
                    <textarea rows={5} value={form.included} onChange={set('included')} className={inputClass} />
                  </Field>
                  <Field label="What's not included" hint="One item per line.">
                    <textarea rows={5} value={form.excluded} onChange={set('excluded')} className={inputClass} />
                  </Field>
                </div>
                <Field label="Customer instructions" hint="Shown before booking and to the partner on the job.">
                  <textarea rows={2} value={form.customerInstructions} onChange={set('customerInstructions')} className={inputClass} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Estimated duration (minutes)">
                    <input type="number" min="0" value={form.estimatedDurationMins} onChange={set('estimatedDurationMins')} className={inputClass} />
                  </Field>
                  <Field label="Search keywords" hint="Comma separated.">
                    <input value={form.keywords} onChange={set('keywords')} className={inputClass} />
                  </Field>
                </div>
              </>
            )}

            {!loading && tab === 'info' && (
              <>
                <p className="text-xs text-slate-500">Details the customer must give while booking — e.g. “Wall type”, “Fan type”. The partner sees the answers on the job.</p>
                {form.requiredInfo.map((row, i) => (
                  <div key={i} className="grid grid-cols-[1fr_8rem_auto] gap-2 items-start bg-slate-50 rounded-xl p-3">
                    <input
                      aria-label="Question"
                      value={row.label}
                      placeholder="Question, e.g. Wall type"
                      onChange={(e) => setForm((f) => ({ ...f, requiredInfo: f.requiredInfo.map((r, j) => (j === i ? { ...r, label: e.target.value } : r)) }))}
                      className={inputClass}
                    />
                    <select
                      aria-label="Answer type"
                      value={row.type}
                      onChange={(e) => setForm((f) => ({ ...f, requiredInfo: f.requiredInfo.map((r, j) => (j === i ? { ...r, type: e.target.value } : r)) }))}
                      className={inputClass}
                    >
                      <option value="text">Text</option>
                      <option value="number">Number</option>
                      <option value="select">Choice</option>
                      <option value="photo">Photo</option>
                    </select>
                    <button
                      type="button"
                      aria-label="Remove question"
                      onClick={() => setForm((f) => ({ ...f, requiredInfo: f.requiredInfo.filter((_, j) => j !== i) }))}
                      className="p-2.5 text-slate-400 hover:text-red-600 cursor-pointer"
                    >
                      <Trash2 size={15} />
                    </button>
                    {row.type === 'select' && (
                      <input
                        aria-label="Choices"
                        value={row.options}
                        placeholder="Choices, comma separated: Brick, Concrete, Other"
                        onChange={(e) => setForm((f) => ({ ...f, requiredInfo: f.requiredInfo.map((r, j) => (j === i ? { ...r, options: e.target.value } : r)) }))}
                        className={`${inputClass} col-span-3`}
                      />
                    )}
                    <label className="col-span-3 inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
                      <input
                        type="checkbox"
                        checked={Boolean(row.required)}
                        onChange={(e) => setForm((f) => ({ ...f, requiredInfo: f.requiredInfo.map((r, j) => (j === i ? { ...r, required: e.target.checked } : r)) }))}
                      />
                      Required
                    </label>
                  </div>
                ))}
                <SecondaryButton
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, requiredInfo: [...f.requiredInfo, { key: '', label: '', type: 'text', options: '', required: false }] }))}
                >
                  <Plus size={13} /> Add question
                </SecondaryButton>
              </>
            )}

            {!loading && tab === 'availability' && (
              <>
                <Toggle checked={form.isActive} onChange={toggleActive} label={form.isActive ? 'Active — customers can book it' : 'Inactive — hidden from customers'} />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Available from" hint="Optional launch date.">
                    <input type="date" value={form.availableFrom} onChange={set('availableFrom')} className={inputClass} />
                  </Field>
                  <Field label="Available until" hint="Optional end date (seasonal).">
                    <input type="date" value={form.availableUntil} onChange={set('availableUntil')} className={inputClass} />
                  </Field>
                  <Field label="Display order" hint="Lower shows first.">
                    <input type="number" value={form.displayOrder} onChange={set('displayOrder')} className={inputClass} />
                  </Field>
                </div>
                <Field label="Serviceability" group>
                  <div className="flex gap-4 text-sm">
                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input type="radio" checked={form.serviceabilityMode === 'ALL'} onChange={() => setForm((f) => ({ ...f, serviceabilityMode: 'ALL' }))} /> All cities
                    </label>
                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input type="radio" checked={form.serviceabilityMode === 'CITIES'} onChange={() => setForm((f) => ({ ...f, serviceabilityMode: 'CITIES' }))} /> Only selected cities
                    </label>
                  </div>
                </Field>
                {form.serviceabilityMode === 'CITIES' && (
                  <div className="flex flex-wrap gap-2">
                    {cities.length === 0 && <p className="text-xs text-slate-400">No cities configured — add them under Cities.</p>}
                    {cities.map((city) => {
                      const on = form.cities.includes(city);
                      return (
                        <button
                          key={city}
                          type="button"
                          aria-pressed={on}
                          onClick={() => setForm((f) => ({ ...f, cities: on ? f.cities.filter((c) => c !== city) : [...f.cities, city] }))}
                          className={`px-3 py-1 rounded-full text-xs font-semibold border cursor-pointer ${on ? 'bg-[#0D47A1] text-white border-[#0D47A1]' : 'bg-white text-slate-600 border-slate-200'}`}
                        >
                          {city}
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {!loading && tab === 'internal' && (
              <Field label="Internal notes" hint="Admin only — never shown to customers or partners.">
                <textarea rows={6} value={form.internalNotes} onChange={set('internalNotes')} className={inputClass} />
              </Field>
            )}

            {!loading && tab === 'history' && offering && <RateHistoryPanel offeringId={offering.id} refreshKey={rateVersionKey} />}
          </div>

          <footer className="p-4 border-t border-slate-100 space-y-3">
            <ErrorNote message={error} />
            <div className="flex justify-end gap-2">
              <SecondaryButton type="button" onClick={onClose}>Close</SecondaryButton>
              {tab !== 'history' && (
                <PrimaryButton type="submit" disabled={saving || loading}>{saving ? 'Saving…' : isCreate ? 'Create offering' : 'Save changes'}</PrimaryButton>
              )}
            </div>
          </footer>
        </form>
      </aside>
    </div>
  );
}
