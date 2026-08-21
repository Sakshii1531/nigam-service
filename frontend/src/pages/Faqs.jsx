import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, ChevronDown, HelpCircle, RefreshCw, MessageCircle } from 'lucide-react';
import { apiRequest } from '../lib/apiClient';

const Faqs = () => {
  const navigate = useNavigate();
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [openIdx, setOpenIdx] = useState(0);

  const categories = ['All', 'General', 'Bookings', 'Payments', 'Warranty', 'AMC & Plans'];

  const fetchFaqs = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/cms/pages/faqs');
      const pageData = res || {};
      const list = Array.isArray(pageData.faqs) ? pageData.faqs : [];
      setFaqs(list);
    } catch (err) {
      console.warn('Error loading FAQs:', err);
      setFaqs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFaqs();
  }, []);

  const filteredFaqs = faqs.filter((item) => {
    const matchesCategory = activeCategory === 'All' || (item.category || 'General').toLowerCase() === activeCategory.toLowerCase();
    const matchesSearch = !searchQuery.trim() || 
      item.question?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      item.answer?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col pb-12 text-left">
      
      {/* Header */}
      <div className="bg-white px-5 py-4 flex items-center gap-3 sticky top-0 z-50 shadow-sm border-b border-slate-100">
        <button
          onClick={() => navigate('/help-support', { replace: true })}
          className="p-1.5 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-5 w-5 text-slate-700" />
        </button>
        <h1 className="text-sm font-black text-slate-900">Frequently Asked Questions</h1>
      </div>

      <div className="flex flex-col gap-4 px-4 sm:px-6 pt-5 max-w-3xl mx-auto w-full">
        
        {/* Search Bar */}
        <div className="relative flex items-center">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5" />
          <input
            type="text"
            placeholder="Search FAQs, topics, or keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-2xl pl-10 pr-4 py-3 text-xs font-bold text-slate-800 outline-none focus:border-[#0D47A1] shadow-xs transition-all"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer border ${
                activeCategory === cat
                  ? 'bg-[#0D47A1] text-white border-[#0D47A1] shadow-xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* FAQ Items Feed */}
        {loading ? (
          <div className="flex flex-col items-center justify-center p-16 text-slate-400 gap-2">
            <RefreshCw className="h-6 w-6 animate-spin text-[#0D47A1]" />
            <span className="text-xs font-semibold">Loading FAQs...</span>
          </div>
        ) : filteredFaqs.length === 0 ? (
          <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center text-xs text-slate-400 font-semibold flex flex-col items-center gap-2 shadow-xs">
            <HelpCircle className="h-8 w-8 text-slate-300" />
            <span>No FAQs match your search query.</span>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredFaqs.map((item, idx) => {
              const isOpen = openIdx === idx;
              return (
                <div
                  key={idx}
                  className={`bg-white border rounded-2xl overflow-hidden transition-all shadow-2xs ${
                    isOpen ? 'border-[#0D47A1]' : 'border-slate-100'
                  }`}
                >
                  <button
                    onClick={() => setOpenIdx(isOpen ? null : idx)}
                    className="w-full p-4 flex items-center justify-between text-left gap-3 cursor-pointer bg-white"
                  >
                    <div className="flex items-start gap-3">
                      <span className="bg-blue-50 text-[#0D47A1] text-[9px] font-black px-2 py-0.5 rounded-md uppercase mt-0.5 flex-shrink-0">
                        {item.category || 'General'}
                      </span>
                      <h3 className="text-xs font-black text-slate-900 leading-snug">
                        {item.question}
                      </h3>
                    </div>
                    <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 flex-shrink-0 ${
                      isOpen ? 'rotate-180 text-[#0D47A1]' : ''
                    }`} />
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-4 pt-1 text-xs text-slate-600 font-medium leading-relaxed border-t border-slate-50 bg-slate-50/50">
                      {item.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Still Need Help Banner */}
        <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-2xl p-4 flex items-center justify-between shadow-md mt-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
              <MessageCircle className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <h4 className="text-xs font-black">Still have questions?</h4>
              <p className="text-[9.5px] text-blue-200 font-medium">Reach our 24/7 support team via Live Chat.</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/chat')}
            className="bg-amber-400 hover:bg-amber-500 text-slate-950 px-3.5 py-2 rounded-xl text-xs font-black transition-colors cursor-pointer shadow-xs whitespace-nowrap"
          >
            Chat Now
          </button>
        </div>

      </div>
    </div>
  );
};

export default Faqs;
