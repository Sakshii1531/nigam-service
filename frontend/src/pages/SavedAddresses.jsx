import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Home, Briefcase, Plus, X } from 'lucide-react';

const SavedAddresses = () => {
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: 'Home', address: '', detail: '' });
  const [addresses, setAddresses] = useState([
    {
      id: 1,
      type: 'Home',
      icon: <Home className="h-5 w-5 text-[#0D47A1]" />,
      address: 'Civil Lines, Delhi - 110054',
      detail: 'Near Civil Lines Metro Station',
    },
    {
      id: 2,
      type: 'Work',
      icon: <Briefcase className="h-5 w-5 text-[#0D47A1]" />,
      address: 'Connaught Place, New Delhi - 110001',
      detail: 'Block A, Office No. 201',
    },
  ]);

  const getIcon = (type) => {
    if (type === 'Work') return <Briefcase className="h-5 w-5 text-[#0D47A1]" />;
    return <Home className="h-5 w-5 text-[#0D47A1]" />;
  };

  const handleAdd = () => {
    if (!form.address.trim()) return;
    const newAddr = {
      id: Date.now(),
      type: form.type,
      icon: getIcon(form.type),
      address: form.address,
      detail: form.detail,
    };
    setAddresses([...addresses, newAddr]);
    setForm({ type: 'Home', address: '', detail: '' });
    setShowForm(false);
  };

  return (
    <div className="min-h-screen bg-bg-light flex flex-col pb-20 relative">

      {/* Header */}
      <div className="bg-[#E3ECF9] p-6 rounded-b-[30px] shadow-sm flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 bg-white rounded-full shadow-sm hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-[#0D47A1]" />
        </button>
        <h1 className="text-xl font-bold text-text-primary">Saved Addresses</h1>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 flex flex-col gap-4">
        {addresses.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-2xl p-4 shadow-sm border border-border-color flex items-start gap-4"
          >
            <div className="w-10 h-10 bg-[#E3ECF9] rounded-xl flex items-center justify-center flex-shrink-0">
              {item.icon}
            </div>
            <div className="flex-1">
              <span className="text-xs font-bold text-[#0D47A1] uppercase tracking-wide">{item.type}</span>
              <p className="text-sm font-semibold text-text-primary mt-0.5">{item.address}</p>
              <p className="text-xs text-text-secondary">{item.detail}</p>
            </div>
            <MapPin className="h-4 w-4 text-text-secondary mt-1 flex-shrink-0" />
          </div>
        ))}

        {/* Add Address Button */}
        <button
          onClick={() => setShowForm(true)}
          className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-[#0D47A1]/30 rounded-2xl p-4 text-[#0D47A1] font-semibold text-sm hover:bg-blue-50 transition-colors"
        >
          <Plus className="h-5 w-5" />
          Add New Address
        </button>
      </div>

      {/* Add Address Modal / Bottom Sheet */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowForm(false)}
          />
          {/* Sheet */}
          <div className="relative w-full max-w-md bg-white rounded-t-[30px] p-6 flex flex-col gap-4 z-10">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-text-primary">Add New Address</h2>
              <button
                onClick={() => setShowForm(false)}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="h-5 w-5 text-text-secondary" />
              </button>
            </div>

            {/* Type Selector */}
            <div className="flex gap-3">
              {['Home', 'Work', 'Other'].map((t) => (
                <button
                  key={t}
                  onClick={() => setForm({ ...form, type: t })}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                    form.type === t
                      ? 'bg-[#0D47A1] text-white border-[#0D47A1]'
                      : 'bg-white text-text-secondary border-border-color hover:border-[#0D47A1]'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Address Input */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Full Address *</label>
              <input
                type="text"
                placeholder="e.g. Sector 15, Noida - 201301"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-border-color text-sm focus:outline-none focus:border-[#0D47A1] focus:ring-1 focus:ring-[#0D47A1] transition-all"
              />
            </div>

            {/* Landmark Input */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Landmark / Detail</label>
              <input
                type="text"
                placeholder="e.g. Near Metro Station, Flat No. 4"
                value={form.detail}
                onChange={(e) => setForm({ ...form, detail: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-border-color text-sm focus:outline-none focus:border-[#0D47A1] focus:ring-1 focus:ring-[#0D47A1] transition-all"
              />
            </div>

            {/* Save Button */}
            <button
              onClick={handleAdd}
              disabled={!form.address.trim()}
              className="w-full bg-[#0D47A1] text-white font-bold py-4 rounded-2xl text-sm hover:bg-blue-900 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Save Address
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default SavedAddresses;


