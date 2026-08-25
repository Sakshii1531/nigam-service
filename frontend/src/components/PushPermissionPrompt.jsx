import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePushPermission, pushBlockedMessage } from '../hooks/usePushPermission';

// Module-level flag: shown once per app session (resets on full refresh).
let alreadyPrompted = false;

/**
 * "Enable notifications?" bottom sheet — the soft ask that precedes the real
 * browser prompt.
 *
 * The soft ask matters: a browser permission prompt can only be shown once,
 * and a denial is permanent from the page's side. Asking in our own UI first
 * means a user who is not interested taps "Not now" and can still be asked
 * again later, instead of burning the one real prompt this origin gets.
 *
 * "Allow" runs the actual registration. It previously posted
 * JSON.stringify(pushSubscription) as the device token, which is not what the
 * backend sends to: User.fcmTokens goes straight into FCM's
 * sendEachForMulticast, which needs an FCM registration token and rejects a
 * serialized Web Push subscription as invalid — so the "registered" device
 * received nothing, and the bogus entry was pruned on the next send. It now
 * goes through enablePush(), which mints a real token via getToken().
 *
 * Props: accent ('#0D47A1' default), title/subtitle overrides optional.
 */
const PushPermissionPrompt = ({
  accent = '#0D47A1',
  title = 'Stay in the loop',
  subtitle = 'Enable notifications to get service updates, arrival alerts and payment receipts.',
}) => {
  const { isAuthenticated } = useAuth();
  const { permission, requesting, requestPush } = usePushPermission();
  const [open, setOpen] = useState(false);

  // Only ask someone who is signed in (the token is registered against their
  // account) and who has never been asked — 'granted' needs nothing, and
  // 'denied' cannot be re-prompted from here, so opening the sheet for either
  // would just be a dead end. Once per session, so declining is not nagged at.
  useEffect(() => {
    if (!isAuthenticated || alreadyPrompted || permission !== 'default') return;
    alreadyPrompted = true;
    const timer = setTimeout(() => setOpen(true), 2500);
    return () => clearTimeout(timer);
  }, [isAuthenticated, permission]);

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

    const unavailable = pushBlockedMessage(permission);
    if (unavailable) {
      setError(unavailable);
      return;
    }

    // Fires the browser prompt and registers the resulting FCM token. Called
    // straight from the click because the prompt needs a user gesture.
    const result = await requestPush();
    if (result.ok) {
      close();
      return;
    }

    setError(
      result.reason === 'denied'
        ? 'Notifications stay off. You can turn them on later in your browser settings.'
        : pushBlockedMessage(permission) || 'Could not enable notifications on this device.',
    );
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
                disabled={requesting}
                className={`w-full text-white font-semibold py-3 rounded-2xl transition-transform active:scale-[0.98] ${
                  requesting ? 'opacity-60 cursor-wait' : ''
                }`}
                style={{ backgroundColor: accent }}
              >
                {requesting ? 'Enabling…' : 'Allow Notifications'}
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
