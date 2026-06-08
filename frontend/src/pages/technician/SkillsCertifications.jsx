import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Award, CheckCircle, Clock, Briefcase, ClipboardList, Calendar, Wrench, User } from 'lucide-react';

const skills = [
  { name: 'HVAC Installation & Repair', level: 'Expert', years: '5 yrs' },
  { name: 'Air Conditioning Service', level: 'Expert', years: '5 yrs' },
  { name: 'Refrigeration Systems', level: 'Advanced', years: '4 yrs' },
  { name: 'Electrical Wiring & Diagnosis', level: 'Advanced', years: '3 yrs' },
  { name: 'Washing Machine Repair', level: 'Intermediate', years: '2 yrs' },
];

const certifications = [
  { name: 'HVAC Excellence Certificate', issuer: 'NCC Skill Academy', date: 'Mar 2022', status: 'Active' },
  { name: 'Refrigeration Specialist', issuer: 'ASHRAE India', date: 'Aug 2021', status: 'Active' },
  { name: 'Electrical Safety Level 2', issuer: 'BEE India', date: 'Jan 2020', status: 'Active' },
  { name: 'AC Inverter Technology', issuer: 'LG Partner Program', date: 'Nov 2023', status: 'Active' },
];

const levelColor = {
  Expert: 'bg-[#E3ECF9] text-[#0D47A1]',
  Advanced: 'bg-green-50 text-green-700',
  Intermediate: 'bg-amber-50 text-amber-700',
};

const SkillsCertifications = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col pb-24 max-w-md mx-auto border-x border-slate-100 shadow-sm relative font-sans">

      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="p-1 hover:bg-slate-50 rounded-full text-slate-700 transition-colors">
          <ArrowLeft className="h-6 w-6 text-slate-700" />
        </button>
        <h1 className="text-base font-medium text-[#052355] flex-1 text-center pr-8">Skills & Certifications</h1>
      </div>

      {/* Content */}
      <div className="flex-1 p-3.5 flex flex-col gap-4">

        {/* Skills Section */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <h3 className="text-xs font-medium text-[#052355] mb-3 flex items-center gap-2">
            <Wrench className="h-4 w-4 text-[#0D47A1]" />
            My Skills
          </h3>
          <div className="flex flex-col gap-3">
            {skills.map((skill, i) => (
              <div key={i} className="flex items-center justify-between border-b border-slate-100 pb-3 last:border-b-0 last:pb-0">
                <div>
                  <p className="text-xs font-medium text-[#052355]">{skill.name}</p>
                  <p className="text-[10px] text-slate-500 font-normal mt-0.5">{skill.years} experience</p>
                </div>
                <span className={`text-[9px] font-medium px-2 py-0.5 rounded-full ${levelColor[skill.level]}`}>
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
            {certifications.map((cert, i) => (
              <div key={i} className="flex items-start justify-between border-b border-slate-100 pb-3 last:border-b-0 last:pb-0">
                <div className="flex-1 min-w-0 pr-2">
                  <p className="text-xs font-medium text-[#052355]">{cert.name}</p>
                  <p className="text-[10px] text-slate-500 font-normal mt-0.5">{cert.issuer}</p>
                  <p className="text-[10px] text-slate-400 font-normal flex items-center gap-1 mt-0.5">
                    <Clock className="h-3 w-3" /> Issued {cert.date}
                  </p>
                </div>
                <span className="text-[9px] font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-700 shrink-0 flex items-center gap-1 whitespace-nowrap">
                  <CheckCircle className="h-3 w-3" /> {cert.status}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-slate-200 py-3 px-3.5 flex justify-between items-center z-20 shadow-lg">
        <button onClick={() => navigate('/technician/dashboard')} className="flex flex-col items-center gap-1 text-slate-600 hover:text-slate-700 transition-all">
          <Briefcase className="h-6 w-6 stroke-[2]" />
          <span className="text-[10px] font-normal tracking-wide">Jobs</span>
        </button>
        <button onClick={() => navigate('/technician/raise-part-request?tab=claims')} className="flex flex-col items-center gap-1 text-slate-600 hover:text-slate-700 transition-all">
          <ClipboardList className="h-6 w-6 stroke-[2]" />
          <span className="text-[10px] font-normal tracking-wide">Requests</span>
        </button>
        <button onClick={() => navigate('/technician/inventory')} className="flex flex-col items-center gap-1 text-slate-600 hover:text-slate-700 transition-all">
          <Wrench className="h-6 w-6 stroke-[2]" />
          <span className="text-[10px] font-normal tracking-wide">Inventory</span>
        </button>
        <button onClick={() => navigate('/technician/schedule')} className="flex flex-col items-center gap-1 text-slate-600 hover:text-slate-700 transition-all">
          <Calendar className="h-6 w-6 stroke-[2]" />
          <span className="text-[10px] font-normal tracking-wide">Schedule</span>
        </button>
        <button onClick={() => navigate('/technician/profile')} className="flex flex-col items-center gap-1 text-[#0D47A1] transition-all">
          <User className="h-6 w-6 stroke-[2.5]" />
          <span className="text-[10px] font-medium tracking-wide">Profile</span>
        </button>
      </div>

    </div>
  );
};

export default SkillsCertifications;
