import { randomUUID, randomBytes, createHash, createCipheriv, createDecipheriv } from 'node:crypto';
import { mkdir, writeFile, readFile, unlink } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { v2 as cloudinary } from 'cloudinary';
import { env, isCloudinaryConfigured, isProd } from '../../config/env.js';
import { ApiError } from '../../middleware/errorHandler.js';
const directory = process.env.PROVIDER_KYC_DIR || fileURLToPath(new URL('../../../.private-kyc/', import.meta.url));
const key = () => createHash('sha256').update(process.env.PROVIDER_KYC_KEY || env.jwt.accessSecret).digest();
const decodeCloud = ref => JSON.parse(Buffer.from(ref.slice(10), 'base64url').toString());
export async function storePrivateKyc(file) {
  if (!file || !['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.mimetype) || file.size > 5 * 1024 * 1024) throw new ApiError(400, 'Upload Aadhaar as a JPG, PNG, WebP or PDF up to 5 MB');
  if (isCloudinaryConfigured) {
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream({ resource_type: 'auto', type: 'authenticated', folder: `${env.cloudinary.uploadFolder}/provider-kyc`, public_id: randomUUID() }, (error, value) => error ? reject(error) : resolve(value));
      stream.end(file.buffer);
    });
    return `kyc-cloud:${Buffer.from(JSON.stringify({ publicId: result.public_id, format: result.format || '', resourceType: result.resource_type })).toString('base64url')}`;
  }
  if (isProd) throw new ApiError(503, 'Private document storage is not configured');
  await mkdir(directory, { recursive: true });
  const id = randomUUID(), iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify({ type: file.mimetype, data: file.buffer.toString('base64') })), cipher.final()]);
  await writeFile(path.join(directory, id), Buffer.concat([iv, cipher.getAuthTag(), encrypted]), { mode: 0o600 });
  return `kyc-local:${id}`;
}
export async function privateKycLink(ref) {
  if (ref?.startsWith('kyc-cloud:')) {
    const value = decodeCloud(ref);
    return { contentType: ({ pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' })[value.format], url: cloudinary.utils.private_download_url(value.publicId, value.format, { resource_type: value.resourceType, type: 'authenticated', expires_at: Math.floor(Date.now() / 1000) + 60, attachment: false }) };
  }
  if (ref?.startsWith('kyc-local:') && /^[a-f\d-]{36}$/.test(ref.slice(10))) {
    const file = await readFile(path.join(directory, ref.slice(10))), cipher = createDecipheriv('aes-256-gcm', key(), file.subarray(0, 12));
    cipher.setAuthTag(file.subarray(12, 28));
    const value = JSON.parse(Buffer.concat([cipher.update(file.subarray(28)), cipher.final()]).toString());
    return { contentType: value.type, url: `data:${value.type};base64,${value.data}` };
  }
  // Old applications used public URLs. They remain reviewable but new uploads
  // always use the private path above.
  if (ref?.startsWith('https://') || ref?.startsWith('/uploads/')) return { url: ref };
  throw new ApiError(404, 'Document not found');
}
export async function removePrivateKyc(ref) {
  if (ref?.startsWith('kyc-local:') && /^[a-f\d-]{36}$/.test(ref.slice(10))) await unlink(path.join(directory, ref.slice(10))).catch(() => {});
  if (ref?.startsWith('kyc-cloud:')) { const value = decodeCloud(ref); await cloudinary.uploader.destroy(value.publicId, { type: 'authenticated', resource_type: value.resourceType }); }
}
