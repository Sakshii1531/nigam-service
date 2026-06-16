import React from 'react';
import { Shield, Plus } from 'lucide-react';

const BrandWarrantyOverview = ({ job, additionalServices, setAdditionalServices, setShowAddServicesModal, getProductImage }) => {
  const additionalServicesTotal = additionalServices.filter(s => s.checked).reduce((sum, s) => sum + s.price, 0);

  return (
    <div className="flex flex-col gap-4">

      {/* Warranty Status Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-3xl p-4 flex items-center gap-3">
        <div className="w-10 h-10 bg-[#1E6BDB] rounded-full flex items-center justify-center flex-shrink-0">
          <Shield className="h-5 w-5 text-white" />
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-bold text-[#052355]">
            {job?.brand} Brand Warranty — Active
          </span>
          <span className="text-[10px] text-slate-600 font-normal mt-0.5">
            Warranty Till: <strong className="text-[#052355]">{job?.warrantyTill || '15 Jan 2027'}</strong>
            &nbsp;·&nbsp;Case ID: <strong className="text-[#052355]">{job?.caseId || 'LG-IN-8842'}</strong>
          </span>
        </div>
      </div>

      {/* Product Details */}
      <div className="bg-white rounded-3xl p-3.5 border border-slate-200 shadow-sm flex flex-col gap-3 text-left">
        <h4 className="text-sm font-medium text-[#052355]">Product Details</h4>
        <div className="flex gap-4 items-center">
          <img
            src={getProductImage(job)}
            alt={job?.product}
            className="w-16 h-16 object-contain rounded-xl border border-slate-200 p-1"
          />
          <div className="text-left flex-1">
            <h5 className="text-sm font-medium text-[#052355]">{job?.brand} {job?.model}</h5>
            <p className="text-xs text-slate-600 font-normal mt-0.5">Model: {job?.model}</p>
            <p className="text-[10px] text-slate-600 font-mono mt-0.5">S/N: {job?.serialNo}</p>
          </div>
        </div>
        <div className="h-[1px] bg-slate-100 w-full" />
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-600 font-normal">Installation Date</span>
            <span className="text-xs text-[#052355] font-medium">{job?.installDate}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-600 font-normal">Warranty Status</span>
            <span className="text-xs font-medium bg-green-50 text-green-600 px-2.5 py-0.5 rounded-lg">
              {job?.warrantyStatus || 'In Warranty'}
            </span>
          </div>
        </div>
      </div>

      {/* Complaint */}
      <div className="bg-white rounded-3xl p-3.5 border border-slate-200 shadow-sm flex flex-col gap-2 text-left">
        <h4 className="text-sm font-medium text-[#052355]">Complaint</h4>
        <p className="text-sm text-slate-700 font-normal mt-1">{job?.complaint || 'Noise from freezer compartment'}</p>
      </div>

      {/* Extra Services (Chargeable) */}
      <div className="bg-white rounded-3xl p-3.5 border border-slate-200 shadow-sm flex flex-col gap-3 text-left">
        <div>
          <h4 className="text-sm font-medium text-[#052355]">Extra Services (Chargeable)</h4>
          <p className="text-[10px] text-slate-500 font-normal mt-0.5">
            Warranty covers the primary issue at ₹0. Customer pays only for extras below.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          {additionalServices.map((service) => (
            <div key={service.id} className="flex justify-between items-center">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={service.checked}
                  onChange={() => setAdditionalServices(prev =>
                    prev.map(s => s.id === service.id ? { ...s, checked: !s.checked } : s)
                  )}
                  className="h-4 w-4 rounded border-slate-300 text-[#0D47A1] focus:ring-[#0D47A1]"
                />
                <span className="text-xs font-normal text-slate-700">{service.name}</span>
              </label>
              <span className="text-xs font-medium text-[#052355]">₹{service.price}</span>
            </div>
          ))}
        </div>
        <button
          onClick={() => setShowAddServicesModal(true)}
          className="text-xs font-medium text-[#0D47A1] text-left hover:underline mt-1 flex items-center gap-1"
        >
          <Plus className="h-3.5 w-3.5" /> Add More Service
        </button>
      </div>

      {/* Invoice Summary — Combined with ₹0 warranty items */}
      <div className="bg-white rounded-3xl p-3.5 border border-slate-200 shadow-sm flex flex-col gap-3 text-left">
        <h4 className="text-sm font-medium text-[#052355]">Invoice Summary</h4>
        <div className="flex flex-col gap-2.5 text-xs">
          {/* Warranty line — always ₹0 */}
          <div className="flex justify-between items-center text-slate-600">
            <span>{job?.complaint || 'Primary Issue Fix'}</span>
            <span className="text-green-600 font-semibold bg-green-50 px-2 py-0.5 rounded-md">
              ₹0 (Warranty)
            </span>
          </div>
          {/* Extra service lines */}
          {additionalServices.filter(s => s.checked).map(service => (
            <div key={service.id} className="flex justify-between items-center text-slate-600">
              <span>{service.name}</span>
              <span className="font-medium text-[#052355]">₹{service.price}</span>
            </div>
          ))}
          <div className="h-[1px] bg-slate-100 my-0.5" />
          <div className="flex justify-between items-center text-[#052355] font-semibold text-sm">
            <span>Customer Payable</span>
            <span className="text-[#00C853] font-bold">
              ₹{additionalServicesTotal.toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>

    </div>
  );
};

export default BrandWarrantyOverview;
