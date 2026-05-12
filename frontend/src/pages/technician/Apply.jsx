import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Phone, Briefcase, MapPin } from 'lucide-react';

const TechApply = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    phone: '',
    skill: '',
    city: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      navigate('/technician/login');
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#F4F6F8] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      
      {/* Background Decorative Blurs */}
      <div className="absolute top-[-100px] left-[-100px] w-[300px] h-[300px] bg-[#0D47A1] opacity-10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-[-100px] right-[-100px] w-[300px] h-[300px] bg-[#FFD600] opacity-20 rounded-full blur-3xl"></div>

      <div className="w-full max-w-md bg-white rounded-[30px] shadow-[0_20px_50px_rgba(5,150,105,0.05)] border border-slate-100 overflow-hidden flex flex-col pt-4 px-6 pb-4 relative z-10">
        
        {/* Header */}
        <div className="flex items-center mb-2">
          <button 
            onClick={() => navigate('/technician/login')}
            className="p-2 hover:bg-slate-50 rounded-full transition-all border border-transparent hover:border-slate-100"
          >
            <ArrowLeft className="h-5 w-5 text-[#0D47A1]" />
          </button>
          <span className="text-xs font-bold text-[#0D47A1] ml-2 uppercase tracking-wider">Join as Partner</span>
        </div>

        {/* Logo/Brand */}
        <div className="flex flex-col items-center mb-2">
          <div className="w-12 h-12 bg-[#E3ECF9] rounded-2xl flex items-center justify-center mb-1">
            <Briefcase className="h-6 w-6 text-[#0D47A1]" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Partner Application</h1>
          <p className="text-slate-500 text-xs mt-1">Fill the form to join our network</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          
          {/* Full Name */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Full Name</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Enter your name"
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:border-[#0D47A1] focus:ring-1 focus:ring-[#0D47A1] outline-none transition-all text-sm"
                required
              />
            </div>
          </div>

          {/* Phone */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Phone Number</label>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="Enter phone number"
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:border-[#0D47A1] focus:ring-1 focus:ring-[#0D47A1] outline-none transition-all text-sm"
                required
              />
            </div>
          </div>

          {/* Skill/Category */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Skill / Category</label>
            <div className="relative">
              <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                name="skill"
                value={form.skill}
                onChange={handleChange}
                placeholder="e.g. AC Repair, Electrician"
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:border-[#0D47A1] focus:ring-1 focus:ring-[#0D47A1] outline-none transition-all text-sm"
                required
              />
            </div>
          </div>

          {/* City */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">City</label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                name="city"
                value={form.city}
                onChange={handleChange}
                placeholder="Enter your city"
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:border-[#0D47A1] focus:ring-1 focus:ring-[#0D47A1] outline-none transition-all text-sm"
                required
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className={`w-full font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5 mt-2 active:scale-95 shadow-md ${
              submitted
                ? 'bg-green-500 text-white'
                : 'bg-[#FFD600] text-[#0D47A1] hover:bg-yellow-400 shadow-yellow-400/10'
            }`}
          >
            {submitted ? '✓ Application Submitted!' : 'Submit Application'}
          </button>
        </form>

      </div>
    </div>
  );
};

export default TechApply;
