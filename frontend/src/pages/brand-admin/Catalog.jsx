import React, { useState } from 'react';
import Sidebar from '../../components/brand-admin/Sidebar';
import Topbar from '../../components/brand-admin/Topbar';
import { 
  Search, 
  Filter, 
  ShoppingBag, 
  Plus, 
  Edit, 
  Trash2, 
  MoreVertical,
  X,
  Check,
  Eye,
  IndianRupee,
  Package,
  Layers,
  Sparkles,
  CheckCircle2
} from 'lucide-react';

const Catalog = () => {
  const [showModal, setShowModal] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', category: 'Smart TV', model: '', price: '', stock: '', status: 'Active' });
  const [successMessage, setSuccessMessage] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [selectedStatus, setSelectedStatus] = useState('All Status');

  const [products, setProducts] = useState([
    { id: 'PROD-001', name: 'LG 55" OLED 4K Smart TV', category: 'Smart TV', model: 'LG-55OLEDEV', price: '₹1,24,990', stock: 12, status: 'Active' },
    { id: 'PROD-002', name: 'LG 260L Double Door Refrigerator', category: 'Refrigerator', model: 'LG-REF-450', price: '₹28,490', stock: 8, status: 'Active' },
    { id: 'PROD-003', name: 'LG 7kg Front Load Washing Machine', category: 'Washing Machine', model: 'LG-WM-70', price: '₹34,990', stock: 0, status: 'Active' },
    { id: 'PROD-004', name: 'LG 20L Solo Microwave Oven', category: 'Microwave', model: 'LG-MW-20', price: '₹7,490', stock: 15, status: 'Draft' },
  ]);

  const stats = [
    { title: 'Total Products', value: (products.length + 44).toString(), icon: <Layers size={20} />, color: 'bg-blue-600' },
    { title: 'Active Catalog', value: (products.filter(p => p.status === 'Active').length + 33).toString(), icon: <ShoppingBag size={20} />, color: 'bg-emerald-600' },
    { title: 'Out of Stock', value: products.filter(p => p.stock === 0).length.toString(), icon: <Package size={20} />, color: 'bg-red-600' },
    { title: 'Orders Fulfilled', value: '240', icon: <Sparkles size={20} />, color: 'bg-indigo-600' },
  ];

  const handleAddProductSubmit = (e) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.model || !newProduct.price) {
      setSuccessMessage('Error: Please fill out all required fields.');
      setTimeout(() => setSuccessMessage(''), 3000);
      return;
    }
    const formattedPrice = newProduct.price.startsWith('₹') ? newProduct.price : `₹${Number(newProduct.price).toLocaleString()}`;
    const addedProd = {
      id: `PROD-0${products.length + 1}`,
      name: newProduct.name,
      category: newProduct.category,
      model: newProduct.model,
      price: formattedPrice,
      stock: Number(newProduct.stock) || 0,
      status: newProduct.status
    };
    setProducts([addedProd, ...products]);
    setNewProduct({ name: '', category: 'Smart TV', model: '', price: '', stock: '', status: 'Active' });
    setShowModal(false);
    setSuccessMessage(`Product "${newProduct.name}" added to catalog successfully!`);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const deleteProduct = (id) => {
    const prod = products.find(p => p.id === id);
    setProducts(products.filter(p => p.id !== id));
    setSuccessMessage(`Product "${prod ? prod.name : id}" deleted from catalog.`);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All Categories' || p.category === selectedCategory;
    const matchesStatus = selectedStatus === 'All Status' || p.status === selectedStatus;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      <Sidebar />

      <div className="flex-1 ml-64 min-h-screen flex flex-col relative">
        <Topbar title="Product Catalog Management" />

        <div className="p-6 space-y-6 flex-1">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((card, index) => (
              <div key={index} className="bg-white p-6 rounded-2xl border border-[#E2E8F0] flex items-center gap-4">
                <div className={`w-12 h-12 ${card.color} rounded-xl flex items-center justify-center text-white flex-shrink-0`}>
                  {card.icon}
                </div>
                <div>
                  <p className="text-xs font-medium text-[#64748B]">{card.title}</p>
                  <p className="text-2xl font-bold text-[#1E293B]">{card.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Filters & Actions */}
          <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] flex flex-wrap gap-4 items-center justify-between">
            <div className="flex flex-wrap gap-3 items-center flex-1">
              <div className="relative w-64">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#64748B]">
                  <Search size={16} />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] focus:border-[#0D47A1] outline-none transition-all text-sm bg-[#F8FAFC]"
                  placeholder="Search Product Name or Model..."
                />
              </div>

              <select 
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="text-sm text-[#1E293B] border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#0D47A1] bg-[#F8FAFC]"
              >
                <option>All Categories</option>
                <option>Smart TV</option>
                <option>Refrigerator</option>
                <option>Washing Machine</option>
                <option>Microwave</option>
              </select>

              <select 
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="text-sm text-[#1E293B] border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#0D47A1] bg-[#F8FAFC]"
              >
                <option>All Status</option>
                <option>Active</option>
                <option>Draft</option>
              </select>
            </div>

            <button 
              onClick={() => setShowModal(true)}
              className="bg-[#0D47A1] text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"
            >
              <Plus size={16} /> Add Product
            </button>
          </div>

          {/* Product Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <div key={product.id} className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden flex flex-col justify-between hover:shadow-lg transition-shadow">
                <div className="p-5 space-y-4">
                  <div className="h-32 bg-[#F8FAFC] rounded-xl flex items-center justify-center text-[#94A3B8]">
                    <ShoppingBag size={40} />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">{product.category}</span>
                    <h3 className="text-sm font-bold text-[#1E293B] line-clamp-1 mt-0.5">{product.name}</h3>
                    <p className="text-xs text-[#64748B] mt-0.5">Model: {product.model}</p>
                  </div>
                </div>

                <div className="p-5 border-t border-[#E2E8F0] bg-[#F8FAFC] flex justify-between items-center">
                  <div>
                    <span className="text-[10px] text-[#64748B] block">Price</span>
                    <span className="text-sm font-bold text-[#1E293B]">{product.price}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      product.stock === 0 ? 'bg-red-50 text-red-700 border border-red-150' : 'bg-green-50 text-green-700 border border-green-150'
                    }`}>
                      {product.stock === 0 ? 'Out of Stock' : `${product.stock} in Stock`}
                    </span>
                    <button 
                      onClick={() => deleteProduct(product.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                      title="Delete Product"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Add Product Modal */}
        {showModal && (
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm z-30 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-6 border-b border-[#E2E8F0] flex justify-between items-center">
                <h2 className="text-lg font-bold text-[#1E293B]">Add New Product</h2>
                <button 
                  onClick={() => setShowModal(false)}
                  className="text-[#64748B] hover:text-[#1E293B] p-2 hover:bg-[#F8FAFC] rounded-full"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleAddProductSubmit} className="p-6 space-y-4 text-sm">
                <div>
                  <label className="text-xs font-semibold text-[#64748B] mb-1 block">Product Name</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] outline-none"
                    placeholder="e.g. LG Dual Inverter AC"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-[#64748B] mb-1 block">Category</label>
                    <select
                      className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] outline-none"
                      value={newProduct.category}
                      onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                    >
                      <option>Smart TV</option>
                      <option>Refrigerator</option>
                      <option>Washing Machine</option>
                      <option>Microwave</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#64748B] mb-1 block">Model Code</label>
                    <input
                      type="text"
                      required
                      className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] outline-none"
                      placeholder="e.g. LG-AC-300"
                      value={newProduct.model}
                      onChange={(e) => setNewProduct({ ...newProduct, model: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-[#64748B] mb-1 block">Price (INR)</label>
                    <input
                      type="number"
                      required
                      className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] outline-none"
                      placeholder="e.g. 45000"
                      value={newProduct.price}
                      onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#64748B] mb-1 block">Initial Stock</label>
                    <input
                      type="number"
                      className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] outline-none"
                      placeholder="e.g. 10"
                      value={newProduct.stock}
                      onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#64748B] mb-1 block">Status</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input 
                        type="radio" 
                        name="status"
                        checked={newProduct.status === 'Active'}
                        onChange={() => setNewProduct({ ...newProduct, status: 'Active' })}
                      />
                      Active
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input 
                        type="radio" 
                        name="status"
                        checked={newProduct.status === 'Draft'}
                        onChange={() => setNewProduct({ ...newProduct, status: 'Draft' })}
                      />
                      Draft
                    </label>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#E2E8F0] flex gap-3 justify-end text-sm">
                  <button 
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="bg-white text-[#64748B] border border-[#E2E8F0] px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-[#F8FAFC] transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="bg-[#0D47A1] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    Save Product
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Success Toast */}
        {successMessage && (
          <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2 animate-bounce">
            <CheckCircle2 className="h-4 w-4" />
            {successMessage}
          </div>
        )}
      </div>
    </div>
  );
};

export default Catalog;
