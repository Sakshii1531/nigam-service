import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, Briefcase, ClipboardList, Calendar, Wrench, User, Shield, Check } from 'lucide-react';
import TechBottomNav from '../../components/TechBottomNav';
import { apiRequest } from '../../lib/apiClient';

const TONE = {
  Verified: 'text-green-600 bg-green-50',
  Pending: 'text-amber-600 bg-amber-50',
  Rejected: 'text-rose-600 bg-rose-50',
};

const Verification = () => {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    apiRequest('/tech/profile/profile', { auth: true })
      .then((res) => {
        const v = res?.verification || {};
        setDocuments([
          { label: 'Aadhar Card', status: v.aadharStatus || 'Pending' },
          { label: 'PAN Card', status: v.panStatus || 'Pending' },
          { label: 'Criminal Background Check', status: v.backgroundCheckStatus || 'Pending' },
        ]);
      })
      .catch((err) => setError(err.message || 'Could not load your verification status.'));
  }, []);

  const allVerified = documents.length > 0 && documents.every((d) => d.status === 'Verified');


  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col pb-20 lg:pb-8 relative font-sans">

      {/* Mobile Top Header */}
      <div className="bg-white border-b border-slate-100 p-4 flex items-center justify-between sticky top-0 z-10 lg:hidden">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1 hover:bg-slate-50 rounded-full">
            <ArrowLeft className="h-6 w-6 text-slate-700" />
          </button>
          <h1 className="text-lg font-semibold text-slate-900">Verification</h1>
        </div>
        <button 
          onClick={() => navigate('/technician/notifications')}
          className="p-2 hover:bg-slate-50 rounded-full transition-colors relative"
        >
          <Bell className="h-5 w-5 text-slate-700" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>
      </div>

      {/* Desktop Page Top Header Bar (lg+ only) */}
      <div className="hidden lg:block max-w-screen-xl mx-auto w-full px-6 xl:px-8 pt-6 pb-2">
        <div className="flex items-center justify-between bg-white rounded-3xl p-5 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-3.5">
            <button
              onClick={() => navigate(-1)}
              className="p-2 bg-slate-100 hover:bg-slate-200 rounded-2xl text-[#052355] transition-colors cursor-pointer"
              title="Back"
            >
              <ArrowLeft className="h-5 w-5 stroke-[2.5]" />
            </button>
            <div>
              <h1 className="text-xl font-black text-[#052355] tracking-tight">KYC Verification</h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Government ID, trade credentials and background verification status</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 lg:px-6 xl:px-8 flex flex-col gap-4 max-w-screen-xl mx-auto w-full">

        {/* Status Header — reflects the technician's real verification record,
            which used to read "Verified Partner" for everyone. */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col items-center gap-2">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center ${allVerified ? 'bg-green-50' : 'bg-amber-50'}`}>
            <Shield className={`h-8 w-8 ${allVerified ? 'text-green-500' : 'text-amber-500'}`} />
          </div>
          <h2 className="text-lg font-semibold text-slate-900">
            {allVerified ? 'Verified Partner' : 'Verification In Progress'}
          </h2>
          <p className="text-xs text-slate-500 text-center">
            {allVerified
              ? 'Your documents are verified. You are eligible for premium jobs.'
              : 'Some documents are still being reviewed. You will be notified once they clear.'}
          </p>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 text-[11px] font-semibold text-rose-600">
            {error}
          </div>
        )}

        {/* Documents List */}
        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Submitted Documents</h3>

          <div className="flex flex-col gap-3">
            {documents.map((doc) => (
              <div key={doc.label} className="flex justify-between items-center border-b border-slate-50 pb-3 last:border-b-0 last:pb-0">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">{doc.label}</h4>
                  <p className="text-xs text-slate-500">
                    {doc.status === 'Verified' ? 'Verified by the platform' : doc.status === 'Rejected' ? 'Rejected — please re-submit' : 'Awaiting review'}
                  </p>
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${TONE[doc.status] || TONE.Pending}`}>
                  {doc.status === 'Verified' ? <Check className="h-3 w-3" /> : null}
                  {doc.status}
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

export default Verification;
