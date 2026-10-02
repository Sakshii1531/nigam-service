import { apiRequest } from './apiClient';

// Brand panel side of Partner Warranty (docs/partner-warranty Phases 2, 4, 10).
// Every call is scoped server-side to the signed-in brand.

const qs = (params) => {
  const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''));
  return q.toString() ? `?${q}` : '';
};

export const brandWarrantyApi = {
  list: (params = {}) => apiRequest(`/brand/warranty-claims${qs(params)}`, { auth: true, envelope: true }),
  get: (id) => apiRequest(`/brand/warranty-claims/${id}`, { auth: true }),
  approve: (id, remarks) => apiRequest(`/brand/warranty-claims/${id}/approve`, { method: 'POST', auth: true, body: remarks ? { remarks } : {} }),
  reject: (id, reason) => apiRequest(`/brand/warranty-claims/${id}/reject`, { method: 'POST', auth: true, body: { reason } }),
  requestInfo: (id, message) => apiRequest(`/brand/warranty-claims/${id}/request-info`, { method: 'POST', auth: true, body: { message } }),
  note: (id, note) => apiRequest(`/brand/warranty-claims/${id}/notes`, { method: 'POST', auth: true, body: { note } }),

  coverage: () => apiRequest('/brand/warranty-coverage', { auth: true }),
  saveCoverage: (body) => apiRequest('/brand/warranty-coverage', { method: 'PUT', auth: true, body }),

  webhook: () => apiRequest('/brand/warranty-webhook', { auth: true }),
  saveWebhook: (body) => apiRequest('/brand/warranty-webhook', { method: 'PUT', auth: true, body }),
  testWebhook: () => apiRequest('/brand/warranty-webhook/test', { method: 'POST', auth: true }),
};

// Queue tabs → the claim statuses they cover.
export const BRAND_TABS = [
  { key: 'new', label: 'New', statuses: ['Submitted'] },
  { key: 'review', label: 'In Review', statuses: ['Brand Review'] },
  { key: 'info', label: 'Info Requested', statuses: ['Info Requested'] },
  {
    key: 'service',
    label: 'Approved / In Service',
    statuses: ['Approved', 'Job Created', 'Partner Assigned', 'Visit Scheduled', 'Technician On Way', 'Service In Progress', 'Service Completed', 'On Hold'],
  },
  { key: 'rejected', label: 'Rejected', statuses: ['Rejected'] },
  { key: 'closed', label: 'Closed', statuses: ['Closed', 'Cancelled'] },
];

export const DECIDABLE = ['Submitted', 'Brand Review', 'Info Requested'];
