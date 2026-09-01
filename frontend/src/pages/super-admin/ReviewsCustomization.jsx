import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from '../../components/super-admin/Sidebar';
import Topbar from '../../components/super-admin/Topbar';
import { apiRequest } from '../../lib/apiClient';
import {
  Star, Plus, Pencil, Trash2, Eye, EyeOff, X, Check, AlertTriangle
} from 'lucide-react';

const THEMES = [
  { key: 'pink',   label: 'Rose Pink',      bg: 'bg-gradient-to-br from-[#FFF5F8] to-[#FCE7F3]', border: 'border-pink-200',   title: 'text-[#BE185D]',   badge: 'bg-pink-100 text-[#BE185D]',   dot: 'bg-pink-400' },
  { key: 'purple', label: 'Indigo Violet',  bg: 'bg-gradient-to-br from-[#F5F3FF] to-[#EDE9FE]', border: 'border-purple-200', title: 'text-[#6D28D9]',   badge: 'bg-purple-100 text-[#6D28D9]', dot: 'bg-purple-400' },
  { key: 'teal',   label: 'Mint Emerald',   bg: 'bg-gradient-to-br from-[#F0FDF4] to-[#DCFCE7]', border: 'border-emerald-200',title: 'text-[#047857]',   badge: 'bg-emerald-100 text-[#047857]',dot: 'bg-emerald-400' },
  { key: 'amber',  label: 'Royal Ice Blue', bg: 'bg-gradient-to-br from-[#EFF6FF] to-[#DBEAFE]', border: 'border-blue-200',  title: 'text-[#0B4EA2]',   badge: 'bg-blue-100 text-[#0B4EA2]',   dot: 'bg-blue-400' },
];

const EMPTY_FORM = { title: '', comment: '', rating: 5, authorName: '', theme: 'pink', isVisible: true };

function StarRating({ rating }) {
  return (
    <div className="flex items-center gap-0.5">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${i < Math.floor(rating) ? 'fill-amber-400 text-amber-400' : 'fill-slate-200 text-slate-200'}`}
        />
      ))}
    </div>
  );
}

function CardPreview({ form }) {
  const theme = THEMES.find(t => t.key === form.theme) || THEMES[0];
  return (
    <div className={`${theme.bg} border ${theme.border} rounded-[20px] p-5 flex flex-col justify-between h-[200px] shadow-sm relative overflow-hidden`}>
      <div className="flex-1 flex flex-col justify-between">
        <div className="flex items-center justify-between gap-2 mb-2">
          <h4 className={`text-sm font-extrabold ${theme.title} leading-tight truncate`}>
            {form.title || 'Review Title'}
          </h4>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <StarRating rating={form.rating} />
            <span className={`px-1.5 py-0.5 rounded-md text-[11px] font-black ${theme.badge}`}>
              {Number(form.rating).toFixed(1)}
            </span>
          </div>
        </div>
        <div className="flex-1 flex flex-col justify-center">
          <span className="text-xl font-serif font-black block text-slate-800 leading-none mb-0.5 select-none">&ldquo;</span>
          <p className="text-xs text-slate-700 leading-relaxed font-normal pl-1 pr-1 line-clamp-3">
            {form.comment || 'Review comment will appear here...'}
          </p>
          <span className="text-xl font-serif font-black block text-slate-800 leading-none text-right -mt-1 select-none">&rdquo;</span>
        </div>
      </div>
      <div className={`flex items-center justify-end gap-1 mt-3 text-xs font-bold ${theme.title}`}>
        <span>👤</span>
        <span>{form.authorName || 'Author Name'}</span>
      </div>
    </div>
  );
}

function ReviewModal({ open, editItem, onClose, onSave }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  useEffect(() => {
    if (open) {
      setForm(editItem ? {
        title: editItem.title,
        comment: editItem.comment,
        rating: editItem.rating,
        authorName: editItem.authorName,
        theme: editItem.theme,
        isVisible: editItem.isVisible,
      } : EMPTY_FORM);
      setError('');
    }
  }, [open, editItem]);

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSave = async () => {
    if (!form.title.trim() || !form.comment.trim() || !form.authorName.trim()) {
      setError('Title, Comment and Author Name are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-black text-slate-800">{editItem ? 'Edit Review Card' : 'Add New Review Card'}</h2>
            <p className="text-xs text-slate-400 mt-0.5">Changes will reflect on the Customer Dashboard carousel</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
          {/* Form */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Card Title *</label>
              <input
                value={form.title}
                onChange={e => set('title', e.target.value)}
                placeholder="e.g. Very time convenient!"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0D47A1] bg-slate-50"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Review Comment *</label>
              <textarea
                value={form.comment}
                onChange={e => set('comment', e.target.value)}
                placeholder="Write the review text here..."
                rows={4}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0D47A1] bg-slate-50 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Rating (1.0 – 5.0)</label>
                <input
                  type="number"
                  min={1} max={5} step={0.1}
                  value={form.rating}
                  onChange={e => set('rating', Math.min(5, Math.max(1, parseFloat(e.target.value) || 5)))}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0D47A1] bg-slate-50"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Author Name *</label>
                <input
                  value={form.authorName}
                  onChange={e => set('authorName', e.target.value)}
                  placeholder="e.g. Priyanka"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0D47A1] bg-slate-50"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-2">Card Theme Color</label>
              <div className="flex gap-2 flex-wrap">
                {THEMES.map(t => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => set('theme', t.key)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all cursor-pointer ${form.theme === t.key ? 'border-[#0D47A1] bg-blue-50 text-[#0D47A1]' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full ${t.dot}`} />
                    {t.label}
                    {form.theme === t.key && <Check className="w-3 h-3" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between py-3 px-4 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <p className="text-sm font-bold text-slate-700">Visible on Dashboard</p>
                <p className="text-xs text-slate-400 mt-0.5">Toggle to show/hide this card in the carousel</p>
              </div>
              <button
                type="button"
                onClick={() => set('isVisible', !form.isVisible)}
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 cursor-pointer ${form.isVisible ? 'bg-[#0D47A1]' : 'bg-slate-300'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${form.isVisible ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-600 text-xs bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                {error}
              </div>
            )}
          </div>

          {/* Live Preview */}
          <div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3">Live Card Preview</p>
            <CardPreview form={form} />
            <p className="text-[11px] text-slate-400 mt-2 text-center">This is exactly how the card appears on the Customer Dashboard</p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 cursor-pointer">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-[#0D47A1] text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60 cursor-pointer shadow-sm"
          >
            {saving ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
            {editItem ? 'Save Changes' : 'Add Review'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ReviewsCustomization() {
  const [reviews, setReviews]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [modalOpen, setModalOpen]     = useState(false);
  const [editItem, setEditItem]       = useState(null);
  const [deleteId, setDeleteId]       = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest('/reviews/featured-admin', { auth: true });
      setReviews(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load reviews.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = () => { setEditItem(null); setModalOpen(true); };
  const handleEdit = (item) => { setEditItem(item); setModalOpen(true); };

  const broadcastSync = () => {
    try {
      localStorage.setItem('ncc_reviews_updated', String(Date.now()));
      window.dispatchEvent(new CustomEvent('ncc_reviews_updated'));
    } catch {
      // ignore
    }
  };

  const handleSave = async (form) => {
    if (editItem) {
      const updated = await apiRequest(`/reviews/featured-admin/${editItem._id || editItem.id}`, {
        method: 'PATCH', body: form, auth: true,
      });
      setReviews(prev => prev.map(r => (r._id || r.id) === (editItem._id || editItem.id) ? { ...r, ...updated } : r));
    } else {
      const created = await apiRequest('/reviews/featured-admin', {
        method: 'POST', body: form, auth: true,
      });
      setReviews(prev => [created, ...prev]);
    }
    broadcastSync();
  };

  const handleToggleVisible = async (item) => {
    const id = item._id || item.id;
    const updated = await apiRequest(`/reviews/featured-admin/${id}`, {
      method: 'PATCH', body: { isVisible: !item.isVisible }, auth: true,
    });
    setReviews(prev => prev.map(r => (r._id || r.id) === id ? { ...r, ...updated } : r));
    broadcastSync();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    try {
      await apiRequest(`/reviews/featured-admin/${deleteId}`, { method: 'DELETE', auth: true });
      setReviews(prev => prev.filter(r => (r._id || r.id) !== deleteId));
      setDeleteId(null);
      broadcastSync();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex text-slate-800">
      <Sidebar />
      <div className="flex-1 ml-64 min-h-screen flex flex-col">
        <Topbar
          title="Reviews Customization"
          subtitle="Manage the platform review cards shown on the Customer Dashboard carousel"
        />

        <div className="p-6 space-y-6 flex-1">

          {/* Top Toolbar */}
          <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] flex flex-wrap gap-4 items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#EFF6FF] flex items-center justify-center">
                <Star className="w-4.5 h-4.5 text-[#0D47A1]" size={18} />
              </div>
              <div>
                <p className="text-sm font-black text-slate-800">Featured Review Cards</p>
                <p className="text-xs text-slate-400">{reviews.length} review{reviews.length !== 1 ? 's' : ''} configured &nbsp;·&nbsp; {reviews.filter(r => r.isVisible).length} visible on dashboard</p>
              </div>
            </div>
            <button
              onClick={handleAdd}
              className="flex items-center gap-2 bg-[#0D47A1] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors cursor-pointer shadow-sm"
            >
              <Plus size={16} />
              Add Review Card
            </button>
          </div>

          {/* Info Banner */}
          <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3 text-sm text-blue-700">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-400" />
            <span>
              If <strong>3 or more</strong> visible review cards are configured here, they will replace the default static cards on the Customer Dashboard. Otherwise, static fallback cards are used to fill in.
            </span>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-2xl px-4 py-3 text-sm text-red-600">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {error}
              <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600 cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
          )}

          {/* Delete Confirm Banner */}
          {deleteId && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-sm text-red-700">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-500" />
              <span className="font-semibold">Are you sure you want to delete this review? This action cannot be undone.</span>
              <div className="ml-auto flex gap-2">
                <button onClick={() => setDeleteId(null)} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 cursor-pointer">Cancel</button>
                <button
                  onClick={handleDelete}
                  disabled={deleteLoading}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-red-500 hover:bg-red-600 cursor-pointer disabled:opacity-60"
                >
                  {deleteLoading ? 'Deleting...' : 'Yes, Delete'}
                </button>
              </div>
            </div>
          )}

          {/* Reviews Table */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 text-xs font-black tracking-wider uppercase">
                  <th className="p-4 pl-6">Review Card</th>
                  <th className="p-4">Rating</th>
                  <th className="p-4">Author</th>
                  <th className="p-4">Theme</th>
                  <th className="p-4">Visibility</th>
                  <th className="p-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-slate-400 text-sm">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-2 border-slate-200 border-t-[#0D47A1] rounded-full animate-spin" />
                        Loading reviews...
                      </div>
                    </td>
                  </tr>
                ) : reviews.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
                          <Star className="w-6 h-6 text-slate-400" />
                        </div>
                        <p className="text-sm font-semibold text-slate-600">No review cards configured yet</p>
                        <p className="text-xs text-slate-400">Click "Add Review Card" to create your first one</p>
                      </div>
                    </td>
                  </tr>
                ) : reviews.map((item) => {
                  const theme = THEMES.find(t => t.key === item.theme) || THEMES[0];
                  const id = item._id || item.id;
                  return (
                    <tr key={id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 pl-6 max-w-xs">
                        <p className={`text-sm font-bold ${theme.title} truncate`}>{item.title}</p>
                        <p className="text-xs text-slate-400 mt-0.5 truncate">{item.comment}</p>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5">
                          <StarRating rating={item.rating} />
                          <span className={`px-1.5 py-0.5 rounded-md text-[11px] font-black ${theme.badge}`}>
                            {Number(item.rating).toFixed(1)}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-slate-600 font-medium">{item.authorName}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2.5 h-2.5 rounded-full ${theme.dot}`} />
                          <span className="text-xs font-semibold text-slate-600">{theme.label}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <button
                          onClick={() => handleToggleVisible(item)}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${item.isVisible ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100' : 'bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200'}`}
                        >
                          {item.isVisible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                          {item.isVisible ? 'Visible' : 'Hidden'}
                        </button>
                      </td>
                      <td className="p-4 pr-6">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(item)}
                            className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-[#0D47A1] hover:bg-blue-100 transition-colors cursor-pointer"
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteId(id)}
                            className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-500 hover:bg-red-100 transition-colors cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add / Edit Modal */}
      <ReviewModal
        open={modalOpen}
        editItem={editItem}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      />
    </div>
  );
}
