import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/super-admin/Sidebar';
import Topbar from '../../components/super-admin/Topbar';
import { Search, Package, Plus, Edit2, Trash2, X, UploadCloud, Tag, Percent, Layers, ShieldCheck, DollarSign, Check, PlusCircle } from 'lucide-react';
import { apiRequest } from '../../lib/apiClient';

const PRESET_SPECS = {
  'Air Conditioner': ['1.5 Ton', '1.0 Ton', '2.0 Ton', '5 Star Rating', '3 Star Rating', '100% Copper Condenser', 'Dual Inverter', 'Wi-Fi Smart Control', 'Convertible 4-in-1'],
  'Water Purifier': ['RO + UV + UF', '7 Litres Capacity', 'TDS Controller', 'Mineralizer', 'Copper Tank', 'Wall Mountable'],
  'Refrigerator': ['Double Door', 'Single Door', 'Side by Side', '265 Litres', '3 Star Rating', 'Digital Inverter', 'Frost Free Technology'],
  'Washing Machine': ['Fully Automatic', 'Front Load', 'Top Load', '7.0 Kg Capacity', '5 Star Rating', 'Inverter Direct Drive', 'Smart Motion'],
  'Television': ['4K Ultra HD', '55 Inch Display', '43 Inch Display', 'Smart TV (Google OS)', 'Dolby Audio', '120Hz Refresh Rate'],
  'Others': ['High Efficiency', 'Premium Grade', 'Energy Saver', '1 Year Warranty']
};

const PRESET_BENEFITS = [
  'Free Doorstep Installation',
  '7 Days Replacement Policy',
  'Exchange Offer Available',
  'No Cost EMI Available',
  'Free Shipping',
  'Cash on Delivery Available'
];

const Products = () => {
  const [searchQuery, setSearchQuery] = useState('');

  // State for products
  const [products, setProducts] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [availableBrands, setAvailableBrands] = useState([]);

  const toRow = (item) => ({
    id: item.id,
    name: item.name,
    brand: item.brand || '—',
    sku: item.sku || '—',
    category: item.category || 'General',
    condition: item.condition || 'New',
    originalPrice: item.originalPrice ? `₹${Number(item.originalPrice).toLocaleString('en-IN')}` : null,
    price: `₹${Number(item.price || 0).toLocaleString('en-IN')}`,
    discount: item.originalPrice && item.originalPrice > item.price
      ? Math.round(((item.originalPrice - item.price) / item.originalPrice) * 100)
      : null,
    stock: item.stock ?? 0,
    warranty: item.warrantyMonths ? `${item.warrantyMonths} Months` : 'None',
    image: item.imageUrl || null,
    rawPrice: item.price,
    rawOriginalPrice: item.originalPrice,
    rawSpecs: item.specs || [],
    rawBenefits: item.benefits || [],
    rawImages: item.images || (item.imageUrl ? [item.imageUrl] : []),
  });

  useEffect(() => {
    apiRequest('/products?limit=200')
      .then((res) => setProducts((res || []).map(toRow)))
      .catch((err) => setLoadError(err.message || 'Could not load the product catalogue.'));

    // Dynamically fetch active brands from backend catalog
    apiRequest('/catalog/brands')
      .then((res) => {
        const list = Array.isArray(res) ? res.map(b => b.name) : [];
        setAvailableBrands(list);
      })
      .catch(() => {});
  }, []);

  // Modal Form States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [newName, setNewName] = useState('');
  const [newSku, setNewSku] = useState('');
  const [newCategory, setNewCategory] = useState('Air Conditioner');
  const [newBrand, setNewBrand] = useState('');
  const [customBrand, setCustomBrand] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newOriginalPrice, setNewOriginalPrice] = useState('');
  const [newCondition, setNewCondition] = useState('New');
  const [newStock, setNewStock] = useState('');
  const [newWarranty, setNewWarranty] = useState('None');
  
  // Interactive Tag Chips State
  const [specsTags, setSpecsTags] = useState([]);
  const [customSpecInput, setCustomSpecInput] = useState('');

  const [benefitsTags, setBenefitsTags] = useState(['Free Doorstep Installation', '7 Days Replacement Policy']);
  const [customBenefitInput, setCustomBenefitInput] = useState('');

  const [newImage, setNewImage] = useState(null);
  const [newImages, setNewImages] = useState([]);

  // Helper to generate SKU based on Product Name & Category
  const generateSkuFromName = (nameStr = '', categoryName = 'Air Conditioner') => {
    const prefixes = {
      'Air Conditioner': 'AC',
      'Water Purifier': 'RO',
      'Refrigerator': 'REF',
      'Washing Machine': 'WM',
      'Television': 'TV',
      'Others': 'GEN',
    };
    const catPrefix = prefixes[categoryName] || 'PRD';

    const clean = nameStr
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9\s]/g, '');

    if (!clean) {
      return '';
    }

    const words = clean.split(/\s+/).filter(Boolean);
    const codePart = words
      .map((w) => w.slice(0, 4))
      .join('-')
      .slice(0, 16);

    return `SKU-${catPrefix}-${codePart}`;
  };

  // Lock body scroll when modal is open to prevent background scrolling
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isModalOpen]);

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setNewName('');
    setNewSku('');
    setNewCategory('Air Conditioner');
    setNewBrand('');
    setCustomBrand('');
    setNewPrice('');
    setNewOriginalPrice('');
    setNewCondition('New');
    setNewStock('');
    setNewWarranty('None');
    setSpecsTags([]);
    setBenefitsTags(['Free Doorstep Installation', '7 Days Replacement Policy']);
    setNewImage(null);
    setNewImages([]);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (p) => {
    setEditingProduct(p);
    setNewName(p.name || '');
    setNewSku(p.sku !== '—' ? p.sku : '');
    setNewCategory(p.category || 'Air Conditioner');
    setNewBrand(p.brand !== '—' ? p.brand : '');
    setCustomBrand('');
    setNewPrice(p.rawPrice ? String(p.rawPrice) : '');
    setNewOriginalPrice(p.rawOriginalPrice ? String(p.rawOriginalPrice) : '');
    setNewCondition(p.condition || 'New');
    setNewStock(String(p.stock ?? 0));
    setNewWarranty(p.warranty && p.warranty !== 'None' ? p.warranty.replace(/[^0-9]/g, '') : 'None');
    setSpecsTags(p.rawSpecs || []);
    setBenefitsTags(p.rawBenefits || ['Free Doorstep Installation', '7 Days Replacement Policy']);
    const imgs = p.rawImages?.length ? p.rawImages : (p.image ? [p.image] : []);
    setNewImages(imgs);
    setNewImage(imgs[0] || null);
    setIsModalOpen(true);
  };

  const toggleSpecTag = (tag) => {
    setSpecsTags((prev) => 
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const toggleBenefitTag = (tag) => {
    setBenefitsTags((prev) => 
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleAddCustomSpec = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = customSpecInput.trim().replace(/^,|,$/g, '');
      if (val && !specsTags.includes(val)) {
        setSpecsTags((prev) => [...prev, val]);
      }
      setCustomSpecInput('');
    }
  };

  const handleAddCustomBenefit = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = customBenefitInput.trim().replace(/^,|,$/g, '');
      if (val && !benefitsTags.includes(val)) {
        setBenefitsTags((prev) => [...prev, val]);
      }
      setCustomBenefitInput('');
    }
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    setLoadError('');
    const finalBrand = newBrand === 'Custom' ? customBrand.trim() : newBrand;

    const payload = {
      name: newName,
      sku: newSku || undefined,
      category: newCategory,
      brand: finalBrand || undefined,
      price: Number(String(newPrice).replace(/[₹,]/g, '')) || 0,
      originalPrice: newOriginalPrice ? Number(String(newOriginalPrice).replace(/[₹,]/g, '')) : undefined,
      condition: newCondition,
      stock: parseInt(newStock, 10) || 0,
      warrantyMonths: newWarranty === 'None' ? undefined : parseInt(newWarranty, 10) || undefined,
      specs: specsTags.length > 0 ? specsTags : undefined,
      benefits: benefitsTags.length > 0 ? benefitsTags : undefined,
      imageUrl: newImages[0] || newImage || undefined,
      images: newImages.length > 0 ? newImages : (newImage ? [newImage] : undefined),
    };

    try {
      if (editingProduct) {
        const res = await apiRequest(`/products/${editingProduct.id}`, {
          method: 'PUT',
          auth: true,
          body: payload,
        });
        setProducts((prev) => prev.map((p) => (p.id === editingProduct.id ? toRow(res) : p)));
      } else {
        const res = await apiRequest('/products', {
          method: 'POST',
          auth: true,
          body: payload,
        });
        setProducts((prev) => [toRow(res), ...prev]);
      }

      setEditingProduct(null);
      setNewName('');
      setNewSku('');
      setNewCategory('Air Conditioner');
      setNewBrand('');
      setCustomBrand('');
      setNewPrice('');
      setNewOriginalPrice('');
      setNewCondition('New');
      setNewStock('');
      setNewWarranty('None');
      setSpecsTags([]);
      setBenefitsTags(['Free Doorstep Installation', '7 Days Replacement Policy']);
      setNewImage(null);
      setNewImages([]);
      setIsModalOpen(false);
    } catch (err) {
      setLoadError(err.message || 'Could not save the product.');
    }
  };

  const handleDelete = async (id) => {
    const previous = products;
    setProducts((prev) => prev.filter((p) => p.id !== id));
    try {
      await apiRequest(`/products/${id}`, { method: 'DELETE', auth: true });
    } catch (err) {
      setProducts(previous);
      setLoadError(err.message || 'Could not delete the product.');
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.brand.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentCategoryPresets = PRESET_SPECS[newCategory] || PRESET_SPECS['Others'];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex text-slate-800 animate-in fade-in duration-150 font-sans">
      <Sidebar />
      <div className="flex-1 ml-64 min-h-screen flex flex-col">
        <Topbar title="NCC Product Catalog" subtitle="Manage catalog items and accessories" />
        <div className="p-6 space-y-6 flex-1 bg-[#F8FAFC]">
          
          <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] flex flex-wrap gap-4 items-center justify-between shadow-sm">
            <div className="relative w-64">
              <Search size={16} className="absolute left-3 top-3 text-[#64748B]" />
              <input 
                type="text" 
                placeholder="Search Product, SKU, Brand..." 
                className="w-full pl-10 pr-4 py-2 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] outline-none text-sm bg-[#F8FAFC]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button 
              onClick={handleOpenAddModal} 
              className="bg-[#0D47A1] hover:bg-blue-800 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-sm"
            >
              <Plus size={16} /> Add Catalog Product
            </button>
          </div>

          {loadError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-xs font-bold">
              {loadError}
            </div>
          )}

          {/* Product Table */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-sm">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#F8FAFC] text-[#64748B] text-xs uppercase border-b border-[#E2E8F0] font-black">
                <tr>
                  <th className="p-4 pl-6">Product Item</th>
                  <th className="p-4">Brand</th>
                  <th className="p-4">SKU / Code</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Selling Price (MRP)</th>
                  <th className="p-4">Stock</th>
                  <th className="p-4">Warranty</th>
                  <th className="p-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {filteredProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="p-4 pl-6 font-medium text-[#1E293B]">
                      <div className="flex items-center gap-3">
                        {p.image ? (
                          <img src={p.image} className="w-10 h-10 rounded-lg object-cover border border-slate-200 flex-shrink-0" alt={p.name} />
                        ) : (
                          <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 border border-slate-200 flex-shrink-0">
                            <Package size={16} />
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-slate-900 leading-snug">{p.name}</p>
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-semibold mt-0.5 inline-block">
                            {p.condition}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 font-bold text-slate-700">{p.brand}</td>
                    <td className="p-4 font-mono text-xs font-bold text-[#0D47A1] bg-blue-50/50 px-2 py-1 rounded w-max">{p.sku}</td>
                    <td className="p-4 text-slate-700 font-semibold">{p.category}</td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="text-slate-900 font-black">{p.price}</span>
                        {p.originalPrice && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-slate-400 line-through text-[11px] font-medium">{p.originalPrice}</span>
                            {p.discount && (
                              <span className="text-emerald-600 font-black text-[10px] bg-emerald-50 px-1 rounded">
                                ↓{p.discount}% OFF
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`font-bold ${p.stock < 20 ? 'text-red-500 font-black' : 'text-slate-700'}`}>
                        {p.stock} Units
                      </span>
                    </td>
                    <td className="p-4 text-slate-500 font-semibold">{p.warranty}</td>
                    <td className="p-4 pr-6 text-right space-x-1">
                      <button 
                        onClick={() => handleOpenEditModal(p)}
                        className="text-slate-400 hover:text-[#0D47A1] inline-block p-1.5 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        title="Edit Product Details"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(p.id)}
                        className="text-slate-400 hover:text-red-600 inline-block p-1.5 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete Product"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredProducts.length === 0 && (
              <div className="text-center py-12 text-[#64748B]">No products found matching filters.</div>
            )}
          </div>

        </div>
      </div>

      {/* Clean & Interactive Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200 overscroll-contain">
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xl shadow-blue-950/20 max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/70 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#0D47A1] shadow-xs">
                  <Package size={20} />
                </div>
                <div>
                  <h3 className="font-black text-lg text-slate-800 tracking-tight">
                    {editingProduct ? 'Edit Product Details' : 'Add New Catalog Product'}
                  </h3>
                  <p className="text-xs text-slate-400 font-semibold">Organized product details and quick-click spec chips</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => { setIsModalOpen(false); setNewImage(null); setEditingProduct(null); }} 
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleSaveProduct} className="flex-1 overflow-y-auto p-6 md:p-7 space-y-6 overscroll-contain custom-scrollbar text-left">
              
              {/* SECTION 1: Product Identity */}
              <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-200/70 space-y-4">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200/60 pb-2.5">
                  <Layers size={15} className="text-[#0D47A1]" /> Product Identity & Category
                </h4>

                {/* Product Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>Product Name</span>
                    <span className="text-red-500 font-bold text-[10px]">*Required</span>
                  </label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. Daikin 1.5 Ton 5 Star Inverter AC" 
                    className="w-full bg-white border border-slate-200 px-4 py-2.5 rounded-xl outline-none focus:border-[#0D47A1] focus:ring-4 focus:ring-blue-500/10 text-sm font-semibold text-slate-800 placeholder:text-slate-400 transition-all shadow-xs"
                    value={newName}
                    onChange={(e) => {
                      const nameVal = e.target.value;
                      setNewName(nameVal);
                      setNewSku(generateSkuFromName(nameVal, newCategory));
                    }}
                  />
                </div>

                {/* Category & Dynamic Brand */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                      Category
                    </label>
                    <select 
                      className="w-full bg-white border border-slate-200 px-3.5 py-2.5 rounded-xl outline-none focus:border-[#0D47A1] focus:ring-4 focus:ring-blue-500/10 text-sm font-semibold text-slate-700 cursor-pointer shadow-xs"
                      value={newCategory}
                      onChange={(e) => {
                        const selectedCat = e.target.value;
                        setNewCategory(selectedCat);
                        setNewSku(generateSkuFromName(newName, selectedCat));
                      }}
                    >
                      <option value="Air Conditioner">Air Conditioner</option>
                      <option value="Water Purifier">Water Purifier</option>
                      <option value="Refrigerator">Refrigerator</option>
                      <option value="Washing Machine">Washing Machine</option>
                      <option value="Television">Television</option>
                      <option value="Others">Others</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                      Brand Name (Dynamic)
                    </label>
                    <select 
                      className="w-full bg-white border border-slate-200 px-3.5 py-2.5 rounded-xl outline-none focus:border-[#0D47A1] focus:ring-4 focus:ring-blue-500/10 text-sm font-semibold text-slate-700 cursor-pointer shadow-xs"
                      value={newBrand}
                      onChange={(e) => setNewBrand(e.target.value)}
                    >
                      <option value="">Select Brand</option>
                      {availableBrands.map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                      <option value="Voltas">Voltas</option>
                      <option value="Daikin">Daikin</option>
                      <option value="LG">LG</option>
                      <option value="Samsung">Samsung</option>
                      <option value="Whirlpool">Whirlpool</option>
                      <option value="Kent">Kent</option>
                      <option value="Aquaguard">Aquaguard</option>
                      <option value="Custom">+ Type Custom Brand</option>
                    </select>

                    {newBrand === 'Custom' && (
                      <input 
                        type="text"
                        required
                        placeholder="Type brand name..."
                        className="mt-2 w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-[#0D47A1]"
                        value={customBrand}
                        onChange={(e) => setCustomBrand(e.target.value)}
                      />
                    )}
                  </div>
                </div>

                {/* SKU Code & Condition */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                      SKU Code (Auto Generated)
                    </label>
                    <input 
                      type="text" 
                      placeholder="e.g. SKU-AC-DAIK-15T" 
                      className="w-full bg-white border border-slate-200 px-3.5 py-2.5 rounded-xl outline-none focus:border-[#0D47A1] focus:ring-4 focus:ring-blue-500/10 text-sm font-bold text-[#0D47A1] placeholder:text-slate-400 font-mono shadow-xs"
                      value={newSku}
                      onChange={(e) => setNewSku(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                      Item Condition
                    </label>
                    <select 
                      className="w-full bg-white border border-slate-200 px-3.5 py-2.5 rounded-xl outline-none focus:border-[#0D47A1] focus:ring-4 focus:ring-blue-500/10 text-sm font-semibold text-slate-700 cursor-pointer shadow-xs"
                      value={newCondition}
                      onChange={(e) => setNewCondition(e.target.value)}
                    >
                      <option value="New">Brand New</option>
                      <option value="Refurbished">Refurbished (Renewed)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION 2: Pricing & Stock Inventory */}
              <div className="bg-[#F8FAFC] p-5 rounded-2xl border border-slate-200/70 space-y-4">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200/60 pb-2.5">
                  <DollarSign size={15} className="text-[#0D47A1]" /> Pricing & Inventory Breakdown
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                      <span>Selling Price</span>
                      <span className="text-red-500 font-bold text-[10px]">*Required</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                      <input 
                        type="text" 
                        required
                        placeholder="32,990" 
                        className="w-full bg-white border border-slate-200 pl-8 pr-3 py-2.5 rounded-xl outline-none focus:border-[#0D47A1] focus:ring-4 focus:ring-blue-500/10 text-sm font-bold text-slate-900 shadow-xs"
                        value={newPrice}
                        onChange={(e) => setNewPrice(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                      Original Price (MRP)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                      <input 
                        type="text" 
                        placeholder="45,000" 
                        className="w-full bg-white border border-slate-200 pl-8 pr-3 py-2.5 rounded-xl outline-none focus:border-[#0D47A1] focus:ring-4 focus:ring-blue-500/10 text-sm font-semibold text-slate-800 shadow-xs"
                        value={newOriginalPrice}
                        onChange={(e) => setNewOriginalPrice(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <Percent size={13} /> Auto Discount %
                    </label>
                    <div className="relative">
                      {(() => {
                        const numSelling = Number(String(newPrice).replace(/[₹,]/g, '')) || 0;
                        const numMrp = Number(String(newOriginalPrice).replace(/[₹,]/g, '')) || 0;
                        const disc = (numMrp > numSelling && numSelling > 0)
                          ? Math.round(((numMrp - numSelling) / numMrp) * 100)
                          : 0;
                        return (
                          <input 
                            type="text" 
                            readOnly
                            placeholder="0% OFF" 
                            value={disc > 0 ? `↓ ${disc}% OFF` : '0% OFF'}
                            className="w-full bg-emerald-50 border border-emerald-200 px-3 py-2.5 rounded-xl outline-none text-xs font-black text-emerald-700 font-mono text-center shadow-xs cursor-default"
                          />
                        );
                      })()}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                      <span>Stock Units</span>
                      <span className="text-red-500 font-bold text-[10px]">*Required</span>
                    </label>
                    <input 
                      type="number" 
                      required
                      placeholder="25" 
                      className="w-full bg-white border border-slate-200 px-3.5 py-2.5 rounded-xl outline-none focus:border-[#0D47A1] focus:ring-4 focus:ring-blue-500/10 text-sm font-semibold text-slate-800 shadow-xs"
                      value={newStock}
                      onChange={(e) => setNewStock(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                      Warranty Period
                    </label>
                    <select 
                      className="w-full bg-white border border-slate-200 px-3.5 py-2.5 rounded-xl outline-none focus:border-[#0D47A1] focus:ring-4 focus:ring-blue-500/10 text-sm font-semibold text-slate-700 cursor-pointer shadow-xs"
                      value={newWarranty}
                      onChange={(e) => setNewWarranty(e.target.value)}
                    >
                      <option value="None">None</option>
                      <option value="6 Months">6 Months</option>
                      <option value="12 Months">12 Months (1 Year)</option>
                      <option value="24 Months">24 Months (2 Years)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION 3: Highlights & Quick Click Tag Chips */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 space-y-5 shadow-xs">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2.5">
                  <ShieldCheck size={15} className="text-[#0D47A1]" /> Interactive Specifications & Highlights
                </h4>

                {/* 1. Key Specifications Tag Selector */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Key Specifications Highlights
                  </label>
                  
                  {/* Selected Spec Tag Chips */}
                  <div className="flex flex-wrap gap-2 min-h-[38px] p-2 bg-slate-50/80 border border-slate-200 rounded-xl items-center">
                    {specsTags.length === 0 ? (
                      <span className="text-xs text-slate-400 font-medium px-2">Click tags below or type + Enter to add specs...</span>
                    ) : (
                      specsTags.map((tag) => (
                        <span key={tag} className="inline-flex items-center gap-1.5 text-xs font-bold bg-[#0D47A1] text-white px-2.5 py-1 rounded-lg shadow-xs">
                          {tag}
                          <button type="button" onClick={() => toggleSpecTag(tag)} className="hover:text-red-200 cursor-pointer">
                            <X size={13} />
                          </button>
                        </span>
                      ))
                    )}
                  </div>

                  {/* Preset Quick Tags Clicker */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-bold text-slate-400 block">Quick Add ({newCategory} Specs):</span>
                    <div className="flex flex-wrap gap-1.5">
                      {currentCategoryPresets.map((preset) => {
                        const isSelected = specsTags.includes(preset);
                        return (
                          <button
                            type="button"
                            key={preset}
                            onClick={() => toggleSpecTag(preset)}
                            className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                              isSelected 
                                ? 'bg-blue-50 text-[#0D47A1] border-blue-200 font-bold' 
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {isSelected ? <Check size={12} className="text-[#0D47A1]" /> : <PlusCircle size={12} className="text-slate-400" />}
                            {preset}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Custom Spec Tag Input */}
                  <div className="pt-1">
                    <input 
                      type="text" 
                      placeholder="Type custom spec & press Enter or comma..." 
                      className="w-full bg-slate-50/60 border border-slate-200 px-3.5 py-2 rounded-xl outline-none focus:bg-white focus:border-[#0D47A1] text-xs font-medium text-slate-800 placeholder:text-slate-400"
                      value={customSpecInput}
                      onChange={(e) => setCustomSpecInput(e.target.value)}
                      onKeyDown={handleAddCustomSpec}
                    />
                  </div>
                </div>

                {/* 2. Benefits & Offers Tag Selector */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Benefits & Promotional Offers
                  </label>

                  {/* Selected Benefits Tag Chips */}
                  <div className="flex flex-wrap gap-2 min-h-[38px] p-2 bg-slate-50/80 border border-slate-200 rounded-xl items-center">
                    {benefitsTags.length === 0 ? (
                      <span className="text-xs text-slate-400 font-medium px-2">Click preset benefits below to add...</span>
                    ) : (
                      benefitsTags.map((benefit) => (
                        <span key={benefit} className="inline-flex items-center gap-1.5 text-xs font-bold bg-emerald-600 text-white px-2.5 py-1 rounded-lg shadow-xs">
                          {benefit}
                          <button type="button" onClick={() => toggleBenefitTag(benefit)} className="hover:text-red-200 cursor-pointer">
                            <X size={13} />
                          </button>
                        </span>
                      ))
                    )}
                  </div>

                  {/* Preset Benefits Quick Clicker */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {PRESET_BENEFITS.map((preset) => {
                      const isSelected = benefitsTags.includes(preset);
                      return (
                        <button
                          type="button"
                          key={preset}
                          onClick={() => toggleBenefitTag(preset)}
                          className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                            isSelected 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold' 
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {isSelected ? <Check size={12} className="text-emerald-600" /> : <PlusCircle size={12} className="text-slate-400" />}
                          {preset}
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom Benefit Tag Input */}
                  <div className="pt-1">
                    <input 
                      type="text" 
                      placeholder="Type custom benefit & press Enter or comma..." 
                      className="w-full bg-slate-50/60 border border-slate-200 px-3.5 py-2 rounded-xl outline-none focus:bg-white focus:border-[#0D47A1] text-xs font-medium text-slate-800 placeholder:text-slate-400"
                      value={customBenefitInput}
                      onChange={(e) => setCustomBenefitInput(e.target.value)}
                      onKeyDown={handleAddCustomBenefit}
                    />
                  </div>
                </div>

                {/* Product Images Upload (Maximum 5 Images) */}
                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                      Product Images ({newImages.length}/5)
                    </label>
                    <span className="text-[10px] text-[#0D47A1] font-bold">
                      {newImages.length >= 5 ? 'Max 5 Images Reached' : 'Upload Max 5 Images'}
                    </span>
                  </div>

                  {newImages.length > 0 ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                        {newImages.map((imgSrc, idx) => (
                          <div key={idx} className="relative group w-full h-24 bg-white rounded-xl p-1.5 border border-slate-200 shadow-2xs flex items-center justify-center overflow-hidden">
                            <img src={imgSrc} className="max-h-full max-w-full object-contain" alt={`Preview ${idx + 1}`} />
                            {idx === 0 && (
                              <span className="absolute top-1 left-1 bg-[#0D47A1] text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow-xs">
                                Primary
                              </span>
                            )}
                            <button 
                              type="button" 
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const updated = newImages.filter((_, i) => i !== idx);
                                setNewImages(updated);
                                setNewImage(updated[0] || null);
                              }} 
                              className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center transition-colors shadow-md text-xs font-black cursor-pointer"
                              title="Remove Image"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}

                        {/* Add More Button Card (Only if under 5 images) */}
                        {newImages.length < 5 && (
                          <div className="relative group w-full h-24 border-2 border-dashed border-blue-200 hover:border-[#0D47A1] rounded-xl flex flex-col items-center justify-center bg-blue-50/30 hover:bg-blue-50/70 transition-all cursor-pointer">
                            <PlusCircle size={20} className="text-[#0D47A1] mb-1" />
                            <span className="text-[10px] font-black text-[#0D47A1]">+ Add More</span>
                            <input 
                              type="file" 
                              accept="image/*"
                              multiple
                              className="absolute inset-0 opacity-0 cursor-pointer" 
                              onChange={(e) => {
                                const files = Array.from(e.target.files || []);
                                const remaining = 5 - newImages.length;
                                const allowedFiles = files.slice(0, remaining);
                                allowedFiles.forEach((file) => {
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    setNewImages((prev) => prev.length < 5 ? [...prev, reader.result] : prev);
                                    setNewImage((prev) => prev || reader.result);
                                  };
                                  reader.readAsDataURL(file);
                                });
                              }}
                            />
                          </div>
                        )}
                      </div>
                      <p className="text-[10px] font-medium text-slate-400">
                        * Maximum 5 photos allowed. First image labeled <strong className="text-slate-600">Primary</strong> will be used as main thumbnail.
                      </p>
                    </div>
                  ) : (
                    <div className="group border-2 border-dashed border-slate-200 hover:border-[#0D47A1]/50 rounded-2xl p-4 flex flex-col items-center justify-center bg-slate-50/50 hover:bg-blue-50/30 transition-all cursor-pointer relative min-h-[110px]">
                      <div className="w-10 h-10 rounded-full bg-blue-50 group-hover:bg-blue-100 text-[#0D47A1] flex items-center justify-center mb-1.5 transition-colors shadow-inner">
                        <UploadCloud size={20} />
                      </div>
                      <span className="text-xs text-slate-700 font-bold mb-0.5 group-hover:text-[#0D47A1] transition-colors">
                        Click to Upload Product Images (Max 5 Images)
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">PNG, JPG, WEBP up to 5MB (Maximum 5 photos)</span>
                      <input 
                        type="file" 
                        accept="image/*"
                        multiple
                        className="absolute inset-0 opacity-0 cursor-pointer" 
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          const allowedFiles = files.slice(0, 5);
                          allowedFiles.forEach((file) => {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setNewImages((prev) => prev.length < 5 ? [...prev, reader.result] : prev);
                              setNewImage((prev) => prev || reader.result);
                            };
                            reader.readAsDataURL(file);
                          });
                        }}
                      />
                    </div>
                  )}
                </div>

              </div>

              {/* Form Action Buttons (Sticky at Bottom) */}
              <div className="pt-4 border-t border-slate-200/80 flex justify-end gap-3 shrink-0">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-2.5 text-xs font-bold bg-[#0D47A1] hover:bg-blue-800 text-white rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2"
                >
                  {editingProduct ? <Check size={16} /> : <Plus size={16} />}
                  {editingProduct ? 'Update Product Details' : 'Save Product to Catalog'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;
