import React, { useState } from 'react';
import { CheckCircle, AlertTriangle, Plus } from 'lucide-react';

const INITIAL_CHECKLIST = [
  { id: 'carbon', label: 'Carbon Filter Check', note: '', done: false, type: 'due', urgent: false },
  { id: 'tds', label: 'TDS Level Check', note: '', done: false, type: 'due', urgent: false },
  { id: 'waterflow', label: 'Verify Water Flow', note: '', done: false, type: 'followup', urgent: true, followupNote: 'Follow-up from Apr unscheduled visit' },
];

const AMCOverview = ({ job, additionalServices, setAdditionalServices, setShowAddServicesModal, spareParts, setSpareParts, setShowAddPartsModal }) => {
  const [checklist, setChecklist] = useState(INITIAL_CHECKLIST);

  // Months remaining calc
  const expiryDate = job?.amcPlanExpiry ? new Date(job.amcPlanExpiry) : new Date('2027-01-15');
  const now = new Date();
  const monthsLeft = Math.max(
    0,
    (expiryDate.getFullYear() - now.getFullYear()) * 12 + (expiryDate.getMonth() - now.getMonth())
  );

  const additionalServicesTotal = additionalServices.filter(s => s.checked).reduce((sum, s) => sum + s.price, 0);
  const toggleTask = (id) => {
    setChecklist(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };
  const updateNote = (id, val) => {
    setChecklist(prev => prev.map(t => t.id === id ? { ...t, note: val } : t));
  };

  return (
    <div className="flex flex-col gap-4">

      {/* AMC Plan Info Card */}
      <div className="bg-amber-50 border border-amber-200 rounded-3xl p-4 flex justify-between items-center">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-amber-700 font-bold uppercase tracking-wider">{job?.amcPlanName || 'AMC Gold Plan'}</span>
          <span className="text-xs text-amber-800 font-normal">ID: {job?.amcId || 'NCCAMC289412'}</span>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-bold text-amber-700 block">
            Visit {job?.amcVisitNumber || 2} of {job?.amcVisitsTotal || 4}
          </span>
          <span className="text-[10px] text-amber-600 font-normal block mt-0.5">
            {job?.amcVisitsRemaining ?? 3} visits · {monthsLeft}m remaining
          </span>
        </div>
      </div>

      {/* Product Details */}
      <div className="bg-white rounded-3xl p-3.5 border border-slate-200 shadow-sm flex flex-col gap-3 text-left">
        <h4 className="text-sm font-medium text-[#052355]">Product Details</h4>
        <div className="flex gap-4 items-center">
          <div className="w-14 h-14 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-center flex-shrink-0">
            <span className="text-2xl">🧺</span>
          </div>
          <div className="text-left flex-1">
            <h5 className="text-sm font-medium text-[#052355]">{job?.brand} {job?.model || 'Front Load 8kg'}</h5>
            <p className="text-xs text-slate-600 font-normal mt-0.5">S/N: {job?.serialNo}</p>
            <p className="text-xs text-slate-500 font-normal mt-0.5">Installed: {job?.installDate}</p>
          </div>
        </div>
      </div>

      {/* Today's Scheduled Checklist */}
      <div className="bg-white rounded-3xl p-3.5 border border-slate-200 shadow-sm flex flex-col gap-3 text-left">
        <div className="flex justify-between items-center">
          <h4 className="text-sm font-medium text-[#052355]">Today's Service Checklist</h4>
          <span className="text-[10px] text-slate-500 font-normal">
            {checklist.filter(t => t.done).length}/{checklist.length} done
          </span>
        </div>

        <div className="flex flex-col gap-3">
          {checklist.map((task) => (
            <div key={task.id} className={`rounded-2xl p-3 border transition-all ${
              task.done
                ? 'bg-green-50 border-green-200'
                : task.urgent
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-start gap-3">
                <button
                  onClick={() => toggleTask(task.id)}
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                    task.done ? 'bg-green-500 border-green-500' : task.urgent ? 'border-amber-500' : 'border-slate-400'
                  }`}
                >
                  {task.done && <CheckCircle className="h-4 w-4 text-white" />}
                </button>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {task.urgent && !task.done && <AlertTriangle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />}
                    <span className={`text-xs font-semibold ${
                      task.done ? 'text-green-700 line-through' : task.urgent ? 'text-amber-800' : 'text-[#052355]'
                    }`}>
                      {task.label}
                    </span>
                  </div>
                  {task.followupNote && !task.done && (
                    <p className="text-[10px] text-amber-600 font-normal mt-0.5">{task.followupNote}</p>
                  )}
                  {task.done && (
                    <input
                      type="text"
                      value={task.note}
                      onChange={(e) => updateNote(task.id, e.target.value)}
                      placeholder="Add a note (e.g. TDS: 180 ppm)"
                      className="mt-1.5 w-full text-[11px] bg-white border border-green-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-green-400 text-slate-700"
                    />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => setChecklist(prev => [...prev, {
            id: `custom-${Date.now()}`,
            label: 'Custom Task',
            note: '',
            done: false,
            type: 'custom',
            urgent: false
          }])}
          className="text-xs font-medium text-[#0D47A1] text-left hover:underline mt-1 flex items-center gap-1"
        >
          <Plus className="h-3.5 w-3.5" /> Add Custom Task
        </button>
      </div>

      {/* Extra Chargeable Services */}
      <div className="bg-white rounded-3xl p-3.5 border border-slate-200 shadow-sm flex flex-col gap-3 text-left">
        <div>
          <h4 className="text-sm font-medium text-[#052355]">Extra Services (Chargeable)</h4>
          <p className="text-[10px] text-slate-500 font-normal mt-0.5">Beyond AMC scope — Customer pays for these</p>
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

      {/* Required Spare Parts */}
      <div className="bg-white rounded-3xl p-3.5 border border-slate-200 shadow-sm flex flex-col gap-3.5 text-left">
        <h4 className="text-sm font-medium text-[#052355]">Required Spare Parts</h4>
        
        <div className="flex flex-col gap-3 mt-1">
          {spareParts.filter(p => p.checked).map((part) => (
            <div key={part.id} className="flex justify-between items-center bg-slate-50 border border-slate-100 rounded-2xl p-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-[#FFA000]">
                  <svg className="w-5 h-5 text-[#FFA000]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
                <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">₹0 (Covered)</span>
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
          className="text-xs font-medium text-[#FFA000] text-left hover:underline mt-2 flex items-center justify-center gap-1 w-full pt-1.5 border-t border-slate-100"
        >
          <Plus className="h-3.5 w-3.5" /> Add Part
        </button>
      </div>

      {/* Invoice Summary */}
      <div className="bg-white rounded-3xl p-3.5 border border-slate-200 shadow-sm flex flex-col gap-3 text-left">
        <h4 className="text-sm font-medium text-[#052355]">Invoice Summary</h4>
        <div className="flex flex-col gap-3 text-xs">
          <div className="flex justify-between items-center text-slate-600">
            <span>AMC Base Visit</span>
            <span className="text-green-600 font-semibold bg-green-50 px-2 py-0.5 rounded-md">₹0 (Covered)</span>
          </div>
          {/* Spare parts covered lines */}
          {spareParts.filter(p => p.checked).map(part => (
            <div key={part.id} className="flex justify-between items-center text-slate-600">
              <span>Spare Part ({part.name})</span>
              <span className="text-green-600 font-semibold bg-green-50 px-2 py-0.5 rounded-md">
                ₹0 (Covered)
              </span>
            </div>
          ))}
          <div className="flex justify-between items-center text-slate-600">
            <span>Extra Services</span>
            <span className="font-medium text-[#052355]">₹{additionalServicesTotal.toLocaleString('en-IN')}</span>
          </div>
          <div className="h-[1px] bg-slate-100 my-0.5" />
          <div className="flex justify-between items-center text-[#052355] font-semibold text-sm">
            <span>Customer Payable</span>
            <span className="text-[#00C853] font-bold">₹{additionalServicesTotal.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>

    </div>
  );
};

export default AMCOverview;
