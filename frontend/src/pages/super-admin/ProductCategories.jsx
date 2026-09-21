import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/super-admin/Sidebar';
import Topbar from '../../components/super-admin/Topbar';
import { apiRequest } from '../../lib/apiClient';
import { 
  Plus, 
  Search, 
  Layers, 
  X, 
  CheckCircle2, 
  Trash2, 
  Edit2,
  Tag,
  Sparkles,
  Loader2,
  Check,
  ArrowUpDown
} from 'lucide-react';

const COMMON_EMOJIS = ['📺', '🧊', '🫧', '❄️', '💧', '🔥', '⏱️', '📦', '⚡', '🍳', '🧹', '🛋️', '☕', '💡'];

const ProductCategories = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    icon: '📦',
    sortOrder: 0,
    isActive: true,
  });
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const fetchCategories = async () => {
    setLoading(true);
    try {
      // Use /all for super-admin to view all including inactive
      const data = await apiRequest('/product-categories/all', { auth: true }).catch(() =>
        apiRequest('/product-categories')
      );
      setCategories(Array.isArray(data) ? data : []);
      setLoadError('');
    } catch (err) {
      setLoadError(err.message || 'Could not load categories.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const slugify = (str) =>
    str
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-');

  const openAddModal = () => {
    setFormData({
      name: '',
      slug: '',
      icon: '📦',
      sortOrder: (categories.length + 1) * 1,
      isActive: true,
    });
    setFormError('');
    setShowAddModal(true);
  };

  const openEditModal = (cat) => {
    setEditingId(cat._id || cat.id);
    setFormData({
      name: cat.name || '',
      slug: cat.slug || '',
      icon: cat.icon || '📦',
      sortOrder: cat.sortOrder ?? 0,
      isActive: cat.isActive !== false,
    });
    setFormError('');
    setShowEditModal(true);
  };

  const handleNameChange = (val) => {
    setFormData((prev) => ({
      ...prev,
      name: val,
      slug: prev.slug === '' || prev.slug === slugify(prev.name) ? slugify(val) : prev.slug,
    }));
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError('Category name is required.');
      return;
    }
    setSubmitting(true);
    setFormError('');

    try {
      if (editingId) {
        await apiRequest(`/product-categories/${editingId}`, {
          method: 'PUT',
          auth: true,
          body: {
            name: formData.name.trim(),
            slug: formData.slug.trim() || slugify(formData.name),
            icon: formData.icon || '📦',
            sortOrder: Number(formData.sortOrder) || 0,
            isActive: Boolean(formData.isActive),
          },
        });
        showToast(`Category "${formData.name}" updated successfully!`);
        setShowEditModal(false);
      } else {
        await apiRequest('/product-categories', {
          method: 'POST',
          auth: true,
          body: {
            name: formData.name.trim(),
            slug: formData.slug.trim() || slugify(formData.name),
            icon: formData.icon || '📦',
            sortOrder: Number(formData.sortOrder) || 0,
            isActive: Boolean(formData.isActive),
          },
        });
        showToast(`Category "${formData.name}" created successfully!`);
        setShowAddModal(false);
      }
      await fetchCategories();
    } catch (err) {
      setFormError(err.message || 'Failed to save category.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingCategory) return;
    const catId = deletingCategory._id || deletingCategory.id;
    setSubmitting(true);
    try {
      await apiRequest(`/product-categories/${catId}`, {
        method: 'DELETE',
        auth: true,
      });
      showToast(`Category "${deletingCategory.name}" deactivated.`);
      setShowDeleteModal(false);
      setDeletingCategory(null);
      await fetchCategories();
    } catch (err) {
      showToast(err.message || 'Could not deactivate category.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (cat) => {
    const catId = cat._id || cat.id;
    try {
      await apiRequest(`/product-categories/${catId}`, {
        method: 'PUT',
        auth: true,
        body: { isActive: !cat.isActive },
      });
      showToast(`Status updated for "${cat.name}".`);
      await fetchCategories();
    } catch (err) {
      showToast(err.message || 'Could not update status.');
    }
  };

  const filteredCategories = categories.filter((c) =>
    (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.slug || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 text-left">
          {/* Toast Notification */}
          {toastMessage && (
            <div className="fixed top-20 right-6 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-top-3">
              <CheckCircle2 size={16} />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* Header Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-2 bg-blue-50 text-[#0D47A1] rounded-xl">
                  <Layers className="h-5 w-5" />
                </span>
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    Product Categories
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 font-medium">
                    Manage dynamic appliance categories shown in the Buy New storefront and product catalog
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={openAddModal}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0D47A1] hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-lg active:scale-95 cursor-pointer"
            >
              <Plus size={16} />
              <span>Add New Category</span>
            </button>
          </div>

          {/* Search Bar & Stats */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search category name or slug..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-[#0D47A1]"
              />
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 self-end sm:self-center">
              <span>Total: <strong className="text-slate-900">{categories.length}</strong></span>
              <span>•</span>
              <span className="text-emerald-600">Active: {categories.filter(c => c.isActive !== false).length}</span>
            </div>
          </div>

          {/* Load Error */}
          {loadError && (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-bold">
              {loadError}
            </div>
          )}

          {/* Categories Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                    <th className="p-4 w-16">Sort</th>
                    <th className="p-4">Icon & Name</th>
                    <th className="p-4">URL Slug</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                  {loading && (
                    <tr>
                      <td colSpan="5" className="p-8 text-center text-slate-400 font-semibold">
                        <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-[#0D47A1]" />
                        Loading product categories...
                      </td>
                    </tr>
                  )}
                  {!loading && filteredCategories.length === 0 && (
                    <tr>
                      <td colSpan="5" className="p-8 text-center text-slate-400 font-semibold">
                        No product categories found. Click "Add New Category" to create one.
                      </td>
                    </tr>
                  )}
                  {!loading && filteredCategories.map((cat, idx) => {
                    const catId = cat._id || cat.id;
                    const isActive = cat.isActive !== false;
                    return (
                      <tr key={catId || idx} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-4 font-mono font-bold text-slate-500">
                          #{cat.sortOrder ?? idx + 1}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <span className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-lg shadow-2xs shrink-0">
                              {cat.icon || '📦'}
                            </span>
                            <div>
                              <p className="font-extrabold text-slate-900 text-sm leading-tight">
                                {cat.name}
                              </p>
                              <span className="text-[10px] text-slate-400 font-medium">
                                Direct route: /products/{encodeURIComponent(cat.name)}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded-md text-slate-700 border border-slate-200/80">
                            {cat.slug}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(cat)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-black border transition-all cursor-pointer ${
                              isActive
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-600' : 'bg-slate-400'}`} />
                            {isActive ? 'Active' : 'Inactive'}
                          </button>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openEditModal(cat)}
                              className="p-1.5 hover:bg-blue-50 text-slate-600 hover:text-[#0D47A1] rounded-lg transition-colors cursor-pointer"
                              title="Edit Category"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => {
                                setDeletingCategory(cat);
                                setShowDeleteModal(true);
                              }}
                              className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                              title="Deactivate Category"
                            >
                              <Trash2 size={14} />
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
        </main>
      </div>

      {/* Add / Edit Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 text-left">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-blue-50 text-[#0D47A1] rounded-xl">
                  <Tag className="h-4 w-4" />
                </span>
                <h3 className="text-base font-extrabold text-slate-900">
                  {showEditModal ? 'Edit Product Category' : 'Add New Category'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                }}
                className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-full transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {formError && (
              <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveCategory} className="mt-4 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Category Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Geyser, Microwave Oven, Dishwasher"
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-[#0D47A1]"
                />
              </div>

              {/* Slug */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  URL Slug
                </label>
                <input
                  type="text"
                  placeholder="e.g. microwave-oven"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono font-semibold text-slate-700 outline-none focus:bg-white focus:border-[#0D47A1]"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Used for SEO URLs: /buy-new/products/{formData.slug || 'category-name'}
                </span>
              </div>

              {/* Icon Emoji Picker */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Icon / Emoji
                </label>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-xl shrink-0">
                    {formData.icon || '📦'}
                  </span>
                  <input
                    type="text"
                    maxLength={4}
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    placeholder="Emoji"
                    className="w-24 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-center outline-none focus:bg-white focus:border-[#0D47A1]"
                  />
                  <span className="text-[10px] text-slate-400">or pick quick:</span>
                </div>
                <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 rounded-xl border border-slate-100">
                  {COMMON_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setFormData({ ...formData, icon: emoji })}
                      className={`w-7 h-7 rounded-lg text-sm flex items-center justify-center hover:bg-white transition-all cursor-pointer ${
                        formData.icon === emoji ? 'bg-white shadow-xs border border-blue-400' : ''
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sort Order & Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Sort Order
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formData.sortOrder}
                    onChange={(e) => setFormData({ ...formData, sortOrder: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-[#0D47A1]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.isActive ? 'true' : 'false'}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'true' })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-[#0D47A1] cursor-pointer"
                  >
                    <option value="true">Active (Visible)</option>
                    <option value="false">Inactive (Hidden)</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setShowEditModal(false);
                  }}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-[#0D47A1] hover:bg-blue-800 text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-60 flex items-center justify-center gap-1.5"
                >
                  {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>{showEditModal ? 'Save Changes' : 'Create Category'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete / Deactivate Confirm Modal */}
      {showDeleteModal && deletingCategory && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-100 text-left animate-in fade-in zoom-in-95">
            <h3 className="text-base font-extrabold text-slate-900">
              Deactivate Category?
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-1.5 leading-relaxed">
              Deactivating <strong>"{deletingCategory.name}"</strong> will hide it from the customer storefront category list. Existing products belonging to this category will not be deleted.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletingCategory(null);
                }}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleDelete}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-md disabled:opacity-60"
              >
                {submitting ? 'Deactivating...' : 'Yes, Deactivate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductCategories;
