import { Booking } from '../booking/booking.model.js';
import { ServiceRequest } from '../service-requests/serviceRequest.model.js';
import { Job } from '../service-provider/job.model.js';
import { ServiceProvider } from '../service-provider/serviceProvider.model.js';
import { computeCharges } from '../shared/pricingEngine.js';
import { toPaise } from '../catalog/money.js';

// NCC gross service margin (docs/master-catalogue Phase 7, client Req 27).
//
// Source: completed bookings' frozen `commercial` snapshot plus their job's
// catalogue add-ons, spare parts and fixed partner payout. All sums are in
// paise, converted to rupees once at the end.
//
//   revenue (ex-GST)  = booking taxable + add-on taxable
//   margin            = revenue − partner payouts
//
// GST and spare parts are reported beside revenue, never inside it: GST is
// owed to the government, parts are goods, not service. Covered
// (warranty / AMC / EW) visits are a separate section: the customer paid
// nothing, so their payouts are a cost recoverable from the brand / plan.

const TZ = 'Asia/Kolkata';
const paise = (rupees) => toPaise(Number(rupees) || 0);
const rupees = (p) => Math.round(p) / 100;

const emptyTotals = () => ({
  jobs: 0,
  revenue: 0,
  discounts: 0,
  expressFees: 0,
  gstCollected: 0,
  sparePartsRevenue: 0,
  payouts: 0,
});

function finish(t) {
  const margin = t.revenue - t.payouts;
  return {
    jobs: t.jobs,
    revenue: rupees(t.revenue),
    discounts: rupees(t.discounts),
    expressFees: rupees(t.expressFees),
    gstCollected: rupees(t.gstCollected),
    sparePartsRevenue: rupees(t.sparePartsRevenue),
    payouts: rupees(t.payouts),
    margin: rupees(margin),
    marginPercent: t.revenue > 0 ? Math.round((margin / t.revenue) * 1000) / 10 : null,
  };
}

const SUMMED = Object.keys(emptyTotals());
function add(into, line) {
  for (const field of SUMMED) into[field] += line[field] || 0;
}

const dayOf = (date) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(date);

/** One completed booking → its margin line (paise). */
function lineFor(booking, job) {
  const c = booking.commercial;
  const addOns = (job?.additionalServices || []).filter((a) => a.checked !== false);
  const partsCost = job?.isD2C ? (job.spareParts || []).filter((p) => p.checked).reduce((sum, p) => sum + (p.price || 0), 0) : 0;
  const parts = partsCost ? computeCharges({ partsCost }) : null;
  return {
    jobs: 1,
    revenue: paise(c.taxableAmount) + addOns.reduce((sum, a) => sum + paise(a.taxableAmount), 0),
    discounts: paise(c.discount?.amount),
    expressFees: paise(c.expressFee),
    gstCollected:
      paise(c.gstAmount) + addOns.reduce((sum, a) => sum + paise(a.gstAmount), 0) + (parts ? paise(parts.total) - paise(partsCost) : 0),
    sparePartsRevenue: paise(partsCost),
    // The job's payout is authoritative (it carries add-on payouts); a
    // booking whose job record is gone still has its frozen payout.
    payouts: job?.payout?.total != null ? paise(job.payout.total) : paise(c.spPayoutTotal),
  };
}

function groupKey(groupBy, booking, job, partners) {
  const c = booking.commercial;
  switch (groupBy) {
    case 'offering':
      return { key: c.offeringCode || 'unknown', label: c.offeringName || c.offeringCode || 'Unknown offering' };
    case 'partner': {
      const id = job?.serviceProvider ? String(job.serviceProvider) : 'unassigned';
      return { key: id, label: partners.get(id) || 'Unassigned' };
    }
    case 'day': {
      const day = dayOf(booking.completedAt || booking.updatedAt);
      return { key: day, label: day };
    }
    default:
      return { key: c.category?.key || 'unknown', label: c.category?.name || c.category?.key || 'Unknown category' };
  }
}

/**
 * GET /super-admin/reports/margin?from=&to=&groupBy=&coverage=
 * `from` / `to` are completion dates (inclusive, IST days). Returns
 * { paid, covered } sections — each { groups: [...], totals } — or null for
 * a section the `coverage` filter excludes.
 */
export async function marginReport({ from, to, groupBy = 'category', coverage = 'all' } = {}) {
  const range = {};
  if (from) range.$gte = new Date(`${from}T00:00:00+05:30`);
  if (to) range.$lte = new Date(`${to}T23:59:59.999+05:30`);
  const filter = { status: 'Completed', 'commercial.offeringId': { $exists: true } };
  if (from || to) filter.completedAt = range;

  const bookings = await Booking.find(filter)
    .select('commercial completedAt updatedAt')
    .sort({ completedAt: 1 })
    .lean();
  const requests = await ServiceRequest.find({ booking: { $in: bookings.map((b) => b._id) } })
    .select('booking')
    .lean();
  const jobs = await Job.find({ serviceRequest: { $in: requests.map((r) => r._id) } })
    .select('serviceRequest serviceProvider isD2C payout additionalServices spareParts')
    .lean();
  const requestByBooking = new Map(requests.map((r) => [String(r.booking), String(r._id)]));
  const jobByRequest = new Map(jobs.map((j) => [String(j.serviceRequest), j]));

  const partners = new Map();
  if (groupBy === 'partner') {
    const ids = [...new Set(jobs.map((j) => String(j.serviceProvider)))];
    const docs = await ServiceProvider.find({ _id: { $in: ids } }).select('name').lean();
    for (const d of docs) partners.set(String(d._id), d.name);
  }

  const sections = { paid: new Map(), covered: new Map() };
  const totals = { paid: emptyTotals(), covered: emptyTotals() };
  for (const booking of bookings) {
    const section = booking.commercial.coverage?.type ? 'covered' : 'paid';
    if (coverage !== 'all' && coverage !== section) continue;
    const job = jobByRequest.get(requestByBooking.get(String(booking._id)));
    const line = lineFor(booking, job);
    const { key, label } = groupKey(groupBy, booking, job, partners);
    if (!sections[section].has(key)) sections[section].set(key, { key, label, ...emptyTotals() });
    add(sections[section].get(key), line);
    add(totals[section], line);
  }

  const build = (section) => {
    if (coverage !== 'all' && coverage !== section) return null;
    const groups = [...sections[section].values()].map(({ key, label, ...t }) => ({ key, label, ...finish(t) }));
    groups.sort((a, b) => (groupBy === 'day' ? a.key.localeCompare(b.key) : b.revenue - a.revenue || b.payouts - a.payouts));
    return { groups, totals: finish(totals[section]) };
  };
  return { from: from || null, to: to || null, groupBy, coverage, paid: build('paid'), covered: build('covered') };
}
