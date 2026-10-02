import { useEffect, useState } from 'react';
import Sidebar from '../../components/super-admin/Sidebar';
import Topbar from '../../components/super-admin/Topbar';
import { BarChart2, Eye, EyeOff, Image, Megaphone, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { apiRequest, resolveMediaUrl } from '../../lib/apiClient';
import { uploadImage } from '../../lib/uploadImage';

const PLACEMENTS = ['App Header Banner', 'Category Popup', 'Cart Bottom Banner'];
const EMPTY_FORM = {
  name: '', type: 'App Header Banner', title: '', description: '', imageUrl: '',
  actionUrl: '', buttonText: 'Learn more', backgroundColor: '#0B4EA2',
  textColor: '#FFFFFF', budget: '', status: 'Running', startsAt: '', endsAt: '',
};

const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', maximumFractionDigits: 0,
});

function toDateTimeLocal(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function AdvertisementModal({ item, onClose, onSaved }) {
  const [form, setForm] = useState(() => item ? {
    ...EMPTY_FORM, ...item, budget: item.budget ?? '',
    startsAt: toDateTimeLocal(item.startsAt), endsAt: toDateTimeLocal(item.endsAt),
  } : EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const handleImage = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      set('imageUrl', await uploadImage(file));
    } catch (err) {
      setError(err.message || 'Image upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const save = async (event) => {
    event.preventDefault();
    if (!form.name.trim() || !form.title.trim()) {
      setError('Campaign name and customer-facing title are required.');
      return;
    }
    if (form.endsAt && form.startsAt && new Date(form.endsAt) <= new Date(form.startsAt)) {
      setError('End date must be after the start date.');
      return;
    }
    setSaving(true);
    setError('');
    const body = {
      ...form,
      name: form.name.trim(),
      title: form.title.trim(),
      description: form.description.trim(),
      imageUrl: form.imageUrl.trim(),
      actionUrl: form.actionUrl.trim(),
      buttonText: form.buttonText.trim() || 'Learn more',
      budget: form.budget === '' ? undefined : Number(form.budget),
      startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
      endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
    };
    try {
      const saved = await apiRequest(item ? `/cms/advertisements/${item.id}` : '/cms/advertisements', {
        method: item ? 'PUT' : 'POST', auth: true, body,
      });
      onSaved(saved);
    } catch (err) {
      setError(err.message || 'Could not save the campaign.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">
      <form onSubmit={save} className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 z-10 bg-white flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="font-black text-slate-800">{item ? 'Edit Ad Campaign' : 'Create Ad Campaign'}</h2>
            <p className="text-xs text-slate-400 mt-0.5">Running campaigns appear when their schedule is active.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center cursor-pointer"><X className="w-4 h-4" /></button>
        </div>

        <div className="grid md:grid-cols-2 gap-6 p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Internal Campaign Name *</label>
              <input value={form.name} onChange={(e) => set('name', e.target.value)} className="field" placeholder="Summer AC offer" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Placement *</label>
              <select value={form.type} onChange={(e) => set('type', e.target.value)} className="field">
                {PLACEMENTS.map((placement) => <option key={placement}>{placement}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Customer-facing Title *</label>
              <input value={form.title} onChange={(e) => set('title', e.target.value)} className="field" placeholder="Save 20% on AC service" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Description</label>
              <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={3} className="field resize-none" placeholder="Short offer details shown to customers" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Button Text</label>
                <input value={form.buttonText} onChange={(e) => set('buttonText', e.target.value)} className="field" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Monthly Budget</label>
                <input type="number" min="0" value={form.budget} onChange={(e) => set('budget', e.target.value)} className="field" placeholder="Optional" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Button Destination</label>
              <input value={form.actionUrl} onChange={(e) => set('actionUrl', e.target.value)} className="field" placeholder="/book/AC or https://example.com" />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Creative Image</label>
              <div className="border border-dashed border-slate-300 rounded-xl p-3 bg-slate-50">
                <input type="file" accept="image/*" onChange={handleImage} className="text-xs w-full" />
                {uploading && <p className="text-xs text-blue-600 mt-2">Uploading image…</p>}
                {form.imageUrl && <img src={resolveMediaUrl(form.imageUrl)} alt="Advertisement preview" className="mt-3 w-full h-32 object-cover rounded-xl" />}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-bold text-slate-600 mb-1.5">Background</label><input type="color" value={form.backgroundColor} onChange={(e) => set('backgroundColor', e.target.value)} className="w-full h-10 rounded-lg border border-slate-200 p-1" /></div>
              <div><label className="block text-xs font-bold text-slate-600 mb-1.5">Text</label><input type="color" value={form.textColor} onChange={(e) => set('textColor', e.target.value)} className="w-full h-10 rounded-lg border border-slate-200 p-1" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-bold text-slate-600 mb-1.5">Starts At</label><input type="datetime-local" value={form.startsAt} onChange={(e) => set('startsAt', e.target.value)} className="field" /></div>
              <div><label className="block text-xs font-bold text-slate-600 mb-1.5">Ends At</label><input type="datetime-local" value={form.endsAt} onChange={(e) => set('endsAt', e.target.value)} className="field" /></div>
            </div>
            <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-3">
              <div><p className="text-sm font-bold text-slate-700">Campaign Status</p><p className="text-xs text-slate-400">Paused campaigns are never returned to customers.</p></div>
              <button type="button" onClick={() => set('status', form.status === 'Running' ? 'Paused' : 'Running')} className={`px-3 py-1.5 rounded-full text-xs font-black border cursor-pointer ${form.status === 'Running' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>{form.status}</button>
            </div>
            <div className="rounded-2xl overflow-hidden min-h-40 relative" style={{ backgroundColor: form.backgroundColor, color: form.textColor }}>
              {form.imageUrl && <img src={resolveMediaUrl(form.imageUrl)} alt="" className="absolute inset-0 w-full h-full object-cover" />}
              <div className="absolute inset-0 bg-linear-to-r from-black/70 to-black/10" />
              <div className="relative p-5 z-1"><p className="text-[10px] uppercase font-black tracking-wider opacity-80">Customer preview</p><h3 className="text-xl font-black mt-2">{form.title || 'Campaign title'}</h3><p className="text-xs mt-1 opacity-90">{form.description || 'Campaign description'}</p></div>
            </div>
          </div>
        </div>

        {error && <p className="mx-6 mb-3 text-xs font-semibold text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>}
        <div className="sticky bottom-0 bg-white border-t border-slate-100 px-6 py-4 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-600 cursor-pointer">Cancel</button>
          <button type="submit" disabled={saving || uploading} className="bg-[#0D47A1] text-white px-5 py-2 rounded-xl text-sm font-bold disabled:opacity-50 cursor-pointer">{saving ? 'Saving…' : item ? 'Save Changes' : 'Create Campaign'}</button>
        </div>
      </form>
    </div>
  );
}

export default function Advertisements() {
  const [searchQuery, setSearchQuery] = useState('');
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalItem, setModalItem] = useState(undefined);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    apiRequest('/cms/advertisements/admin', { auth: true })
      .then((rows) => { if (alive) setAds(rows || []); })
      .catch((err) => { if (alive) setError(err.message || 'Could not load campaigns.'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const handleDelete = async (ad) => {
    if (!window.confirm(`Delete campaign “${ad.name}”?`)) return;
    try {
      await apiRequest(`/cms/advertisements/${ad.id}`, { method: 'DELETE', auth: true });
      setAds((current) => current.filter((item) => item.id !== ad.id));
    } catch (err) { setError(`Could not delete advertisement: ${err.message}`); }
  };

  const toggleStatus = async (ad) => {
    const status = ad.status === 'Running' ? 'Paused' : 'Running';
    try {
      const updated = await apiRequest(`/cms/advertisements/${ad.id}`, { method: 'PUT', auth: true, body: { status } });
      setAds((current) => current.map((item) => item.id === ad.id ? updated : item));
    } catch (err) { setError(`Could not update campaign: ${err.message}`); }
  };

  const filteredAds = ads.filter((ad) =>
    `${ad.name || ''} ${ad.title || ''} ${ad.type || ''}`.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex text-slate-800">
      <Sidebar />
      <div className="flex-1 ml-64 min-h-screen flex flex-col">
        <Topbar title="Advertisements Management" subtitle="Create, schedule and monitor customer-app campaigns" />
        <div className="p-6 space-y-6 flex-1">
          <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] flex flex-wrap gap-4 items-center justify-between shadow-sm">
            <div className="relative w-72"><Search size={16} className="absolute left-3 top-3 text-[#64748B]" /><input type="search" placeholder="Search campaigns…" className="w-full pl-10 pr-4 py-2 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] outline-none text-sm bg-[#F8FAFC]" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /></div>
            <button onClick={() => { setModalItem(undefined); setModalOpen(true); }} className="bg-[#0D47A1] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 flex items-center gap-2 cursor-pointer shadow-sm"><Plus size={16} /> Create Ad Campaign</button>
          </div>

          {error && <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm">{error}</div>}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead><tr className="bg-slate-50 border-b border-slate-100 text-slate-400 text-xs font-black tracking-wider uppercase"><th className="p-4 pl-6">Campaign</th><th className="p-4">Placement</th><th className="p-4">Budget</th><th className="p-4">Clicks</th><th className="p-4">Status</th><th className="p-4 pr-6 text-right">Actions</th></tr></thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {loading && <tr><td colSpan={6} className="p-10 text-center text-slate-400 font-semibold">Loading campaigns…</td></tr>}
                {!loading && filteredAds.length === 0 && <tr><td colSpan={6} className="p-10 text-center text-slate-400 font-semibold">No campaigns yet.</td></tr>}
                {filteredAds.map((ad) => (
                  <tr key={ad.id} className="hover:bg-slate-50">
                    <td className="p-4 pl-6"><div className="flex items-center gap-3"><div className="w-11 h-11 rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">{ad.imageUrl ? <img src={resolveMediaUrl(ad.imageUrl)} alt="" className="w-full h-full object-cover" /> : <Image className="w-4 h-4 text-slate-400" />}</div><div><p className="font-bold text-slate-800 flex items-center gap-1.5"><Megaphone size={14} className="text-slate-400" />{ad.name}</p><p className="text-xs text-slate-400 truncate max-w-72">{ad.title || 'No customer-facing title'}</p></div></div></td>
                    <td className="p-4 font-semibold text-slate-600">{ad.type}</td>
                    <td className="p-4 text-xs font-bold text-slate-700">{ad.budget != null ? `${currency.format(ad.budget)}/mo` : '—'}</td>
                    <td className="p-4 text-slate-700 font-bold"><span className="inline-flex items-center gap-1"><BarChart2 size={12} />{ad.clicks ?? 0}</span></td>
                    <td className="p-4"><button onClick={() => toggleStatus(ad)} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase border cursor-pointer ${ad.status === 'Running' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>{ad.status === 'Running' ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}{ad.status}</button></td>
                    <td className="p-4 pr-6"><div className="flex justify-end gap-2"><button onClick={() => { setModalItem(ad); setModalOpen(true); }} title="Edit" className="w-8 h-8 rounded-lg bg-blue-50 text-[#0D47A1] flex items-center justify-center cursor-pointer"><Pencil className="w-3.5 h-3.5" /></button><button onClick={() => handleDelete(ad)} title="Delete" className="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {modalOpen && <AdvertisementModal item={modalItem} onClose={() => setModalOpen(false)} onSaved={(saved) => {
        setAds((current) => modalItem ? current.map((item) => item.id === saved.id ? saved : item) : [saved, ...current]);
        setModalOpen(false);
      }} />}
    </div>
  );
}
