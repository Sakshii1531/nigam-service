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
  Award, 
  ShieldCheck, 
  Building2,
  FolderTree
} from 'lucide-react';

const COMMON_EMOJIS = ['📺', '🧊', '🫧', '❄️', '💧', '🔥', '⏱️', '📦', '⚡', '🍳', '🧹', '🛋️', '☕', '💡'];

const ProductCategories = () => {
  // Tab state: 'categories' | 'brands'
  const [activeTab, setActiveTab] = useState('categories');
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  // ── CATEGORIES STATE ──
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [categoryError, setCategoryError] = useState('');

  // Category Modals
  const [showAddCatModal, setShowAddCatModal] = useState(false);
  const [showEditCatModal, setShowEditCatModal] = useState(false);
  const [showDeleteCatModal, setShowDeleteCatModal] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState(null);
  const [editingCatId, setEditingCatId] = useState(null);
  const [catFormData, setCatFormData] = useState({
    name: '',
    slug: '',
    icon: '📦',
    sortOrder: 0,
    isActive: true,
  });
  const [catSubmitting, setCatSubmitting] = useState(false);
  const [catFormError, setCatFormError] = useState('');

  // ── BRANDS STATE ──
  const [brands, setBrands] = useState([]);
  const [loadingBrands, setLoadingBrands] = useState(true);
  const [brandError, setBrandError] = useState('');

  // Brand Modals
  const [showAddBrandModal, setShowAddBrandModal] = useState(false);
  const [showEditBrandModal, setShowEditBrandModal] = useState(false);
  const [showDeleteBrandModal, setShowDeleteBrandModal] = useState(false);
  const [deletingBrand, setDeletingBrand] = useState(null);
  const [editingBrandId, setEditingBrandId] = useState(null);
  const [brandFormData, setBrandFormData] = useState({
    name: '',
    category: 'Appliances',
    status: 'Active',
    warrantyMonths: 12,
    supportEmail: '',
    supportPhone: '',
  });
  const [brandSubmitting, setBrandSubmitting] = useState(false);
  const [brandFormError, setBrandFormError] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const slugify = (str) =>
    str
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-');

  // Fetch Categories
  const fetchCategories = async () => {
    setLoadingCategories(true);
    try {
      const data = await apiRequest('/product-categories/all', { auth: true }).catch(() =>
        apiRequest('/product-categories')
      );
      setCategories(Array.isArray(data) ? data : []);
      setCategoryError('');
    } catch (err) {
      setCategoryError(err.message || 'Could not load categories.');
    } finally {
      setLoadingCategories(false);
    }
  };

  // Fetch Brands
  const fetchBrands = async () => {
    setLoadingBrands(true);
    try {
      const data = await apiRequest('/super-admin/brands', { auth: true }).catch(() =>
        apiRequest('/catalog/brands')
      );
      setBrands(Array.isArray(data) ? data : []);
      setBrandError('');
    } catch (err) {
      setBrandError(err.message || 'Could not load brands.');
    } finally {
      setLoadingBrands(false);
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchBrands();
  }, []);

  // ── CATEGORY HANDLERS ──
  const openAddCategoryModal = () => {
    setCatFormData({
      name: '',
      slug: '',
      icon: '📦',
      sortOrder: (categories.length + 1) * 1,
      isActive: true,
    });
    setCatFormError('');
    setShowAddCatModal(true);
  };

  const openEditCategoryModal = (cat) => {
    setEditingCatId(cat._id || cat.id);
    setCatFormData({
      name: cat.name || '',
      slug: cat.slug || '',
      icon: cat.icon || '📦',
      sortOrder: cat.sortOrder ?? 0,
      isActive: cat.isActive !== false,
    });
    setCatFormError('');
    setShowEditCatModal(true);
  };

  const handleCatNameChange = (val) => {
    setCatFormData((prev) => ({
      ...prev,
      name: val,
      slug: prev.slug === '' || prev.slug === slugify(prev.name) ? slugify(val) : prev.slug,
    }));
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    if (!catFormData.name.trim()) {
      setCatFormError('Category name is required.');
      return;
    }
    setCatSubmitting(true);
    setCatFormError('');

    try {
      if (editingCatId) {
        await apiRequest(`/product-categories/${editingCatId}`, {
          method: 'PUT',
          auth: true,
          body: {
            name: catFormData.name.trim(),
            slug: catFormData.slug.trim() || slugify(catFormData.name),
            icon: catFormData.icon || '📦',
            sortOrder: Number(catFormData.sortOrder) || 0,
            isActive: Boolean(catFormData.isActive),
          },
        });
        showToast(`Category "${catFormData.name}" updated successfully!`);
        setShowEditCatModal(false);
      } else {
        await apiRequest('/product-categories', {
          method: 'POST',
          auth: true,
          body: {
            name: catFormData.name.trim(),
            slug: catFormData.slug.trim() || slugify(catFormData.name),
            icon: catFormData.icon || '📦',
            sortOrder: Number(catFormData.sortOrder) || 0,
            isActive: Boolean(catFormData.isActive),
          },
        });
        showToast(`Category "${catFormData.name}" created successfully!`);
        setShowAddCatModal(false);
      }
      await fetchCategories();
    } catch (err) {
      setCatFormError(err.message || 'Failed to save category.');
    } finally {
      setCatSubmitting(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!deletingCategory) return;
    const catId = deletingCategory._id || deletingCategory.id;
    setCatSubmitting(true);
    try {
      await apiRequest(`/product-categories/${catId}`, {
        method: 'DELETE',
        auth: true,
      });
      showToast(`Category "${deletingCategory.name}" deactivated.`);
      setShowDeleteCatModal(false);
      setDeletingCategory(null);
      await fetchCategories();
    } catch (err) {
      showToast(err.message || 'Could not deactivate category.');
    } finally {
      setCatSubmitting(false);
    }
  };

  const handleToggleCategoryStatus = async (cat) => {
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

  // ── BRAND HANDLERS ──
  const openAddBrandModal = () => {
    setBrandFormData({
      name: '',
      category: categories.length > 0 ? categories[0].name : 'Appliances',
      status: 'Active',
      warrantyMonths: 12,
      supportEmail: '',
      supportPhone: '',
    });
    setBrandFormError('');
    setShowAddBrandModal(true);
  };

  const openEditBrandModal = (brand) => {
    setEditingBrandId(brand._id || brand.id);
    setBrandFormData({
      name: brand.name || '',
      category: brand.category || 'Appliances',
      status: brand.status || 'Active',
      warrantyMonths: brand.warrantyMonths || 12,
      supportEmail: brand.supportEmail || '',
      supportPhone: brand.supportPhone || '',
    });
    setBrandFormError('');
    setShowEditBrandModal(true);
  };

  const handleSaveBrand = async (e) => {
    e.preventDefault();
    if (!brandFormData.name.trim()) {
      setBrandFormError('Brand name is required.');
      return;
    }
    setBrandSubmitting(true);
    setBrandFormError('');

    try {
      if (editingBrandId) {
        await apiRequest(`/super-admin/brands/${editingBrandId}`, {
          method: 'PUT',
          auth: true,
          body: {
            name: brandFormData.name.trim(),
            category: brandFormData.category,
            status: brandFormData.status,
            warrantyMonths: Number(brandFormData.warrantyMonths) || 12,
            supportEmail: brandFormData.supportEmail,
            supportPhone: brandFormData.supportPhone,
          },
        });
        showToast(`Brand "${brandFormData.name}" updated successfully!`);
        setShowEditBrandModal(false);
      } else {
        await apiRequest('/super-admin/brands', {
          method: 'POST',
          auth: true,
          body: {
            name: brandFormData.name.trim(),
            category: brandFormData.category,
            status: brandFormData.status,
            warrantyMonths: Number(brandFormData.warrantyMonths) || 12,
            supportEmail: brandFormData.supportEmail,
            supportPhone: brandFormData.supportPhone,
          },
        });
        showToast(`Brand "${brandFormData.name}" created successfully!`);
        setShowAddBrandModal(false);
      }
      await fetchBrands();
    } catch (err) {
      setBrandFormError(err.message || 'Failed to save brand.');
    } finally {
      setBrandSubmitting(false);
    }
  };

  const handleDeleteBrand = async () => {
    if (!deletingBrand) return;
    const bId = deletingBrand._id || deletingBrand.id;
    setBrandSubmitting(true);
    try {
      await apiRequest(`/super-admin/brands/${bId}`, {
        method: 'DELETE',
        auth: true,
      });
      showToast(`Brand "${deletingBrand.name}" deleted.`);
      setShowDeleteBrandModal(false);
      setDeletingBrand(null);
      await fetchBrands();
    } catch (err) {
      showToast(err.message || 'Could not delete brand.');
    } finally {
      setBrandSubmitting(false);
    }
  };

  const handleToggleBrandStatus = async (brand) => {
    const bId = brand._id || brand.id;
    const nextStatus = brand.status === 'Active' ? 'Pending' : 'Active';
    try {
      await apiRequest(`/super-admin/brands/${bId}`, {
        method: 'PUT',
        auth: true,
        body: { status: nextStatus },
      });
      showToast(`Brand "${brand.name}" marked as ${nextStatus}.`);
      await fetchBrands();
    } catch (err) {
      showToast(err.message || 'Could not update brand status.');
    }
  };

  // Filtered lists
  const filteredCategories = categories.filter((c) =>
    (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.slug || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredBrands = brands.filter((b) =>
    (b.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (b.category || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex text-slate-800 font-sans">
      <Sidebar />

      {/* Main Content Area - ml-64 prevents underlapping fixed sidebar */}
      <div className="flex-1 ml-64 min-h-screen flex flex-col min-w-0">
        <Topbar title="Categories & Brands" subtitle="Manage storefront product categories and brand partners" />

        <main className="p-4 sm:p-6 lg:p-8 space-y-6 flex-1 text-left">
          {/* Toast Notification */}
          {toastMessage && (
            <div className="fixed top-20 right-6 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-top-3">
              <CheckCircle2 size={16} />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* Top Section: Title & Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="p-2.5 bg-blue-50 text-[#0D47A1] rounded-2xl shadow-2xs">
                  {activeTab === 'categories' ? <Layers className="h-6 w-6" /> : <Award className="h-6 w-6" />}
                </span>
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    {activeTab === 'categories' ? 'Product Categories' : 'Product Brands'}
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 font-medium">
                    {activeTab === 'categories' 
                      ? 'Manage dynamic appliance categories shown on customer storefront & catalog' 
                      : 'Manage product brands and manufacturers available across the platform'}
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={activeTab === 'categories' ? openAddCategoryModal : openAddBrandModal}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0D47A1] hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-lg active:scale-95 cursor-pointer"
            >
              <Plus size={16} />
              <span>{activeTab === 'categories' ? 'Add New Category' : 'Add New Brand'}</span>
            </button>
          </div>

          {/* Navigation Tabs (Categories vs Brands) */}
          <div className="flex items-center gap-2 border-b border-slate-200">
            <button
              onClick={() => {
                setActiveTab('categories');
                setSearchQuery('');
              }}
              className={`flex items-center gap-2 px-5 py-3 text-xs font-black transition-all border-b-2 cursor-pointer ${
                activeTab === 'categories'
                  ? 'border-[#0D47A1] text-[#0D47A1]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Layers size={16} />
              <span>Product Categories</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 font-extrabold text-slate-600">
                {categories.length}
              </span>
            </button>

            <button
              onClick={() => {
                setActiveTab('brands');
                setSearchQuery('');
              }}
              className={`flex items-center gap-2 px-5 py-3 text-xs font-black transition-all border-b-2 cursor-pointer ${
                activeTab === 'brands'
                  ? 'border-[#0D47A1] text-[#0D47A1]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Award size={16} />
              <span>Product Brands</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 font-extrabold text-slate-600">
                {brands.length}
              </span>
            </button>
          </div>

          {/* Search Bar & Summary Stats */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder={activeTab === 'categories' ? 'Search category name or slug...' : 'Search brand name or category...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-[#0D47A1]"
              />
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 self-end sm:self-center">
              {activeTab === 'categories' ? (
                <>
                  <span>Total Categories: <strong className="text-slate-900">{categories.length}</strong></span>
                  <span>•</span>
                  <span className="text-emerald-600">Active: {categories.filter(c => c.isActive !== false).length}</span>
                </>
              ) : (
                <>
                  <span>Total Brands: <strong className="text-slate-900">{brands.length}</strong></span>
                  <span>•</span>
                  <span className="text-emerald-600">Active: {brands.filter(b => b.status === 'Active').length}</span>
                </>
              )}
            </div>
          </div>

          {/* ── TAB 1: PRODUCT CATEGORIES TABLE ── */}
          {activeTab === 'categories' && (
            <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs">
              {categoryError && (
                <div className="p-4 bg-rose-50 border-b border-rose-200 text-rose-700 text-xs font-bold">
                  {categoryError}
                </div>
              )}
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
                    {loadingCategories && (
                      <tr>
                        <td colSpan="5" className="p-8 text-center text-slate-400 font-semibold">
                          <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-[#0D47A1]" />
                          Loading product categories...
                        </td>
                      </tr>
                    )}
                    {!loadingCategories && filteredCategories.length === 0 && (
                      <tr>
                        <td colSpan="5" className="p-8 text-center text-slate-400 font-semibold">
                          No product categories found. Click "Add New Category" to create one.
                        </td>
                      </tr>
                    )}
                    {!loadingCategories && filteredCategories.map((cat, idx) => {
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
                                  Route: /products/{encodeURIComponent(cat.name)}
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
                              onClick={() => handleToggleCategoryStatus(cat)}
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
                                onClick={() => openEditCategoryModal(cat)}
                                className="p-1.5 hover:bg-blue-50 text-slate-600 hover:text-[#0D47A1] rounded-lg transition-colors cursor-pointer"
                                title="Edit Category"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                onClick={() => {
                                  setDeletingCategory(cat);
                                  setShowDeleteCatModal(true);
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
          )}

          {/* ── TAB 2: PRODUCT BRANDS TABLE ── */}
          {activeTab === 'brands' && (
            <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs">
              {brandError && (
                <div className="p-4 bg-rose-50 border-b border-rose-200 text-rose-700 text-xs font-bold">
                  {brandError}
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                      <th className="p-4 w-12">#</th>
                      <th className="p-4">Brand Name</th>
                      <th className="p-4">Category Association</th>
                      <th className="p-4">Warranty</th>
                      <th className="p-4 text-center">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                    {loadingBrands && (
                      <tr>
                        <td colSpan="6" className="p-8 text-center text-slate-400 font-semibold">
                          <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-[#0D47A1]" />
                          Loading product brands...
                        </td>
                      </tr>
                    )}
                    {!loadingBrands && filteredBrands.length === 0 && (
                      <tr>
                        <td colSpan="6" className="p-8 text-center text-slate-400 font-semibold">
                          No product brands found. Click "Add New Brand" to create one.
                        </td>
                      </tr>
                    )}
                    {!loadingBrands && filteredBrands.map((brand, idx) => {
                      const bId = brand._id || brand.id;
                      const isActive = brand.status === 'Active';
                      return (
                        <tr key={bId || idx} className="hover:bg-slate-50/70 transition-colors">
                          <td className="p-4 font-mono font-bold text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2.5">
                              <span className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center font-black text-[#0D47A1] text-xs shadow-2xs shrink-0">
                                {brand.name ? brand.name.charAt(0).toUpperCase() : 'B'}
                              </span>
                              <div>
                                <p className="font-extrabold text-slate-900 text-sm leading-tight">
                                  {brand.name}
                                </p>
                                {brand.supportEmail && (
                                  <span className="text-[10px] text-slate-400 font-medium">
                                    {brand.supportEmail}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-bold border border-slate-200/80">
                              {brand.category || 'General Appliances'}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className="text-slate-600 font-bold">
                              {brand.warrantyMonths ? `${brand.warrantyMonths} Months` : '12 Months (Default)'}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleBrandStatus(brand)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-black border transition-all cursor-pointer ${
                                isActive
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                  : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-600' : 'bg-amber-500'}`} />
                              {brand.status || 'Active'}
                            </button>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => openEditBrandModal(brand)}
                                className="p-1.5 hover:bg-blue-50 text-slate-600 hover:text-[#0D47A1] rounded-lg transition-colors cursor-pointer"
                                title="Edit Brand"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                onClick={() => {
                                  setDeletingBrand(brand);
                                  setShowDeleteBrandModal(true);
                                }}
                                className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                                title="Delete Brand"
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
          )}
        </main>
      </div>

      {/* ── MODALS: CATEGORY ADD/EDIT ── */}
      {(showAddCatModal || showEditCatModal) && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 text-left">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-blue-50 text-[#0D47A1] rounded-xl">
                  <Tag className="h-4 w-4" />
                </span>
                <h3 className="text-base font-extrabold text-slate-900">
                  {showEditCatModal ? 'Edit Product Category' : 'Add New Category'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowAddCatModal(false);
                  setShowEditCatModal(false);
                }}
                className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-full transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {catFormError && (
              <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold">
                {catFormError}
              </div>
            )}

            <form onSubmit={handleSaveCategory} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Category Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Geyser, Microwave Oven, Dishwasher"
                  value={catFormData.name}
                  onChange={(e) => handleCatNameChange(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-[#0D47A1]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  URL Slug
                </label>
                <input
                  type="text"
                  placeholder="e.g. microwave-oven"
                  value={catFormData.slug}
                  onChange={(e) => setCatFormData({ ...catFormData, slug: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono font-semibold text-slate-700 outline-none focus:bg-white focus:border-[#0D47A1]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Icon / Emoji
                </label>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-xl shrink-0">
                    {catFormData.icon || '📦'}
                  </span>
                  <input
                    type="text"
                    maxLength={4}
                    value={catFormData.icon}
                    onChange={(e) => setCatFormData({ ...catFormData, icon: e.target.value })}
                    placeholder="Emoji"
                    className="w-24 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-center outline-none focus:bg-white focus:border-[#0D47A1]"
                  />
                  <span className="text-[10px] text-slate-400">Quick pick:</span>
                </div>
                <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 rounded-xl border border-slate-100">
                  {COMMON_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setCatFormData({ ...catFormData, icon: emoji })}
                      className={`w-7 h-7 rounded-lg text-sm flex items-center justify-center hover:bg-white transition-all cursor-pointer ${
                        catFormData.icon === emoji ? 'bg-white shadow-xs border border-blue-400' : ''
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Sort Order
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={catFormData.sortOrder}
                    onChange={(e) => setCatFormData({ ...catFormData, sortOrder: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-[#0D47A1]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Status
                  </label>
                  <select
                    value={catFormData.isActive ? 'true' : 'false'}
                    onChange={(e) => setCatFormData({ ...catFormData, isActive: e.target.value === 'true' })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-[#0D47A1] cursor-pointer"
                  >
                    <option value="true">Active (Visible)</option>
                    <option value="false">Inactive (Hidden)</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddCatModal(false);
                    setShowEditCatModal(false);
                  }}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={catSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-[#0D47A1] hover:bg-blue-800 text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-60 flex items-center justify-center gap-1.5"
                >
                  {catSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>{showEditCatModal ? 'Save Changes' : 'Create Category'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODALS: CATEGORY DELETE ── */}
      {showDeleteCatModal && deletingCategory && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-100 text-left animate-in fade-in zoom-in-95">
            <h3 className="text-base font-extrabold text-slate-900">
              Deactivate Category?
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-1.5 leading-relaxed">
              Deactivating <strong>"{deletingCategory.name}"</strong> will hide it from the storefront catalog. Existing products will not be deleted.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteCatModal(false);
                  setDeletingCategory(null);
                }}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={catSubmitting}
                onClick={handleDeleteCategory}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-md disabled:opacity-60"
              >
                {catSubmitting ? 'Deactivating...' : 'Yes, Deactivate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODALS: BRAND ADD/EDIT ── */}
      {(showAddBrandModal || showEditBrandModal) && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 text-left">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-blue-50 text-[#0D47A1] rounded-xl">
                  <Award className="h-4 w-4" />
                </span>
                <h3 className="text-base font-extrabold text-slate-900">
                  {showEditBrandModal ? 'Edit Product Brand' : 'Add New Brand'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowAddBrandModal(false);
                  setShowEditBrandModal(false);
                }}
                className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-full transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {brandFormError && (
              <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold">
                {brandFormError}
              </div>
            )}

            <form onSubmit={handleSaveBrand} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Brand Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sony, Bosch, Haier, Carrier"
                  value={brandFormData.name}
                  onChange={(e) => setBrandFormData({ ...brandFormData, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-[#0D47A1]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Category Association
                </label>
                <select
                  value={brandFormData.category}
                  onChange={(e) => setBrandFormData({ ...brandFormData, category: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-[#0D47A1] cursor-pointer"
                >
                  <option value="Appliances">General Appliances</option>
                  {categories.map((c) => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                  <option value="Electronics">Electronics</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Standard Warranty (Months)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={brandFormData.warrantyMonths}
                    onChange={(e) => setBrandFormData({ ...brandFormData, warrantyMonths: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-[#0D47A1]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Status
                  </label>
                  <select
                    value={brandFormData.status}
                    onChange={(e) => setBrandFormData({ ...brandFormData, status: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-[#0D47A1] cursor-pointer"
                  >
                    <option value="Active">Active (Live)</option>
                    <option value="Pending">Pending (Draft)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Support Email (Optional)
                </label>
                <input
                  type="email"
                  placeholder="support@brand.com"
                  value={brandFormData.supportEmail}
                  onChange={(e) => setBrandFormData({ ...brandFormData, supportEmail: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-[#0D47A1]"
                />
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddBrandModal(false);
                    setShowEditBrandModal(false);
                  }}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={brandSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-[#0D47A1] hover:bg-blue-800 text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-60 flex items-center justify-center gap-1.5"
                >
                  {brandSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>{showEditBrandModal ? 'Save Changes' : 'Create Brand'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODALS: BRAND DELETE ── */}
      {showDeleteBrandModal && deletingBrand && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-100 text-left animate-in fade-in zoom-in-95">
            <h3 className="text-base font-extrabold text-slate-900">
              Delete Brand?
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-1.5 leading-relaxed">
              Are you sure you want to delete brand <strong>"{deletingBrand.name}"</strong>? This will remove it from the available product brands.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteBrandModal(false);
                  setDeletingBrand(null);
                }}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={brandSubmitting}
                onClick={handleDeleteBrand}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-md disabled:opacity-60"
              >
                {brandSubmitting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductCategories;
