import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Award, CheckCircle, Clock, Briefcase, ClipboardList, Calendar, Wrench, User } from 'lucide-react';
import TechBottomNav from '../../components/TechBottomNav';
import { apiRequest } from '../../lib/apiClient';

const levelColor = {
  Expert: 'bg-[#E3ECF9] text-[#0D47A1]',
  Advanced: 'bg-green-50 text-green-700',
  Intermediate: 'bg-amber-50 text-amber-700',
};

const SkillsCertifications = () => {
  const navigate = useNavigate();
  // Skills and certifications are part of the technician's own profile record.
  const [skills, setSkills] = useState([]);
  const [certifications, setCertifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiRequest('/tech/profile/profile', { auth: true })
      .then((res) => {
        setSkills((res?.skills || []).map((sk) => ({
          name: sk.name,
          level: sk.level,
          years: sk.years ? `${sk.years} yr${sk.years === 1 ? '' : 's'}` : null,
        })));
        setCertifications((res?.certifications || []).map((c) => ({
          name: c.name,
          issuer: c.issuer,
          date: c.date ? new Date(c.date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '—',
          status: c.status,
        })));
      })
      .catch((err) => setError(err.message || 'Could not load your profile.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col pb-20 lg:pb-8 relative font-sans">

      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="p-1 hover:bg-slate-50 rounded-full text-slate-700 transition-colors">
          <ArrowLeft className="h-6 w-6 text-slate-700" />
        </button>
        <h1 className="text-base font-medium text-[#052355] flex-1 text-center pr-8">Skills & Certifications</h1>
      </div>

      {error && (
        <div className="mx-4 mt-4 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 text-[11px] font-semibold text-rose-600">
          {error}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 p-3.5 flex flex-col gap-4">

        {/* Skills Section */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <h3 className="text-xs font-medium text-[#052355] mb-3 flex items-center gap-2">
            <Wrench className="h-4 w-4 text-[#0D47A1]" />
            My Skills
          </h3>
          <div className="flex flex-col gap-3">
            {!loading && skills.length === 0 && (
              <p className="text-[11px] text-slate-400 font-normal">No skills recorded yet.</p>
            )}
            {skills.map((skill, i) => (
              <div key={i} className="flex items-center justify-between border-b border-slate-100 pb-3 last:border-b-0 last:pb-0">
                <div>
                  <p className="text-xs font-medium text-[#052355]">{skill.name}</p>
                  {skill.years && <p className="text-[10px] text-slate-500 font-normal mt-0.5">{skill.years} experience</p>}
                </div>
                <span className={`text-[9px] font-medium px-2 py-0.5 rounded-full ${levelColor[skill.level] || 'bg-slate-100 text-slate-600'}`}>
                  {skill.level}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Certifications Section */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <h3 className="text-xs font-medium text-[#052355] mb-3 flex items-center gap-2">
            <Award className="h-4 w-4 text-[#0D47A1]" />
            Certifications
          </h3>
          <div className="flex flex-col gap-3">
            {!loading && certifications.length === 0 && (
              <p className="text-[11px] text-slate-400 font-normal">No certifications recorded yet.</p>
            )}
            {certifications.map((cert, i) => (
              <div key={i} className="flex items-start justify-between border-b border-slate-100 pb-3 last:border-b-0 last:pb-0">
                <div className="flex-1 min-w-0 pr-2">
                  <p className="text-xs font-medium text-[#052355]">{cert.name}</p>
                  <p className="text-[10px] text-slate-500 font-normal mt-0.5">{cert.issuer}</p>
                  <p className="text-[10px] text-slate-400 font-normal flex items-center gap-1 mt-0.5">
                    <Clock className="h-3 w-3" /> Issued {cert.date}
                  </p>
                </div>
                <span className={`text-[9px] font-medium px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1 whitespace-nowrap ${
                  cert.status === 'Verified' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                }`}>
                  {cert.status === 'Verified' ? <CheckCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                  {cert.status}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Bottom Navigation */}
      <TechBottomNav activeTab="profile" />

    </div>
  );
};

export default SkillsCertifications;
