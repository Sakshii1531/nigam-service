import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env, isProd, isTest } from './config/env.js';
import { requestLogger } from './middleware/requestLogger.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { healthRouter } from './modules/health/health.routes.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { catalogRouter } from './modules/catalog/catalog.routes.js';
import { bookingRouter } from './modules/booking/booking.routes.js';
import { serviceRequestRouter } from './modules/service-requests/serviceRequest.routes.js';
import { applianceRouter } from './modules/service-requests/ownedAppliance.routes.js';
import { productRouter } from './modules/buy-commerce/product.routes.js';
import { cartRouter } from './modules/buy-commerce/cart.routes.js';
import { wishlistRouter } from './modules/buy-commerce/wishlist.routes.js';
import { orderRouter } from './modules/buy-commerce/order.routes.js';
import { couponRouter } from './modules/rewards-loyalty/coupon.routes.js';
import { exchangeRouter } from './modules/warranty-amc-exchange/exchange.routes.js';
import { walletRouter } from './modules/payments-wallet/wallet.routes.js';
import warrantyAmcRouter from './modules/warranty-amc-exchange/warrantyAmc.routes.js';
import { technicianRouter } from './modules/technician/technician.routes.js';
import { technicianRegistrationRouter } from './modules/technician/technicianRegistration.routes.js';
import { assistantRouter } from './modules/technician/assistant.routes.js';
import { jobRouter } from './modules/technician/job.routes.js';
import { claimRouter as technicianClaimRouter } from './modules/technician/claim.routes.js';
import { inventoryRouter } from './modules/technician/inventory.routes.js';
import { earningsRouter } from './modules/technician/earnings.routes.js';
import { academyRouter } from './modules/technician/academy.routes.js';
import { invoiceRouter } from './modules/brand-admin/invoice.routes.js';
import { rateCardRouter } from './modules/brand-admin/rateCard.routes.js';
import { replacementApprovalRouter } from './modules/brand-admin/replacementApproval.routes.js';
import { reverseLogisticsReturnRouter } from './modules/brand-admin/reverseLogisticsReturn.routes.js';
import { brandCatalogRouter } from './modules/brand-admin/brandCatalog.routes.js';
import { teamRouter } from './modules/brand-admin/team.routes.js';
import { brandRoleRouter } from './modules/brand-admin/brandRole.routes.js';
import { brandUserRouter } from './modules/brand-admin/brandUser.routes.js';
import { generatedDocumentRouter } from './modules/brand-admin/generatedDocument.routes.js';
import { brandEscalationRouter } from './modules/brand-admin/brandEscalation.routes.js';
import { brandInsightsRouter } from './modules/brand-admin/brandInsights.routes.js';
import { brandSettingsRouter } from './modules/brand-admin/brandSettings.routes.js';
import { brandAcademyRouter } from './modules/brand-admin/brandAcademy.routes.js';
import { brandRouter } from './modules/super-admin/brand.routes.js';
import { cityRouter } from './modules/super-admin/city.routes.js';
import { servicePartnerRouter } from './modules/super-admin/servicePartner.routes.js';
import { asmRouter } from './modules/super-admin/asm.routes.js';
import { assignmentWeightingRouter } from './modules/super-admin/assignmentWeighting.routes.js';
import { platformSettingsRouter } from './modules/super-admin/platformSettings.routes.js';
import { sparePartCatalogRouter } from './modules/super-admin/sparePartCatalog.routes.js';
import { escalationRouter } from './modules/super-admin/escalation.routes.js';
import { auditLogRouter } from './modules/super-admin/auditLog.routes.js';
import { liveTrackingRouter } from './modules/super-admin/liveTracking.routes.js';
import { cmsRouter } from './modules/super-admin/cms.routes.js';
import { homeTileRouter } from './modules/super-admin/homeTile.routes.js';
import { servicePageConfigRouter } from './modules/super-admin/servicePageConfig.routes.js';
import { categoryBookingConfigRouter } from './modules/super-admin/categoryBookingConfig.routes.js';
import { loyaltyConfigRouter } from './modules/super-admin/loyaltyConfig.routes.js';
import { platformRoleRouter } from './modules/super-admin/platformRole.routes.js';
import { platformUserRouter } from './modules/super-admin/platformUser.routes.js';
import { adminTechnicianRouter } from './modules/super-admin/adminTechnician.routes.js';
import { warrantyRegistrationRouter } from './modules/super-admin/warrantyRegistration.routes.js';
import { analyticsRouter } from './modules/super-admin/analytics.routes.js';
import { adminAmcRouter } from './modules/super-admin/adminAmc.routes.js';
import { revenueRouter } from './modules/super-admin/revenue.routes.js';
import { partnerPayoutRouter } from './modules/super-admin/partnerPayout.routes.js';
import { billingTransactionRouter } from './modules/super-admin/billingTransaction.routes.js';
import { gatewayTransactionRouter } from './modules/super-admin/gatewayTransaction.routes.js';
import { superAdminClaimRouter } from './modules/super-admin/claim.routes.js';
import { extendedWarrantyPlanRouter } from './modules/super-admin/extendedWarrantyPlan.routes.js';
import { adminOrderRouter } from './modules/super-admin/adminOrder.routes.js';
import { brandActionsRouter } from './modules/brand-admin/brandActions.routes.js';
import { uploadRouter } from './modules/shared/upload.routes.js';
import { membershipRouter } from './modules/rewards-loyalty/membership.routes.js';
import { superAdminExchangeRequestRouter } from './modules/super-admin/exchangeRequest.routes.js';
import { chatRouter } from './modules/chat/chat.routes.js';
import { notificationRouter } from './modules/notifications/notification.routes.js';
import { reviewRouter } from './modules/reviews/review.routes.js';
import { callRouter } from './modules/calls/call.routes.js';
import { devRouter } from './modules/shared/dev.routes.js';
import { LOCAL_UPLOAD_DIR, isFileStorageConfigured } from './modules/shared/fileUpload.js';

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
  // brute-force-sensitive endpoints (login, OTP). Skipped in NODE_ENV=test for the
  // same reason auth.routes.js's authRateLimit is: the E2E suite's total request
  // volume across ~15 spec files in one server process (each with heavy multi-step
  // fixture setup) now legitimately exceeds 600 requests inside a single test run,
  // well before 15 minutes elapse — found by the Phase 8 addition pushing the full
  // suite over the threshold for the first time (two tests failed with "Too many
  // requests" instead of their real assertions). This isn't a real request-volume
  // signal to test against; it's an artifact of Playwright reusing one long-lived
  // server process for the whole suite.
  if (!isTest) {
    app.use(
      rateLimit({
        windowMs: 15 * 60 * 1000,
        limit: 600,
        standardHeaders: true,
        legacyHeaders: false,
      }),
    );
  }

  // Local-disk upload fallback only ever gets written to when Cloudinary isn't configured
  // (fileUpload.js) — serving it statically here is a no-op otherwise.
  if (!isFileStorageConfigured) app.use('/uploads', express.static(LOCAL_UPLOAD_DIR));

  app.use('/api/v1', healthRouter);
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/catalog', catalogRouter);
  app.use('/api/v1/bookings', bookingRouter);
  app.use('/api/v1/service-requests', serviceRequestRouter);
  app.use('/api/v1/appliances', applianceRouter);
  app.use('/api/v1/products', productRouter);
  app.use('/api/v1/cart', cartRouter);
  app.use('/api/v1/wishlist', wishlistRouter);
  app.use('/api/v1/orders', orderRouter);
  app.use('/api/v1/coupons', couponRouter);
  app.use('/api/v1/exchange', exchangeRouter);
  app.use('/api/v1/wallet', walletRouter);
  app.use('/api/v1/tech/register', technicianRegistrationRouter);
  app.use('/api/v1/tech/profile', technicianRouter);
  app.use('/api/v1/tech/assistant', assistantRouter);
  app.use('/api/v1/tech/jobs', jobRouter);
  app.use('/api/v1/tech/claims', technicianClaimRouter);
  app.use('/api/v1/tech/inventory', inventoryRouter);
  app.use('/api/v1/tech/earnings', earningsRouter);
  app.use('/api/v1/tech/academy', academyRouter);
  app.use('/api/v1/brand/invoices', invoiceRouter);
  app.use('/api/v1/brand/rate-cards', rateCardRouter);
  app.use('/api/v1/brand/replacement-approvals', replacementApprovalRouter);
  app.use('/api/v1/brand/returns', reverseLogisticsReturnRouter);
  app.use('/api/v1/brand/catalog', brandCatalogRouter);
  app.use('/api/v1/brand/teams', teamRouter);
  app.use('/api/v1/brand/roles', brandRoleRouter);
  app.use('/api/v1/brand/users', brandUserRouter);
  app.use('/api/v1/brand/documents', generatedDocumentRouter);
  app.use('/api/v1/brand/escalations', brandEscalationRouter);
  app.use('/api/v1/brand/settings', brandSettingsRouter);
  app.use('/api/v1/brand/actions', brandActionsRouter);
  app.use('/api/v1/brand/academy', brandAcademyRouter);
  app.use('/api/v1/brand', brandInsightsRouter);
  app.use('/api/v1/super-admin/brands', brandRouter);
  app.use('/api/v1/super-admin/cities', cityRouter);
  app.use('/api/v1/super-admin/service-partners', servicePartnerRouter);
  app.use('/api/v1/super-admin/asms', asmRouter);
  app.use('/api/v1/super-admin/assignment-weighting', assignmentWeightingRouter);
  app.use('/api/v1/super-admin/settings', platformSettingsRouter);
  app.use('/api/v1/super-admin/spare-parts', sparePartCatalogRouter);
  app.use('/api/v1/super-admin/escalations', escalationRouter);
  app.use('/api/v1/super-admin/audit-logs', auditLogRouter);
  app.use('/api/v1/super-admin/tracking', liveTrackingRouter);
  app.use('/api/v1/super-admin/loyalty', loyaltyConfigRouter);
  app.use('/api/v1/super-admin/roles', platformRoleRouter);
  app.use('/api/v1/super-admin/users', platformUserRouter);
  app.use('/api/v1/super-admin/technicians', adminTechnicianRouter);
  app.use('/api/v1/super-admin/warranty-registrations', warrantyRegistrationRouter);
  app.use('/api/v1/super-admin/analytics', analyticsRouter);
  app.use('/api/v1/super-admin/amc', adminAmcRouter);
  app.use('/api/v1/super-admin/revenue', revenueRouter);
  app.use('/api/v1/super-admin/payouts', partnerPayoutRouter);
  app.use('/api/v1/super-admin/billing', billingTransactionRouter);
  app.use('/api/v1/super-admin/transactions', gatewayTransactionRouter);
  app.use('/api/v1/super-admin/claims', superAdminClaimRouter);
  app.use('/api/v1/super-admin/extended-warranty-plans', extendedWarrantyPlanRouter);
  app.use('/api/v1/super-admin/orders', adminOrderRouter);
  app.use('/api/v1/uploads', uploadRouter);
  app.use('/api/v1/memberships', membershipRouter);
  app.use('/api/v1/super-admin/exchange-requests', superAdminExchangeRequestRouter);
  app.use('/api/v1/warranty-amc', warrantyAmcRouter);
  app.use('/api/v1/cms', cmsRouter);
  app.use('/api/v1/cms/home-tiles', homeTileRouter);
  app.use('/api/v1/cms/service-pages', servicePageConfigRouter);
  app.use('/api/v1/cms/category-configs', categoryBookingConfigRouter);
  app.use('/api/v1/chat', chatRouter);
  app.use('/api/v1/notifications', notificationRouter);
  app.use('/api/v1/reviews', reviewRouter);
  app.use('/api/v1/calls', callRouter);
  if (!isProd) app.use('/api/v1', devRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
