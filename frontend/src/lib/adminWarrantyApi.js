import { apiRequest } from './apiClient';

// Super Admin side of Partner Warranty (docs/partner-warranty Phases 2, 6, 8–11).

const qs = (params = {}) => {
  const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''));
  return q.toString() ? `?${q}` : '';
};
const post = (path, body) => apiRequest(path, { method: 'POST', auth: true, body: body || {} });
const put = (path, body) => apiRequest(path, { method: 'PUT', auth: true, body });

export const adminWarrantyApi = {
  // Claims (Phase 8)
  list: (params) => apiRequest(`/super-admin/warranty-claims${qs(params)}`, { auth: true, envelope: true }),
  get: (id) => apiRequest(`/super-admin/warranty-claims/${id}`, { auth: true }),
  suggestions: (id) => apiRequest(`/super-admin/warranty-claims/${id}/partner-suggestions`, { auth: true }),
  action: (id, action, body) => post(`/super-admin/warranty-claims/${id}/${action}`, body),
  slaSummary: (params) => apiRequest(`/super-admin/warranty-claims/sla-summary${qs(params)}`, { auth: true }),

  // Catalogue (Phase 2)
  groups: () => apiRequest('/super-admin/warranty-catalog/groups', { auth: true }),
  createGroup: (body) => post('/super-admin/warranty-catalog/groups', body),
  updateGroup: (id, body) => put(`/super-admin/warranty-catalog/groups/${id}`, body),
  issues: (params) => apiRequest(`/super-admin/warranty-catalog/issues${qs(params)}`, { auth: true }),
  createIssue: (body) => post('/super-admin/warranty-catalog/issues', body),
  updateIssue: (id, body) => put(`/super-admin/warranty-catalog/issues/${id}`, body),
  deleteIssue: (id) => apiRequest(`/super-admin/warranty-catalog/issues/${id}`, { method: 'DELETE', auth: true }),
  categories: () => apiRequest('/super-admin/warranty-catalog/coverage-options', { auth: true }),
  brands: () => apiRequest('/super-admin/warranty-catalog/brands', { auth: true }),
  updateBrand: (id, body) => put(`/super-admin/warranty-catalog/brands/${id}`, body),

  // Partner eligibility (Phase 6)
  searchPartners: (search) => apiRequest(`/super-admin/service-providers${qs({ search, limit: 20 })}`, { auth: true }),
  partner: (id) => apiRequest(`/super-admin/warranty-catalog/service-providers/${id}`, { auth: true }),
  updatePartner: (id, body) => put(`/super-admin/warranty-catalog/service-providers/${id}`, body),

  // Platform SLA defaults (Phase 9)
  settings: () => apiRequest('/super-admin/settings', { auth: true }),
  saveSla: (warrantySla) => put('/super-admin/settings', { warrantySla }),

  // B2B2C payouts (Phase 11)
  owed: (params) => apiRequest(`/super-admin/b2b2c-payouts${qs(params)}`, { auth: true }),
  partnerJobs: (id, status) => apiRequest(`/super-admin/b2b2c-payouts/service-providers/${id}/jobs${qs({ status })}`, { auth: true }),
  settle: (body) => post('/super-admin/b2b2c-payouts/settle', body),

  // Webhooks (Phase 10)
  deliveries: (params) => apiRequest(`/super-admin/warranty-webhooks/deliveries${qs(params)}`, { auth: true, envelope: true }),
  retry: (id) => post(`/super-admin/warranty-webhooks/deliveries/${id}/retry`),
};

export const CLAIM_STATUSES = [
  'Submitted', 'Brand Review', 'Info Requested', 'Approved', 'Rejected', 'Job Created', 'Partner Assigned', 'Visit Scheduled',
  'Technician On Way', 'Service In Progress', 'Service Completed', 'Closed', 'On Hold', 'Cancelled',
];

// Status targets an admin may set by hand (the rest have their own action).
export const OVERRIDE_TARGETS = ['Brand Review', 'Partner Assigned', 'Visit Scheduled', 'Technician On Way', 'Service In Progress', 'Service Completed', 'Closed'];
