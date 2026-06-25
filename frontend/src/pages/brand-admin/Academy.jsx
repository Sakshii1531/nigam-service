import React, { useState } from 'react';
import Sidebar from '../../components/brand-admin/Sidebar';
import Topbar from '../../components/brand-admin/Topbar';
import { 
  Search, 
  Filter, 
  GraduationCap, 
  BookOpen, 
  Video, 
  FileText, 
  Plus, 
  Trash2, 
  X,
  UploadCloud,
  CheckCircle2,
  Users
} from 'lucide-react';

const Academy = () => {
  const [activeTab, setActiveTab] = useState('guides'); // 'guides' or 'courses'
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [newGuide, setNewGuide] = useState({ title: '', type: 'PDF', product: 'Smart TV' });
  const [successMessage, setSuccessMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [guides, setGuides] = useState([
    { id: 'GD-101', title: 'OLED TV Display Panel Assembly Guide', type: 'PDF', product: 'Smart TV', date: '12 May, 2026', downloads: 68 },
    { id: 'GD-102', title: 'Inverter Refrigerator Error Codes Sheet', type: 'PDF', product: 'Refrigerator', date: '10 May, 2026', downloads: 142 },
    { id: 'GD-103', title: 'Direct Drive Motor Repair Tutorial', type: 'Video', product: 'Washing Machine', date: '08 May, 2026', downloads: 95 },
  ]);

  const [courses, setCourses] = useState([
    { id: 'CRS-201', name: 'LG OLED Smart TV Expert Repair Course', modules: 6, testRequired: 'Yes', minScore: '85%', status: 'Active' },
    { id: 'CRS-202', name: 'Dual Inverter Compressor Servicing', modules: 4, testRequired: 'Yes', minScore: '80%', status: 'Active' },
    { id: 'CRS-203', name: 'Micro-controller board diagnostics', modules: 8, testRequired: 'No', minScore: 'N/A', status: 'Draft' },
  ]);

  const stats = [
    { title: 'Training Guides', value: (guides.length + 21).toString(), icon: <BookOpen size={20} />, color: 'bg-blue-600' },
    { title: 'Active Courses', value: courses.length.toString(), icon: <GraduationCap size={20} />, color: 'bg-indigo-600' },
    { title: 'Certified Techs', value: '86', icon: <Users size={20} />, color: 'bg-emerald-600' },
    { title: 'Completions', value: '312', icon: <CheckCircle2 size={20} />, color: 'bg-yellow-500' },
  ];

  const handleUploadSubmit = (e) => {
    e.preventDefault();
    if (!newGuide.title) return;
    const addedGuide = {
      id: `GD-${100 + guides.length + 1}`,
      title: newGuide.title,
      type: newGuide.type,
      product: newGuide.product,
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      downloads: 0
    };
    setGuides([addedGuide, ...guides]);
    setNewGuide({ title: '', type: 'PDF', product: 'Smart TV' });
    setShowUploadModal(false);
    setSuccessMessage('Training manual uploaded and made available on Technician Academy app!');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const deleteGuide = (id) => {
    const guide = guides.find(g => g.id === id);
    setGuides(guides.filter(g => g.id !== id));
    setSuccessMessage(`Guide "${guide ? guide.title : id}" deleted successfully.`);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const filteredGuides = guides.filter(g => 
    g.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    g.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
    g.product.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex relative">
      <Sidebar />

      <div className="flex-1 ml-64 min-h-screen flex flex-col relative">
        <Topbar title="Academy & Training Manuals" />

        <div className="p-6 space-y-6 flex-1">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((card, index) => (
              <div key={index} className="bg-white p-6 rounded-2xl border border-[#E2E8F0] flex items-center gap-4">
                <div className={`w-12 h-12 ${card.color} rounded-xl flex items-center justify-center text-white flex-shrink-0`}>
                  {card.icon}
                </div>
                <div>
                  <p className="text-xs font-medium text-[#64748B]">{card.title}</p>
                  <p className="text-2xl font-bold text-[#1E293B]">{card.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex border-b border-[#E2E8F0]">
            <button
              className={`px-6 py-3 text-sm font-bold transition-all border-b-2 -mb-[2px] ${
                activeTab === 'guides' 
                  ? 'border-[#0D47A1] text-[#0D47A1]' 
                  : 'border-transparent text-[#64748B] hover:text-[#1E293B]'
              }`}
              onClick={() => setActiveTab('guides')}
            >
              Guides & Manuals
            </button>
            <button
              className={`px-6 py-3 text-sm font-bold transition-all border-b-2 -mb-[2px] ${
                activeTab === 'courses' 
                  ? 'border-[#0D47A1] text-[#0D47A1]' 
                  : 'border-transparent text-[#64748B] hover:text-[#1E293B]'
              }`}
              onClick={() => setActiveTab('courses')}
            >
              Certification Courses
            </button>
          </div>

          {activeTab === 'guides' ? (
            <div className="space-y-6">
              {/* Filters & Upload button */}
              <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] flex flex-wrap gap-4 items-center justify-between">
                <div className="flex flex-wrap gap-3 items-center flex-1">
                  <div className="relative w-64">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#64748B]">
                      <Search size={16} />
                    </div>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] focus:border-[#0D47A1] outline-none transition-all text-sm bg-[#F8FAFC]"
                      placeholder="Search training manuals..."
                    />
                  </div>
                </div>

                <button 
                  onClick={() => setShowUploadModal(true)}
                  className="bg-[#0D47A1] text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"
                >
                  <UploadCloud size={16} /> Upload Manual
                </button>
              </div>

              {/* Guides List */}
              <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-[#F8FAFC] text-[#64748B] text-xs uppercase">
                      <tr>
                        <th className="px-6 py-4">ID</th>
                        <th className="px-6 py-4">Title</th>
                        <th className="px-6 py-4">Document Type</th>
                        <th className="px-6 py-4">Appliance Group</th>
                        <th className="px-6 py-4">Date Uploaded</th>
                        <th className="px-6 py-4">Technician Views</th>
                        <th className="px-6 py-4">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0]">
                      {filteredGuides.map((guide) => (
                        <tr key={guide.id} className="hover:bg-[#F8FAFC] transition-colors">
                          <td className="px-6 py-4 font-mono font-medium text-slate-655">{guide.id}</td>
                          <td className="px-6 py-4 font-medium text-[#1E293B]">{guide.title}</td>
                          <td className="px-6 py-4">
                            <span className="flex items-center gap-1.5 text-xs">
                              {guide.type === 'PDF' ? (
                                <FileText size={16} className="text-red-500" />
                              ) : (
                                <Video size={16} className="text-[#0D47A1]" />
                              )}
                              {guide.type}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-[#64748B]">{guide.product}</td>
                          <td className="px-6 py-4 text-[#64748B]">{guide.date}</td>
                          <td className="px-6 py-4 font-medium text-[#1E293B]">{guide.downloads} reads</td>
                          <td className="px-6 py-4">
                            <button 
                              onClick={() => deleteGuide(guide.id)}
                              className="text-slate-400 hover:text-red-655 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Courses Table */}
              <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-[#F8FAFC] text-[#64748B] text-xs uppercase">
                      <tr>
                        <th className="px-6 py-4">Course ID</th>
                        <th className="px-6 py-4">Course Name</th>
                        <th className="px-6 py-4">Modules Count</th>
                        <th className="px-6 py-4">Test Required</th>
                        <th className="px-6 py-4">Minimum Score</th>
                        <th className="px-6 py-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0]">
                      {courses.map((crs) => (
                        <tr key={crs.id} className="hover:bg-[#F8FAFC] transition-colors">
                          <td className="px-6 py-4 font-mono font-medium text-slate-655">{crs.id}</td>
                          <td className="px-6 py-4 font-bold text-[#1E293B]">{crs.name}</td>
                          <td className="px-6 py-4 font-medium text-[#1E293B]">{crs.modules} modules</td>
                          <td className="px-6 py-4 text-[#64748B]">{crs.testRequired}</td>
                          <td className="px-6 py-4 text-[#64748B]">{crs.minScore}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                              crs.status === 'Active' ? 'bg-green-50 text-green-600' : 'bg-yellow-50 text-yellow-600'
                            }`}>
                              {crs.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Upload Modal */}
        {showUploadModal && (
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm z-30 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-6 border-b border-[#E2E8F0] flex justify-between items-center">
                <h2 className="text-lg font-bold text-[#1E293B]">Upload Service Manual</h2>
                <button 
                  onClick={() => setShowUploadModal(false)}
                  className="text-[#64748B] hover:text-[#1E293B] p-2 hover:bg-[#F8FAFC] rounded-full"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleUploadSubmit} className="p-6 space-y-4 text-sm">
                <div>
                  <label className="text-xs font-semibold text-[#64748B] mb-1 block">Manual Title</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] outline-none text-slate-800"
                    placeholder="e.g. Smart LED Backlight Replacement Guide"
                    value={newGuide.title}
                    onChange={(e) => setNewGuide({ ...newGuide, title: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-[#64748B] mb-1 block">Document Type</label>
                    <select
                      className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] outline-none text-slate-800"
                      value={newGuide.type}
                      onChange={(e) => setNewGuide({ ...newGuide, type: e.target.value })}
                    >
                      <option>PDF</option>
                      <option>Video</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[#64748B] mb-1 block">Appliance Group</label>
                    <select
                      className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] outline-none text-slate-800"
                      value={newGuide.product}
                      onChange={(e) => setNewGuide({ ...newGuide, product: e.target.value })}
                    >
                      <option>Smart TV</option>
                      <option>Refrigerator</option>
                      <option>Washing Machine</option>
                      <option>Microwave</option>
                    </select>
                  </div>
                </div>

                {/* File Upload Input */}
                <div>
                  <label className="text-xs font-semibold text-[#64748B] mb-1 block">Select Manual File *</label>
                  <div className="border-2 border-dashed border-[#E2E8F0] rounded-xl p-4 flex flex-col items-center justify-center bg-[#F8FAFC] hover:bg-[#EEF4FF]/30 hover:border-[#0D47A1]/55 transition-all cursor-pointer relative">
                    <input 
                      type="file"
                      required
                      accept={newGuide.type === 'PDF' ? '.pdf' : 'video/*'}
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          showToast(`Selected file: ${file.name}`);
                        }
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <UploadCloud className="text-[#0D47A1] mb-1.5" size={24} />
                    <p className="text-xs font-bold text-[#1E293B]">Click to select manual file</p>
                    <p className="text-[10px] text-[#64748B] mt-0.5">
                      {newGuide.type === 'PDF' ? 'PDF document formats (Max 10MB)' : 'Video formats (Max 100MB)'}
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#E2E8F0] flex gap-3 justify-end text-sm">
                  <button 
                    type="button"
                    onClick={() => setShowUploadModal(false)}
                    className="bg-white text-[#64748B] border border-[#E2E8F0] px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-[#F8FAFC] transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="bg-[#0D47A1] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-1.5"
                  >
                    <UploadCloud size={14} /> Upload Manual
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Success Toast */}
        {successMessage && (
          <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2 animate-bounce">
            <CheckCircle2 className="h-4 w-4" />
            {successMessage}
          </div>
        )}
      </div>
    </div>
  );
};

export default Academy;
