import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/super-admin/Sidebar';
import Topbar from '../../components/super-admin/Topbar';
import { Search, Package, Plus, Edit2, Trash2 } from 'lucide-react';
import { apiRequest } from '../../lib/apiClient';

const Products = () => {
  const [searchQuery, setSearchQuery] = useState('');

  // State for products (made mutable)
  const [products, setProducts] = useState([]);
  const [loadError, setLoadError] = useState('');

  // The storefront catalogue. This screen shipped a `defaultProducts` array and
  // fell back to it whenever the fetched value was not an array — which is what
  // happened while the response was being unwrapped twice, so an admin always
  // saw five invented products instead of the real catalogue.
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
      setProducts((prev) => [...prev, toRow(res)]);

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
              onClick={() => setIsModalOpen(true)}
              className="bg-[#0D47A1] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
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
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-base text-slate-800">Add New Catalog Product</h3>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="text-slate-400 hover:text-slate-600 font-extrabold text-lg select-none cursor-pointer p-1"
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleAddProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Product Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. RO Filter Membrane" 
                  className="w-full border border-slate-200 p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-[#0D47A1] text-sm"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">SKU / Code</label>
                  <input 
                    type="text" 
                    placeholder="e.g. SKU-RO-503" 
                    className="w-full border border-slate-200 p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-[#0D47A1] text-sm"
                    value={newSku}
                    onChange={(e) => setNewSku(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Category</label>
                  <select 
                    className="w-full border border-slate-200 p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-[#0D47A1] text-sm bg-white font-semibold text-slate-700"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Retail Price</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. 1,200" 
                    className="w-full border border-slate-200 p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-[#0D47A1] text-sm"
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Initial Stock Units</label>
                  <input 
                    type="number" 
                    required
                    placeholder="e.g. 50" 
                    className="w-full border border-slate-200 p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-[#0D47A1] text-sm"
                    value={newStock}
                    onChange={(e) => setNewStock(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Warranty Period</label>
                <select 
                  className="w-full border border-slate-200 p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-[#0D47A1] text-sm bg-white font-semibold text-slate-700"
                  value={newWarranty}
                  onChange={(e) => setNewWarranty(e.target.value)}
                >
                  <option value="None">None</option>
                  <option value="6 Months">6 Months</option>
                  <option value="1 Year">1 Year</option>
                  <option value="2 Years">2 Years</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Product Image</label>
                <div className="border border-dashed border-slate-200 rounded-xl p-3.5 flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100/70 transition-colors cursor-pointer relative min-h-[90px]">
                  {newImage ? (
                    <div className="relative w-full h-20 flex items-center justify-center">
                      <img src={newImage} className="h-full rounded-lg object-contain" alt="Preview" />
                      <button 
                        type="button" 
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setNewImage(null); }} 
                        className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-red-600 transition-colors shadow-sm text-[10px] font-black cursor-pointer"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <>
                      <Package size={18} className="text-slate-400 mb-1" />
                      <span className="text-xs text-slate-500 font-bold mb-0.5">Click to Upload Image</span>
                      <span className="text-[9px] text-slate-400">PNG, JPG up to 5MB</span>
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
              
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => { setIsModalOpen(false); setNewImage(null); }} 
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer border border-slate-200"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 text-xs font-bold bg-[#0D47A1] text-white rounded-xl hover:bg-blue-700 transition-colors cursor-pointer shadow-sm"
                >
                  Save Product
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
