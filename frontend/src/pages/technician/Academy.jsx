import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Award, Play, BookOpen, ChevronRight } from 'lucide-react';
import { apiRequest } from '../../lib/apiClient';
import TechTopNav from '../../components/TechTopNav';

const CATEGORY_TONE = [
  'text-[#00C853] bg-green-50',
  'text-blue-600 bg-blue-50',
  'text-amber-600 bg-amber-50',
  'text-purple-600 bg-purple-50',
];

const Academy = () => {
  const navigate = useNavigate();
  const [selectedAcademyTab, setSelectedAcademyTab] = useState('All');
  const [activeVideo, setActiveVideo] = useState(null);
  const [activeBlogId, setActiveBlogId] = useState(null);

  // Videos come from the CMS library the super-admin console authors; blogs from
  // the academy content endpoint. Both were hardcoded here before.
  const [videos, setVideos] = useState([]);
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      apiRequest('/cms/videos'),
      apiRequest('/tech/academy/blogs', { auth: true }),
    ])
      .then(([videoRes, blogRes]) => {
        setVideos(videoRes.data || []);
        setBlogs(blogRes.data || []);
      })
      .catch((err) => setError(err.message || 'Could not load academy content.'))
      .finally(() => setLoading(false));
  }, []);

  const activeBlog = blogs.find((b) => b.id === activeBlogId);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col pb-16 lg:pb-8 lg:pt-14 relative font-sans">

      {/* Desktop Top Nav */}
      <TechTopNav activePage="profile" />

      {/* Header — mobile only */}
      <div className="bg-[#052355] text-white px-4 py-3.5 flex items-center justify-between sticky top-0 z-10 shadow-md lg:hidden">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              if (activeBlogId !== null) {
                setActiveBlogId(null);
              } else if (activeVideo !== null) {
                setActiveVideo(null);
              } else {
                navigate(-1);
              }
            }} 
            className="p-1 hover:bg-white/10 rounded-full text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-6 w-6 text-white" />
          </button>
          <h1 className="text-base font-semibold text-white">NCC Academy</h1>
        </div>
        <Award className="h-5.5 w-5.5 text-[#FFD400] fill-[#FFD400]" />
      </div>

      {activeVideo !== null ? (
        /* Video player — the real file, not a still thumbnail. This used to
           render the poster image under a pulsing play icon labelled "Live
           Playback Simulated", with a course description hardcoded into the
           markup regardless of which lesson was opened. */
        <div className="flex-1 bg-black flex flex-col justify-between">
          <div className="w-full aspect-video bg-slate-900 relative flex items-center justify-center border-b border-white/10 mt-auto mb-auto">
            <video
              src={activeVideo.url}
              poster={activeVideo.thumbnailUrl || undefined}
              controls
              autoPlay
              playsInline
              className="w-full h-full object-contain bg-black"
            >
              Your browser cannot play this video.
            </video>
          </div>
          <div className="bg-[#052355] p-5 text-left rounded-t-3xl border-t border-white/10 text-white">
            {activeVideo.category && (
              <span className="bg-[#00C853] text-[9px] font-semibold px-2 py-0.5 rounded-md uppercase tracking-wider">
                {activeVideo.category}
              </span>
            )}
            <h3 className="text-sm font-semibold mt-2">{activeVideo.title}</h3>
            {activeVideo.description && (
              <p className="text-xs text-slate-300 mt-1.5 font-normal leading-relaxed">{activeVideo.description}</p>
            )}
            <button
              onClick={() => setActiveVideo(null)}
              className="mt-6 w-full py-3 bg-white text-[#052355] font-semibold text-xs rounded-xl text-center shadow-sm hover:bg-slate-100 transition-colors"
            >
              Close Player
            </button>
          </div>
        </div>
      ) : activeBlogId !== null ? (
          <div className="flex-1 bg-white flex flex-col overflow-y-auto p-5 text-left">
            <span className="bg-[#0D47A1]/10 text-[#0D47A1] text-[9px] font-semibold px-2 py-0.5 rounded-md uppercase tracking-wider w-fit">{activeBlog?.category || 'Guide'}</span>
            <h2 className="text-base font-semibold text-[#052355] mt-2.5 leading-tight">{activeBlog?.title}</h2>
            <div className="flex justify-between items-center text-[10px] text-slate-500 font-normal mt-2 border-b border-slate-100 pb-3">
              <span>Author: {activeBlog?.author || 'Nigam Care'}</span>
              <span>{activeBlog?.readTime || ''}</span>
            </div>
            <div className="text-xs text-slate-700 font-normal leading-relaxed whitespace-pre-line mt-4 flex-1">
              {activeBlog?.body}
            </div>
            <button
              onClick={() => setActiveBlogId(null)}
              className="mt-6 w-full py-3 bg-[#0D47A1] text-white font-semibold text-xs rounded-xl text-center shadow-sm hover:bg-[#0A3F91] transition-all"
            >
              Back to Learning Hub
            </button>
          </div>
      ) : (

        /* Academy Hub List */
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5 bg-slate-50 pb-8 text-left max-w-screen-lg mx-auto w-full">
          {error && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 text-[11px] font-semibold text-rose-600">
              {error}
            </div>
          )}

          {/* Category selector */}
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {['All', 'Video Lessons', 'Tech Blogs'].map((tab) => (
              <button
                key={tab}
                onClick={() => setSelectedAcademyTab(tab)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-medium transition-all ${
                  selectedAcademyTab === tab 
                    ? 'bg-[#0D47A1] text-white' 
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Videos Section */}
          {(selectedAcademyTab === 'All' || selectedAcademyTab === 'Video Lessons') && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5">
                <Play className="w-4.5 h-4.5 text-[#0D47A1] fill-[#0D47A1]/10" />
                <h3 className="text-xs font-semibold text-[#052355] uppercase tracking-wider">Video Lessons</h3>
              </div>

              <div className="flex flex-col gap-3">
                {!loading && videos.length === 0 && (
                  <p className="text-[11px] text-slate-400 font-normal">No video lessons published yet.</p>
                )}
                {videos.map((v) => (
                  <div
                    key={v.id}
                    onClick={() => v.url && setActiveVideo(v)}
                    className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-xs flex cursor-pointer hover:border-blue-400 transition-colors"
                  >
                    <div className="w-28 bg-slate-200 relative aspect-video flex-shrink-0 flex items-center justify-center">
                      <div className="absolute inset-0 bg-[#052355]/10 flex items-center justify-center">
                        <Play className="w-6 h-6 text-[#0D47A1] fill-[#0D47A1]/20" />
                      </div>
                    </div>
                    <div className="p-3 flex-1 flex flex-col justify-between">
                      <h4 className="text-xs font-semibold text-[#052355] line-clamp-2 leading-tight">{v.title}</h4>
                      <span className="text-[9px] text-slate-500 font-normal mt-1 block">
                        {[v.duration, v.category].filter(Boolean).join(' • ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Blogs Section */}
          {(selectedAcademyTab === 'All' || selectedAcademyTab === 'Tech Blogs') && (
            <div className="flex flex-col gap-3 mt-1">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5">
                <BookOpen className="w-4.5 h-4.5 text-[#0D47A1]" />
                <h3 className="text-xs font-semibold text-[#052355] uppercase tracking-wider">Technical Knowledge Blogs</h3>
              </div>

              <div className="flex flex-col gap-3">
                {!loading && blogs.length === 0 && (
                  <p className="text-[11px] text-slate-400 font-normal">No articles published yet.</p>
                )}
                {blogs.map((b, i) => (
                  <div
                    key={b.id}
                    onClick={() => setActiveBlogId(b.id)}
                    className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs cursor-pointer hover:border-blue-400 transition-colors"
                  >
                    {b.category && (
                      <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-md uppercase tracking-wider ${CATEGORY_TONE[i % CATEGORY_TONE.length]}`}>
                        {b.category}
                      </span>
                    )}
                    <h4 className="text-xs font-semibold text-[#052355] mt-2 leading-tight">{b.title}</h4>
                    <p className="text-[10px] text-slate-650 line-clamp-2 mt-1 leading-normal">{b.body}</p>
                    <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-100 text-[9px] text-slate-500">
                      <span>By {b.author || 'Nigam Care'}</span>
                      <span>{b.readTime || ''}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Academy;
