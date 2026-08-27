import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/super-admin/Sidebar';
import Topbar from '../../components/super-admin/Topbar';
import { apiRequest } from '../../lib/apiClient';
import { useAppLogo, resolveLogoUrl } from '../../context/LogoContext';
import defaultLogo from '../../assets/nigam-care.png';
import {
  Bell,
  Lock,
  Globe,
  CreditCard,
  Percent,
  Save,
  CheckCircle2,
  Upload,
  Image as ImageIcon,
  RotateCcw,
  Loader2
} from 'lucide-react';

// Which settings fields each tab owns. Save sends only the active tab's fields
// so switching tabs without saving never writes stale values from another tab.
const TAB_FIELDS = {
  App: ['platformName', 'logoUrl', 'supportEmail', 'maintenanceMode'],
  Notifications: ['emailNotifications', 'smsNotifications', 'pushNotifications'],
  Security: ['twoFactorEnabled'],
  Payment: ['razorpayKeyId'],
  Tax: ['defaultGstPercent'],
};

const Settings = () => {
  const [activeTab, setActiveTab] = useState('App');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // App Logo state
  const { logoUrl: globalResolvedLogo, updateLogo } = useAppLogo();
  const [logoInputUrl, setLogoInputUrl] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Form input states
  const [platformName, setPlatformName] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [razorpayKey, setRazorpayKey] = useState('');
  const [defaultGst, setDefaultGst] = useState('18');
  const [twoFactor, setTwoFactor] = useState(false);

  // Notifications toggles
  const [emailNotif, setEmailNotif] = useState(true);
  const [smsAlert, setSmsAlert] = useState(true);
  const [pushNotif, setPushNotif] = useState(true);

  const showToast = (message) => {
    setSuccessMessage(message);
    setTimeout(() => {
      setSuccessMessage('');
    }, 3000);
  };

  useEffect(() => {
    let cancelled = false;
    async function loadSettings() {
      try {
        const s = await apiRequest('/super-admin/settings', { auth: true });
        if (cancelled || !s) return;
        setPlatformName(s.platformName || '');
        setLogoInputUrl(s.logoUrl || '');
        setSupportEmail(s.supportEmail || '');
        setMaintenanceMode(!!s.maintenanceMode);
        setRazorpayKey(s.razorpayKeyId || '');
        setDefaultGst(String(s.defaultGstPercent ?? 18));
        setTwoFactor(!!s.twoFactorEnabled);
        setEmailNotif(s.emailNotifications !== false);
        setSmsAlert(s.smsNotifications !== false);
        setPushNotif(s.pushNotifications !== false);
      } catch (err) {
        if (!cancelled) showToast(`Could not load settings: ${err.message}`);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadSettings();
    return () => { cancelled = true; };
  }, []);

  const tabs = [
    { name: 'App', icon: <Globe size={16} /> },
    { name: 'Notifications', icon: <Bell size={16} /> },
    { name: 'Security', icon: <Lock size={16} /> },
    { name: 'Payment', icon: <CreditCard size={16} /> },
    { name: 'Tax', icon: <Percent size={16} /> },
  ];

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiRequest('/uploads', {
        method: 'POST',
        auth: true,
        body: formData,
      });

      if (res && res.url) {
        setLogoInputUrl(res.url);
        updateLogo(res.url);
        await apiRequest('/super-admin/settings', {
          method: 'PUT',
          auth: true,
          body: { logoUrl: res.url },
        });
        await apiRequest('/cms/app-settings/customer', {
          method: 'PUT',
          auth: true,
          body: { key: 'appLogo', value: res.url },
        }).catch(() => {});
        showToast('Logo uploaded and updated live across the app!');
      }
    } catch (err) {
      showToast(`Logo upload failed: ${err.message}`);
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleResetLogo = async () => {
    setLogoInputUrl('');
    updateLogo('');
    try {
      await apiRequest('/super-admin/settings', {
        method: 'PUT',
        auth: true,
        body: { logoUrl: '' },
      });
      await apiRequest('/cms/app-settings/customer', {
        method: 'PUT',
        auth: true,
        body: { key: 'appLogo', value: '' },
      }).catch(() => {});
      showToast('Logo reset to default.');
    } catch (err) {
      showToast(`Reset failed: ${err.message}`);
    }
  };

  const handleSave = async () => {
    const all = {
      platformName,
      logoUrl: logoInputUrl,
      supportEmail,
      maintenanceMode,
      emailNotifications: emailNotif,
      smsNotifications: smsAlert,
      pushNotifications: pushNotif,
      twoFactorEnabled: twoFactor,
      razorpayKeyId: razorpayKey,
      defaultGstPercent: Number(defaultGst),
    };

    const body = {};
    for (const field of TAB_FIELDS[activeTab] || []) body[field] = all[field];

    if (activeTab === 'Tax' && !Number.isFinite(body.defaultGstPercent)) {
      showToast('Enter a valid GST percentage.');
      return;
    }

    setSaving(true);
    try {
      await apiRequest('/super-admin/settings', { method: 'PUT', auth: true, body });
      if (activeTab === 'App' && body.logoUrl !== undefined) {
        updateLogo(body.logoUrl);
        await apiRequest('/cms/app-settings/customer', {
          method: 'PUT',
          auth: true,
          body: { key: 'appLogo', value: body.logoUrl },
        }).catch(() => {});
      }
      showToast(`${activeTab} settings saved successfully!`);
    } catch (err) {
      showToast(`Could not save ${activeTab} settings: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex relative">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 ml-64 min-h-screen flex flex-col">
        {/* Topbar */}
        <Topbar title="System Settings" />

        {/* Body */}
        <div className="p-6 space-y-6 flex-1">
          
          <div className="bg-white rounded-2xl border border-[#E2E8F0] flex flex-col h-[calc(100vh-8rem)] shadow-sm">
            
            {/* Sidebar Tabs */}
            <div className="flex border-b border-[#E2E8F0]">
              {tabs.map((tab) => (
                <button
                  key={tab.name}
                  onClick={() => setActiveTab(tab.name)}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors border-b-2 ${
                    activeTab === tab.name 
                      ? 'border-[#0D47A1] text-[#0D47A1]' 
                      : 'border-transparent text-[#64748B] hover:text-[#1E293B]'
                  }`}
                >
                  {tab.icon} {tab.name}
                </button>
              ))}
            </div>

            {/* Content Area */}
            <div className="flex-1 p-6 overflow-y-auto">
              
              {activeTab === 'App' && (
                <div className="space-y-6 max-w-2xl text-left">
                  <h3 className="font-bold text-[#1E293B] text-base">General Application Settings</h3>
                  
                  {/* Dynamic Logo Management Section */}
                  <div className="bg-[#072C63] text-white p-5 rounded-2xl shadow-md border border-white/10 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-extrabold text-sm tracking-wide flex items-center gap-2 text-amber-400">
                          <ImageIcon className="h-4 w-4" /> Application Logo & Branding
                        </h4>
                        <p className="text-xs text-slate-300 mt-0.5">
                          Upload a custom logo to dynamically display across Customer, Technician, and Admin headers.
                        </p>
                      </div>
                      {logoInputUrl && (
                        <button
                          onClick={handleResetLogo}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                        >
                          <RotateCcw className="h-3.5 w-3.5" /> Reset Default
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-5 pt-2">
                      {/* Logo Preview */}
                      <div className="w-28 h-16 bg-[#051F42] border border-white/20 rounded-xl flex items-center justify-center p-2 relative overflow-hidden shadow-inner">
                        <img
                          src={resolveLogoUrl(logoInputUrl)}
                          alt="Logo Preview"
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>

                      {/* File Upload Controls */}
                      <div className="flex-1 space-y-2">
                        <label className="inline-flex items-center gap-2 bg-[#FFD400] hover:bg-[#FFCA00] text-[#072C63] font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer shadow-md transition-transform active:scale-95">
                          {uploadingLogo ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" /> Uploading...
                            </>
                          ) : (
                            <>
                              <Upload className="h-4 w-4" /> Upload New Logo Image
                            </>
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileUpload}
                            disabled={uploadingLogo}
                            className="hidden"
                          />
                        </label>
                        <p className="text-[11px] text-slate-300">
                          Recommended: PNG or SVG image with transparent background.
                        </p>
                      </div>
                    </div>

                    {/* Direct Image URL input */}
                    <div className="pt-2 border-t border-white/10">
                      <label className="text-[11px] font-semibold text-slate-300 mb-1 block">Or specify image URL</label>
                      <input
                        type="text"
                        placeholder="https://example.com/logo.png or /uploads/..."
                        value={logoInputUrl}
                        onChange={(e) => {
                          setLogoInputUrl(e.target.value);
                          updateLogo(e.target.value);
                        }}
                        className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[#64748B] mb-1.5 block">Platform Name</label>
                    <input 
                      type="text" 
                      className="w-full border border-[#E2E8F0] rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#0D47A1] text-slate-800 bg-[#F8FAFC]" 
                      value={platformName}
                      onChange={(e) => setPlatformName(e.target.value)} 
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[#64748B] mb-1.5 block">Support Email</label>
                    <input 
                      type="email" 
                      className="w-full border border-[#E2E8F0] rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#0D47A1] text-slate-800 bg-[#F8FAFC]" 
                      value={supportEmail}
                      onChange={(e) => setSupportEmail(e.target.value)} 
                    />
                  </div>

                  <div className="flex justify-between items-center py-2">
                    <div>
                      <p className="text-sm font-semibold text-[#1E293B]">Maintenance Mode</p>
                      <p className="text-xs text-[#64748B]">Toggle to display maintenance screen to customers.</p>
                    </div>
                    <button 
                      onClick={() => {
                        const nextVal = !maintenanceMode;
                        setMaintenanceMode(nextVal);
                        showToast(`Maintenance mode is now ${nextVal ? 'ENABLED' : 'DISABLED'}`);
                      }}
                      className={`w-12 h-6 rounded-full flex items-center transition-colors px-1 ${
                        maintenanceMode ? 'bg-[#0D47A1]' : 'bg-gray-200'
                      }`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-200 ${
                        maintenanceMode ? 'translate-x-6' : 'translate-x-0'
                      }`}></div>
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'Notifications' && (
                <div className="space-y-4 max-w-2xl text-left">
                  <h3 className="font-bold text-[#1E293B] text-base">Notification Preferences</h3>
                  
                  {/* Email Notifications */}
                  <div className="flex justify-between items-center p-4 border border-[#E2E8F0] rounded-xl">
                    <div>
                      <p className="font-bold text-[#1E293B] text-sm">Email Notifications</p>
                      <p className="text-xs text-[#64748B] mt-0.5">Send automated emails to users on booking.</p>
                    </div>
                    <button 
                      onClick={() => {
                        const nextVal = !emailNotif;
                        setEmailNotif(nextVal);
                        showToast(`Email notifications ${nextVal ? 'enabled' : 'disabled'}`);
                      }}
                      className={`w-12 h-6 rounded-full flex items-center transition-colors px-1 ${
                        emailNotif ? 'bg-[#0D47A1]' : 'bg-gray-200'
                      }`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-200 ${
                        emailNotif ? 'translate-x-6' : 'translate-x-0'
                      }`}></div>
                    </button>
                  </div>

                  {/* SMS Alerts */}
                  <div className="flex justify-between items-center p-4 border border-[#E2E8F0] rounded-xl">
                    <div>
                      <p className="font-bold text-[#1E293B] text-sm">SMS Alerts</p>
                      <p className="text-xs text-[#64748B] mt-0.5">Send SMS to technicians for new jobs.</p>
                    </div>
                    <button 
                      onClick={() => {
                        const nextVal = !smsAlert;
                        setSmsAlert(nextVal);
                        showToast(`SMS alerts ${nextVal ? 'enabled' : 'disabled'}`);
                      }}
                      className={`w-12 h-6 rounded-full flex items-center transition-colors px-1 ${
                        smsAlert ? 'bg-[#0D47A1]' : 'bg-gray-200'
                      }`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-200 ${
                        smsAlert ? 'translate-x-6' : 'translate-x-0'
                      }`}></div>
                    </button>
                  </div>

                  {/* Push Notifications */}
                  <div className="flex justify-between items-center p-4 border border-[#E2E8F0] rounded-xl">
                    <div>
                      <p className="font-bold text-[#1E293B] text-sm">Push Notifications</p>
                      <p className="text-xs text-[#64748B] mt-0.5">Enable push notifications for mobile apps.</p>
                    </div>
                    <button 
                      onClick={() => {
                        const nextVal = !pushNotif;
                        setPushNotif(nextVal);
                        showToast(`Push notifications ${nextVal ? 'enabled' : 'disabled'}`);
                      }}
                      className={`w-12 h-6 rounded-full flex items-center transition-colors px-1 ${
                        pushNotif ? 'bg-[#0D47A1]' : 'bg-gray-200'
                      }`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-200 ${
                        pushNotif ? 'translate-x-6' : 'translate-x-0'
                      }`}></div>
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'Security' && (
                <div className="space-y-6 max-w-2xl text-left">
                  <h3 className="font-bold text-[#1E293B] text-base">Security & API</h3>
                  <div>
                    <label className="text-xs font-semibold text-[#64748B] mb-1.5 block">JWT Secret Key</label>
                    <input type="password" disabled className="w-full border border-[#E2E8F0] rounded-lg px-4 py-2.5 text-sm bg-slate-100 text-[#64748B] cursor-not-allowed" defaultValue="************************" />
                  </div>
                  
                  <div className="flex justify-between items-center py-2">
                    <div>
                      <p className="text-sm font-semibold text-[#1E293B]">Two-Factor Authentication</p>
                      <p className="text-xs text-[#64748B]">Require 2FA verification code for super admin login.</p>
                    </div>
                    <button 
                      onClick={() => {
                        const nextVal = !twoFactor;
                        setTwoFactor(nextVal);
                        showToast(`Two-factor auth is now ${nextVal ? 'ENABLED' : 'DISABLED'}`);
                      }}
                      className={`w-12 h-6 rounded-full flex items-center transition-colors px-1 ${
                        twoFactor ? 'bg-[#0D47A1]' : 'bg-gray-200'
                      }`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-200 ${
                        twoFactor ? 'translate-x-6' : 'translate-x-0'
                      }`}></div>
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'Payment' && (
                <div className="space-y-6 max-w-2xl text-left">
                  <h3 className="font-bold text-[#1E293B] text-base">Payment Gateway Configuration</h3>
                  <div>
                    <label className="text-xs font-semibold text-[#64748B] mb-1.5 block">Razorpay API Key</label>
                    <input 
                      type="text" 
                      className="w-full border border-[#E2E8F0] rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#0D47A1] text-slate-800 bg-[#F8FAFC]" 
                      value={razorpayKey}
                      onChange={(e) => setRazorpayKey(e.target.value)} 
                    />
                  </div>
                </div>
              )}

              {activeTab === 'Tax' && (
                <div className="space-y-6 max-w-2xl text-left">
                  <h3 className="font-bold text-[#1E293B] text-base">Tax Settings</h3>
                  <div>
                    <label className="text-xs font-semibold text-[#64748B] mb-1.5 block">Default GST (%)</label>
                    <input 
                      type="number" 
                      className="w-full border border-[#E2E8F0] rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#0D47A1] text-slate-800 bg-[#F8FAFC]" 
                      value={defaultGst}
                      onChange={(e) => setDefaultGst(e.target.value)} 
                    />
                  </div>
                </div>
              )}

            </div>

            {/* Footer */}
            <div className="p-6 border-t border-[#E2E8F0] flex justify-end bg-[#F8FAFC]">
              <button
                onClick={handleSave}
                disabled={loading || saving}
                className="bg-[#0D47A1] text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Save size={16} /> {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Success Toast */}
      {successMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="h-4 w-4" />
          {successMessage}
        </div>
      )}
    </div>
  );
};

export default Settings;
