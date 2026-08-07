import { ExchangeQuestionSet } from './exchangeQuestionSet.model.js';
import { ExchangeCampaign } from './exchangeCampaign.model.js';
import { ExchangeRequest } from './exchangeRequest.model.js';
import { ExchangeProductConfig } from './exchangeProductConfig.model.js';
import { ExchangeBaseValue } from './exchangeBaseValue.model.js';
import { computeExchangeValuation } from './exchangeValuation.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { parsePagination, paginationMeta } from '../../utils/pagination.js';

export async function getQuestionSet(category) {
  const set = await ExchangeQuestionSet.findOne({ category });
  if (!set) throw new ApiError(404, `No exchange question set for category "${category}"`);
  return set;
}

// Admin-editable, same reasoning/role-gate as catalog.service.js's writes — a
// real brand-scoped/permission-based CMS is Phase 8's job.
export async function createQuestionSet(data) {
  const existing = await ExchangeQuestionSet.findOne({ category: data.category });
  if (existing) throw new ApiError(409, `A question set already exists for category "${data.category}"`);
  return ExchangeQuestionSet.create(data);
}

/** Quotes a valuation without persisting anything — lets the frontend show a
 * live estimate as the customer answers questions (matches Exchange.jsx's flow). */
export async function valuate({ category, baseValue, answers, campaignId }) {
  if (baseValue <= 0) throw new ApiError(400, 'baseValue must be positive');

  const questionSet = await getQuestionSet(category);
  let bonusAmount = 0;
  if (campaignId) {
    const campaign = await ExchangeCampaign.findById(campaignId);
    if (campaign && campaign.status === 'Active') bonusAmount = campaign.bonusAmount;
  }

  return computeExchangeValuation({ baseValue, questions: questionSet.questions, answers, bonusAmount });
}

/** Persists a valuation as an ExchangeRequest — the estimatedValue actually
 * charged/credited later always comes from THIS stored document, never
 * recomputed from a possibly-since-changed question set (BACKEND_CONTEXT.md §3.9). */
export async function createExchangeRequest(userId, { category, brand, model, condition, answers, baseValue, campaignId }) {
  const valuation = await valuate({ category, baseValue, answers, campaignId });

  return ExchangeRequest.create({
    user: userId,
    category,
    brand,
    model,
    condition,
    answers,
    ...valuation,
  });
}

export async function getExchangeRequest(userId, id) {
  const exchangeRequest = await ExchangeRequest.findById(id);
  if (!exchangeRequest) throw new ApiError(404, 'Exchange request not found');
  if (String(exchangeRequest.user) !== userId) throw new ApiError(403, 'Not authorized to view this exchange request');
  return exchangeRequest;
}

/** Called by order.service.js when a checkout applies an exchange discount.
 * Guards against reusing the same trade-in credit across multiple orders. */
export async function markApplied(exchangeRequestId, orderId) {
  const exchangeRequest = await ExchangeRequest.findById(exchangeRequestId);
  if (!exchangeRequest) throw new ApiError(404, 'Exchange request not found');
  if (exchangeRequest.appliedToOrder) throw new ApiError(400, 'Exchange request has already been applied to an order');

  exchangeRequest.appliedToOrder = orderId;
  await exchangeRequest.save();
  return exchangeRequest;
}

export async function listExchangeRequestsCustomer(userId, { status } = {}) {
  const query = { user: userId };
  if (status) query.status = status;
  return ExchangeRequest.find(query).sort({ createdAt: -1 });
}

/**
 * Trade-ins offered against a given brand's appliances.
 *
 * ExchangeRequest.brand is a free-text String (the label the customer picked
 * during valuation), not a Brand ref — so this matches on the brand's name,
 * case-insensitively and anchored so "LG" doesn't also pull in "LG Electronics
 * Spares". Tightening this to a real ref is the durable fix; until then a brand
 * renamed in the Brand collection stops matching its historical trade-ins.
 */
export async function listExchangeRequestsForBrand(brandName, { status, page, limit, sort } = {}) {
  const escaped = brandName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const query = { brand: new RegExp(`^${escaped}$`, 'i') };
  if (status) query.status = status;

  const { skip, limit: lim, page: pg, sort: sortObj } = parsePagination({ page, limit, sort });
  const [items, total] = await Promise.all([
    ExchangeRequest.find(query)
      .populate('user', 'name email phone')
      .sort(sortObj)
      .skip(skip)
      .limit(lim),
    ExchangeRequest.countDocuments(query),
  ]);
  return { items, meta: paginationMeta({ page: pg, limit: lim, total }) };
}

// --- Admin (super-admin) surface below: physical inspection workflow ---
// Added in the Phase 11 security review — a customer's self-reported trade-in
// valuation was previously usable as a full checkout discount with nothing
// ever verifying the device was actually received/inspected. order.service.js
// now requires status === 'Inspection Approved' before applying the discount
// (see createOrder), and this is the only place that transition can happen.

export async function listExchangeRequestsAdmin({ status, page, limit, sort } = {}) {
  const query = {};
  if (status) query.status = status;

  const { skip, limit: lim, page: pg, sort: sortObj } = parsePagination({ page, limit, sort });
  const [items, total] = await Promise.all([
    ExchangeRequest.find(query).sort(sortObj).skip(skip).limit(lim),
    ExchangeRequest.countDocuments(query),
  ]);
  return { items, meta: paginationMeta({ page: pg, limit: lim, total }) };
}

async function findExchangeRequestOr404(id) {
  const exchangeRequest = await ExchangeRequest.findById(id);
  if (!exchangeRequest) throw new ApiError(404, 'Exchange request not found');
  return exchangeRequest;
}

export async function getExchangeRequestAdmin(id) {
  return findExchangeRequestOr404(id);
}

export async function updateExchangeRequestStatus(id, status) {
  const exchangeRequest = await findExchangeRequestOr404(id);
  exchangeRequest.status = status;
  await exchangeRequest.save();
  return exchangeRequest;
}

// ── Exchange merchandising config ─────────────────────────────────────────────
// Authored in the super-admin ExchangeOffers console and read by the customer
// app's ExchangeModal, which is why the readers are open to any signed-in user
// while the writers are super-admin-only (see exchange.routes.js).

export async function listQuestionSets() {
  return ExchangeQuestionSet.find().sort({ category: 1 });
}

export async function updateQuestionSet(id, updates) {
  const doc = await ExchangeQuestionSet.findByIdAndUpdate(id, updates, { new: true });
  if (!doc) throw new ApiError(404, 'Question set not found');
  return doc;
}

export async function deleteQuestionSet(id) {
  const doc = await ExchangeQuestionSet.findByIdAndDelete(id);
  if (!doc) throw new ApiError(404, 'Question set not found');
}

export async function listCampaigns() {
  return ExchangeCampaign.find().sort({ createdAt: -1 });
}

export async function createCampaign(data) {
  return ExchangeCampaign.create(data);
}

export async function updateCampaign(id, updates) {
  const doc = await ExchangeCampaign.findByIdAndUpdate(id, updates, { new: true });
  if (!doc) throw new ApiError(404, 'Campaign not found');
  return doc;
}

export async function deleteCampaign(id) {
  const doc = await ExchangeCampaign.findByIdAndDelete(id);
  if (!doc) throw new ApiError(404, 'Campaign not found');
}

export async function listProductConfigs() {
  return ExchangeProductConfig.find().populate('questionSet', 'name category').populate('campaign', 'name badgeText');
}

/** One config per product, so this upserts on `product` rather than creating duplicates. */
export async function upsertProductConfig({ product, ...updates }) {
  return ExchangeProductConfig.findOneAndUpdate(
    { product },
    { product, ...updates },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
}

export async function deleteProductConfig(id) {
  const doc = await ExchangeProductConfig.findByIdAndDelete(id);
  if (!doc) throw new ApiError(404, 'Product exchange config not found');
}

// ── Trade-in base values ──────────────────────────────────────────────────────

export async function listBaseValues({ category, brand } = {}) {
  const query = {};
  if (category) query.category = category;
  if (brand) query.brand = brand;
  return ExchangeBaseValue.find(query).sort({ category: 1, brand: 1, model: 1 });
}

/**
 * The base value the customer's device is quoted from. Returns null when the
 * model has no published value — the caller must then say the device cannot be
 * valued online rather than fall back to a guess.
 */
export async function getBaseValue({ category, brand, model }) {
  const escape = (v) => String(v).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return ExchangeBaseValue.findOne({
    category,
    brand: new RegExp(`^${escape(brand)}$`, 'i'),
    model: new RegExp(`^${escape(model)}$`, 'i'),
    isActive: true,
  });
}

export async function upsertBaseValue({ category, brand, model, ...updates }) {
  return ExchangeBaseValue.findOneAndUpdate(
    { category, brand, model },
    { category, brand, model, ...updates },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
}

export async function deleteBaseValue(id) {
  const doc = await ExchangeBaseValue.findByIdAndDelete(id);
  if (!doc) throw new ApiError(404, 'Base value not found');
}
