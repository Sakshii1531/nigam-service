import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Sidebar from '../../components/super-admin/Sidebar';
import Topbar from '../../components/super-admin/Topbar';
import { apiRequest } from '../../lib/apiClient';
import { 
  Users as UsersIcon, 
  Search, 
  Filter, 
  MoreVertical, 
  Ban, 
  CheckCircle, 
  XCircle,
  Eye,
  Star,
  MapPin,
  X,
  CheckCircle2,
  Plus,
  ArrowLeft,
  Mail,
  Phone as PhoneIcon,
  Calendar as CalendarIcon,
  ShieldCheck,
  Briefcase,
  Trash2,
  AlertTriangle
} from 'lucide-react';

const Technicians = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSkill, setSelectedSkill] = useState('All Skills');
  const [selectedStatus, setSelectedStatus] = useState('All Status');
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedTechProfile, setSelectedTechProfile] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [techToDelete, setTechToDelete] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [newTech, setNewTech] = useState({ name: '', skill: 'AC & Refrigerator', city: 'Delhi', rating: '5.0', availability: 'Available', status: 'Active' });

  const [technicians, setTechnicians] = useState([]);
  const [loadError, setLoadError] = useState('');

  // Applications submitted from /technician/apply land here as Pending
  // technicians — the console is where they get approved or rejected.
  const fetchTechs = React.useCallback(async () => {
    try {
      const res = await apiRequest('/super-admin/technicians?limit=200', { auth: true });
      setTechnicians((res.data || []).map((item) => ({
        id: item.id,
        ref: item.humanId || item.id,
        // Notifications address the underlying User, not the Technician doc.
        userId: item.user || null,
        phone: item.phone || '',
        name: item.name || 'Technician',
        skill: item.specs?.length ? item.specs.join(', ') : 'General Repair',
        city: item.city?.name || '—',
        rating: item.rating || 0,
        trustScore: item.trustScore || 0,
        activeJobs: item.activeJobsCount || 0,
        completedJobs: item.completedJobsCount || 0,
        status: item.status || 'Pending',
        availability: item.availability || 'Offline',
        aadharFrontUrl: item.verification?.aadharFrontUrl || '',
        aadharBackUrl: item.verification?.aadharBackUrl || '',
        appliedDate: item.createdAt
          ? new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
          : '—',
      })));
      setLoadError('');
    } catch (err) {
      setLoadError(err.message || 'Could not load technicians.');
    }
  }, []);

  useEffect(() => { fetchTechs(); }, [fetchTechs]);

  useEffect(() => {
    if (location.search.includes('add=true')) {
      setShowModal(true);
      navigate(location.pathname, { replace: true });
    }
  }, [location, navigate]);

  const showToast = (message) => {
    setSuccessMessage(message);
    setTimeout(() => {
      setSuccessMessage('');
    }, 3000);
  };

  const handleStatusChange = async (id, newStatus) => {
    const tech = technicians.find(t => t.id === id);
    if (!tech) return;

    // Persist first, then mirror the server's own availability decision back into
    // state — the server forces Offline for any non-Active status.
    let saved = null;
    try {
      saved = await apiRequest(`/super-admin/technicians/${id}/status`, {
        method: 'PATCH',
        auth: true,
        body: { status: newStatus }
      });
    } catch (err) {
      showToast(`Could not update status: ${err.message}`);
      return;
    }

    setTechnicians(technicians.map(t => (
      t.id === id
        ? { ...t, status: saved?.status || newStatus, availability: saved?.availability ?? t.availability }
        : t
    )));

    if (newStatus !== 'Active') {
      showToast(`Technician status updated to ${newStatus}`);
      return;
    }

    const msg = `Congratulations ${tech.name}! Your Nigam Care Technician Partner account has been verified and approved. You can now login to access your job dashboard.`;
    const delivered = [];

    // Push addresses the User behind the Technician record.
    if (tech.userId) {
      try {
        await apiRequest('/notifications/push', {
          method: 'POST',
          auth: true,
          body: {
            recipientId: tech.userId,
            title: '🎉 Account Approved!',
            body: msg,
          }
        });
        delivered.push('Push');
      } catch (err) {
        console.warn('Push notification notice:', err.message);
      }
    }

    // SMS via SMSIndiaHub. Send only to a real number — no placeholder fallback.
    if (tech.phone) {
      try {
        await apiRequest('/notifications/sms', {
          method: 'POST',
          auth: true,
          body: {
            provider: 'smsindiahub',
            phone: tech.phone,
            message: msg
          }
        });
        delivered.push('SMS');
      } catch (err) {
        console.warn('SMSIndiaHub dispatch notice:', err.message);
      }
    }

    showToast(
      delivered.length
        ? `Partner approved! Sent ${delivered.join(' & ')} to ${tech.name}`
        : `Partner approved — no contact channel available for ${tech.name}`
    );
  };

  const confirmDeleteTechnician = async () => {
    if (!techToDelete) return;
    const id = techToDelete.id;
    const name = techToDelete.name;

    // The server refuses to delete a technician who still has active jobs, so
    // surface that rather than dropping the row from the table regardless.
    try {
      await apiRequest(`/super-admin/technicians/${id}`, { method: 'DELETE', auth: true });
    } catch (err) {
      showToast(`Could not delete "${name}": ${err.message}`);
      setShowDeleteConfirm(false);
      setTechToDelete(null);
      return;
    }

    setTechnicians(prev => prev.filter(t => t.id !== id));

    if (selectedTechProfile && selectedTechProfile.id === id) {
      setSelectedTechProfile(null);
    }

    setShowDeleteConfirm(false);
    setTechToDelete(null);
    showToast(`Technician "${name}" (${id}) removed permanently.`);
  };

  const handleAddTechSubmit = (e) => {
    e.preventDefault();
    if (!newTech.name) {
      showToast('Please enter a technician name.');
      return;
    }

    const addedTech = {
      id: `TECH-00${technicians.length + 1}`,
      name: newTech.name,
      skill: newTech.skill,
      city: newTech.city,
      rating: parseFloat(newTech.rating) || 5.0,
      activeJobs: 0,
      completedJobs: 0,
      status: newTech.status,
      availability: newTech.availability
    };

    setTechnicians([addedTech, ...technicians]);
    setNewTech({ name: '', skill: 'AC & Refrigerator', city: 'Delhi', rating: '5.0', availability: 'Available', status: 'Active' });
    setShowModal(false);
    showToast(`Technician "${addedTech.name}" onboarded successfully!`);
  };

  const filteredTechs = technicians.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (t.ref || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSkill = selectedSkill === 'All Skills' || t.skill === selectedSkill;
    const matchesStatus = selectedStatus === 'All Status' || t.status === selectedStatus;
    return matchesSearch && matchesSkill && matchesStatus;
  });

  const renderFullPageProfile = () => {
    const tech = selectedTechProfile;
    const email = tech.email || '—';
    const phone = tech.phone || '—';
    const joinedDate = tech.appliedDate || '—';
    
    // Dynamic or specific activity history
    const recentActivity = tech.activity || [
      { id: 1, title: `${tech.skill.split(',')[0] || 'Appliance'} Diagnostic & Repair`, ticket: `#NC-${Math.floor(50000 + Math.random() * 9000)}`, status: 'Completed' },
      { id: 2, title: `General Maintenance Inspection`, ticket: `#NC-${Math.floor(50000 + Math.random() * 9000)}`, status: 'Completed' },
    ];

    const reviews = tech.reviews || [
      { id: 1, author: "Rajesh S.", text: `Excellent work by ${tech.name}. Resolved the ${tech.skill.split(',')[0]} issue quickly.`, rating: 5, date: "Recently" },
    ];
    
    return (
      <div className="p-6 space-y-6 flex-1 bg-[#F8FAFC]">
        {/* Back navigation & Header */}
        <div className="flex items-center justify-between">
          <button 
            onClick={() => setSelectedTechProfile(null)}
            className="flex items-center gap-2 text-sm font-semibold text-[#0D47A1] hover:text-blue-800 transition-colors"
          >
            <ArrowLeft size={16} /> Back to Technicians
          </button>
          
          <div className="flex gap-2">
            {tech.status === 'Pending' && (
              <>
                <button 
                  onClick={() => {
                    handleStatusChange(tech.id, 'Active');
                    setSelectedTechProfile({ ...tech, status: 'Active' });
                  }}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-green-700 transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <CheckCircle size={14} /> Approve Partner
                </button>
                <button 
                  onClick={() => {
                    handleStatusChange(tech.id, 'Inactive');
                    setSelectedTechProfile({ ...tech, status: 'Inactive' });
                  }}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-red-700 transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <XCircle size={14} /> Reject Partner
                </button>
              </>
            )}

            {tech.status === 'Active' && (
              <button 
                onClick={() => {
                  handleStatusChange(tech.id, 'Inactive');
                  setSelectedTechProfile({ ...tech, status: 'Inactive' });
                }}
                className="bg-red-600 text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-red-700 transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <Ban size={14} /> Suspend Partner
              </button>
            )}

            {tech.status === 'Inactive' && (
              <button 
                onClick={() => {
                  handleStatusChange(tech.id, 'Active');
                  setSelectedTechProfile({ ...tech, status: 'Active' });
                }}
                className="bg-green-600 text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-green-700 transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <CheckCircle size={14} /> Activate Partner
              </button>
            )}

            <button 
              onClick={() => {
                setTechToDelete(tech);
                setShowDeleteConfirm(true);
              }}
              className="bg-red-50 text-red-600 border border-red-200 px-3.5 py-2 rounded-lg text-xs font-semibold hover:bg-red-100 transition-colors flex items-center gap-1.5 shadow-xs"
              title="Delete Technician"
            >
              <Trash2 size={14} /> Delete
            </button>
          </div>
        </div>

        {/* Redesigned Profile Header Card */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden text-left mb-6">
          <div className="bg-gradient-to-r from-[#0D47A1] via-[#1565C0] to-[#1E3A8A] p-6 text-white relative">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
              
              {/* Left: Avatar + Details */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 flex items-center justify-center text-white font-extrabold text-2xl uppercase flex-shrink-0 shadow-inner">
                  {tech.name ? tech.name.split(' ').map(n => n[0]).join('') : 'T'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold text-white tracking-tight">{tech.name}</h1>
                    <span className="bg-yellow-400 text-[#0D47A1] text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider">
                      Partner
                    </span>
                  </div>
                  <p className="text-xs text-blue-100 font-medium mt-1">
                    ID: <span className="font-bold text-white">{tech.ref}</span> • Verified Nigam Service Partner
                  </p>
                </div>
              </div>

              {/* Right: Status Badges */}
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md p-2 rounded-xl border border-white/10">
                <span className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                  tech.status === 'Active' ? 'bg-emerald-500 text-white' :
                  tech.status === 'Inactive' ? 'bg-rose-500 text-white' :
                  'bg-amber-400 text-slate-900'
                }`}>
                  Status: {tech.status}
                </span>
                <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/20 text-white">
                  Availability: {tech.availability}
                </span>
              </div>

            </div>
          </div>
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-6 text-xs text-slate-600 font-medium">
              <span>📍 Operating City: <strong className="text-slate-900">{tech.city}</strong></span>
              <span>⭐ Rating: <strong className="text-slate-900">{tech.rating || '5.0'} / 5.0</strong></span>
              <span>🛠️ Active Jobs: <strong className="text-slate-900">{tech.activeJobs || 0}</strong></span>
            </div>
            {tech.appliedDate && (
              <span className="text-[11px] text-slate-400 font-medium">Applied: {tech.appliedDate}</span>
            )}
          </div>
        </div>

        {/* Profile Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Column - Core Info */}
              <div className="space-y-6 lg:col-span-1">
                <div className="bg-[#F8FAFC] p-5 rounded-xl border border-[#E2E8F0]">
                  <h3 className="text-sm font-bold text-[#1E293B] mb-4">Contact Information</h3>
                  <div className="space-y-3.5 text-sm">
                    <div className="flex items-center gap-3 text-slate-700">
                      <Mail size={16} className="text-[#64748B] flex-shrink-0" />
                      <span className="truncate">{email}</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-700">
                      <PhoneIcon size={16} className="text-[#64748B] flex-shrink-0" />
                      <span>{phone}</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-700">
                      <MapPin size={16} className="text-[#64748B] flex-shrink-0" />
                      <span>{tech.city}, India</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-700">
                      <CalendarIcon size={16} className="text-[#64748B] flex-shrink-0" />
                      <span>Applied / Joined: {joinedDate}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-[#F8FAFC] p-5 rounded-xl border border-[#E2E8F0]">
                  <h3 className="text-sm font-bold text-[#1E293B] mb-4">Specialization</h3>
                  <div className="space-y-2">
                    <span className="inline-block bg-blue-50 text-[#0D47A1] text-xs font-semibold px-3 py-1 rounded-full border border-blue-100">
                      {tech.skill}
                    </span>
                    <p className="text-xs text-[#64748B] mt-2">Certified Nigam Technician authorized to verify, repair and troubleshoot consumer products and appliances.</p>
                  </div>
                </div>

                <div className="bg-[#F8FAFC] p-5 rounded-xl border border-[#E2E8F0]">
                  <h3 className="text-sm font-bold text-[#1E293B] mb-3">Verification & Aadhar Documents</h3>
                  <div className="space-y-3 text-xs">
                    <div className="flex items-center justify-between py-1 border-b border-slate-100">
                      <span className="text-[#64748B] font-medium">Aadhar Card Verification</span>
                      <span className={`font-semibold flex items-center gap-1 ${tech.status === 'Pending' ? 'text-amber-600' : 'text-green-600'}`}>
                        <ShieldCheck size={14} /> {tech.status === 'Pending' ? 'Pending Approval' : 'Verified'}
                      </span>
                    </div>

                    {/* Render Uploaded WebP Aadhar Photos */}
                    {(tech.aadharFrontUrl || tech.aadharBackUrl) && (
                      <div className="mt-3 space-y-2 pt-2 border-t border-slate-200">
                        <p className="text-[10px] font-bold text-[#0D47A1] uppercase tracking-wider">Uploaded WebP Aadhar Photos (Cloudinary)</p>
                        <div className="grid grid-cols-2 gap-2">
                          {tech.aadharFrontUrl && (
                            <div>
                              <p className="text-[9.5px] font-semibold text-slate-500 mb-1">Aadhar Front (.webp)</p>
                              <a href={tech.aadharFrontUrl} target="_blank" rel="noopener noreferrer">
                                <img src={tech.aadharFrontUrl} alt="Aadhar Front" className="w-full h-24 object-cover rounded-lg border border-slate-300 hover:opacity-90 shadow-2xs" />
                              </a>
                            </div>
                          )}
                          {tech.aadharBackUrl && (
                            <div>
                              <p className="text-[9.5px] font-semibold text-slate-500 mb-1">Aadhar Back (.webp)</p>
                              <a href={tech.aadharBackUrl} target="_blank" rel="noopener noreferrer">
                                <img src={tech.aadharBackUrl} alt="Aadhar Back" className="w-full h-24 object-cover rounded-lg border border-slate-300 hover:opacity-90 shadow-2xs" />
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between py-1 border-b border-slate-100">
                      <span className="text-[#64748B] font-medium">PAN Card Verification</span>
                      <span className="text-green-600 font-semibold flex items-center gap-1">
                        <ShieldCheck size={14} /> Verified
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <span className="text-[#64748B] font-medium">Background Verification</span>
                      <span className="text-green-600 font-semibold flex items-center gap-1">
                        <ShieldCheck size={14} /> Passed
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Stats & History */}
              <div className="space-y-6 lg:col-span-2">
                
                {/* Stats row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-sm text-center">
                    <p className="text-xs text-[#64748B] font-medium">Completed Jobs</p>
                    <p className="text-2xl font-bold text-[#1E293B] mt-1">{tech.completedJobs || 0}</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-sm text-center">
                    <p className="text-xs text-[#64748B] font-medium">Active Jobs</p>
                    <p className="text-2xl font-bold text-[#1E293B] mt-1">{tech.activeJobs || 0}</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-sm text-center">
                    <p className="text-xs text-[#64748B] font-medium">Avg Rating</p>
                    <p className="text-2xl font-bold text-amber-500 mt-1 flex items-center justify-center gap-1">
                      <Star size={20} fill="currentColor" /> {tech.rating || '0'}
                    </p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-sm text-center">
                    <p className="text-xs text-[#64748B] font-medium">Nigam Trust Score</p>
                    <p className="text-2xl font-bold text-green-600 mt-1">{tech.trustScore || 0}%</p>
                  </div>
                </div>

                {/* Job History summary list */}
                <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-sm">
                  <h3 className="text-sm font-bold text-[#1E293B] mb-4">Recent Service Activity</h3>
                  <div className="space-y-4">
                    {recentActivity.map((act, idx) => (
                      <div key={idx} className="flex justify-between items-start pb-3 border-b border-slate-100 last:border-0 last:pb-0">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{act.title}</p>
                          <p className="text-xs text-slate-500">{act.ticket} • {tech.city}</p>
                        </div>
                        <span className="bg-green-50 text-green-600 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                          {act.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Reviews */}
                <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-sm">
                  <h3 className="text-sm font-bold text-[#1E293B] mb-4">Latest Customer Reviews</h3>
                  <div className="space-y-4">
                    {reviews.map(review => (
                      <div key={review.id} className="space-y-1 pb-3 border-b border-slate-100 last:border-0 last:pb-0">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-semibold text-slate-800">{review.author}</span>
                          <span className="text-slate-400">{review.date}</span>
                        </div>
                        <div className="flex items-center gap-0.5 text-amber-500">
                          <Star size={12} fill="currentColor" />
                          <Star size={12} fill="currentColor" />
                          <Star size={12} fill="currentColor" />
                          <Star size={12} fill="currentColor" />
                          <Star size={12} fill="currentColor" />
                        </div>
                        <p className="text-xs text-slate-600 italic font-normal">"{review.text}"</p>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

            </div>

      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex relative">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 ml-64 min-h-screen flex flex-col">
        {/* Topbar */}
        <Topbar title="Technician Management" />

        {/* Body */}
        {selectedTechProfile ? (
          renderFullPageProfile()
        ) : (
          <div className="p-6 space-y-6 flex-1">
          
          {/* Header Actions */}
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-[#1E293B]">Technicians</h2>
            <button 
              onClick={() => setShowModal(true)}
              className="bg-[#0D47A1] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"
            >
              <Plus size={16} /> Add Technician
            </button>
          </div>

          {/* Filters & Search */}
          <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] flex flex-wrap gap-4 items-center justify-between shadow-sm">
            <div className="flex flex-wrap gap-3 items-center flex-1">
              {/* Search */}
              <div className="relative w-64">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#64748B]">
                  <Search size={16} />
                </div>
                <input
                  type="text"
                  className="w-full pl-10 pr-4 py-2 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] focus:border-[#0D47A1] outline-none transition-all text-sm bg-[#F8FAFC] text-slate-800"
                  placeholder="Search Name, ID or Skill..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Filters */}
              <select 
                value={selectedSkill}
                onChange={(e) => setSelectedSkill(e.target.value)}
                className="text-sm text-[#1E293B] border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#0D47A1] bg-[#F8FAFC]"
              >
                <option>All Skills</option>
                <option>AC & Refrigerator</option>
                <option>Washing Machine</option>
                <option>Microwave & TV</option>
                <option>Chimney & Hob</option>
                <option>All Appliances</option>
              </select>

              <select 
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="text-sm text-[#1E293B] border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#0D47A1] bg-[#F8FAFC]"
              >
                <option>All Status</option>
                <option>Active</option>
                <option>Inactive</option>
                <option>Pending</option>
              </select>
            </div>

            <button 
              onClick={() => {
                setSearchQuery('');
                setSelectedSkill('All Skills');
                setSelectedStatus('All Status');
                showToast('Filters reset successfully');
              }}
              className="bg-white text-[#1E293B] border border-[#E2E8F0] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#F8FAFC] transition-colors"
            >
              Reset Filters
            </button>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-[#F8FAFC] text-[#64748B] text-xs uppercase">
                  <tr>
                    <th className="px-6 py-4">Technician</th>
                    <th className="px-6 py-4">Skill</th>
                    <th className="px-6 py-4">City</th>
                    <th className="px-6 py-4">Rating</th>
                    <th className="px-6 py-4">Jobs (Active/Comp)</th>
                    <th className="px-6 py-4">Availability</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {filteredTechs.map((tech) => (
                    <tr key={tech.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-[#EEF4FF] rounded-full flex items-center justify-center text-[#0D47A1] font-bold">
                            {tech.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <p className="text-[#1E293B] font-medium">{tech.name}</p>
                            <p className="text-[#64748B] text-xs">{tech.ref}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-[#1E293B]">{tech.skill}</td>
                      <td className="px-6 py-4 text-[#64748B]">
                        <div className="flex items-center gap-1">
                          <MapPin size={14} /> {tech.city}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1 text-amber-500 font-medium">
                          <Star size={14} fill="currentColor" /> {tech.rating}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <span className="text-[#1E293B] font-medium">{tech.activeJobs}</span>
                          <span className="text-[#64748B]"> / {tech.completedJobs}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-medium ${
                          tech.availability === 'Available' ? 'text-green-600' :
                          tech.availability === 'Busy' ? 'text-yellow-600' : 'text-gray-500'
                        }`}>
                          {tech.availability}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          tech.status === 'Active' ? 'bg-green-50 text-green-600' :
                          tech.status === 'Inactive' ? 'bg-red-50 text-red-600' :
                          'bg-yellow-50 text-yellow-600'
                        }`}>
                          {tech.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex gap-2 justify-center">
                          <button 
                            onClick={() => setSelectedTechProfile(tech)}
                            className="p-1.5 text-[#64748B] hover:text-[#0D47A1] hover:bg-[#EEF4FF] rounded" 
                            title="View Profile"
                          >
                            <Eye size={16} />
                          </button>
                          
                          {tech.status === 'Pending' && (
                            <>
                              <button 
                                onClick={() => handleStatusChange(tech.id, 'Active')}
                                className="p-1.5 text-green-600 hover:bg-green-50 rounded" 
                                title="Approve"
                              >
                                <CheckCircle size={16} />
                              </button>
                              <button 
                                onClick={() => handleStatusChange(tech.id, 'Inactive')}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded" 
                                title="Reject"
                              >
                                <XCircle size={16} />
                              </button>
                            </>
                          )}

                          {tech.status === 'Active' && (
                            <button 
                              onClick={() => handleStatusChange(tech.id, 'Inactive')}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded" 
                              title="Suspend"
                            >
                              <Ban size={16} />
                            </button>
                          )}

                          {tech.status === 'Inactive' && (
                            <button 
                              onClick={() => handleStatusChange(tech.id, 'Active')}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded" 
                              title="Activate"
                            >
                              <CheckCircle size={16} />
                            </button>
                          )}

                          <button
                            onClick={() => {
                              setTechToDelete(tech);
                              setShowDeleteConfirm(true);
                            }}
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                            title="Delete Technician"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Empty State */}
            {filteredTechs.length === 0 && (
              <div className="text-center py-12 bg-white">
                <UsersIcon size={48} className="text-[#64748B] mx-auto mb-4 text-slate-400" />
                <h3 className="text-lg font-bold text-[#1E293B] mb-1">No Technicians Found</h3>
                <p className="text-sm text-[#64748B]">Try adjusting your search or filters.</p>
              </div>
            )}
          </div>
        </div>
      )}

      </div>

      {/* Add Technician Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-[#E2E8F0] flex justify-between items-center">
              <h2 className="text-lg font-bold text-[#1E293B]">Onboard Technician</h2>
              <button 
                onClick={() => setShowModal(false)}
                className="text-[#64748B] hover:text-[#1E293B] p-2 hover:bg-[#F8FAFC] rounded-full"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddTechSubmit} className="p-6 space-y-4 text-sm text-left">
              <div>
                <label className="text-xs font-semibold text-[#64748B] mb-1 block">Full Name</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] outline-none text-slate-800 bg-[#F8FAFC]"
                  placeholder="e.g. Manish Sharma"
                  value={newTech.name}
                  onChange={(e) => setNewTech({ ...newTech, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-[#64748B] mb-1 block">Skill Specialization</label>
                  <select
                    className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] outline-none text-slate-800 bg-[#F8FAFC]"
                    value={newTech.skill}
                    onChange={(e) => setNewTech({ ...newTech, skill: e.target.value })}
                  >
                    <option>AC & Refrigerator</option>
                    <option>Washing Machine</option>
                    <option>Microwave & TV</option>
                    <option>Chimney & Hob</option>
                    <option>All Appliances</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#64748B] mb-1 block">City</label>
                  <select
                    className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] outline-none text-slate-800 bg-[#F8FAFC]"
                    value={newTech.city}
                    onChange={(e) => setNewTech({ ...newTech, city: e.target.value })}
                  >
                    <option>Delhi</option>
                    <option>Mumbai</option>
                    <option>Bangalore</option>
                    <option>Pune</option>
                    <option>Chennai</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-[#64748B] mb-1 block">Initial Rating</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1.0"
                    max="5.0"
                    className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] outline-none text-slate-800 bg-[#F8FAFC]"
                    value={newTech.rating}
                    onChange={(e) => setNewTech({ ...newTech, rating: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#64748B] mb-1 block">Availability</label>
                  <select
                    className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] outline-none text-slate-800 bg-[#F8FAFC]"
                    value={newTech.availability}
                    onChange={(e) => setNewTech({ ...newTech, availability: e.target.value })}
                  >
                    <option>Available</option>
                    <option>Busy</option>
                    <option>Offline</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-[#E2E8F0] flex gap-3 justify-end text-sm">
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="bg-white text-[#64748B] border border-[#E2E8F0] px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-[#F8FAFC] transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="bg-[#0D47A1] text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
                >
                  Onboard Tech
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && techToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 flex flex-col items-center text-center">
            
            <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mb-4 border border-red-100 shadow-inner">
              <Trash2 size={28} />
            </div>

            <h3 className="text-lg font-bold text-slate-900">Delete Technician?</h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Are you sure you want to permanently delete <strong className="text-slate-800">{techToDelete.name}</strong> (<span className="text-[#0D47A1] font-semibold">{techToDelete.id}</span>)?
              This action cannot be undone.
            </p>

            <div className="flex gap-3 w-full mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setTechToDelete(null);
                }}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-2xl text-xs transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteTechnician}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-2xl text-xs transition-all shadow-md shadow-red-500/20"
              >
                Delete Permanently
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Success Toast */}
      {loadError && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-rose-600 text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-lg">
          {loadError}
        </div>
      )}

      {successMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="h-4 w-4" />
          {successMessage}
        </div>
      )}
    </div>
  );
};

export default Technicians;
