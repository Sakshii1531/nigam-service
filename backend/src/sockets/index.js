import { Server } from 'socket.io';
import { env } from '../config/env.js';
import { socketAuth } from './socketAuth.js';
import { registerChatGateway } from './chat.gateway.js';
import { registerTrackingGateway } from './tracking.gateway.js';
import { setIO } from './io.js';

export function initSockets(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (process.env.NODE_ENV !== 'production' && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
          return callback(null, true);
        }
        if (env.corsOrigins.includes(origin) || env.corsOrigins.includes('*')) {
          return callback(null, true);
        }
        callback(new Error(`Socket CORS origin ${origin} not allowed`));
      },
      credentials: true,
    },
  });

  io.use(socketAuth);

  // Every authenticated socket auto-joins its own notification room —
  // notification.service.js's emit() pushes here directly, no client-side
  // "subscribe to my notifications" step needed. Role-broadcast room too
  // (e.g. 'broadcast:All' for platform-wide announcements/escalations).
  io.on('connection', (socket) => {
    socket.join(`user:${socket.user.id}`);
    socket.join(`broadcast:All`);
  });

  registerChatGateway(io);
  registerTrackingGateway(io);

  setIO(io);
  return io;
}
