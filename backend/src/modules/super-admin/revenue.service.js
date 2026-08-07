import { Revenue } from './revenue.model.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { parsePagination, paginationMeta } from '../../utils/pagination.js';

// Aggregated commission/margin rows, one per source per period. Nothing writes
// these per-transaction — they are posted by a reporting job (or by hand from
// the console) and read back by Revenue.jsx.

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * `net` and `marginPercent` are always derived here, never taken from the
 * caller — otherwise a row could claim a margin its own gross/partnerShare
 * don't support, and the totals below would silently disagree with the rows.
 */
function deriveFigures(gross, partnerShare = 0) {
  if (partnerShare > gross) {
    throw new ApiError(400, 'Partner share cannot exceed gross revenue');
  }
  const net = round2(gross - partnerShare);
  // A zero-gross row has no meaningful margin; report 0 rather than dividing by zero.
  const marginPercent = gross === 0 ? 0 : round2((net / gross) * 100);
  return { net, marginPercent };
}

function buildQuery({ source, from, to }) {
  const query = {};
  if (source) query.source = source;
  // A row matches the window if its period overlaps it at all.
  if (from) query.periodEnd = { $gte: from };
  if (to) query.periodStart = { ...(query.periodStart || {}), $lte: to };
  return query;
}

export async function listRevenue({ source, from, to, page, limit, sort } = {}) {
  const query = buildQuery({ source, from, to });
  const { skip, limit: lim, page: pg, sort: sortObj } = parsePagination({ page, limit, sort });
  const [items, total] = await Promise.all([
    Revenue.find(query).sort(sortObj).skip(skip).limit(lim),
    Revenue.countDocuments(query),
  ]);
  return { items, meta: paginationMeta({ page: pg, limit: lim, total }) };
}

/** Totals across every row matching the filter — not just the current page. */
export async function getRevenueSummary({ source, from, to } = {}) {
  const query = buildQuery({ source, from, to });
  const [totals] = await Revenue.aggregate([
    { $match: query },
    {
      $group: {
        _id: null,
        gross: { $sum: '$gross' },
        partnerShare: { $sum: '$partnerShare' },
        net: { $sum: '$net' },
        rows: { $sum: 1 },
      },
    },
  ]);

  const gross = round2(totals?.gross || 0);
  const partnerShare = round2(totals?.partnerShare || 0);
  const net = round2(totals?.net || 0);

  return {
    gross,
    partnerShare,
    net,
    rows: totals?.rows || 0,
    // Blended margin over the whole filtered set, not an average of per-row margins.
    marginPercent: gross === 0 ? 0 : round2((net / gross) * 100),
  };
}

async function findOr404(id) {
  const row = await Revenue.findById(id);
  if (!row) throw new ApiError(404, 'Revenue record not found');
  return row;
}

export async function getRevenue(id) {
  return findOr404(id);
}

export async function createRevenue({ source, periodStart, periodEnd, gross, partnerShare = 0 }) {
  const { net, marginPercent } = deriveFigures(gross, partnerShare);
  return Revenue.create({ source, periodStart, periodEnd, gross, partnerShare, net, marginPercent });
}

export async function updateRevenue(id, updates) {
  const row = await findOr404(id);
  for (const field of ['source', 'periodStart', 'periodEnd']) {
    if (updates[field] !== undefined) row[field] = updates[field];
  }

  // Recompute whenever either input moves — changing gross alone must not leave
  // a stale net behind.
  const gross = updates.gross !== undefined ? updates.gross : row.gross;
  const partnerShare = updates.partnerShare !== undefined ? updates.partnerShare : row.partnerShare;
  const { net, marginPercent } = deriveFigures(gross, partnerShare);

  row.gross = gross;
  row.partnerShare = partnerShare;
  row.net = net;
  row.marginPercent = marginPercent;

  await row.save();
  return row;
}

export async function deleteRevenue(id) {
  const row = await findOr404(id);
  await row.deleteOne();
  return { deleted: true };
}
