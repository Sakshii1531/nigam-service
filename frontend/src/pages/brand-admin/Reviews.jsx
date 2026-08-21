import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/brand-admin/Sidebar';
import Topbar from '../../components/brand-admin/Topbar';
import { apiRequest } from '../../lib/apiClient';
import { 
  Search, 
  Filter, 
  Star, 
  Smile, 
  Meh, 
  Frown, 
  MessageSquare,
  AlertTriangle,
  Send,
  X,
  Check,
  CheckCircle2
} from 'lucide-react';

const dateFormatter = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

function shape(review) {
  return {
    id: review.id,
    ref: review.humanId || review.id,
    ticketId: review.serviceRequest?.humanId || '—',
    customer: review.user?.name || 'Customer',
    rating: review.rating,
    date: review.createdAt ? dateFormatter.format(new Date(review.createdAt)) : '—',
    comment: review.comment || '',
    technician: review.technician?.name || 'Unassigned',
    status: review.status || 'Reviewed',
    response: review.brandResponse || '',
  };
}

const Reviews = () => {
  const [showModal, setShowModal] = useState(false);
  const [selectedReview, setSelectedReview] = useState(null);
  const [responseMsg, setResponseMsg] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRating, setSelectedRating] = useState('All Ratings');
  const [selectedStatus, setSelectedStatus] = useState('All Status');

  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function loadReviews() {
      try {
        const data = await apiRequest('/reviews/brand', { auth: true });
        if (!cancelled) setReviews((data || []).map(shape));
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadReviews();
    return () => { cancelled = true; };
  }, []);

  const averageRating = reviews.length
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : '0.0';
  // "Positive" is 4★ and above — the same cut the sentiment icons use below.
  const positivePercent = reviews.length
    ? Math.round((reviews.filter(r => r.rating >= 4).length / reviews.length) * 100)
    : 0;

  const stats = [
    { title: 'Average Rating', value: `${averageRating} / 5.0`, icon: <Star size={20} className="fill-amber-500 text-amber-500" />, color: 'bg-amber-50 border-amber-200' },
    { title: 'Total Reviews', value: reviews.length.toString(), icon: <MessageSquare size={20} />, color: 'bg-blue-50 border-blue-200' },
    { title: 'Positive Sentiment', value: `${positivePercent}%`, icon: <Smile size={20} className="text-green-600" />, color: 'bg-green-50 border-green-200' },
    { title: 'Escalated Cases', value: reviews.filter(r => r.status === 'Escalated').length.toString(), icon: <AlertTriangle size={20} className="text-red-600" />, color: 'bg-red-50 border-red-200' },
  ];

  const handleResponseSubmit = async (e) => {
    e.preventDefault();
    if (!responseMsg) return;
    const id = selectedReview.id;
    try {
      await apiRequest(`/reviews/${id}/respond`, {
        method: 'PATCH', auth: true, body: { response: responseMsg },
      });
      setReviews(prev => prev.map(r => (r.id === id ? { ...r, status: 'Responded', response: responseMsg } : r)));
      setResponseMsg('');
      setShowModal(false);
      setSuccessMessage('Response posted successfully and sent to customer!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(`Could not post response: ${err.message}`);
    }
  };

  // 'Escalated' is a valid Review status, but the API only exposes /respond —
  // there is no endpoint that sets it, so this stays local and says so.
  const handleEscalate = (id) => {
    setReviews(prev => prev.map(r => (r.id === id ? { ...r, status: 'Escalated' } : r)));
    setError('Escalation is not persisted — the API exposes no endpoint to set this status yet.');
  };

  const filteredReviews = reviews.filter(rev => {
    const matchesSearch = rev.customer.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          rev.comment.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          rev.technician.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          rev.ticketId.toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesRating = true;
    if (selectedRating === '5 Stars') matchesRating = rev.rating === 5;
    else if (selectedRating === '4 Stars') matchesRating = rev.rating === 4;
    else if (selectedRating === '3 Stars') matchesRating = rev.rating === 3;
    else if (selectedRating === '2 Stars & Below') matchesRating = rev.rating <= 2;

    const matchesStatus = selectedStatus === 'All Status' || rev.status === selectedStatus;
    return matchesSearch && matchesRating && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      <Sidebar />

      <div className="flex-1 ml-64 min-h-screen flex flex-col relative">
        <Topbar title="Customer Reviews & Ratings" />

        <div className="p-6 space-y-6 flex-1">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((card, index) => (
              <div key={index} className={`bg-white p-6 rounded-2xl border ${card.color} flex items-center gap-4`}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-white flex-shrink-0 shadow-sm">
                  {card.icon}
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#64748B]">{card.title}</p>
                  <p className="text-2xl font-bold text-[#1E293B]">{card.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] flex flex-wrap gap-4 items-center justify-between">
            <div className="flex flex-wrap gap-3 items-center flex-1">
              <div className="relative w-64">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#64748B]">
                  <Search size={16} />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] focus:border-[#0D47A1] outline-none transition-all text-sm bg-[#F8FAFC]"
                  placeholder="Search Ticket, Customer, Comment..."
                />
              </div>

              <select 
                value={selectedRating}
                onChange={(e) => setSelectedRating(e.target.value)}
                className="text-sm text-[#1E293B] border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#0D47A1] bg-[#F8FAFC]"
              >
                <option>All Ratings</option>
                <option>5 Stars</option>
                <option>4 Stars</option>
                <option>3 Stars</option>
                <option>2 Stars & Below</option>
              </select>

              <select 
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="text-sm text-[#1E293B] border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#0D47A1] bg-[#F8FAFC]"
              >
                <option>All Status</option>
                <option>Reviewed</option>
                <option>Responded</option>
                <option>Escalated</option>
              </select>
            </div>
          </div>

          {/* Reviews List */}
          <div className="space-y-6 max-w-4xl">
            {loading && (
              <div className="bg-white p-10 rounded-2xl border border-[#E2E8F0] text-center text-sm font-semibold text-[#64748B]">Loading reviews…</div>
            )}
            {!loading && error && (
              <div className="bg-white p-10 rounded-2xl border border-[#E2E8F0] text-center text-sm font-semibold text-red-600">{error}</div>
            )}
            {!loading && !error && filteredReviews.length === 0 && (
              <div className="bg-white p-10 rounded-2xl border border-[#E2E8F0] text-center text-sm font-semibold text-[#64748B]">No reviews yet.</div>
            )}
            {filteredReviews.map((rev) => (
              <div key={rev.id} className="bg-white p-6 rounded-2xl border border-[#E2E8F0] space-y-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#EEF4FF] rounded-full flex items-center justify-center font-bold text-[#0D47A1]">
                      {rev.customer.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#1E293B]">{rev.customer}</h4>
                      <p className="text-xs text-[#64748B]">{rev.date} • Ticket: <span className="text-[#0D47A1] font-semibold">{rev.ticketId}</span></p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i} 
                        size={16} 
                        className={i < rev.rating ? 'fill-amber-400 text-amber-400' : 'text-[#E2E8F0]'} 
                      />
                    ))}
                  </div>
                </div>

                <p className="text-sm text-[#334155] font-medium leading-relaxed bg-[#F8FAFC] p-4 rounded-xl">
                  "{rev.comment}"
                </p>

                <div className="flex justify-between items-center text-xs text-[#64748B] pt-2">
                  <p>Technician: <span className="font-semibold text-[#1E293B]">{rev.technician}</span></p>
                  
                  <div className="flex gap-3">
                    {rev.status === 'Reviewed' && (
                      <>
                        <button 
                          onClick={() => { setSelectedReview(rev); setShowModal(true); }}
                          className="text-[#0D47A1] font-bold hover:underline"
                        >
                          Respond
                        </button>
                        {rev.rating <= 3 && (
                          <button 
                            onClick={() => handleEscalate(rev.id)}
                            className="text-red-655 font-bold hover:underline"
                          >
                            Escalate
                          </button>
                        )}
                      </>
                    )}
                    {rev.status === 'Escalated' && (
                      <span className="bg-red-50 text-red-700 px-2 py-0.5 rounded border border-red-200 font-semibold flex items-center gap-1">
                        <AlertTriangle size={12} /> Escalated
                      </span>
                    )}
                    {rev.status === 'Responded' && (
                      <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded border border-green-200 font-semibold flex items-center gap-1">
                        <Check size={12} /> Responded
                      </span>
                    )}
                  </div>
                </div>

                {rev.response && (
                  <div className="mt-3 bg-blue-50/30 border-l-4 border-[#0D47A1] p-4 rounded-r-xl text-xs space-y-1">
                    <p className="font-bold text-[#0D47A1]">LG Brand Response:</p>
                    <p className="text-[#334155] leading-relaxed font-medium">"{rev.response}"</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Response Modal */}
        {showModal && selectedReview && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-6 border-b border-[#E2E8F0] flex justify-between items-center">
                <h2 className="text-lg font-bold text-[#1E293B]">Post Response</h2>
                <button 
                  onClick={() => setShowModal(false)}
                  className="text-[#64748B] hover:text-[#1E293B] p-2 hover:bg-[#F8FAFC] rounded-full"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleResponseSubmit} className="p-6 space-y-4">
                <div className="text-xs text-[#64748B] bg-[#F8FAFC] p-3 rounded-lg">
                  <p className="font-bold">Customer Review:</p>
                  <p className="italic">"{selectedReview.comment}"</p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#64748B] mb-1 block">Your Response</label>
                  <textarea
                    required
                    rows="4"
                    className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] outline-none text-sm resize-none"
                    placeholder="Type your response to the customer..."
                    value={responseMsg}
                    onChange={(e) => setResponseMsg(e.target.value)}
                  />
                </div>

                <div className="pt-4 border-t border-[#E2E8F0] flex gap-3 justify-end text-sm">
                  <button 
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="bg-white text-[#64748B] border border-[#E2E8F0] px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-[#F8FAFC] transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="bg-[#0D47A1] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-1.5"
                  >
                    <Send size={14} /> Send Response
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Success Toast */}
        {successMessage && (
          <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2 animate-bounce">
            <CheckCircle2 className="h-4 w-4" />
            {successMessage}
          </div>
        )}
      </div>
    </div>
  );
};

export default Reviews;
