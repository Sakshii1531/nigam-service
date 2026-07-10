import React, { useState } from 'react';
import Sidebar from '../../components/super-admin/Sidebar';
import Topbar from '../../components/super-admin/Topbar';
import { Search, Video, Plus, Trash2, Eye } from 'lucide-react';

const Videos = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const [videos, setVideos] = useState([
    { id: 1, title: 'How to clean RO Filters at Home', duration: '3:45', size: '14 MB', views: 1240, active: 'Active' },
    { id: 2, title: 'AC Installation Guidelines Video', duration: '5:20', size: '28 MB', views: 890, active: 'Active' },
    { id: 3, title: 'Technician Training Onboarding Module 1', duration: '12:10', size: '84 MB', views: 342, active: 'Active' },
  ]);

  const handleDelete = (id) => {
    setVideos(prev => prev.filter(v => v.id !== id));
  };

  const filteredVideos = videos.filter(v => 
    v.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex text-slate-800">
      <Sidebar />
      <div className="flex-1 ml-64 min-h-screen flex flex-col">
        <Topbar title="Videos Management" subtitle="Manage instructional, onboarding, and promotional video content" />
        <div className="p-6 space-y-6 flex-1">
          
          <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] flex flex-wrap gap-4 items-center justify-between shadow-sm">
            <div className="relative w-64">
              <Search size={16} className="absolute left-3 top-3 text-[#64748B]" />
              <input 
                type="text" 
                placeholder="Search Video Title..." 
                className="w-full pl-10 pr-4 py-2 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] outline-none text-sm bg-[#F8FAFC]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button className="bg-[#0D47A1] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2 cursor-pointer shadow-sm">
              <Plus size={16} /> Upload New Video
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 text-xs font-black tracking-wider uppercase">
                  <th className="p-4 pl-6">Video Details</th>
                  <th className="p-4">Duration</th>
                  <th className="p-4">File Size</th>
                  <th className="p-4">Views</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredVideos.map((video) => (
                  <tr key={video.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 pl-6">
                      <p className="font-bold text-slate-800 flex items-center gap-1.5"><Video size={14} className="text-slate-400" /> {video.title}</p>
                      <span className="text-[10px] text-slate-400 font-bold uppercase">ID: VID-{video.id + 100}</span>
                    </td>
                    <td className="p-4 font-semibold text-slate-600">{video.duration} min</td>
                    <td className="p-4 text-xs font-bold text-slate-500">{video.size}</td>
                    <td className="p-4 text-slate-700 font-bold flex items-center gap-1"><Eye size={12} /> {video.views}</td>
                    <td className="p-4">
                      <span className="bg-green-50 text-green-600 border border-green-100 px-2 py-0.5 rounded-full text-[10px] font-black uppercase">
                        {video.active}
                      </span>
                    </td>
                    <td className="p-4 pr-6 text-right space-x-2">
                      <button className="text-slate-500 hover:text-[#0D47A1] inline-block p-1 hover:bg-slate-100 rounded transition-colors cursor-pointer"><Eye size={14} /></button>
                      <button onClick={() => handleDelete(video.id)} className="text-slate-500 hover:text-red-600 inline-block p-1 hover:bg-red-50 rounded transition-colors cursor-pointer"><Trash2 size={14} /></button>
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

export default Videos;
