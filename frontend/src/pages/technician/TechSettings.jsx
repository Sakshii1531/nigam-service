import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, Globe, Lock, Briefcase, ClipboardList, Calendar, Wrench, User, ChevronRight, Eye, EyeOff } from 'lucide-react';
import { apiRequest } from '../../lib/apiClient';

const Toggle = ({ enabled, onToggle }) => (
  <button
    onClick={onToggle}
    className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${enabled ? 'bg-[#0D47A1]' : 'bg-slate-200'}`}
  >
    <span 
      className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200"
      style={{ left: enabled ? '22px' : '2px' }}
    />
  </button>
);

const TechSettings = () => {
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState(true);
  const [jobAlerts, setJobAlerts] = useState(true);
  const [locationAccess, setLocationAccess] = useState(true);

  // Change Password Flow States
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col pb-24 max-w-md mx-auto border-x border-slate-100 shadow-sm relative font-sans">

      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="p-1 hover:bg-slate-50 rounded-full text-slate-700 transition-colors">
          <ArrowLeft className="h-6 w-6 text-slate-700" />
        </button>
        <h1 className="text-base font-medium text-[#052355] flex-1 text-center pr-8">Settings</h1>
      </div>

      {/* Content */}
      <div className="flex-1 p-3.5 flex flex-col gap-4">

        {/* Notifications Section */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <h3 className="text-xs font-medium text-[#052355] mb-3 flex items-center gap-2">
            <Bell className="h-4 w-4 text-[#0D47A1]" />
            Notifications
          </h3>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-[#052355]">Push Notifications</p>
                <p className="text-[10px] text-slate-500 font-normal mt-0.5">Receive app alerts</p>
              </div>
              <Toggle enabled={notifications} onToggle={() => setNotifications(p => !p)} />
            </div>
            <div className="h-[1px] bg-slate-100" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-[#052355]">Job Alerts</p>
                <p className="text-[10px] text-slate-500 font-normal mt-0.5">New job assignment alerts</p>
              </div>
              <Toggle enabled={jobAlerts} onToggle={() => setJobAlerts(p => !p)} />
            </div>
          </div>
        </div>

        {/* Privacy Section */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <h3 className="text-xs font-medium text-[#052355] mb-3 flex items-center gap-2">
            <Lock className="h-4 w-4 text-[#0D47A1]" />
            Privacy
          </h3>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-[#052355]">Location Access</p>
                <p className="text-[10px] text-slate-500 font-normal mt-0.5">Share location for jobs</p>
              </div>
              <Toggle enabled={locationAccess} onToggle={() => setLocationAccess(p => !p)} />
            </div>
            <div className="h-[1px] bg-slate-100" />
            <button 
              onClick={() => setIsChangingPassword(true)} 
              className="flex items-center justify-between w-full text-left"
            >
              <div>
                <p className="text-xs font-medium text-[#052355]">Change Password</p>
                <p className="text-[10px] text-slate-500 font-normal mt-0.5">Update your login password</p>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
            </button>
          </div>
        </div>

        {/* App Version */}
        <p className="text-[10px] text-slate-400 font-normal text-center">Partner App v2.4.1</p>

      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 py-3 px-3.5 flex justify-around items-center z-20 shadow-lg">
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

      {/* Change Password Drawer */}
      {isChangingPassword && (
        <div className="absolute inset-0 bg-[#F8FAFC] flex flex-col z-30 font-sans">
          {/* Header */}
          <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center sticky top-0 z-10">
            <button 
              onClick={() => {
                setIsChangingPassword(false);
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
                setErrorMsg('');
                setSuccessMsg('');
              }} 
              className="p-1 hover:bg-slate-50 rounded-full text-slate-700 transition-colors"
            >
              <ArrowLeft className="h-6 w-6 text-slate-700" />
            </button>
            <h1 className="text-base font-medium text-[#052355] flex-1 text-center pr-8">Change Password</h1>
          </div>

          {/* Form Content */}
          <div className="flex-1 p-4 flex flex-col justify-between">
            <div className="flex flex-col gap-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col gap-4">
                
                {/* Current Password */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Current Password</label>
                  <div className="relative">
                    <input
                      type={showCurrent ? 'text' : 'password'}
                      placeholder="Enter current password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#0D47A1] focus:ring-1 focus:ring-[#0D47A1] outline-none transition-all text-xs text-slate-800"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent(!showCurrent)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">New Password</label>
                  <div className="relative">
                    <input
                      type={showNew ? 'text' : 'password'}
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#0D47A1] focus:ring-1 focus:ring-[#0D47A1] outline-none transition-all text-xs text-slate-800"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Confirm New Password</label>
                  <div className="relative">
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#0D47A1] focus:ring-1 focus:ring-[#0D47A1] outline-none transition-all text-xs text-slate-800"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

              </div>

              {errorMsg && (
                <div className="text-red-500 text-xs font-medium px-1.5 mt-1">
                  {errorMsg}
                </div>
              )}

              {successMsg && (
                <div className="bg-[#E8F5E9] text-[#2E7D32] border border-[#A5D6A7] rounded-xl p-3 text-xs font-medium text-center">
                  {successMsg}
                </div>
              )}
            </div>

            <button
              onClick={async () => {
                if (!currentPassword || !newPassword || !confirmPassword) {
                  setErrorMsg('Please fill in all fields.');
                  setSuccessMsg('');
                  return;
                }
                if (newPassword !== confirmPassword) {
                  setErrorMsg('New password and confirmation do not match.');
                  setSuccessMsg('');
                  return;
                }
                if (newPassword.length < 6) {
                  setErrorMsg('New password must be at least 6 characters long.');
                  setSuccessMsg('');
                  return;
                }

                // Verified server-side against the current password; a wrong one
                // comes back 401 instead of the screen claiming success.
                try {
                  await apiRequest('/auth/password', {
                    method: 'PATCH',
                    auth: true,
                    body: { currentPassword, newPassword },
                  });
                } catch (err) {
                  setSuccessMsg('');
                  setErrorMsg(err.message || 'Could not update your password.');
                  return;
                }

                setErrorMsg('');
                setSuccessMsg('Password updated. You will need to sign in again on other devices.');
                setTimeout(() => {
                  setIsChangingPassword(false);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                  setSuccessMsg('');
                }, 1800);
              }}
              className="w-full bg-[#0D47A1] text-white font-medium py-3 rounded-xl hover:bg-[#0b3c8a] transition-all transform hover:-translate-y-0.5 mt-4 active:scale-95 shadow-sm"
            >
              Update Password
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default TechSettings;
