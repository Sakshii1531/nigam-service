import { ExchangeQuestionSet } from './exchangeQuestionSet.model.js';
import { ExchangeCampaign } from './exchangeCampaign.model.js';
import { ExchangeRequest } from './exchangeRequest.model.js';
import { computeExchangeValuation } from './exchangeValuation.js';
import { ApiError } from '../../middleware/errorHandler.js';

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
