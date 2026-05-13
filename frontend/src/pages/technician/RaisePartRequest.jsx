import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, ArrowLeft, Briefcase, ClipboardList, Calendar, User, Wrench, Send } from 'lucide-react';

const RaisePartRequest = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    jobId: '#8842', // Pre-filled for the current job context
    partName: '',
    qty: '1',
    reason: '',
    priority: 'Medium'
  });
  const [isSuccess, setIsSuccess] = useState(false);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (e.target.name === 'partName' || e.target.name === 'reason') {
      // Clear error or something if needed, but keeping it simple
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.partName || !formData.reason) {
      alert('Please fill all required fields');
      return;
    }
    setIsSuccess(true);
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 max-w-md mx-auto border-x border-slate-100 shadow-sm relative">
        <div className="flex flex-col items-center text-center gap-6">
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center">
            <Send className="h-12 w-12 text-green-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Request Sent!</h1>
            <p className="text-sm text-slate-500 mt-2">
              Your part request has been submitted to the brand for approval.
            </p>
          </div>
          <button 
            onClick={() => navigate('/technician/dashboard')}
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
          <h1 className="text-lg font-semibold text-slate-900">Raise Part Request</h1>
        </div>
        <button className="p-2 hover:bg-slate-50 rounded-full transition-colors relative">
          <Bell className="h-5 w-5 text-slate-700" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 flex flex-col gap-4">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Job ID (Readonly for now) */}
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Active Job ID</label>
            <input 
              type="text" 
              name="jobId"
              value={formData.jobId}
              readOnly
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-700 font-medium"
            />
          </div>

          {/* Part Details */}
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Wrench className="h-5 w-5 text-[#0D47A1]" />
              <h3 className="text-sm font-semibold text-[#0D47A1] uppercase tracking-wide">Part Details</h3>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Part Name *</label>
              <input
                type="text"
                name="partName"
                value={formData.partName}
                onChange={handleInputChange}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0D47A1]"
                placeholder="e.g. Compressor, Drain Pump"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Quantity *</label>
                <input
                  type="number"
                  name="qty"
                  value={formData.qty}
                  onChange={handleInputChange}
                  min="1"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0D47A1]"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Priority</label>
                <select
                  name="priority"
                  value={formData.priority}
                  onChange={handleInputChange}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0D47A1] text-slate-700"
                >
                  <option>High</option>
                  <option>Medium</option>
                  <option>Low</option>
                </select>
              </div>
            </div>
          </div>

          {/* Reason */}
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-2">Reason for Request *</label>
            <div className="border border-slate-200 rounded-xl p-3 bg-slate-50">
              <textarea
                name="reason"
                value={formData.reason}
                onChange={handleInputChange}
                className="w-full h-32 bg-transparent text-sm text-slate-700 placeholder-slate-400 focus:outline-none resize-none"
                placeholder="Describe why this part is needed (e.g., motor burnt, physical damage)..."
                required
              />
            </div>
          </div>

          {/* Submit Button */}
          <button 
            type="submit"
            className="w-full bg-[#0D47A1] text-white font-semibold py-3 rounded-xl hover:bg-blue-800 transition-colors mt-2"
          >
            Submit Request
          </button>
        </form>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-[#E3ECF9] border-t border-border-color p-4 flex justify-around items-center z-10">
        <button 
          onClick={() => navigate('/technician/dashboard')}
          className="flex flex-col items-center text-text-secondary hover:text-[#0D47A1]"
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

export default RaisePartRequest;
