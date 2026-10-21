import { ApiError } from './errorHandler.js';
export function restrictOnboardingApplicant(req, _res, next) {
  const provider = req.serviceProvider;
  if (provider.onboardingPolicyVersion !== 1 || provider.status !== 'Pending') return next();
  const allowed = ['/onboarding', '/kits', '/profile'];
  if (allowed.some(path => req.path === path || req.path.startsWith(`${path}/`)) || (req.method === 'GET' && req.path.startsWith('/jobs/'))) return next();
  next(new ApiError(409, 'Complete your onboarding review before accessing work features'));
}
