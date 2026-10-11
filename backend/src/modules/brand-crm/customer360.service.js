import mongoose from 'mongoose';
import { randomBytes } from 'node:crypto';
import { User } from '../auth/user.model.js';
import { Brand } from '../super-admin/brand.model.js';
import { BrandCustomer } from './brandCustomer.model.js';
import { isBrandCustomer } from './brandCustomer.service.js';
import { WarrantyClaim } from '../partner-warranty/warrantyClaim.model.js';
import { TERMINAL_STATUSES } from '../partner-warranty/claimStatus.js';
import { OwnedAppliance } from '../service-requests/ownedAppliance.model.js';
import { ServiceRequest } from '../service-requests/serviceRequest.model.js';
import { Notification } from '../notifications/notification.model.js';
import { evaluateWarranty } from './warrantyPolicy.service.js';
import { Category } from '../catalog/category.model.js';
import { normalisePhone } from '../shared/phone.js';
import { escapeRegex } from '../shared/brandWarranty.js';
import { hashPassword } from '../auth/password.js';
import { runInTransaction } from '../../utils/transaction.js';
import { recordAction } from '../shared/auditLog.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { paginationMeta } from '../../utils/pagination.js';
import { createCustomerSchema, updateCustomerSchema, addressSchema } from './customer360.validation.js';

const objectId = id => new mongoose.Types.ObjectId(String(id));
const customerFields = 'humanId name phone alternatePhone email addresses createdAt';
const shapeCustomer = u => ({ id: String(u._id), humanId: u.humanId, name: u.name, phone: u.phone, alternatePhone: u.alternatePhone || null, email: u.email || null, addresses: u.addresses || [], createdAt: u.createdAt });

async function linkedCustomer(brand, id) {
  if (!mongoose.isValidObjectId(id) || !await isBrandCustomer(brand, id)) throw new ApiError(404, 'Customer not found');
  const user = await User.findOne({ _id: id, role: 'customer' }).select(customerFields);
  if (!user) throw new ApiError(404, 'Customer not found');
  return user;
}

export async function searchByPhone(brand, phone) {
  const user = await User.findOne({ role: 'customer', phone: normalisePhone(phone) }).select(customerFields).lean();
  if (!user) return { match: 'none' };
  if (!await isBrandCustomer(brand, user._id)) {
    return { match: 'platform', customer: { id: String(user._id), name: user.name, maskedPhone: `******${user.phone.slice(-4)}` } };
  }
  const openTickets = await WarrantyClaim.countDocuments({ brand, customer: user._id, status: { $nin: TERMINAL_STATUSES } });
  return { match: 'brand', customer: { ...shapeCustomer(user), openTickets } };
}

async function duplicateError(phone) {
  const existing = await User.findOne({ role: 'customer', phone }).select('_id').lean();
  return existing ? new ApiError(409, 'Customer already exists', { existingId: String(existing._id) }) : new ApiError(409, 'Email is already registered');
}

export async function createCustomer(brand, actor, input, options = {}) {
  const data = createCustomerSchema.parse(input);
  if (!await Brand.exists({ _id: brand })) throw new ApiError(404, 'Brand not found');
  if (await User.exists({ role: 'customer', phone: data.phone })) throw await duplicateError(data.phone);
  const passwordHash = await hashPassword(randomBytes(32).toString('hex'));
  let user;
  let relationship;
  try {
    const write = async session => {
      // A fresh document on retries; customer ID allocation may leave harmless gaps.
      user = new User({ role: 'customer', name: data.name, phone: data.phone, email: data.email || undefined,
        alternatePhone: data.alternatePhone || undefined, addresses: data.address ? [data.address] : [], passwordHash });
      await user.save(session ? { session } : undefined);
      try {
        [relationship] = await BrandCustomer.create([{ brand, customer: user._id, createdBy: actor.user }], session ? { session } : {});
      } catch (err) {
        // Existing transaction helper supports standalone dev DBs: compensate
        // only our own new User if creating its relationship fails there.
        if (!session) await User.deleteOne({ _id: user._id });
        throw err;
      }
    };
    if (options.transactionOwned) await write(options.session);
    else await runInTransaction(write);
  } catch (err) {
    if (err.code === 11000) throw await duplicateError(data.phone);
    throw err;
  }
  if (options.deferAudit) return { customer: shapeCustomer(user), user, relationship };
  await auditCustomerCreation(brand, actor, { user, relationship });
  return shapeCustomer(user);
}

export async function auditCustomerCreation(brand, actor, { user, relationship }) {
  await recordAction({ brand, entityType: 'customer', entityId: user._id, action: 'customer.created', actor,
    meta: { name: user.name, phone: user.phone } });
  await recordAction({ brand, entityType: 'BrandCustomer', entityId: relationship._id, action: 'customer.linked', actor,
    meta: { customer: String(user._id) } });
}

export async function updateCustomer(brand, id, actor, input) {
  const data = updateCustomerSchema.parse(input);
  const user = await linkedCustomer(brand, id);
  const changes = {};
  for (const [field, value] of Object.entries(data)) {
    const before = user[field]?.toObject?.() ?? user[field] ?? null;
    const after = (field === 'email' || field === 'alternatePhone') && !value ? undefined : value;
    if (JSON.stringify(before) !== JSON.stringify(after ?? null)) changes[field] = [before, after ?? null];
    user[field] = after;
  }
  try { await user.save(); } catch (err) {
    if (err.code === 11000) throw new ApiError(409, 'Email is already registered');
    throw err;
  }
  if (Object.keys(changes).length) await recordAction({ brand, entityType: 'customer', entityId: user._id, action: 'customer.updated', actor, meta: { changes } });
  return shapeCustomer(user);
}

export async function addAddress(brand, id, actor, input) {
  const address = addressSchema.parse(input);
  await linkedCustomer(brand, id);
  const user = await User.findOneAndUpdate({ _id: id, role: 'customer', 'addresses.19': { $exists: false } },
    { $push: { addresses: address } }, { new: true, runValidators: true }).select(customerFields);
  if (!user) throw new ApiError(409, 'A customer can have at most 20 addresses');
  await recordAction({ brand, entityType: 'customer', entityId: user._id, action: 'customer.address_added', actor, meta: { address } });
  return shapeCustomer(user);
}

/** Start from brand relationships, union links, then search/page in Mongo. */
export async function listCustomers(brandId, { q, search, page = 1, limit = 20, exportLimit } = {}) {
  const brand = objectId(brandId);
  const project = customer => ({ $project: { customer, activity: '$updatedAt' } });
  const pipeline = [
    { $match: { brand } }, project('$customer'),
    { $unionWith: { coll: WarrantyClaim.collection.name, pipeline: [{ $match: { brand } }, project('$customer')] } },
    { $unionWith: { coll: OwnedAppliance.collection.name, pipeline: [{ $match: { brandRef: brand } }, project('$user')] } },
    { $unionWith: { coll: ServiceRequest.collection.name, pipeline: [{ $match: { brand } }, project('$user')] } },
    { $group: { _id: '$customer', lastActivity: { $max: '$activity' } } },
    { $lookup: { from: User.collection.name, localField: '_id', foreignField: '_id', as: 'customer' } },
    { $unwind: '$customer' }, { $match: { 'customer.role': 'customer' } },
  ];
  const term = q || search;
  if (term) {
    const rx = new RegExp(escapeRegex(term), 'i');
    pipeline.push({ $match: { $or: ['name', 'phone', 'humanId'].map(f => ({ [`customer.${f}`]: rx })) } });
  }
  pipeline.push({ $sort: { lastActivity: -1, _id: 1 } });
  const countTickets = [
    { $match: { brand, $expr: { $eq: ['$customer', '$$customerId'] } } },
    { $group: { _id: null, total: { $sum: 1 }, open: { $sum: { $cond: [{ $in: ['$status', TERMINAL_STATUSES] }, 0, 1] } } } },
  ];
  const items = [
    { $skip: exportLimit ? 0 : (page - 1) * limit }, { $limit: exportLimit || limit },
    { $lookup: { from: WarrantyClaim.collection.name, let: { customerId: '$_id' }, pipeline: countTickets, as: 'counts' } },
    { $lookup: { from: OwnedAppliance.collection.name, let: { customerId: '$_id' }, pipeline: [
      { $match: { brandRef: brand, $expr: { $eq: ['$user', '$$customerId'] } } }, { $count: 'total' },
    ], as: 'products' } },
    { $project: { _id: 0, id: { $toString: '$_id' }, humanId: '$customer.humanId', name: '$customer.name', phone: '$customer.phone', email: '$customer.email',
      totalTickets: { $ifNull: [{ $arrayElemAt: ['$counts.total', 0] }, 0] }, openTickets: { $ifNull: [{ $arrayElemAt: ['$counts.open', 0] }, 0] },
      productCount: { $ifNull: [{ $arrayElemAt: ['$products.total', 0] }, 0] }, lastActivity: 1 } },
  ];
  pipeline.push({ $facet: { items, total: [{ $count: 'count' }] } });
  const [result] = await BrandCustomer.aggregate(pipeline);
  return { items: result.items, meta: paginationMeta({ page, limit: exportLimit || limit, total: result.total[0]?.count || 0 }) };
}

export async function getProfile(brand, id) {
  const user = await linkedCustomer(brand, id);
  const [products, claims, notifications, brandDoc] = await Promise.all([
    OwnedAppliance.find({ user: id, brandRef: brand }).sort({ createdAt: -1 }).lean(),
    WarrantyClaim.find({ brand, customer: id }).sort({ createdAt: -1 }).populate({ path: 'serviceRequest', select: 'humanId serviceProvider', populate: { path: 'serviceProvider', select: 'name' } }).lean(),
    Notification.find({ brand, recipient: id }).select('title message createdAt warrantyClaim').sort({ createdAt: -1 }).lean(),
    Brand.findById(brand).select('name').lean(),
  ]);
  if (!brandDoc) throw new ApiError(404, 'Brand not found');
  const tickets = claims.map(c => ({ id: String(c._id), humanId: c.humanId, brandTicketNo: c.brandTicketNo, source: c.source, status: c.status,
    jobStage: c.jobStage, product: c.productName, model: c.modelNumber, serialNumber: c.serialNumber, issue: c.issueName, createdAt: c.createdAt, closedAt: c.closedAt,
    jobNo: c.serviceRequest?.humanId || null }));
  const completed = claims.filter(c => c.status === 'Closed');
  const communication = claims.flatMap(c => c.timeline.filter(e => e.visibility !== 'internal' && ['CUSTOMER_CONTACTED', 'CONTACT_REQUESTED', 'CUSTOMER_NOTIFIED', 'RESCHEDULE_REQUESTED', 'RESCHEDULED'].includes(e.action))
    .map(e => ({ id: String(e._id), kind: 'contact', title: e.meta?.title || e.action.replaceAll('_',' ').toLowerCase(), action: e.action, at: e.at, note: e.note, actor: e.actor, ticketNo: c.humanId, meta: e.meta })));
  const recordedNotifications=new Set(claims.flatMap(c=>c.timeline.filter(e=>e.action==='CUSTOMER_NOTIFIED').map(e=>e.meta?.notificationId)));
  communication.push(...notifications.filter(n=>!recordedNotifications.has(String(n._id))).map(n => ({ id: String(n._id), kind: 'notification', title: n.title, note: n.message, at: n.createdAt })));
  communication.sort((a, b) => new Date(b.at) - new Date(a.at));
  const openTickets = claims.filter(c => !TERMINAL_STATUSES.includes(c.status)).length;
  const durations = completed.filter(c => c.closedAt).map(c => (new Date(c.closedAt) - new Date(c.createdAt)) / 3600000);
  return {
    customer: shapeCustomer(user),
    products: await Promise.all(products.map(async p => ({ id: String(p._id), category: p.category, brand: brandDoc.name, model: p.modelNumber || p.model,
      serialNumber: p.serialNumber, purchaseDate: p.purchaseDate, invoiceFileUrl: p.invoiceFileUrl, warranty: await evaluateWarranty({brand,category:(await Category.findOne({key:p.category}).select('_id').lean())?._id,model:p.modelNumber||p.model,serial:p.serialNumber,purchaseDate:p.purchaseDate,hasInvoice:Boolean(p.invoiceFileUrl),serviceType:'repair'}) }))),
    tickets, openTickets,
    completedJobs: completed.map(c => ({ ticketId: String(c._id), ticketNo: c.humanId, jobNo: c.serviceRequest?.humanId || null,
      partnerName: c.serviceRequest?.serviceProvider?.name || null, closedAt: c.closedAt, rating: c.closure?.rating ?? null, product: c.productName })),
    communication,
    stats: { total: claims.length, open: openTickets, completed: completed.length, avgTatHours: durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : null },
  };
}
