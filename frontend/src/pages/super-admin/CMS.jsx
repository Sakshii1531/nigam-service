import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/super-admin/Sidebar';
import Topbar from '../../components/super-admin/Topbar';
import { 
  Save, Plus, Trash2, Pencil, RefreshCw, Sparkles, HelpCircle, FileText, 
  CheckCircle2, ArrowUp, ArrowDown, Eye, Edit3, Shield, Mail, Scale, Lock, Clock, AlertCircle, Info, Award, Users, ThumbsUp, Wrench, Headphones
} from 'lucide-react';
import { apiRequest } from '../../lib/apiClient';

const CMS = () => {
  const [activeTab, setActiveTab] = useState('faqs'); // 'faqs' | 'policy' | 'terms' | 'about'
  const [editorMode, setEditorMode] = useState('sections'); // 'sections' | 'preview'
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);

  const [docTitle, setDocTitle] = useState('');
  const [docSubtitle, setDocSubtitle] = useState('');
  const [textContent, setTextContent] = useState('');
  const [docVersion, setDocVersion] = useState('v1.0');
  const [docContactEmail, setDocContactEmail] = useState('support@nccservice.in');
  const [sectionsList, setSectionsList] = useState([]);
  const [statsList, setStatsList] = useState([]);
  const [faqsList, setFaqsList] = useState([]);

  // Modal / Form state for Adding/Editing FAQ
  const [showFaqModal, setShowFaqModal] = useState(false);
  const [editingFaqIndex, setEditingFaqIndex] = useState(null);
  const [faqForm, setFaqForm] = useState({
    question: '',
    answer: '',
    category: 'General'
  });

  // Modal / Form state for Adding/Editing Section
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [editingSectionIndex, setEditingSectionIndex] = useState(null);
  const [sectionForm, setSectionForm] = useState({
    heading: '',
    text: ''
  });

  const getSlug = (tab) => {
    if (tab === 'policy') return 'privacy-policy';
    if (tab === 'terms') return 'terms-and-conditions';
    if (tab === 'about') return 'about-ncc';
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
        setSectionsList(Array.isArray(pageData.sections) && pageData.sections.length > 0 ? pageData.sections : []);
        setStatsList(Array.isArray(pageData.stats) && pageData.stats.length > 0 ? pageData.stats : [
          { label: 'Happy Customers', value: '50,000+' },
          { label: 'Certified Technicians', value: '100+' },
          { label: 'Satisfaction Rating', value: '4.8 ★' },
          { label: 'Response Time', value: '30 Mins' }
        ]);
        setDocTitle(pageData.title || 'Empowering Smart Home Care & Appliance Solutions');
        setDocSubtitle(pageData.subtitle || "Nigam Care Center (NCC) is India's leading home service network. We connect households with top-rated, background-verified technicians.");
        setTextContent(pageData.body || '');
        setDocVersion(pageData.version || 'v2.4.0');
        setDocContactEmail(pageData.contactEmail || (activeTab === 'policy' ? 'privacy@nccservice.in' : 'support@nccservice.in'));
      }
    } catch (err) {
      console.warn(`Error loading CMS page ${slug}:`, err);
      setTextContent('');
      setSectionsList([]);
      setStatsList([]);
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
      } else {
        payload.title = docTitle;
        payload.subtitle = docSubtitle;
        payload.sections = sectionsList;
        payload.stats = statsList;
        payload.version = docVersion;
        payload.contactEmail = docContactEmail;
      }

      await apiRequest(`/cms/pages/${slug}`, {
        method: 'PUT',
        auth: true,
        body: payload
      });

      showToast(`✨ ${activeTab === 'faqs' ? 'FAQs' : activeTab === 'policy' ? 'Privacy Policy' : activeTab === 'about' ? 'About Us' : 'Terms & Conditions'} published successfully!`);
    } catch (err) {
      console.warn('Error saving CMS page:', err);
      showToast(err.message || 'Failed to publish page content');
    } finally {
      setSaving(false);
    }
  };

  // FAQ Handlers
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

  // Section Handlers for Terms / Policy / About
  const handleOpenAddSection = () => {
    setEditingSectionIndex(null);
    setSectionForm({
      heading: activeTab === 'about' ? 'New Core Value / Feature' : `${sectionsList.length + 1}. `,
      text: ''
    });
    setShowSectionModal(true);
  };

  const handleOpenEditSection = (index) => {
    const item = sectionsList[index];
    setEditingSectionIndex(index);
    setSectionForm({
      heading: item.heading || '',
      text: item.text || ''
    });
    setShowSectionModal(true);
  };

  const handleSaveSectionItem = (e) => {
    e.preventDefault();
    if (!sectionForm.heading.trim() || !sectionForm.text.trim()) return;

    if (editingSectionIndex !== null) {
      const updated = [...sectionsList];
      updated[editingSectionIndex] = { ...sectionForm, order: editingSectionIndex };
      setSectionsList(updated);
    } else {
      setSectionsList([...sectionsList, { ...sectionForm, order: sectionsList.length }]);
    }
    setShowSectionModal(false);
  };

  const handleDeleteSection = (index) => {
    if (!window.confirm('Delete this section?')) return;
    const updated = sectionsList.filter((_, i) => i !== index);
    setSectionsList(updated);
  };

  const handleMoveSection = (index, direction) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= sectionsList.length) return;

    const updated = [...sectionsList];
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;

    updated.forEach((sec, idx) => sec.order = idx);
    setSectionsList(updated);
  };

  const handleStatChange = (index, field, val) => {
    const updated = [...statsList];
    updated[index] = { ...updated[index], [field]: val };
    setStatsList(updated);
  };

  const pageTitle = activeTab === 'policy' ? 'Privacy Policy' : activeTab === 'terms' ? 'Terms & Conditions' : activeTab === 'about' ? 'About Us' : 'FAQs';

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex text-slate-800 relative font-sans">
      <Sidebar />
      <div className="flex-1 ml-64 min-h-screen flex flex-col">
        <Topbar title="CMS & Legal Document Manager" subtitle="Dynamically manage Terms, Privacy Policy, About Us, and Help FAQs" />
        
        {/* Toast Notification */}
        {toastMsg && (
          <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white font-bold text-xs py-3 px-6 rounded-2xl shadow-xl flex items-center gap-2 border border-slate-800 animate-in fade-in">
            <Sparkles className="h-4 w-4 text-amber-400 animate-spin" />
            <span>{toastMsg}</span>
          </div>
        )}

        <div className="p-6 space-y-6 flex-1 text-left">
          
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden flex flex-col min-h-[650px]">
            
            {/* Top Navigation Tabs */}
            <div className="flex bg-slate-50 border-b border-slate-200/80 p-2.5 gap-2 justify-between items-center flex-wrap">
              <div className="flex gap-2">
                <button 
                  onClick={() => setActiveTab('faqs')}
                  className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
                    activeTab === 'faqs' ? 'bg-[#0D47A1] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200/70'
                  }`}
                >
                  <HelpCircle className="h-4 w-4" /> FAQs Manager
                </button>
                <button 
                  onClick={() => setActiveTab('about')}
                  className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
                    activeTab === 'about' ? 'bg-[#0D47A1] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200/70'
                  }`}
                >
                  <Info className="h-4 w-4" /> About Us Manager
                </button>
                <button 
                  onClick={() => setActiveTab('policy')}
                  className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
                    activeTab === 'policy' ? 'bg-[#0D47A1] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200/70'
                  }`}
                >
                  <Lock className="h-4 w-4" /> Privacy Policy
                </button>
                <button 
                  onClick={() => setActiveTab('terms')}
                  className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
                    activeTab === 'terms' ? 'bg-[#0D47A1] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200/70'
                  }`}
                >
                  <Scale className="h-4 w-4" /> Terms & Conditions
                </button>
              </div>

              {/* Actions Right */}
              <div className="flex items-center gap-2">
                {activeTab !== 'faqs' && (
                  <div className="flex items-center bg-slate-200/70 p-1 rounded-xl">
                    <button
                      onClick={() => setEditorMode('sections')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                        editorMode === 'sections' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                      }`}
                    >
                      <Edit3 className="h-3.5 w-3.5" /> Edit Mode
                    </button>
                    <button
                      onClick={() => setEditorMode('preview')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                        editorMode === 'preview' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                      }`}
                    >
                      <Eye className="h-3.5 w-3.5" /> Live Preview
                    </button>
                  </div>
                )}

                {activeTab === 'faqs' ? (
                  <button
                    onClick={handleOpenAddFaq}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                  >
                    <Plus className="h-4 w-4" /> Add FAQ Item
                  </button>
                ) : (
                  <button
                    onClick={handleOpenAddSection}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                  >
                    <Plus className="h-4 w-4" /> {activeTab === 'about' ? 'Add Core Value' : 'Add Legal Section'}
                  </button>
                )}
              </div>
            </div>

            {/* Document Header Metadata Bar */}
            {activeTab !== 'faqs' && (
              <div className="bg-slate-100/60 px-6 py-3 border-b border-slate-200/60 flex items-center justify-between gap-4 flex-wrap text-xs">
                <div className="flex items-center gap-4 flex-wrap flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Version Tag:</span>
                    <input 
                      type="text" 
                      value={docVersion}
                      onChange={(e) => setDocVersion(e.target.value)}
                      placeholder="v2.4.0"
                      className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 font-mono text-xs font-bold text-slate-800 w-24 focus:outline-none focus:border-[#0D47A1]"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Support Email:</span>
                    <input 
                      type="email" 
                      value={docContactEmail}
                      onChange={(e) => setDocContactEmail(e.target.value)}
                      placeholder="support@nccservice.in"
                      className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 w-52 focus:outline-none focus:border-[#0D47A1]"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 text-slate-500 font-semibold text-[11px]">
                  <Clock className="h-3.5 w-3.5 text-[#0D47A1]" />
                  <span>Changes reflect live across customer app</span>
                </div>
              </div>
            )}

            {/* Main Content Body */}
            <div className="flex-1 p-6 relative">
              {loading ? (
                <div className="flex flex-col items-center justify-center p-20 text-slate-400 gap-2">
                  <RefreshCw className="h-8 w-8 animate-spin text-[#0D47A1]" />
                  <span className="text-xs font-semibold">Loading CMS content...</span>
                </div>
              ) : activeTab === 'faqs' ? (
                /* FAQs Manager View */
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-black text-slate-900">Dynamic Customer FAQs ({faqsList.length})</h3>
                      <p className="text-[11px] text-slate-500 font-medium">These questions and answers are served live to the customer app.</p>
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
                              <span className="bg-blue-100 text-[#0D47A1] text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase">
                                {item.category || 'General'}
                              </span>
                              <h4 className="text-xs font-black text-slate-900 leading-snug">
                                Q{idx + 1}: {item.question}
                              </h4>
                            </div>

                            <div className="flex items-center gap-1 flex-shrink-0">
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
              ) : activeTab === 'about' && editorMode === 'sections' ? (
                /* About Us Manager View */
                <div className="flex flex-col gap-6">
                  {/* Hero Headline & Subtitle Settings */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 flex flex-col gap-4">
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-[#0D47A1]" /> Hero Banner Content
                    </h4>

                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Headline Title</label>
                      <input 
                        type="text" 
                        value={docTitle} 
                        onChange={(e) => setDocTitle(e.target.value)}
                        placeholder="e.g. Empowering Smart Home Care & Appliance Solutions"
                        className="bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 outline-none focus:border-[#0D47A1]"
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hero Description / Subtitle</label>
                      <textarea 
                        rows={3}
                        value={docSubtitle} 
                        onChange={(e) => setDocSubtitle(e.target.value)}
                        placeholder="e.g. Nigam Care Center (NCC) is India's leading home service network..."
                        className="bg-white border border-slate-200 rounded-xl p-3 text-xs font-medium text-slate-800 outline-none focus:border-[#0D47A1] leading-relaxed resize-none"
                      />
                    </div>
                  </div>

                  {/* Key Performance Metrics / Stats Editor */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 flex flex-col gap-4">
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <Award className="h-4 w-4 text-[#0D47A1]" /> Platform Metrics & Stats (4 Key Widgets)
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {statsList.map((st, idx) => (
                        <div key={idx} className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col gap-2 shadow-2xs">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Metric #{idx + 1}</span>
                          <input 
                            type="text" 
                            value={st.value} 
                            onChange={(e) => handleStatChange(idx, 'value', e.target.value)}
                            placeholder="Value (e.g. 50,000+)"
                            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-black text-slate-900 outline-none focus:border-[#0D47A1]"
                          />
                          <input 
                            type="text" 
                            value={st.label} 
                            onChange={(e) => handleStatChange(idx, 'label', e.target.value)}
                            placeholder="Label (e.g. Happy Customers)"
                            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-[#0D47A1]"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Core Values / Features Cards */}
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                        Core Values & Key Features ({sectionsList.length})
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {sectionsList.map((sec, idx) => (
                        <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col gap-2 shadow-2xs relative">
                          <div className="flex items-center justify-between gap-3">
                            <h5 className="text-xs font-black text-slate-900 truncate">{sec.heading}</h5>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => handleOpenEditSection(idx)}
                                className="p-1 hover:bg-slate-100 text-[#0D47A1] rounded-lg"
                                title="Edit"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteSection(idx)}
                                className="p-1 hover:bg-rose-50 text-rose-500 rounded-lg"
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                          <p className="text-xs text-slate-600 font-medium leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                            {sec.text}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : editorMode === 'preview' ? (
                /* Live Preview Mode */
                <div className="bg-[#F8FAFC] border border-slate-200 rounded-3xl p-6 md:p-8 flex flex-col gap-6 max-w-4xl mx-auto shadow-inner text-left">
                  {/* Hero Banner Preview */}
                  <div className="bg-gradient-to-br from-[#051F42] via-[#0B4EA2] to-[#0D47A1] rounded-2xl p-6 text-white shadow-md flex flex-col gap-2">
                    <span className="bg-white/10 text-xs font-bold px-3 py-0.5 rounded-full border border-white/20 w-fit">
                      {docVersion} • Live Preview
                    </span>
                    <h2 className="text-xl md:text-2xl font-black text-white mt-1">{docTitle || pageTitle}</h2>
                    <p className="text-xs text-blue-100 leading-relaxed font-medium">{docSubtitle}</p>
                  </div>

                  {/* Stats Preview */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {statsList.map((st, i) => (
                      <div key={i} className="bg-white rounded-xl p-3 border border-slate-200 text-center flex flex-col gap-0.5">
                        <span className="text-lg font-black text-slate-900">{st.value}</span>
                        <span className="text-[10px] font-bold text-slate-500">{st.label}</span>
                      </div>
                    ))}
                  </div>

                  {/* Sections Preview */}
                  <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs flex flex-col gap-4">
                    <h3 className="text-sm font-black text-slate-900">Why Millions Trust NCC</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {sectionsList.map((sec, idx) => (
                        <div key={idx} className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col gap-1">
                          <h4 className="text-xs font-black text-slate-900">{sec.heading}</h4>
                          <p className="text-[11px] text-slate-600 leading-relaxed">{sec.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* Structured Section Cards Manager for Policy / Terms */
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-black text-slate-900">Manage Structured Sections ({sectionsList.length})</h3>
                      <p className="text-[11px] text-slate-500 font-medium">Add, edit, reorder, or update legal clauses for this document.</p>
                    </div>
                  </div>

                  {sectionsList.length === 0 ? (
                    <div className="border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center text-xs text-slate-400 font-semibold flex flex-col items-center gap-2">
                      <FileText className="h-8 w-8 text-slate-300" />
                      <span>No legal sections added. Click "Add Legal Section" above to get started.</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3.5">
                      {sectionsList.map((sec, idx) => (
                        <div 
                          key={idx} 
                          className="bg-white border border-slate-200/90 hover:border-blue-300 rounded-2xl p-4 flex flex-col gap-2.5 shadow-2xs transition-all relative group"
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <span className="w-6 h-6 rounded-lg bg-[#EAF4FF] text-[#0D47A1] text-xs font-black flex items-center justify-center shrink-0">
                                {idx + 1}
                              </span>
                              <h4 className="text-xs font-black text-slate-900 truncate">
                                {sec.heading}
                              </h4>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => handleMoveSection(idx, -1)}
                                disabled={idx === 0}
                                className="p-1.5 hover:bg-slate-100 disabled:opacity-30 text-slate-600 rounded-lg transition-colors cursor-pointer"
                                title="Move Up"
                              >
                                <ArrowUp className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleMoveSection(idx, 1)}
                                disabled={idx === sectionsList.length - 1}
                                className="p-1.5 hover:bg-slate-100 disabled:opacity-30 text-slate-600 rounded-lg transition-colors cursor-pointer"
                                title="Move Down"
                              >
                                <ArrowDown className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleOpenEditSection(idx)}
                                className="p-1.5 hover:bg-blue-50 text-[#0D47A1] rounded-lg transition-colors cursor-pointer"
                                title="Edit Section"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteSection(idx)}
                                className="p-1.5 hover:bg-rose-50 text-rose-500 rounded-lg transition-colors cursor-pointer"
                                title="Delete Section"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>

                          <p className="text-xs text-slate-600 font-medium bg-slate-50/80 p-3 rounded-xl border border-slate-100 leading-relaxed">
                            {sec.text}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer Publish Bar */}
            <div className="p-4 border-t border-slate-200/80 bg-white flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span>All updates reflect dynamically across iOS, Android, and Web apps.</span>
              </div>

              <button 
                onClick={handleSavePage} 
                disabled={saving}
                className="flex items-center gap-2 bg-[#0D47A1] hover:bg-blue-900 text-white px-6 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Publishing Live...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[28px] w-full max-w-md p-6 shadow-xl relative text-left">
            <button 
              onClick={() => setShowFaqModal(false)}
              className="absolute top-4 right-4 p-1 hover:bg-slate-100 rounded-full transition-all cursor-pointer text-slate-400"
            >
              ✕
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

      {/* Add / Edit Section Modal */}
      {showSectionModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[28px] w-full max-w-lg p-6 shadow-xl relative text-left">
            <button 
              onClick={() => setShowSectionModal(false)}
              className="absolute top-4 right-4 p-1 hover:bg-slate-100 rounded-full transition-all cursor-pointer text-slate-400"
            >
              ✕
            </button>
            <h3 className="text-sm font-black text-slate-900 mb-4 uppercase tracking-wide">
              {editingSectionIndex !== null ? 'Edit Section' : 'Add New Section'}
            </h3>

            <form onSubmit={handleSaveSectionItem} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Heading *</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. 1. Certified & Verified Technicians"
                  value={sectionForm.heading}
                  onChange={(e) => setSectionForm({ ...sectionForm, heading: e.target.value })}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-blue-600"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Description Content *</label>
                <textarea 
                  required
                  rows={6}
                  placeholder="Enter detailed content description..."
                  value={sectionForm.text}
                  onChange={(e) => setSectionForm({ ...sectionForm, text: e.target.value })}
                  className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium text-slate-800 outline-none focus:border-blue-600 resize-none leading-relaxed"
                />
              </div>

              <button 
                type="submit" 
                className="bg-[#0D47A1] hover:bg-blue-900 text-white py-3 rounded-xl text-xs font-black transition-all cursor-pointer mt-2"
              >
                {editingSectionIndex !== null ? 'Update Section' : 'Add Section'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default CMS;
