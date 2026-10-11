import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { getStoredTokens } from '../lib/apiClient';
const origin = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api/v1').replace(/\/api\/v1\/?$/, '');
export function useBrandDashboardLive(reload) {
  const handler = useRef(reload);
  useEffect(() => {
    handler.current = reload;
  });
  useEffect(() => {
    const {
      accessToken
    } = getStoredTokens('brand_admin');
    if (!accessToken) return undefined;
    const socket = io(origin, {
      auth: {
        token: accessToken
      },
      transports: ['websocket']
    });
    let timer;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => handler.current(), 2000);
    };
    const events = ['warranty_claim:updated', 'claim:updated', 'brand:billing_updated', 'brand:escalation_updated', 'connect'];
    for (const event of events) socket.on(event, refresh);
    const clock = setInterval(refresh, 60000);
    return () => {
      clearTimeout(timer);
      clearInterval(clock);
      for (const event of events) socket.off(event, refresh);
      socket.disconnect();
    };
  }, []);
}
