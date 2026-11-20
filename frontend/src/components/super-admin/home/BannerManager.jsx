import { useCallback, useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Eye, EyeOff, ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { apiRequest, resolveMediaUrl } from '../../../lib/apiClient';
import { uploadImage } from '../../../lib/uploadImage';
import { Field, inputClass, ErrorNote, PrimaryButton } from '../catalogue/ui';

/**
 * Add, order, hide and delete the banners of one sliding strip on the customer
 * home screen. Used for the main carousel's two sets (segment "non-warranty" /
 * "warranty"), the warranty strip under the categories ("warranty-offers") and
 * for every banner section an admin adds in Home layout (sectionId).
 *
 * Every action is a call to /cms/banners; a failure is shown, never swallowed.
 */
export default function BannerManager({ segment, sectionId, heading, description, onToast }) {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [image, setImage] = useState('');
  const [title, setTitle] = useState('');
  const [link, setLink] = useState('');
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    try {
      const query = sectionId ? `&section=${sectionId}` : '';
      const all = await apiRequest(`/cms/banners/admin?app=customer${query}`, { auth: true });
      const list = Array.isArray(all) ? all : [];
      setBanners(sectionId ? list : list.filter((b) => (b.segment || 'non-warranty') === segment));
      setError('');
    } catch (err) {
      setError(err.message || 'Could not load the banners.');
    } finally {
      setLoading(false);
    }
  }, [sectionId, segment]);

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

  const pick = async (file) => {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      setImage(await uploadImage(file));
    } catch (err) {
      setError(err.message || 'Image upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const publish = (e) => {
    e.preventDefault();
    if (!image) return;
    run(async () => {
      await apiRequest('/cms/banners', {
        method: 'POST',
        auth: true,
        body: {
          imageUrl: image,
          app: 'customer',
          ...(sectionId ? { section: sectionId } : { segment }),
          ...(title.trim() ? { title: title.trim() } : {}),
          ...(link.trim() ? { link: link.trim() } : {}),
          sortOrder: banners.length,
        },
      });
      setImage('');
      setTitle('');
      setLink('');
    }, 'Banner published — it is now live in the customer app.');
  };

  const move = (index, delta) =>
    run(async () => {
      const ids = banners.map((b) => b.id);
      const [id] = ids.splice(index, 1);
      ids.splice(index + delta, 0, id);
      await Promise.all(ids.map((bannerId, order) => apiRequest(`/cms/banners/${bannerId}`, { method: 'PUT', auth: true, body: { sortOrder: order } })));
    }, 'Order saved.');
  const toggle = (b) =>
    run(() => apiRequest(`/cms/banners/${b.id}`, { method: 'PUT', auth: true, body: { isActive: !b.isActive } }), b.isActive ? 'Banner hidden from customers.' : 'Banner is visible to customers again.');
  const remove = (b) =>
    window.confirm('Delete this banner? Customers will stop seeing it. This cannot be undone.') &&
    run(() => apiRequest(`/cms/banners/${b.id}`, { method: 'DELETE', auth: true }), 'Banner removed from the customer app.');

  return (
    <div className="space-y-5">
      {(heading || description) && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5">
          {heading && <h2 className="text-base font-extrabold text-slate-800">{heading}</h2>}
          {description && <p className="text-xs text-slate-500 mt-1 max-w-2xl">{description}</p>}
        </div>
      )}
      <ErrorNote message={error} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <form onSubmit={publish} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <ImagePlus size={15} className="text-[#0D47A1]" /> Upload new banner
          </h3>
          <Field label="Banner picture *" hint="Wide pictures look best (about 3.3 : 1). PNG, JPG or WebP, up to 5 MB.">
            <label className={`flex flex-col items-center gap-2 border-2 border-dashed border-slate-200 rounded-lg p-3 bg-slate-50 text-center ${uploading ? 'opacity-60 pointer-events-none' : 'cursor-pointer hover:bg-slate-100'}`}>
              {image ? (
                <img src={resolveMediaUrl(image)} alt="Selected banner preview" className="w-full h-24 object-cover rounded-lg border border-slate-200" />
              ) : (
                <span className="text-xs font-bold text-slate-500 py-3">{uploading ? 'Uploading…' : 'Browse image'}</span>
              )}
              <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" aria-label="Banner picture" disabled={uploading} onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }} />
            </label>
          </Field>
          <Field label="Name (optional)" hint="Only you see this — it labels the banner in this list.">
            <input className={inputClass} value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Festive discount offer" aria-label="Banner name" />
          </Field>
          <Field label="Opens when tapped (optional)" hint="An in-app path like /services or /book/AC, or a full https:// address. Leave empty for a picture that does nothing.">
            <input className={inputClass} value={link} onChange={(e) => setLink(e.target.value)} placeholder="/services" aria-label="Banner link" />
          </Field>
          <PrimaryButton type="submit" disabled={!image || working || uploading} className="w-full justify-center">
            {working ? <Loader2 size={14} className="animate-spin" /> : null} Publish banner
          </PrimaryButton>
        </form>

        <div className="lg:col-span-2 space-y-3">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Banners in this strip ({banners.length})</h3>
          {loading ? (
            <Loader2 className="animate-spin mx-auto text-slate-400" />
          ) : banners.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-400 font-medium text-xs">No banners here yet. Upload one on the left.</div>
          ) : (
            <ol className="grid grid-cols-1 md:grid-cols-2 gap-4" aria-label="Banners">
              {banners.map((b, i) => (
                <li key={b.id} className={`bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col ${b.isActive ? '' : 'opacity-60'}`}>
                  <div className="h-32 w-full relative">
                    <img src={resolveMediaUrl(b.imageUrl)} alt={b.title || `Banner ${i + 1}`} className="w-full h-full object-cover" />
                    <span className="absolute top-2 left-2 bg-slate-900/60 text-white px-2 py-0.5 rounded-full text-[9px] font-bold">Position {i + 1}</span>
                    {!b.isActive && <span className="absolute top-2 right-2 bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[9px] font-black">Hidden</span>}
                  </div>
                  <div className="p-3 flex items-center gap-1 bg-slate-50/50">
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-bold text-slate-800 truncate block">{b.title || 'Untitled banner'}</span>
                      <span className="text-[10px] text-slate-400 truncate block">{b.link ? `Opens ${b.link}` : 'No link'}</span>
                    </div>
                    <button type="button" disabled={working || i === 0} onClick={() => move(i, -1)} aria-label={`Move banner ${i + 1} earlier`} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"><ArrowUp size={14} /></button>
                    <button type="button" disabled={working || i === banners.length - 1} onClick={() => move(i, 1)} aria-label={`Move banner ${i + 1} later`} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"><ArrowDown size={14} /></button>
                    <button type="button" disabled={working} onClick={() => toggle(b)} aria-label={b.isActive ? `Hide banner ${i + 1}` : `Show banner ${i + 1}`} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer">{b.isActive ? <Eye size={14} /> : <EyeOff size={14} />}</button>
                    <button type="button" disabled={working} onClick={() => remove(b)} aria-label={`Delete banner ${i + 1}`} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 cursor-pointer"><Trash2 size={14} /></button>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
