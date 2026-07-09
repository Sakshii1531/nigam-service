import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/brand-admin/Sidebar';
import Topbar from '../../components/brand-admin/Topbar';
import { 
  Tv, Wind, CheckCircle2, ChevronRight, User, Phone, MapPin, 
  AlertTriangle, Calendar, Clock, ArrowLeft, ArrowRight, ShieldCheck 
} from 'lucide-react';

const devices = [
  { id: 'refrigerator', name: 'Refrigerator', icon: '❄️', desc: 'Double Door, Side-by-Side, Single Door' },
  { id: 'washing-machine', name: 'Washing Machine', icon: '🧺', desc: 'Front Load, Top Load, Semi-Automatic' },
  { id: 'ac', name: 'Air Conditioner', icon: '🍃', desc: 'Split AC, Window AC, Inverter AC' },
  { id: 'tv', name: 'Television', icon: '📺', desc: 'OLED, QLED, Smart LED TV' },
  { id: 'microwave', name: 'Microwave Oven', icon: '🍲', desc: 'Convection, Solo, Grill Microwave' },
];

const commonIssues = {
  refrigerator: ['Not cooling properly', 'Water leakage', 'Excessive noise', 'Freezer building up ice', 'Not turning on'],
  'washing-machine': ['Not spinning', 'Water not draining', 'Vibrating excessively', 'Loud noise during cycle', 'Error code on display'],
  ac: ['Not cooling', 'Water dripping from indoor unit', 'Loud noise', 'Remote not working', 'Bad odor from air vent'],
  tv: ['No display / black screen', 'Sound working but no picture', 'Horizontal/vertical lines', 'Wi-Fi connectivity issue', 'HDMI ports not working'],
  microwave: ['Not heating food', 'Sparking inside chamber', 'Turntable not rotating', 'Buttons not responding', 'Display panel blank'],
};

const RegisterComplaint = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [selectedDevice, setSelectedDevice] = useState(null);
  
  // Form state
  const [customer, setCustomer] = useState({ name: '', phone: '', email: '', address: '', pincode: '' });
  const [issueDetail, setIssueDetail] = useState({ issue: '', description: '', priority: 'Medium', warranty: 'Under Warranty' });
  const [schedule, setSchedule] = useState({ date: '', slot: '09:00 AM - 12:00 PM' });
  
  const [successModal, setSuccessModal] = useState(false);
  const [generatedTicket, setGeneratedTicket] = useState('');

  const handleNextStep = () => {
    if (step === 1 && !selectedDevice) return;
    if (step === 2 && (!customer.name.trim() || !customer.phone.trim() || !customer.address.trim())) return;
    if (step === 3 && !issueDetail.issue) return;
    if (step === 4 && !schedule.date) return;
    
    if (step < 4) {
      setStep(step + 1);
    } else {
      const ticketId = `TKT/250521/0${Math.floor(1000 + Math.random() * 9000)}`;
      setGeneratedTicket(ticketId);
      setSuccessModal(true);
    }
  };

  const handlePrevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const selectDevice = (dev) => {
    setSelectedDevice(dev);
    setIssueDetail(prev => ({ ...prev, issue: '' })); // reset issue
    setStep(2);
  };

  const handleComplete = () => {
    setSuccessModal(false);
    navigate('/brand-admin/complaints');
  };

  return (
    <div className="min-h-screen bg-[#F1F5F9] flex relative">
      <Sidebar />
      <div className="flex-1 ml-64 flex flex-col">
        <Topbar title="Register Complaint" subtitle="Register a new customer complaint request" />
        
        <div className="p-5 flex-1 flex flex-col items-center justify-start">
          
          {/* Step Indicator */}
          <div className="w-full max-w-3xl bg-white rounded-2xl border border-[#E2E8F0] p-4 mb-5">
            <div className="flex items-center justify-between">
              {[
                { number: 1, label: 'Select Device' },
                { number: 2, label: 'Customer Details' },
                { number: 3, label: 'Issue Details' },
                { number: 4, label: 'Schedule Visit' }
              ].map((s) => (
                <React.Fragment key={s.number}>
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      step >= s.number ? 'bg-[#0D47A1] text-white' : 'bg-[#F1F5F9] text-[#64748B]'
                    }`}>
                      {step > s.number ? <CheckCircle2 size={14} /> : s.number}
                    </div>
                    <span className={`text-xs font-semibold ${step >= s.number ? 'text-[#1E293B]' : 'text-[#94A3B8]'}`}>{s.label}</span>
                  </div>
                  {s.number < 4 && <div className={`flex-1 h-0.5 mx-2 ${step > s.number ? 'bg-[#0D47A1]' : 'bg-[#E2E8F0]'}`} />}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Step Panel Container */}
          <div className="w-full max-w-3xl bg-white rounded-3xl border border-[#E2E8F0] shadow-sm overflow-hidden flex flex-col min-h-[350px]">
            
            {/* Step 1: Select Device */}
            {step === 1 && (
              <div className="p-6 flex-1 flex flex-col justify-center">
                <h2 className="text-sm font-bold text-[#1E293B] mb-4 text-center">Select Customer's Electronic Device</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {devices.map(dev => (
                    <button
                      key={dev.id}
                      onClick={() => selectDevice(dev)}
                      className={`p-4 rounded-2xl border text-left transition-all flex items-start gap-4 ${
                        selectedDevice?.id === dev.id 
                          ? 'border-[#0D47A1] bg-[#EEF4FF] ring-2 ring-[#0D47A1]' 
                          : 'border-[#E2E8F0] hover:bg-[#F8FAFC]'
                      }`}
                    >
                      <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-[#E2E8F0] flex items-center justify-center text-2xl flex-shrink-0">
                        {dev.icon}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#1E293B]">{dev.name}</p>
                        <p className="text-[10px] text-[#64748B] mt-0.5 leading-normal">{dev.desc}</p>
                      </div>
                      <ChevronRight size={14} className="ml-auto text-[#94A3B8] self-center" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Customer Details */}
            {step === 2 && (
              <div className="p-6 flex-1">
                <div className="flex items-center gap-2 mb-4">
                  <button onClick={handlePrevStep} className="p-1 hover:bg-[#F1F5F9] rounded-lg text-[#64748B]"><ArrowLeft size={16} /></button>
                  <h2 className="text-sm font-bold text-[#1E293B]">Customer Information</h2>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="text-[10px] font-semibold text-[#64748B] uppercase block mb-1">Customer Full Name *</label>
                    <div className="relative">
                      <User size={13} className="absolute left-3 top-3 text-[#94A3B8]" />
                      <input
                        value={customer.name}
                        onChange={e => setCustomer({ ...customer, name: e.target.value })}
                        placeholder="e.g. Ramesh Kumar"
                        className="w-full pl-9 border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs bg-[#F8FAFC] outline-none focus:ring-2 focus:ring-[#0D47A1]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-[#64748B] uppercase block mb-1">Mobile Number *</label>
                    <div className="relative">
                      <Phone size={13} className="absolute left-3 top-3 text-[#94A3B8]" />
                      <input
                        value={customer.phone}
                        onChange={e => setCustomer({ ...customer, phone: e.target.value })}
                        placeholder="e.g. 9876543210"
                        className="w-full pl-9 border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs bg-[#F8FAFC] outline-none focus:ring-2 focus:ring-[#0D47A1]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-[#64748B] uppercase block mb-1">Email Address</label>
                    <input
                      type="email"
                      value={customer.email}
                      onChange={e => setCustomer({ ...customer, email: e.target.value })}
                      placeholder="e.g. ramesh@gmail.com"
                      className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs bg-[#F8FAFC] outline-none focus:ring-2 focus:ring-[#0D47A1]"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] font-semibold text-[#64748B] uppercase block mb-1">Service Address *</label>
                    <div className="relative">
                      <MapPin size={13} className="absolute left-3 top-3 text-[#94A3B8]" />
                      <input
                        value={customer.address}
                        onChange={e => setCustomer({ ...customer, address: e.target.value })}
                        placeholder="e.g. Flat 302, Sector 15, Dwarka"
                        className="w-full pl-9 border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs bg-[#F8FAFC] outline-none focus:ring-2 focus:ring-[#0D47A1]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-[#64748B] uppercase block mb-1">Pincode *</label>
                    <input
                      value={customer.pincode}
                      onChange={e => setCustomer({ ...customer, pincode: e.target.value })}
                      placeholder="e.g. 110075"
                      className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs bg-[#F8FAFC] outline-none focus:ring-2 focus:ring-[#0D47A1]"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Issue Details */}
            {step === 3 && (
              <div className="p-6 flex-1">
                <div className="flex items-center gap-2 mb-4">
                  <button onClick={handlePrevStep} className="p-1 hover:bg-[#F1F5F9] rounded-lg text-[#64748B]"><ArrowLeft size={16} /></button>
                  <h2 className="text-sm font-bold text-[#1E293B]">Issue &amp; Appliance Details</h2>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-semibold text-[#64748B] uppercase block mb-2">Select Primary Issue *</label>
                    <div className="grid grid-cols-2 gap-2">
                      {commonIssues[selectedDevice.id]?.map(issue => (
                        <button
                          key={issue}
                          onClick={() => setIssueDetail({ ...issueDetail, issue })}
                          className={`p-2.5 rounded-xl border text-left text-xs font-semibold transition-all ${
                            issueDetail.issue === issue 
                              ? 'border-[#0D47A1] bg-[#EEF4FF] text-[#0D47A1]' 
                              : 'border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC]'
                          }`}
                        >
                          {issue}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-[#64748B] uppercase block mb-1">Issue Description (Optional)</label>
                    <textarea
                      value={issueDetail.description}
                      onChange={e => setIssueDetail({ ...issueDetail, description: e.target.value })}
                      placeholder="Enter detailed problem description or symptom..."
                      rows={2}
                      className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs bg-[#F8FAFC] outline-none focus:ring-2 focus:ring-[#0D47A1] resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-semibold text-[#64748B] uppercase block mb-1">Warranty Status</label>
                      <select
                        value={issueDetail.warranty}
                        onChange={e => setIssueDetail({ ...issueDetail, warranty: e.target.value })}
                        className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs bg-[#F8FAFC] outline-none focus:ring-2 focus:ring-[#0D47A1]"
                      >
                        <option>Under Warranty</option>
                        <option>Out of Warranty</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-[#64748B] uppercase block mb-1">Priority Level</label>
                      <select
                        value={issueDetail.priority}
                        onChange={e => setIssueDetail({ ...issueDetail, priority: e.target.value })}
                        className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs bg-[#F8FAFC] outline-none focus:ring-2 focus:ring-[#0D47A1]"
                      >
                        <option>Low</option>
                        <option>Medium</option>
                        <option>High</option>
                        <option>Critical</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Schedule Visit */}
            {step === 4 && (
              <div className="p-6 flex-1">
                <div className="flex items-center gap-2 mb-4">
                  <button onClick={handlePrevStep} className="p-1 hover:bg-[#F1F5F9] rounded-lg text-[#64748B]"><ArrowLeft size={16} /></button>
                  <h2 className="text-sm font-bold text-[#1E293B]">Schedule Technician Visit</h2>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-semibold text-[#64748B] uppercase block mb-1">Select Visit Date *</label>
                    <div className="relative">
                      <Calendar size={13} className="absolute left-3 top-3 text-[#94A3B8]" />
                      <input
                        type="date"
                        value={schedule.date}
                        onChange={e => setSchedule({ ...schedule, date: e.target.value })}
                        className="w-full pl-9 border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs bg-[#F8FAFC] outline-none focus:ring-2 focus:ring-[#0D47A1]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-[#64748B] uppercase block mb-2">Preferred Time Slot *</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        '09:00 AM - 12:00 PM',
                        '12:00 PM - 03:00 PM',
                        '03:00 PM - 06:00 PM',
                        '06:00 PM - 09:00 PM'
                      ].map(slot => (
                        <button
                          key={slot}
                          onClick={() => setSchedule({ ...schedule, slot })}
                          className={`p-3 rounded-xl border text-center text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
                            schedule.slot === slot 
                              ? 'border-[#0D47A1] bg-[#EEF4FF] text-[#0D47A1]' 
                              : 'border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC]'
                          }`}
                        >
                          <Clock size={13} />
                          {slot}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Actions for Steps */}
            {step > 1 && (
              <div className="p-4 bg-[#F8FAFC] border-t border-[#E2E8F0] flex justify-between items-center">
                <button
                  onClick={handlePrevStep}
                  className="px-4 py-2 border border-[#E2E8F0] rounded-xl text-xs font-bold text-[#64748B] hover:bg-white transition-all flex items-center gap-1.5"
                >
                  <ArrowLeft size={14} /> Back
                </button>
                <button
                  onClick={handleNextStep}
                  className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition-all flex items-center gap-1.5 ${
                    (step === 2 && (!customer.name.trim() || !customer.phone.trim() || !customer.address.trim())) ||
                    (step === 3 && !issueDetail.issue) ||
                    (step === 4 && !schedule.date)
                      ? 'bg-blue-300 cursor-not-allowed'
                      : 'bg-[#0D47A1] hover:bg-blue-700'
                  }`}
                >
                  {step === 4 ? 'Register Complaint' : 'Next'} <ArrowRight size={14} />
                </button>
              </div>
            )}

          </div>

        </div>
      </div>

      {/* Success Modal */}
      {successModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full border border-[#E2E8F0] p-6 text-center animate-in zoom-in duration-200">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-600 mx-auto mb-4 border border-green-200">
              <CheckCircle2 size={32} />
            </div>
            <h3 className="font-extrabold text-[#1E293B] text-base mb-1">Complaint Registered!</h3>
            <p className="text-xs text-[#64748B] mb-4">The ticket has been generated and dispatched to the local service partner.</p>
            
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-4 mb-5 text-left text-xs space-y-2">
              <div className="flex justify-between"><span className="text-[#64748B]">Ticket ID:</span><span className="font-bold text-[#0D47A1]">{generatedTicket}</span></div>
              <div className="flex justify-between"><span className="text-[#64748B]">Customer:</span><span className="font-bold text-[#1E293B]">{customer.name}</span></div>
              <div className="flex justify-between"><span className="text-[#64748B]">Device:</span><span className="font-bold text-[#1E293B]">{selectedDevice?.name}</span></div>
              <div className="flex justify-between"><span className="text-[#64748B]">Issue:</span><span className="font-bold text-[#1E293B]">{issueDetail.issue}</span></div>
              <div className="flex justify-between"><span className="text-[#64748B]">Schedule:</span><span className="font-bold text-[#1E293B]">{schedule.date} ({schedule.slot.split(' ')[0]}...)</span></div>
            </div>
            
            <button
              onClick={handleComplete}
              className="w-full bg-[#0D47A1] hover:bg-blue-700 text-white text-xs font-bold py-2.5 rounded-xl transition-all"
            >
              Go to All Complaints
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegisterComplaint;
