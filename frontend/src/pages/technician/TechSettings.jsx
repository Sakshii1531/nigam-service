import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Bell, Globe, Moon, Shield, Volume2, 
  HelpCircle, ChevronRight, Lock, Trash2, Smartphone, Check,
  Briefcase, ClipboardList, Calendar, Wrench, User, Eye, EyeOff
} from 'lucide-react';
import TechBottomNav from '../../components/TechBottomNav';
import { apiRequest } from '../../lib/apiClient';
import { usePushPermission, pushBlockedMessage } from '../../hooks/usePushPermission';

const Toggle = ({ enabled, onToggle, disabled = false }) => (
  <button
    onClick={onToggle}
    disabled={disabled}
    aria-pressed={enabled}
    className={`relative w-10 h-5 rounded-full transition-colors duration-200 shrink-0 ${
      disabled ? 'cursor-wait opacity-60' : ''
    } ${enabled ? 'bg-[#0D47A1]' : 'bg-slate-200'}`}
  >
    <span 
      className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200"
      style={{ left: enabled ? '22px' : '2px' }}
    />
  </button>
);

const TechSettings = () => {
  const navigate = useNavigate();

  // These were local-only state: a technician could switch push off, walk away,
  // come back and find it on again, and the server never heard about it either.
  // They now read and write the same /notifications/preferences the backend
  // actually gates delivery on.
  const [notifications, setNotifications] = useState(true);
  const [jobAlerts, setJobAlerts] = useState(true);
  const [prefsError, setPrefsError] = useState('');
  const [locationAccess, setLocationAccess] = useState(true);

  const { permission, requesting, requestPush } = usePushPermission();
  const pushUnavailable = pushBlockedMessage(permission);

  useEffect(() => {
    let cancelled = false;
    apiRequest('/notifications/preferences', { auth: true })
      .then((prefs) => {
        if (cancelled || !prefs) return;
        setNotifications(prefs.pushNotifications !== undefined ? Boolean(prefs.pushNotifications) : prefs.push !== false);
        setJobAlerts(prefs.bookingUpdates !== false);
      })
      .catch((err) => console.warn('[settings] could not load notification preferences:', err.message));
    return () => { cancelled = true; };
  }, []);

  /** No Save button on this screen, so each switch persists as it is flipped. */
  const savePrefs = useCallback(async (next) => {
    setPrefsError('');
    try {
      await apiRequest('/notifications/preferences', {
        method: 'PUT',
        auth: true,
        body: {
          pushNotifications: next.pushNotifications,
          push: next.pushNotifications,
          bookingUpdates: next.bookingUpdates,
        },
      });
      return true;
    } catch (err) {
      setPrefsError(err.message || 'Could not save notification settings.');
      return false;
    }
  }, []);

  /**
   * Turning push on has to obtain a browser permission and a device token, not
   * just flip a preference — and the prompt needs a user gesture, so it fires
   * from this click. Turning it off is preference-only: the backend gates
   * delivery on that, and tearing down the device registration would also cut
   * off any other account signed in on this handset.
   */
  const togglePush = async () => {
    if (notifications) {
      setNotifications(false);
      if (!(await savePrefs({ pushNotifications: false, bookingUpdates: jobAlerts }))) setNotifications(true);
      return;
    }

    if (pushUnavailable) {
      setPrefsError(pushUnavailable);
      return;
    }

    const result = await requestPush();
    if (!result.ok) {
      setPrefsError(
        pushBlockedMessage(result.reason === 'denied' ? 'denied' : permission) ||
          'Could not enable push notifications on this device.',
      );
      return;
    }

    setNotifications(true);
    if (!(await savePrefs({ pushNotifications: true, bookingUpdates: jobAlerts }))) setNotifications(false);
  };

  const toggleJobAlerts = async () => {
    const next = !jobAlerts;
    setJobAlerts(next);
    if (!(await savePrefs({ pushNotifications: notifications, bookingUpdates: next }))) setJobAlerts(!next);
  };

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
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col pb-20 lg:pb-8 relative font-sans">


      {/* Mobile Top Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center sticky top-0 z-10 lg:hidden">
        <button onClick={() => navigate(-1)} className="p-1 hover:bg-slate-50 rounded-full text-slate-700 transition-colors">
          <ArrowLeft className="h-6 w-6 text-slate-700" />
        </button>
        <h1 className="text-base font-medium text-[#052355] flex-1 text-center pr-8">Settings</h1>
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
              <h1 className="text-xl font-black text-[#052355] tracking-tight">App Settings</h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Preferences, push notifications, security and language configuration</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-3.5 lg:px-6 xl:px-8 flex flex-col gap-4 max-w-screen-xl mx-auto w-full">

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
                {/* A blocked permission cannot be re-prompted from the page, so
                    name the reason instead of leaving a switch that will not move. */}
                {pushUnavailable && (
                  <p className="text-[10px] text-amber-600 font-medium mt-1 leading-snug max-w-[200px]">{pushUnavailable}</p>
                )}
              </div>
              <Toggle enabled={notifications} onToggle={togglePush} disabled={requesting} />
            </div>
            <div className="h-[1px] bg-slate-100" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-[#052355]">Job Alerts</p>
                <p className="text-[10px] text-slate-500 font-normal mt-0.5">New job assignment alerts</p>
              </div>
              <Toggle enabled={jobAlerts} onToggle={toggleJobAlerts} />
            </div>
            {prefsError && (
              <p className="text-[10px] text-red-600 font-medium leading-snug">{prefsError}</p>
            )}
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
      <TechBottomNav activeTab="profile" />

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
