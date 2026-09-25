import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import Sidebar from '../../components/super-admin/Sidebar';
import Topbar from '../../components/super-admin/Topbar';
import { apiRequest } from '../../lib/apiClient';
import { Field, inputClass, Toggle, ErrorNote, PrimaryButton, SecondaryButton } from '../../components/super-admin/catalogue/ui';
import { Section, ImageGalleryInput, ListInput, SpecGroupsEditor } from '../../components/super-admin/store/formParts';
import { cleanGroups, rupees } from '../../components/super-admin/store/storeFormat';

// Super Admin → NCC Products → Add / Edit (docs/master-catalogue Phase 20).
// A full listing like a marketplace product page: pictures, highlights,
// description, grouped specifications, what's in the box, warranty and the
// services the customer page shows (returns, pay on delivery, installation).

const BLANK = {
  category: '',
  name: '',
  brand: '',
  modelNumber: '',
  colour: '',
  condition: 'New',
  conditionGrade: '',
  sku: '',
  price: '',
  originalPrice: '',
  stock: '',
  lowStockThreshold: 5,
  images: [],
  specs: [],
  description: '',
  specifications: [],
  inTheBox: [],
  warrantyMonths: 12,
  warrantySummary: '',
  returnDays: 7,
  codAvailable: true,
  installationIncluded: false,
  manufacturer: '',
  countryOfOrigin: 'India',
  isActive: true,
};

const toForm = (p) => ({
  ...BLANK,
  ...Object.fromEntries(Object.entries(p).filter(([k]) => k in BLANK && p[k] != null)),
  images: p.images?.length ? p.images : p.imageUrl ? [p.imageUrl] : [],
  specifications: (p.specifications || []).map((g) => ({ group: g.group, items: g.items.map((i) => ({ ...i })) })),
});

const skuFor = (form) => {
  const part = (s, n) => String(s || '').replace(/[^a-z0-9]/gi, '').slice(0, n).toUpperCase();
  return [part(form.category, 3), part(form.brand, 3), part(form.modelNumber || form.name, 6)].filter(Boolean).join('-');
};
// A generated SKU gets a short random tail so two products with the same
// brand and model (e.g. two colours) never collide.
const newSku = (form) => `${skuFor(form)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

export default function ProductEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(BLANK);
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);

  useEffect(() => {
    let alive = true;
    apiRequest('/product-categories', { silentError: true })
      .then((list) => alive && setCategories((list || []).map((c) => c.name)))
      .catch(() => {});
    apiRequest('/catalog/brands', { silentError: true })
      .then((list) => alive && setBrands((list || []).map((b) => b.name)))
      .catch(() => {});
    if (id) {
      apiRequest(`/products/manage/${id}`, { auth: true })
        .then((p) => alive && setForm(toForm(p)))
        .catch((err) => alive && setError(err.message || 'Could not load the product.'))
        .finally(() => alive && setLoading(false));
    }
    return () => {
      alive = false;
    };
  }, [id]);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e?.target ? e.target.value : e }));
  const discount = useMemo(() => {
    const mrp = Number(form.originalPrice);
    const price = Number(form.price);
    return mrp > price && price > 0 ? Math.round(((mrp - price) / mrp) * 100) : 0;
  }, [form.originalPrice, form.price]);

  const save = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.category) return setError('Pick a store category.');
    if (form.originalPrice !== '' && Number(form.originalPrice) < Number(form.price)) return setError('MRP cannot be lower than the selling price.');
    const body = {
      category: form.category,
      name: form.name.trim(),
      brand: form.brand.trim() || undefined,
      modelNumber: form.modelNumber.trim(),
      colour: form.colour.trim(),
      condition: form.condition,
      conditionGrade: form.condition === 'Refurbished' ? form.conditionGrade.trim() : '',
      sku: form.sku.trim() || newSku(form),
      price: Number(form.price),
      ...(form.originalPrice !== '' ? { originalPrice: Number(form.originalPrice) } : {}),
      stock: Number(form.stock) || 0,
      lowStockThreshold: Number(form.lowStockThreshold) || 0,
      images: form.images,
      specs: form.specs,
      description: form.description.trim(),
      specifications: cleanGroups(form.specifications),
      inTheBox: form.inTheBox,
      warrantyMonths: Number(form.warrantyMonths) || 0,
      warrantySummary: form.warrantySummary.trim(),
      returnDays: Number(form.returnDays) || 0,
      codAvailable: form.codAvailable,
      installationIncluded: form.installationIncluded,
      manufacturer: form.manufacturer.trim(),
      countryOfOrigin: form.countryOfOrigin.trim(),
      isActive: form.isActive,
    };
    setSaving(true);
    try {
      const saved = id
        ? await apiRequest(`/products/${id}`, { method: 'PUT', auth: true, body })
        : await apiRequest('/products', { method: 'POST', auth: true, body });
      navigate(`/super-admin/products/${saved.id}`, { state: { toast: id ? 'Product updated.' : 'Product created.' } });
    } catch (err) {
      setError(err.message || 'Could not save the product.');
    } finally {
      setSaving(false);
    }
  };

  const title = id ? `Edit ${form.name || 'product'}` : 'Add product';

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex text-slate-800">
      <Sidebar />
      <div className="flex-1 ml-64 min-h-screen flex flex-col min-w-0">
        <Topbar title={title} subtitle="NCC Products — what the Buy New store shows for this product" />
        {loading ? (
          <div className="p-10 text-center text-slate-400">
            <Loader2 className="animate-spin mx-auto" />
          </div>
        ) : (
          <form onSubmit={save} className="p-6 space-y-5 max-w-5xl w-full">
            <Link to={id ? `/super-admin/products/${id}` : '/super-admin/products'} className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-[#0D47A1]">
              <ArrowLeft size={14} /> Back
            </Link>

            <Section title="Basic details">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Product name *" className="md:col-span-2">
                  <input required className={inputClass} value={form.name} onChange={set('name')} placeholder="e.g. Voltas 1.5 Ton 5 Star Inverter Split AC" />
                </Field>
                <Field label="Store category *">
                  <select required className={inputClass} value={form.category} onChange={set('category')}>
                    <option value="">Choose…</option>
                    {[...new Set([...categories, form.category].filter(Boolean))].map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Brand" hint="Pick a catalogue brand or type another">
                  <input className={inputClass} list="product-brands" value={form.brand} onChange={set('brand')} placeholder="e.g. Voltas" />
                  <datalist id="product-brands">
                    {brands.map((b) => (
                      <option key={b} value={b} />
                    ))}
                  </datalist>
                </Field>
                <Field label="Model number">
                  <input className={inputClass} value={form.modelNumber} onChange={set('modelNumber')} placeholder="e.g. 185V Vectra" />
                </Field>
                <Field label="Colour">
                  <input className={inputClass} value={form.colour} onChange={set('colour')} placeholder="e.g. White" />
                </Field>
                <Field label="Condition">
                  <select className={inputClass} value={form.condition} onChange={set('condition')}>
                    <option>New</option>
                    <option>Refurbished</option>
                  </select>
                </Field>
                {form.condition === 'Refurbished' && (
                  <Field label="Refurbished grade">
                    <input className={inputClass} value={form.conditionGrade} onChange={set('conditionGrade')} placeholder="e.g. Grade A — like new" />
                  </Field>
                )}
                <Field label="SKU" hint={form.sku ? '' : `Left blank it becomes ${skuFor(form) || '…'}-XXXX`}>
                  <input className={`${inputClass} font-mono`} value={form.sku} onChange={set('sku')} placeholder={skuFor(form)} />
                </Field>
              </div>
            </Section>

            <Section title="Pictures" hint="Shown in the store's gallery; the first is the listing picture.">
              <ImageGalleryInput value={form.images} onChange={set('images')} label="product pictures" />
            </Section>

            <Section title="Price & stock">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Field label="Selling price (₹) *">
                  <input required type="number" min={0} className={inputClass} value={form.price} onChange={set('price')} />
                </Field>
                <Field label="MRP (₹)" hint={discount ? `${discount}% off shown to customers` : 'Leave blank for no discount'}>
                  <input type="number" min={0} className={inputClass} value={form.originalPrice} onChange={set('originalPrice')} />
                </Field>
                <Field label="Stock (units)">
                  <input type="number" min={0} className={inputClass} value={form.stock} onChange={set('stock')} />
                </Field>
                <Field label="Low-stock alert at">
                  <input type="number" min={0} className={inputClass} value={form.lowStockThreshold} onChange={set('lowStockThreshold')} />
                </Field>
              </div>
              {Number(form.price) > 0 && (
                <p className="text-xs text-slate-500">
                  Customer sees <b className="text-slate-800">{rupees(form.price)}</b>
                  {discount > 0 && (
                    <>
                      {' '}
                      <s>{rupees(form.originalPrice)}</s> <b className="text-emerald-600">{discount}% off</b>
                    </>
                  )}
                </p>
              )}
            </Section>

            <Section title="Highlights & description">
              <Field label="Highlights" hint="Short points shown beside the price — up to 12" group>
                <ListInput value={form.specs} onChange={set('specs')} max={12} label="highlight" placeholder="e.g. 5 Star energy rating — press Enter" />
              </Field>
              <Field label="Description">
                <textarea rows={6} className={inputClass} value={form.description} onChange={set('description')} placeholder="What the product is, who it is for, what makes it good…" />
              </Field>
            </Section>

            <Section title="Specifications" hint="Grouped like a marketplace listing: General, Performance, Dimensions, Power…">
              <SpecGroupsEditor value={form.specifications} onChange={set('specifications')} />
            </Section>

            <Section title="In the box">
              <ListInput value={form.inTheBox} onChange={set('inTheBox')} label="box item" placeholder="e.g. Remote control — press Enter" />
            </Section>

            <Section title="Warranty & services" hint="These replace the fixed promises the store page used to show for every product.">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Field label="Warranty (months)">
                  <input type="number" min={0} className={inputClass} value={form.warrantyMonths} onChange={set('warrantyMonths')} />
                </Field>
                <Field label="Return window (days)" hint="0 = not returnable">
                  <input type="number" min={0} max={90} className={inputClass} value={form.returnDays} onChange={set('returnDays')} />
                </Field>
                <div className="md:col-span-2 flex flex-col justify-center gap-2.5 pt-3">
                  <Toggle checked={form.codAvailable} onChange={set('codAvailable')} label="Pay on Delivery available" />
                  <Toggle checked={form.installationIncluded} onChange={set('installationIncluded')} label="Free installation included" />
                </div>
                <Field label="Warranty details" className="col-span-2 md:col-span-4">
                  <input className={inputClass} value={form.warrantySummary} onChange={set('warrantySummary')} placeholder="e.g. 1 year on product, 5 years on compressor" />
                </Field>
              </div>
            </Section>

            <Section title="Manufacturer">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Field label="Manufacturer / importer" className="md:col-span-2">
                  <input className={inputClass} value={form.manufacturer} onChange={set('manufacturer')} placeholder="Name and address" />
                </Field>
                <Field label="Country of origin">
                  <input className={inputClass} value={form.countryOfOrigin} onChange={set('countryOfOrigin')} />
                </Field>
              </div>
            </Section>

            <div className="sticky bottom-0 bg-[#F8FAFC]/95 backdrop-blur py-3 flex items-center justify-between gap-3 border-t border-slate-200">
              <Toggle checked={form.isActive} onChange={set('isActive')} label={form.isActive ? 'Live in the store' : 'Hidden from the store'} />
              <div className="flex items-center gap-2">
                <ErrorNote message={error} />
                <SecondaryButton type="button" onClick={() => navigate(-1)}>
                  Cancel
                </SecondaryButton>
                <PrimaryButton type="submit" disabled={saving}>
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} {id ? 'Save changes' : 'Create product'}
                </PrimaryButton>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
