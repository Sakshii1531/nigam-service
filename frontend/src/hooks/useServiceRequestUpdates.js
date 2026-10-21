import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { getStoredTokens } from '../lib/apiClient';

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL?.replace('/api/v1', '') || 'http://localhost:4000';

// Refresh status filters and counts while an admin is watching a queue.
export function useServiceRequestUpdates(refresh) {
  useEffect(() => {
    const { accessToken } = getStoredTokens();
    if (!accessToken) return;
    refresh();
    const socket = io(SOCKET_URL, { auth: { token: accessToken }, transports: ['websocket'] });
    socket.on('connect', refresh);
    socket.on('service_request:updated', refresh);
    window.addEventListener('focus', refresh);
    // Also covers scoped ASM views and missed events during disconnection.
    const timer = window.setInterval(refresh, 15000);
    return () => {
      socket.disconnect();
      window.removeEventListener('focus', refresh);
      window.clearInterval(timer);
    };
  }, [refresh]);
}
