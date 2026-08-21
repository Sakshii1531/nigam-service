import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/super-admin/Sidebar';
import Topbar from '../../components/super-admin/Topbar';
import { Save, Plus, Trash2, Pencil, RefreshCw, Sparkles, HelpCircle, FileText, CheckCircle2 } from 'lucide-react';
import { apiRequest } from '../../lib/apiClient';

const CMS = () => {
  const [activeTab, setActiveTab] = useState('faqs'); // 'faqs' | 'policy' | 'terms'
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);

  const [textContent, setTextContent] = useState('');
  const [faqsList, setFaqsList] = useState([]);

  // Modal / Form state for Adding/Editing FAQ
  const [showFaqModal, setShowFaqModal] = useState(false);
  const [editingFaqIndex, setEditingFaqIndex] = useState(null);
  const [faqForm, setFaqForm] = useState({
    question: '',
    answer: '',
    category: 'General'
  });

  const getSlug = (tab) => {
    if (tab === 'policy') return 'privacy-policy';
    if (tab === 'terms') return 'terms-and-conditions';
    return 'faqs';
  };

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const loadPageData = async () => {
    setLoading(true);
    const slug = getSlug(activeTab);
    try {
      const res = await apiRequest(`/cms/pages/${slug}`);
      const pageData = res || {};

      if (activeTab === 'faqs') {
        setFaqsList(Array.isArray(pageData.faqs) ? pageData.faqs : []);
        setTextContent(pageData.body || '');
      } else {
        setTextContent(pageData.body || '');
      }
    } catch (err) {
      console.warn(`Error loading CMS page ${slug}:`, err);
      setTextContent('');
      if (activeTab === 'faqs') setFaqsList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPageData();
  }, [activeTab]);

  const handleSavePage = async () => {
    setSaving(true);
    const slug = getSlug(activeTab);
    try {
      const payload = {
        body: textContent,
        publishedAt: new Date()
      };

      if (activeTab === 'faqs') {
        payload.faqs = faqsList;
      }

      await apiRequest(`/cms/pages/${slug}`, {
        method: 'PUT',
        auth: true,
        body: payload
      });

      showToast(`✨ ${activeTab === 'faqs' ? 'FAQs' : 'Page content'} published successfully!`);
    } catch (err) {
      console.warn('Error saving CMS page:', err);
      showToast(err.message || 'Failed to publish page content');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenAddFaq = () => {
    setEditingFaqIndex(null);
    setFaqForm({ question: '', answer: '', category: 'General' });
    setShowFaqModal(true);
  };

  const handleOpenEditFaq = (index) => {
    const item = faqsList[index];
    setEditingFaqIndex(index);
    setFaqForm({
      question: item.question || '',
      answer: item.answer || '',
      category: item.category || 'General'
    });
    setShowFaqModal(true);
  };

  const handleSaveFaqItem = (e) => {
    e.preventDefault();
    if (!faqForm.question.trim() || !faqForm.answer.trim()) return;

    if (editingFaqIndex !== null) {
      const updated = [...faqsList];
      updated[editingFaqIndex] = { ...faqForm };
      setFaqsList(updated);
    } else {
      setFaqsList([...faqsList, { ...faqForm }]);
    }
    setShowFaqModal(false);
  };

  const handleDeleteFaq = (index) => {
    if (!window.confirm('Delete this FAQ item?')) return;
    const updated = faqsList.filter((_, i) => i !== index);
    setFaqsList(updated);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex text-slate-800 relative">
      <Sidebar />
      <div className="flex-1 ml-64 min-h-screen flex flex-col">
        <Topbar title="CMS & Page Content Manager" subtitle="Manage FAQs, Privacy Policy, and Terms of Service" />
        
        {/* Toast Notification */}
        {toastMsg && (
          <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white font-bold text-xs py-3 px-6 rounded-2xl shadow-xl flex items-center gap-2 border border-slate-800 animate-in fade-in">
            <Sparkles className="h-4 w-4 text-amber-400 animate-spin" />
            <span>{toastMsg}</span>
          </div>
        )}

        <div className="p-6 space-y-6 flex-1 text-left">
          
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden flex flex-col min-h-[600px]">
            {/* Header Tabs */}
            <div className="flex bg-slate-50 border-b border-slate-100 p-2 gap-2 justify-between items-center">
              <div className="flex gap-2">
                <button 
                  onClick={() => setActiveTab('faqs')}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'faqs' ? 'bg-[#0D47A1] text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <HelpCircle className="h-3.5 w-3.5" /> FAQs Manager
                </button>
                <button 
                  onClick={() => setActiveTab('policy')}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'policy' ? 'bg-[#0D47A1] text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <FileText className="h-3.5 w-3.5" /> Privacy Policy
                </button>
                <button 
                  onClick={() => setActiveTab('terms')}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'terms' ? 'bg-[#0D47A1] text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <FileText className="h-3.5 w-3.5" /> Terms & Conditions
                </button>
              </div>

              {activeTab === 'faqs' && (
                <button
                  onClick={handleOpenAddFaq}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                >
                  <Plus className="h-4 w-4" /> Add FAQ Item
                </button>
              )}
            </div>

            {/* Main Content View */}
            <div className="flex-1 p-6 relative">
              {loading ? (
                <div className="flex flex-col items-center justify-center p-20 text-slate-400 gap-2">
                  <RefreshCw className="h-8 w-8 animate-spin text-[#0D47A1]" />
                  <span className="text-xs font-semibold">Loading CMS content...</span>
                </div>
              ) : activeTab === 'faqs' ? (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-black text-slate-900">Manage Dynamic FAQs ({faqsList.length})</h3>
                      <p className="text-[11px] text-slate-400 font-medium">These questions and answers are served live to customer apps under Help & Support.</p>
                    </div>
                  </div>

                  {faqsList.length === 0 ? (
                    <div className="border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center text-xs text-slate-400 font-semibold flex flex-col items-center gap-2">
                      <HelpCircle className="h-8 w-8 text-slate-300" />
                      <span>No FAQs created yet. Click "Add FAQ Item" above to add your first question!</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3">
                      {faqsList.map((item, idx) => (
                        <div key={idx} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col gap-2 relative shadow-2xs hover:border-blue-300 transition-colors">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-2">
                              <span className="bg-blue-100 text-[#0D47A1] text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                                {item.category || 'General'}
                              </span>
                              <h4 className="text-xs font-black text-slate-900 leading-snug">
                                Q{idx + 1}: {item.question}
                              </h4>
                            </div>

                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <button
                                onClick={() => handleOpenEditFaq(idx)}
                                className="p-1.5 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors cursor-pointer"
                                title="Edit FAQ"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteFaq(idx)}
                                className="p-1.5 hover:bg-rose-100 text-rose-500 rounded-lg transition-colors cursor-pointer"
                                title="Delete FAQ"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                          
                          <p className="text-xs text-slate-600 font-medium bg-white p-3 rounded-xl border border-slate-100 leading-relaxed">
                            {item.answer}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* Plain Textarea for Policy / Terms */
                <textarea 
                  value={textContent} 
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder="Enter content here..."
                  className="w-full min-h-[450px] p-4 border border-[#E2E8F0] rounded-xl outline-none focus:ring-2 focus:ring-[#0D47A1] text-xs font-mono text-slate-700 bg-[#F8FAFC] resize-y"
                />
              )}
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-slate-100 bg-white flex justify-end gap-2">
              <button 
                onClick={handleSavePage} 
                disabled={saving}
                className="flex items-center gap-1.5 bg-[#0D47A1] hover:bg-blue-900 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Publishing...</span>
                  </>
                ) : (
                  <>
                    <Save size={14} />
                    <span>Save & Publish Live</span>
                  </>
                )}
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Add / Edit FAQ Modal */}
      {showFaqModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[28px] w-full max-w-md p-6 shadow-xl relative text-left">
            <button 
              onClick={() => setShowFaqModal(false)}
              className="absolute top-4 right-4 p-1 hover:bg-slate-100 rounded-full transition-all cursor-pointer"
            >
              <Trash2 className="h-5 w-5 text-slate-400 hidden" />
              <span className="text-slate-400 font-bold text-sm">✕</span>
            </button>
            <h3 className="text-sm font-black text-slate-900 mb-4 uppercase tracking-wide">
              {editingFaqIndex !== null ? 'Edit FAQ Item' : 'Add FAQ Item'}
            </h3>

            <form onSubmit={handleSaveFaqItem} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Category</label>
                <select 
                  value={faqForm.category}
                  onChange={(e) => setFaqForm({ ...faqForm, category: e.target.value })}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-blue-600"
                >
                  <option value="General">General</option>
                  <option value="Bookings">Bookings</option>
                  <option value="Payments">Payments</option>
                  <option value="Warranty">Warranty</option>
                  <option value="AMC">AMC & Plans</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Question *</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. How do I track my service booking?"
                  value={faqForm.question}
                  onChange={(e) => setFaqForm({ ...faqForm, question: e.target.value })}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-blue-600"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Answer *</label>
                <textarea 
                  required
                  rows={4}
                  placeholder="Provide a clear, helpful answer for customers..."
                  value={faqForm.answer}
                  onChange={(e) => setFaqForm({ ...faqForm, answer: e.target.value })}
                  className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium text-slate-800 outline-none focus:border-blue-600 resize-none"
                />
              </div>

              <button 
                type="submit" 
                className="bg-[#0D47A1] hover:bg-blue-900 text-white py-3 rounded-xl text-xs font-black transition-all cursor-pointer mt-2"
              >
                {editingFaqIndex !== null ? 'Update FAQ Item' : 'Add to FAQ List'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default CMS;

