import mongoose from 'mongoose';

/**
 * Multi-document atomicity for the flows that write across collections.
 *
 * MongoDB only supports transactions on a replica set or a sharded cluster — a
 * standalone mongod rejects any operation carrying a transaction number. Local
 * development and the Jest suite both run against a standalone, so unguarded
 * `session.withTransaction(...)` would turn every booking into a hard failure
 * there while working fine in production (Atlas is always a replica set).
 *
 * So the topology is probed once and cached: where transactions are available
 * the callback runs inside one and rolls back as a unit, and where they aren't
 * it runs exactly as it did before this helper existed. Callers get the
 * stronger guarantee wherever the deployment can actually provide it, and
 * never a crash where it can't.
 */

let transactionSupport = null;

/** Exposed for tests — forces the next call to re-probe the live topology. */
export function resetTransactionSupportCache() {
  transactionSupport = null;
}

async function supportsTransactions() {
  if (transactionSupport !== null) return transactionSupport;

  try {
    // `hello` reports setName on a replica set member and msg "isdbgrid" on a
    // mongos. A standalone reports neither.
    const info = await mongoose.connection.db.admin().command({ hello: 1 });
    transactionSupport = Boolean(info?.setName || info?.msg === 'isdbgrid');
  } catch {
    // An unreachable admin command means we cannot prove transactions work;
    // assume they don't rather than fail the caller's real work over a probe.
    transactionSupport = false;
  }

  if (!transactionSupport) {
    console.warn(
      '[transaction] Standalone MongoDB detected — multi-document writes will run without a transaction. Use a replica set for atomic rollback.',
    );
  }
  return transactionSupport;
}

/**
 * Runs `fn(session)` inside a transaction when the deployment supports one,
 * otherwise runs `fn(null)` directly.
 *
 * The callback MUST thread the session it is handed into every write it makes
 * (`Model.create([doc], { session })`, `doc.save({ session })`, …) — a write
 * that omits it silently lands outside the transaction and will not roll back.
 * Keep external side effects (payment gateways, notifications, socket emits)
 * out of the callback: a transaction holds locks for its whole duration, and
 * anything already sent to a third party cannot be rolled back with it.
 */
export async function runInTransaction(fn) {
  if (!(await supportsTransactions())) return fn(null);

  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
}
