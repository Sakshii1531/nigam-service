import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X } from 'lucide-react';
import { apiRequest } from '../lib/apiClient';

// Module-level flag: shown once per app session (resets on full refresh).
let alreadyPrompted = false;

/**
 * Reusable "Enable notifications?" bottom-sheet prompt. "Allow" asks the
 * browser for real permission and registers the resulting device token — it
 * used to just close the sheet, so a customer who tapped Allow received
 * nothing and had no way to tell.
 *
 * Props: accent ('#0D47A1' default), title/subtitle overrides optional.
 */
const PushPermissionPrompt = ({
  accent = '#0D47A1',
  title = 'Stay in the loop',
  subtitle = 'Enable notifications to get service updates, arrival alerts and payment receipts.',
}) => {
  // Completely disabled auto popup on page refresh/mount
  const [open, setOpen] = useState(false);

  // Lock background scroll when popup is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const [error, setError] = useState('');

  const close = () => setOpen(false);

  const allow = async () => {
    setError('');
    if (typeof Notification === 'undefined') {
      setError('This browser does not support notifications.');
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      setError('Notifications stay off. You can enable them later in your browser settings.');
      return;
    }

    // Web Push needs a service-worker subscription to produce a token; until
    // that is registered there is nothing to send to the server, so we do not
    // pretend a device was registered.
    try {
      const registration = await navigator.serviceWorker?.ready;
      const subscription = await registration?.pushManager?.getSubscription();
      if (subscription) {
        await apiRequest('/notifications/device-token', {
          method: 'POST',
          auth: true,
          body: { token: JSON.stringify(subscription) },
        });
      }
    } catch {
      // Permission is granted either way; a token-registration failure only
      // means this device won't receive pushes yet.
    }
    close();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
            className="fixed inset-0 bg-black/40 z-[90]"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[100] bg-white rounded-t-[28px] p-6 shadow-2xl max-w-md mx-auto"
          >
            <button onClick={close} className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 text-slate-400">
              <X className="h-5 w-5" />
            </button>

            <div className="flex flex-col items-center text-center gap-3">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: `${accent}1A` }}
              >
                <Bell className="h-8 w-8" style={{ color: accent }} />
              </div>
              <h2 className="text-lg font-bold text-slate-900">{title}</h2>
              <p className="text-sm text-slate-500 max-w-xs">{subtitle}</p>
            </div>

            <div className="flex flex-col gap-2.5 mt-6">
              <button
                onClick={allow}
                className="w-full text-white font-semibold py-3 rounded-2xl transition-transform active:scale-[0.98]"
                style={{ backgroundColor: accent }}
              >
                Allow Notifications
              </button>
              {error && <p className="text-[11px] font-semibold text-red-600 text-center">{error}</p>}
              <button onClick={close} className="w-full text-slate-500 font-semibold py-2.5 rounded-2xl hover:bg-slate-50">
                Not now
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default PushPermissionPrompt;
