import React, { useState } from 'react';
import Sidebar from '../../components/super-admin/Sidebar';
import Topbar from '../../components/super-admin/Topbar';
import { FileText, Save, Edit, Eye } from 'lucide-react';

const CMS = () => {
  const [activeTab, setActiveTab] = useState('policy');
  const [content, setContent] = useState({
    policy: 'Privacy Policy\n\nNigam Care values your privacy. We collect personal information to provide maintenance, repair, and customer support services. We do not sell or trade your personal information with third parties...',
    terms: 'Terms of Service\n\nWelcome to Nigam Care. By using our platform, mobile apps, or booking services, you agree to comply with our policies. Service bookings are subject to availability and labor rates...',
    faqs: 'Frequently Asked Questions\n\nQ: How do I track my service technician?\nA: You can view real-time location details under Live Tracking in the customer dashboard.\n\nQ: How is warranty claimed?\nA: Register your appliance purchase under Warranty page with dealer invoice to claim...',
  });

  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      alert('Content saved and deployed to client apps successfully!');
    }, 800);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex text-slate-800">
      <Sidebar />
      <div className="flex-1 ml-64 min-h-screen flex flex-col">
        <Topbar title="CMS & Page Content Manager" subtitle="Manage static content, privacy policy, and terms of service" />
        <div className="p-6 space-y-6 flex-1">
          
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden flex flex-col h-[500px]">
            {/* Header Tabs */}
            <div className="flex bg-slate-50 border-b border-slate-100 p-2 gap-2">
              <button 
                onClick={() => setActiveTab('policy')}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                  activeTab === 'policy' ? 'bg-[#0D47A1] text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Privacy Policy
              </button>
              <button 
                onClick={() => setActiveTab('terms')}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                  activeTab === 'terms' ? 'bg-[#0D47A1] text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Terms & Conditions
              </button>
              <button 
                onClick={() => setActiveTab('faqs')}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                  activeTab === 'faqs' ? 'bg-[#0D47A1] text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                FAQs Page
              </button>
            </div>

            {/* Content Textarea */}
            <div className="flex-1 p-5 relative">
              <textarea 
                value={content[activeTab]} 
                onChange={(e) => setContent({ ...content, [activeTab]: e.target.value })}
                className="w-full h-full p-4 border border-[#E2E8F0] rounded-xl outline-none focus:ring-2 focus:ring-[#0D47A1] text-sm font-mono text-slate-700 bg-[#F8FAFC] resize-none"
              />
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-slate-100 bg-white flex justify-end gap-2">
              <button className="flex items-center gap-1 bg-white border border-[#E2E8F0] px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer">
                <Eye size={14} /> Preview Live
              </button>
              <button onClick={handleSave} className="flex items-center gap-1 bg-[#0D47A1] text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors cursor-pointer shadow-sm">
                <Save size={14} /> {saving ? 'Saving...' : 'Save & Publish'}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default CMS;
