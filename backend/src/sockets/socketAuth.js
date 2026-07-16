import { verifyAccessToken } from '../modules/auth/tokens.js';

/** Socket.IO connection middleware — same JWT the REST API uses, passed as
 * `socket.handshake.auth.token` (the client's equivalent of the Authorization
 * header). Rejects the connection outright on a missing/invalid token, mirroring
 * requireAuth's behavior for HTTP. */
export function socketAuth(socket, next) {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Missing auth token'));

  try {
    const payload = verifyAccessToken(token);
    socket.user = { id: payload.sub, role: payload.role, brand: payload.brand };
    next();
  } catch {
    next(new Error('Invalid or expired auth token'));
  }
}
