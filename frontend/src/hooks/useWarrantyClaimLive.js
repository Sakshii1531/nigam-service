import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { getStoredTokens } from '../lib/apiClient';

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL
  ? import.meta.env.VITE_API_BASE_URL.replace('/api/v1', '')
  : 'http://localhost:4000';

/**
 * Calls `onUpdate(payload)` whenever the server pushes `warranty_claim:updated`
 * (docs/partner-warranty Phase 7) — to a customer for their own claims, to a
 * brand's staff for that brand's, to super-admins for all. The payload is only
 * { id, humanId, status, customerStatusLabel, updatedAt }; screens refetch
 * through the API. It is also called ({ id, resync: true }) each time the
 * socket (re)connects. Pass `claimId` to hear about one claim only, and `portal`
 * ('customer' | 'brand_admin' | 'super_admin') for whose session to use.
 */
export function useWarrantyClaimLive(onUpdate, claimId = null, portal = 'customer') {
  const handler = useRef(onUpdate);
  useEffect(() => {
    handler.current = onUpdate;
  });

  useEffect(() => {
    const { accessToken } = getStoredTokens(portal);
    if (!accessToken) return undefined;
    const socket = io(SOCKET_URL, { auth: { token: accessToken }, transports: ['websocket'] });
    const listener = (payload) => {
      if (!claimId || payload?.id === claimId) handler.current(payload);
    };
    // A push sent before this socket joined its rooms (right after the screen
    // loaded, or during a reconnect) is lost; refetch once connected so the
    // screen can't sit on a stale status. Callers only refetch on update.
    const resync = () => handler.current({ id: claimId, resync: true });
    socket.on('warranty_claim:updated', listener);
    socket.on('connect', resync);
    return () => {
      socket.off('warranty_claim:updated', listener);
      socket.off('connect', resync);
      socket.disconnect();
    };
  }, [claimId, portal]);
}
