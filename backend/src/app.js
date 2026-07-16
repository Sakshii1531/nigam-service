import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env, isProd } from './config/env.js';
import { requestLogger } from './middleware/requestLogger.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { healthRouter } from './modules/health/health.routes.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { catalogRouter } from './modules/catalog/catalog.routes.js';
import { bookingRouter } from './modules/booking/booking.routes.js';
import { serviceRequestRouter } from './modules/service-requests/serviceRequest.routes.js';
import { productRouter } from './modules/buy-commerce/product.routes.js';
import { cartRouter } from './modules/buy-commerce/cart.routes.js';
import { wishlistRouter } from './modules/buy-commerce/wishlist.routes.js';
import { orderRouter } from './modules/buy-commerce/order.routes.js';
import { couponRouter } from './modules/rewards-loyalty/coupon.routes.js';
import { exchangeRouter } from './modules/warranty-amc-exchange/exchange.routes.js';
import { walletRouter } from './modules/payments-wallet/wallet.routes.js';
import { technicianRouter } from './modules/technician/technician.routes.js';
import { jobRouter } from './modules/technician/job.routes.js';
import { claimRouter as technicianClaimRouter } from './modules/technician/claim.routes.js';
import { inventoryRouter } from './modules/technician/inventory.routes.js';
import { earningsRouter } from './modules/technician/earnings.routes.js';
import { academyRouter } from './modules/technician/academy.routes.js';
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
  app.use('/api/v1/catalog', catalogRouter);
  app.use('/api/v1/bookings', bookingRouter);
  app.use('/api/v1/service-requests', serviceRequestRouter);
  app.use('/api/v1/products', productRouter);
  app.use('/api/v1/cart', cartRouter);
  app.use('/api/v1/wishlist', wishlistRouter);
  app.use('/api/v1/orders', orderRouter);
  app.use('/api/v1/coupons', couponRouter);
  app.use('/api/v1/exchange', exchangeRouter);
  app.use('/api/v1/wallet', walletRouter);
  app.use('/api/v1/tech/profile', technicianRouter);
  app.use('/api/v1/tech/jobs', jobRouter);
  app.use('/api/v1/tech/claims', technicianClaimRouter);
  app.use('/api/v1/tech/inventory', inventoryRouter);
  app.use('/api/v1/tech/earnings', earningsRouter);
  app.use('/api/v1/tech/academy', academyRouter);
  if (!isProd) app.use('/api/v1', devRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
