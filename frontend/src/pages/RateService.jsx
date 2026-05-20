import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Star } from 'lucide-react';

const CATEGORIES = ['Overall Experience', 'Technician Behavior', 'Service Quality', 'Timeliness'];

const RateService = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { ticketId } = location.state || { ticketId: 'NCCW-2024-000123' };

  const [ratings, setRatings] = useState({ 'Overall Experience': 0, 'Technician Behavior': 0, 'Service Quality': 0, 'Timeliness': 0 });
  const [hovered, setHovered] = useState({ category: null, star: 0 });
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleRate = (category, star) => {
    setRatings(prev => ({ ...prev, [category]: star }));
  };

  const handleSubmit = () => {
    setSubmitted(true);
    setTimeout(() => navigate('/dashboard'), 2000);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-blue-50/50 flex flex-col items-center justify-center p-6">
        <div className="bg-white border border-slate-200/80 rounded-3xl p-8 w-full max-w-sm flex flex-col items-center gap-4 shadow-sm">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <h2 className="text-lg font-black text-slate-900">Thanks for your feedback!</h2>
          <p className="text-sm text-slate-500 text-center">Your rating has been submitted successfully.</p>
        </div>
      </div>
    );
  }

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
          Rate Service
        </h1>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 flex flex-col gap-5 max-w-lg mx-auto w-full">

        {/* Ticket ID ref */}
        <div className="bg-white border border-slate-200/80 rounded-2xl px-5 py-3 flex items-center justify-between">
          <span className="text-xs text-slate-400 font-semibold">Ticket ID</span>
          <span className="text-sm font-black text-brand-navy tracking-wide">{ticketId}</span>
        </div>

        {/* Star Ratings */}
        <div className="bg-white border border-slate-200/80 rounded-2xl px-5 py-5 flex flex-col gap-5">
          {CATEGORIES.map(category => (
            <div key={category} className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-700">{category}</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(star => {
                  const isActive = (hovered.category === category ? hovered.star : ratings[category]) >= star;
                  return (
                    <button
                      key={star}
                      onMouseEnter={() => setHovered({ category, star })}
                      onMouseLeave={() => setHovered({ category: null, star: 0 })}
                      onClick={() => handleRate(category, star)}
                      className="cursor-pointer"
                    >
                      <Star
                        className={`h-6 w-6 transition-colors ${isActive ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-200'}`}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Comment */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-black text-black tracking-wide pl-1">Additional Comments <span className="text-slate-400 font-normal text-xs">(Optional)</span></label>
          <div className="relative">
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value.slice(0, 300))}
              placeholder="Share your experience..."
              rows={4}
              className="w-full px-4 py-3.5 bg-white border border-slate-200/80 rounded-2xl text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue/20 transition-all resize-none"
            />
            <span className="absolute bottom-3 right-4 text-xs text-slate-400">{comment.length}/300</span>
          </div>
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          className="w-full py-4 bg-brand-navy text-white font-bold text-base rounded-2xl cursor-pointer tracking-wide"
        >
          Submit Rating
        </button>

      </div>
    </div>
  );
};

export default RateService;
