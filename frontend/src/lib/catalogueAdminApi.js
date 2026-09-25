import { apiRequest } from './apiClient';

// Super-admin Master Service & Offering Catalogue API
// (backend/src/modules/catalog/catalogAdmin.routes.js). Amounts are rupees.

const BASE = '/super-admin/catalogue';
const call = (path, options = {}) => apiRequest(`${BASE}${path}`, { auth: true, ...options });
const qs = (params) => {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '');
  return entries.length ? `?${new URLSearchParams(entries).toString()}` : '';
};

export const catalogueAdmin = {
  listCategories: () => call('/categories'),
  createCategory: (body) => call('/categories', { method: 'POST', body }),
  updateCategory: (id, body) => call(`/categories/${id}`, { method: 'PUT', body }),
  setCategoryStatus: (id, isActive) => call(`/categories/${id}/status`, { method: 'PATCH', body: { isActive } }),
  getStructure: (id) => call(`/categories/${id}/structure`),

  createProductType: (body) => call('/product-types', { method: 'POST', body }),
  updateProductType: (id, body) => call(`/product-types/${id}`, { method: 'PUT', body }),
  setProductTypeStatus: (id, isActive) => call(`/product-types/${id}/status`, { method: 'PATCH', body: { isActive } }),

  createService: (body) => call('/services', { method: 'POST', body }),
  updateService: (id, body) => call(`/services/${id}`, { method: 'PUT', body }),
  setServiceStatus: (id, isActive) => call(`/services/${id}/status`, { method: 'PATCH', body: { isActive } }),

  createVariant: (body) => call('/variants', { method: 'POST', body }),
  updateVariant: (id, body) => call(`/variants/${id}`, { method: 'PUT', body }),
  setVariantStatus: (id, isActive) => call(`/variants/${id}/status`, { method: 'PATCH', body: { isActive } }),

  // Returns { data, meta } (envelope) so the table can paginate.
  listOfferings: (filters = {}) => call(`/offerings${qs(filters)}`, { envelope: true }),
  getOffering: (id) => call(`/offerings/${id}`),
  createOffering: (body) => call('/offerings', { method: 'POST', body }),
  updateOffering: (id, body) => call(`/offerings/${id}`, { method: 'PUT', body }),
  setOfferingStatus: (id, isActive) => call(`/offerings/${id}/status`, { method: 'PATCH', body: { isActive } }),
  duplicateOffering: (id, body) => call(`/offerings/${id}/duplicate`, { method: 'POST', body }),
  suggestCode: (params) => call(`/suggest-code${qs(params)}`),

  changeRate: (id, body) => call(`/offerings/${id}/rates`, { method: 'POST', body }),
  rateHistory: (id) => call(`/offerings/${id}/rates`),
  endLocalRate: (id, body) => call(`/offerings/${id}/rates/end`, { method: 'POST', body }),
  rateChanges: (filters = {}) => call(`/rate-changes${qs(filters)}`, { envelope: true }),
};

export const formatINR = (value) =>
  value == null ? '—' : `₹${Number(value).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

export const RATE_FIELD_LABELS = {
  customerPrice: 'Customer price',
  spPayout: 'SP payout',
  expressFee: 'Express fee',
  expressSpIncentive: 'Express SP incentive',
};

export const PRICING_UNIT_LABELS = {
  PER_SERVICE: 'Per service / visit',
  PER_UNIT: 'Per unit',
  PER_PIECE: 'Per piece',
  PER_CAPACITY: 'Capacity / size based',
  CUSTOM: 'Custom unit',
};
