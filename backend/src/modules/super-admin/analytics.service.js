import { ServiceRequest } from '../service-requests/serviceRequest.model.js';
import { Technician } from '../technician/technician.model.js';
import { Escalation } from './escalation.model.js';
import { Revenue } from './revenue.model.js';
import { Order } from '../buy-commerce/order.model.js';
import { AMCSubscription } from '../warranty-amc-exchange/amcSubscription.model.js';
import { ExtendedWarrantyOrder } from '../warranty-amc-exchange/extendedWarrantyOrder.model.js';
import { City } from './city.model.js';
import { WalletLedger } from '../payments-wallet/walletLedger.model.js';
import { PlatformSettings } from './platformSettings.model.js';

// Platform-wide aggregates for super-admin's Dashboard and Reports.
//
// Everything here is counted from live collections rather than stored in a
// rollup table: at this data volume a handful of indexed counts is cheaper than
// keeping a summary in sync, and a stale dashboard is worse than a slow one.

const TERMINAL_STATUSES = ['Closed', 'Cancelled'];
const RESOLVED_ESCALATION = 'Resolved';

/** Turns [{_id, count}] into a plain object, with zeros for the keys asked for. */
function tally(rows, keys = []) {
  const out = Object.fromEntries(keys.map((k) => [k, 0]));
  for (const r of rows) out[r._id ?? 'Unknown'] = r.count;
  return out;
}

export async function getDashboard() {
  const [
    statusRows,
    availabilityRows,
    revenueRows,
    activeRequests,
    amcCustomers,
    extendedWarrantyCustomers,
    productOrders,
    openEscalations,
  ] = await Promise.all([
    ServiceRequest.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Technician.aggregate([{ $group: { _id: '$availability', count: { $sum: 1 } } }]),
    Revenue.aggregate([{ $group: { _id: null, gross: { $sum: '$gross' }, net: { $sum: '$net' } } }]),
    ServiceRequest.countDocuments({ status: { $nin: TERMINAL_STATUSES } }),
    AMCSubscription.countDocuments({ status: 'Active' }),
    ExtendedWarrantyOrder.countDocuments({ status: 'Active' }),
    Order.countDocuments(),
    Escalation.countDocuments({ scope: 'platform', status: { $ne: RESOLVED_ESCALATION } }),
  ]);

  const byStatus = tally(statusRows);

  return {
    // The five buckets the dashboard's donut renders, mapped from the API's
    // fifteen statuses so the chart doesn't have to know the state machine.
    requests: {
      open: byStatus.New || 0,
      assigned: byStatus.Assigned || 0,
      inProgress: Object.entries(byStatus)
        .filter(([s]) => !['New', 'Assigned', 'Closed', 'Cancelled'].includes(s))
        .reduce((sum, [, c]) => sum + c, 0),
      completed: byStatus.Closed || 0,
      cancelled: byStatus.Cancelled || 0,
      total: Object.values(byStatus).reduce((a, b) => a + b, 0),
    },
    technicians: tally(availabilityRows, ['Available', 'Busy', 'Offline']),
    // Revenue rows are posted by the reporting job; absent rows mean zero, not
    // "unknown" — the dashboard shows a figure either way.
    revenue: { gross: revenueRows[0]?.gross || 0, net: revenueRows[0]?.net || 0 },
    activeRequests,
    amcCustomers,
    extendedWarrantyCustomers,
    productOrders,
    openEscalations,
  };
}

/**
 * Reports break the same data down by dimension.
 *
 * Requests carry no city of their own — the location lives on the assigned
 * technician — so the city split necessarily excludes unassigned requests.
 * That's stated in the payload rather than left for the reader to guess.
 */
export async function getReports({ from, to } = {}) {
  const dateFilter = {};
  if (from) dateFilter.$gte = from;
  if (to) dateFilter.$lte = to;
  const match = Object.keys(dateFilter).length ? { createdAt: dateFilter } : {};

  const [byCategory, byStatus, revenueBySource, cityRows, unassigned] = await Promise.all([
    ServiceRequest.aggregate([
      { $match: match },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    ServiceRequest.aggregate([
      { $match: match },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Revenue.aggregate([
      { $group: { _id: '$source', gross: { $sum: '$gross' }, net: { $sum: '$net' } } },
      { $sort: { gross: -1 } },
    ]),
    ServiceRequest.aggregate([
      { $match: { ...match, technician: { $ne: null } } },
      { $lookup: { from: 'technicians', localField: 'technician', foreignField: '_id', as: 'tech' } },
      { $unwind: '$tech' },
      { $group: { _id: '$tech.city', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    ServiceRequest.countDocuments({ ...match, technician: null }),
  ]);

  const cities = await City.find({ _id: { $in: cityRows.map((r) => r._id).filter(Boolean) } })
    .select('name')
    .lean();
  const cityName = new Map(cities.map((c) => [String(c._id), c.name]));

  return {
    requestsByCategory: byCategory.map((r) => ({ label: r._id || 'Uncategorised', count: r.count })),
    requestsByStatus: byStatus.map((r) => ({ label: r._id, count: r.count })),
    revenueBySource: revenueBySource.map((r) => ({ label: r._id, gross: r.gross, net: r.net })),
    requestsByCity: cityRows.map((r) => ({
      label: r._id ? cityName.get(String(r._id)) || 'Unknown city' : 'No city on technician',
      count: r.count,
    })),
    // Excluded from requestsByCity above — surfaced so the totals reconcile.
    requestsWithoutTechnician: unassigned,
  };
}

/**
 * Daily gross/net for the dashboard's revenue trend, plus the change against the
 * immediately preceding window of the same length — which is what the "vs last
 * N days" caption actually claims.
 *
 * Revenue rows are periodised by the reporting job, so a row is attributed to
 * the day its period starts. Days with no row are returned as zero rather than
 * omitted: a gap in the series would otherwise render as a straight line
 * between two distant points and read as continuous revenue.
 */
// Day boundaries are computed in UTC because the buckets are keyed by
// $dateToString, which is UTC by default — mixing local setHours() with UTC
// keys drops "today" whenever the two dates differ (i.e. every evening in IST).
function windowFor(days) {
  const end = new Date();
  end.setUTCHours(23, 59, 59, 999);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  start.setUTCHours(0, 0, 0, 0);

  // The comparison window is the same length again, ending the day before `start`.
  const prevEnd = new Date(start);
  prevEnd.setUTCMilliseconds(-1);
  const prevStart = new Date(prevEnd);
  prevStart.setUTCDate(prevStart.getUTCDate() - (days - 1));
  prevStart.setUTCHours(0, 0, 0, 0);

  return { start, end, prevStart, prevEnd };
}

/** Fills the gaps so a day with no rows plots as zero rather than being skipped. */
function densify(rows, start, days, fields) {
  const byDay = Object.fromEntries(rows.map((r) => [r._id, r]));
  const points = [];
  for (let i = 0; i < days; i += 1) {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    const key = d.toISOString().slice(0, 10);
    const row = byDay[key] || {};
    points.push({ date: key, ...Object.fromEntries(fields.map((f) => [f, row[f] || 0])) });
  }
  return points;
}

/** Percent change, or null when the baseline is zero — growth from nothing is undefined. */
function changeAgainst(total, previousTotal) {
  if (previousTotal <= 0) return null;
  return Number((((total - previousTotal) / previousTotal) * 100).toFixed(1));
}

/**
 * Daily request volume for the dashboard's Request Trend bars, on the same
 * windowing as the revenue trend so the two charts always cover the same dates.
 */
export async function getRequestTrend({ days = 7 } = {}) {
  const { start, end, prevStart, prevEnd } = windowFor(days);

  const [rows, prevCount] = await Promise.all([
    ServiceRequest.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
    ]),
    ServiceRequest.countDocuments({ createdAt: { $gte: prevStart, $lte: prevEnd } }),
  ]);

  const points = densify(rows, start, days, ['count']);
  const total = points.reduce((sum, p) => sum + p.count, 0);

  return { days, points, total, previousTotal: prevCount, changePercent: changeAgainst(total, prevCount) };
}

export async function getRevenueTrend({ days = 7 } = {}) {
  const { start, end, prevStart, prevEnd } = windowFor(days);

  const dayKey = { $dateToString: { format: '%Y-%m-%d', date: { $ifNull: ['$periodStart', '$createdAt'] } } };

  const [rows, prevRows] = await Promise.all([
    Revenue.aggregate([
      { $match: { $expr: { $and: [
        { $gte: [{ $ifNull: ['$periodStart', '$createdAt'] }, start] },
        { $lte: [{ $ifNull: ['$periodStart', '$createdAt'] }, end] },
      ] } } },
      { $group: { _id: dayKey, gross: { $sum: '$gross' }, net: { $sum: '$net' } } },
    ]),
    Revenue.aggregate([
      { $match: { $expr: { $and: [
        { $gte: [{ $ifNull: ['$periodStart', '$createdAt'] }, prevStart] },
        { $lte: [{ $ifNull: ['$periodStart', '$createdAt'] }, prevEnd] },
      ] } } },
      { $group: { _id: null, gross: { $sum: '$gross' } } },
    ]),
  ]);

  const points = densify(rows, start, days, ['gross', 'net']);
  const total = points.reduce((sum, p) => sum + p.gross, 0);
  const previousTotal = prevRows[0]?.gross || 0;

  return { days, points, total, previousTotal, changePercent: changeAgainst(total, previousTotal) };
}

/**
 * Share of customers who have booked more than once — the "return rate" the
 * Reports page shows. Counted over customers with at least one request, since a
 * customer who has never booked can neither return nor fail to.
 */
export async function getRetention() {
  const rows = await ServiceRequest.aggregate([
    { $group: { _id: '$user', requests: { $sum: 1 } } },
    { $group: {
      _id: null,
      customers: { $sum: 1 },
      returning: { $sum: { $cond: [{ $gt: ['$requests', 1] }, 1, 0] } },
    } },
  ]);

  const customers = rows[0]?.customers || 0;
  const returning = rows[0]?.returning || 0;
  return {
    customers,
    returning,
    // Null rather than 0% when nobody has booked at all — those are different claims.
    returnRatePercent: customers ? Number(((returning / customers) * 100).toFixed(1)) : null,
  };
}

/**
 * Coins redeemed platform-wide, in rupees. Debits are stored as negative deltas,
 * so the sum is negated to give a positive "value redeemed".
 */
export async function getCoinRedemption() {
  const settings = await PlatformSettings.findOne();
  const rate = settings?.coinConversionRate || 10;

  const rows = await WalletLedger.aggregate([
    { $match: { reason: 'redeemed' } },
    { $group: { _id: null, coins: { $sum: '$delta' }, count: { $sum: 1 } } },
  ]);

  const coins = Math.abs(rows[0]?.coins || 0);
  return { coinsRedeemed: coins, valueRupees: Math.round(coins / rate), redemptions: rows[0]?.count || 0, conversionRate: rate };
}
