import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from '../../components/super-admin/Sidebar';
import Topbar from '../../components/super-admin/Topbar';
import {
  Sparkles, Plus, Trash2, Edit2, Check, Save, Wrench, RefreshCw,
  Info, Users, Image, Video, Bell, Settings, Award, FileText
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { apiRequest } from '../../lib/apiClient';

const FALLBACK_BANNER_IMAGE = 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=150';

// The five sections below are authored here and consumed by the technician app.
// Each row keeps the shape the table markup already expects, so mapping happens
// only at the API boundary.
const toBanner = (d) => ({
  id: d.id,
  title: d.title || 'Untitled banner',
  desc: d.description || '',
  status: d.isActive ? 'Active' : 'Inactive',
  image: d.imageUrl,
});
const toVideo = (d) => ({
  id: d.id,
  title: d.title,
  category: d.category || 'General',
  duration: d.duration || '—',
  status: d.isActive ? 'Active' : 'Inactive',
});
const toAnnouncement = (d) => ({
  id: d.id,
  msg: d.message,
  date: (d.createdAt || '').slice(0, 10),
  // `scope` is the targeting axis ('all' | 'city' | 'role'); `region` carries
  // the audience label the console shows.
  scope: d.region || 'All Regions',
});
const toSkill = (d) => ({ id: d.id, name: d.name, code: d.code, group: d.group || 'General' });

const TechnicianAppCustomization = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'banners';

  // Toast State
  const [toastMessage, setToastMessage] = useState('');
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // Modals state
  const [showAddBannerModal, setShowAddBannerModal] = useState(false);
  const [showAddVideoModal, setShowAddVideoModal] = useState(false);
  const [showAddAnnounceModal, setShowAddAnnounceModal] = useState(false);
  const [showAddSkillModal, setShowAddSkillModal] = useState(false);

  const [banners, setBanners] = useState([]);
  const [videos, setVideos] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [skills, setSkills] = useState([]);
  const [settings, setSettings] = useState({
    offlineMode: true,
    autoAssign: false,
    gpsInterval: 60,
    payoutCycle: 'weekly'
  });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [newBanner, setNewBanner] = useState({ title: '', desc: '' });
  const [newVideo, setNewVideo] = useState({ title: '', category: '', duration: '' });
  const [newAnnounce, setNewAnnounce] = useState({ msg: '', scope: '' });
  const [newSkill, setNewSkill] = useState({ name: '', code: '', group: '' });

  const loadAll = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      // The console has to show inactive rows too, so banners/videos use the
      // /admin readers rather than the publish-filtered public ones.
      const [bannerRes, videoRes, announceRes, skillRes, settingRes] = await Promise.all([
        apiRequest('/cms/banners/admin?app=technician', { auth: true }),
        apiRequest('/cms/videos/admin', { auth: true }),
        apiRequest('/cms/announcements', { auth: true }),
        apiRequest('/cms/skills', { auth: true }),
        apiRequest('/cms/app-settings/technician'),
      ]);
      setBanners((bannerRes.data || []).map(toBanner));
      setVideos((videoRes.data || []).map(toVideo));
      setAnnouncements((announceRes.data || []).map(toAnnouncement));
      setSkills((skillRes.data || []).map(toSkill));
      setSettings((prev) => ({ ...prev, ...(settingRes.data || {}) }));
    } catch (err) {
      setLoadError(err.message || 'Failed to load technician app content.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // 1. BANNERS
  const handleAddBanner = async (e) => {
    e.preventDefault();
    if (!newBanner.title) return;
    try {
      const res = await apiRequest('/cms/banners', {
        method: 'POST',
        auth: true,
        body: {
          imageUrl: FALLBACK_BANNER_IMAGE,
          title: newBanner.title,
          description: newBanner.desc || 'Technician Alert Announcement Banner',
          app: 'technician',
        },
      });
      setBanners((prev) => [...prev, toBanner(res.data)]);
      setNewBanner({ title: '', desc: '' });
      showToast('New technician banner published!');
    } catch (err) {
      showToast(err.message || 'Could not publish banner.');
    }
  };

  const handleDeleteBanner = async (id) => {
    try {
      await apiRequest(`/cms/banners/${id}`, { method: 'DELETE', auth: true });
      setBanners((prev) => prev.filter((b) => b.id !== id));
      showToast('Banner removed.');
    } catch (err) {
      showToast(err.message || 'Could not remove banner.');
    }
  };

  // 2. VIDEOS
  const handleAddVideo = async (e) => {
    e.preventDefault();
    if (!newVideo.title) return;
    try {
      const res = await apiRequest('/cms/videos', {
        method: 'POST',
        auth: true,
        body: {
          title: newVideo.title,
          category: newVideo.category || 'General',
          duration: newVideo.duration || '10 mins',
        },
      });
      setVideos((prev) => [...prev, toVideo(res.data)]);
      setNewVideo({ title: '', category: '', duration: '' });
      showToast('Training video added successfully!');
    } catch (err) {
      showToast(err.message || 'Could not add video.');
    }
  };

  const handleDeleteVideo = async (id) => {
    try {
      await apiRequest(`/cms/videos/${id}`, { method: 'DELETE', auth: true });
      setVideos((prev) => prev.filter((v) => v.id !== id));
      showToast('Video deleted.');
    } catch (err) {
      showToast(err.message || 'Could not delete video.');
    }
  };

  // 3. ANNOUNCEMENTS
  const handleAddAnnounce = async (e) => {
    e.preventDefault();
    if (!newAnnounce.msg) return;
    try {
      const region = newAnnounce.scope.trim();
      const res = await apiRequest('/cms/announcements', {
        method: 'POST',
        auth: true,
        // A named region narrows the broadcast to those cities; blank means
        // everyone.
        body: { message: newAnnounce.msg, scope: region ? 'city' : 'all', region },
      });
      setAnnouncements((prev) => [toAnnouncement(res.data), ...prev]);
      setNewAnnounce({ msg: '', scope: '' });
      showToast('System announcement broadcasted!');
    } catch (err) {
      showToast(err.message || 'Could not broadcast announcement.');
    }
  };

  const handleDeleteAnnounce = async (id) => {
    try {
      await apiRequest(`/cms/announcements/${id}`, { method: 'DELETE', auth: true });
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      showToast('Announcement recalled.');
    } catch (err) {
      showToast(err.message || 'Could not recall announcement.');
    }
  };

  // 4. SKILLS
  const handleAddSkill = async (e) => {
    e.preventDefault();
    if (!newSkill.name || !newSkill.code) return;
    try {
      const res = await apiRequest('/cms/skills', {
        method: 'POST',
        auth: true,
        body: {
          name: newSkill.name,
          code: newSkill.code.toUpperCase(),
          group: newSkill.group || 'General',
        },
      });
      setSkills((prev) => [...prev, toSkill(res.data)]);
      setNewSkill({ name: '', code: '', group: '' });
      showToast('Dynamic skill tag added!');
    } catch (err) {
      showToast(err.message || 'Could not add skill.');
    }
  };

  const handleDeleteSkill = async (id) => {
    try {
      await apiRequest(`/cms/skills/${id}`, { method: 'DELETE', auth: true });
      setSkills((prev) => prev.filter((s) => s.id !== id));
      showToast('Skill tag deleted.');
    } catch (err) {
      showToast(err.message || 'Could not delete skill.');
    }
  };

  // 5. SETTINGS — stored as flat key/value rows under the 'technician' app.
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      for (const [key, value] of Object.entries(settings)) {
        await apiRequest('/cms/app-settings/technician', {
          method: 'PUT',
          auth: true,
          body: { key, value },
        });
      }
      showToast('Technician app system settings updated.');
    } catch (err) {
      showToast(err.message || 'Could not save settings.');
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F7FE] flex">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Container */}
      <div className="flex-1 ml-64 min-h-screen flex flex-col">
        {/* Topbar */}
        <Topbar title="Technician App Customization" />

        {/* Inner Content */}
        <div className="p-6 flex-1 flex flex-col gap-6 max-w-5xl">
          {/* Toast message */}
          {toastMessage && (
            <div className="fixed top-20 right-8 bg-[#0D47A1] text-white font-bold py-3 px-6 rounded-xl shadow-2xl z-50 animate-bounce flex items-center gap-2 text-xs">
              <Check className="h-4.5 w-4.5" />
              <span>{toastMessage}</span>
            </div>
          )}

          {loading && (
            <div className="bg-white border border-slate-100 rounded-xl p-4 text-xs font-bold text-slate-400">
              Loading technician app content…
            </div>
          )}
          {loadError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between gap-4">
              <span className="text-xs font-bold text-red-600">{loadError}</span>
              <button
                onClick={loadAll}
                className="text-[11px] font-extrabold text-red-700 bg-white border border-red-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Retry
              </button>
            </div>
          )}

          {/* Main Content Pane */}
          <div className="flex-1 bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm min-h-[450px]">
            
            {/* SUBSECTION 1: BANNERS */}
            {activeTab === 'banners' && (
              <div className="flex flex-col gap-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Technician App Banners</h3>
                    <p className="text-xs text-slate-400 font-semibold mt-1">Configure dashboard banner promos and notices displayed in the technician client.</p>
                  </div>
                  <button 
                    onClick={() => setShowAddBannerModal(true)}
                    className="bg-[#0D47A1] hover:bg-blue-800 text-white font-bold py-2.5 px-4.5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Banner</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-5 mt-2">
                  {banners.map((banner) => (
                    <div key={banner.id} className="border border-slate-150 rounded-2xl p-4.5 bg-white shadow-2xs hover:shadow-xs transition-all text-left flex gap-4 relative group">
                      <img 
                        src={banner.image} 
                        alt="banner" 
                        className="w-20 h-20 rounded-xl object-cover border border-slate-100 flex-shrink-0 bg-slate-50"
                      />
                      <div className="flex flex-col justify-between flex-1 min-w-0 pr-6">
                        <div>
                          <h4 className="text-xs font-black text-slate-800 truncate uppercase">{banner.title}</h4>
                          <p className="text-[11px] text-slate-500 font-semibold leading-relaxed mt-1">{banner.desc}</p>
                        </div>
                        <div>
                          <span className="bg-green-50 text-green-600 px-2 py-0.5 rounded-full text-[9px] border border-green-200 font-bold">{banner.status}</span>
                        </div>
                      </div>

                      <button 
                        onClick={() => handleDeleteBanner(banner.id)}
                        className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                        title="Remove Banner"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Create Banner Modal */}
                {showAddBannerModal && (
                  <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl max-w-lg w-full overflow-hidden p-6 animate-in fade-in zoom-in-95 duration-150">
                      <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                        <span className="text-sm font-black text-slate-800 uppercase tracking-wider">Add Banner Promo</span>
                        <button 
                          onClick={() => setShowAddBannerModal(false)}
                          className="text-slate-400 hover:text-slate-655 font-black text-lg p-1.5 cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                      
                      <form onSubmit={(e) => {
                        handleAddBanner(e);
                        setShowAddBannerModal(false);
                      }} className="flex flex-col gap-4 text-left mt-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] text-slate-400 font-bold uppercase">Banner Title</label>
                          <input 
                            type="text"
                            placeholder="e.g. Safety Kit Update"
                            value={newBanner.title}
                            onChange={(e) => setNewBanner({ ...newBanner, title: e.target.value })}
                            className="bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-brand-blue"
                            required
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] text-slate-400 font-bold uppercase">Description Details</label>
                          <input 
                            type="text"
                            placeholder="e.g. Please wear a helmet while working at heights."
                            value={newBanner.desc}
                            onChange={(e) => setNewBanner({ ...newBanner, desc: e.target.value })}
                            className="bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-brand-blue"
                          />
                        </div>

                        <div className="flex justify-end gap-3 mt-2 pt-4 border-t border-slate-100">
                          <button 
                            type="button"
                            onClick={() => setShowAddBannerModal(false)}
                            className="border border-slate-250 hover:bg-slate-50 text-slate-500 font-bold py-2.5 px-5 rounded-xl text-xs cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button 
                            type="submit"
                            className="bg-[#0D47A1] hover:bg-blue-800 text-white font-bold py-2.5 px-5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
                          >
                            <Plus className="h-4 w-4" />
                            <span>Publish Banner</span>
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SUBSECTION 2: VIDEOS */}
            {activeTab === 'training' && (
              <div className="flex flex-col gap-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Training & Support Videos</h3>
                    <p className="text-xs text-slate-400 font-semibold mt-1">Configure instructional training classes and video links for technician app.</p>
                  </div>
                  <button 
                    onClick={() => setShowAddVideoModal(true)}
                    className="bg-[#0D47A1] hover:bg-blue-800 text-white font-bold py-2.5 px-4.5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Video</span>
                  </button>
                </div>

                <div className="border border-slate-150 rounded-xl overflow-hidden shadow-2xs mt-2">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-150 text-slate-500 font-bold uppercase">
                      <tr>
                        <th className="p-3">Video Title</th>
                        <th className="p-3">Category</th>
                        <th className="p-3">Duration</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150">
                      {videos.map((v) => (
                        <tr key={v.id} className="hover:bg-slate-50/50 font-semibold text-slate-700">
                          <td className="p-3 font-bold text-slate-800">{v.title}</td>
                          <td className="p-3 text-[#0D47A1]">{v.category}</td>
                          <td className="p-3 text-slate-500">{v.duration}</td>
                          <td className="p-3"><span className="bg-green-50 text-green-600 px-2 py-0.5 rounded-full text-[10px] border border-green-200">Active</span></td>
                          <td className="p-3 text-center">
                            <button 
                              onClick={() => handleDeleteVideo(v.id)}
                              className="text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                            >
                              <Trash2 className="h-4.5 w-4.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Create Video Modal */}
                {showAddVideoModal && (
                  <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl max-w-lg w-full overflow-hidden p-6 animate-in fade-in zoom-in-95 duration-150">
                      <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                        <span className="text-sm font-black text-slate-800 uppercase tracking-wider">Add Training Video</span>
                        <button 
                          onClick={() => setShowAddVideoModal(false)}
                          className="text-slate-400 hover:text-slate-655 font-black text-lg p-1.5 cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                      
                      <form onSubmit={(e) => {
                        handleAddVideo(e);
                        setShowAddVideoModal(false);
                      }} className="flex flex-col gap-4 text-left mt-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] text-slate-400 font-bold uppercase">Video Title</label>
                          <input 
                            type="text"
                            placeholder="e.g. Compressor Replacement Guide"
                            value={newVideo.title}
                            onChange={(e) => setNewVideo({ ...newVideo, title: e.target.value })}
                            className="bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-brand-blue"
                            required
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] text-slate-400 font-bold uppercase">Category</label>
                            <input 
                              type="text"
                              placeholder="e.g. Fridge Repair"
                              value={newVideo.category}
                              onChange={(e) => setNewVideo({ ...newVideo, category: e.target.value })}
                              className="bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-brand-blue"
                            />
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] text-slate-400 font-bold uppercase">Duration</label>
                            <input 
                              type="text"
                              placeholder="e.g. 15 mins"
                              value={newVideo.duration}
                              onChange={(e) => setNewVideo({ ...newVideo, duration: e.target.value })}
                              className="bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-brand-blue"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-2 pt-4 border-t border-slate-100">
                          <button 
                            type="button"
                            onClick={() => setShowAddVideoModal(false)}
                            className="border border-slate-250 hover:bg-slate-50 text-slate-500 font-bold py-2.5 px-5 rounded-xl text-xs cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button 
                            type="submit"
                            className="bg-[#0D47A1] hover:bg-blue-800 text-white font-bold py-2.5 px-5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
                          >
                            <Plus className="h-4 w-4" />
                            <span>Add Video</span>
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SUBSECTION 3: ANNOUNCEMENTS */}
            {activeTab === 'announcements' && (
              <div className="flex flex-col gap-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Broadcasting Alerts</h3>
                    <p className="text-xs text-slate-400 font-semibold mt-1">Publish critical service announcements to all online technician apps.</p>
                  </div>
                  <button 
                    onClick={() => setShowAddAnnounceModal(true)}
                    className="bg-[#0D47A1] hover:bg-blue-800 text-white font-bold py-2.5 px-4.5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Create Alert</span>
                  </button>
                </div>

                <div className="flex flex-col gap-3.5 mt-2">
                  {announcements.map((announce) => (
                    <div key={announce.id} className="border border-slate-150 rounded-2xl p-4.5 bg-[#FAFBFF] shadow-3xs text-left relative group">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-5.5 h-5.5 rounded-md bg-rose-50 text-rose-500 flex items-center justify-center">
                          <Bell className="h-3.5 w-3.5 fill-current" />
                        </div>
                        <span className="text-[10px] text-slate-400 font-bold">{announce.date}</span>
                        <span className="text-[10px] font-extrabold text-[#0D47A1] bg-blue-50 px-2 py-0.5 rounded border border-blue-100">{announce.scope}</span>
                      </div>
                      <p className="text-xs font-semibold text-slate-700 leading-relaxed pr-6">{announce.msg}</p>

                      <button 
                        onClick={() => handleDeleteAnnounce(announce.id)}
                        className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                        title="Delete Alert"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Create Alert Modal */}
                {showAddAnnounceModal && (
                  <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl max-w-lg w-full overflow-hidden p-6 animate-in fade-in zoom-in-95 duration-150">
                      <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                        <span className="text-sm font-black text-slate-800 uppercase tracking-wider">Create Broadcast Alert</span>
                        <button 
                          onClick={() => setShowAddAnnounceModal(false)}
                          className="text-slate-400 hover:text-slate-655 font-black text-lg p-1.5 cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                      
                      <form onSubmit={(e) => {
                        handleAddAnnounce(e);
                        setShowAddAnnounceModal(false);
                      }} className="flex flex-col gap-4 text-left mt-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] text-slate-400 font-bold uppercase">Broadcast Message</label>
                          <textarea 
                            rows={3}
                            placeholder="e.g. Please sync your active jobs. Payout reconciliation is happening..."
                            value={newAnnounce.msg}
                            onChange={(e) => setNewAnnounce({ ...newAnnounce, msg: e.target.value })}
                            className="bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-brand-blue resize-none"
                            required
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] text-slate-400 font-bold uppercase">Target Location / Scope</label>
                          <input 
                            type="text"
                            placeholder="e.g. Delhi-NCR, Mumbai, or All Cities"
                            value={newAnnounce.scope}
                            onChange={(e) => setNewAnnounce({ ...newAnnounce, scope: e.target.value })}
                            className="bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-brand-blue"
                          />
                        </div>

                        <div className="flex justify-end gap-3 mt-2 pt-4 border-t border-slate-100">
                          <button 
                            type="button"
                            onClick={() => setShowAddAnnounceModal(false)}
                            className="border border-slate-250 hover:bg-slate-50 text-slate-500 font-bold py-2.5 px-5 rounded-xl text-xs cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button 
                            type="submit"
                            className="bg-[#0D47A1] hover:bg-blue-800 text-white font-bold py-2.5 px-5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
                          >
                            <Plus className="h-4 w-4" />
                            <span>Broadcast Alert</span>
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SUBSECTION 4: SKILLS */}
            {activeTab === 'skills' && (
              <div className="flex flex-col gap-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Dynamic Skills Tags</h3>
                    <p className="text-xs text-slate-400 font-semibold mt-1">Manage certification tags assigned to technicians for dynamic job allocation logic.</p>
                  </div>
                  <button 
                    onClick={() => setShowAddSkillModal(true)}
                    className="bg-[#0D47A1] hover:bg-blue-800 text-white font-bold py-2.5 px-4.5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Skill</span>
                  </button>
                </div>

                <div className="border border-slate-150 rounded-xl overflow-hidden shadow-2xs mt-2">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-150 text-slate-500 font-bold uppercase">
                      <tr>
                        <th className="p-3">Skill Name</th>
                        <th className="p-3">Unique Code</th>
                        <th className="p-3">Skill Group</th>
                        <th className="p-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150">
                      {skills.map((s) => (
                        <tr key={s.id} className="hover:bg-slate-50/50 font-semibold text-slate-700">
                          <td className="p-3 font-bold text-slate-800">{s.name}</td>
                          <td className="p-3 font-mono text-[#0D47A1]">{s.code}</td>
                          <td className="p-3 text-slate-500">{s.group}</td>
                          <td className="p-3 text-center">
                            <button 
                              onClick={() => handleDeleteSkill(s.id)}
                              className="text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                            >
                              <Trash2 className="h-4.5 w-4.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Create Skill Modal */}
                {showAddSkillModal && (
                  <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl max-w-lg w-full overflow-hidden p-6 animate-in fade-in zoom-in-95 duration-150">
                      <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                        <span className="text-sm font-black text-slate-800 uppercase tracking-wider">Add Certification Skill</span>
                        <button 
                          onClick={() => setShowAddSkillModal(false)}
                          className="text-slate-400 hover:text-slate-655 font-black text-lg p-1.5 cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                      
                      <form onSubmit={(e) => {
                        handleAddSkill(e);
                        setShowAddSkillModal(false);
                      }} className="flex flex-col gap-4 text-left mt-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] text-slate-400 font-bold uppercase">Skill Name</label>
                          <input 
                            type="text"
                            placeholder="e.g. Inverter Card Repair"
                            value={newSkill.name}
                            onChange={(e) => setNewSkill({ ...newSkill, name: e.target.value })}
                            className="bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-brand-blue"
                            required
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] text-slate-400 font-bold uppercase">Unique Tag Code</label>
                            <input 
                              type="text"
                              placeholder="e.g. AC-INV-CARD"
                              value={newSkill.code}
                              onChange={(e) => setNewSkill({ ...newSkill, code: e.target.value })}
                              className="bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-brand-blue"
                              required
                            />
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] text-slate-400 font-bold uppercase">Skill Group</label>
                            <input 
                              type="text"
                              placeholder="e.g. HVAC, Plumbing"
                              value={newSkill.group}
                              onChange={(e) => setNewSkill({ ...newSkill, group: e.target.value })}
                              className="bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-brand-blue"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-2 pt-4 border-t border-slate-100">
                          <button 
                            type="button"
                            onClick={() => setShowAddSkillModal(false)}
                            className="border border-slate-250 hover:bg-slate-50 text-slate-500 font-bold py-2.5 px-5 rounded-xl text-xs cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button 
                            type="submit"
                            className="bg-[#0D47A1] hover:bg-blue-800 text-white font-bold py-2.5 px-5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
                          >
                            <Plus className="h-4 w-4" />
                            <span>Create Skill</span>
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SUBSECTION 5: SETTINGS */}
            {activeTab === 'settings' && (
              <form onSubmit={handleSaveSettings} className="flex flex-col gap-6 text-left">
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Technician Client Configuration</h3>
                  <p className="text-xs text-slate-400 font-semibold mt-1">Configure global application parameters and driver behavior settings.</p>
                </div>

                <div className="grid grid-cols-2 gap-5 mt-2">
                  <div className="border border-slate-150 rounded-2xl p-4.5 bg-[#FAFBFF] shadow-3xs flex justify-between items-center">
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">Allow Offline Booking Sync</span>
                      <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">Let technicians close tickets in areas without cell network.</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={settings.offlineMode} 
                        onChange={(e) => setSettings({ ...settings, offlineMode: e.target.checked })}
                        className="sr-only peer" 
                      />
                      <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#0D47A1]"></div>
                    </label>
                  </div>

                  <div className="border border-slate-150 rounded-2xl p-4.5 bg-[#FAFBFF] shadow-3xs flex justify-between items-center">
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">Auto-Assign Jobs to Partners</span>
                      <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">Algorithms automatically allocate tasks to closest nearby tech.</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={settings.autoAssign} 
                        onChange={(e) => setSettings({ ...settings, autoAssign: e.target.checked })}
                        className="sr-only peer" 
                      />
                      <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#0D47A1]"></div>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-slate-400 font-bold uppercase">GPS Tracking Interval (Seconds)</label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="number"
                        value={settings.gpsInterval}
                        onChange={(e) => setSettings({ ...settings, gpsInterval: parseInt(e.target.value, 10) })}
                        className="flex-1 bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-brand-blue"
                      />
                      <span className="text-xs font-bold text-slate-500">Seconds</span>
                    </div>
                    <span className="text-[9px] text-slate-400 font-semibold block mt-0.5">Interval for location updates to be transmitted from field agent app.</span>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-slate-400 font-bold uppercase">Default Payout Cycle</label>
                    <select 
                      value={settings.payoutCycle}
                      onChange={(e) => setSettings({ ...settings, payoutCycle: e.target.value })}
                      className="bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-brand-blue"
                    >
                      <option value="daily">Daily Settlements</option>
                      <option value="weekly">Weekly (Every Wednesday)</option>
                      <option value="bi-weekly">Bi-weekly (1st and 15th)</option>
                      <option value="monthly">Monthly Cycles</option>
                    </select>
                    <span className="text-[9px] text-slate-400 font-semibold block mt-0.5">Automated settlement cycles for partner payout calculations.</span>
                  </div>
                </div>

                <button 
                  type="submit"
                  className="bg-[#0D47A1] hover:bg-blue-800 text-white font-bold py-3.5 px-6 rounded-xl text-xs mt-2 self-start cursor-pointer shadow-md"
                >
                  Save Configuration
                </button>
              </form>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default TechnicianAppCustomization;
