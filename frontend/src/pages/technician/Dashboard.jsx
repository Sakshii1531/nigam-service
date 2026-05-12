import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Calendar, Wrench, User, ClipboardList, Briefcase, ArrowLeft, FileText, Plus, Trash2, Camera, CheckCircle } from 'lucide-react';
import techJobBefore from '../../assets/tech_job_before.png';
import techJobAfter from '../../assets/tech_job_after.png';

const Dashboard = () => {
  const navigate = useNavigate();
  const [workPerformed, setWorkPerformed] = useState('');
  
  const [parts, setParts] = useState([
    { id: 1, name: 'Standard Air Filter (20×25×1)', sku: 'HVAC-F01', qty: 2 },
    { id: 2, name: 'Capacitor 45/5 MFD', sku: 'EL-C455', qty: 1 },
  ]);

  const [photos, setPhotos] = useState([
    { id: 1, type: 'BEFORE', src: techJobBefore },
    { id: 2, type: 'AFTER', src: techJobAfter },
  ]);

  const [isAddingPart, setIsAddingPart] = useState(false);
  const [newPartName, setNewPartName] = useState('');
  const [newPartSku, setNewPartSku] = useState('');
  const [newPartQty, setNewPartQty] = useState('');

  const [isSuccess, setIsSuccess] = useState(false);

  const addPart = () => {
    setIsAddingPart(true);
  };

  const saveNewPart = () => {
    if (!newPartName || !newPartSku || !newPartQty) {
      alert('Please fill all fields!');
      return;
    }
    setParts([
      ...parts,
      { id: parts.length + 1, name: newPartName, sku: newPartSku, qty: parseInt(newPartQty) }
    ]);
    setIsAddingPart(false);
    setNewPartName('');
    setNewPartSku('');
    setNewPartQty('');
  };

  const deletePart = (id) => {
    setParts(parts.filter(p => p.id !== id));
  };

  const addPhoto = () => {
    setPhotos([
      ...photos,
      { id: photos.length + 1, type: 'NEW', src: techJobAfter } // Reusing after image as placeholder
    ]);
  };

  const handleComplete = () => {
    setIsSuccess(true);
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 max-w-md mx-auto border-x border-slate-100 shadow-sm relative">
        <div className="flex flex-col items-center text-center gap-6">
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center">
            <CheckCircle className="h-12 w-12 text-green-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Job Completed!</h1>
            <p className="text-sm text-slate-500 mt-2">
              Great job! The service details have been submitted successfully.
            </p>
          </div>

          <div className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 mt-2">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-2">
              <span className="text-sm text-slate-500">Job ID</span>
              <span className="text-sm font-semibold text-slate-900">#8842</span>
            </div>
            <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-2">
              <span className="text-sm text-slate-500">Earnings</span>
              <span className="text-sm font-semibold text-[#0D47A1]">$145.00</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-500">Status</span>
              <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Submitted</span>
            </div>
          </div>

          <button 
            onClick={() => {
              setIsSuccess(false);
              setWorkPerformed('');
              setParts([]);
              setPhotos([]);
              navigate('/technician/dashboard');
            }}
            className="w-full bg-[#0D47A1] text-white font-semibold py-3 rounded-xl hover:bg-blue-800 transition-colors mt-4"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col pb-20 max-w-md mx-auto border-x border-slate-100 shadow-sm relative">

      {/* Header */}
      <div className="bg-white border-b border-slate-100 p-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1 hover:bg-slate-50 rounded-full">
            <ArrowLeft className="h-6 w-6 text-slate-700" />
          </button>
          <h1 className="text-lg font-semibold text-slate-900">Technician Panel</h1>
        </div>
        <div className="flex items-center gap-3">
          <button className="p-2 hover:bg-slate-50 rounded-full transition-colors relative">
            <Bell className="h-5 w-5 text-slate-700" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>
          <div className="w-9 h-9 bg-slate-200 rounded-full overflow-hidden">
            <div className="w-full h-full flex items-center justify-center text-slate-600 font-semibold text-sm">
              AR
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 flex flex-col gap-4">

        {/* Current Job Card */}
        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Current Job</span>
          <h2 className="text-lg font-semibold text-slate-900 mt-1">HVAC System Maintenance - #8842</h2>
          <p className="text-sm text-slate-600 mt-1">Client: Miller Residence • 1224 Oak Lane</p>
          
          <div className="mt-4 flex">
            <span className="inline-flex items-center gap-1.5 bg-slate-100 text-[#0D47A1] text-xs font-semibold px-3 py-1.5 rounded-full">
              <span className="w-2 h-2 bg-[#0D47A1] rounded-full"></span>
              IN PROGRESS
            </span>
          </div>
        </div>

        {/* Work Performed Card */}
        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="h-5 w-5 text-[#0D47A1]" />
            <h3 className="text-sm font-semibold text-[#0D47A1] uppercase tracking-wide">Work Performed</h3>
          </div>
          
          <div className="border border-slate-200 rounded-xl p-3 bg-white">
            <textarea
              className="w-full h-32 text-sm text-slate-700 placeholder-slate-400 focus:outline-none resize-none"
              placeholder="Describe the diagnostic findings and actions taken in detail..."
              value={workPerformed}
              onChange={(e) => setWorkPerformed(e.target.value)}
            />
          </div>
        </div>

        {/* Parts Replaced Card */}
        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-[#0D47A1]" />
              <h3 className="text-sm font-semibold text-[#0D47A1] uppercase tracking-wide">Parts Replaced</h3>
            </div>
            <button 
              onClick={addPart}
              className="flex items-center gap-1 text-sm font-semibold text-[#0D47A1] hover:text-blue-800 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Part
            </button>
          </div>

          {/* Manual Add Form */}
          {isAddingPart && (
            <div className="bg-slate-50 p-4 rounded-xl mb-4 flex flex-col gap-3 border border-slate-100">
              <input 
                type="text" 
                placeholder="Part Name" 
                value={newPartName} 
                onChange={(e) => setNewPartName(e.target.value)}
                className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#0D47A1]"
              />
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="SKU" 
                  value={newPartSku} 
                  onChange={(e) => setNewPartSku(e.target.value)}
                  className="flex-1 p-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#0D47A1]"
                />
                <input 
                  type="number" 
                  placeholder="Qty" 
                  value={newPartQty} 
                  onChange={(e) => setNewPartQty(e.target.value)}
                  className="w-20 p-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#0D47A1]"
                />
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={saveNewPart}
                  className="flex-1 bg-[#0D47A1] text-white font-semibold py-2 rounded-lg text-sm hover:bg-blue-800 transition-colors"
                >
                  Save
                </button>
                <button 
                  onClick={() => setIsAddingPart(false)}
                  className="flex-1 bg-white border border-slate-200 text-slate-700 font-semibold py-2 rounded-lg text-sm hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3">
            {parts.map((p) => (
              <div key={p.id} className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex justify-between items-center">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">{p.name}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">SKU: {p.sku} • Qty: {p.qty}</p>
                </div>
                <button 
                  onClick={() => deletePart(p.id)}
                  className="p-2 hover:bg-red-50 rounded-full transition-colors text-red-500"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Service Photos Card */}
        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Camera className="h-5 w-5 text-[#0D47A1]" />
            <h3 className="text-sm font-semibold text-[#0D47A1] uppercase tracking-wide">Service Photos (Before & After)</h3>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Upload Box */}
            <div 
              onClick={addPhoto}
              className="border-2 border-dashed border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center gap-2 hover:border-[#0D47A1] cursor-pointer transition-colors h-36"
            >
              <Plus className="h-6 w-6 text-slate-400" />
              <span className="text-xs font-semibold text-slate-500">Upload Photo</span>
            </div>

            {photos.map((photo) => (
              <div key={photo.id} className="relative rounded-xl overflow-hidden h-36 border border-slate-100">
                <img src={photo.src} alt={photo.type} className="w-full h-full object-cover" />
                <span className="absolute top-2 left-2 bg-[#0D47A1] text-white text-xs font-semibold px-2 py-0.5 rounded-md">
                  {photo.type}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Complete Job Button */}
        <button 
          onClick={handleComplete}
          className="w-full bg-[#FFD600] text-[#0D47A1] font-semibold py-3 rounded-xl hover:bg-yellow-400 transition-colors mt-2"
        >
          Complete Job
        </button>

      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-[#E3ECF9] border-t border-border-color p-4 flex justify-around items-center z-10">
        <button 
          onClick={() => navigate('/technician/dashboard')}
          className="flex flex-col items-center text-[#0D47A1]"
        >
          <Briefcase className="h-6 w-6" />
          <span className="text-xs font-medium">Jobs</span>
        </button>
        <button 
          onClick={() => navigate('/technician/schedule')}
          className="flex flex-col items-center text-text-secondary hover:text-[#0D47A1]"
        >
          <ClipboardList className="h-6 w-6" />
          <span className="text-xs font-medium">Requests</span>
        </button>
        <button 
          onClick={() => navigate('/technician/active-job')}
          className="flex flex-col items-center text-text-secondary hover:text-[#0D47A1]"
        >
          <Calendar className="h-6 w-6" />
          <span className="text-xs font-medium">Schedule</span>
        </button>
        <button 
          onClick={() => navigate('/technician/profile')}
          className="flex flex-col items-center text-text-secondary hover:text-[#0D47A1]"
        >
          <User className="h-6 w-6" />
          <span className="text-xs font-medium">Profile</span>
        </button>
      </div>

    </div>
  );
};

export default Dashboard;
