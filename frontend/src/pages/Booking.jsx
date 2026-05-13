import React, { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Upload, Calendar as CalendarIcon, Clock, Wrench, ChevronDown } from 'lucide-react';

const Booking = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  
  const searchParams = new URLSearchParams(location.search);
  const preSelectedService = searchParams.get('service') || 'AC Repair & Service';
  const [selectedService, setSelectedService] = useState(preSelectedService);
  const price = searchParams.get('price') || '499';
  const isWarranty = searchParams.get('warranty') === 'true';

  const services = [
    'AC Repair & Service',
    'Washing Machine Repair',
    'Electrician Services',
    'Plumbing Services',
    'Full Home Cleaning',
    'Salon for Women',
    'Spa & Massage',
    'Refrigerator Service'
  ];

  const handleConfirm = (e) => {
    e.preventDefault();
    navigate(`/booking-success?service=${encodeURIComponent(selectedService)}`);
  };

  return (
    <div className="min-h-screen bg-bg-light flex flex-col">
      
      {/* Header */}
      <div className="bg-[#E3ECF9] p-6 rounded-b-[30px] shadow-sm flex items-center gap-4">
        <button 
          onClick={() => navigate('/dashboard')}
          className="p-2 bg-white rounded-full shadow-sm hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-[#0D47A1]" />
        </button>
        <h1 className="text-xl font-bold text-text-primary">Book Service</h1>
      </div>

      {/* Content */}
      <form onSubmit={handleConfirm} className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto pb-32">
        
        {/* Service Info */}
        <div className="flex flex-col gap-2 relative">
          <label className="text-sm font-bold text-text-primary">Select Service</label>
          <div 
            onClick={() => setIsOpen(!isOpen)}
            className="bg-white p-4 rounded-2xl shadow-sm border border-border-color flex items-center gap-4 cursor-pointer hover:border-[#0D47A1] transition-all"
          >
            <div className="w-12 h-12 bg-[#E8F5E9] rounded-xl flex items-center justify-center flex-shrink-0">
              <Wrench className="h-6 w-6 text-[#2E7D32]" />
            </div>
            <div className="flex-1 flex justify-between items-center">
              <div>
                <span className="text-xs text-text-secondary block">Service</span>
                <span className="font-bold text-text-primary">{selectedService}</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span className="text-xs text-text-secondary block">Price</span>
                  <span className={`font-bold ${isWarranty ? 'text-green-600' : 'text-[#0D47A1]'}`}>
                    {isWarranty ? '₹0 (Warranty)' : `₹${price}`}
                  </span>
                </div>
                <ChevronDown className={`h-5 w-5 text-text-secondary transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </div>
            </div>
          </div>

          {/* Dropdown Options */}
          {isOpen && (
            <div className="absolute top-[calc(100%+4px)] left-0 right-0 bg-white border border-border-color rounded-2xl shadow-lg z-50 py-2 max-h-60 overflow-y-auto">
              {services.map((service) => (
                <div
                  key={service}
                  onClick={() => {
                    setSelectedService(service);
                    setIsOpen(false);
                  }}
                  className={`px-4 py-3 text-sm cursor-pointer hover:bg-[#E3ECF9] transition-colors ${selectedService === service ? 'font-bold text-[#0D47A1] bg-[#E3ECF9]/50' : 'text-text-primary'}`}
                >
                  {service}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Issue Description */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-bold text-text-primary">Describe the issue</label>
          <textarea
            placeholder="E.g. AC is not cooling, making noise..."
            className="w-full p-4 bg-white border border-border-color rounded-2xl focus:border-[#0D47A1] focus:ring-1 focus:ring-[#0D47A1] outline-none transition-all text-sm h-32 resize-none shadow-sm"
            required
          ></textarea>
        </div>

        {/* Image Upload */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-bold text-text-primary">Upload Photos (Optional)</label>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*"
            onChange={(e) => {
              if (e.target.files.length > 0) {
                alert(`Selected file: ${e.target.files[0].name}`);
              }
            }}
          />
          <div 
            onClick={() => fileInputRef.current.click()}
            className="border-2 border-dashed border-border-color rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-[#0D47A1] transition-all bg-white shadow-sm"
          >
            <div className="p-3 bg-slate-50 rounded-full">
              <Upload className="h-6 w-6 text-text-secondary" />
            </div>
            <span className="text-sm font-semibold text-text-primary">Click to upload or drag and drop</span>
            <span className="text-xs text-text-secondary">PNG, JPG up to 5MB</span>
          </div>
        </div>

        {/* Date & Time */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-text-primary">Date</label>
            <div className="relative">
              <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-text-secondary" />
              <input
                type="date"
                className="w-full pl-12 pr-4 py-3 bg-white border border-border-color rounded-2xl focus:border-[#0D47A1] focus:ring-1 focus:ring-[#0D47A1] outline-none transition-all text-sm shadow-sm"
                required
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-text-primary">Time</label>
            <div className="relative">
              <Clock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-text-secondary" />
              <input
                type="time"
                className="w-full pl-12 pr-4 py-3 bg-white border border-border-color rounded-2xl focus:border-[#0D47A1] focus:ring-1 focus:ring-[#0D47A1] outline-none transition-all text-sm shadow-sm"
                required
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
              />
            </div>
          </div>
        </div>

      </form>

      {/* Footer / Action Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-border-color shadow-lg">
        <button
          type="submit"
          onClick={handleConfirm}
          className="w-full bg-[#FFD600] text-[#0D47A1] font-bold py-3 rounded-2xl flex items-center justify-center gap-2 hover:bg-yellow-400 transition-colors shadow-md"
        >
          Confirm Booking
        </button>
      </div>

    </div>
  );
};

export default Booking;
