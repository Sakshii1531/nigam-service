import { ServiceProvider } from '../service-provider/serviceProvider.model.js';
import { ProviderOnboarding } from './onboarding.model.js';
import { Category } from '../catalog/category.model.js';
import { ASM } from '../super-admin/asm.model.js';
import { User } from '../auth/user.model.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { runInTransaction } from '../../utils/transaction.js';
import { logAudit } from '../shared/auditLog.js';
import { emit as emitNotification } from '../notifications/notification.service.js';
import { getIO } from '../../sockets/io.js';
import { eligibilityFor, resolveRequestedCategories } from './eligibility.service.js';

export async function scopedProvider(id, actor, session = null) {
  const actorUser = await User.findById(actor.id).select('status role').session(session);
  if (!actorUser || actorUser.status !== 'Active' || actorUser.role !== actor.role) throw new ApiError(403, 'Account is not active');
  const provider = await ServiceProvider.findById(id).session(session);
  if (!provider) throw new ApiError(404, 'Service provider not found');
  if (actor.role === 'asm') {
    const asm = await ASM.findOne({ user: actor.id }).session(session);
    if (!asm || String(asm.city) !== String(provider.city)) throw new ApiError(404, 'Service provider not found');
  }
  if (actor.role === 'service_provider' && String(provider.user) !== String(actor.id)) throw new ApiError(404, 'Service provider not found');
  return provider;
}

export async function notifyJourney(provider, title, message, { managers = false } = {}) {
  try {
  const recipients = [provider.user];
  if (managers) {
    const asm = provider.city ? await ASM.findOne({ city: provider.city }) : null;
    if (asm?.user) recipients.push(asm.user);
    const admins = await User.find({ role: 'super_admin', status: 'Active' }).select('_id');
    recipients.push(...admins.map(u => u._id));
  }
  for (const user of new Set(recipients.filter(Boolean).map(String))) {
    await emitNotification('provider.onboarding', { user, title, message, route: user === String(provider.user) ? '/service-provider/onboarding' : '/super-admin/provider-onboarding' });
  }
  const payload = { serviceProviderId: provider.id, title, message };
  getIO()?.to(`user:${provider.user}`).emit('provider:onboarding_updated', payload);
  getIO()?.to('admins').emit('provider:onboarding_updated', payload);
  } catch (error) { console.warn('[provider-onboarding] Notification delivery failed:', error.message); }
}

export async function getJourney(providerId, actor) {
  const provider = await scopedProvider(providerId, actor);
  const onboarding = await ProviderOnboarding.findOne({ serviceProvider: providerId }).populate('requestedCategories approvedCategories', 'name key');
  const eligibility = await eligibilityFor(provider);
  const result = onboarding?.toJSON() || null;
  if (actor.role === 'service_provider' && result) {
    delete result.interviewNotes;
    result.events = result.events.map(({ action, at, message }) => ({ action, at, message }));
  }
  return { provider: { id: provider.id, humanId: provider.humanId, name: provider.name, phone: provider.phone, city: provider.serviceCityName, status: provider.status, legacyExemption: provider.legacyExemption }, onboarding: result, eligibility, canBuyKits: eligibility.legacy || onboarding?.state === 'APPROVED' };
}

export async function listJourneys(actor, { state, search = '' } = {}) {
  const query = {};
  if (actor.role === 'asm') {
    const asm = await ASM.findOne({ user: actor.id });
    if (!asm) throw new ApiError(403, 'No ASM area configured');
    query.city = asm.city;
  }
  if (search) query.name = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const providers = await ServiceProvider.find(query).select('name phone city serviceCityName status onboardingPolicyVersion legacyExemption').sort({ createdAt: -1 }).limit(200);
  const apps = await ProviderOnboarding.find({ serviceProvider: { $in: providers.map(p => p._id) }, ...(state ? { state } : {}) }).populate('requestedCategories approvedCategories', 'name key').lean();
  const byId = new Map(apps.map(a => [String(a.serviceProvider), { ...a, id: String(a._id) }]));
  return providers.filter(p => !state || byId.has(String(p._id))).map(p => ({ ...p.toJSON(), onboarding: byId.get(String(p._id)) || null }));
}

export async function reviewOnboarding(providerId, actor, input) {
  const provider = await scopedProvider(providerId, actor);
  const updated = await runInTransaction(async session => {
    const p = await scopedProvider(providerId, actor, session);
    const app = await ProviderOnboarding.findOne({ serviceProvider: providerId }).session(session);
    if (!app) throw new ApiError(404, 'Onboarding application not found');
    if (app.revision !== input.revision) throw new ApiError(409, 'The application changed. Reload before reviewing it.');
    const { action, reason } = input;
    const before = app.state;
    const interviewStates = ['ASM_REVIEW', 'INTERVIEW_SCHEDULED', 'CHANGES_REQUESTED', 'ASM_REJECTED', 'SUPER_ADMIN_REJECTED'];
    if (['schedule', 'request_changes', 'interview_pass', 'interview_reject'].includes(action)) {
      if (!interviewStates.includes(app.state)) throw new ApiError(409, 'This application is not awaiting an interview');
      if (actor.role === 'super_admin' && !input.exceptionReason?.trim()) throw new ApiError(400, 'Record why super admin is conducting the ASM interview');
      if (action === 'schedule') { app.state = 'INTERVIEW_SCHEDULED'; app.interviewAt = new Date(input.interviewAt); }
      if (action === 'request_changes') app.state = 'CHANGES_REQUESTED';
      if (action === 'interview_reject') app.state = 'ASM_REJECTED';
      if (action === 'interview_pass') {
        if (!p.verification?.aadharFrontUrl || !p.verification?.aadharBackUrl) throw new ApiError(400, 'Both Aadhaar documents are required');
        if (!input.documentsVerified || !input.backgroundVerified) throw new ApiError(400, 'Review Aadhaar documents and background before passing the interview');
        const decisions = input.categoryDecisions || [];
        if (decisions.length !== app.requestedCategories.length || new Set(decisions.map(d => String(d.category))).size !== decisions.length || decisions.some(d => !app.requestedCategories.some(id => String(id) === String(d.category)))) throw new ApiError(400, 'Record a decision for every requested category');
        const approved = decisions.filter(d => d.approved).map(d => d.category);
        if (!approved.length) throw new ApiError(400, 'Approve at least one demonstrated category, or reject the interview');
        const categories = await Category.countDocuments({ _id: { $in: approved }, isActive: true }).session(session);
        if (categories !== approved.length) throw new ApiError(400, 'An approved category is no longer active');
        app.categoryDecisions = decisions; app.approvedCategories = approved;
        app.documentReview = { aadhar: 'Verified', background: 'Verified' };
        p.verification.aadharStatus = 'Verified'; p.verification.backgroundCheckStatus = 'Verified';
        app.state = 'SUPER_ADMIN_REVIEW'; app.interviewActor = actor.id; app.interviewAt = new Date();
      }
      app.interviewNotes = input.notes || app.interviewNotes;
      if (actor.role === 'super_admin') app.interviewExceptionReason = input.exceptionReason;
    } else {
      if (actor.role !== 'super_admin') throw new ApiError(403, 'Only super admin may give final approval');
      if (app.state !== 'SUPER_ADMIN_REVIEW') throw new ApiError(409, 'Complete the interview before final review');
      if (action === 'final_approve') {
        if (app.documentReview.aadhar !== 'Verified' || app.documentReview.background !== 'Verified' || !app.interviewActor) throw new ApiError(409, 'Complete document and interview review before final approval');
        const approved = input.approvedCategories || app.approvedCategories.map(String);
        if (!approved.length || new Set(approved).size !== approved.length || approved.some(id => !app.approvedCategories.some(c => String(c) === String(id)))) throw new ApiError(400, 'Final approval may only confirm or reduce interview-approved categories');
        const categories = await Category.find({ _id: { $in: approved }, isActive: true }).session(session);
        if (categories.length !== approved.length) throw new ApiError(400, 'An approved category is no longer active');
        app.approvedCategories = approved; app.state = 'APPROVED'; app.finalActor = actor.id; app.finalAt = new Date();
        p.approvedCategoryIds = approved; p.specs = categories.map(c => c.key); p.status = 'Active'; p.availability = 'Offline'; p.joinedAt ||= new Date();
      } else if (action === 'final_reject') app.state = 'SUPER_ADMIN_REJECTED';
      else throw new ApiError(400, 'Unknown onboarding action');
    }
    app.decisionReason = reason; app.revision++;
    app.events.push({ action, actor: actor.id, actorRole: actor.role, message: reason });
    await app.save({ session });
    p.jobEligible = false; p.eligibilityRevision++;
    await p.save({ session });
    await logAudit({ user: actor.id, entityType: 'ProviderOnboarding', entityId: app._id, action: `onboarding.${action}`, type: 'User', fromStatus: before, toStatus: app.state, reason, meta: { revision: app.revision, categoryDecisions: app.categoryDecisions.map(d => ({ category: String(d.category), approved: d.approved, reason: d.reason })), exceptionReason: input.exceptionReason } }, { session });
    return app;
  }, { required: true });
  await notifyJourney(provider, updated.state === 'APPROVED' ? 'Approved — purchase your onboarding kit' : 'Onboarding updated', input.reason, { managers: true });
  return getJourney(providerId, actor);
}

export async function resubmitApplication(providerId, actor, input) {
  const requested = await resolveRequestedCategories(input.categories);
  await runInTransaction(async session => {
    const p = await scopedProvider(providerId, actor, session);
    const app = await ProviderOnboarding.findOne({ serviceProvider: p._id }).session(session);
    if (!p.verification?.aadharFrontUrl || !p.verification?.aadharBackUrl) throw new ApiError(400, 'Upload both Aadhaar documents before resubmitting');
    if (!app || !['CHANGES_REQUESTED', 'ASM_REJECTED', 'SUPER_ADMIN_REJECTED'].includes(app.state)) throw new ApiError(409, 'This application is not open for resubmission');
    if (app.revision !== input.revision) throw new ApiError(409, 'Reload your application before resubmitting');
    app.requestedCategories = requested.map(c => c._id); app.approvedCategories = []; app.categoryDecisions = [];
    app.documentReview = { aadhar: 'Pending', background: 'Pending' }; app.state = 'ASM_REVIEW'; app.revision++;
    app.finalActor = undefined; app.finalAt = undefined;
    app.events.push({ action: 'resubmitted', actor: actor.id, actorRole: actor.role, message: input.reason || 'Application resubmitted' });
    await app.save({ session });
    p.approvedCategoryIds = []; p.specs = []; p.status = 'Pending'; p.jobEligible = false; p.availability = 'Offline'; p.eligibilityRevision++;
    await p.save({ session });
  }, { required: true });
  const p = await ServiceProvider.findById(providerId);
  await notifyJourney(p, 'Application resubmitted', `${p.name} is ready for interview review`, { managers: true });
  return getJourney(providerId, actor);
}
