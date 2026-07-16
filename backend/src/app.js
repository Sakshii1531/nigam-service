import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env, isProd } from './config/env.js';
import { requestLogger } from './middleware/requestLogger.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { healthRouter } from './modules/health/health.routes.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { devRouter } from './modules/shared/dev.routes.js';
import { LOCAL_UPLOAD_DIR, isS3Configured } from './modules/shared/fileUpload.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(
    cors({
      origin: env.corsOrigins,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(requestLogger);

  // Generous global ceiling; auth.routes.js applies a tighter one on top for its
  // brute-force-sensitive endpoints (login, OTP).
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 600,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  // Local-disk upload fallback only ever gets written to when S3 isn't configured
  // (fileUpload.js) — serving it statically here is a no-op otherwise.
  if (!isS3Configured) app.use('/uploads', express.static(LOCAL_UPLOAD_DIR));

  app.use('/api/v1', healthRouter);
  app.use('/api/v1/auth', authRouter);
  if (!isProd) app.use('/api/v1', devRouter);
  // Phase 4+: app.use('/api/v1/bookings', bookingRouter); etc., mounted here per module.

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
