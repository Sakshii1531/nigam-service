import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Home, Briefcase, Plus, X, Pencil, Trash2, Star, Check, Sparkles, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/apiClient';

const SavedAddresses = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);

  const [form, setForm] = useState({
    type: 'Home',
    address: '',
    detail: '',
    city: 'Delhi',
    pincode: '110054',
    isDefault: false
  });

  const getIcon = (type) => {
    if (type === 'Work') return <Briefcase className="h-5 w-5 text-[#0D47A1]" />;
    if (type === 'Other') return <MapPin className="h-5 w-5 text-[#0D47A1]" />;
    return <Home className="h-5 w-5 text-[#0D47A1]" />;
  };

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const loadAddresses = async () => {
    setLoading(true);
    try {
      if (user) {
        const res = await apiRequest('/auth/addresses', { auth: true });
        const list = Array.isArray(res) ? res : [];
        setAddresses(list);
        updateUser({ addresses: list });
      } else {
        // Guest mode fallback
        setAddresses(user?.addresses || []);
      }
    } catch (err) {
      console.warn('Error loading addresses:', err);
      setAddresses(user?.addresses || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAddresses();
  }, [user?.id]);

  const handleOpenAdd = () => {
    setEditingId(null);
    setForm({
      type: 'Home',
      address: '',
      detail: '',
      city: 'Delhi',
      pincode: '110054',
      isDefault: addresses.length === 0
    });
    setShowForm(true);
  };

  const handleOpenEdit = (addr) => {
    setEditingId(addr._id || addr.id);
    setForm({
      type: addr.type || 'Home',
      address: addr.house || addr.address || '',
      detail: addr.landmark || addr.detail || '',
      city: addr.city || 'Delhi',
      pincode: addr.pincode || '110054',
      isDefault: Boolean(addr.isDefault)
    });
    setShowForm(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.address.trim()) return;

    setSubmitting(true);
    try {
      const payload = {
        type: form.type,
        house: form.address,
        landmark: form.detail,
        city: form.city || 'Delhi',
        pincode: form.pincode || '110054',
        isDefault: form.isDefault
      };

      if (editingId) {
        // Update existing address
        const res = await apiRequest(`/auth/addresses/${editingId}`, {
          method: 'PUT',
          auth: true,
          body: payload
        });
        const updatedList = Array.isArray(res) ? res : (res || []);
        setAddresses(updatedList);
        updateUser({ addresses: updatedList });
        showToast('Address updated successfully!');
      } else {
        // Add new address
        const res = await apiRequest('/auth/addresses', {
          method: 'POST',
          auth: true,
          body: payload
        });
        const updatedList = Array.isArray(res) ? res : (res || []);
        setAddresses(updatedList);
        updateUser({ addresses: updatedList });
        showToast('New address saved!');
      }
      setShowForm(false);
    } catch (err) {
      console.warn('Error saving address:', err);
      showToast(err.message || 'Failed to save address');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (addrId) => {
    if (!window.confirm('Are you sure you want to delete this address?')) return;
    try {
      const res = await apiRequest(`/auth/addresses/${addrId}`, {
        method: 'DELETE',
        auth: true
      });
      const updatedList = Array.isArray(res) ? res : (res || []);
      setAddresses(updatedList);
      updateUser({ addresses: updatedList });
      showToast('Address removed');
    } catch (err) {
      console.warn('Error deleting address:', err);
      showToast('Failed to delete address');
    }
  };

  const handleSetDefault = async (addrId) => {
    try {
      const res = await apiRequest(`/auth/addresses/${addrId}/default`, {
        method: 'PATCH',
        auth: true
      });
      const updatedList = Array.isArray(res) ? res : (res || []);
      setAddresses(updatedList);
      updateUser({ addresses: updatedList });
      showToast('Default address updated!');
    } catch (err) {
      console.warn('Error setting default address:', err);
      showToast('Failed to set default address');
    }
  };

  return (
    <div className="min-h-screen bg-bg-light flex flex-col pb-20 lg:pb-8 relative">


      {/* Floating Toast Notification */}
      {toastMsg && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white font-bold text-xs py-3 px-6 rounded-2xl shadow-xl flex items-center gap-2 border border-slate-800 whitespace-nowrap">
          <Sparkles className="h-4 w-4 text-amber-400 animate-spin" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header — mobile only */}
      <div className="bg-[#E3ECF9] p-6 rounded-b-[30px] shadow-sm flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 bg-white rounded-full shadow-sm hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-5 w-5 text-[#0D47A1]" />
        </button>
        <h1 className="text-xl font-bold text-text-primary">Saved Addresses</h1>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 flex flex-col lg:grid lg:grid-cols-2 gap-4 max-w-screen-xl mx-auto w-full">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-400 gap-2">
            <RefreshCw className="h-6 w-6 animate-spin text-[#0D47A1]" />
            <span className="text-xs font-semibold">Loading saved addresses...</span>
          </div>
        ) : addresses.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center flex flex-col items-center gap-3 border border-border-color shadow-sm">
            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-[#0D47A1]">
              <MapPin className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-text-primary">No Saved Addresses</h3>
            <p className="text-xs text-text-secondary">Add your home or work address for quicker bookings and service delivery.</p>
          </div>
        ) : (
          addresses.map((item) => {
            const addrId = item._id || item.id;
            const fullAddress = item.house || item.address || '';
            const landmarkDetail = item.landmark || item.detail || '';
            const isDefault = Boolean(item.isDefault);

            return (
              <div
                key={addrId}
                className={`bg-white rounded-2xl p-4 shadow-sm border transition-all flex flex-col gap-3 relative ${
                  isDefault ? 'border-[#0D47A1] bg-blue-50/20' : 'border-border-color'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-[#E3ECF9] rounded-xl flex items-center justify-center flex-shrink-0">
                    {getIcon(item.type || 'Home')}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#0D47A1] uppercase tracking-wide">
                        {item.type || 'Home'}
                      </span>
                      {isDefault && (
                        <span className="bg-blue-100 text-[#0D47A1] text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Check className="h-2.5 w-2.5" /> Default
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-text-primary mt-0.5 leading-snug">
                      {fullAddress}
                    </p>
                    {landmarkDetail && (
                      <p className="text-xs text-text-secondary mt-0.5 leading-snug">
                        {landmarkDetail}
                      </p>
                    )}
                  </div>
                </div>

                {/* CRUD Actions Toolbar */}
                <div className="flex items-center justify-between border-t border-slate-100 pt-2.5 mt-1 text-xs">
                  {!isDefault ? (
                    <button
                      onClick={() => handleSetDefault(addrId)}
                      className="text-[11px] font-bold text-[#0D47A1] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Star className="h-3.5 w-3.5" /> Set as Default
                    </button>
                  ) : (
                    <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                      <Check className="h-3.5 w-3.5" /> Primary Address
                    </span>
                  )}

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleOpenEdit(item)}
                      className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-[#0D47A1] transition-colors cursor-pointer"
                      title="Edit Address"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(addrId)}
                      className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                      title="Delete Address"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Add Address Button */}
        <button
          onClick={handleOpenAdd}
          className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-[#0D47A1]/30 rounded-2xl p-4 text-[#0D47A1] font-semibold text-sm hover:bg-blue-50 transition-colors cursor-pointer"
        >
          <Plus className="h-5 w-5" />
          Add New Address
        </button>
      </div>

      {/* Add / Edit Address Modal Bottom Sheet */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-xs"
            onClick={() => !submitting && setShowForm(false)}
          />
          {/* Sheet */}
          <form 
            onSubmit={handleSave} 
            className="relative w-full max-w-md bg-white rounded-t-[30px] p-6 flex flex-col gap-4 z-10 shadow-2xl animate-in slide-in-from-bottom duration-200"
          >
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-bold text-text-primary">
                {editingId ? 'Edit Address' : 'Add New Address'}
              </h2>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                disabled={submitting}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
              >
                <X className="h-5 w-5 text-text-secondary" />
              </button>
            </div>

            {/* Type Selector */}
            <div className="flex gap-3">
              {['Home', 'Work', 'Other'].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm({ ...form, type: t })}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                    form.type === t
                      ? 'bg-[#0D47A1] text-white border-[#0D47A1] shadow-xs'
                      : 'bg-white text-text-secondary border-border-color hover:border-[#0D47A1]'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Address Input */}
            <div className="flex flex-col gap-1 text-left">
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                House / Flat / Street Address *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. House No. 42, Civil Lines, Delhi"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-border-color text-sm focus:outline-none focus:border-[#0D47A1] focus:ring-1 focus:ring-[#0D47A1] transition-all"
              />
            </div>

            {/* Landmark / Detail Input */}
            <div className="flex flex-col gap-1 text-left">
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                Landmark / Area Detail
              </label>
              <input
                type="text"
                placeholder="e.g. Near Metro Station, Block A"
                value={form.detail}
                onChange={(e) => setForm({ ...form, detail: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-border-color text-sm focus:outline-none focus:border-[#0D47A1] focus:ring-1 focus:ring-[#0D47A1] transition-all"
              />
            </div>

            {/* City & Pincode Grid */}
            <div className="grid grid-cols-2 gap-3 text-left">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">City</label>
                <input
                  type="text"
                  placeholder="e.g. Delhi"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-border-color text-sm focus:outline-none focus:border-[#0D47A1]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Pincode</label>
                <input
                  type="text"
                  placeholder="e.g. 110054"
                  value={form.pincode}
                  onChange={(e) => setForm({ ...form, pincode: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-border-color text-sm focus:outline-none focus:border-[#0D47A1]"
                />
              </div>
            </div>

            {/* Checkbox: Default address */}
            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                className="w-4 h-4 rounded text-[#0D47A1] focus:ring-[#0D47A1]"
              />
              <span>Set as default delivery address</span>
            </label>

            {/* Save Button */}
            <button
              type="submit"
              disabled={!form.address.trim() || submitting}
              className="w-full bg-[#0D47A1] text-white font-bold py-3.5 rounded-2xl text-sm hover:bg-blue-900 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 mt-2"
            >
              {submitting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>{editingId ? 'Update Address' : 'Save Address'}</span>
              )}
            </button>
          </form>
        </div>
      )}

    </div>
  );
};

export default SavedAddresses;



