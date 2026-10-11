import { getIO } from '../../sockets/io.js';
import mongoose from 'mongoose';
import { BrandInvoice } from './brandInvoice.model.js';
import { BrandPayment } from './brandPayment.model.js';
import { BillingLine } from './billingLine.model.js';
import { lockRates } from './brandRate.model.js';
import { Brand } from '../super-admin/brand.model.js';
import { PlatformSettings } from '../super-admin/platformSettings.model.js';
import { AuditLog } from '../super-admin/auditLog.model.js';
import { DomainEvent } from '../partner-warranty/domainEvent.model.js';
import { Notification } from '../notifications/notification.model.js';
import { User } from '../auth/user.model.js';
import { loadBrandAccess } from './brandPermission.middleware.js';
import { SYSTEM_ACTOR } from './actor.js';
import { runInTransaction } from '../../utils/transaction.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { toPaise, toRupees } from '../catalog/money.js';
const DAY = 86400000;
const sum = (rows, key) => toRupees(rows.reduce((s, r) => s + toPaise(r[key] || 0), 0));
const oid = value => new mongoose.Types.ObjectId(String(value));
export function dateRange(from, to) {
  const range = {};
  if (from) range.$gte = new Date(from);
  if (to) range.$lt = new Date(to);
  if (Object.values(range).some(d => Number.isNaN(d.getTime())) || range.$gte && range.$lt && range.$gte >= range.$lt) throw new ApiError(400, 'Invalid date range');
  return range;
}
async function financialTransaction(fn) {
  const result = await runInTransaction(session => {
    // Fail closed rather than partially invoice or record money on standalone MongoDB.
    if (!session) throw new ApiError(503, 'Brand billing requires MongoDB replica-set transactions');
    return fn(session);
  });
  const brand = result?.invoice?.brand || result?.brand;
  if (brand) getIO()?.to(`brand:${brand}`).emit('brand:billing_updated', {brand:String(brand)});
  return result;
}
async function audit(action, invoice, actor, session, reason, meta) {
  await AuditLog.create([{
    brand: invoice.brand,
    actor,
    user: actor?.user,
    type: 'Finance',
    entityType: action === 'payment.recorded' ? 'BrandPayment' : 'BrandInvoice',
    entityId: action === 'payment.recorded' ? meta.payment : invoice._id,
    action,
    reason,
    meta
  }], {
    session
  });
}
async function notify(invoice, title, message, session, admin = false) {
  const users = await User.find({
    role: admin ? 'super_admin' : 'brand_admin',
    status: 'Active',
    ...(admin ? {} : {
      brand: invoice.brand
    })
  }).populate({
    path: 'assignedRoles',
    populate: {
      path: 'permissions',
      select: 'key scope'
    }
  }).session(session);
  for (const user of users) {
    const allowed = admin ? user.assignedRoles.some(r => r.scope === 'platform' && r.permissions.some(p => p.key === 'billing:manage' && p.scope === 'platform')) : (await loadBrandAccess(user._id))?.permissions.has('billing:view');
    if (!allowed) continue;
    await Notification.create([{
      recipient: user._id,
      brand: invoice.brand,
      type: 'payment',
      title,
      message,
      cta: {
        label: 'View billing',
        route: admin ? '/super-admin/brand-billing' : '/brand-admin/invoices'
      }
    }], {
      session
    });
  }
}
async function event(type, invoice, session, extra = {}) {
  const brand = await Brand.findById(invoice.brand).select('webhook').session(session).lean();
  const hook = brand?.webhook;
  const subscribed = hook?.enabled && hook.url && (!hook.events?.length || hook.events.includes(type));
  await DomainEvent.create([{
    type,
    brand: invoice.brand,
    payload: {
      invoice: String(invoice._id),
      invoiceNo: invoice.humanId,
      total: invoice.total,
      paidAmount: invoice.paidAmount,
      ...extra
    },
    status: subscribed ? 'pending' : 'skipped'
  }], {
    session
  });
}
export function invoiceView(invoice, now = new Date()) {
  const row = invoice.toObject ? invoice.toObject() : {
    ...invoice
  };
  const balance = toRupees(toPaise(row.total) - toPaise(row.paidAmount || 0));
  if (['issued', 'partially_paid', 'overdue'].includes(row.status) && row.dueDate < now && balance > 0) row.status = 'overdue';
  delete row.__v;
  delete row.activePeriodKey;
  return {
    ...row,
    id: String(row._id),
    callCount: row.lines?.length || 0,
    amountPaid: row.paidAmount || 0,
    balance
  };
}
export async function draftInvoice(brandId, {
  periodFrom,
  periodTo,
  actor = SYSTEM_ACTOR
}) {
  const range = dateRange(periodFrom, periodTo);
  if (!range.$gte || !range.$lt) throw new ApiError(400, 'Both period dates are required (end exclusive)');
  return financialTransaction(async session => {
    await lockRates(brandId, session);
    const brand = await Brand.findById(brandId).session(session);
    if (!brand) throw new ApiError(404, 'Brand not found');
    const activePeriodKey = `${brandId}:${range.$gte.toISOString()}:${range.$lt.toISOString()}`;
    const existing = await BrandInvoice.findOne({
      activePeriodKey
    }).session(session);
    if (existing) return invoiceView(existing);
    const lines = await BillingLine.find({
      brand: brandId,
      status: 'billable',
      invoice: null,
      closedAt: range
    }).sort({
      closedAt: 1,
      _id: 1
    }).session(session).lean();
    if (!lines.length) throw new ApiError(400, 'No billable lines in this period');
    const [invoice] = await BrandInvoice.create([{
      brand: brandId,
      periodFrom: range.$gte,
      periodTo: range.$lt,
      activePeriodKey,
      lines: lines.map(l => l._id),
      lineSnapshots: lines.map(({
        activeKey: _activeKey,
        __v: _version,
        ...l
      }) => l),
      subtotal: sum(lines, 'subtotal'),
      gstAmount: sum(lines, 'gstAmount'),
      total: sum(lines, 'total'),
      createdBy: actor.user
    }], {
      session
    });
    const claimed = await BillingLine.updateMany({
      _id: {
        $in: invoice.lines
      },
      brand: brandId,
      status: 'billable',
      invoice: null
    }, {
      $set: {
        status: 'invoiced',
        invoice: invoice._id
      },
      $inc: {
        __v: 1
      }
    }, {
      session
    });
    if (claimed.modifiedCount !== lines.length) throw new ApiError(409, 'Charges changed; retry drafting');
    await audit('invoice.drafted', invoice, actor, session);
    await notify(invoice, 'Invoice ready for review', `${invoice.humanId} is ready to review and issue.`, session, true);
    return invoiceView(invoice);
  });
}
async function invoiceForWrite(id, session) {
  const invoice = await BrandInvoice.findById(id).session(session);
  if (!invoice) throw new ApiError(404, 'Invoice not found');
  await lockRates(invoice.brand, session);
  return invoice;
}
export async function issueInvoice(id, actor = SYSTEM_ACTOR, {
  now = new Date()
} = {}) {
  return financialTransaction(async session => {
    const invoice = await invoiceForWrite(id, session);
    if (invoice.status !== 'draft') throw new ApiError(409, 'Only a draft can be issued');
    const brand = await Brand.findById(invoice.brand).session(session).lean();
    const settings = await PlatformSettings.findOne().session(session).lean();
    invoice.billingProfile = {
      ...brand.billing,
      legalName: brand.billing?.legalName || brand.name
    };
    invoice.issuer = {
      name: settings?.platformName || 'Nigam Care',
      email: settings?.supportEmail || ''
    };
    invoice.issuedAt = now;
    invoice.dueDate = new Date(now.getTime() + (brand.billing?.paymentTermsDays ?? 30) * DAY);
    invoice.status = invoice.total === 0 ? 'paid' : 'issued';
    invoice.issuedBy = actor.user;
    await invoice.save({
      session
    });
    await audit('invoice.issued', invoice, actor, session, undefined, {changes:{status:['draft',invoice.status],issuedAt:[null,now]}});
    await event('INVOICE_ISSUED', invoice, session);
    await notify(invoice, 'Invoice issued', `${invoice.humanId}: ₹${invoice.total.toFixed(2)} due ${invoice.dueDate.toISOString().slice(0, 10)}`, session);
    return invoiceView(invoice, now);
  });
}
export async function cancelInvoice(id, reason, actor = SYSTEM_ACTOR, {
  now = new Date()
} = {}) {
  if (!reason?.trim()) throw new ApiError(400, 'A cancellation reason is required');
  return financialTransaction(async session => {
    const invoice = await invoiceForWrite(id, session);
    if (!['draft', 'issued', 'overdue'].includes(invoice.status) || invoice.paidAmount > 0 || (await BrandPayment.exists({
      invoice: id
    }).session(session))) throw new ApiError(409, 'Only unpaid draft or issued invoices can be cancelled');
    const previousStatus = invoice.status;
    invoice.status = 'cancelled';
    invoice.cancelledAt = now;
    invoice.cancellationReason = reason.trim();
    invoice.activePeriodKey = undefined;
    await invoice.save({
      session
    });
    await BillingLine.updateMany({
      invoice: id,
      status: 'invoiced'
    }, {
      $set: {
        status: 'billable',
        invoice: null
      },
      $inc: {
        __v: 1
      }
    }, {
      session
    });
    await audit('invoice.cancelled', invoice, actor, session, reason, {changes:{status:[previousStatus,'cancelled']}});
    return invoiceView(invoice, now);
  });
}
export async function recordPayment(id, data, actor = SYSTEM_ACTOR, {
  now = new Date()
} = {}) {
  const amount = Number(data.amount);
  if (!Number.isFinite(amount) || amount <= 0 || Math.abs(amount * 100 - Math.round(amount * 100)) > 0.00001 || !data.reference?.trim()) throw new ApiError(400, 'Positive two-decimal amount and reference are required');
  const receivedAt = data.receivedAt ? new Date(data.receivedAt) : now;
  if (Number.isNaN(receivedAt.getTime()) || receivedAt > now) throw new ApiError(400, 'Payment date cannot be in the future');
  try {
    return await financialTransaction(async session => {
      const invoice = await invoiceForWrite(id, session);
      if (!['issued', 'partially_paid', 'overdue'].includes(invoice.status)) throw new ApiError(409, 'Invoice is not payable');
      if (receivedAt.toISOString().slice(0, 10) < invoice.issuedAt.toISOString().slice(0, 10)) throw new ApiError(400, 'Payment date precedes invoice issue');
      if (toPaise(amount) > toPaise(invoice.total) - toPaise(invoice.paidAmount)) throw new ApiError(400, 'Payment exceeds invoice balance');
      const [payment] = await BrandPayment.create([{
        brand: invoice.brand,
        invoice: id,
        amount,
        mode: data.mode,
        reference: data.reference.trim(),
        receivedAt,
        note: data.note,
        recordedBy: actor.user
      }], {
        session
      });
      invoice.paidAmount = toRupees(toPaise(invoice.paidAmount) + toPaise(amount));
      invoice.status = toPaise(invoice.paidAmount) === toPaise(invoice.total) ? 'paid' : invoice.dueDate < now ? 'overdue' : 'partially_paid';
      await invoice.save({
        session
      });
      await audit('payment.recorded', invoice, actor, session, data.note, {
        payment: payment._id,
        invoice: invoice._id,
        changes: { paidAmount: [toRupees(toPaise(invoice.paidAmount)-toPaise(amount)),invoice.paidAmount] },
        amount,
        reference: payment.reference
      });
      await event('PAYMENT_RECORDED', invoice, session, {
        payment: String(payment._id),
        amount
      });
      await notify(invoice, 'Payment recorded', `₹${amount.toFixed(2)} received against ${invoice.humanId}.`, session);
      return {
        invoice: invoiceView(invoice, now),
        payment
      };
    });
  } catch (e) {
    if (e.code === 11000) throw new ApiError(409, 'Payment reference already recorded');
    throw e;
  }
}
export async function refreshOverdue({
  now = new Date()
} = {}) {
  return BrandInvoice.updateMany({
    status: {
      $in: ['issued', 'partially_paid']
    },
    dueDate: {
      $lt: now
    }
  }, {
    $set: {
      status: 'overdue'
    },
    $inc: {
      __v: 1
    }
  });
}
export async function brandSummary(brandId, {
  from,
  to,
  now = new Date()
} = {}) {
  const range = dateRange(from, to);
  const brand = brandId ? {
    brand: oid(brandId)
  } : {};
  const lines = await BillingLine.find({
    ...brand,
    status: {
      $ne: 'void'
    },
    ...(Object.keys(range).length ? {
      completedAt: range
    } : {})
  }).select('status total').lean();
  const invoices = (await BrandInvoice.find({
    ...brand,
    status: {
      $nin: ['draft', 'cancelled']
    },
    ...(Object.keys(range).length ? {
      issuedAt: range
    } : {})
  }).lean()).map(i => invoiceView(i, now));
  const pending = invoices.filter(i => i.balance > 0);
  const ageing = {
    current: 0,
    days1to30: 0,
    days31to60: 0,
    days61to90: 0,
    days90plus: 0
  };
  for (const i of pending) {
    const days = Math.ceil((now - i.dueDate) / DAY);
    const key = days <= 0 ? 'current' : days <= 30 ? 'days1to30' : days <= 60 ? 'days31to60' : days <= 90 ? 'days61to90' : 'days90plus';
    ageing[key] = toRupees(toPaise(ageing[key]) + toPaise(i.balance));
  }
  return {
    completedCalls: lines.length,
    unbilledAmount: sum(lines.filter(l => ['pending_closure', 'billable'].includes(l.status)), 'total'),
    invoiceValue: sum(invoices, 'total'),
    paid: sum(invoices, 'paidAmount'),
    pending: sum(pending, 'balance'),
    overdue: sum(pending.filter(i => i.status === 'overdue'), 'balance'),
    overdueCount: pending.filter(i => i.status === 'overdue').length,
    ageing
  };
}
export async function listLines(brand, query = {}) {
  const filter = brand ? {
    brand
  } : {};
  if (query.status) filter.status = query.status === 'unbilled' ? {$in:['pending_closure','billable']} : query.status;
  for (const key of ['state', 'city']) if (query[key]) filter[key] = query[key];
  const range = dateRange(query.from, query.to);
  if (Object.keys(range).length) filter.completedAt = range;
  if (query.q) {
    const escaped = String(query.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = ['ticketNo', 'jobNo'].map(k => ({
      [k]: {
        $regex: escaped,
        $options: 'i'
      }
    }));
  }
  return BillingLine.find(filter).select('-activeKey -__v').sort({
    completedAt: -1
  }).lean();
}
export async function listInvoices(brand, query = {}) {
  const range = dateRange(query.from, query.to);
  const rows = await BrandInvoice.find({
    ...(brand ? {
      brand
    } : {}),
    ...(Object.keys(range).length ? {
      [query.dateField === 'issuedAt' ? 'issuedAt' : 'createdAt']: range
    } : {})
  }).select('-lineSnapshots').sort({
    createdAt: -1
  }).lean();
  return rows.map(i => invoiceView(i)).filter(i => !query.status || (query.status === 'outstanding' ? !['draft','cancelled'].includes(i.status) && i.balance > 0 : i.status === query.status));
}
export async function getInvoice(id, brand, { includePayments = true } = {}) {
  const invoice = await BrandInvoice.findOne({
    _id: id,
    ...(brand ? {
      brand
    } : {})
  }).lean();
  if (!invoice) throw new ApiError(404, 'Invoice not found');
  return {
    ...invoiceView(invoice),
    payments: includePayments ? await BrandPayment.find({
      invoice: id,
      brand: invoice.brand
    }).sort({
      receivedAt: -1
    }).lean() : []
  };
}
export async function listPayments(brand, query = {}) {
  const range = dateRange(query.from, query.to);
  return BrandPayment.find({
    ...(brand ? {
      brand
    } : {}),
    ...(Object.keys(range).length ? {
      receivedAt: range
    } : {})
  }).populate({ path: 'invoice', select: 'humanId', match: brand ? { brand } : {} }).sort({
    receivedAt: -1
  }).lean();
}
export async function ageingReport(options = {}) {
  const brands = await Brand.find().select('name').lean();
  return Promise.all(brands.map(async b => ({
    brand: String(b._id),
    name: b.name,
    ...(await brandSummary(b._id, options))
  })));
}
export async function monthlyAutoDraft({
  now = new Date()
} = {}) {
  const settings = await PlatformSettings.findOne().lean();
  if (settings?.brandInvoiceAutoDraft === false || now.getUTCDate() !== (settings?.brandInvoiceDay ?? 1)) return [];
  const periodTo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const periodFrom = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const brands = await BillingLine.distinct('brand', {
    status: 'billable',
    invoice: null,
    closedAt: {
      $gte: periodFrom,
      $lt: periodTo
    }
  });
  const results = [];
  for (const brand of brands) {
    try {
      results.push(await draftInvoice(brand, {
        periodFrom,
        periodTo
      }));
    } catch (e) {
      console.error(`[brand-billing] auto-draft failed for ${brand}: ${e.message}`);
      results.push({
        brand: String(brand),
        error: e.message
      });
    }
  }
  return results;
}
export async function billingSweep(options) {
  await refreshOverdue(options);
  return monthlyAutoDraft(options);
}
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
})[c]);
export function printableInvoice(i) {
  const h = escapeHtml;
  return `<!doctype html><html lang="en"><meta charset="utf-8"><title>${h(i.humanId)}</title><style>body{font:14px system-ui;max-width:1000px;margin:40px auto;color:#182334}table{width:100%;border-collapse:collapse}td,th{padding:10px;border:1px solid #ddd;text-align:left}button{padding:10px}@media print{button{display:none}body{margin:0}}</style><body><button onclick="window.print()">Print / Save PDF</button><h1>${h(i.issuer?.name || 'Nigam Care')} — ${h(i.humanId)}</h1><p>${h(i.status)} · Issued ${h(i.issuedAt?.toISOString?.().slice(0, 10) || '')} · Due ${h(i.dueDate?.toISOString?.().slice(0, 10) || '')}</p><h2>${h(i.billingProfile?.legalName)}</h2><p>GSTIN: ${h(i.billingProfile?.gstin)}<br>${h(typeof i.billingProfile?.billingAddress === 'object' ? JSON.stringify(i.billingProfile.billingAddress) : i.billingProfile?.billingAddress)}</p><table><thead><tr><th>Ticket / closed</th><th>Location</th><th>Service</th><th>Rate</th><th>Parts / other</th><th>GST</th><th>Total</th></tr></thead><tbody>${i.lineSnapshots.map(l => `<tr><td>${h(l.ticketNo)}<br>${h(new Date(l.closedAt).toISOString().slice(0, 10))}</td><td>${h(l.state)} / ${h(l.city)}</td><td>${h(l.serviceType)}</td><td>${h(l.rate.amount)}</td><td>${h(l.parts.map(p => `${p.name}: ${p.amount}`).concat(l.otherCharges.map(c => `${c.label}: ${c.amount}`)).join(', '))}</td><td>${h(l.gstAmount)} (${h(l.gstPercent)}%)</td><td>${h(l.total)}</td></tr>`).join('')}</tbody></table><p>Subtotal ₹${h(i.subtotal)} · GST ₹${h(i.gstAmount)} · Total ₹${h(i.total)}</p></body></html>`;
}
export async function exportBilling(brand, query) {
  const types = {
    lines: [listLines, ['ticketNo', 'jobNo', 'state', 'city', 'serviceType', 'status', 'subtotal', 'gstAmount', 'total']],
    invoices: [listInvoices, ['humanId', 'status', 'periodFrom', 'periodTo', 'issuedAt', 'dueDate', 'total', 'paidAmount', 'balance']],
    payments: [listPayments, ['receivedAt', 'invoice', 'amount', 'mode', 'reference', 'note']]
  };
  const spec = types[query.type];
  if (!spec) throw new ApiError(400, 'Export type must be lines, invoices or payments');
  const rows = await spec[0](brand, query);
  const cell = v => {
    let s = v instanceof Date ? v.toISOString() : typeof v === 'object' && v ? v.humanId || '' : String(v ?? '');
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return `"${s.replace(/"/g, '""')}"`;
  };
  return [spec[1].join(','), ...rows.map(r => spec[1].map(k => cell(r[k])).join(','))].join('\r\n');
}

/** Billing identity and terms changes share the brand lock with invoice issuance. */
export async function updateBrandBilling(brandId, changes, actor, action) {
  return financialTransaction(async session => {
    await lockRates(brandId, session);
    const brand = await Brand.findById(brandId).session(session);
    if (!brand) throw new ApiError(404, 'Brand not found');
    const before = { ...brand.billing };
    for (const [key, value] of Object.entries(changes)) brand.set(`billing.${key}`, value);
    await brand.save({ session });
    await AuditLog.create([{ brand: brand._id, actor, user: actor.user, type:'Finance', entityType:'Brand', entityId:brand._id, action, meta:{before,after:{...brand.billing}} }], {session});
    return brand.billing;
  });
}
