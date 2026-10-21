import { runInTransaction } from '../../utils/transaction.js';
import mongoose from 'mongoose';
import { ServiceProvider } from '../service-provider/serviceProvider.model.js';
import { User } from '../auth/user.model.js';
import { Category } from '../catalog/category.model.js';
import { ProviderOnboarding } from './onboarding.model.js';
import { ProviderKitOrder } from './kitOrder.model.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { logAudit } from '../shared/auditLog.js';

const normalize = value => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
export async function resolveRequestedCategories(values) {
  if (!Array.isArray(values) || !values.length) throw new ApiError(400, 'Select at least one service category');
  const categories = await Category.find({ isActive: true }).lean();
  const selected = values.map(value => categories.find(c => [String(c._id), c.key, c.name, `${c.key} Repair`, `${c.name} Repair`].some(label => normalize(label) === normalize(value))));
  if (selected.some(c => !c)) throw new ApiError(400, 'Choose service categories listed in the current catalogue');
  return [...new Map(selected.map(c => [String(c._id), c])).values()];
}

// Only old records lack a policy version. Both production creation endpoints
// now always write version 1, so future applicants cannot acquire this exemption.
export async function recordLegacyExemption(provider) {
  if (!provider || provider.onboardingPolicyVersion != null || provider.status !== 'Active') return provider;
  return runInTransaction(async session => {
    const migrated = await ServiceProvider.findOneAndUpdate({ _id: provider._id, status: 'Active', onboardingPolicyVersion: { $exists: false } }, {
      $set: { onboardingPolicyVersion: 0, legacyExemption: { recordedAt: new Date(), reason: 'Existing active provider at onboarding policy cutover' }, jobEligible: true },
    }, { new: true, session });
    if (migrated) await logAudit({ entityType: 'ServiceProvider', entityId: provider._id, action: 'provider.legacy_exemption', type: 'System', actor: { kind: 'system', name: 'Onboarding migration' }, reason: migrated.legacyExemption.reason }, { session });
    return migrated || ServiceProvider.findById(provider._id).session(session);
  });
}

export async function migrateLegacyProviders() {
  let exempted = 0;
  for await (const provider of ServiceProvider.find({ status: 'Active', onboardingPolicyVersion: { $exists: false } }).cursor()) {
    await recordLegacyExemption(provider); exempted++;
  }
  let pending = 0;
  for await (const provider of ServiceProvider.find({ status: 'Pending', onboardingPolicyVersion: { $exists: false } }).cursor()) {
    const categories = [], unresolved = [];
    for (const label of provider.specs || []) {
      try { categories.push(...await resolveRequestedCategories([label])); }
      catch (error) { if (error.statusCode !== 400) throw error; unresolved.push(label); }
    }
    await runInTransaction(async session => {
    await ProviderOnboarding.updateOne({ serviceProvider: provider._id }, { $setOnInsert: { requestedCategories: [...new Set(categories.map(c => String(c._id)))], state: unresolved.length ? 'CHANGES_REQUESTED' : 'ASM_REVIEW', events: [{ action: 'application.migrated', at: new Date(), message: `Existing pending application moved to interview review. Original specialties: ${(provider.specs || []).join(', ') || 'none'}.${unresolved.length ? ` Select current catalogue categories to replace: ${unresolved.join(', ')}.` : ''}` }] } }, { upsert: true, session });
    await ServiceProvider.updateOne({ _id: provider._id }, { $set: { onboardingPolicyVersion: 1, specs: [], approvedCategoryIds: [], jobEligible: false, availability: 'Offline' } }, { session });
    await User.updateOne({ _id: provider.user, status: 'Pending' }, { $set: { status: 'Active' } }, { session });
    }, { required: true });
    pending++;
  }
  return { exempted, pending };
}

export async function eligibilityFor(providerOrId, { category, session } = {}) {
  let provider = providerOrId?._id ? providerOrId : await ServiceProvider.findById(providerOrId).session(session || null);
  if (!session) provider = await recordLegacyExemption(provider);
  const reasons = [];
  if (!provider) return { eligible: false, reasons: ['PROFILE_MISSING'], approvedCategories: [] };
  const user = await User.findById(provider.user).select('status').session(session || null);
  if (user?.status !== 'Active') reasons.push('ACCOUNT_RESTRICTED');
  if (provider.status !== 'Active') reasons.push('FINAL_APPROVAL_REQUIRED');
  const legacy = provider.onboardingPolicyVersion === 0 && Boolean(provider.legacyExemption?.recordedAt);
  let onboarding = null;
  if (!legacy) {
    onboarding = await ProviderOnboarding.findOne({ serviceProvider: provider._id }).session(session || null);
    if (onboarding?.state !== 'APPROVED') reasons.push('FINAL_APPROVAL_REQUIRED');
    if (!onboarding?.approvedCategories.length) reasons.push('APPROVED_CATEGORIES_REQUIRED');
    if (onboarding?.documentReview?.aadhar !== 'Verified' || onboarding?.documentReview?.background !== 'Verified') reasons.push('DOCUMENT_REVIEW_REQUIRED');
    const kit = await ProviderKitOrder.findOne({ serviceProvider: provider._id, paymentStatus: 'Paid', status: 'ReceiptVerified', receiptVerifiedAt: { $ne: null }, 'items.qualifiesForOnboarding': true }).session(session || null);
    if (!kit) reasons.push('PAID_KIT_RECEIPT_REQUIRED');
  }
  const approvedCategories = provider.approvedCategoryIds || [];
  if (category) {
    const categories = await Category.find({ $or: [ ...(mongoose.isValidObjectId(category) ? [{ _id: category }] : []), { key: String(category) }, { name: String(category) }], isActive: true }).select('_id key name').session(session || null).lean();
    const allowed = legacy
      ? (provider.specs || []).some(spec => [category, ...categories.flatMap(c => [c.key, c.name])].some(label => [normalize(label), normalize(`${label} Repair`)].includes(normalize(spec))))
      : categories.some(c => approvedCategories.some(id => String(id) === String(c._id)));
    if (!allowed) reasons.push('CATEGORY_NOT_APPROVED');
  }
  return { eligible: reasons.length === 0, reasons: [...new Set(reasons)], legacy, approvedCategories, onboardingState: onboarding?.state || null };
}

export async function assertJobEligible(providerOrId, options) {
  const result = await eligibilityFor(providerOrId, options);
  if (!result.eligible) throw new ApiError(409, 'Complete onboarding for this job: interview, final approval and paid kit receipt are required', { blockingReasons: result.reasons });
  return result;
}
