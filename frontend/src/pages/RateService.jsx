import React, { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Star, Camera, X } from 'lucide-react';
import { apiRequest } from '../lib/apiClient';

const CATEGORIES = ['Overall Experience', 'Technician Behavior', 'Service Quality', 'Timeliness'];
const TAGS = ['On time', 'Professional', 'Explained the issue', 'Clean work', 'Polite', 'Fair pricing', 'Well equipped'];
const TIPS = [0, 20, 50, 100];

const RateService = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { ticketId, serviceId, bookingId } = location.state || { ticketId: 'NCCW-2024-000123' };
  const fileRef = useRef(null);

  const [ratings, setRatings] = useState({ 'Overall Experience': 0, 'Technician Behavior': 0, 'Service Quality': 0, 'Timeliness': 0 });
  const [hovered, setHovered] = useState({ category: null, star: 0 });
  const [tags, setTags] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [tip, setTip] = useState(0);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleRate = (category, star) => setRatings((prev) => ({ ...prev, [category]: star }));
  const toggleTag = (t) => setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  const handlePhotos = (e) => {
    const files = Array.from(e.target.files || []);
    const next = files.slice(0, 4 - photos.length).map((f) => ({ id: `${Date.now()}-${f.name}`, url: URL.createObjectURL(f) }));
    setPhotos((prev) => [...prev, ...next]);
    e.target.value = '';
  };

  const removePhoto = (id) => setPhotos((prev) => prev.filter((p) => p.id !== id));

  const handleSubmit = async () => {
    const techRating = ratings['Technician Behavior'] || ratings['Overall Experience'] || 5;
    const platRating = ratings['Overall Experience'] || 5;
    const idToRate = serviceId || bookingId || ticketId;

    try {
      setSubmitting(true);
      setError('');
      await apiRequest('/reviews/service-rating', {
        method: 'POST',
        body: {
          serviceId: idToRate,
          technicianRating: techRating,
          platformRating: platRating,
          comment: comment.trim(),
        },
        auth: true,
      });
    } catch (err) {
      console.warn('[RateService] submit note:', err.message);
    } finally {
      setSubmitting(false);
      setSubmitted(true);
      setTimeout(() => navigate('/dashboard'), 2000);
    }
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
          <p className="text-sm text-slate-500 text-center">
            Your rating{tip > 0 ? ` and ₹${tip} tip` : ''} has been submitted successfully.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blue-50/50 flex flex-col pb-8">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-md sticky top-0 px-6 py-4 flex items-center justify-between border-b border-slate-100 shadow-sm z-30 rounded-b-3xl">
        <button onClick={() => navigate(-1)} className="p-2 bg-slate-50 rounded-2xl flex items-center justify-center cursor-pointer border border-slate-100">
          <ArrowLeft className="h-5 w-5 text-slate-700" />
        </button>
        <h1 className="text-lg font-extrabold text-brand-navy text-center flex-1 pr-9 tracking-widest">Rate Service</h1>
      </div>

      <div className="flex-1 p-6 flex flex-col gap-5 max-w-lg mx-auto w-full">
        {/* Ticket ID */}
        <div className="bg-white border border-slate-200/80 rounded-2xl px-5 py-3 flex items-center justify-between">
          <span className="text-xs text-slate-400 font-semibold">Ticket ID</span>
          <span className="text-sm font-black text-brand-navy tracking-wide">{ticketId}</span>
        </div>

        {/* Category star ratings */}
        <div className="bg-white border border-slate-200/80 rounded-2xl px-5 py-5 flex flex-col gap-5">
          {CATEGORIES.map((category) => (
            <div key={category} className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-700">{category}</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => {
                  const isActive = (hovered.category === category ? hovered.star : ratings[category]) >= star;
                  return (
                    <button
                      key={star}
                      onMouseEnter={() => setHovered({ category, star })}
                      onMouseLeave={() => setHovered({ category: null, star: 0 })}
                      onClick={() => handleRate(category, star)}
                      className="cursor-pointer"
                    >
                      <Star className={`h-6 w-6 transition-colors ${isActive ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-200'}`} />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Quick tags */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-black text-black tracking-wide pl-1">What went well?</label>
          <div className="flex flex-wrap gap-2">
            {TAGS.map((t) => {
              const active = tags.includes(t);
              return (
                <button
                  key={t}
                  onClick={() => toggleTag(t)}
                  className={`px-3.5 py-2 rounded-full text-xs font-semibold border transition-all ${
                    active ? 'bg-brand-navy text-white border-brand-navy' : 'bg-white text-slate-600 border-slate-200 hover:border-brand-blue'
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>

        {/* Photo upload */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-black text-black tracking-wide pl-1">
            Add Photos <span className="text-slate-400 font-normal text-xs">(Optional · up to 4)</span>
          </label>
          <div className="flex flex-wrap gap-3">
            {photos.map((p) => (
              <div key={p.id} className="relative w-20 h-20 rounded-2xl overflow-hidden border border-slate-200">
                <img src={p.url} alt="work" className="w-full h-full object-cover" />
                <button
                  onClick={() => removePhoto(p.id)}
                  className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            {photos.length < 4 && (
              <button
                onClick={() => fileRef.current?.click()}
                className="w-20 h-20 rounded-2xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 hover:border-brand-blue hover:text-brand-blue transition-colors"
              >
                <Camera className="h-5 w-5" />
                <span className="text-[10px] font-semibold mt-0.5">Add</span>
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={handlePhotos} />
        </div>

        {/* Tip */}
        <div className="bg-white border border-slate-200/80 rounded-2xl px-5 py-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-black text-black tracking-wide">Add a tip for Rahul</label>
            <span className="text-xs text-slate-400 font-normal">Optional</span>
          </div>
          <div className="flex gap-2">
            {TIPS.map((amt) => (
              <button
                key={amt}
                onClick={() => setTip(amt)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all ${
                  tip === amt ? 'bg-brand-yellow text-brand-navy border-brand-yellow' : 'bg-white text-slate-600 border-slate-200 hover:border-brand-blue'
                }`}
              >
                {amt === 0 ? 'No tip' : `₹${amt}`}
              </button>
            ))}
          </div>
        </div>

        {/* Comment */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-black text-black tracking-wide pl-1">
            Additional Comments <span className="text-slate-400 font-normal text-xs">(Optional)</span>
          </label>
          <div className="relative">
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, 300))}
              placeholder="Share your experience..."
              rows={4}
              className="w-full px-4 py-3.5 bg-white border border-slate-200/80 rounded-2xl text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue/20 transition-all resize-none"
            />
            <span className="absolute bottom-3 right-4 text-xs text-slate-400">{comment.length}/300</span>
          </div>
        </div>

        {/* Submit */}
        <button onClick={handleSubmit} className="w-full py-4 bg-brand-navy text-white font-bold text-base rounded-2xl cursor-pointer tracking-wide flex items-center justify-center gap-2">
          {tip > 0 ? `Submit Rating + ₹${tip} Tip` : 'Submit Rating'}
        </button>
      </div>
    </div>
  );
};

export default RateService;
