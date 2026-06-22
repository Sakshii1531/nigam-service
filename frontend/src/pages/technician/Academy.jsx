import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Award, Play, BookOpen, ChevronRight } from 'lucide-react';

const Academy = () => {
  const navigate = useNavigate();
  const [selectedAcademyTab, setSelectedAcademyTab] = useState('All');
  const [activeVideoUrl, setActiveVideoUrl] = useState(null);
  const [activeBlogId, setActiveBlogId] = useState(null);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col pb-24 max-w-md mx-auto border-x border-slate-200 shadow-xl relative font-sans overflow-hidden">
      {/* Header */}
      <div className="bg-[#052355] text-white px-4 py-3.5 flex items-center justify-between sticky top-0 z-10 shadow-md">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              if (activeBlogId !== null) {
                setActiveBlogId(null);
              } else if (activeVideoUrl !== null) {
                setActiveVideoUrl(null);
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

      {activeVideoUrl !== null ? (
        /* Mock Video Player Screen */
        <div className="flex-1 bg-black flex flex-col justify-between">
          {/* Video Player Box */}
          <div className="w-full aspect-video bg-slate-900 relative flex items-center justify-center border-b border-white/10 mt-auto mb-auto">
            <img 
              src={activeVideoUrl}
              alt="Video Thumbnail"
              className="w-full h-full object-cover opacity-80"
            />
            {/* Playing overlay */}
            <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center p-4">
              <div className="w-16 h-16 rounded-full bg-[#0D47A1] text-white flex items-center justify-center animate-pulse shadow-lg mb-4">
                <Play className="w-8 h-8 fill-white translate-x-0.5" />
              </div>
              <span className="text-sm font-medium text-white text-center">Streaming: Learning Course Video</span>
              <span className="text-xs text-slate-300 mt-1">1080p HD • Live Playback Simulated</span>
            </div>
          </div>
          <div className="bg-[#052355] p-5 text-left rounded-t-3xl border-t border-white/10 text-white">
            <span className="bg-[#00C853] text-[9px] font-semibold px-2 py-0.5 rounded-md uppercase tracking-wider">AC REPAIR COURSE</span>
            <h3 className="text-sm font-semibold mt-2">Professional Split AC Gas Charging & Leak Detection Methods</h3>
            <p className="text-xs text-slate-300 mt-1.5 font-normal leading-relaxed">
              In this module, senior trainer Inderjeet Singh demonstrates R32 and R410a gas charging techniques, manifold gauge operation, safety guidelines, and pressure checks.
            </p>
            <button
              onClick={() => setActiveVideoUrl(null)}
              className="mt-6 w-full py-3 bg-white text-[#052355] font-semibold text-xs rounded-xl text-center shadow-sm hover:bg-slate-100 transition-colors"
            >
              Close Player
            </button>
          </div>
        </div>
      ) : activeBlogId !== null ? (() => {
        const blog = [
          { id: 1, title: 'R32 Refrigerant Gas Safety Protocol', category: 'Safety Guide', readTime: '5 mins read', author: 'Safety HQ Team', desc: 'R32 is a mildly flammable (A2L) refrigerant. Ensure the following steps are met on-site:\n\n1. Ventilation: Never work in unventilated closed rooms. Open windows or use portable fans.\n2. Leak Test: Perform bubble leak tests or use electronic halogen leak detectors before power connection.\n3. Vacuuming: Use a dedicated vacuum pump to purge moisture and air to 500 microns. Never purge using refrigerant.\n4. Gear: Wear fire-resistant gloves and safety goggles during charging.' },
          { id: 2, title: 'Diagnostic Codes for Inverter Air Conditioners', category: 'Troubleshooting', readTime: '8 mins read', author: 'Technical Support Head', desc: 'Inverter ACs communicate error codes via LED blinks on the outdoor board or codes on the display:\n\n- E1: Indoor & Outdoor Communication Fault. Check connection cable contacts and terminal block.\n- E6: Fan Motor Error. Verify fan capacitor and motor resistance.\n- F1: Compressor Overcurrent Protection. Check refrigerant charge amount and starting capacitor voltage.\n- F5: Discharge Pipe Temperature sensor fault. Replace NTC thermistor.' },
          { id: 3, title: 'Customer Service & Communication Guide', category: 'Soft Skills', readTime: '4 mins read', author: 'Customer Service Lead', desc: 'Maximized ratings lead to higher incentive multipliers:\n\n1. Greeting: Smile and greet the customer. Keep your shoes outside or wear boot covers.\n2. Explanation: Show the customer the diagnosed issue before replacement (e.g. show high current draw or bad capacitor test on multimeter).\n3. Cleanliness: Post repair, clean any grease or dust around the appliance. Do not leave wire clippings.' }
        ].find(b => b.id === activeBlogId);
        
        return (
          <div className="flex-1 bg-white flex flex-col overflow-y-auto p-5 text-left">
            <span className="bg-[#0D47A1]/10 text-[#0D47A1] text-[9px] font-semibold px-2 py-0.5 rounded-md uppercase tracking-wider w-fit">{blog?.category}</span>
            <h2 className="text-base font-semibold text-[#052355] mt-2.5 leading-tight">{blog?.title}</h2>
            <div className="flex justify-between items-center text-[10px] text-slate-500 font-normal mt-2 border-b border-slate-100 pb-3">
              <span>Author: {blog?.author}</span>
              <span>{blog?.readTime}</span>
            </div>
            <div className="text-xs text-slate-700 font-normal leading-relaxed whitespace-pre-line mt-4 flex-1">
              {blog?.desc}
            </div>
            <button
              onClick={() => setActiveBlogId(null)}
              className="mt-6 w-full py-3 bg-[#0D47A1] text-white font-semibold text-xs rounded-xl text-center shadow-sm hover:bg-[#0A3F91] transition-all"
            >
              Back to Learning Hub
            </button>
          </div>
        );
      })() : (
        /* Academy Hub List */
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5 bg-slate-50 pb-8 text-left">
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
                {/* Video 1 */}
                <div 
                  onClick={() => setActiveVideoUrl('https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=300&q=80')}
                  className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-xs flex cursor-pointer hover:border-blue-400 transition-colors"
                >
                  <div className="w-28 bg-slate-200 relative aspect-video flex-shrink-0 flex items-center justify-center">
                    <img 
                      src="https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=300&q=80" 
                      alt="Video Thumbnail" 
                      className="w-full h-full object-cover" 
                    />
                    <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
                      <Play className="w-6 h-6 text-white fill-white" />
                    </div>
                  </div>
                  <div className="p-3 flex-1 flex flex-col justify-between">
                    <h4 className="text-xs font-semibold text-[#052355] line-clamp-2 leading-tight">AC Gas Charging & Pressure Check</h4>
                    <span className="text-[9px] text-slate-500 font-normal mt-1 block">12 mins • 1.2k views</span>
                  </div>
                </div>

                {/* Video 2 */}
                <div 
                  onClick={() => setActiveVideoUrl('https://images.unsplash.com/photo-1621905252507-b354bc25edac?auto=format&fit=crop&w=300&q=80')}
                  className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-xs flex cursor-pointer hover:border-blue-400 transition-colors"
                >
                  <div className="w-28 bg-slate-200 relative aspect-video flex-shrink-0 flex items-center justify-center">
                    <img 
                      src="https://images.unsplash.com/photo-1621905252507-b354bc25edac?auto=format&fit=crop&w=300&q=80" 
                      alt="Video Thumbnail" 
                      className="w-full h-full object-cover" 
                    />
                    <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
                      <Play className="w-6 h-6 text-white fill-white" />
                    </div>
                  </div>
                  <div className="p-3 flex-1 flex flex-col justify-between">
                    <h4 className="text-xs font-semibold text-[#052355] line-clamp-2 leading-tight">Inverter AC PCB Board Diagnosis</h4>
                    <span className="text-[9px] text-slate-500 font-normal mt-1 block">18 mins • 850 views</span>
                  </div>
                </div>
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
                {/* Blog 1 */}
                <div 
                  onClick={() => setActiveBlogId(1)}
                  className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs cursor-pointer hover:border-blue-400 transition-colors"
                >
                  <span className="text-[9px] font-semibold text-[#00C853] bg-green-50 px-2 py-0.5 rounded-md uppercase tracking-wider">Safety Guide</span>
                  <h4 className="text-xs font-semibold text-[#052355] mt-2 leading-tight">R32 Refrigerant Gas Safety Protocol</h4>
                  <p className="text-[10px] text-slate-650 line-clamp-2 mt-1 leading-normal">Guidelines for charging flammable gases on-site and necessary vacuuming steps.</p>
                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-100 text-[9px] text-slate-500">
                    <span>By Safety HQ</span>
                    <span>5 mins read</span>
                  </div>
                </div>

                {/* Blog 2 */}
                <div 
                  onClick={() => setActiveBlogId(2)}
                  className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs cursor-pointer hover:border-blue-400 transition-colors"
                >
                  <span className="text-[9px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md uppercase tracking-wider">Troubleshooting</span>
                  <h4 className="text-xs font-semibold text-[#052355] mt-2 leading-tight">Diagnostic Codes for Inverter Air Conditioners</h4>
                  <p className="text-[10px] text-slate-650 line-clamp-2 mt-1 leading-normal">E1, E6, F1 error code quick reference guide for HVAC technicians on job.</p>
                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-100 text-[9px] text-slate-500">
                    <span>By Tech Lead</span>
                    <span>8 mins read</span>
                  </div>
                </div>

                {/* Blog 3 */}
                <div 
                  onClick={() => setActiveBlogId(3)}
                  className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs cursor-pointer hover:border-blue-400 transition-colors"
                >
                  <span className="text-[9px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md uppercase tracking-wider">Soft Skills</span>
                  <h4 className="text-xs font-semibold text-[#052355] mt-2 leading-tight">Customer Service & Communication Guide</h4>
                  <p className="text-[10px] text-slate-650 line-clamp-2 mt-1 leading-normal">Professional etiquette tips to maximize ratings and avoid customer complaints.</p>
                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-100 text-[9px] text-slate-500">
                    <span>By CS Lead</span>
                    <span>4 mins read</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Academy;
