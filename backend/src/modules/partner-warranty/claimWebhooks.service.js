import crypto from 'node:crypto';
import dns from 'node:dns/promises';
import net from 'node:net';
import mongoose from 'mongoose';
import { DomainEvent, WARRANTY_EVENT_TYPES } from './domainEvent.model.js';
import { Brand } from '../super-admin/brand.model.js';
import { logAudit } from '../shared/auditLog.js';
import { emitToAdmins } from '../notifications/notification.service.js';
import { isProd } from '../../config/env.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { parsePagination, paginationMeta } from '../../utils/pagination.js';

// Brand CRM webhooks (docs/partner-warranty Phase 10, client #18). A brand
// registers an endpoint; the outbox (DomainEvent) is delivered to it as
// signed JSON POSTs, retried with backoff, then marked failed and reported.
// Payload format and signature verification: docs/partner-warranty/WEBHOOKS.md.

/** Minutes to wait after the 1st, 2nd … failed attempt; after the last, the event is failed. */
export const RETRY_DELAYS_MIN = Object.freeze([1, 5, 30, 120, 720]);
const TIMEOUT_MS = 10_000;

// ── SSRF guard ───────────────────────────────────────────────────────────────

function isPrivateAddress(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
  }
  const v6 = ip.toLowerCase();
  return v6 === '::1' || v6 === '::' || v6.startsWith('fc') || v6.startsWith('fd') || v6.startsWith('fe80') || v6.startsWith('::ffff:127.') || v6.startsWith('::ffff:10.') || v6.startsWith('::ffff:192.168.');
}

/**
 * A brand's URL must not let it make the server call internal services. In
 * production: https only, and the host must resolve to public addresses.
 * Outside production, http and loopback are allowed so a local receiver can
 * be tested.
 */
export async function assertWebhookUrlAllowed(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new ApiError(400, 'Webhook URL is not a valid URL');
  }
  if (!['https:', ...(isProd ? [] : ['http:'])].includes(parsed.protocol)) {
    throw new ApiError(400, 'Webhook URL must use https');
  }
  if (!isProd) return;
  let addresses;
  try {
    addresses = await dns.lookup(parsed.hostname, { all: true });
  } catch {
    throw new ApiError(400, 'Webhook host could not be resolved');
  }
  if (!addresses.length || addresses.some((a) => isPrivateAddress(a.address))) {
    throw new ApiError(400, 'Webhook host must be a public address');
  }
}

// ── Signing + delivery ───────────────────────────────────────────────────────

/** `sha256=` + hex HMAC of `${timestamp}.${body}` — see WEBHOOKS.md. */
export function signPayload(secret, timestamp, body) {
  return `sha256=${crypto.createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex')}`;
}

async function post(url, secret, event) {
  const body = JSON.stringify(event.payload);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const started = Date.now();
  try {
    await assertWebhookUrlAllowed(url); // DNS can change after the URL was saved
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'NCC-Webhooks/1.0',
        'X-NCC-Event': event.type,
        'X-NCC-Delivery': String(event._id),
        'X-NCC-Timestamp': timestamp,
        'X-NCC-Signature': signPayload(secret, timestamp, body),
      },
      body,
      redirect: 'manual', // a redirect could point anywhere; it counts as a failure
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return { ok: res.status >= 200 && res.status < 300, httpStatus: res.status, durationMs: Date.now() - started };
  } catch (err) {
    return { ok: false, error: err.name === 'TimeoutError' ? `Timed out after ${TIMEOUT_MS / 1000}s` : err.message, durationMs: Date.now() - started };
  }
}

/** One delivery attempt for one event. Returns the updated event. */
export async function deliverEvent(eventOrId, { now = new Date() } = {}) {
  const event = eventOrId._id ? eventOrId : await DomainEvent.findById(eventOrId);
  const brand = await Brand.findById(event.brand).select('name webhook.url webhook.enabled webhook.events +webhook.secret').lean();
  const hook = brand?.webhook;
  if (!hook?.enabled || !hook.url || !hook.secret) {
    event.status = 'skipped';
    event.lastError = 'Webhook not configured or disabled';
    await event.save();
    return event;
  }

  const result = await post(hook.url, hook.secret, event);
  event.attempts += 1;
  event.deliveries.push({ at: now, httpStatus: result.httpStatus, error: result.error, durationMs: result.durationMs });
  if (result.ok) {
    event.status = 'delivered';
    event.deliveredAt = now;
    event.lastError = null;
  } else {
    event.lastError = result.error || `HTTP ${result.httpStatus}`;
    const delay = RETRY_DELAYS_MIN[event.attempts - 1];
    if (delay === undefined || event.type === 'PING') {
      event.status = 'failed';
      if (event.type !== 'PING') {
        await emitToAdmins('warranty.webhook_failed', { brandName: brand.name, type: event.type, attempts: event.attempts, error: event.lastError });
      }
    } else {
      event.nextAttemptAt = new Date(now.getTime() + delay * 60 * 1000);
    }
  }
  await event.save();
  return event;
}

/** Delivers everything due. Run every minute from server.js. */
export async function runWebhookSweep({ now = new Date(), limit = 50 } = {}) {
  const due = await DomainEvent.find({ status: 'pending', nextAttemptAt: { $lte: now } }).sort({ nextAttemptAt: 1 }).limit(limit);
  const totals = { attempted: due.length, delivered: 0, failed: 0 };
  for (const event of due) {
    const done = await deliverEvent(event, { now });
    if (done.status === 'delivered') totals.delivered += 1;
    if (done.status === 'failed') totals.failed += 1;
  }
  return totals;
}

// ── Brand configuration ──────────────────────────────────────────────────────

function eventRow(e) {
  return {
    id: String(e._id),
    type: e.type,
    status: e.status,
    attempts: e.attempts,
    lastError: e.lastError || null,
    deliveredAt: e.deliveredAt || null,
    nextAttemptAt: e.status === 'pending' ? e.nextAttemptAt : null,
    claimTicket: e.payload?.claim?.ticket || null,
    createdAt: e.createdAt,
  };
}

export async function getWebhookConfig(brandId) {
  const brand = await Brand.findById(brandId).select('webhook.url webhook.enabled webhook.events +webhook.secret').lean();
  if (!brand) throw new ApiError(404, 'Brand not found');
  const recent = await DomainEvent.find({ brand: brandId, status: { $ne: 'skipped' } }).sort({ createdAt: -1 }).limit(20).lean();
  return {
    url: brand.webhook?.url || null,
    enabled: Boolean(brand.webhook?.enabled),
    events: brand.webhook?.events || [],
    availableEvents: WARRANTY_EVENT_TYPES,
    hasSecret: Boolean(brand.webhook?.secret),
    recentDeliveries: recent.map(eventRow),
  };
}

/**
 * Saves the brand's endpoint. A signing secret is generated the first time
 * (or on `rotateSecret`) and returned **once** — it is never readable again.
 */
export async function updateWebhookConfig(brandId, { url, enabled, events, rotateSecret }, actorId) {
  const brand = await Brand.findById(brandId).select('+webhook.secret');
  if (!brand) throw new ApiError(404, 'Brand not found');
  if (url !== undefined) {
    if (url) await assertWebhookUrlAllowed(url);
    brand.set('webhook.url', url || null);
  }
  if (events !== undefined) brand.set('webhook.events', events);
  if (enabled !== undefined) brand.set('webhook.enabled', enabled);
  if (brand.webhook?.enabled && !brand.webhook?.url) throw new ApiError(400, 'Set a webhook URL before enabling it');

  let secret = null;
  if (rotateSecret || !brand.webhook?.secret) {
    secret = crypto.randomBytes(32).toString('hex');
    brand.set('webhook.secret', secret);
  }
  await brand.save();
  await logAudit({
    user: actorId,
    type: 'Warranty',
    action: `Partner warranty: ${brand.name} webhook updated${secret ? ' (new signing secret issued)' : ''}`,
  });
  return { ...(await getWebhookConfig(brandId)), ...(secret ? { secret } : {}) };
}

/** Sends a PING right now and reports what happened — for the brand's "Test" button. */
export async function sendTestPing(brandId) {
  const _id = new mongoose.Types.ObjectId();
  const event = await DomainEvent.create({
    _id,
    type: 'PING',
    brand: brandId,
    payload: { id: String(_id), type: 'PING', occurredAt: new Date() },
  });
  const done = await deliverEvent(event);
  const last = done.deliveries.at(-1) || {};
  return { status: done.status, httpStatus: last.httpStatus ?? null, error: done.lastError || null, durationMs: last.durationMs ?? null };
}

// ── Super Admin ──────────────────────────────────────────────────────────────

export async function listDeliveries({ brand, status, type, page, limit } = {}) {
  const query = {};
  if (brand) query.brand = brand;
  if (status) query.status = status;
  if (type) query.type = type;
  const { skip, limit: lim, page: pg } = parsePagination({ page, limit });
  const [items, total] = await Promise.all([
    DomainEvent.find(query).populate('brand', 'name').sort({ createdAt: -1 }).skip(skip).limit(lim).lean(),
    DomainEvent.countDocuments(query),
  ]);
  return {
    items: items.map((e) => ({ ...eventRow(e), brand: e.brand?.name || null, deliveries: e.deliveries })),
    meta: paginationMeta({ page: pg, limit: lim, total }),
  };
}

/** Puts a failed/skipped event back in the queue and tries it now. */
export async function retryEvent(id, actorId) {
  const event = await DomainEvent.findById(id);
  if (!event) throw new ApiError(404, 'Event not found');
  if (event.status === 'delivered') throw new ApiError(409, 'Already delivered');
  event.status = 'pending';
  event.attempts = 0;
  event.nextAttemptAt = new Date();
  await event.save();
  await logAudit({ user: actorId, type: 'Warranty', action: `Partner warranty: retried webhook event ${event.type} (${id})` });
  return eventRow(await deliverEvent(event));
}
