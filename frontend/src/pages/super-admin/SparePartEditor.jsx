import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import Sidebar from '../../components/super-admin/Sidebar';
import Topbar from '../../components/super-admin/Topbar';
import { apiRequest } from '../../lib/apiClient';
import { Field, inputClass, Toggle, ErrorNote, PrimaryButton, SecondaryButton } from '../../components/super-admin/catalogue/ui';
import { Section, ImageGalleryInput, ListInput, KeyValueEditor } from '../../components/super-admin/store/formParts';
import { cleanRows, rupees } from '../../components/super-admin/store/storeFormat';

// Super Admin → Inventory → Add / Edit spare part (docs/master-catalogue
// Phase 21): identity, pictures, what it fits, pricing (cost + markup → the
// price a partner charges), stock controls, supplier and storage.
// Stock after creation changes from the part's page (restock / issue /
// adjust) so every change lands in its stock history.

const UNITS = ['piece', 'set', 'pair', 'metre', 'litre', 'kg', 'roll'];

const BLANK = {
  name: '',
  brand: '',
  code: '',
  category: '',
  compatibleCategories: [],
  compatibleBrands: [],
  compatibleModels: [],
  description: '',
  images: [],
  specifications: [],
  unit: 'piece',
  warrantyMonths: 0,
  costPrice: '',
  markupPercent: 25,
  gstPercent: 18,
  hsnCode: '',
  stock: '',
  reorderThreshold: 5,
  supplier: '',
  leadTimeDays: '',
  storageLocation: '',
  isActive: true,
};

const toForm = (p) => ({
  ...BLANK,
  ...Object.fromEntries(Object.entries(p).filter(([k]) => k in BLANK && p[k] != null)),
  specifications: (p.specifications || []).map((r) => ({ ...r })),
});

export default function SparePartEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(BLANK);
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [appliances, setAppliances] = useState([]);
  const [brands, setBrands] = useState([]);

  useEffect(() => {
    let alive = true;
    apiRequest('/catalog/categories', { silentError: true })
      .then((list) => alive && setAppliances((list || []).map((c) => ({ key: c.key, name: c.name }))))
      .catch(() => {});
    apiRequest('/catalog/brands', { silentError: true })
      .then((list) => alive && setBrands((list || []).map((b) => b.name)))
      .catch(() => {});
    if (id) {
      apiRequest(`/super-admin/spare-parts/${id}`, { auth: true })
        .then((p) => alive && setForm(toForm(p)))
        .catch((err) => alive && setError(err.message || 'Could not load the part.'))
        .finally(() => alive && setLoading(false));
    }
    return () => {
      alive = false;
    };
  }, [id]);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e?.target ? e.target.value : e }));
  const pricing = useMemo(() => {
    const cost = Number(form.costPrice) || 0;
    const retail = cost + (cost * (Number(form.markupPercent) || 0)) / 100;
    return { retail, margin: retail - cost, withGst: retail * (1 + (Number(form.gstPercent) || 0) / 100) };
  }, [form.costPrice, form.markupPercent, form.gstPercent]);

  const toggleCompatible = (key) =>
    setForm((f) => ({
      ...f,
      compatibleCategories: f.compatibleCategories.includes(key) ? f.compatibleCategories.filter((k) => k !== key) : [...f.compatibleCategories, key],
    }));

  const save = async (e) => {
    e.preventDefault();
    setError('');
    const body = {
      name: form.name.trim(),
      brand: form.brand.trim(),
      code: form.code.trim(),
      category: form.category,
      compatibleCategories: form.compatibleCategories.filter((k) => k !== form.category),
      compatibleBrands: form.compatibleBrands,
      compatibleModels: form.compatibleModels,
      description: form.description.trim(),
      images: form.images,
      specifications: cleanRows(form.specifications),
      unit: form.unit,
      warrantyMonths: Number(form.warrantyMonths) || 0,
      costPrice: Number(form.costPrice) || 0,
      markupPercent: Number(form.markupPercent) || 0,
      gstPercent: Number(form.gstPercent) || 0,
      hsnCode: form.hsnCode.trim(),
      reorderThreshold: Number(form.reorderThreshold) || 0,
      supplier: form.supplier.trim(),
      ...(form.leadTimeDays !== '' ? { leadTimeDays: Number(form.leadTimeDays) } : {}),
      storageLocation: form.storageLocation.trim(),
      isActive: form.isActive,
      ...(id ? {} : { stock: Number(form.stock) || 0 }),
    };
    setSaving(true);
    try {
      const saved = id
        ? await apiRequest(`/super-admin/spare-parts/${id}`, { method: 'PUT', auth: true, body })
        : await apiRequest('/super-admin/spare-parts', { method: 'POST', auth: true, body });
      navigate(`/super-admin/inventory/${saved.id}`, { state: { toast: id ? 'Part updated.' : 'Part added.' } });
    } catch (err) {
      setError(err.message || 'Could not save the part.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex text-slate-800">
      <Sidebar />
      <div className="flex-1 ml-64 min-h-screen flex flex-col min-w-0">
        <Topbar title={id ? `Edit ${form.name || 'part'}` : 'Add spare part'} subtitle="Central inventory — what partners can use on a job" />
        {loading ? (
          <div className="p-10 text-center text-slate-400">
            <Loader2 className="animate-spin mx-auto" />
          </div>
        ) : (
          <form onSubmit={save} className="p-6 space-y-5 max-w-5xl w-full">
            <Link to={id ? `/super-admin/inventory/${id}` : '/super-admin/inventory'} className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-[#0D47A1]">
              <ArrowLeft size={14} /> Back
            </Link>

            <Section title="Part details">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Part name *" className="md:col-span-2">
                  <input required className={inputClass} value={form.name} onChange={set('name')} placeholder="e.g. RO Membrane 80 GPD" />
                </Field>
                <Field label="Brand" hint="Maker of the part">
                  <input className={inputClass} list="part-brands" value={form.brand} onChange={set('brand')} placeholder="e.g. Kent" />
                  <datalist id="part-brands">
                    {brands.map((b) => (
                      <option key={b} value={b} />
                    ))}
                  </datalist>
                </Field>
                <Field label="Part number">
                  <input className={`${inputClass} font-mono`} value={form.code} onChange={set('code')} placeholder="e.g. KNT-MEM-80" />
                </Field>
                <Field label="Main appliance *" hint="A partner's job on this appliance lists the part">
                  <select required className={inputClass} value={form.category} onChange={set('category')}>
                    <option value="">Choose…</option>
                    {appliances.map((a) => (
                      <option key={a.key} value={a.key}>{a.name}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Unit">
                  <select className={inputClass} value={form.unit} onChange={set('unit')}>
                    {UNITS.map((u) => (
                      <option key={u}>{u}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Description" className="md:col-span-2">
                  <textarea rows={4} className={inputClass} value={form.description} onChange={set('description')} placeholder="What it is, where it goes, fitting notes…" />
                </Field>
              </div>
            </Section>

            <Section title="Pictures">
              <ImageGalleryInput value={form.images} onChange={set('images')} label="part pictures" />
            </Section>

            <Section title="Fits" hint="Other appliances, brands and models this part works with — partners see it on those jobs too.">
              <Field label="Also fits these appliances" group>
                <div className="flex flex-wrap gap-1.5">
                  {appliances.filter((a) => a.key !== form.category).map((a) => {
                    const on = form.compatibleCategories.includes(a.key);
                    return (
                      <button
                        key={a.key}
                        type="button"
                        aria-pressed={on}
                        onClick={() => toggleCompatible(a.key)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer ${on ? 'bg-[#0D47A1] text-white border-[#0D47A1]' : 'bg-white text-slate-600 border-slate-200 hover:border-[#0D47A1]'}`}
                      >
                        {a.name}
                      </button>
                    );
                  })}
                </div>
              </Field>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Compatible brands" group>
                  <ListInput value={form.compatibleBrands} onChange={set('compatibleBrands')} label="compatible brand" placeholder="e.g. Aquaguard — press Enter" />
                </Field>
                <Field label="Compatible models" group>
                  <ListInput value={form.compatibleModels} onChange={set('compatibleModels')} max={100} label="compatible model" placeholder="e.g. Kent Grand — press Enter" />
                </Field>
              </div>
            </Section>

            <Section title="Specifications">
              <KeyValueEditor value={form.specifications} onChange={set('specifications')} labelPlaceholder="e.g. Flow rate" valuePlaceholder="e.g. 80 GPD" />
            </Section>

            <Section title="Pricing" hint="A partner's job bills the part at the selling price.">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Field label="Cost price (₹) *">
                  <input required type="number" min={0} step="0.01" className={inputClass} value={form.costPrice} onChange={set('costPrice')} />
                </Field>
                <Field label="Markup %">
                  <input type="number" min={0} className={inputClass} value={form.markupPercent} onChange={set('markupPercent')} />
                </Field>
                <Field label="GST %">
                  <input type="number" min={0} max={28} className={inputClass} value={form.gstPercent} onChange={set('gstPercent')} />
                </Field>
                <Field label="HSN code">
                  <input className={`${inputClass} font-mono`} value={form.hsnCode} onChange={set('hsnCode')} placeholder="e.g. 8421" />
                </Field>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                {[
                  ['Selling price', rupees(pricing.retail)],
                  ['Margin per unit', rupees(pricing.margin)],
                  ['With GST', rupees(pricing.withGst)],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl bg-slate-50 border border-slate-200/70 py-2.5">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">{label}</p>
                    <p className="text-sm font-black text-slate-900">{value}</p>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Stock, supplier & warranty">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {!id && (
                  <Field label="Opening stock">
                    <input type="number" min={0} className={inputClass} value={form.stock} onChange={set('stock')} />
                  </Field>
                )}
                <Field label="Re-order at">
                  <input type="number" min={0} className={inputClass} value={form.reorderThreshold} onChange={set('reorderThreshold')} />
                </Field>
                <Field label="Storage bin">
                  <input className={inputClass} value={form.storageLocation} onChange={set('storageLocation')} placeholder="e.g. Rack B-3" />
                </Field>
                <Field label="Warranty (months)">
                  <input type="number" min={0} className={inputClass} value={form.warrantyMonths} onChange={set('warrantyMonths')} />
                </Field>
                <Field label="Supplier" className="col-span-2">
                  <input className={inputClass} value={form.supplier} onChange={set('supplier')} placeholder="e.g. Nigam Spares Ltd" />
                </Field>
                <Field label="Lead time (days)">
                  <input type="number" min={0} className={inputClass} value={form.leadTimeDays} onChange={set('leadTimeDays')} />
                </Field>
              </div>
              {id && <p className="text-[11px] text-slate-400">To change the stock, use Restock / Issue / Adjust on the part&apos;s page — it keeps a history.</p>}
            </Section>

            <div className="sticky bottom-0 bg-[#F8FAFC]/95 backdrop-blur py-3 flex items-center justify-between gap-3 border-t border-slate-200">
              <Toggle checked={form.isActive} onChange={set('isActive')} label={form.isActive ? 'Available to partners' : 'Hidden from partners'} />
              <div className="flex items-center gap-2">
                <ErrorNote message={error} />
                <SecondaryButton type="button" onClick={() => navigate(-1)}>
                  Cancel
                </SecondaryButton>
                <PrimaryButton type="submit" disabled={saving}>
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} {id ? 'Save changes' : 'Add part'}
                </PrimaryButton>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
