import { useCallback, useEffect, useState } from 'react';
import { enablePush, getPermissionState } from '../lib/pushClient';

/**
 * Browser notification permission for the current device.
 *
 * Settings screens need this because a "Push Notifications" switch is really
 * two separate things wearing one control:
 *
 *   - a server-side preference ("this user wants push"), saved with the rest of
 *     the form, which is what actually gates delivery backend-side; and
 *   - a browser permission plus device token ("this device *can* receive"),
 *     which cannot be batched into a save — the permission prompt requires a
 *     user gesture, so it has to fire from the click itself.
 *
 * `denied` is the case worth designing for rather than papering over: once a
 * user blocks notifications, the page cannot prompt again. Only the browser's
 * own site settings can undo it, so the UI has to say that instead of leaving a
 * switch that silently refuses to move.
 */
export function usePushPermission() {
  const [permission, setPermission] = useState(getPermissionState);
  const [requesting, setRequesting] = useState(false);

  // Permission can change outside the page (browser site settings, another
  // tab). There is no universal event for it, so re-read on focus — cheap, and
  // it stops the UI insisting push is blocked after the user has just allowed it.
  useEffect(() => {
    const sync = () => setPermission(getPermissionState());
    window.addEventListener('focus', sync);
    return () => window.removeEventListener('focus', sync);
  }, []);

  /**
   * Prompt if needed, then register this device's token.
   *
   * Call directly from a click handler — `Notification.requestPermission()`
   * needs transient user activation, so anything that awaits first (a save
   * button that posts before asking) gets the prompt suppressed.
   *
   * Safe to call when permission is already granted: no prompt is shown, and it
   * re-registers the token, which is what makes this the recovery path for a
   * device whose token was pruned as stale.
   */
  const requestPush = useCallback(async () => {
    setRequesting(true);
    try {
      const result = await enablePush();
      setPermission(getPermissionState());
      return result;
    } finally {
      setRequesting(false);
    }
  }, []);

  return {
    permission,
    requesting,
    requestPush,
    isSupported: permission !== 'unsupported',
    isBlocked: permission === 'denied',
  };
}

/** Copy for the states where the switch cannot simply be turned on. */
export function pushBlockedMessage(permission) {
  if (permission === 'denied') {
    return 'Notifications are blocked for this site. Turn them back on in your browser settings, then reload.';
  }
  if (permission === 'unsupported') {
    return 'This browser cannot receive push notifications. On iPhone, add the app to your Home Screen first.';
  }
  return null;
}
