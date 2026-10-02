import http from 'node:http';
import { createApp } from './app.js';
import { connectDB, ensureIndexes } from './config/db.js';
import { registerAllModels } from './config/registerModels.js';
import { env } from './config/env.js';
import { initSockets } from './sockets/index.js';
import { sweepExpiredAssignments } from './modules/service-requests/serviceRequest.service.js';
import { expireStaleSearches } from './modules/booking/booking.service.js';
import { autoCloseCompletedClaims } from './modules/partner-warranty/partnerWarrantyJob.service.js';
import { runSlaSweep } from './modules/partner-warranty/claimSla.service.js';
import { runWebhookSweep } from './modules/partner-warranty/claimWebhooks.service.js';

async function main() {
  const modelCount = await registerAllModels();
  console.log(`[server] registered ${modelCount} models`);

  // Two things that silently lock everyone out of a hosted deployment if they
  // go unnoticed: the stub OTP provider only writes codes to this log, and the
  // fixed demo code is off unless explicitly configured.
  if (env.nodeEnv === 'production') {
    if (env.mockOtpCode) {
      console.warn('[server] WARNING: MOCK_OTP_CODE is set — a fixed OTP will be accepted for every login. Unset it once a real SMS provider is configured.');
    }
    if (env.otpProvider === 'stub' && !env.mockOtpCode) {
      console.warn('[server] WARNING: OTP_PROVIDER=stub in production and no MOCK_OTP_CODE — codes are only written to this log, so nobody can complete a login. Configure OTP_PROVIDER=smsindiahub (with SMSINDIAHUB_* credentials) or set MOCK_OTP_CODE for a demo deployment.');
    }
  }
  await connectDB();
  await ensureIndexes();

  const app = createApp();
  const httpServer = http.createServer(app);
  initSockets(httpServer);

  const server = httpServer.listen(env.port, () => {
    console.log(`[server] listening on :${env.port} (${env.nodeEnv}), Socket.IO attached`);
  });

  // Backstop for the per-assignment 60s dispatch timers, which don't survive a
  // restart, plus the 15-minute search cut-off. Runs once at boot (anything
  // that expired while we were down) and then every 15s.
  let sweeping = false;
  const runDispatchSweep = async () => {
    if (sweeping) return;
    sweeping = true;
    try {
      // Give up on searches past their window first, so the assignment sweep
      // doesn't pass those bookings on to yet another provider.
      const { expired } = await expireStaleSearches();
      if (expired) console.log(`[search-expiry] stopped searching for ${expired} booking(s) after 15 minutes`);
      const { passedOn } = await sweepExpiredAssignments();
      if (passedOn) console.log(`[dispatch-sweep] passed on ${passedOn} unanswered assignment(s)`);
    } catch (err) {
      console.warn('[dispatch-sweep] failed:', err.message);
    } finally {
      sweeping = false;
    }
  };
  runDispatchSweep();
  const sweepTimer = setInterval(runDispatchSweep, 15000);

  // Partner warranty: close claims whose service was completed but never
  // confirmed by the customer (docs/partner-warranty Phase 7). Hourly is plenty
  // for a 72-hour window.
  const runWarrantyAutoClose = () =>
    autoCloseCompletedClaims()
      .then(({ closed }) => closed && console.log(`[partner-warranty] auto-closed ${closed} completed claim(s)`))
      .catch((err) => console.warn('[partner-warranty] auto-close failed:', err.message));
  runWarrantyAutoClose();
  const warrantyTimer = setInterval(runWarrantyAutoClose, 60 * 60 * 1000);

  // Partner warranty SLA: warnings at 80 %, breaches at 100 % (Phase 9).
  let slaRunning = false;
  const runWarrantySla = async () => {
    if (slaRunning) return;
    slaRunning = true;
    try {
      const { warnings, breaches } = await runSlaSweep();
      if (warnings || breaches) console.log(`[partner-warranty] SLA sweep: ${warnings} warning(s), ${breaches} breach(es)`);
    } catch (err) {
      console.warn('[partner-warranty] SLA sweep failed:', err.message);
    } finally {
      slaRunning = false;
    }
  };
  runWarrantySla();
  const slaTimer = setInterval(runWarrantySla, 5 * 60 * 1000);

  // Brand CRM webhooks: deliver due events every minute (Phase 10).
  let webhooksRunning = false;
  const runWarrantyWebhooks = async () => {
    if (webhooksRunning) return;
    webhooksRunning = true;
    try {
      const { delivered, failed } = await runWebhookSweep();
      if (delivered || failed) console.log(`[partner-warranty] webhooks: ${delivered} delivered, ${failed} failed`);
    } catch (err) {
      console.warn('[partner-warranty] webhook sweep failed:', err.message);
    } finally {
      webhooksRunning = false;
    }
  };
  const webhookTimer = setInterval(runWarrantyWebhooks, 60 * 1000);

  const shutdown = (signal) => {
    console.log(`[server] ${signal} received, shutting down`);
    clearInterval(sweepTimer);
    clearInterval(warrantyTimer);
    clearInterval(slaTimer);
    clearInterval(webhookTimer);
    server.close(() => process.exit(0));
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('[server] failed to start:', err);
  process.exit(1);
});
