import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/super-admin/Sidebar';
import Topbar from '../../components/super-admin/Topbar';
import { Search, Package, Plus, Edit2, Trash2, X, UploadCloud, RotateCw } from 'lucide-react';
import { apiRequest } from '../../lib/apiClient';

const Products = () => {
  const [searchQuery, setSearchQuery] = useState('');

  // State for products (made mutable)
  const [products, setProducts] = useState([]);
  const [loadError, setLoadError] = useState('');

  const toRow = (item) => ({
    id: item.id,
    name: item.name,
    sku: item.sku || '—',
    category: item.category || 'General',
    price: `₹${Number(item.price || 0).toLocaleString('en-IN')}`,
    stock: item.stock ?? 0,
    warranty: item.warrantyMonths ? `${item.warrantyMonths} Months` : 'None',
    image: item.imageUrl || null,
  });

  useEffect(() => {
    apiRequest('/products?limit=200')
      .then((res) => setProducts((res || []).map(toRow)))
      .catch((err) => setLoadError(err.message || 'Could not load the product catalogue.'));
  }, []);

  // Modal Form States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSku, setNewSku] = useState('');
  const [newCategory, setNewCategory] = useState('Air Conditioner');
  const [newPrice, setNewPrice] = useState('');
  const [newStock, setNewStock] = useState('');
  const [newWarranty, setNewWarranty] = useState('None');
  const [newImage, setNewImage] = useState(null);

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

  const handleAddProduct = async (e) => {
    e.preventDefault();
    setLoadError('');
    try {
      const res = await apiRequest('/products', {
        method: 'POST',
        auth: true,
        body: {
          name: newName,
          sku: newSku || undefined,
          category: newCategory,
          price: Number(String(newPrice).replace(/[₹,]/g, '')) || 0,
          stock: parseInt(newStock, 10) || 0,
          warrantyMonths: newWarranty === 'None' ? undefined : parseInt(newWarranty, 10) || undefined,
          imageUrl: newImage || undefined,
        },
      });
      setProducts((prev) => [toRow(res), ...prev]);

      setNewName('');
      setNewSku('');
      setNewCategory('Air Conditioner');
      setNewPrice('');
      setNewStock('');
      setNewWarranty('None');
      setNewImage(null);
      setIsModalOpen(false);
    } catch (err) {
      setLoadError(err.message || 'Could not add the product.');
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
    p.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex text-slate-800 animate-in fade-in duration-150">
      <Sidebar />
      <div className="flex-1 ml-64 min-h-screen flex flex-col">
        <Topbar title="NCC Product Catalog" subtitle="Manage catalog items and accessories" />
        <div className="p-6 space-y-6 flex-1 bg-[#F8FAFC]">
          
          <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] flex flex-wrap gap-4 items-center justify-between shadow-sm">
            <div className="relative w-64">
              <Search size={16} className="absolute left-3 top-3 text-[#64748B]" />
              <input 
                type="text" 
                placeholder="Search Product, SKU..." 
                className="w-full pl-10 pr-4 py-2 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] outline-none text-sm bg-[#F8FAFC]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button 
              onClick={() => {
                setNewName('');
                setNewSku('');
                setNewCategory('Air Conditioner');
                setIsModalOpen(true);
              }}
              className="bg-[#0D47A1] text-[#FFFFFF] px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <Plus size={16} /> Add Catalog Item
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 text-xs font-black tracking-wider uppercase">
                  <th className="p-4 pl-6">Product Details</th>
                  <th className="p-4">SKU / Code</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Retail Price</th>
                  <th className="p-4">Stock Level</th>
                  <th className="p-4">Warranty</th>
                  <th className="p-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 pl-6">
                      <div className="flex items-center gap-3">
                        {p.image ? (
                          <img src={p.image} className="w-8 h-8 rounded-lg object-cover border border-slate-100 flex-shrink-0" alt={p.name} />
                        ) : (
                          <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400 border border-slate-100 flex-shrink-0">
                            <Package size={14} />
                          </div>
                        )}
                        <p className="font-bold text-slate-800">{p.name}</p>
                      </div>
                    </td>
                    <td className="p-4 font-mono text-xs font-bold text-slate-500">{p.sku}</td>
                    <td className="p-4 text-slate-700 font-semibold">{p.category}</td>
                    <td className="p-4 text-slate-800 font-black">{p.price}</td>
                    <td className="p-4">
                      <span className={`font-bold ${p.stock < 20 ? 'text-red-500 font-black' : 'text-slate-700'}`}>
                        {p.stock} Units
                      </span>
                    </td>
                    <td className="p-4 text-slate-500 font-semibold">{p.warranty}</td>
                    <td className="p-4 pr-6 text-right space-x-2">
                      <button className="text-slate-500 hover:text-[#0D47A1] inline-block p-1 hover:bg-slate-100 rounded transition-colors cursor-pointer"><Edit2 size={14} /></button>
                      <button 
                        onClick={() => handleDelete(p.id)}
                        className="text-slate-500 hover:text-red-600 inline-block p-1 hover:bg-red-50 rounded transition-colors cursor-pointer"
                      >
                        <Trash2 size={14} />
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

      {/* Form Modal for Add Catalog Item */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200 overscroll-contain">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xl shadow-blue-950/20 max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#0D47A1] shadow-inner">
                  <Package size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-slate-800 tracking-tight">Add New Catalog Product</h3>
                  <p className="text-xs text-slate-500 font-medium">Fill in details to add product to catalog</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => { setIsModalOpen(false); setNewImage(null); }} 
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleAddProduct} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto overscroll-contain custom-scrollbar">
              {/* Product Name */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Product Name</span>
                  <span className="text-red-500 font-normal text-[10px]">*Required</span>
                </label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. RO Filter Membrane 100 GPD" 
                  className="w-full bg-slate-50/80 border border-slate-200 px-3.5 py-2.5 rounded-xl outline-none focus:bg-white focus:border-[#0D47A1] focus:ring-4 focus:ring-blue-500/10 text-sm font-medium text-slate-800 placeholder:text-slate-400 transition-all"
                  value={newName}
                  onChange={(e) => {
                    const nameVal = e.target.value;
                    setNewName(nameVal);
                    setNewSku(generateSkuFromName(nameVal, newCategory));
                  }}
                />
              </div>

              {/* SKU & Category */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                    SKU / Code
                  </label>
                  <input 
                    type="text" 
                    placeholder="e.g. SKU-AC-INV-AC" 
                    className="w-full bg-slate-50/80 border border-slate-200 px-3.5 py-2.5 rounded-xl outline-none focus:bg-white focus:border-[#0D47A1] focus:ring-4 focus:ring-blue-500/10 text-sm font-medium text-slate-800 placeholder:text-slate-400 transition-all font-mono"
                    value={newSku}
                    onChange={(e) => setNewSku(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                    Category
                  </label>
                  <select 
                    className="w-full bg-slate-50/80 border border-slate-200 px-3.5 py-2.5 rounded-xl outline-none focus:bg-white focus:border-[#0D47A1] focus:ring-4 focus:ring-blue-500/10 text-sm font-semibold text-slate-700 transition-all cursor-pointer"
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
              </div>

              {/* Retail Price & Initial Stock */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>Retail Price</span>
                    <span className="text-red-500 font-normal text-[10px]">*Required</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                    <input 
                      type="text" 
                      required
                      placeholder="1,200" 
                      className="w-full bg-slate-50/80 border border-slate-200 pl-8 pr-3.5 py-2.5 rounded-xl outline-none focus:bg-white focus:border-[#0D47A1] focus:ring-4 focus:ring-blue-500/10 text-sm font-semibold text-slate-800 placeholder:text-slate-400 transition-all"
                      value={newPrice}
                      onChange={(e) => setNewPrice(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>Initial Stock Units</span>
                    <span className="text-red-500 font-normal text-[10px]">*Required</span>
                  </label>
                  <input 
                    type="number" 
                    required
                    placeholder="50" 
                    className="w-full bg-slate-50/80 border border-slate-200 px-3.5 py-2.5 rounded-xl outline-none focus:bg-white focus:border-[#0D47A1] focus:ring-4 focus:ring-blue-500/10 text-sm font-medium text-slate-800 placeholder:text-slate-400 transition-all"
                    value={newStock}
                    onChange={(e) => setNewStock(e.target.value)}
                  />
                </div>
              </div>

              {/* Warranty Period */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Warranty Period
                </label>
                <select 
                  className="w-full bg-slate-50/80 border border-slate-200 px-3.5 py-2.5 rounded-xl outline-none focus:bg-white focus:border-[#0D47A1] focus:ring-4 focus:ring-blue-500/10 text-sm font-semibold text-slate-700 transition-all cursor-pointer"
                  value={newWarranty}
                  onChange={(e) => setNewWarranty(e.target.value)}
                >
                  <option value="None">None</option>
                  <option value="6 Months">6 Months</option>
                  <option value="1 Year">1 Year</option>
                  <option value="2 Years">2 Years</option>
                </select>
              </div>

              {/* Product Image Dropzone */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Product Image
                </label>
                <div className="group border-2 border-dashed border-slate-200 hover:border-[#0D47A1]/50 rounded-2xl p-4 flex flex-col items-center justify-center bg-slate-50/60 hover:bg-blue-50/30 transition-all cursor-pointer relative min-h-[110px]">
                  {newImage ? (
                    <div className="relative w-full h-24 flex items-center justify-center bg-white rounded-xl p-2 border border-slate-100 shadow-xs">
                      <img src={newImage} className="h-full rounded-lg object-contain" alt="Preview" />
                      <button 
                        type="button" 
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setNewImage(null); }} 
                        className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center transition-colors shadow-md text-xs font-black cursor-pointer"
                        title="Remove Image"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="w-10 h-10 rounded-full bg-blue-50 group-hover:bg-blue-100 text-[#0D47A1] flex items-center justify-center mb-2 transition-colors shadow-inner">
                        <UploadCloud size={20} />
                      </div>
                      <span className="text-xs text-slate-700 font-bold mb-0.5 group-hover:text-[#0D47A1] transition-colors">
                        Click to Upload Image
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">PNG, JPG, WEBP up to 5MB</span>
                    </>
                  )}
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setNewImage(reader.result);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </div>
              </div>
              
              {/* Actions Footer */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => { setIsModalOpen(false); setNewImage(null); }} 
                  className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-2.5 text-xs font-bold bg-gradient-to-r from-[#0D47A1] to-[#1565C0] hover:from-[#0B3C88] hover:to-[#0D47A1] text-white rounded-xl shadow-lg shadow-blue-600/20 active:scale-[0.98] transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Plus size={15} /> Save Product
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
