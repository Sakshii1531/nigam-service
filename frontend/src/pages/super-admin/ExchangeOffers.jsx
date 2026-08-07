import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/super-admin/Sidebar';
import Topbar from '../../components/super-admin/Topbar';
import { 
  RefreshCw, Check, AlertCircle, Plus, Edit, Trash2, 
  Eye, Settings, HelpCircle, Save, X, ToggleLeft, ArrowUp, ArrowDown, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  initializeExchangeConfigs, initializeQuestionSets, initializeCampaigns, defaultCategories 
} from '../../data/exchangeMockData';
import { apiRequest } from '../../lib/apiClient';

const ExchangeOffers = () => {
  const [activeTab, setActiveTab] = useState('products');
  const [configs, setConfigs] = useState({});
  const [questionSets, setQuestionSets] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [successMessage, setSuccessMessage] = useState('');

  // Editing state for Product Configuration
  const [editingProduct, setEditingProduct] = useState(null); // Product object
  const [configForm, setConfigForm] = useState({
    exchangeEnabled: false,
    supportedCategories: [],
    questionSetId: '',
    badgeText: '',
    campaignId: '',
    maxVal: 0
  });

  // Editing state for Question Sets
  const [editingQuestionSet, setEditingQuestionSet] = useState(null);
  const [showQuestionSetModal, setShowQuestionSetModal] = useState(false);
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newQuestionType, setNewQuestionType] = useState('Yes/No');
  const [newQuestionOptions, setNewQuestionOptions] = useState('');

  // Editing state for Campaigns
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [campaignForm, setCampaignForm] = useState({
    name: '',
    badgeText: '',
    highlightColor: '#10B981',
    status: 'Active',
    bonusAmount: 1000
  });

  const [exchangeRequests, setExchangeRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(true);

  // Load all configurations + real exchange requests
  useEffect(() => {
    Promise.all([initializeExchangeConfigs(), initializeQuestionSets(), initializeCampaigns()])
      .then(([c, q, camps]) => { setConfigs(c); setQuestionSets(q); setCampaigns(camps); })
      .catch(err => showToast(err.message || 'Could not load exchange configuration.'));

    apiRequest('/products?limit=200')
      .then((res) => setProductsList((res.data || []).map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        price: p.price,
        status: p.isActive === false ? 'Inactive' : 'Active',
      }))))
      .catch((err) => showToast(err.message || 'Could not load the product catalogue.'));

    // Fetch real exchange requests from backend
    const fetchRequests = async () => {
      try {
        const data = await apiRequest('/super-admin/exchange-requests', { auth: true });
        const list = Array.isArray(data?.data) ? data.data : [];
        setExchangeRequests(list.map(r => ({
          id: r._id || r.id,
          customer: r.user?.name || 'Customer',
          phone: r.user?.phone || 'N/A',
          category: r.category || 'Appliance',
          brand: r.brand || 'N/A',
          model: r.modelName || 'N/A',
          condition: r.condition || 'N/A',
          estimatedValue: r.estimatedValue || 0,
          status: r.status || 'Pending',
          date: r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'
        })));
      } catch (err) {
        console.warn('Exchange requests API error:', err.message);
      } finally {
        setRequestsLoading(false);
      }
    };
    fetchRequests();
  }, []);

  const showToast = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  // The storefront's real catalogue — this was a hardcoded array, so the
  // exchange configs an admin saved here keyed on product ids ('wp1', 'tv2')
  // that no Product document has ever had.
  const [productsList, setProductsList] = useState([]);

  // ── SAVE PRODUCT EXCHANGE CONFIGURATION ──
  const handleOpenConfigure = (product) => {
    setEditingProduct(product);
    const currentConfig = configs[product.id] || {
      productId: product.id,
      exchangeEnabled: false,
      supportedCategories: ['Mobile'],
      questionSetId: 'q_mobile',
      badgeText: 'Exchange Offer Active',
      campaignId: 'c1',
      maxVal: 8000
    };
    setConfigForm({ ...currentConfig });
  };

  const handleSaveConfig = async () => {
    try {
      await apiRequest('/exchange/product-configs', {
        method: 'PUT',
        auth: true,
        body: {
          product: editingProduct.id,
          exchangeEnabled: configForm.exchangeEnabled,
          supportedCategories: configForm.supportedCategories || [],
          questionSet: configForm.questionSetId || null,
          badgeText: configForm.badgeText || '',
          campaign: configForm.campaignId || null,
          maxValue: Number(configForm.maxVal) || 0,
        },
      });
      setConfigs(await initializeExchangeConfigs());
      setEditingProduct(null);
      showToast(`Exchange settings updated for ${editingProduct.name}`);
    } catch (err) {
      showToast(err.message || 'Could not save exchange settings.');
    }
  };

  const handleToggleCategory = (cat) => {
    const current = configForm.supportedCategories || [];
    if (current.includes(cat)) {
      setConfigForm({
        ...configForm,
        supportedCategories: current.filter(c => c !== cat)
      });
    } else {
      setConfigForm({
        ...configForm,
        supportedCategories: [...current, cat]
      });
    }
  };

  // ── QUESTION SET ACTIONS ──
  const handleSaveQuestionSet = async (e) => {
    e.preventDefault();
    if (!editingQuestionSet.name) return;

    const body = {
      name: editingQuestionSet.name,
      category: editingQuestionSet.category,
      questions: editingQuestionSet.questions || [],
    };
    try {
      if (editingQuestionSet.id) {
        await apiRequest(`/exchange/question-sets/${editingQuestionSet.id}`, { method: 'PUT', auth: true, body });
        showToast(`Question set "${editingQuestionSet.name}" updated`);
      } else {
        await apiRequest('/exchange/question-sets', { method: 'POST', auth: true, body });
        showToast(`Question set "${editingQuestionSet.name}" created`);
      }
      setQuestionSets(await initializeQuestionSets());
      setShowQuestionSetModal(false);
    } catch (err) {
      showToast(err.message || 'Could not save question set.');
    }
  };

  const handleDeleteQuestionSet = async (setId) => {
    if (!window.confirm('Are you sure you want to delete this question set?')) return;
    try {
      await apiRequest(`/exchange/question-sets/${setId}`, { method: 'DELETE', auth: true });
      setQuestionSets(await initializeQuestionSets());
      showToast('Question set deleted');
    } catch (err) {
      showToast(err.message || 'Could not delete question set.');
    }
  };

  // Reordering questions within a set (Drag/Drop mock using arrow actions)
  const handleMoveQuestion = (index, direction) => {
    const updatedQuestions = [...editingQuestionSet.questions];
    const temp = updatedQuestions[index];
    if (direction === 'up' && index > 0) {
      updatedQuestions[index] = updatedQuestions[index - 1];
      updatedQuestions[index - 1] = temp;
    } else if (direction === 'down' && index < updatedQuestions.length - 1) {
      updatedQuestions[index] = updatedQuestions[index + 1];
      updatedQuestions[index + 1] = temp;
    }
    setEditingQuestionSet({
      ...editingQuestionSet,
      questions: updatedQuestions
    });
    showToast('Question order updated!');
  };

  // Add question to set
  const handleAddQuestion = () => {
    if (!newQuestionText) return;
    const optionsArray = newQuestionOptions 
      ? newQuestionOptions.split(',').map(o => o.trim()) 
      : (newQuestionType === 'Yes/No' || newQuestionType === 'Toggle' ? ['Yes', 'No'] : []);

    const newQuestion = {
      id: `ques_${Date.now()}`,
      text: newQuestionText,
      type: newQuestionType,
      options: optionsArray,
      // Every option starts at zero deduction. These used to be auto-filled with
      // 10% × option-index "for testing", so a set saved without review priced
      // real trade-ins off numbers nobody chose.
      deductions: Object.fromEntries(optionsArray.map((opt) => [opt, 0])),
    };

    setEditingQuestionSet({
      ...editingQuestionSet,
      questions: [...(editingQuestionSet.questions || []), newQuestion]
    });

    setNewQuestionText('');
    setNewQuestionOptions('');
    showToast('Question added to set');
  };

  const handleDeleteQuestion = (qId) => {
    setEditingQuestionSet({
      ...editingQuestionSet,
      questions: editingQuestionSet.questions.filter(q => q.id !== qId)
    });
    showToast('Question removed');
  };

  // ── CAMPAIGN ACTIONS ──
  const handleSaveCampaign = async (e) => {
    e.preventDefault();
    if (!campaignForm.name || !campaignForm.badgeText) return;

    const body = {
      name: campaignForm.name,
      badgeText: campaignForm.badgeText,
      highlightColor: campaignForm.highlightColor,
      status: campaignForm.status,
      bonusAmount: Number(campaignForm.bonusAmount) || 0,
    };
    try {
      if (editingCampaign) {
        await apiRequest(`/exchange/campaigns/${editingCampaign.id}`, { method: 'PUT', auth: true, body });
        showToast(`Campaign "${body.name}" updated`);
      } else {
        await apiRequest('/exchange/campaigns', { method: 'POST', auth: true, body });
        showToast(`Campaign "${body.name}" launched`);
      }
      setCampaigns(await initializeCampaigns());
      setShowCampaignModal(false);
    } catch (err) {
      showToast(err.message || 'Could not save campaign.');
    }
  };

  const handleDeleteCampaign = async (campaignId) => {
    if (!window.confirm('Are you sure you want to delete this campaign?')) return;
    try {
      await apiRequest(`/exchange/campaigns/${campaignId}`, { method: 'DELETE', auth: true });
      setCampaigns(await initializeCampaigns());
      showToast('Campaign deleted');
    } catch (err) {
      showToast(err.message || 'Could not delete campaign.');
    }
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      <Sidebar />
      <div className="flex-1 flex flex-col pl-64 overflow-hidden">
        <Topbar title="Exchange Offers Control Panel" />

        {/* MAIN BODY SCROLLABLE */}
        <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-6 text-left">
          
          {/* Toast Notification */}
          <AnimatePresence>
            {successMessage && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="fixed top-20 right-8 z-50 bg-[#10B981] text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 font-bold text-xs"
              >
                <Check className="w-4 h-4 stroke-[3px]" />
                {successMessage}
              </motion.div>
            )}
          </AnimatePresence>

          {/* PAGE HEADER */}
          <div className="flex justify-between items-center bg-white border border-slate-200/80 p-6 rounded-2xl shadow-sm">
            <div>
              <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <RefreshCw className="w-5.5 h-5.5 text-brand-blue" />
                Flipkart Exchange Offers Settings
              </h2>
              <p className="text-xs text-slate-400 mt-1 font-semibold">Manage exchange availability, questions, and active marketing campaigns</p>
            </div>
            
            <div className="flex gap-2">
              {activeTab === 'questions' && (
                <button
                  onClick={() => {
                    setEditingQuestionSet({ name: '', category: 'Mobile', questions: [] });
                    setShowQuestionSetModal(true);
                  }}
                  className="bg-brand-blue hover:bg-blue-800 text-white text-xs font-black px-4 py-2.5 rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Add Question Set
                </button>
              )}
              {activeTab === 'campaigns' && (
                <button
                  onClick={() => {
                    setEditingCampaign(null);
                    setCampaignForm({ name: '', badgeText: '', highlightColor: '#10B981', status: 'Active', bonusAmount: 1000 });
                    setShowCampaignModal(true);
                  }}
                  className="bg-brand-blue hover:bg-blue-800 text-white text-xs font-black px-4 py-2.5 rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Create Campaign
                </button>
              )}
            </div>
          </div>

          {/* TABS SELECTOR */}
          {!editingProduct && (
            <div className="flex border-b border-slate-200 gap-6">
              {[
                { id: 'products', label: 'Exchange Products' },
                { id: 'questions', label: 'Question Sets' },
                { id: 'campaigns', label: 'Exchange Campaigns' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`pb-3 text-xs font-black transition-colors relative cursor-pointer ${
                    activeTab === tab.id ? 'text-brand-blue font-black' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {tab.label}
                  {activeTab === tab.id && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-blue rounded-full" />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* TAB CONTENT: EXCHANGE PRODUCTS */}
          {activeTab === 'products' && !editingProduct && (
            <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    <th className="px-6 py-4">Product</th>
                    <th className="px-6 py-4">Exchange Status</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4">Configure Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-600">
                  {productsList.map(prod => {
                    const hasConfig = configs[prod.id];
                    const isEnabled = hasConfig?.exchangeEnabled;
                    return (
                      <tr key={prod.id} className="hover:bg-slate-50/50">
                        <td className="px-6 py-4 font-black text-slate-800">{prod.name}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase ${
                            isEnabled 
                              ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' 
                              : 'bg-slate-100 text-slate-400 border border-slate-200'
                          }`}>
                            {isEnabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </td>
                        <td className="px-6 py-4">{prod.category}</td>
                        <td className="px-6 py-4 text-slate-400">
                          {hasConfig ? `Configured (Max ₹${hasConfig.maxVal.toLocaleString()})` : 'Not Configured'}
                        </td>
                        <td className="px-6 py-4 text-right flex justify-end gap-2">
                          <button
                            onClick={() => handleOpenConfigure(prod)}
                            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-brand-blue transition-colors flex items-center gap-1 font-bold cursor-pointer"
                          >
                            <Settings className="w-4 h-4" /> Configure
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* SUB-VIEW: CONFIGURE EXCHANGE FOR A PRODUCT */}
          {editingProduct && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Configure Fields Panel */}
              <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col gap-5">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-black text-brand-navy">Configure Device Exchange</h3>
                    <span className="text-xs text-slate-400 font-semibold">{editingProduct.name}</span>
                  </div>
                  <button 
                    onClick={() => setEditingProduct(null)}
                    className="p-1.5 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>

                {/* Enable/Disable toggle */}
                <div className="flex items-center justify-between bg-slate-50 border border-slate-200/60 rounded-xl p-4.5">
                  <div className="text-left">
                    <span className="text-xs font-black text-brand-navy block">Enable Exchange Offer</span>
                    <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">Toggle to activate exchange feature for this product</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setConfigForm({ ...configForm, exchangeEnabled: !configForm.exchangeEnabled })}
                    className={`w-12 h-6.5 rounded-full p-1 transition-colors duration-200 ease-in-out cursor-pointer ${
                      configForm.exchangeEnabled ? 'bg-[#10B981]' : 'bg-slate-300'
                    }`}
                  >
                    <div className={`bg-white w-4.5 h-4.5 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                      configForm.exchangeEnabled ? 'translate-x-5.5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>

                {/* Fixed Category */}
                <div className="flex flex-col gap-2 text-left">
                  <label className="text-xs font-black text-brand-navy">Exchange Category (Determined Automatically)</label>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-black text-slate-500 w-fit">
                    {editingProduct.category}
                  </div>
                </div>

                {/* Question Set Select */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-black text-brand-navy">Question Set</label>
                  <select
                    value={configForm.questionSetId}
                    onChange={(e) => setConfigForm({ ...configForm, questionSetId: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-brand-blue appearance-none cursor-pointer"
                  >
                    {questionSets.map(set => (
                      <option key={set.id} value={set.id}>{set.name} ({set.category})</option>
                    ))}
                  </select>
                </div>

                {/* Badge Text */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-black text-brand-navy">Badge Display Text</label>
                  <input
                    type="text"
                    value={configForm.badgeText}
                    onChange={(e) => setConfigForm({ ...configForm, badgeText: e.target.value })}
                    placeholder="Exchange Offer Active"
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-brand-blue"
                  />
                </div>

                {/* Campaign Select */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-black text-brand-navy">Link Campaign</label>
                  <select
                    value={configForm.campaignId}
                    onChange={(e) => setConfigForm({ ...configForm, campaignId: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-brand-blue appearance-none cursor-pointer"
                  >
                    <option value="">No Active Campaign</option>
                    {campaigns.filter(c => c.status === 'Active').map(c => (
                      <option key={c.id} value={c.id}>{c.name} (Bonus ₹{c.bonusAmount})</option>
                    ))}
                  </select>
                </div>

                {/* Max Exchange Value */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-black text-brand-navy">Maximum Exchange Value (₹)</label>
                  <input
                    type="number"
                    value={configForm.maxVal}
                    onChange={(e) => setConfigForm({ ...configForm, maxVal: Number(e.target.value) })}
                    placeholder="12000"
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-brand-blue"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 border-t border-slate-100 pt-5">
                  <button
                    onClick={handleSaveConfig}
                    className="flex-1 bg-brand-blue hover:bg-blue-800 text-white font-black py-3 rounded-xl transition-all shadow-md text-xs cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Save className="w-4 h-4" /> Save Configuration
                  </button>
                  <button
                    onClick={() => setEditingProduct(null)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-500 font-extrabold py-3 rounded-xl transition-all text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>

              </div>

              {/* Live Preview Panel */}
              <div className="lg:col-span-5 flex flex-col gap-4">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">Live Customer App Preview</h4>
                
                <div className="bg-slate-100 border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col gap-5 border-dashed">
                  
                  {/* Mock Product Title/Price Header */}
                  <div className="flex flex-col gap-1 text-left">
                    <span className="text-[10px] text-brand-blue font-extrabold uppercase tracking-wider block">Television Category</span>
                    <h2 className="text-sm font-black text-brand-navy">{editingProduct.name}</h2>
                    <span className="text-base font-black text-green-600 block">₹{editingProduct.price.toLocaleString()}</span>
                  </div>

                  {/* PREVIEW OF THE EXCHANGE CARD */}
                  {configForm.exchangeEnabled ? (
                    <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col gap-3 shadow-sm text-left">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-brand-blue">
                            <RefreshCw className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-xs font-black text-brand-navy">Exchange Your Old Device</h4>
                            <span className="text-[9px] text-slate-400">Save big on your upgrade</span>
                          </div>
                        </div>
                        <span className="text-[10px] font-black text-brand-blue bg-blue-50 px-2 py-0.5 rounded-lg">
                          Get up to ₹{configForm.maxVal?.toLocaleString()} off
                        </span>
                      </div>

                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          className="w-full bg-white border border-brand-blue text-brand-blue font-black py-2 rounded-xl text-[10px] text-center"
                        >
                          Check Exchange Value
                        </button>
                        <p className="text-[8px] text-slate-400 font-semibold leading-normal">
                          * Final exchange value depends on the device model and physical condition during pickup.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white border border-slate-200/40 rounded-2xl p-6 text-center text-xs text-slate-400 py-10 font-bold border-dashed">
                      Exchange option is disabled for this product
                    </div>
                  )}

                  {/* Mock buttons below exchange */}
                  <div className="flex flex-col gap-2">
                    <div className="w-full bg-slate-300 h-10 rounded-xl"></div>
                    <div className="w-full bg-slate-200 h-10 rounded-xl"></div>
                  </div>

                </div>
              </div>

            </div>
          )}

          {/* TAB CONTENT: QUESTION SETS */}
          {activeTab === 'questions' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {questionSets.map(set => (
                <div key={set.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm text-left flex flex-col justify-between gap-5">
                  <div className="flex flex-col gap-3.5">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-sm font-black text-brand-navy">{set.name}</h4>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mt-0.5">{set.category} Category</span>
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => {
                            setEditingQuestionSet({ ...set });
                            setShowQuestionSetModal(true);
                          }}
                          className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-brand-blue cursor-pointer"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteQuestionSet(set.id)}
                          className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-red-500 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2.5 mt-2 bg-slate-50/50 border border-slate-200/60 rounded-xl p-3.5">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Configured Questions ({set.questions?.length || 0})</span>
                      <div className="flex flex-col gap-2 divide-y divide-slate-100 max-h-48 overflow-y-auto pr-1">
                        {set.questions?.map((q, idx) => (
                          <div key={q.id} className="pt-2 flex items-start gap-2 text-xs">
                            <span className="font-extrabold text-slate-400">{idx + 1}.</span>
                            <div>
                              <span className="font-semibold text-slate-700 block">{q.text}</span>
                              <span className="text-[9px] font-bold text-slate-400">{q.type} {q.options ? `(${q.options.join(', ')})` : ''}</span>
                            </div>
                          </div>
                        ))}
                        {(!set.questions || set.questions.length === 0) && (
                          <span className="text-xs text-slate-400 py-2 font-semibold">No questions configured.</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB CONTENT: EXCHANGE CAMPAIGNS */}
          {activeTab === 'campaigns' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {campaigns.map(camp => (
                <div key={camp.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm text-left flex flex-col justify-between gap-5">
                  <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-sm font-black text-brand-navy">{camp.name}</h4>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase mt-1 block w-fit ${
                          camp.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'
                        }`}>
                          {camp.status}
                        </span>
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => {
                            setEditingCampaign(camp);
                            setCampaignForm({ ...camp });
                            setShowCampaignModal(true);
                          }}
                          className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-brand-blue cursor-pointer"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCampaign(camp.id)}
                          className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-red-500 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 border-t border-slate-100 pt-3 text-xs font-semibold text-slate-500">
                      <div className="flex justify-between">
                        <span>Extra Bonus Amount:</span>
                        <span className="font-black text-slate-800">₹{camp.bonusAmount?.toLocaleString() || 0}</span>
                      </div>
                    </div>
                  </div>

                  {/* PREVIEW OF CAMPAIGN BADGE */}
                  <div className="border-t border-slate-100 pt-3.5 flex flex-col gap-2">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Customer Badge Preview</span>
                    <div 
                      style={{ backgroundColor: `${camp.highlightColor}12`, borderColor: camp.highlightColor, color: camp.highlightColor }}
                      className="border rounded-xl px-3 py-2 text-[10px] font-black flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      {camp.badgeText}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>

      {/* ── DIALOG MODAL: CREATE / EDIT QUESTION SET ── */}
      {showQuestionSetModal && editingQuestionSet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="absolute inset-0 -z-10" onClick={() => setShowQuestionSetModal(false)} />
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl border border-slate-100"
          >
            <div className="px-6 py-4.5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-sm font-black text-brand-navy uppercase tracking-wider flex items-center gap-1.5">
                <HelpCircle className="w-4.5 h-4.5 text-brand-blue" />
                {editingQuestionSet.id ? 'Edit Question Set' : 'Create Question Set'}
              </h3>
              <button onClick={() => setShowQuestionSetModal(false)} className="p-1 hover:bg-slate-200 rounded-full transition-colors cursor-pointer">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleSaveQuestionSet} className="flex-1 overflow-y-auto p-6 flex flex-col gap-5 text-left">
              {/* Name */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-black text-brand-navy">Question Set Name</label>
                <input
                  type="text"
                  required
                  value={editingQuestionSet.name}
                  onChange={(e) => setEditingQuestionSet({ ...editingQuestionSet, name: e.target.value })}
                  placeholder="Mobile Questions"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-brand-blue"
                />
              </div>

              {/* Category */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-black text-brand-navy">Device Category</label>
                <select
                  value={editingQuestionSet.category}
                  onChange={(e) => setEditingQuestionSet({ ...editingQuestionSet, category: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-brand-blue appearance-none cursor-pointer"
                >
                  {defaultCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* QUESTIONS LIST WITH REORDER/DELETE ACTIONS */}
              <div className="border-t border-slate-100 pt-4 flex flex-col gap-3">
                <span className="text-xs font-black text-brand-navy block">Configure Questions Checklist</span>
                
                <div className="flex flex-col gap-2.5 max-h-60 overflow-y-auto pr-1">
                  {editingQuestionSet.questions?.map((q, index) => (
                    <div key={q.id} className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex justify-between items-center gap-4 text-xs font-semibold">
                      <div className="flex items-start gap-2.5 text-left">
                        <span className="bg-slate-200/60 text-slate-600 w-5 h-5 rounded-full text-[9px] flex items-center justify-center flex-shrink-0 mt-0.5">{index + 1}</span>
                        <div>
                          <span className="font-semibold text-slate-800 block">{q.text}</span>
                          <span className="text-[9px] font-bold text-slate-400 block mt-0.5">{q.type} {q.options?.length > 0 ? `(${q.options.join(', ')})` : ''}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => handleMoveQuestion(index, 'up')}
                          className="p-1 hover:bg-slate-200 rounded text-slate-500 disabled:opacity-30 cursor-pointer"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={index === editingQuestionSet.questions.length - 1}
                          onClick={() => handleMoveQuestion(index, 'down')}
                          className="p-1 hover:bg-slate-200 rounded text-slate-500 disabled:opacity-30 cursor-pointer"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteQuestion(q.id)}
                          className="p-1 hover:bg-slate-200 rounded text-red-500 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {(!editingQuestionSet.questions || editingQuestionSet.questions.length === 0) && (
                    <span className="text-xs text-slate-400 text-center py-4 font-semibold italic">No questions added yet. Use form below to add questions.</span>
                  )}
                </div>
              </div>

              {/* ADD QUESTION BOX */}
              <div className="bg-blue-50/20 border border-brand-blue/15 rounded-2xl p-4.5 flex flex-col gap-3.5">
                <span className="text-xs font-black text-brand-navy block">Add New Question Option</span>
                
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Question Description Text</label>
                  <input
                    type="text"
                    value={newQuestionText}
                    onChange={(e) => setNewQuestionText(e.target.value)}
                    placeholder="Is original box and warranty card available?"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-brand-blue"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Question UI Input Type</label>
                    <select
                      value={newQuestionType}
                      onChange={(e) => setNewQuestionType(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-brand-blue appearance-none cursor-pointer"
                    >
                      {['Yes/No', 'Radio', 'Dropdown', 'Toggle', 'Multiple Choice'].map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Options (Comma Separated)</label>
                    <input
                      type="text"
                      disabled={newQuestionType === 'Yes/No' || newQuestionType === 'Toggle'}
                      value={newQuestionOptions}
                      onChange={(e) => setNewQuestionOptions(e.target.value)}
                      placeholder="Good, Scratched, Cracked"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-brand-blue disabled:bg-slate-100 disabled:text-slate-400"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddQuestion}
                  className="bg-brand-blue hover:bg-blue-800 text-white font-black py-2 rounded-xl text-xs transition-all cursor-pointer shadow-xs self-start px-5"
                >
                  Add Question to Set
                </button>
              </div>

              {/* Submit / Cancel Buttons */}
              <div className="flex gap-3.5 border-t border-slate-100 pt-5">
                <button
                  type="submit"
                  className="flex-1 bg-[#10B981] hover:bg-emerald-600 text-white font-black py-3 rounded-xl transition-all shadow-md text-xs cursor-pointer"
                >
                  Save Question Set
                </button>
                <button
                  type="button"
                  onClick={() => setShowQuestionSetModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-500 font-extrabold py-3 rounded-xl transition-all text-xs cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* ── DIALOG MODAL: CREATE / EDIT CAMPAIGN ── */}
      {showCampaignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="absolute inset-0 -z-10" onClick={() => setShowCampaignModal(false)} />
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-100"
          >
            <div className="px-6 py-4.5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-sm font-black text-brand-navy uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4.5 h-4.5 text-brand-blue" />
                {editingCampaign ? 'Edit Campaign' : 'Create Campaign'}
              </h3>
              <button onClick={() => setShowCampaignModal(false)} className="p-1 hover:bg-slate-200 rounded-full transition-colors cursor-pointer">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleSaveCampaign} className="p-6 flex flex-col gap-4 text-left">
              {/* Campaign Name */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-black text-brand-navy">Campaign Name</label>
                <input
                  type="text"
                  required
                  value={campaignForm.name}
                  onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })}
                  placeholder="Independence Day Offer"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-brand-blue"
                />
              </div>

              {/* Badge Text */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-black text-brand-navy">Badge Offer Label</label>
                <input
                  type="text"
                  required
                  value={campaignForm.badgeText}
                  onChange={(e) => setCampaignForm({ ...campaignForm, badgeText: e.target.value })}
                  placeholder="Extra ₹1,500 Off with Exchange"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-brand-blue"
                />
              </div>

              {/* Bonus Amount */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-black text-brand-navy">Promo Bonus Value (₹)</label>
                <input
                  type="number"
                  required
                  value={campaignForm.bonusAmount}
                  onChange={(e) => setCampaignForm({ ...campaignForm, bonusAmount: Number(e.target.value) })}
                  placeholder="1500"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-brand-blue"
                />
              </div>

              {/* Highlight Color */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-black text-brand-navy">Highlight Badge Color</label>
                <div className="flex gap-2">
                  {[
                    { hex: '#10B981', label: 'Emerald' },
                    { hex: '#F59E0B', label: 'Amber' },
                    { hex: '#3B82F6', label: 'Blue' },
                    { hex: '#EF4444', label: 'Red' }
                  ].map(color => (
                    <button
                      key={color.hex}
                      type="button"
                      onClick={() => setCampaignForm({ ...campaignForm, highlightColor: color.hex })}
                      style={{ backgroundColor: color.hex }}
                      className={`flex-1 py-2 text-[10px] font-black text-white rounded-lg border-2 transition-all cursor-pointer ${
                        campaignForm.highlightColor === color.hex ? 'border-slate-800 scale-102 shadow-sm' : 'border-transparent opacity-85'
                      }`}
                    >
                      {color.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-black text-brand-navy">Campaign Status</label>
                <div className="flex gap-2">
                  {['Active', 'Inactive'].map(status => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setCampaignForm({ ...campaignForm, status })}
                      className={`flex-1 py-2 text-xs font-extrabold transition-all border cursor-pointer rounded-xl ${
                        campaignForm.status === status 
                          ? 'bg-brand-blue border-brand-blue text-white shadow-sm font-black' 
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 border-t border-slate-100 pt-5 mt-2">
                <button
                  type="submit"
                  className="flex-1 bg-[#10B981] hover:bg-emerald-600 text-white font-black py-3 rounded-xl transition-all shadow-md text-xs cursor-pointer"
                >
                  Save Campaign
                </button>
                <button
                  type="button"
                  onClick={() => setShowCampaignModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-500 font-extrabold py-3 rounded-xl transition-all text-xs cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

    </div>
  );
};

export default ExchangeOffers;
