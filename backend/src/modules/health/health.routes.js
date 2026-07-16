import { Router } from 'express';
import mongoose from 'mongoose';
import { ok } from '../../utils/respond.js';

export const healthRouter = Router();

healthRouter.get('/health', (req, res) => {
  const dbStates = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  ok(res, {
    status: 'up',
    uptimeSeconds: Math.round(process.uptime()),
    db: dbStates[mongoose.connection.readyState] || 'unknown',
    timestamp: new Date().toISOString(),
  });
});
