import { BillingLine } from './billingLine.model.js';
import { BrandRate, lockRates } from './brandRate.model.js';
import { resolveRate } from './rateResolver.js';
import { Brand } from '../super-admin/brand.model.js';
import { PlatformSettings } from '../super-admin/platformSettings.model.js';
import { PartOrder } from '../service-provider/partOrder.model.js';
import { ServiceRequest } from '../service-requests/serviceRequest.model.js';
import { User } from '../auth/user.model.js';
import { Notification } from '../notifications/notification.model.js';
import { loadBrandAccess } from './brandPermission.middleware.js';
import { appendEvent } from '../partner-warranty/claimTimeline.js';
import { toPaise, percentOf, toRupees } from '../catalog/money.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { runInTransaction } from '../../utils/transaction.js';
import { AuditLog } from '../super-admin/auditLog.model.js';
export function totalCharges(line) {
  const subtotal = toPaise(line.rate.amount) + line.parts.reduce((s, p) => s + toPaise(p.amount), 0) + line.otherCharges.reduce((s, p) => s + toPaise(p.amount), 0);
  line.subtotal = toRupees(subtotal);
  line.gstAmount = toRupees(percentOf(subtotal, line.gstPercent));
  line.total = toRupees(subtotal + toPaise(line.gstAmount));
  return line;
}
async function missingNotifications(claim, session) {
  const users = await User.find({
    status: 'Active',
    $or: [{
      role: 'super_admin'
    }, {
      role: 'brand_admin',
      brand: claim.brand?._id || claim.brand
    }]
  }).select('_id role').session(session).lean();
  for (const u of users) {
    if (u.role === 'brand_admin' && !(await loadBrandAccess(u._id))?.permissions.has('billing:view')) continue;
    await Notification.create([{
      recipient: u._id,
      brand: claim.brand?._id || claim.brand,
      warrantyClaim: claim._id,
      type: 'provider',
      title: 'Rate missing',
      message: `RATE_MISSING: ${claim.humanId} needs a billing rate.`,
      priority: 'High',
      cta: {
        label: 'View ticket',
        route: u.role === 'brand_admin' ? `/brand-admin/tickets/${claim._id}` : `/super-admin/warranty-claims/${claim._id}`
      }
    }], {
      session
    });
  }
}
/** Called inside the same transaction as the claim save; no external effects. */
export async function syncChargesForClaim(claim, {
  session = null
} = {}) {
  const events = claim.$locals.pendingAudit || [];
  const completed = events.some(e => e.action === 'JOB_STAGE_CHANGED' && e.meta?.stage === 'COMPLETED');
  const voiding = claim.status === 'Cancelled' || events.some(e => /REOPEN|JOB_REPLAC/.test(e.action) || e.toStatus === 'Job Created');
  if (completed || claim.$locals.customerNA) await lockRates(claim.brand?._id || claim.brand, session);
  let line = await BillingLine.findOne({
    brand: claim.brand?._id || claim.brand,
    ticket: claim._id,
    activeKey: String(claim._id)
  }).session(session);
  if (line && completed && line.serviceType === 'visit_only' && line.status !== 'invoiced') {
    line.status = 'void';
    line.voidReason = 'Visit-only charge superseded by completed service';
    line.activeKey = undefined;
    await line.save({
      session
    });
    line = null;
  }
  if (line && voiding) {
    if (line.status === 'invoiced') throw new ApiError(409, 'Invoiced charges require a credit before reopening or cancellation');
    line.status = 'void';
    line.voidReason = claim.status === 'Cancelled' ? 'Ticket cancelled' : 'Ticket reopened or job replaced';
    line.activeKey = undefined;
    await line.save({
      session
    });
    line = null;
  }
  let sr = null;
  const visitOnly = Boolean(claim.$locals.customerNA);
  if (visitOnly) sr = await ServiceRequest.findById(claim.serviceRequest?._id || claim.serviceRequest).session(session).lean();
  if (!line && !voiding && claim.coverageDecision && claim.serviceRequest && (completed || visitOnly)) {
    const brand = claim.brand?._id || claim.brand;
    const completedAt = visitOnly ? new Date() : claim.jobStageAt || new Date();
    const result = await resolveRate({
      brand,
      categoryId: claim.category?._id || claim.category,
      serviceType: claim.serviceType,
      state: claim.address.state,
      city: claim.address.city,
      at: completedAt,
      session
    });
    if (visitOnly && result.row?.visitOnlyRate == null) return;
    sr ||= await ServiceRequest.findById(claim.serviceRequest?._id || claim.serviceRequest).session(session).lean();
    const [b, settings, parts] = await Promise.all([Brand.findById(brand).select('billing').session(session).lean(), PlatformSettings.findOne().select('defaultGstPercent').session(session).lean(), visitOnly ? [] : PartOrder.find({
      brand,
      warrantyClaim: claim._id,
      serviceRequest: claim.serviceRequest?._id || claim.serviceRequest,
      payer: 'brand',
      status: 'Installed',
      'approval.brand.status': {
        $in: ['Approved', 'Not Required']
      }
    }).session(session).lean()]);
    const data = {
      brand,
      ticket: claim._id,
      serviceJob: sr?._id,
      ticketNo: claim.humanId,
      jobNo: sr?.humanId,
      state: claim.address.state,
      city: claim.address.city,
      categoryKey: claim.categoryKey,
      serviceType: visitOnly ? 'visit_only' : claim.serviceType,
      coverageDecision: claim.coverageDecision,
      completedAt,
      rate: {
        id: result.row?._id,
        amount: visitOnly ? result.row.visitOnlyRate : result.rate,
        matchedOn: result.matchedOn
      },
      parts: parts.map(p => ({
        partOrder: p._id,
        name: p.partName,
        partNumber: p.partNumber,
        qty: p.qty,
        amount: toRupees(toPaise(p.price || 0) * p.qty)
      })),
      otherCharges: [],
      gstPercent: b?.billing?.gstPercent ?? settings?.defaultGstPercent ?? 18,
      flags: result.matchedOn === 'missing' ? ['RATE_MISSING'] : [],
      activeKey: String(claim._id)
    };
    [line] = await BillingLine.create([totalCharges(data)], {
      session
    });
    claim.billingLine = line._id;
    if (result.row) await BrandRate.updateOne({
      _id: result.row._id,
      brand: claim.brand?._id || claim.brand
    }, {
      $inc: {
        usageCount: 1
      }
    }, {
      session
    });
    appendEvent(claim, {
      action: 'CHARGE_CAPTURED',
      actor: {
        kind: 'system',
        name: 'NCC'
      },
      visibility: 'brand',
      note: `Charges ₹${line.total.toFixed(2)}; matched on ${result.matchedOn}${result.row?.city ? `: ${result.row.city}` : result.row?.state ? `: ${result.row.state}` : ''}`,
      meta: {
        billingLine: String(line._id),
        amount: line.total,
        matchedOn: result.matchedOn
      }
    });
    if (result.matchedOn === 'missing') await missingNotifications(claim, session);
  }
  if (line && claim.status === 'Closed' && line.status === 'pending_closure') {
    line.status = 'billable';
    line.closedAt = claim.closedAt || new Date();
    await line.save({
      session
    });
  }
}
export async function ticketBilling(claim) {
  if (!claim.billingLine) return null;
  const line = await BillingLine.findOne({
    _id: claim.billingLine,
    brand: claim.brand?._id || claim.brand,
    ticket: claim._id
  }).populate('invoice', 'humanId status issuedAt').lean();
  if (!line) return null;
  delete line.activeKey;
  delete line.__v;
  return {
    ...line,
    id: String(line._id),
    invoiceNo: line.invoice?.humanId || null
  };
}
export async function addOtherCharge(id, actor, {
  label,
  amount,
  reason
}) {
  return runInTransaction(async session => {
    const line = await BillingLine.findById(id).session(session);
    if (!line) throw new ApiError(404, 'Billing line not found');
    if (['invoiced', 'void'].includes(line.status)) throw new ApiError(409, 'Cannot adjust an invoiced or void line');
    const previousCharges = line.otherCharges.map(c=>c.toObject()), previousTotal = line.total;
    line.otherCharges.push({
      label,
      amount,
      reason,
      addedBy: actor.user
    });
    totalCharges(line);
    await line.save({
      session
    });
    await AuditLog.create([{
      brand: line.brand,
      actor,
      user: actor.user,
      type: 'Finance',
      entityType: 'BillingLine',
      entityId: line._id,
      action: 'billing_line.charge_added',
      reason,
      meta: {
        changes: { otherCharges:[previousCharges,line.otherCharges.map(c=>c.toObject())], total:[previousTotal,line.total] },
        label,
        amount
      }
    }], {
      session
    });
    return line;
  });
}
