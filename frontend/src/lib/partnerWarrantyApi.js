import { apiRequest } from './apiClient';

// Customer-side Partner Warranty API (docs/partner-warranty Phases 2–7).
// Browsing needs no login; everything under /claims is the customer's own.

export const warrantyApi = {
  groups: () => apiRequest('/partner-warranty/groups'),
  brands: ({ group, q } = {}) => {
    const qs = new URLSearchParams();
    if (group) qs.set('group', group);
    if (q) qs.set('q', q);
    return apiRequest(`/partner-warranty/brands${qs.toString() ? `?${qs}` : ''}`);
  },
  products: (brandId, group) =>
    apiRequest(`/partner-warranty/brands/${brandId}/products${group ? `?group=${encodeURIComponent(group)}` : ''}`),
  issues: (categoryId) => apiRequest(`/partner-warranty/products/${categoryId}/issues`),

  submit: (body) => apiRequest('/partner-warranty/claims', { method: 'POST', auth: true, body }),
  myClaims: (status) => apiRequest(`/partner-warranty/claims${status ? `?status=${status}` : ''}`, { auth: true, envelope: true }),
  claim: (id) => apiRequest(`/partner-warranty/claims/${id}`, { auth: true }),
  track: (id) => apiRequest(`/partner-warranty/claims/${id}/track`, { auth: true }),
  addDocuments: (id, documents) => apiRequest(`/partner-warranty/claims/${id}/documents`, { method: 'POST', auth: true, body: { documents } }),
  respond: (id, body) => apiRequest(`/partner-warranty/claims/${id}/info-response`, { method: 'POST', auth: true, body }),
  confirm: (id) => apiRequest(`/partner-warranty/claims/${id}/confirm`, { method: 'POST', auth: true }),
};

// Claim documents are bills and warranty cards as much as photos, so PDFs are
// accepted too — the server allows PNG, JPEG, WebP and PDF up to 10 MB.
const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'];
export const DOCUMENT_ACCEPT = ACCEPTED.join(',');
const MAX_BYTES = 10 * 1024 * 1024;

/** Uploads one claim document; resolves to the stored URL (what the claim API expects). */
export async function uploadClaimDocument(file) {
  if (!file) throw new Error('No file selected.');
  if (!ACCEPTED.includes(file.type)) throw new Error('Use a photo (JPG, PNG, WebP) or a PDF.');
  if (file.size > MAX_BYTES) throw new Error('Files must be 10 MB or smaller.');
  const body = new FormData();
  body.append('file', file);
  const res = await apiRequest('/uploads', { method: 'POST', auth: true, body });
  if (!res?.url) throw new Error('Upload failed — please try again.');
  // Send the URL exactly as stored: the server only accepts its own upload URLs.
  return { url: res.url, name: file.name, isPdf: file.type === 'application/pdf' };
}

export const DOCUMENT_LABELS = {
  invoice: 'Bill / Invoice',
  warranty_card: 'Warranty Card',
  product_photo: 'Product Photo',
  additional: 'Additional',
};
