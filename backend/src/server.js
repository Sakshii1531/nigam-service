import { createApp } from './app.js';
import { connectDB, ensureIndexes } from './config/db.js';
import { registerAllModels } from './config/registerModels.js';
import { env } from './config/env.js';

async function main() {
  const modelCount = await registerAllModels();
  console.log(`[server] registered ${modelCount} models`);
  await connectDB();
  await ensureIndexes();

  const app = createApp();
  const server = app.listen(env.port, () => {
    console.log(`[server] listening on :${env.port} (${env.nodeEnv})`);
  });

  const shutdown = (signal) => {
    console.log(`[server] ${signal} received, shutting down`);
    server.close(() => process.exit(0));
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('[server] failed to start:', err);
  process.exit(1);
});
