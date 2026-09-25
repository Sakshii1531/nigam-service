import { AMCPlan } from '../warranty-amc-exchange/amcPlan.model.js';
import { AMCSubscription } from '../warranty-amc-exchange/amcSubscription.model.js';
import { ExtendedWarrantyPlan } from '../warranty-amc-exchange/extendedWarrantyPlan.model.js';
import { ExtendedWarrantyOrder } from '../warranty-amc-exchange/extendedWarrantyOrder.model.js';
import { Category } from '../catalog/category.model.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { logAudit } from '../shared/auditLog.js';

// Super Admin → Plans (docs/master-catalogue Phases 12–13): the AMC plans and
// extended-warranty packs customers buy. Everything the customer screens show
// — names, prices, visits, benefits, which appliance — is set here.

async function assertAppliance(key) {
  if (!key) return null;
  const exists = await Category.exists({ key });
  if (!exists) throw new ApiError(400, `Unknown appliance category "${key}"`);
  return key;
}

const amcView = (plan, subscribers = 0) => ({ ...plan.toJSON(), subscribers });

// ─── AMC plans ───────────────────────────────────────────────────────────

export async function listAmcPlans() {
  const plans = await AMCPlan.find().sort({ applianceCategory: 1, displayOrder: 1, price: 1 });
  const counts = await AMCSubscription.aggregate([{ $group: { _id: '$plan', n: { $sum: 1 } } }]);
  const byPlan = new Map(counts.map((c) => [String(c._id), c.n]));
  return plans.map((p) => amcView(p, byPlan.get(String(p._id)) || 0));
}

export async function createAmcPlan(data, actorId) {
  const plan = await AMCPlan.create({ ...data, applianceCategory: await assertAppliance(data.applianceCategory) });
  await logAudit({ user: actorId, action: `Plans: AMC plan "${plan.name}" created — ₹${plan.price}, ${plan.visitsTotal} visits`, type: 'Finance' });
  return amcView(plan);
}

export async function updateAmcPlan(id, data, actorId) {
  const plan = await AMCPlan.findById(id);
  if (!plan) throw new ApiError(404, 'AMC plan not found');
  const before = { price: plan.price, visitsTotal: plan.visitsTotal, isActive: plan.isActive };
  if ('applianceCategory' in data) data.applianceCategory = await assertAppliance(data.applianceCategory);
  plan.set(data);
  await plan.save();
  const changes = Object.entries(before)
    .filter(([k, v]) => plan[k] !== v)
    .map(([k, v]) => `${k} ${v} → ${plan[k]}`);
  await logAudit({
    user: actorId,
    action: `Plans: AMC plan "${plan.name}" updated${changes.length ? ` — ${changes.join(', ')}` : ''}`,
    type: 'Finance',
  });
  // Existing subscriptions keep the visits and expiry they were sold with.
  return amcView(plan, await AMCSubscription.countDocuments({ plan: plan._id }));
}

/** A plan someone has bought can't be deleted (their subscription points at it) — deactivate it instead. */
export async function deleteAmcPlan(id, actorId) {
  const plan = await AMCPlan.findById(id);
  if (!plan) throw new ApiError(404, 'AMC plan not found');
  if (await AMCSubscription.exists({ plan: plan._id })) {
    throw new ApiError(409, 'Customers have bought this plan — switch it off instead of deleting it');
  }
  await plan.deleteOne();
  await logAudit({ user: actorId, action: `Plans: AMC plan "${plan.name}" deleted`, type: 'Finance' });
}

// ─── Extended-warranty packs ─────────────────────────────────────────────

const ewView = (plan, sold = 0) => ({ ...plan.toJSON(), sold });

export async function listEwPlans() {
  const plans = await ExtendedWarrantyPlan.find().sort({ applianceCategory: 1, displayOrder: 1, durationYears: 1, price: 1 });
  const counts = await ExtendedWarrantyOrder.aggregate([{ $group: { _id: '$tierId', n: { $sum: 1 } } }]);
  const byPlan = new Map(counts.map((c) => [String(c._id), c.n]));
  return plans.map((p) => ewView(p, byPlan.get(String(p._id)) || 0));
}

export async function createEwPlan(data, actorId) {
  const plan = await ExtendedWarrantyPlan.create({ ...data, applianceCategory: await assertAppliance(data.applianceCategory) });
  await logAudit({ user: actorId, action: `Plans: warranty pack "${plan.name}" created — ₹${plan.price}, ${plan.durationYears} yr`, type: 'Finance' });
  return ewView(plan);
}

export async function updateEwPlan(id, data, actorId) {
  const plan = await ExtendedWarrantyPlan.findById(id);
  if (!plan) throw new ApiError(404, 'Warranty pack not found');
  const before = { price: plan.price, durationYears: plan.durationYears, claimsTotal: plan.claimsTotal, isActive: plan.isActive };
  if ('applianceCategory' in data) data.applianceCategory = await assertAppliance(data.applianceCategory);
  plan.set(data);
  await plan.save();
  const changes = Object.entries(before)
    .filter(([k, v]) => plan[k] !== v)
    .map(([k, v]) => `${k} ${v} → ${plan[k]}`);
  await logAudit({
    user: actorId,
    action: `Plans: warranty pack "${plan.name}" updated${changes.length ? ` — ${changes.join(', ')}` : ''}`,
    type: 'Finance',
  });
  // Policies already sold keep their price, term and claims.
  return ewView(plan, await ExtendedWarrantyOrder.countDocuments({ tierId: String(plan._id) }));
}

export async function deleteEwPlan(id, actorId) {
  const plan = await ExtendedWarrantyPlan.findById(id);
  if (!plan) throw new ApiError(404, 'Warranty pack not found');
  if (await ExtendedWarrantyOrder.exists({ tierId: String(plan._id) })) {
    throw new ApiError(409, 'Customers have bought this pack — switch it off instead of deleting it');
  }
  await plan.deleteOne();
  await logAudit({ user: actorId, action: `Plans: warranty pack "${plan.name}" deleted`, type: 'Finance' });
}

