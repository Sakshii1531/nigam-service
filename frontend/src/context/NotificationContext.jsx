import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { apiRequest, getStoredTokens } from '../lib/apiClient';
import { onForegroundMessage } from '../lib/pushClient';

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL
  ? import.meta.env.VITE_API_BASE_URL.replace('/api/v1', '')
  : 'http://localhost:4000';

const NotificationContext = createContext(null);

/**
 * Live notification feed for the whole app.
 *
 * The backend has emitted `notification:new` over Socket.IO since Phase 9 —
 * into `user:<id>` for personal notifications and `broadcast:<audience>` for
 * role-wide ones — and nothing in the frontend ever listened. Every bell badge
 * and feed only refreshed on navigation, so a broadcast sent while someone had
 * the app open was invisible until they happened to reload.
 *
 * One connection for the whole app, not one per screen: the pages that already
 * open their own sockets do so for a specific conversation or tracking room,
 * whereas notifications are ambient and every screen wants them.
 */
export function NotificationProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [latest, setLatest] = useState(null);

  const subscribersRef = useRef(new Set());
  // A push that arrives while the tab is focused reaches us twice — once over
  // the socket, once from FCM's foreground handler. Same notification, two
  // transports, so dedupe on id rather than counting it twice.
  const seenIdsRef = useRef(new Set());

  /** Ask the server for the count rather than counting rows: the inbox is
   *  paginated, so a page of rows is not the total. limit=1 keeps it cheap. */
  const refreshUnread = useCallback(async () => {
    const { accessToken } = getStoredTokens();
    if (!accessToken) {
      setUnreadCount(0);
      return;
    }
    try {
      const res = await apiRequest('/notifications?read=false&limit=1', { auth: true, envelope: true });
      setUnreadCount(res?.meta?.total ?? 0);
    } catch (err) {
      console.warn('[notifications] could not load unread count:', err.message);
    }
  }, []);

  const handleIncoming = useCallback((notification) => {
    if (!notification) return;
    const id = notification.id || notification._id;

    if (id) {
      if (seenIdsRef.current.has(id)) return;
      seenIdsRef.current.add(id);
      // Bounded: this only guards against a duplicate arriving moments later,
      // so an unbounded set would be a slow leak for no extra benefit.
      if (seenIdsRef.current.size > 300) {
        seenIdsRef.current = new Set([...seenIdsRef.current].slice(-100));
      }
    }

    setUnreadCount((c) => c + 1);
    setLatest(notification);
    // A subscriber that throws must not stop the others from being told.
    subscribersRef.current.forEach((fn) => {
      try {
        fn(notification);
      } catch (err) {
        console.warn('[notifications] subscriber threw:', err.message);
      }
    });
  }, []);

  /** Feed screens call this to prepend live arrivals. Returns an unsubscribe. */
  const subscribe = useCallback((handler) => {
    subscribersRef.current.add(handler);
    return () => subscribersRef.current.delete(handler);
  }, []);

  /** Screens that mark things read call this so badges stay honest. */
  const markedRead = useCallback((count = 1) => {
    setUnreadCount((c) => Math.max(0, c - count));
  }, []);

  // ── Socket.IO: the in-app transport ────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) return undefined;

    // refreshUnread is async and its first statement is an await, so no state
    // is set synchronously here — the rule cannot see through the async
    // boundary and reports a cascade that does not happen.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshUnread();

    const { accessToken } = getStoredTokens();
    if (!accessToken) return undefined;

    const socket = io(SOCKET_URL, { auth: { token: accessToken }, transports: ['websocket'] });
    socket.on('notification:new', handleIncoming);
    // A dropped connection means missed events; recount rather than assume the
    // badge is still right.
    socket.on('reconnect', refreshUnread);
    socket.on('connect_error', (err) => console.warn('[notifications] socket error:', err.message));

    return () => {
      socket.off('notification:new', handleIncoming);
      socket.disconnect();
      // Signing out (or switching accounts) must not carry the previous user's
      // dedupe history into the next session.
      seenIdsRef.current = new Set();
    };
  }, [isAuthenticated, user?.id, handleIncoming, refreshUnread]);

  // ── FCM foreground: the same event, when the push beat the socket ──────────
  // FCM shows nothing itself while the tab is focused, so without this a push
  // received in-app would be silently dropped. Deduped against the socket above.
  useEffect(() => {
    if (!isAuthenticated) return undefined;
    return onForegroundMessage((payload) => {
      const data = payload?.data || {};
      handleIncoming({
        id: data.notificationId,
        title: payload?.notification?.title || data.title,
        message: payload?.notification?.body || data.body,
        broadcastRole: data.broadcastRole || null,
        createdAt: new Date().toISOString(),
        read: false,
      });
    });
  }, [isAuthenticated, handleIncoming]);

  // Zeroed at read time rather than by resetting state on logout: a signed-out
  // app has nothing to show, and clearing it in the effect body would make
  // every auth change cascade an extra render.
  const value = {
    unreadCount: isAuthenticated ? unreadCount : 0,
    latest: isAuthenticated ? latest : null,
    refreshUnread,
    subscribe,
    markedRead,
  };

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

/** Safe outside the provider — returns inert defaults rather than throwing, so
 *  a screen rendered in isolation still works. */
export function useNotifications() {
  return (
    useContext(NotificationContext) || {
      unreadCount: 0,
      latest: null,
      refreshUnread: () => {},
      subscribe: () => () => {},
      markedRead: () => {},
    }
  );
}

export default NotificationContext;
