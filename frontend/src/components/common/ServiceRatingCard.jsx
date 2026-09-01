import React, { useState, useEffect } from 'react';
import { Star, Check, AlertCircle, Loader2, Sparkles, User, ShieldCheck } from 'lucide-react';
import { apiRequest } from '../../lib/apiClient';

/**
 * ServiceRatingCard
 * 
 * Clean, reusable rating card for completed service bookings and tickets.
 * Handles:
 * - Technician rating (1–5 stars)
 * - Platform rating (1–5 stars)
 * - Optional written review
 * - Duplicate rating check on mount
 * - Instant submitted state transition
 */
const ServiceRatingCard = ({ service, onRatingSubmitted }) => {
  const serviceId = service?._id || service?.id;
  const technicianName = service?.technician?.name || service?.technicianName || 'Technician';

  const [techRating, setTechRating] = useState(0);
  const [techHover, setTechHover] = useState(0);
  const [platformRating, setPlatformRating] = useState(0);
  const [platformHover, setPlatformHover] = useState(0);
  const [comment, setComment] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [existingRating, setExistingRating] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successToast, setSuccessToast] = useState(false);

  // Check if this service has already been rated by this customer
  useEffect(() => {
    let isMounted = true;
    if (!serviceId) {
      setCheckingStatus(false);
      return;
    }

    const checkRating = async () => {
      try {
        setCheckingStatus(true);
        const res = await apiRequest(`/reviews/service-rating/${serviceId}`, { auth: true });
        if (isMounted) {
          if (res?.rated && res.rating) {
            setExistingRating(res.rating);
          }
        }
      } catch (err) {
        // Silent catch for non-blocking UI
        console.warn('[ServiceRatingCard] Status check:', err.message);
      } finally {
        if (isMounted) setCheckingStatus(false);
      }
    };

    checkRating();

    return () => {
      isMounted = false;
    };
  }, [serviceId]);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setErrorMsg('');

    if (techRating < 1 || techRating > 5) {
      setErrorMsg('Please select a rating for your technician (1 to 5 stars).');
      return;
    }

    if (platformRating < 1 || platformRating > 5) {
      setErrorMsg('Please select a rating for the platform experience (1 to 5 stars).');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        serviceId,
        technicianRating: techRating,
        platformRating: platformRating,
        comment: comment.trim(),
      };

      const res = await apiRequest('/reviews/service-rating', {
        method: 'POST',
        body: payload,
        auth: true,
      });

      const savedRating = {
        technicianRating: techRating,
        platformRating: platformRating,
        comment: comment.trim(),
        createdAt: new Date().toISOString(),
      };

      setExistingRating(savedRating);
      setSuccessToast(true);
      if (typeof onRatingSubmitted === 'function') {
        onRatingSubmitted(res || savedRating);
      }
    } catch (err) {
      if (err.status === 409) {
        setErrorMsg('Rating has already been submitted for this service.');
      } else {
        setErrorMsg(err.message || 'Failed to submit rating. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (checkingStatus) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs flex items-center justify-center gap-2 text-xs font-semibold text-slate-500">
        <Loader2 className="w-4 h-4 animate-spin text-[#0D47A1]" />
        <span>Loading service review...</span>
      </div>
    );
  }

  // ─── Submitted View ──────────────────────────────────────────────────────────
  if (existingRating) {
    return (
      <div className="bg-gradient-to-br from-emerald-50/70 via-white to-blue-50/50 rounded-2xl p-5 border border-emerald-200/80 shadow-2xs flex flex-col gap-4 text-left transition-all">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <Check className="w-4 h-4 stroke-[3]" />
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Your Rating</h4>
              <p className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                ✓ Rating submitted successfully
              </p>
            </div>
          </div>

          <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-200">
            Verified Review
          </span>
        </div>

        {/* Rating Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          {/* Tech Rating */}
          <div className="bg-white/90 p-3 rounded-xl border border-slate-200/70 flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
              <User className="w-3 h-3 text-[#0D47A1]" /> Technician ({technicianName})
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-3.5 h-3.5 ${
                      star <= (existingRating.technicianRating || existingRating.rating || 5)
                        ? 'text-amber-400 fill-amber-400'
                        : 'text-slate-200 fill-slate-200'
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs font-black text-slate-900">
                {Number(existingRating.technicianRating || existingRating.rating || 5).toFixed(1)}
              </span>
            </div>
          </div>

          {/* Platform Rating */}
          <div className="bg-white/90 p-3 rounded-xl border border-slate-200/70 flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-[#0D47A1]" /> Platform Experience
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-3.5 h-3.5 ${
                      star <= (existingRating.platformRating || existingRating.rating || 5)
                        ? 'text-amber-400 fill-amber-400'
                        : 'text-slate-200 fill-slate-200'
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs font-black text-slate-900">
                {Number(existingRating.platformRating || existingRating.rating || 5).toFixed(1)}
              </span>
            </div>
          </div>
        </div>

        {/* Review Note */}
        {existingRating.comment && (
          <div className="bg-white/90 p-3 rounded-xl border border-slate-200/70 text-xs">
            <span className="text-[10px] font-bold text-slate-400 block mb-0.5 uppercase tracking-wider">Your Feedback</span>
            <p className="text-slate-700 italic font-normal leading-relaxed">
              "{existingRating.comment}"
            </p>
          </div>
        )}
      </div>
    );
  }

  // ─── Rating Form View ────────────────────────────────────────────────────────
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs flex flex-col gap-4 text-left">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-1.5 text-[#0D47A1] mb-0.5">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Service Feedback</span>
          </div>
          <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
            How was your service experience?
          </h3>
        </div>
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 1. Rate Technician */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-[#0D47A1]" />
            <span>Rate Technician <strong className="text-slate-900">({technicianName})</strong></span>
          </label>
          <span className="text-[11px] font-black text-amber-600 font-mono">
            {techRating > 0 ? `${techRating}.0 ★` : 'Select'}
          </span>
        </div>
        <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-100">
          {[1, 2, 3, 4, 5].map((star) => {
            const isFilled = (techHover || techRating) >= star;
            return (
              <button
                key={star}
                type="button"
                onMouseEnter={() => setTechHover(star)}
                onMouseLeave={() => setTechHover(0)}
                onClick={() => setTechRating(star)}
                className="p-1 cursor-pointer transition-transform hover:scale-110 active:scale-95"
                aria-label={`Rate technician ${star} stars`}
              >
                <Star
                  className={`w-6 h-6 transition-colors ${
                    isFilled ? 'text-amber-400 fill-amber-400' : 'text-slate-300 fill-slate-100'
                  }`}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Rate Platform */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#0D47A1]" />
            <span>Rate Platform</span>
          </label>
          <span className="text-[11px] font-black text-amber-600 font-mono">
            {platformRating > 0 ? `${platformRating}.0 ★` : 'Select'}
          </span>
        </div>
        <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-100">
          {[1, 2, 3, 4, 5].map((star) => {
            const isFilled = (platformHover || platformRating) >= star;
            return (
              <button
                key={star}
                type="button"
                onMouseEnter={() => setPlatformHover(star)}
                onMouseLeave={() => setPlatformHover(0)}
                onClick={() => setPlatformRating(star)}
                className="p-1 cursor-pointer transition-transform hover:scale-110 active:scale-95"
                aria-label={`Rate platform ${star} stars`}
              >
                <Star
                  className={`w-6 h-6 transition-colors ${
                    isFilled ? 'text-amber-400 fill-amber-400' : 'text-slate-300 fill-slate-100'
                  }`}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Optional Written Review */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-800">
            Write a review <span className="text-slate-400 font-normal">(Optional)</span>
          </label>
          <span className="text-[10px] text-slate-400">{comment.length}/300</span>
        </div>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value.slice(0, 300))}
          placeholder="Share details of your service experience..."
          rows={3}
          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:bg-white focus:border-[#0D47A1] focus:ring-1 focus:ring-[#0D47A1]/20 transition-all resize-none"
        />
      </div>

      {/* 4. Submit Rating Button */}
      <button
        type="button"
        disabled={isSubmitting}
        onClick={handleSubmit}
        className="w-full py-3 bg-[#0D47A1] hover:bg-[#072C63] text-white text-xs font-bold rounded-xl shadow-xs hover:shadow-md transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed mt-1"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Submitting Rating...</span>
          </>
        ) : (
          <span>Submit Rating</span>
        )}
      </button>
    </div>
  );
};

export default ServiceRatingCard;
