import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/super-admin/Sidebar';
import Topbar from '../../components/super-admin/Topbar';
import { Search, Image, Plus, Trash2, Eye } from 'lucide-react';
import { apiRequest } from '../../lib/apiClient';

const Stories = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function loadStories() {
      try {
        // /admin, not the public reader — the console must see Scheduled stories too.
        const data = await apiRequest('/cms/stories/admin', { auth: true });
        if (!cancelled) setStories(data || []);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadStories();
    return () => { cancelled = true; };
  }, []);

  const handleDelete = async (id) => {
    const previous = stories;
    setStories(prev => prev.filter(s => s.id !== id));
    try {
      await apiRequest(`/cms/stories/${id}`, { method: 'DELETE', auth: true });
    } catch (err) {
      setStories(previous);
      setError(`Could not delete story: ${err.message}`);
    }
  };

  const q = searchQuery.toLowerCase();
  const filteredStories = stories.filter(s =>
    (s.title || '').toLowerCase().includes(q) ||
    (s.type || '').toLowerCase().includes(q)
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex text-slate-800">
      <Sidebar />
      <div className="flex-1 ml-64 min-h-screen flex flex-col">
        <Topbar title="Stories & Banners Management" subtitle="Configure and deploy slider stories and promo banners on the Customer App" />
        <div className="p-6 space-y-6 flex-1">
          
          <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] flex flex-wrap gap-4 items-center justify-between shadow-sm">
            <div className="relative w-64">
              <Search size={16} className="absolute left-3 top-3 text-[#64748B]" />
              <input 
                type="text" 
                placeholder="Search Story Title..." 
                className="w-full pl-10 pr-4 py-2 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] outline-none text-sm bg-[#F8FAFC]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button className="bg-[#0D47A1] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2 cursor-pointer shadow-sm">
              <Plus size={16} /> Upload New Story
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 text-xs font-black tracking-wider uppercase">
                  <th className="p-4 pl-6">Story Content</th>
                  <th className="p-4">Placement Type</th>
                  <th className="p-4">Aspect Ratio</th>
                  <th className="p-4">Views / Clicks</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {loading && (
                  <tr><td colSpan={6} className="p-8 text-center text-slate-400 font-semibold">Loading stories…</td></tr>
                )}
                {!loading && error && (
                  <tr><td colSpan={6} className="p-8 text-center text-red-600 font-semibold">{error}</td></tr>
                )}
                {!loading && !error && filteredStories.length === 0 && (
                  <tr><td colSpan={6} className="p-8 text-center text-slate-400 font-semibold">No stories yet.</td></tr>
                )}
                {filteredStories.map((story) => (
                  <tr key={story.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 pl-6">
                      <p className="font-bold text-slate-800 flex items-center gap-1.5"><Image size={14} className="text-slate-400" /> {story.title}</p>
                      <span className="text-[10px] text-slate-400 font-bold uppercase">ID: {story.id}</span>
                    </td>
                    <td className="p-4 font-semibold text-slate-600">{story.type}</td>
                    <td className="p-4 text-xs font-bold text-[#0D47A1]">{story.aspectRatio || '—'}</td>
                    <td className="p-4 text-slate-700 font-bold flex items-center gap-1"><Eye size={12} /> {story.clicks ?? 0}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        story.status === 'Active' ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-yellow-50 text-yellow-600 border border-yellow-100'
                      }`}>
                        {story.status}
                      </span>
                    </td>
                    <td className="p-4 pr-6 text-right space-x-2">
                      <button className="text-slate-500 hover:text-[#0D47A1] inline-block p-1 hover:bg-slate-100 rounded transition-colors cursor-pointer"><Eye size={14} /></button>
                      <button onClick={() => handleDelete(story.id)} className="text-slate-500 hover:text-red-600 inline-block p-1 hover:bg-red-50 rounded transition-colors cursor-pointer"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Stories;
