import React, { useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, FileText, CreditCard, Camera, Plus } from 'lucide-react';

const RaiseWarrantyRequest = () => {
  const navigate = useNavigate();
  const { category, brand, product } = useParams();
  const location = useLocation();
  const issueName = location.state?.issueName || 'General Issue';

  const [modelNumber, setModelNumber] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [description, setDescription] = useState('');

  const formatTitle = (str) => {
    if (!str) return '';
    return str.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  const handleRaiseTicket = () => {
    const ticketId = 'NCCW-2024-' + String(Math.floor(Math.random() * 900) + 100).padStart(6, '0');
    navigate('/partner-warranty/ticket-success', {
      state: { ticketId, category, brand, product, issueName }
    });
  };

  return (
    <div className="min-h-screen bg-blue-50/50 flex flex-col pb-8">

      {/* Header */}
      <div className="bg-white/90 backdrop-blur-md sticky top-0 px-6 py-4 flex items-center justify-between border-b border-slate-100 shadow-sm z-30 rounded-b-3xl">
        <button
          onClick={() => navigate(-1)}
          className="p-2 bg-slate-50 rounded-2xl flex items-center justify-center cursor-pointer border border-slate-100"
        >
          <ArrowLeft className="h-5 w-5 text-slate-700" />
        </button>
        <h1 className="text-lg font-extrabold text-brand-navy text-center flex-1 pr-9 tracking-widest">
          Raise Warranty Request
        </h1>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 flex flex-col gap-6 max-w-lg mx-auto w-full">

        {/* Upload Documents */}
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-black text-black tracking-wide pl-1">Upload Documents</h2>
          <div className="flex gap-3">
            {[
              { label: 'Bill / Invoice', icon: FileText },
              { label: 'Warranty Card', icon: CreditCard },
              { label: 'Product Photo', icon: Camera },
            ].map(({ label, icon: Icon }) => (
              <button
                key={label}
                className="flex-1 flex flex-col items-center gap-2 py-4 bg-white border border-slate-200/80 rounded-2xl cursor-pointer"
              >
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                  <Icon className="h-5 w-5 text-brand-blue" />
                </div>
                <span className="text-xs font-semibold text-slate-600 text-center leading-tight">{label}</span>
                <span className="text-xs font-bold text-brand-blue">Upload</span>
              </button>
            ))}
          </div>
        </div>

        {/* Additional Photos */}
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-black text-black tracking-wide pl-1">Additional Photos <span className="text-slate-400 font-normal text-xs">(Optional)</span></h2>
          <button className="w-20 h-20 flex flex-col items-center justify-center bg-white border border-slate-200/80 rounded-2xl cursor-pointer gap-1">
            <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
              <Camera className="h-5 w-5 text-brand-blue" />
            </div>
            <span className="text-xs font-semibold text-slate-500">Add Photo</span>
          </button>
        </div>

        {/* Enter Details */}
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-black text-black tracking-wide pl-1">Enter Details</h2>

          <div className="bg-white border border-slate-200/80 rounded-3xl px-5 py-5 flex flex-col gap-5">

            {/* Model Number */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-slate-700">Model Number</label>
              <input
                type="text"
                value={modelNumber}
                onChange={e => setModelNumber(e.target.value)}
                placeholder="Enter Model Number"
                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200/60 rounded-2xl text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue/20 transition-all"
              />
            </div>

            {/* Serial Number */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-slate-700">Serial Number</label>
              <input
                type="text"
                value={serialNumber}
                onChange={e => setSerialNumber(e.target.value)}
                placeholder="Enter Serial Number"
                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200/60 rounded-2xl text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue/20 transition-all"
              />
            </div>

            {/* Purchase Date */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-slate-700">Purchase Date</label>
              <input
                type="date"
                value={purchaseDate}
                onChange={e => setPurchaseDate(e.target.value)}
                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200/60 rounded-2xl text-sm text-slate-800 outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue/20 transition-all"
              />
            </div>

            {/* Description */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-slate-700">Description of Issue</label>
              <div className="relative">
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value.slice(0, 500))}
                  placeholder="Describe the issue in detail..."
                  rows={4}
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200/60 rounded-2xl text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue/20 transition-all resize-none"
                />
                <span className="absolute bottom-3 right-4 text-xs text-slate-400">{description.length}/500</span>
              </div>
            </div>

          </div>
        </div>

        {/* Raise Ticket Button */}
        <button
          onClick={handleRaiseTicket}
          className="w-full py-4 bg-brand-navy text-white font-bold text-base rounded-2xl cursor-pointer tracking-wide mt-2"
        >
          Raise Ticket
        </button>

      </div>
    </div>
  );
};

export default RaiseWarrantyRequest;
