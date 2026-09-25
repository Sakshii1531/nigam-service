import { apiRequest, resolveMediaUrl } from './apiClient';

// Uploads one image through POST /api/v1/uploads — Cloudinary in every real
// environment (the server falls back to local disk only in development) — and
// returns its URL. Images are stored as URLs, never as base64 data in the
// database (docs/master-catalogue Phase 17).

const MAX_BYTES = 5 * 1024 * 1024;

export async function uploadImage(file) {
  if (!file) throw new Error('No file selected.');
  if (!file.type?.startsWith('image/')) throw new Error('Please choose an image file.');
  if (file.size > MAX_BYTES) throw new Error('Images must be 5 MB or smaller.');
  const body = new FormData();
  body.append('file', file);
  const res = await apiRequest('/uploads', { method: 'POST', auth: true, body });
  if (!res?.url) throw new Error('Upload failed — no URL returned.');
  // Cloudinary returns an absolute https URL; the development fallback returns
  // "/uploads/…", made absolute here so every screen can render it as-is.
  return resolveMediaUrl(res.url);
}

/** Whether a stored image/icon value is an image (URL or legacy data URI) rather than a preset icon name. */
export const isImageUrl = (value) =>
  typeof value === 'string' && /^(https?:\/\/|data:image\/|\/uploads\/)/i.test(value.trim());

/** Uploads several images in order; resolves to their URLs. */
export const uploadImages = (files) => Promise.all(Array.from(files || []).map(uploadImage));
