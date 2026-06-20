import React from 'react';
import { ShieldCheck, Plus } from 'lucide-react';

const ExtendedWarrantyOverview = ({ job, additionalServices, setAdditionalServices, setShowAddServicesModal, getProductImage, spareParts, setSpareParts, setShowAddPartsModal }) => {
  const additionalServicesTotal = additionalServices.filter(s => s.checked).reduce((sum, s) => sum + s.price, 0);

  // Months remaining calc
  const validTill = job?.ewValidTill ? new Date(job.ewValidTill) : new Date('2028-01-15');
  const now = new Date();
  const monthsLeft = Math.max(
    0,
    (validTill.getFullYear() - now.getFullYear()) * 12 + (validTill.getMonth() - now.getMonth())
  );

  return (
    <div className="flex flex-col gap-4">

      {/* EW Coverage Banner */}
      <div className="bg-purple-50 border border-purple-200 rounded-3xl p-4 flex items-center gap-3">
        <div className="w-10 h-10 bg-[#7C4DFF] rounded-full flex items-center justify-center flex-shrink-0">
          <ShieldCheck className="h-5 w-5 text-white" />
        </div>
        <div className="flex flex-col flex-1">
          <span className="text-xs font-bold text-[#052355]">{job?.ewPlanName || 'NCC Protect Plus'}</span>
          <span className="text-[10px] text-slate-600 font-normal mt-0.5">
            Valid Till: <strong className="text-[#052355]">{job?.ewValidTill || '15 Jan 2028'}</strong>
            &nbsp;·&nbsp;{monthsLeft} months left
          </span>
        </div>
        {/* Claims counter */}
        <div className="bg-white border border-purple-200 rounded-2xl px-3 py-2 text-center flex-shrink-0">
          <span className={`text-lg font-bold block ${(job?.ewClaimsRemaining ?? 0) === 0 ? 'text-red-500' : 'text-[#7C4DFF]'}`}>
            {job?.ewClaimsRemaining ?? 0}
          </span>
          <span className="text-[9px] text-slate-500 font-normal uppercase tracking-wide">Claims Left</span>
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
            <span className="text-xs text-slate-600 font-normal">Coverage Status</span>
            <span className="text-xs font-medium bg-purple-50 text-purple-600 px-2.5 py-0.5 rounded-lg">
              Extended Warranty
            </span>
          </div>
        </div>
      </div>

      {/* Complaint / Claim Issue */}
      <div className="bg-white rounded-3xl p-3.5 border border-slate-200 shadow-sm flex flex-col gap-2 text-left">
        <h4 className="text-sm font-medium text-[#052355]">Claim Complaint</h4>
        <p className="text-sm text-slate-700 font-normal mt-1">{job?.complaint}</p>
      </div>

      {/* Out-of-Scope Extras */}
      <div className="bg-white rounded-3xl p-3.5 border border-slate-200 shadow-sm flex flex-col gap-3 text-left">
        <div>
          <h4 className="text-sm font-medium text-[#052355]">Out-of-Scope Extras (Chargeable)</h4>
          <p className="text-[10px] text-slate-500 font-normal mt-0.5">
            Claim covers the primary repair at ₹0. Add any extras found outside the warranty scope.
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
                  className="h-4 w-4 rounded border-slate-300 text-[#7C4DFF] focus:ring-[#7C4DFF]"
                />
                <span className="text-xs font-normal text-slate-700">{service.name}</span>
              </label>
              <span className="text-xs font-medium text-[#052355]">₹{service.price}</span>
            </div>
          ))}
        </div>
        <button
          onClick={() => setShowAddServicesModal(true)}
          className="text-xs font-medium text-[#7C4DFF] text-left hover:underline mt-1 flex items-center gap-1"
        >
          <Plus className="h-3.5 w-3.5" /> Add More Service
        </button>
      </div>

      {/* Required Spare Parts */}
      <div className="bg-white rounded-3xl p-3.5 border border-slate-200 shadow-sm flex flex-col gap-3.5 text-left">
        <h4 className="text-sm font-medium text-[#052355]">Required Spare Parts</h4>
        
        <div className="flex flex-col gap-3 mt-1">
          {spareParts.filter(p => p.checked).map((part) => (
            <div key={part.id} className="flex justify-between items-center bg-slate-50 border border-slate-100 rounded-2xl p-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-[#7C4DFF]">
                  <svg className="w-5 h-5 text-[#7C4DFF]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 12h8a4 4 0 0 0 4-4V4" />
                    <path d="M8 12a4 4 0 0 1 4-4" />
                    <rect x="2" y="10" width="2" height="4" rx="0.5" fill="currentColor" />
                    <rect x="14" y="2" width="4" height="2" rx="0.5" fill="currentColor" />
                    <path d="M12 16a4 4 0 0 0 4 4h4" />
                    <rect x="20" y="18" width="2" height="4" rx="0.5" fill="currentColor" />
                  </svg>
                </div>
                <span className="text-xs font-normal text-slate-700">{part.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md">₹0 (Covered)</span>
                <button
                  type="button"
                  onClick={() => {
                    setSpareParts(prev => 
                      prev.map(p => p.id === part.id ? { ...p, checked: false } : p)
                    );
                  }}
                  className="text-slate-400 hover:text-red-500 font-semibold text-xs px-1"
                  title="Remove Part"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>

        <button 
          onClick={() => setShowAddPartsModal(true)}
          className="text-xs font-medium text-[#7C4DFF] text-left hover:underline mt-2 flex items-center justify-center gap-1 w-full pt-1.5 border-t border-slate-100"
        >
          <Plus className="h-3.5 w-3.5" /> Add Part
        </button>
      </div>

      {/* Invoice Summary — Combined */}
      <div className="bg-white rounded-3xl p-3.5 border border-slate-200 shadow-sm flex flex-col gap-3 text-left">
        <h4 className="text-sm font-medium text-[#052355]">Invoice Summary</h4>
        <div className="flex flex-col gap-2.5 text-xs">
          {/* EW line — always ₹0 */}
          <div className="flex justify-between items-center text-slate-600">
            <span>{job?.complaint || 'Claim Repair'}</span>
            <span className="text-purple-600 font-semibold bg-purple-50 px-2 py-0.5 rounded-md">
              ₹0 (EW Covered)
            </span>
          </div>
          {/* Spare parts covered lines */}
          {spareParts.filter(p => p.checked).map(part => (
            <div key={part.id} className="flex justify-between items-center text-slate-650">
              <span>Spare Part ({part.name})</span>
              <span className="text-purple-600 font-semibold bg-purple-50 px-2 py-0.5 rounded-md">
                ₹0 (Covered)
              </span>
            </div>
          ))}
          {/* Extra lines */}
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
          <div className="flex justify-between items-center text-slate-500 text-[10px] -mt-1">
            <span>NCC Claim Payout to Technician</span>
            <span className="font-medium text-[#7C4DFF]">₹{(job?.estEarnings || 0).toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>

    </div>
  );
};

export default ExtendedWarrantyOverview;
